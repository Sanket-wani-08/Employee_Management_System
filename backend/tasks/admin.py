"""
Admin configuration for Task model.
"""

from django.contrib import admin
from .models import Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    """
    Task Admin with quick inline status/priority editing and filtering.
    """
    list_display = (
        'title',
        'project',
        'assigned_to',
        'priority',
        'status',
        'deadline',
        'created_at',
    )
    list_filter = ('status', 'priority', 'deadline', 'project')
    search_fields = (
        'title',
        'description',
        'project__name',
        'assigned_to__user__first_name',
        'assigned_to__user__last_name',
        'assigned_to__employee_id',
    )
    list_editable = ('status', 'priority')
    date_hierarchy = 'deadline'
    ordering = ('deadline', '-priority')
    list_per_page = 25
