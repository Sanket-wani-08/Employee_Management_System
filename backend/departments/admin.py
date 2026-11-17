"""
Admin configuration for Department model.
"""

from django.contrib import admin
from .models import Department
from employees.models import Employee


class EmployeeTabularInline(admin.TabularInline):
    """
    Shows employees belonging to this department directly within the department view.
    """
    model = Employee
    extra = 0
    fields = ('employee_id', 'designation', 'employment_status', 'joining_date')
    readonly_fields = ('employee_id', 'designation', 'employment_status', 'joining_date')
    can_delete = False
    show_change_link = True


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    """
    Department Admin configuration with employee counters and roster display.
    """
    inlines = [EmployeeTabularInline]
    list_display = ('name', 'description', 'employee_count', 'created_at', 'updated_at')
    search_fields = ('name', 'description')
    ordering = ('name',)

    def employee_count(self, obj):
        return obj.total_employees
    employee_count.short_description = 'Total Employees'
