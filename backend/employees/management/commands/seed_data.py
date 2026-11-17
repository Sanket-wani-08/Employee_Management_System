"""
Django Management Command to Seed Initial Enterprise Demo Data.
Creates sample departments, users for all 4 roles, employees, projects, tasks, attendance, and leaves.

Usage:
    python manage.py seed_data
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, time, timedelta

from departments.models import Department
from employees.models import User, Employee
from projects.models import Project
from tasks.models import Task
from attendance.models import Attendance
from leaves.models import Leave


class Command(BaseCommand):
    help = 'Seeds initial sample data for workforce and project management system'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Starting database seeding...'))

        # 1. Seed Departments
        dept_data = [
            {'name': 'Executive & Management', 'description': 'Corporate leadership and strategic direction'},
            {'name': 'Human Resources', 'description': 'Talent acquisition, employee welfare, and operations'},
            {'name': 'Product & Engineering', 'description': 'Software architecture, development, and engineering'},
            {'name': 'Quality Assurance', 'description': 'Quality testing, performance verification, and release standards'},
        ]

        departments = {}
        for d in dept_data:
            dept_obj, created = Department.objects.get_or_create(
                name=d['name'],
                defaults={'description': d['description']}
            )
            departments[d['name']] = dept_obj
            status_text = 'Created' if created else 'Existing'
            self.stdout.write(f"  [Department] {status_text}: {dept_obj.name}")

        # 2. Seed Users & Employee Profiles
        users_config = [
            {
                'username': 'admin',
                'email': 'admin@workforce.com',
                'first_name': 'Admin',
                'last_name': 'System',
                'role': User.ROLE_ADMIN,
                'is_staff': True,
                'is_superuser': True,
                'password': 'admin123',
                'emp_id': 'EMP001',
                'dept': 'Executive & Management',
                'designation': 'Chief Technology Officer',
                'salary': 150000.00,
                'phone': '+1-555-0101',
                'joining': date(2023, 1, 15),
            },
            {
                'username': 'hr_sarah',
                'email': 'sarah.hr@workforce.com',
                'first_name': 'Sarah',
                'last_name': 'Connor',
                'role': User.ROLE_HR,
                'is_staff': True,
                'is_superuser': False,
                'password': 'password123',
                'emp_id': 'EMP002',
                'dept': 'Human Resources',
                'designation': 'HR Operations Lead',
                'salary': 85000.00,
                'phone': '+1-555-0102',
                'joining': date(2023, 6, 1),
            },
            {
                'username': 'pm_alex',
                'email': 'alex.pm@workforce.com',
                'first_name': 'Alex',
                'last_name': 'Morgan',
                'role': User.ROLE_PROJECT_MANAGER,
                'is_staff': True,
                'is_superuser': False,
                'password': 'password123',
                'emp_id': 'EMP003',
                'dept': 'Product & Engineering',
                'designation': 'Senior Project Manager',
                'salary': 95000.00,
                'phone': '+1-555-0103',
                'joining': date(2023, 9, 10),
            },
            {
                'username': 'dev_john',
                'email': 'john.dev@workforce.com',
                'first_name': 'John',
                'last_name': 'Doe',
                'role': User.ROLE_EMPLOYEE,
                'is_staff': False,
                'is_superuser': False,
                'password': 'password123',
                'emp_id': 'EMP004',
                'dept': 'Product & Engineering',
                'designation': 'Full Stack Python Developer',
                'salary': 78000.00,
                'phone': '+1-555-0104',
                'joining': date(2024, 2, 1),
            },
            {
                'username': 'qa_priya',
                'email': 'priya.qa@workforce.com',
                'first_name': 'Priya',
                'last_name': 'Sharma',
                'role': User.ROLE_EMPLOYEE,
                'is_staff': False,
                'is_superuser': False,
                'password': 'password123',
                'emp_id': 'EMP005',
                'dept': 'Quality Assurance',
                'designation': 'QA Automation Engineer',
                'salary': 72000.00,
                'phone': '+1-555-0105',
                'joining': date(2024, 3, 15),
            },
        ]

        employees = {}
        users = {}
        for u in users_config:
            user_obj, u_created = User.objects.get_or_create(
                username=u['username'],
                defaults={
                    'email': u['email'],
                    'first_name': u['first_name'],
                    'last_name': u['last_name'],
                    'role': u['role'],
                    'is_staff': u['is_staff'],
                    'is_superuser': u['is_superuser'],
                }
            )
            if u_created:
                user_obj.set_password(u['password'])
                user_obj.save()

            users[u['username']] = user_obj

            emp_obj, e_created = Employee.objects.get_or_create(
                employee_id=u['emp_id'],
                defaults={
                    'user': user_obj,
                    'department': departments[u['dept']],
                    'designation': u['designation'],
                    'salary': u['salary'],
                    'phone': u['phone'],
                    'joining_date': u['joining'],
                    'employment_status': Employee.STATUS_ACTIVE,
                }
            )
            employees[u['username']] = emp_obj
            self.stdout.write(f"  [User & Employee] {u['username']} ({u['role']}) -> {emp_obj.employee_id}")

        # 3. Seed Projects
        p1, _ = Project.objects.get_or_create(
            name='Enterprise Workforce Portal',
            defaults={
                'description': 'Full-stack employee management, attendance tracking, and task delegation platform.',
                'project_manager': employees['pm_alex'],
                'start_date': date(2025, 1, 1),
                'deadline': date(2025, 6, 30),
                'status': Project.STATUS_IN_PROGRESS,
            }
        )
        p1.team_members.set([employees['dev_john'], employees['qa_priya']])

        p2, _ = Project.objects.get_or_create(
            name='Mobile Self-Service Check-In',
            defaults={
                'description': 'Cross-platform mobile application for geolocation-based daily attendance.',
                'project_manager': employees['pm_alex'],
                'start_date': date(2025, 4, 1),
                'deadline': date(2025, 10, 15),
                'status': Project.STATUS_PLANNED,
            }
        )
        p2.team_members.set([employees['dev_john']])
        self.stdout.write("  [Projects] Created projects with manager and team assignments.")

        # 4. Seed Tasks
        tasks_data = [
            {
                'title': 'Design RESTful API Endpoints',
                'project': p1,
                'assigned_to': employees['dev_john'],
                'priority': Task.PRIORITY_HIGH,
                'status': Task.STATUS_COMPLETED,
                'deadline': date(2025, 2, 20),
            },
            {
                'title': 'Implement Role-Based Authorization Views',
                'project': p1,
                'assigned_to': employees['dev_john'],
                'priority': Task.PRIORITY_HIGH,
                'status': Task.STATUS_IN_PROGRESS,
                'deadline': date(2025, 3, 10),
            },
            {
                'title': 'Write Integration Test Suites',
                'project': p1,
                'assigned_to': employees['qa_priya'],
                'priority': Task.PRIORITY_MEDIUM,
                'status': Task.STATUS_TODO,
                'deadline': date(2025, 3, 25),
            },
            {
                'title': 'Mobile Wireframe UX Review',
                'project': p2,
                'assigned_to': employees['dev_john'],
                'priority': Task.PRIORITY_LOW,
                'status': Task.STATUS_TODO,
                'deadline': date(2025, 4, 30),
            },
        ]

        for t in tasks_data:
            Task.objects.get_or_create(
                title=t['title'],
                project=t['project'],
                defaults={
                    'assigned_to': t['assigned_to'],
                    'priority': t['priority'],
                    'status': t['status'],
                    'deadline': t['deadline'],
                    'description': f"Execution details for {t['title']}",
                }
            )
        self.stdout.write("  [Tasks] Created actionable tasks across projects.")

        # 5. Seed Attendance
        today = timezone.localdate()
        yesterday = today - timedelta(days=1)

        attendance_records = [
            # Yesterday
            {'employee': employees['dev_john'], 'date': yesterday, 'check_in': time(9, 2), 'check_out': time(17, 30), 'status': Attendance.STATUS_PRESENT},
            {'employee': employees['qa_priya'], 'date': yesterday, 'check_in': time(9, 15), 'check_out': time(17, 45), 'status': Attendance.STATUS_PRESENT},
            {'employee': employees['pm_alex'], 'date': yesterday, 'check_in': time(8, 55), 'check_out': time(18, 0), 'status': Attendance.STATUS_PRESENT},
            # Today
            {'employee': employees['dev_john'], 'date': today, 'check_in': time(9, 5), 'check_out': None, 'status': Attendance.STATUS_PRESENT},
            {'employee': employees['pm_alex'], 'date': today, 'check_in': time(8, 50), 'check_out': None, 'status': Attendance.STATUS_PRESENT},
        ]

        for a in attendance_records:
            Attendance.objects.get_or_create(
                employee=a['employee'],
                date=a['date'],
                defaults={
                    'check_in': a['check_in'],
                    'check_out': a['check_out'],
                    'status': a['status'],
                }
            )
        self.stdout.write("  [Attendance] Seeded recent and current attendance records.")

        # 6. Seed Leaves
        leaves_data = [
            {
                'employee': employees['dev_john'],
                'leave_type': Leave.TYPE_CASUAL,
                'start_date': today + timedelta(days=5),
                'end_date': today + timedelta(days=7),
                'reason': 'Family gathering out of town',
                'status': Leave.STATUS_APPROVED,
                'reviewed_by': users['hr_sarah'],
                'review_comment': 'Approved. Enjoy your time with family.',
            },
            {
                'employee': employees['qa_priya'],
                'leave_type': Leave.TYPE_SICK,
                'start_date': today + timedelta(days=2),
                'end_date': today + timedelta(days=3),
                'reason': 'Medical dental appointment recovery',
                'status': Leave.STATUS_PENDING,
                'reviewed_by': None,
                'review_comment': '',
            },
        ]

        for l in leaves_data:
            Leave.objects.get_or_create(
                employee=l['employee'],
                start_date=l['start_date'],
                end_date=l['end_date'],
                defaults={
                    'leave_type': l['leave_type'],
                    'reason': l['reason'],
                    'status': l['status'],
                    'reviewed_by': l['reviewed_by'],
                    'review_comment': l['review_comment'],
                }
            )
        self.stdout.write("  [Leaves] Seeded leave requests with pending and approved statuses.")

        self.stdout.write(self.style.SUCCESS('\nSuccessfully seeded all enterprise sample data!'))
        self.stdout.write(self.style.SUCCESS('Admin Credentials:   username: admin    | password: admin123'))
        self.stdout.write(self.style.SUCCESS('HR Credentials:      username: hr_sarah | password: password123'))
        self.stdout.write(self.style.SUCCESS('PM Credentials:      username: pm_alex  | password: password123'))
        self.stdout.write(self.style.SUCCESS('Dev Credentials:     username: dev_john | password: password123'))
        self.stdout.write(self.style.SUCCESS('QA Credentials:      username: qa_priya | password: password123'))

