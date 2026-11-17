"""
Task Model
Represents actionable units of work linked to a Project and assigned to an Employee.
"""

from django.db import models


class Task(models.Model):
    """
    Task entity.
    Belongs to a Project and can be assigned to an Employee.
    Tracks status workflows and priority levels.
    """
    PRIORITY_LOW = 'LOW'
    PRIORITY_MEDIUM = 'MEDIUM'
    PRIORITY_HIGH = 'HIGH'

    PRIORITY_CHOICES = (
        (PRIORITY_LOW, 'Low'),
        (PRIORITY_MEDIUM, 'Medium'),
        (PRIORITY_HIGH, 'High'),
    )

    STATUS_TODO = 'TODO'
    STATUS_IN_PROGRESS = 'IN_PROGRESS'
    STATUS_REVIEW = 'REVIEW'
    STATUS_COMPLETED = 'COMPLETED'

    STATUS_CHOICES = (
        (STATUS_TODO, 'To Do'),
        (STATUS_IN_PROGRESS, 'In Progress'),
        (STATUS_REVIEW, 'In Review'),
        (STATUS_COMPLETED, 'Completed'),
    )

    title = models.CharField(max_length=200, help_text="Actionable task title")
    description = models.TextField(blank=True, help_text="Detailed task instructions")
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='tasks',
        help_text="Associated project"
    )
    assigned_to = models.ForeignKey(
        'employees.Employee',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_tasks',
        help_text="Assigned employee"
    )
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default=PRIORITY_MEDIUM
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_TODO
    )
    deadline = models.DateField(help_text="Expected completion deadline")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['deadline', '-priority']
        verbose_name = 'Task'
        verbose_name_plural = 'Tasks'

    def __str__(self):
        return f"{self.title} ({self.get_status_display()}) - {self.project.name}"
