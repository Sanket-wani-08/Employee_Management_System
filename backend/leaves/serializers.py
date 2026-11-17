"""
Serializers for Leave Management.
Includes date span validation and overlapping request prevention.
"""

from rest_framework import serializers
from django.utils import timezone
from .models import Leave
from employees.models import Employee
from employees.serializers import EmployeeSimpleSerializer


class LeaveSerializer(serializers.ModelSerializer):
    """
    Serializer for Leave applications.
    Enforces business rules preventing invalid dates and overlapping leaves.
    """
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_code = serializers.CharField(source='employee.employee_id', read_only=True)
    department_name = serializers.CharField(source='employee.department.name', read_only=True, default='N/A')
    leave_type_display = serializers.CharField(source='get_leave_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    total_days = serializers.IntegerField(read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True, default='')

    employee = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),
        required=False
    )

    class Meta:
        model = Leave
        fields = [
            'id',
            'employee',
            'employee_code',
            'employee_name',
            'department_name',
            'leave_type',
            'leave_type_display',
            'start_date',
            'end_date',
            'total_days',
            'reason',
            'status',
            'status_display',
            'applied_on',
            'reviewed_by',
            'reviewed_by_name',
            'review_comment',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'employee_code',
            'employee_name',
            'department_name',
            'leave_type_display',
            'status_display',
            'total_days',
            'applied_on',
            'reviewed_by',
            'reviewed_by_name',
            'updated_at',
        ]

    def validate(self, attrs):
        """
        Validates date ordering and checks for overlapping active requests.
        """
        start_date = attrs.get('start_date') or (self.instance.start_date if self.instance else None)
        end_date = attrs.get('end_date') or (self.instance.end_date if self.instance else None)

        if start_date and end_date:
            if start_date > end_date:
                raise serializers.ValidationError({'end_date': "End date cannot be earlier than start date."})

        # Determine target employee
        request = self.context.get('request')
        employee = attrs.get('employee')
        if not employee and request and hasattr(request.user, 'employee_profile'):
            employee = request.user.employee_profile

        if employee and start_date and end_date:
            overlapping = Leave.objects.filter(
                employee=employee,
                status__in=[Leave.STATUS_PENDING, Leave.STATUS_APPROVED],
                start_date__lte=end_date,
                end_date__gte=start_date
            )
            if self.instance:
                overlapping = overlapping.exclude(pk=self.instance.pk)

            if overlapping.exists():
                raise serializers.ValidationError(
                    "You already have an active (pending or approved) leave request overlapping with this date range."
                )

        return attrs


class LeaveReviewSerializer(serializers.Serializer):
    """
    Serializer for HR / Admin leave review decisions.
    """
    status = serializers.ChoiceField(choices=[Leave.STATUS_APPROVED, Leave.STATUS_REJECTED])
    review_comment = serializers.CharField(required=False, allow_blank=True)
