"""
Admin configuration for Attendance model.
"""

from django.contrib import admin
from .models import Attendance


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    """
    Attendance Admin for monitoring daily check-ins, check-outs, and absence records.
    """
    list_display = (
        'employee_id_display',
        'employee_name',
        'department',
        'date',
        'check_in',
        'check_out',
        'status',
        'notes',
    )
    list_filter = ('status', 'date', 'employee__department')
    search_fields = (
        'employee__employee_id',
        'employee__user__first_name',
        'employee__user__last_name',
        'employee__user__email',
        'notes',
    )
    date_hierarchy = 'date'
    ordering = ('-date', 'employee__employee_id')
    list_per_page = 30

    def employee_id_display(self, obj):
        return obj.employee.employee_id
    employee_id_display.short_description = 'Employee ID'

    def employee_name(self, obj):
        return obj.employee.full_name
    employee_name.short_description = 'Name'

    def department(self, obj):
        return obj.employee.department.name if obj.employee.department else 'N/A'
    department.short_description = 'Department'
