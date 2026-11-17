# Enterprise Workforce & Project Management System (Django + React)

A full-stack enterprise workforce management platform featuring Role-Based Access Control (RBAC), multi-project sprint & task tracking, employee attendance punch-clocks, leave review workflows, role-polymorphic analytics dashboards, and streaming CSV reports.

Designed to demonstrate production-grade **Python & Django REST Framework (DRF)** backend architecture for full-stack engineers with a **JavaScript / Node.js / Express** background.

---

## 📑 Table of Contents
1. [Architecture & Tech Stack](#-architecture--tech-stack)
2. [Node.js / Express vs Django Concept Mapping](#-nodejs--express-vs-django-concept-mapping)
3. [Quick Start & Setup Guide](#-quick-start--setup-guide)
4. [Demo Accounts & Role Access Matrix](#-demo-accounts--role-access-matrix)
5. [Complete API Specification](#-complete-api-specification)
6. [Core Technical Implementations & Interview Highlights](#-core-technical-implementations--interview-highlights)
7. [Technical Interview Q&A Cheatsheet (Django for Node Developers)](#-technical-interview-qa-cheatsheet)

---

## 🏗 Architecture & Tech Stack

```
┌────────────────────────────────────────────────────────┐
│             React Single Page Application             │
│   (Vite + React Router DOM + Bootstrap 5 + Axios)     │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP / REST / Bearer JWT
┌──────────────────────────▼─────────────────────────────┐
│                 Django REST Framework                  │
│  ┌───────────────┐ ┌────────────────┐ ┌─────────────┐  │
│  │ Custom Auth   │ │ Role-Based RBAC│ │   SimpleJWT │  │
│  │ (AbstractUser)│ │ Permissions    │ │   Rotations │  │
│  └───────┬───────┘ └────────┬───────┘ └──────┬──────┘  │
│          │                  │                │         │
│  ┌───────▼──────────────────▼────────────────▼──────┐  │
│  │                 Modular Django Apps               │  │
│  │ • employees   • departments • projects           │  │
│  │ • tasks       • attendance  • leaves • dashboard │  │
│  └──────────────────────────┬───────────────────────┘  │
│                             │                          │
│  ┌──────────────────────────▼───────────────────────┐  │
│  │  ORM (select_related, prefetch_related, atomic)   │  │
│  └──────────────────────────┬───────────────────────┘  │
└─────────────────────────────┼──────────────────────────┘
                              │
┌─────────────────────────────▼──────────────────────────┐
│             SQLite / PostgreSQL Database               │
└────────────────────────────────────────────────────────┘
```

### Backend
- **Framework**: Django 6.0+ & Django REST Framework (DRF)
- **Auth**: `djangorestframework-simplejwt` (Stateless access & refresh token rotation)
- **CORS**: `django-cors-headers`
- **Database**: SQLite3 (Production-ready schema portable to PostgreSQL/MySQL)

### Frontend
- **Framework**: React 19 + Vite
- **UI Components**: Bootstrap 5 + Bootstrap Icons
- **Routing**: React Router DOM v7 (Protected routes with Role guards)
- **Networking**: Axios instance with automatic JWT interceptors & 401 handling

---

## 🔄 Node.js / Express vs Django Concept Mapping

If you come from the Express / Node.js ecosystem, here is how Django maps to the tools you already know:

| Express / Node.js Ecosystem | Django / DRF Equivalent | Key Architectural Differences |
| :--- | :--- | :--- |
| `package.json` | `requirements.txt` / `pyproject.toml` | Python package dependency pinning |
| `app.use('/route', router)` | `include('app.urls')` in `config/urls.py` | Django routes URLs through centralized patterns |
| Express Route Handlers `(req, res)` | Class-Based Views (`APIView`) or `ModelViewSet` | ViewSets auto-generate standard REST CRUD endpoints (`list`, `create`, `retrieve`, `update`, `destroy`) |
| Prisma / Mongoose Schemas | Django Models (`models.Model`) | Django ORM includes auto-generated database migrations (`makemigrations`, `migrate`) |
| Joi / Zod validation schemas | DRF Serializers (`ModelSerializer`) | Serializers handle two-way data flow: deserialization/validation on input and serialization to JSON on output |
| Middleware `(req, res, next)` | Django Middleware & DRF `BasePermission` | Declarative `permission_classes = [IsAdminOrHR]` evaluated before view execution |
| Manual SQL JOINs / `include:` in Prisma | `select_related()` (SQL JOIN) & `prefetch_related()` (IN query) | Built-in ORM query optimization preventing N+1 database performance bottlenecks |
| Knex / Prisma Transactions | `django.db.transaction.atomic()` | Context manager ensuring all queries succeed or rollback together |

---

## 🚀 Quick Start & Setup Guide

### 1. Prerequisites
- Python 3.10+ (Tested on Python 3.14)
- Node.js 18+ and npm

### 2. Backend Setup
```bash
# Navigate to the backend directory
cd backend

# (Optional) Create and activate virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Apply database migrations
python manage.py migrate

# Seed sample enterprise data (Accounts, Departments, Projects, Tasks, Attendance, Leaves)
python manage.py seed_data

# Start the Django development server
python manage.py runserver 127.0.0.1:8000
```
Backend API will be running at: `http://127.0.0.1:8000/api/`  
Django Admin dashboard at: `http://127.0.0.1:8000/admin/`

### 3. Frontend Setup
```bash
# Open a new terminal and navigate to the frontend directory
cd frontend

# Install npm packages
npm install

# Start Vite development server
npm run dev
```
Frontend Web Portal will be available at: `http://localhost:5173/`

### 4. Running Automated Test Suites
Run all automated test scripts from inside `backend/`:
```bash
cd backend
python test_phase11.py   # Full integration suite covering all 6 functional domains
python test_phase8.py    # Role dashboards & CSV report streaming
python test_models.py    # Database model constraints & Foreign Key protections
```

---

## 👥 Demo Accounts & Role Access Matrix

The login screen features an **Interview Demo Switcher** with one-click credential auto-fill:

| Role | Username | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Full access across all modules, user creation, CSV exports, department CRUD. |
| **HR Manager** | `hr_sarah` | `password123` | Workforce CRUD, salary access, manual attendance logging, leave approval queue. |
| **Project Manager** | `pm_alex` | `password123` | Project CRUD, team assignment, task assignment, progress analytics. |
| **Employee (Dev)** | `dev_john` | `password123` | Self-service check-in/out, my tasks workflow status updates, apply for leave. |
| **Employee (QA)** | `qa_priya` | `password123` | Self-service check-in/out, view project tasks, apply for leave. |

---

## 📡 Complete API Specification

### Authentication & Self-Service
- `POST /api/auth/login/` — Token obtain pair with enriched user profile metadata
- `POST /api/auth/refresh/` — Rotate JWT access token
- `POST /api/auth/register/` — Atomic registration with employee profile creation
- `POST /api/auth/logout/` — Blacklist refresh token
- `GET  /api/auth/me/` — Retrieve currently authenticated user context

### Departments (`/api/departments/`)
- `GET    /api/departments/` — List departments (with total employee count)
- `POST   /api/departments/` — Create department (Admin / HR only)
- `GET    /api/departments/{id}/` — Retrieve department details
- `PATCH  /api/departments/{id}/` — Update department
- `DELETE /api/departments/{id}/` — Delete department (blocked if employees assigned: `PROTECT`)
- `GET    /api/departments/{id}/employees/` — List all employees belonging to department

### Employees (`/api/employees/`)
- `GET    /api/employees/` — Search & filter employees (`?search=`, `?department=`, `?employment_status=`)
- `POST   /api/employees/` — Create employee + User account atomically
- `GET    /api/employees/{id}/` — Retrieve employee profile
- `PATCH  /api/employees/{id}/` — Update employee & user fields
- `DELETE /api/employees/{id}/` — Delete employee (Admin / HR)
- `GET    /api/employees/me/` — Retrieve personal employee profile
- `PATCH  /api/employees/me/` — Update self profile details (phone, names)

### Projects & Sprints (`/api/projects/`)
- `GET    /api/projects/` — List projects with manager info, team count, and task progress
- `POST   /api/projects/` — Create project (Admin / HR / PM)
- `GET    /api/projects/{id}/` — Retrieve project details
- `PATCH  /api/projects/{id}/` — Update project metadata
- `DELETE /api/projects/{id}/` — Delete project
- `GET    /api/projects/{id}/tasks/` — List all tasks associated with project
- `POST   /api/projects/{id}/add-member/` — Add employee to project team (`M2M`)
- `POST   /api/projects/{id}/remove-member/` — Remove employee from project team
- `GET    /api/projects/my-projects/` — Projects where authenticated user is manager or member

### Task Management (`/api/tasks/`)
- `GET    /api/tasks/` — List tasks (`?project=`, `?assigned_to=`, `?status=`, `?priority=`)
- `POST   /api/tasks/` — Create task (Admin / HR / PM)
- `GET    /api/tasks/{id}/` — Retrieve task details
- `PATCH  /api/tasks/{id}/` — Update task details
- `DELETE /api/tasks/{id}/` — Delete task
- `PATCH  /api/tasks/{id}/update-status/` — Transition status (`TODO` → `IN_PROGRESS` → `REVIEW` → `COMPLETED`)
- `GET    /api/tasks/my-tasks/` — Tasks assigned to current employee

### Attendance & Time Tracking (`/api/attendance/`)
- `POST /api/attendance/check-in/` — Clock in for today (prevents duplicates via database constraint)
- `POST /api/attendance/check-out/` — Clock out for today
- `GET  /api/attendance/today/` — Get today's check-in/out status for live dashboard toggle
- `GET  /api/attendance/my-attendance/` — Personal attendance history
- `GET  /api/attendance/summary/` — Aggregated counts (Present, Absent, Half-Day, Late)
- `GET  /api/attendance/` — Company-wide attendance (Admin / HR only)
- `POST /api/attendance/` — Manual attendance adjustment (Admin / HR only)

### Leave Management (`/api/leaves/`)
- `GET   /api/leaves/` — List leave requests (Admin/HR sees all; Employees see own)
- `POST  /api/leaves/` — Apply for leave with overlap validation
- `GET   /api/leaves/my-leaves/` — Personal leave history
- `GET   /api/leaves/pending/` — Pending approval queue (Admin / HR only)
- `POST  /api/leaves/{id}/review/` — Approve or reject application with remarks

### Analytics & Reports (`/api/dashboard/`)
- `GET /api/dashboard/stats/` — Single role-polymorphic dashboard endpoint
- `GET /api/dashboard/reports/employees/` (+ `/export-csv/`) — Employee directory report
- `GET /api/dashboard/reports/attendance/` (+ `/export-csv/`) — Attendance history report
- `GET /api/dashboard/reports/leaves/` (+ `/export-csv/`) — Leave applications report
- `GET /api/dashboard/reports/projects/` (+ `/export-csv/`) — Project progress report
- `GET /api/dashboard/reports/tasks/` (+ `/export-csv/`) — Tasks and deadlines report

---

