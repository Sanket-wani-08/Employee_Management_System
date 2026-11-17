// Dashboard page showing stats based on user role (Admin, HR, PM, Employee)

import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

// Stat card component
function StatCard({ icon, label, value, color = 'primary', subtitle }) {
  return (
    <div className="col-xl-3 col-md-6 mb-4">
      <div className={`card border-0 shadow-sm h-100 border-start border-4 border-${color}`}>
        <div className="card-body d-flex align-items-center gap-3">
          <div className={`fs-1 text-${color}`}>
            <i className={`bi ${icon}`}></i>
          </div>
          <div>
            <div className="text-muted small">{label}</div>
            <div className="fw-bold fs-4">{value ?? '—'}</div>
            {subtitle && <div className="text-muted" style={{ fontSize: '0.75rem' }}>{subtitle}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// Status badge helper
function Badge({ value, map }) {
  const { label, color } = map[value] || { label: value, color: 'secondary' };
  return <span className={`badge bg-${color}`}>{label}</span>;
}

const LEAVE_STATUS = {
  PENDING: { label: 'Pending', color: 'warning' },
  APPROVED: { label: 'Approved', color: 'success' },
  REJECTED: { label: 'Rejected', color: 'danger' },
};

const TASK_PRIORITY = {
  LOW: { label: 'Low', color: 'secondary' },
  MEDIUM: { label: 'Medium', color: 'info' },
  HIGH: { label: 'High', color: 'warning' },
  CRITICAL: { label: 'Critical', color: 'danger' },
};

// Admin dashboard view
function AdminDashboard({ data }) {
  const overview = data.overview || {};

  return (
    <>
      {/* Stat Cards Row */}
      <div className="row">
        <StatCard icon="bi-people-fill" label="Total Employees" value={overview.total_employees} color="primary" />
        <StatCard icon="bi-building" label="Departments" value={overview.total_departments} color="info" />
        <StatCard icon="bi-kanban-fill" label="Active Projects" value={overview.projects_in_progress} color="success" />
        <StatCard icon="bi-check2-square" label="Total Tasks" value={overview.total_tasks} color="warning" />
      </div>
      <div className="row">
        <StatCard icon="bi-exclamation-triangle-fill" label="Overdue Tasks" value={overview.tasks_overdue} color="danger" />
        <StatCard icon="bi-calendar-x" label="Pending Leaves" value={overview.pending_leaves} color="warning" />
        <StatCard icon="bi-clock-history" label="Checked In Today" value={overview.checked_in_today} color="success" />
        <StatCard
          icon="bi-person-slash"
          label="Not Checked In"
          value={Math.max((overview.active_employees || 0) - (overview.checked_in_today || 0), 0)}
          color="secondary"
        />
      </div>

      <div className="row mt-2">
        {/* Department Distribution */}
        <div className="col-lg-6 mb-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white fw-semibold">
              <i className="bi bi-pie-chart me-2 text-primary"></i>Department Distribution
            </div>
            <div className="card-body p-0">
              <table className="table table-sm mb-0">
                <thead className="table-light">
                  <tr><th>Department</th><th className="text-end">Employees</th></tr>
                </thead>
                <tbody>
                  {(data.department_distribution || []).map(d => (
                    <tr key={d.name}>
                      <td>{d.name}</td>
                      <td className="text-end">
                        <span className="badge bg-primary">{d.employee_count}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent Leave Requests */}
        <div className="col-lg-6 mb-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white fw-semibold">
              <i className="bi bi-calendar-check me-2 text-warning"></i>Recent Leave Requests
            </div>
            <div className="card-body p-0">
              <table className="table table-sm mb-0">
                <thead className="table-light">
                  <tr><th>Employee</th><th>Type</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {(data.recent_leaves || []).length === 0 && (
                    <tr><td colSpan={3} className="text-center text-muted py-3">No recent requests</td></tr>
                  )}
                  {(data.recent_leaves || []).map(l => (
                    <tr key={l.id}>
                      <td>{[l['employee__user__first_name'], l['employee__user__last_name']].filter(Boolean).join(' ')}</td>
                      <td>{l.leave_type}</td>
                      <td><Badge value={l.status} map={LEAVE_STATUS} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// HR dashboard view
function HRDashboard({ data }) {
  return (
    <>
      <div className="row">
        <StatCard icon="bi-people-fill" label="Total Employees" value={data.total_employees} color="primary" />
        <StatCard icon="bi-person-check-fill" label="Active Employees" value={data.active_employees} color="success" />
        <StatCard icon="bi-person-dash" label="Inactive / Terminated" value={(data.inactive_employees || 0) + (data.terminated_employees || 0)} color="danger" />
        <StatCard icon="bi-calendar-x" label="Pending Leaves" value={data.pending_leaves} color="warning" />
      </div>

      <div className="row mt-2">
        <div className="col-lg-7 mb-4">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white fw-semibold">
              <i className="bi bi-building me-2 text-info"></i>Department Stats
            </div>
            <div className="card-body p-0">
              <table className="table table-sm mb-0">
                <thead className="table-light">
                  <tr><th>Department</th><th className="text-end">Employees</th></tr>
                </thead>
                <tbody>
                  {(data.department_stats || []).map(d => (
                    <tr key={d.id}>
                      <td>{d.name}</td>
                      <td className="text-end"><span className="badge bg-info text-dark">{d.employee_count}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-lg-5 mb-4">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white fw-semibold">
              <i className="bi bi-hourglass-split me-2 text-warning"></i>Pending Leave Queue
            </div>
            <div className="card-body p-0">
              <table className="table table-sm mb-0">
                <thead className="table-light">
                  <tr><th>Employee</th><th>Days</th></tr>
                </thead>
                <tbody>
                  {(data.pending_leave_requests || []).length === 0 && (
                    <tr><td colSpan={2} className="text-center text-muted py-3">Queue empty</td></tr>
                  )}
                  {(data.pending_leave_requests || []).map(l => (
                    <tr key={l.id}>
                      <td>{l.employee_name}</td>
                      <td><span className="badge bg-warning text-dark">{l.total_days}d</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Project Manager dashboard view
function PMDashboard({ data }) {
  return (
    <>
      <div className="row">
        <StatCard icon="bi-kanban-fill" label="Managed Projects" value={data.managed_projects} color="primary" />
        <StatCard icon="bi-check2-all" label="Tasks Completed" value={data.tasks_completed} color="success" />
        <StatCard icon="bi-hourglass" label="Tasks In Progress" value={data.tasks_in_progress} color="info" />
        <StatCard icon="bi-exclamation-circle-fill" label="Critical Tasks" value={data.critical_tasks} color="danger" />
      </div>

      <div className="row mt-2">
        <div className="col-lg-6 mb-4">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white fw-semibold">
              <i className="bi bi-bar-chart-fill me-2 text-primary"></i>Project Progress
            </div>
            <div className="card-body">
              {(data.project_progress || []).map(p => (
                <div key={p.id} className="mb-3">
                  <div className="d-flex justify-content-between small mb-1">
                    <span className="fw-semibold">{p.name}</span>
                    <span className="text-muted">{p.completed}/{p.total} tasks</span>
                  </div>
                  <div className="progress" style={{ height: '8px' }}>
                    <div
                      className="progress-bar bg-primary"
                      style={{ width: `${p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0}%` }}
                    ></div>
                  </div>
                </div>
              ))}
              {(data.project_progress || []).length === 0 && (
                <p className="text-muted text-center mb-0">No projects assigned</p>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-6 mb-4">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white fw-semibold">
              <i className="bi bi-fire me-2 text-danger"></i>Critical / Overdue Tasks
            </div>
            <div className="card-body p-0">
              <table className="table table-sm mb-0">
                <thead className="table-light">
                  <tr><th>Task</th><th>Priority</th><th>Deadline</th></tr>
                </thead>
                <tbody>
                  {(data.critical_task_list || []).length === 0 && (
                    <tr><td colSpan={3} className="text-center text-muted py-3">All good! 🎉</td></tr>
                  )}
                  {(data.critical_task_list || []).map(t => (
                    <tr key={t.id}>
                      <td>{t.title}</td>
                      <td><Badge value={t.priority} map={TASK_PRIORITY} /></td>
                      <td className="text-danger small">{t.deadline}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Employee dashboard view
function EmployeeDashboard({ data }) {
  return (
    <>
      <div className="row">
        <StatCard icon="bi-list-task" label="Total Tasks" value={data.total_tasks} color="primary" />
        <StatCard icon="bi-check2-circle" label="Completed" value={data.tasks_completed} color="success" />
        <StatCard icon="bi-hourglass-split" label="In Progress" value={data.tasks_in_progress} color="info" />
        <StatCard icon="bi-exclamation-triangle" label="Overdue Tasks" value={data.overdue_tasks} color="danger" />
      </div>

      <div className="row mt-2">
        {/* Today's Attendance */}
        <div className="col-lg-4 mb-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white fw-semibold">
              <i className="bi bi-clock me-2 text-success"></i>Today's Attendance
            </div>
            <div className="card-body">
              {data.today_attendance ? (
                <>
                  <p className="mb-1"><strong>Check-In:</strong> {data.today_attendance.check_in || '—'}</p>
                  <p className="mb-1"><strong>Check-Out:</strong> {data.today_attendance.check_out || '—'}</p>
                  <p className="mb-0">
                    <strong>Status:</strong>{' '}
                    <span className={`badge bg-${data.today_attendance.status === 'PRESENT' ? 'success' : data.today_attendance.status === 'HALF_DAY' ? 'warning' : 'danger'}`}>
                      {data.today_attendance.status}
                    </span>
                  </p>
                </>
              ) : (
                <p className="text-muted mb-0">Not checked in yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Leaves Summary */}
        <div className="col-lg-4 mb-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white fw-semibold">
              <i className="bi bi-calendar-event me-2 text-warning"></i>My Leaves
            </div>
            <div className="card-body">
              <div className="d-flex justify-content-between mb-2">
                <span>Total Requests</span>
                <span className="badge bg-secondary">{data.leave_summary?.total || 0}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>Approved</span>
                <span className="badge bg-success">{data.leave_summary?.approved || 0}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>Pending</span>
                <span className="badge bg-warning text-dark">{data.leave_summary?.pending || 0}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span>Rejected</span>
                <span className="badge bg-danger">{data.leave_summary?.rejected || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="col-lg-4 mb-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white fw-semibold">
              <i className="bi bi-calendar-week me-2 text-danger"></i>Upcoming Deadlines
            </div>
            <div className="card-body p-0">
              <table className="table table-sm mb-0">
                <thead className="table-light">
                  <tr><th>Task</th><th>Due</th></tr>
                </thead>
                <tbody>
                  {(data.upcoming_deadlines || []).length === 0 && (
                    <tr><td colSpan={2} className="text-center text-muted py-3">No upcoming deadlines</td></tr>
                  )}
                  {(data.upcoming_deadlines || []).map(t => (
                    <tr key={t.id}>
                      <td className="small">{t.title}</td>
                      <td className="small text-danger">{t.deadline}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Main dashboard component
export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard/stats/')
      .then(res => setStats(res.data))
      .catch(() => setError('Failed to load dashboard stats. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  const roleLabel = {
    ADMIN: 'Administrator',
    HR: 'HR Manager',
    PROJECT_MANAGER: 'Project Manager',
    EMPLOYEE: 'Employee',
  }[user?.role] || user?.role;

  return (
    <div>
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-0 fw-bold">
            <i className="bi bi-speedometer2 me-2 text-primary"></i>Dashboard
          </h4>
          <p className="text-muted small mb-0">
            Welcome back, <strong>{user?.first_name || user?.username}</strong> —{' '}
            <span className="badge bg-primary">{roleLabel}</span>
          </p>
        </div>
        <div className="text-muted small">
          <i className="bi bi-calendar3 me-1"></i>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2 text-muted">Loading dashboard...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center">
          <i className="bi bi-exclamation-circle me-2"></i>{error}
        </div>
      )}

      {/* Role-specific dashboard */}
      {stats && !loading && (
        <>
          {user?.role === 'ADMIN' && <AdminDashboard data={stats} />}
          {user?.role === 'HR' && <HRDashboard data={stats} />}
          {user?.role === 'PROJECT_MANAGER' && <PMDashboard data={stats} />}
          {user?.role === 'EMPLOYEE' && <EmployeeDashboard data={stats} />}
        </>
      )}
    </div>
  );
}
