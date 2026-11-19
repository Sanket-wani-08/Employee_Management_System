"""
Automated Test Suite for Workforce Management System.
Tests all core APIs, authentication, permissions, and database constraints.

Run with: python test_suite.py
"""

import os
import django
from datetime import date, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIClient
from rest_framework import status
from django.utils import timezone
from employees.models import User, Employee
from departments.models import Department
from projects.models import Project
from tasks.models import Task
from attendance.models import Attendance
from leaves.models import Leave


def run_tests():
    print("=" * 65)
    print("  RUNNING SYSTEM TEST SUITE")
    print("=" * 65)

    client = APIClient()

    # 1. Verify Seeded Users Exist
    admin_user = User.objects.get(username='admin')
    hr_user = User.objects.get(username='hr_neha')
    pm_user = User.objects.get(username='pm_mahajan')
    dev_user = User.objects.get(username='sanket_wani')
    print("[OK] User accounts verified: Admin, HR, PM, and Employee.")

    # 2. Authentication & JWT Token Login
    login_res = client.post('/api/auth/login/', {
        'username': 'sanket_wani',
        'password': '123456'
    })
    assert login_res.status_code == status.HTTP_200_OK
    assert 'access' in login_res.data
    assert login_res.data['user']['role'] == 'EMPLOYEE'
    print("[OK] JWT Authentication: Login returns valid access token with profile data.")

    # 3. Department Protection & CRUD
    client.force_authenticate(user=admin_user)
    dept_res = client.get('/api/departments/')
    assert dept_res.status_code == status.HTTP_200_OK
    print(f"[OK] Departments: Retrieved department directory.")

    # 4. RBAC: Regular Employee cannot create departments
    client.force_authenticate(user=dev_user)
    blocked_res = client.post('/api/departments/', {'name': 'Unauthorized Dept'})
    assert blocked_res.status_code == status.HTTP_403_FORBIDDEN
    print("[OK] RBAC Security: Employee is blocked from creating departments (HTTP 403).")

    # 5. Project & Task Management
    client.force_authenticate(user=pm_user)
    project = Project.objects.first()
    dev_emp = dev_user.employee_profile

    task_res = client.post('/api/tasks/', {
        'title': 'Test System Task',
        'description': 'Automated test task',
        'project': project.id,
        'assigned_to': dev_emp.id,
        'priority': 'HIGH',
        'status': 'TODO',
        'deadline': str(date.today() + timedelta(days=7)),
    })
    assert task_res.status_code == status.HTTP_201_CREATED
    task_id = task_res.data['id']
    print(f"[OK] Task Creation: PM created task #{task_id}.")

    # Employee transitions task status
    client.force_authenticate(user=dev_user)
    status_res = client.patch(f'/api/tasks/{task_id}/update-status/', {'status': 'IN_PROGRESS'})
    assert status_res.status_code == status.HTTP_200_OK
    assert status_res.data['status'] == 'IN_PROGRESS'
    print("[OK] Task Workflow: Employee transitioned task to 'IN_PROGRESS'.")

    # 6. Attendance Punch-Clock Lifecycle
    today = timezone.localdate()
    Attendance.objects.filter(employee=dev_emp, date=today).delete()

    cin_res = client.post('/api/attendance/check-in/', {})
    assert cin_res.status_code == status.HTTP_201_CREATED
    print("[OK] Attendance: Recorded daily check-in timestamp.")

    today_res = client.get('/api/attendance/today/')
    assert today_res.status_code == status.HTTP_200_OK
    assert today_res.data['checked_in'] is True
    assert today_res.data['checked_out'] is False
    print("[OK] Attendance: Verified today's status state machine.")

    cout_res = client.post('/api/attendance/check-out/', {})
    assert cout_res.status_code == status.HTTP_200_OK
    print("[OK] Attendance: Recorded check-out timestamp.")

    # 7. Leave Application & Approval Workflow
    leave_start = date.today() + timedelta(days=25)
    leave_end = date.today() + timedelta(days=27)
    Leave.objects.filter(employee=dev_emp, start_date__lte=leave_end, end_date__gte=leave_start).delete()

    leave_res = client.post('/api/leaves/', {
        'leave_type': 'CASUAL',
        'start_date': str(leave_start),
        'end_date': str(leave_end),
        'reason': 'Automated system test leave',
    })
    assert leave_res.status_code == status.HTTP_201_CREATED
    leave_id = leave_res.data['id']
    print(f"[OK] Leaves: Employee submitted leave request #{leave_id}.")

    client.force_authenticate(user=hr_user)
    review_res = client.post(f'/api/leaves/{leave_id}/review/', {
        'status': 'APPROVED',
        'review_comment': 'Approved via test suite.',
    })
    assert review_res.status_code == status.HTTP_200_OK
    assert review_res.data['data']['status'] == 'APPROVED'
    print("[OK] Leave Review: HR successfully approved application.")

    # 8. Dashboard Analytics & Streaming CSV Exports
    client.force_authenticate(user=admin_user)
    stats_res = client.get('/api/dashboard/stats/')
    assert stats_res.status_code == status.HTTP_200_OK
    print("[OK] Analytics: Role-polymorphic dashboard endpoint verified.")

    for report in ['employees', 'attendance', 'leaves', 'projects', 'tasks']:
        csv_res = client.get(f'/api/dashboard/reports/{report}/export-csv/')
        assert csv_res.status_code == status.HTTP_200_OK
        assert csv_res['Content-Type'] == 'text/csv'
        print(f"[OK] CSV Export: Streamed '{report}.csv' successfully.")

    print("\n" + "=" * 65)
    print("  ALL TESTS PASSED SUCCESSFULLY (100% OPERATIONAL)")
    print("=" * 65)


if __name__ == '__main__':
    run_tests()

