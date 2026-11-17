"""
Attendance Model
Tracks daily attendance, check-in and check-out timestamps for employees.
Enforces daily uniqueness per employee via database constraints.
"""

from django.db import models
from django.utils import timezone


class Attendance(models.Model):
    """
    Attendance record entity.
    Guarantees that an employee can have at most one attendance record per calendar date.
    """
    STATUS_PRESENT = 'PRESENT'
    STATUS_ABSENT = 'ABSENT'
    STATUS_HALF_DAY = 'HALF_DAY'
    STATUS_LATE = 'LATE'

    STATUS_CHOICES = (
        (STATUS_PRESENT, 'Present'),
        (STATUS_ABSENT, 'Absent'),
        (STATUS_HALF_DAY, 'Half Day'),
        (STATUS_LATE, 'Late'),
    )

    employee = models.ForeignKey(
        'employees.Employee',
        on_delete=models.CASCADE,
        related_name='attendance_records',
        help_text="Employee this record belongs to"
    )
    date = models.DateField(
        default=timezone.localdate,
        help_text="Attendance calendar date"
    )
    check_in = models.TimeField(
        null=True,
        blank=True,
        help_text="Time of check-in"
    )
    check_out = models.TimeField(
        null=True,
        blank=True,
        help_text="Time of check-out"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PRESENT
    )
    notes = models.CharField(
        max_length=255,
        blank=True,
        help_text="Optional remarks (e.g., worked remotely, early departure)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', 'employee__employee_id']
        constraints = [
            models.UniqueConstraint(
                fields=['employee', 'date'],
                name='unique_employee_daily_attendance'
            )
        ]
        verbose_name = 'Attendance'
        verbose_name_plural = 'Attendance Records'

    def __str__(self):
        return f"{self.employee.employee_id} - {self.date} [{self.get_status_display()}]"
