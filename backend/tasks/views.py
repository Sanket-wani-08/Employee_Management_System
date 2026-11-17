"""
Views for Task Management.
Provides CRUD endpoints, priority/status filtering, search,
assigned employee personal tasks view, and workflow status transitions.
"""

from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied

from .models import Task
from .serializers import TaskSerializer
from employees.models import User


class TaskViewSet(viewsets.ModelViewSet):
    """
    Task ViewSet.
    Uses select_related on project and assigned_to for query optimization.
    Supports query parameter filters:
      - ?project=<id>
      - ?assigned_to=<id>
      - ?status=<TODO|IN_PROGRESS|REVIEW|COMPLETED>
      - ?priority=<LOW|MEDIUM|HIGH>
      - ?search=<term>
    """
    queryset = Task.objects.select_related(
        'project',
        'assigned_to__user',
        'assigned_to__department'
    ).all().order_by('deadline', '-priority')

    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        'title',
        'description',
        'project__name',
        'assigned_to__user__first_name',
        'assigned_to__user__last_name',
        'assigned_to__employee_id',
    ]
    ordering_fields = ['deadline', 'priority', 'status', 'created_at']

    def get_permissions(self):
        """
        Enforce role-based write permissions:
        Only ADMIN, HR, or PROJECT_MANAGER can create or delete tasks.
        """
        if self.action in ['create', 'destroy']:
            user = self.request.user
            if not (user and user.is_authenticated and (user.role in [User.ROLE_ADMIN, User.ROLE_HR, User.ROLE_PROJECT_MANAGER] or user.is_superuser)):
                raise PermissionDenied("Only Project Managers, HR, or Administrators can create or delete tasks.")
        return [permission() for permission in self.permission_classes]

    def get_queryset(self):
        """
        Filter tasks dynamically by project, assigned employee, status, and priority.
        """
        queryset = super().get_queryset()
        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(project_id=project_id)

        assigned_to_id = self.request.query_params.get('assigned_to')
        if assigned_to_id:
            queryset = queryset.filter(assigned_to_id=assigned_to_id)

        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param.upper())

        priority_param = self.request.query_params.get('priority')
        if priority_param:
            queryset = queryset.filter(priority=priority_param.upper())

        return queryset

    @action(detail=False, methods=['get'], url_path='my-tasks')
    def my_tasks(self, request):
        """
        Endpoint: GET /api/tasks/my-tasks/
        Returns all tasks assigned to the authenticated employee.
        """
        user = request.user
        if not hasattr(user, 'employee_profile'):
            return Response([])

        emp = user.employee_profile
        tasks = self.get_queryset().filter(assigned_to=emp)
        serializer = self.get_serializer(tasks, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['patch', 'put'], url_path='update-status')
    def update_status(self, request, pk=None):
        """
        Endpoint: PATCH /api/tasks/{id}/update-status/
        Body: { "status": "IN_PROGRESS" }
        Allows assigned employees, PMs, HR, or Admins to update task workflow status.
        """
        task = self.get_object()
        new_status = request.data.get('status')
        if not new_status:
            return Response({"error": "status field is required."}, status=status.HTTP_400_BAD_REQUEST)

        new_status = new_status.upper()
        valid_statuses = [choice[0] for choice in Task.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response(
                {"error": f"Invalid status '{new_status}'. Choices: {valid_statuses}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Ensure user is either assigned to the task, or is PM/HR/Admin
        user = request.user
        is_assigned = (hasattr(user, 'employee_profile') and task.assigned_to == user.employee_profile)
        is_manager = (user.role in [User.ROLE_ADMIN, User.ROLE_HR, User.ROLE_PROJECT_MANAGER] or user.is_superuser)

        if not (is_assigned or is_manager):
            raise PermissionDenied("You can only update the status of tasks assigned to you.")

        task.status = new_status
        task.save()
        return Response(self.get_serializer(task).data)
