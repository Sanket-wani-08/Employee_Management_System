"""
Employee and Custom User Models.
Implements Role-Based Access Control (RBAC) and Employee Profile details.
"""

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom User Model extending Django's built-in AbstractUser.
    Includes role-based access control (RBAC) for the 4 core system roles.
    """
    ROLE_ADMIN = 'ADMIN'
    ROLE_HR = 'HR'
    ROLE_PROJECT_MANAGER = 'PROJECT_MANAGER'
    ROLE_EMPLOYEE = 'EMPLOYEE'

    ROLE_CHOICES = (
        (ROLE_ADMIN, 'Admin'),
        (ROLE_HR, 'HR'),
        (ROLE_PROJECT_MANAGER, 'Project Manager'),
        (ROLE_EMPLOYEE, 'Employee'),
    )

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default=ROLE_EMPLOYEE,
        help_text="System authorization role"
    )
    email = models.EmailField(unique=True, help_text="Unique email address for user")

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

    @property
    def is_admin(self):
        return self.role == self.ROLE_ADMIN or self.is_superuser

    @property
    def is_hr(self):
        return self.role == self.ROLE_HR

    @property
    def is_project_manager(self):
        return self.role == self.ROLE_PROJECT_MANAGER

    @property
    def is_employee_user(self):
        return self.role == self.ROLE_EMPLOYEE


class Employee(models.Model):
    """
    Employee Model representing workforce personnel.
    Linked 1-to-1 with a User account for authentication and role authorization.
    """
    STATUS_ACTIVE = 'ACTIVE'
    STATUS_INACTIVE = 'INACTIVE'
    STATUS_TERMINATED = 'TERMINATED'

    STATUS_CHOICES = (
        (STATUS_ACTIVE, 'Active'),
        (STATUS_INACTIVE, 'Inactive'),
        (STATUS_TERMINATED, 'Terminated'),
    )

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='employee_profile',
        help_text="Underlying user account for this employee"
    )
    employee_id = models.CharField(
        max_length=20,
        unique=True,
        help_text="Unique organizational identifier e.g. EMP001"
    )
    phone = models.CharField(max_length=20, blank=True)
    department = models.ForeignKey(
        'departments.Department',
        on_delete=models.PROTECT,
        related_name='employees',
        null=True,
        blank=True,
        help_text="Department assignment. Protected from deletion if employees exist."
    )
    designation = models.CharField(max_length=100, help_text="Job title / role")
    joining_date = models.DateField()
    salary = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    employment_status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_ACTIVE
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['employee_id']
        verbose_name = 'Employee'
        verbose_name_plural = 'Employees'

    def __str__(self):
        full_name = self.user.get_full_name() or self.user.username
        return f"{self.employee_id} - {full_name} ({self.designation})"

    @property
    def full_name(self):
        return self.user.get_full_name() or self.user.username

    @property
    def email(self):
        return self.user.email
