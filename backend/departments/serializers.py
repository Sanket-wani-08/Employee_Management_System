"""
Serializers for Department model.
"""

from rest_framework import serializers
from .models import Department


class DepartmentSerializer(serializers.ModelSerializer):
    """
    Serializer for Department CRUD operations.
    Includes dynamic employee count calculation.
    """
    total_employees = serializers.IntegerField(read_only=True)

    class Meta:
        model = Department
        fields = [
            'id',
            'name',
            'description',
            'total_employees',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'total_employees', 'created_at', 'updated_at']

