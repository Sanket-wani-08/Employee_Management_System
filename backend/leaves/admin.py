"""
Admin configuration for Leave model.
Includes custom admin actions for bulk approval and rejection.
"""

from django.contrib import admin
from .models import Leave


@admin.action(description='Approve selected leave requests')
def approve_selected_leaves(modeladmin, request, queryset):
    """
    Custom admin action allowing HR/Admin to approve multiple leave requests at once.
    """
    queryset.update(status=Leave.STATUS_APPROVED, reviewed_by=request.user)


@admin.action(description='Reject selected leave requests')
def reject_selected_leaves(modeladmin, request, queryset):
    """
    Custom admin action allowing HR/Admin to reject multiple leave requests at once.
    """
    queryset.update(status=Leave.STATUS_REJECTED, reviewed_by=request.user)


@admin.register(Leave)
class LeaveAdmin(admin.ModelAdmin):
    """
    Leave Admin with date hierarchy and approval actions.
    """
    list_display = (
        'employee_id_display',
        'employee_name',
        'leave_type',
        'start_date',
        'end_date',
        'total_days_display',
        'status',
        'applied_on',
        'reviewed_by',
    )
    list_filter = ('status', 'leave_type', 'start_date', 'applied_on')
    search_fields = (
        'employee__employee_id',
        'employee__user__first_name',
        'employee__user__last_name',
        'reason',
        'review_comment',
    )
    actions = [approve_selected_leaves, reject_selected_leaves]
    date_hierarchy = 'start_date'
    ordering = ('-applied_on',)
    list_per_page = 25

    def employee_id_display(self, obj):
        return obj.employee.employee_id
    employee_id_display.short_description = 'Employee ID'

    def employee_name(self, obj):
        return obj.employee.full_name
    employee_name.short_description = 'Name'

    def total_days_display(self, obj):
        return f"{obj.total_days} days"
    total_days_display.short_description = 'Duration'
