"""
Views for Leave Management.
Provides leave applications, overlap validation, HR approval workflows,
and personal leave history tracking.
"""

from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from django.utils import timezone

from .models import Leave
from .serializers import LeaveSerializer, LeaveReviewSerializer
from employees.models import User, Employee


class LeaveViewSet(viewsets.ModelViewSet):
    """
    Leave ViewSet.
    Role-based visibility:
      - HR & Admin: Full visibility across the company, approve or reject leaves.
      - Regular Employees: Submit leave applications and view personal application history.
    """
    queryset = Leave.objects.select_related(
        'employee__user',
        'employee__department',
        'reviewed_by'
    ).all().order_by('-applied_on')

    serializer_class = LeaveSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        'employee__employee_id',
        'employee__user__first_name',
        'employee__user__last_name',
        'reason',
    ]
    ordering_fields = ['applied_on', 'start_date', 'status']

    def get_queryset(self):
        """
        Restricts regular employees to their own leaves; allows HR/Admin company-wide view.
        """
        user = self.request.user
        queryset = super().get_queryset()

        if user.role not in [User.ROLE_ADMIN, User.ROLE_HR] and not user.is_superuser:
            if hasattr(user, 'employee_profile'):
                queryset = queryset.filter(employee=user.employee_profile)
            else:
                return queryset.none()

        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param.upper())

        type_param = self.request.query_params.get('leave_type')
        if type_param:
            queryset = queryset.filter(leave_type=type_param.upper())

        emp_id = self.request.query_params.get('employee')
        if emp_id:
            queryset = queryset.filter(employee_id=emp_id)

        dept_id = self.request.query_params.get('department')
        if dept_id:
            queryset = queryset.filter(employee__department_id=dept_id)

        return queryset

    def perform_create(self, serializer):
        """
        Automatically attaches authenticated employee when regular employee applies.
        """
        user = self.request.user
        if not hasattr(user, 'employee_profile'):
            raise PermissionDenied("You must have an employee profile to apply for leave.")

        # If user is not HR/Admin, always force self-application
        if user.role not in [User.ROLE_ADMIN, User.ROLE_HR] and not user.is_superuser:
            serializer.save(employee=user.employee_profile, status=Leave.STATUS_PENDING)
        else:
            if 'employee' not in serializer.validated_data:
                serializer.save(employee=user.employee_profile, status=Leave.STATUS_PENDING)
            else:
                serializer.save(status=Leave.STATUS_PENDING)

    @action(detail=False, methods=['get'], url_path='my-leaves')
    def my_leaves(self, request):
        """
        Endpoint: GET /api/leaves/my-leaves/
        Returns personal leave applications for the authenticated employee.
        """
        user = request.user
        if not hasattr(user, 'employee_profile'):
            return Response([])

        emp = user.employee_profile
        leaves = Leave.objects.filter(employee=emp).order_by('-applied_on')
        page = self.paginate_queryset(leaves)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(leaves, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='pending')
    def pending_leaves(self, request):
        """
        Endpoint: GET /api/leaves/pending/
        Returns pending leave requests waiting for HR/Admin decision.
        """
        user = request.user
        if user.role not in [User.ROLE_ADMIN, User.ROLE_HR] and not user.is_superuser:
            raise PermissionDenied("Only HR and Administrators can view the pending approval queue.")

        pending = self.get_queryset().filter(status=Leave.STATUS_PENDING)
        page = self.paginate_queryset(pending)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(pending, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['patch', 'post'], url_path='review')
    def review_leave(self, request, pk=None):
        """
        Endpoint: POST/PATCH /api/leaves/{id}/review/
        Body: { "status": "APPROVED" | "REJECTED", "review_comment": "Optional remarks" }
        Allows HR or Admin to approve or reject a pending leave application.
        """
        user = request.user
        if user.role not in [User.ROLE_ADMIN, User.ROLE_HR] and not user.is_superuser:
            raise PermissionDenied("Only HR or Administrators can review leave applications.")

        leave = self.get_object()
        serializer = LeaveReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        leave.status = serializer.validated_data['status']
        leave.review_comment = serializer.validated_data.get('review_comment', '')
        leave.reviewed_by = user
        leave.save()

        return Response(
            {
                "message": f"Leave application has been {leave.get_status_display().lower()} successfully.",
                "data": self.get_serializer(leave).data,
            },
            status=status.HTTP_200_OK
        )
