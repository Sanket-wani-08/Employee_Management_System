"""
Admin configuration for Employee and Custom User models.
Provides rich search, filter, and inline management capabilities.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Employee


class EmployeeInline(admin.StackedInline):
    """
    Allows editing Employee profile directly from the User admin page.
    """
    model = Employee
    can_delete = False
    verbose_name = 'Employee Profile'
    verbose_name_plural = 'Employee Profiles'
    fk_name = 'user'
    extra = 0


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Custom User Admin displaying RBAC roles and linking Employee details.
    """
    inlines = (EmployeeInline,)
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'is_staff', 'is_active')
    list_filter = ('role', 'is_staff', 'is_active', 'date_joined')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('username',)

    # Expose custom 'role' field in edit form
    fieldsets = BaseUserAdmin.fieldsets + (
        ('System Role & Authorization', {'fields': ('role',)}),
    )

    # Expose custom 'role' field in creation form
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('System Role & Authorization', {'fields': ('role', 'email')}),
    )


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    """
    Employee Admin for managing workforce details, salaries, and department assignments.
    """
    list_display = (
        'employee_id',
        'full_name',
        'email',
        'department',
        'designation',
        'salary',
        'employment_status',
        'joining_date',
    )
    list_filter = ('employment_status', 'department', 'joining_date')
    search_fields = (
        'employee_id',
        'user__first_name',
        'user__last_name',
        'user__email',
        'designation',
        'phone',
    )
    ordering = ('employee_id',)
    list_per_page = 20

    def full_name(self, obj):
        return obj.full_name
    full_name.short_description = 'Full Name'

    def email(self, obj):
        return obj.email
    email.short_description = 'Email'
