"""
Views for Role-Based Dashboards and CSV Report Exports.
Supports:
  - Role-specific dashboard metrics for ADMIN, HR, PROJECT_MANAGER, and EMPLOYEE.
  - JSON report previews and CSV download endpoints for:
    - Employees
    - Attendance
    - Leaves
    - Projects
    - Tasks
"""

import csv
from datetime import date, timedelta
from django.utils import timezone
from django.db.models import Count, Q
from django.http import HttpResponse

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied

from departments.models import Department
from employees.models import User, Employee
from projects.models import Project
from tasks.models import Task
from attendance.models import Attendance
from leaves.models import Leave


# Dashboard stats endpoint (returns data based on logged-in user role)
class DashboardStatsView(APIView):
    """
    GET /api/dashboard/stats/
    Returns specialized metrics tailored to the authenticated user's role:
      - ADMIN: System-wide counts (employees, departments, projects, tasks, attendance, leaves)
      - HR: Workforce distribution, attendance summaries, pending leave queue
      - PROJECT_MANAGER: Managed projects, task completion velocity, overdue tasks
      - EMPLOYEE: Personal tasks, upcoming deadlines, today's attendance, leave history
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        role = user.role
        today = timezone.localdate()

        # Shared base stats
        data = {
            "role": role,
            "today": str(today),
        }

        # ------------------------------------------------------------------
        # ADMIN DASHBOARD
        # ------------------------------------------------------------------
        if role == User.ROLE_ADMIN or user.is_superuser:
            total_employees = Employee.objects.count()
            active_employees = Employee.objects.filter(employment_status=Employee.STATUS_ACTIVE).count()
            total_departments = Department.objects.count()

            # Projects breakdown
            total_projects = Project.objects.count()
            projects_in_progress = Project.objects.filter(status=Project.STATUS_IN_PROGRESS).count()
            projects_completed = Project.objects.filter(status=Project.STATUS_COMPLETED).count()

            # Tasks breakdown
            total_tasks = Task.objects.count()
            tasks_completed = Task.objects.filter(status=Task.STATUS_COMPLETED).count()
            tasks_pending = total_tasks - tasks_completed
            tasks_overdue = Task.objects.filter(deadline__lt=today).exclude(status=Task.STATUS_COMPLETED).count()

            # Leaves & Attendance
            pending_leaves = Leave.objects.filter(status=Leave.STATUS_PENDING).count()
            today_attendance = Attendance.objects.filter(date=today)
            checked_in_today = today_attendance.filter(check_in__isnull=False).count()

            data.update({
                "overview": {
                    "total_employees": total_employees,
                    "active_employees": active_employees,
                    "total_departments": total_departments,
                    "total_projects": total_projects,
                    "projects_in_progress": projects_in_progress,
                    "projects_completed": projects_completed,
                    "total_tasks": total_tasks,
                    "tasks_completed": tasks_completed,
                    "tasks_pending": tasks_pending,
                    "tasks_overdue": tasks_overdue,
                    "pending_leaves": pending_leaves,
                    "checked_in_today": checked_in_today,
                },
                "department_distribution": list(
                    Department.objects.annotate(employee_count=Count('employees'))
                    .values('name', 'employee_count')
                ),
                "recent_leaves": list(
                    Leave.objects.select_related('employee__user')
                    .order_by('-applied_on')[:5]
                    .values('id', 'employee__user__first_name', 'employee__user__last_name', 'leave_type', 'start_date', 'end_date', 'status')
                ),
            })
            return Response(data)

        # ------------------------------------------------------------------
        # HR DASHBOARD
        # ------------------------------------------------------------------
        elif role == User.ROLE_HR:
            total_employees = Employee.objects.count()
            active_employees = Employee.objects.filter(employment_status=Employee.STATUS_ACTIVE).count()
            inactive_employees = total_employees - active_employees
            total_departments = Department.objects.count()

            today_attendance = Attendance.objects.filter(date=today)
            present_today = today_attendance.filter(status=Attendance.STATUS_PRESENT).count()

            pending_leaves = Leave.objects.filter(status=Leave.STATUS_PENDING).count()
            pending_leave_list = list(
                Leave.objects.filter(status=Leave.STATUS_PENDING)
                .select_related('employee__user')
                .order_by('-applied_on')[:10]
                .values('id', 'employee__employee_id', 'employee__user__first_name', 'employee__user__last_name', 'leave_type', 'start_date', 'end_date', 'reason')
            )

            data.update({
                "overview": {
                    "total_employees": total_employees,
                    "active_employees": active_employees,
                    "inactive_employees": inactive_employees,
                    "total_departments": total_departments,
                    "present_today": present_today,
                    "pending_leaves": pending_leaves,
                },
                "department_stats": list(
                    Department.objects.annotate(employee_count=Count('employees'))
                    .values('id', 'name', 'employee_count')
                ),
                "pending_leaves_queue": pending_leave_list,
            })
            return Response(data)

        # ------------------------------------------------------------------
        # PROJECT MANAGER DASHBOARD
        # ------------------------------------------------------------------
        elif role == User.ROLE_PROJECT_MANAGER:
            emp = getattr(user, 'employee_profile', None)
            if not emp:
                return Response(data)

            managed_projects = Project.objects.filter(project_manager=emp)
            total_projects = managed_projects.count()

            project_ids = managed_projects.values_list('id', flat=True)
            tasks = Task.objects.filter(project_id__in=project_ids)

            total_tasks = tasks.count()
            completed_tasks = tasks.filter(status=Task.STATUS_COMPLETED).count()
            in_progress_tasks = tasks.filter(status=Task.STATUS_IN_PROGRESS).count()
            todo_tasks = tasks.filter(status=Task.STATUS_TODO).count()
            overdue_tasks = tasks.filter(deadline__lt=today).exclude(status=Task.STATUS_COMPLETED).count()

            data.update({
                "overview": {
                    "assigned_projects_count": total_projects,
                    "total_tasks": total_tasks,
                    "completed_tasks": completed_tasks,
                    "in_progress_tasks": in_progress_tasks,
                    "todo_tasks": todo_tasks,
                    "overdue_tasks": overdue_tasks,
                },
                "projects_summary": list(
                    managed_projects.values('id', 'name', 'status', 'start_date', 'deadline')
                ),
                "critical_tasks": list(
                    tasks.filter(priority=Task.PRIORITY_HIGH).exclude(status=Task.STATUS_COMPLETED)
                    .values('id', 'title', 'deadline', 'status', 'priority', 'project__name')[:8]
                ),
            })
            return Response(data)

        # ------------------------------------------------------------------
        # EMPLOYEE DASHBOARD
        # ------------------------------------------------------------------
        else:
            emp = getattr(user, 'employee_profile', None)
            if not emp:
                return Response(data)

            my_tasks = Task.objects.filter(assigned_to=emp)
            total_tasks = my_tasks.count()
            completed_tasks = my_tasks.filter(status=Task.STATUS_COMPLETED).count()
            pending_tasks = my_tasks.exclude(status=Task.STATUS_COMPLETED).count()
            overdue_tasks = my_tasks.filter(deadline__lt=today).exclude(status=Task.STATUS_COMPLETED).count()

            # Upcoming deadlines (next 7 days)
            upcoming_tasks = list(
                my_tasks.filter(deadline__gte=today, deadline__lte=today + timedelta(days=7))
                .exclude(status=Task.STATUS_COMPLETED)
                .values('id', 'title', 'deadline', 'priority', 'status', 'project__name')
            )

            # Today's attendance
            today_att = Attendance.objects.filter(employee=emp, date=today).first()
            att_info = {
                "checked_in": bool(today_att and today_att.check_in),
                "checked_out": bool(today_att and today_att.check_out),
                "check_in_time": today_att.check_in.strftime('%H:%M:%S') if (today_att and today_att.check_in) else None,
                "check_out_time": today_att.check_out.strftime('%H:%M:%S') if (today_att and today_att.check_out) else None,
            }

            # Leaves summary
            my_leaves = Leave.objects.filter(employee=emp)
            leaves_summary = {
                "total": my_leaves.count(),
                "pending": my_leaves.filter(status=Leave.STATUS_PENDING).count(),
                "approved": my_leaves.filter(status=Leave.STATUS_APPROVED).count(),
                "rejected": my_leaves.filter(status=Leave.STATUS_REJECTED).count(),
            }

            data.update({
                "profile": {
                    "employee_id": emp.employee_id,
                    "full_name": emp.full_name,
                    "designation": emp.designation,
                    "department": emp.department.name if emp.department else 'N/A',
                },
                "tasks_overview": {
                    "total": total_tasks,
                    "completed": completed_tasks,
                    "pending": pending_tasks,
                    "overdue": overdue_tasks,
                },
                "upcoming_deadlines": upcoming_tasks,
                "attendance_today": att_info,
                "leaves_summary": leaves_summary,
            })
            return Response(data)


# Report preview and CSV export views
class EmployeeReportView(APIView):
    """
    GET /api/dashboard/reports/employees/
    GET /api/dashboard/reports/employees/export-csv/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, export=False):
        if request.user.role not in [User.ROLE_ADMIN, User.ROLE_HR] and not request.user.is_superuser:
            raise PermissionDenied("Only HR and Administrators can generate Employee reports.")

        employees = Employee.objects.select_related('user', 'department').all().order_by('employee_id')

        # CSV Export
        if export or request.path.endswith('/export-csv/'):
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="employee_report_{date.today()}.csv"'
            writer = csv.writer(response)
            writer.writerow(['Employee ID', 'Username', 'Full Name', 'Email', 'Department', 'Designation', 'Joining Date', 'Salary', 'Status', 'Phone'])

            for e in employees:
                writer.writerow([
                    e.employee_id,
                    e.user.username,
                    e.full_name,
                    e.email,
                    e.department.name if e.department else 'N/A',
                    e.designation,
                    e.joining_date,
                    e.salary,
                    e.employment_status,
                    e.phone,
                ])
            return response

        # JSON Preview
        data = [
            {
                'employee_id': e.employee_id,
                'full_name': e.full_name,
                'email': e.email,
                'department': e.department.name if e.department else 'N/A',
                'designation': e.designation,
                'joining_date': str(e.joining_date),
                'salary': str(e.salary),
                'status': e.employment_status,
            }
            for e in employees
        ]
        return Response(data)


