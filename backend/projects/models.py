"""
Project Model
Represents initiatives/projects managed by Project Managers and worked on by team members.
"""

from django.db import models


class Project(models.Model):
    """
    Project entity.
    Tracks project lifecycle, project manager assignment, and team members.
    """
    STATUS_PLANNED = 'PLANNED'
    STATUS_IN_PROGRESS = 'IN_PROGRESS'
    STATUS_COMPLETED = 'COMPLETED'
    STATUS_ON_HOLD = 'ON_HOLD'

    STATUS_CHOICES = (
        (STATUS_PLANNED, 'Planned'),
        (STATUS_IN_PROGRESS, 'In Progress'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_ON_HOLD, 'On Hold'),
    )

    name = models.CharField(max_length=200, help_text="Project title or name")
    description = models.TextField(blank=True, help_text="Project scope and details")
    project_manager = models.ForeignKey(
        'employees.Employee',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='managed_projects',
        help_text="Assigned Project Manager"
    )
    team_members = models.ManyToManyField(
        'employees.Employee',
        related_name='projects',
        blank=True,
        help_text="Employees assigned to work on this project"
    )
    start_date = models.DateField(help_text="Project commencement date")
    deadline = models.DateField(help_text="Expected completion deadline")
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PLANNED,
        help_text="Current lifecycle stage"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Project'
        verbose_name_plural = 'Projects'

    def __str__(self):
        return f"{self.name} [{self.get_status_display()}]"

    @property
    def total_tasks(self):
        return self.tasks.count()

    @property
    def completed_tasks(self):
        return self.tasks.filter(status='COMPLETED').count()
