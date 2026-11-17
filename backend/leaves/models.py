"""
Leave Application Model
Manages employee leave requests, approval lifecycle, and duration tracking.
"""

from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError


class Leave(models.Model):
    """
    Leave entity.
    Employees submit leave requests which are reviewed by HR or Admin users.
    Includes validation to ensure start_date <= end_date.
    """
    TYPE_CASUAL = 'CASUAL'
    TYPE_SICK = 'SICK'
    TYPE_PAID = 'PAID'
    TYPE_UNPAID = 'UNPAID'

    TYPE_CHOICES = (
        (TYPE_CASUAL, 'Casual Leave'),
        (TYPE_SICK, 'Sick Leave'),
        (TYPE_PAID, 'Paid Leave'),
        (TYPE_UNPAID, 'Unpaid Leave'),
    )

    STATUS_PENDING = 'PENDING'
    STATUS_APPROVED = 'APPROVED'
    STATUS_REJECTED = 'REJECTED'

    STATUS_CHOICES = (
        (STATUS_PENDING, 'Pending'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_REJECTED, 'Rejected'),
    )

    employee = models.ForeignKey(
        'employees.Employee',
        on_delete=models.CASCADE,
        related_name='leaves',
        help_text="Employee requesting leave"
    )
    leave_type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        default=TYPE_CASUAL
    )
    start_date = models.DateField(help_text="First day of leave")
    end_date = models.DateField(help_text="Last day of leave (inclusive)")
    reason = models.TextField(help_text="Reason for leave application")
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING
    )
    applied_on = models.DateTimeField(auto_now_add=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_leaves',
        help_text="HR or Admin who reviewed this request"
    )
    review_comment = models.TextField(
        blank=True,
        help_text="Optional feedback or rejection reason from reviewer"
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-applied_on']
        verbose_name = 'Leave Application'
        verbose_name_plural = 'Leave Applications'

    def __str__(self):
        return f"{self.employee.employee_id} - {self.get_leave_type_display()} ({self.start_date} to {self.end_date}) [{self.get_status_display()}]"

    def clean(self):
        """
        Model-level validation to prevent inverted date ranges.
        """
        if self.start_date and self.end_date:
            if self.start_date > self.end_date:
                raise ValidationError({'end_date': 'End date must be on or after start date.'})

    @property
    def total_days(self):
        """Calculates total calendar days requested."""
        if self.start_date and self.end_date:
            return (self.end_date - self.start_date).days + 1
        return 0