class AttendanceReportView(APIView):
    """
    GET /api/dashboard/reports/attendance/
    GET /api/dashboard/reports/attendance/export-csv/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, export=False):
        user = request.user
        qs = Attendance.objects.select_related('employee__user', 'employee__department').all().order_by('-date')

        # Restrict regular employees to their own attendance
        if user.role not in [User.ROLE_ADMIN, User.ROLE_HR] and not user.is_superuser:
            if hasattr(user, 'employee_profile'):
                qs = qs.filter(employee=user.employee_profile)
            else:
                qs = qs.none()

        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        if start_date:
            qs = qs.filter(date__gte=start_date)
        if end_date:
            qs = qs.filter(date__lte=end_date)

        if export or request.path.endswith('/export-csv/'):
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="attendance_report_{date.today()}.csv"'
            writer = csv.writer(response)
            writer.writerow(['Date', 'Employee ID', 'Name', 'Department', 'Check In', 'Check Out', 'Status', 'Notes'])

            for a in qs:
                writer.writerow([
                    a.date,
                    a.employee.employee_id,
                    a.employee.full_name,
                    a.employee.department.name if a.employee.department else 'N/A',
                    a.check_in.strftime('%H:%M:%S') if a.check_in else '',
                    a.check_out.strftime('%H:%M:%S') if a.check_out else '',
                    a.status,
                    a.notes,
                ])
            return response

        data = [
            {
                'date': str(a.date),
                'employee_id': a.employee.employee_id,
                'name': a.employee.full_name,
                'department': a.employee.department.name if a.employee.department else 'N/A',
                'check_in': a.check_in.strftime('%H:%M:%S') if a.check_in else None,
                'check_out': a.check_out.strftime('%H:%M:%S') if a.check_out else None,
                'status': a.status,
            }
            for a in qs[:100]
        ]
        return Response(data)


class LeaveReportView(APIView):
    """
    GET /api/dashboard/reports/leaves/
    GET /api/dashboard/reports/leaves/export-csv/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, export=False):
        user = request.user
        qs = Leave.objects.select_related('employee__user', 'reviewed_by').all().order_by('-applied_on')

        if user.role not in [User.ROLE_ADMIN, User.ROLE_HR] and not user.is_superuser:
            if hasattr(user, 'employee_profile'):
                qs = qs.filter(employee=user.employee_profile)
            else:
                qs = qs.none()

        if export or request.path.endswith('/export-csv/'):
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="leave_report_{date.today()}.csv"'
            writer = csv.writer(response)
            writer.writerow(['Employee ID', 'Name', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Reason', 'Status', 'Reviewed By'])

            for l in qs:
                writer.writerow([
                    l.employee.employee_id,
                    l.employee.full_name,
                    l.get_leave_type_display(),
                    l.start_date,
                    l.end_date,
                    l.total_days,
                    l.reason,
                    l.get_status_display(),
                    l.reviewed_by.get_full_name() if l.reviewed_by else '',
                ])
            return response

        data = [
            {
                'employee_id': l.employee.employee_id,
                'name': l.employee.full_name,
                'leave_type': l.get_leave_type_display(),
                'start_date': str(l.start_date),
                'end_date': str(l.end_date),
                'days': l.total_days,
                'status': l.get_status_display(),
                'reviewed_by': l.reviewed_by.get_full_name() if l.reviewed_by else None,
            }
            for l in qs[:100]
        ]
        return Response(data)


class ProjectReportView(APIView):
    """
    GET /api/dashboard/reports/projects/
    GET /api/dashboard/reports/projects/export-csv/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, export=False):
        projects = Project.objects.select_related('project_manager__user').prefetch_related('tasks').all().order_by('-created_at')

        if export or request.path.endswith('/export-csv/'):
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="project_report_{date.today()}.csv"'
            writer = csv.writer(response)
            writer.writerow(['Project Name', 'Status', 'Manager', 'Start Date', 'Deadline', 'Total Tasks', 'Completed Tasks', 'Progress (%)'])

            for p in projects:
                total = p.total_tasks
                done = p.completed_tasks
                pct = round((done / total * 100), 1) if total > 0 else 0
                writer.writerow([
                    p.name,
                    p.get_status_display(),
                    p.project_manager.full_name if p.project_manager else 'Unassigned',
                    p.start_date,
                    p.deadline,
                    total,
                    done,
                    f"{pct}%",
                ])
            return response

        data = [
            {
                'id': p.id,
                'name': p.name,
                'status': p.get_status_display(),
                'manager': p.project_manager.full_name if p.project_manager else 'Unassigned',
                'start_date': str(p.start_date),
                'deadline': str(p.deadline),
                'total_tasks': p.total_tasks,
                'completed_tasks': p.completed_tasks,
            }
            for p in projects
        ]
        return Response(data)


class TaskReportView(APIView):
    """
    GET /api/dashboard/reports/tasks/
    GET /api/dashboard/reports/tasks/export-csv/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, export=False):
        tasks = Task.objects.select_related('project', 'assigned_to__user').all().order_by('deadline')

        if export or request.path.endswith('/export-csv/'):
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="task_report_{date.today()}.csv"'
            writer = csv.writer(response)
            writer.writerow(['Task Title', 'Project', 'Assigned To', 'Priority', 'Status', 'Deadline'])

            for t in tasks:
                writer.writerow([
                    t.title,
                    t.project.name,
                    t.assigned_to.full_name if t.assigned_to else 'Unassigned',
                    t.get_priority_display(),
                    t.get_status_display(),
                    t.deadline,
                ])
            return response

        data = [
            {
                'id': t.id,
                'title': t.title,
                'project': t.project.name,
                'assigned_to': t.assigned_to.full_name if t.assigned_to else 'Unassigned',
                'priority': t.get_priority_display(),
                'status': t.get_status_display(),
                'deadline': str(t.deadline),
            }
            for t in tasks
        ]
        return Response(data)
