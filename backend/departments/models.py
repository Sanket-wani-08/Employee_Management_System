"""
Department Model
Represents functional units/divisions within the organization.
"""

from django.db import models


class Department(models.Model):
    """
    Department entity.
    Employees belong to a department.
    Deleting a department with active employees is blocked via models.PROTECT in Employee model.
    """
    name = models.CharField(max_length=100, unique=True, help_text="Unique department name")
    description = models.TextField(blank=True, help_text="Brief description of department function")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Department'
        verbose_name_plural = 'Departments'

    def __str__(self):
        return self.name

    @property
    def total_employees(self):
        """Returns the total number of employees in this department."""
        return self.employees.count()
