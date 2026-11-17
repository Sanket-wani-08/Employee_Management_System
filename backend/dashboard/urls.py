"""
URL routes for Dashboard and Reports endpoints.
"""

from django.urls import path
from .views import (
    DashboardStatsView,
    EmployeeReportView,
    AttendanceReportView,
    LeaveReportView,
    ProjectReportView,
    TaskReportView,
)

urlpatterns = [
    # Role-Based Dashboard Metrics
    path('stats/', DashboardStatsView.as_view(), name='dashboard_stats'),

    # Reports Previews & CSV Exports
    path('reports/employees/', EmployeeReportView.as_view(), name='report_employees'),
    path('reports/employees/export-csv/', EmployeeReportView.as_view(), {'export': True}, name='export_employees_csv'),

    path('reports/attendance/', AttendanceReportView.as_view(), name='report_attendance'),
    path('reports/attendance/export-csv/', AttendanceReportView.as_view(), {'export': True}, name='export_attendance_csv'),

    path('reports/leaves/', LeaveReportView.as_view(), name='report_leaves'),
    path('reports/leaves/export-csv/', LeaveReportView.as_view(), {'export': True}, name='export_leaves_csv'),

    path('reports/projects/', ProjectReportView.as_view(), name='report_projects'),
    path('reports/projects/export-csv/', ProjectReportView.as_view(), {'export': True}, name='export_projects_csv'),

    path('reports/tasks/', TaskReportView.as_view(), name='report_tasks'),
    path('reports/tasks/export-csv/', TaskReportView.as_view(), {'export': True}, name='export_tasks_csv'),
]

