"""
Serializers for Project model.
Handles reading and writing project managers and ManyToMany team member assignments.
"""

from rest_framework import serializers
from .models import Project
from employees.models import Employee
from employees.serializers import EmployeeSimpleSerializer


class ProjectSerializer(serializers.ModelSerializer):
    """
    Serializer for Project CRUD operations.
    Includes nested manager details, team member rosters, and task completion metrics.
    """
    project_manager_detail = EmployeeSimpleSerializer(source='project_manager', read_only=True)
    team_members_detail = EmployeeSimpleSerializer(source='team_members', many=True, read_only=True)
    total_tasks = serializers.IntegerField(read_only=True)
    completed_tasks = serializers.IntegerField(read_only=True)

    project_manager = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
        required=False,
        allow_null=True
    )
    team_members = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
        many=True,
        required=False
    )

    class Meta:
        model = Project
        fields = [
            'id',
            'name',
            'description',
            'project_manager',
            'project_manager_detail',
            'team_members',
            'team_members_detail',
            'start_date',
            'deadline',
            'status',
            'total_tasks',
            'completed_tasks',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'total_tasks', 'completed_tasks', 'created_at', 'updated_at']

    def validate(self, attrs):
        """Ensure project deadline is chronologically on or after the start date."""
        start_date = attrs.get('start_date') or (self.instance.start_date if self.instance else None)
        deadline = attrs.get('deadline') or (self.instance.deadline if self.instance else None)
        if start_date and deadline and start_date > deadline:
            raise serializers.ValidationError({'deadline': 'Project deadline cannot be earlier than start date.'})
        return attrs

