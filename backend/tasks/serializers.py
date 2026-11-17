"""
Serializers for Task model.
"""

from rest_framework import serializers
from .models import Task
from projects.models import Project
from employees.models import Employee
from employees.serializers import EmployeeSimpleSerializer


class TaskSerializer(serializers.ModelSerializer):
    """
    Serializer for Task CRUD operations.
    Includes project name, assigned employee details, and priority/status choices.
    """
    project_name = serializers.CharField(source='project.name', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.full_name', read_only=True, default='Unassigned')
    assigned_to_detail = EmployeeSimpleSerializer(source='assigned_to', read_only=True)

    project = serializers.PrimaryKeyRelatedField(queryset=Project.objects.all())
    assigned_to = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = Task
        fields = [
            'id',
            'title',
            'description',
            'project',
            'project_name',
            'assigned_to',
            'assigned_to_name',
            'assigned_to_detail',
            'priority',
            'status',
            'deadline',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'project_name', 'assigned_to_name', 'created_at', 'updated_at']

