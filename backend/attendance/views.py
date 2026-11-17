"""
Views for Attendance Management.
Implements employee daily check-in, check-out, duplicate prevention,
attendance history, and HR-wide summaries.
"""

from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from django.utils import timezone
from datetime import datetime

from .models import Attendance
from .serializers import AttendanceSerializer
from employees.models import User, Employee


class AttendanceViewSet(viewsets.ModelViewSet):
    """
    Attendance ViewSet.
    Enforces role visibility:
      - HR & Admin: View all company-wide attendance and perform manual adjustments.
      - Regular Employees: Self-service check-in/out and personal attendance history.
    """
    queryset = Attendance.objects.select_related(
        'employee__user',
        'employee__department'
    ).all().order_by('-date', 'employee__employee_id')

    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        'employee__employee_id',
        'employee__user__first_name',
        'employee__user__last_name',
        'notes',
    ]
    ordering_fields = ['date', 'status', 'created_at']

    def get_queryset(self):
        """
        Filters attendance records based on requesting user's authorization role.
        """
        user = self.request.user
        queryset = super().get_queryset()

        # Regular employees and PMs only view their own attendance by default
        if user.role not in [User.ROLE_ADMIN, User.ROLE_HR] and not user.is_superuser:
            if hasattr(user, 'employee_profile'):
                queryset = queryset.filter(employee=user.employee_profile)
            else:
                return queryset.none()

        # Query param filters
        date_param = self.request.query_params.get('date')
        if date_param:
            queryset = queryset.filter(date=date_param)

        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param.upper())

        emp_id = self.request.query_params.get('employee')
        if emp_id:
            queryset = queryset.filter(employee_id=emp_id)

        dept_id = self.request.query_params.get('department')
        if dept_id:
            queryset = queryset.filter(employee__department_id=dept_id)

        return queryset

    def get_permissions(self):
        """Manual create/delete via direct CRUD endpoints requires Admin or HR."""
        if self.action in ['create', 'destroy']:
            user = self.request.user
            if not (user and (user.role in [User.ROLE_ADMIN, User.ROLE_HR] or user.is_superuser)):
                raise PermissionDenied("Only HR and Administrators can manually create or delete attendance logs.")
        return [permission() for permission in self.permission_classes]

    @action(detail=False, methods=['post'], url_path='check-in')
    def check_in(self, request):
        """
        Endpoint: POST /api/attendance/check-in/
        Logs daily check-in timestamp for the authenticated employee.
        Prevents duplicate check-in on the same date.
        """
        user = request.user
        if not hasattr(user, 'employee_profile'):
            return Response({"error": "No employee profile associated with this account."}, status=status.HTTP_400_BAD_REQUEST)

        emp = user.employee_profile
        today = timezone.localdate()
        current_time = timezone.localtime().time().replace(microsecond=0)

        # Check for existing record
        record, created = Attendance.objects.get_or_create(
            employee=emp,
            date=today,
            defaults={
                'check_in': current_time,
                'status': Attendance.STATUS_PRESENT,
                'notes': request.data.get('notes', ''),
            }
        )

        if not created:
            if record.check_in:
                return Response(
                    {"error": f"You have already checked in today at {record.check_in.strftime('%H:%M:%S')}."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            record.check_in = current_time
            record.status = Attendance.STATUS_PRESENT
            record.save()

        return Response(
            {
                "message": f"Check-in recorded successfully at {current_time.strftime('%H:%M:%S')}.",
                "data": self.get_serializer(record).data,
            },
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['post'], url_path='check-out')
    def check_out(self, request):
        """
        Endpoint: POST /api/attendance/check-out/
        Logs daily check-out timestamp for the authenticated employee.
        """
        user = request.user
        if not hasattr(user, 'employee_profile'):
            return Response({"error": "No employee profile found."}, status=status.HTTP_400_BAD_REQUEST)

        emp = user.employee_profile
        today = timezone.localdate()
        current_time = timezone.localtime().time().replace(microsecond=0)

        try:
            record = Attendance.objects.get(employee=emp, date=today)
        except Attendance.DoesNotExist:
            return Response(
                {"error": "You have not checked in today yet. Please check in first."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if record.check_out:
            return Response(
                {"error": f"You have already checked out today at {record.check_out.strftime('%H:%M:%S')}."},
                status=status.HTTP_400_BAD_REQUEST
            )

        record.check_out = current_time
        record.save()

        return Response(
            {
                "message": f"Check-out recorded successfully at {current_time.strftime('%H:%M:%S')}.",
                "data": self.get_serializer(record).data,
            },
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['get'], url_path='today')
    def today_status(self, request):
        """
        Endpoint: GET /api/attendance/today/
        Returns today's check-in / check-out state for the authenticated employee.
        Used by the frontend to toggle the Check In / Check Out dashboard button.
        """
        user = request.user
        if not hasattr(user, 'employee_profile'):
            return Response({"checked_in": False, "checked_out": False})

        emp = user.employee_profile
        today = timezone.localdate()
        record = Attendance.objects.filter(employee=emp, date=today).first()

        if not record:
            return Response({
                "date": str(today),
                "checked_in": False,
                "checked_out": False,
                "check_in_time": None,
                "check_out_time": None,
                "status": None
            })

        return Response({
            "date": str(today),
            "checked_in": bool(record.check_in),
            "checked_out": bool(record.check_out),
            "check_in_time": record.check_in.strftime('%H:%M:%S') if record.check_in else None,
            "check_out_time": record.check_out.strftime('%H:%M:%S') if record.check_out else None,
            "status": record.status,
            "record_id": record.id
        })

    @action(detail=False, methods=['get'], url_path='my-attendance')
    def my_attendance(self, request):
        """
        Endpoint: GET /api/attendance/my-attendance/
        Returns personal attendance logs for the authenticated employee.
        """
        user = request.user
        if not hasattr(user, 'employee_profile'):
            return Response([])

        emp = user.employee_profile
        records = Attendance.objects.filter(employee=emp).order_by('-date')
        page = self.paginate_queryset(records)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(records, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        """
        Endpoint: GET /api/attendance/summary/
        Returns total attendance statistics.
        """
        qs = self.get_queryset()
        total = qs.count()
        present = qs.filter(status=Attendance.STATUS_PRESENT).count()
        absent = qs.filter(status=Attendance.STATUS_ABSENT).count()
        half_day = qs.filter(status=Attendance.STATUS_HALF_DAY).count()
        late = qs.filter(status=Attendance.STATUS_LATE).count()

        return Response({
            "total_records": total,
            "present": present,
            "absent": absent,
            "half_day": half_day,
            "late": late,
        })
