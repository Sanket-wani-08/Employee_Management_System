"""
Views for Project Management.
Includes project CRUD, ManyToMany team assignments, sub-resource task listings,
and personal project dashboard queries.
"""

from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.db import models

from .models import Project
from .serializers import ProjectSerializer
from tasks.serializers import TaskSerializer
from employees.models import User, Employee


class ProjectViewSet(viewsets.ModelViewSet):
    """
    Project ViewSet.
    Uses select_related and prefetch_related to eliminate N+1 SQL queries.
    Allows all authenticated employees to view projects, but restricts
    creation, updates, and deletion to Project Managers, HR, and Admins.
    """
    queryset = Project.objects.select_related(
        'project_manager__user',
        'project_manager__department'
    ).prefetch_related(
        'team_members__user',
        'team_members__department'
    ).all().order_by('-created_at')

    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        'name',
        'description',
        'project_manager__user__first_name',
        'project_manager__user__last_name',
        'project_manager__employee_id',
    ]
    ordering_fields = ['start_date', 'deadline', 'status', 'created_at']

    def get_permissions(self):
        """
        Enforce role-based write permissions:
        Only ADMIN, HR, or PROJECT_MANAGER can create, modify, or delete projects.
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'add_team_member', 'remove_team_member']:
            user = self.request.user
            if not (user and user.is_authenticated and (user.role in [User.ROLE_ADMIN, User.ROLE_HR, User.ROLE_PROJECT_MANAGER] or user.is_superuser)):
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Only Project Managers, HR, or Administrators can create or modify projects.")
        return [permission() for permission in self.permission_classes]

    def get_queryset(self):
        """
        Supports dynamic filtering by status, project_manager ID, and search terms.
        """
        queryset = super().get_queryset()
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param.upper())

        pm_id = self.request.query_params.get('project_manager')
        if pm_id:
            queryset = queryset.filter(project_manager_id=pm_id)

        return queryset

    @action(detail=False, methods=['get'], url_path='my-projects')
    def my_projects(self, request):
        """
        Endpoint: GET /api/projects/my-projects/
        Returns projects managed by or assigned to the logged-in employee.
        """
        user = request.user
        if not hasattr(user, 'employee_profile'):
            return Response([])

        emp = user.employee_profile
        managed_or_member_projects = self.get_queryset().filter(
            models.Q(project_manager=emp) | models.Q(team_members=emp)
        ).distinct()

        serializer = self.get_serializer(managed_or_member_projects, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def tasks(self, request, pk=None):
        """
        Sub-resource endpoint: GET /api/projects/{id}/tasks/
        Returns all tasks assigned under this project.
        """
        project = self.get_object()
        tasks = project.tasks.select_related('assigned_to__user').all().order_by('deadline')
        serializer = TaskSerializer(tasks, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='add-member')
    def add_team_member(self, request, pk=None):
        """
        Endpoint: POST /api/projects/{id}/add-member/
        Body: { "employee_id": <int_id> }
        Adds an employee to the project's ManyToMany team.
        """
        project = self.get_object()
        emp_id = request.data.get('employee_id')
        if not emp_id:
            return Response({"error": "employee_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            employee = Employee.objects.get(id=emp_id)
        except Employee.DoesNotExist:
            return Response({"error": "Employee not found."}, status=status.HTTP_404_NOT_FOUND)

        project.team_members.add(employee)
        return Response({"message": f"Added {employee.full_name} to project team."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='remove-member')
    def remove_team_member(self, request, pk=None):
        """
        Endpoint: POST /api/projects/{id}/remove-member/
        Body: { "employee_id": <int_id> }
        Removes an employee from the project team.
        """
        project = self.get_object()
        emp_id = request.data.get('employee_id')
        if not emp_id:
            return Response({"error": "employee_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            employee = Employee.objects.get(id=emp_id)
        except Employee.DoesNotExist:
            return Response({"error": "Employee not found."}, status=status.HTTP_404_NOT_FOUND)

        project.team_members.remove(employee)
        return Response({"message": f"Removed {employee.full_name} from project team."}, status=status.HTTP_200_OK)
