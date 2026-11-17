"""
Admin configuration for Project model.
"""

from django.contrib import admin
from .models import Project
from tasks.models import Task


class TaskInline(admin.TabularInline):
    """
    Shows tasks belonging to this project directly in the project edit page.
    """
    model = Task
    extra = 0
    fields = ('title', 'assigned_to', 'priority', 'status', 'deadline')
    show_change_link = True


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    """
    Project Admin configuration with team member selector and task inlines.
    """
    inlines = [TaskInline]
    list_display = (
        'name',
        'status',
        'project_manager',
        'team_size',
        'start_date',
        'deadline',
        'progress_overview',
    )
    list_filter = ('status', 'start_date', 'deadline')
    search_fields = (
        'name',
        'description',
        'project_manager__user__first_name',
        'project_manager__user__last_name',
        'project_manager__employee_id',
    )
    filter_horizontal = ('team_members',)
    date_hierarchy = 'deadline'
    ordering = ('-created_at',)

    def team_size(self, obj):
        return obj.team_members.count()
    team_size.short_description = 'Team Size'

    def progress_overview(self, obj):
        return f"{obj.completed_tasks}/{obj.total_tasks} Tasks Done"
    progress_overview.short_description = 'Progress'
