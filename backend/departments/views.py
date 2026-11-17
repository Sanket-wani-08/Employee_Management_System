"""
Views for Department Management.
Provides CRUD endpoints, employee roster sub-resource, and deletion protection.
"""

from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from .models import Department
from .serializers import DepartmentSerializer
from employees.serializers import EmployeeSimpleSerializer
from employees.permissions import IsAdminOrHROrReadOnly


class DepartmentViewSet(viewsets.ModelViewSet):
    """
    Department ViewSet providing standard CRUD operations.
    Enforces role-based permissions:
      - Authenticated users: Read-only access (GET)
      - Admin / HR users: Full CRUD (POST, PUT, PATCH, DELETE)
    Enforces business logic preventing deletion of departments with active employees.
    """
    queryset = Department.objects.all().order_by('name')
    serializer_class = DepartmentSerializer
    permission_classes = [IsAdminOrHROrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']

    def destroy(self, request, *args, **kwargs):
        """
        Overrides delete to enforce business rule:
        Prevent deleting a department that still has assigned employees.
        """
        department = self.get_object()
        active_employees_count = department.employees.count()
        if active_employees_count > 0:
            return Response(
                {
                    "error": f"Cannot delete department '{department.name}'. It currently has {active_employees_count} assigned employee(s). Please reassign or remove employees first."
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['get'])
    def employees(self, request, pk=None):
        """
        Sub-resource endpoint: GET /api/departments/{id}/employees/
        Returns list of all employees belonging to this department.
        """
        department = self.get_object()
        employees = department.employees.all().order_by('employee_id')
        serializer = EmployeeSimpleSerializer(employees, many=True)
        return Response(serializer.data)
