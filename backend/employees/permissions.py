"""
Custom Role-Based Permissions for DRF.
Enforces authorization rules at the API level for:
- ADMIN: Full access across the entire system.
- HR: Manage employees, departments, attendance, and leave approvals.
- PROJECT_MANAGER: Manage assigned projects and tasks.
- EMPLOYEE: Self-service access (personal details, assigned tasks, leave requests).
"""

from rest_framework import permissions
from .models import User


class IsAdmin(permissions.BasePermission):
    """
    Grants access only to users with the ADMIN role or superusers.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.role == User.ROLE_ADMIN or request.user.is_superuser)
        )


class IsHR(permissions.BasePermission):
    """
    Grants access to HR staff and Admins.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.role in [User.ROLE_HR, User.ROLE_ADMIN] or request.user.is_superuser)
        )


class IsProjectManager(permissions.BasePermission):
    """
    Grants access to Project Managers and Admins.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.role in [User.ROLE_PROJECT_MANAGER, User.ROLE_ADMIN] or request.user.is_superuser)
        )


class IsAdminOrHR(permissions.BasePermission):
    """
    Grants permission if user has ADMIN or HR role.
    Used for employee roster management and leave approvals.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.role in [User.ROLE_ADMIN, User.ROLE_HR] or request.user.is_superuser)
        )


class IsAdminOrHROrReadOnly(permissions.BasePermission):
    """
    Allows read-only access (GET, HEAD, OPTIONS) to any authenticated user,
    but write operations (POST, PUT, PATCH, DELETE) require ADMIN or HR role.
    Ideal for Departments and Employee Directory.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return (request.user.role in [User.ROLE_ADMIN, User.ROLE_HR] or request.user.is_superuser)


class IsOwnerOrAdminOrHR(permissions.BasePermission):
    """
    Object-level permission:
    Allows object owners (e.g. employee viewing their own record) or Admin/HR to read/write.
    """
    def has_object_permission(self, request, view, obj):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.role in [User.ROLE_ADMIN, User.ROLE_HR] or request.user.is_superuser:
            return True
        # Check if the object is an Employee or has an employee relation
        if hasattr(obj, 'user'):
            return obj.user == request.user
        if hasattr(obj, 'employee'):
            return obj.employee.user == request.user
        return False

