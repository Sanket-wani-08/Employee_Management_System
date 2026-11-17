"""
Serializers for Attendance model.
"""

from rest_framework import serializers
from .models import Attendance
from employees.serializers import EmployeeSimpleSerializer


class AttendanceSerializer(serializers.ModelSerializer):
    """
    Serializer for Attendance records.
    Includes formatted employee info, department, and timestamps.
    """
    employee_detail = EmployeeSimpleSerializer(source='employee', read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_id', read_only=True)
    department_name = serializers.CharField(source='employee.department.name', read_only=True, default='N/A')

    class Meta:
        model = Attendance
        fields = [
            'id',
            'employee',
            'employee_code',
            'employee_name',
            'department_name',
            'employee_detail',
            'date',
            'check_in',
            'check_out',
            'status',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'employee_name', 'employee_code', 'department_name', 'created_at', 'updated_at']

