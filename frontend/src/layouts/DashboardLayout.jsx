import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import api from '../services/api';

const DashboardLayout = () => {
  const { user, logout, isAdmin, isHR, isProjectManager } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [attendanceState, setAttendanceState] = useState(null);
  const [attLoading, setAttLoading] = useState(false);
  const navigate = useNavigate();

  // Load today's check-in/out status
  const fetchTodayAttendance = async () => {
    try {
      const res = await api.get('/attendance/today/');
      setAttendanceState(res.data);
    } catch (err) {
      console.warn('Could not load today attendance state:', err);
    }
  };

  useEffect(() => {
    fetchTodayAttendance();
  }, []);

  const handleCheckIn = async () => {
    setAttLoading(true);
    try {
      await api.post('/attendance/check-in/', {});
      await fetchTodayAttendance();
    } catch (err) {
      alert(err.response?.data?.error || 'Check-in failed.');
    } finally {
      setAttLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setAttLoading(true);
    try {
      await api.post('/attendance/check-out/', {});
      await fetchTodayAttendance();
    } catch (err) {
      alert(err.response?.data?.error || 'Check-out failed.');
    } finally {
      setAttLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleBadgeColor = {
    ADMIN: 'bg-danger',
    HR: 'bg-primary',
    PROJECT_MANAGER: 'bg-warning text-dark',
    EMPLOYEE: 'bg-success',
  }[user?.role] || 'bg-secondary';

  return (
    <div className="d-flex min-vh-100 bg-light">
      {/* Sidebar Navigation */}
      <aside
        className={`bg-dark text-white d-flex flex-column flex-shrink-0 p-3 transition-all ${
          sidebarOpen ? 'd-block' : 'd-none d-md-block'
        }`}
        style={{ width: '260px', zIndex: 1000 }}
      >
        <Link to="/dashboard" className="d-flex align-items-center mb-3 mb-md-0 me-md-auto text-white text-decoration-none px-2">
          <i className="bi bi-briefcase-fill text-primary fs-3 me-2"></i>
          <div>
            <span className="fs-5 fw-bold d-block lh-1">WorkforceHub</span>
            <small className="text-secondary" style={{ fontSize: '0.75rem' }}>Management Portal</small>
          </div>
        </Link>
        <hr className="text-secondary my-3" />

        <ul className="nav nav-pills flex-column mb-auto gap-1">
          <li className="nav-item">
            <NavLink
              to="/dashboard"
              className={({ isActive }) => `nav-link text-white d-flex align-items-center py-2 px-3 ${isActive ? 'active bg-primary' : 'hover-bg'}`}
            >
              <i className="bi bi-speedometer2 me-3 fs-5"></i>
              <span>Dashboard</span>
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/employees"
              className={({ isActive }) => `nav-link text-white d-flex align-items-center py-2 px-3 ${isActive ? 'active bg-primary' : 'hover-bg'}`}
            >
              <i className="bi bi-people-fill me-3 fs-5"></i>
              <span>Employees</span>
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/departments"
              className={({ isActive }) => `nav-link text-white d-flex align-items-center py-2 px-3 ${isActive ? 'active bg-primary' : 'hover-bg'}`}
            >
              <i className="bi bi-building me-3 fs-5"></i>
              <span>Departments</span>
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/projects"
              className={({ isActive }) => `nav-link text-white d-flex align-items-center py-2 px-3 ${isActive ? 'active bg-primary' : 'hover-bg'}`}
            >
              <i className="bi bi-kanban-fill me-3 fs-5"></i>
              <span>Projects</span>
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/tasks"
              className={({ isActive }) => `nav-link text-white d-flex align-items-center py-2 px-3 ${isActive ? 'active bg-primary' : 'hover-bg'}`}
            >
              <i className="bi bi-check2-square me-3 fs-5"></i>
              <span>Tasks</span>
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/attendance"
              className={({ isActive }) => `nav-link text-white d-flex align-items-center py-2 px-3 ${isActive ? 'active bg-primary' : 'hover-bg'}`}
            >
              <i className="bi bi-clock-history me-3 fs-5"></i>
              <span>Attendance</span>
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink
              to="/leaves"
              className={({ isActive }) => `nav-link text-white d-flex align-items-center py-2 px-3 ${isActive ? 'active bg-primary' : 'hover-bg'}`}
            >
              <i className="bi bi-calendar-check-fill me-3 fs-5"></i>
              <span>Leaves</span>
            </NavLink>
          </li>
          {(isAdmin || isHR || isProjectManager) && (
            <li className="nav-item">
              <NavLink
                to="/reports"
                className={({ isActive }) => `nav-link text-white d-flex align-items-center py-2 px-3 ${isActive ? 'active bg-primary' : 'hover-bg'}`}
              >
                <i className="bi bi-bar-chart-line-fill me-3 fs-5"></i>
                <span>Reports & Export</span>
              </NavLink>
            </li>
          )}
        </ul>

        <hr className="text-secondary my-3" />
        <div className="d-flex align-items-center px-2 py-1">
          <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-2 fw-bold" style={{ width: '36px', height: '36px' }}>
            {user?.first_name ? user.first_name[0] : user?.username[0]?.toUpperCase()}
          </div>
          <div className="overflow-hidden me-auto">
            <span className="d-block text-truncate fw-semibold small">{user?.full_name || user?.username}</span>
            <span className={`badge ${roleBadgeColor} py-1 px-2`} style={{ fontSize: '0.65rem' }}>
              {user?.role}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="d-flex flex-column flex-grow-1 overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="navbar navbar-expand bg-white border-bottom shadow-sm px-3 py-2 sticky-top">
          <button
            className="btn btn-outline-secondary btn-sm me-3 d-md-none"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle Sidebar"
          >
            <i className="bi bi-list fs-5"></i>
          </button>

          {/* Quick Daily Check-In/Check-Out Action in Header */}
          <div className="d-flex align-items-center me-auto">
            {attendanceState && (
              <div className="d-flex align-items-center gap-2">
                {!attendanceState.checked_in ? (
                  <button
                    className="btn btn-sm btn-outline-success d-flex align-items-center"
                    onClick={handleCheckIn}
                    disabled={attLoading}
                  >
                    <i className="bi bi-box-arrow-in-right me-1"></i>
                    {attLoading ? 'Checking In...' : 'Check In Today'}
                  </button>
                ) : !attendanceState.checked_out ? (
                  <button
                    className="btn btn-sm btn-outline-warning text-dark d-flex align-items-center"
                    onClick={handleCheckOut}
                    disabled={attLoading}
                  >
                    <i className="bi bi-box-arrow-right me-1"></i>
                    {attLoading ? 'Checking Out...' : `Check Out (In: ${attendanceState.check_in_time})`}
                  </button>
                ) : (
                  <span className="badge bg-light text-secondary border d-flex align-items-center py-2 px-3 small">
                    <i className="bi bi-check-circle-fill text-success me-1"></i>
                    Day Completed ({attendanceState.check_in_time} - {attendanceState.check_out_time})
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="ms-auto d-flex align-items-center gap-2">
            <Link to="/profile" className="btn btn-outline-primary btn-sm d-flex align-items-center">
              <i className="bi bi-person-circle me-1"></i>
              <span className="d-none d-md-inline">My Profile</span>
            </Link>

            <button
              onClick={handleLogout}
              className="btn btn-outline-danger btn-sm d-flex align-items-center"
              title="Sign out of system"
            >
              <i className="bi bi-box-arrow-right me-1"></i>
              <span className="d-none d-md-inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Routed Sub-pages Outlet */}
        <main className="flex-grow-1 overflow-auto p-3 p-md-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
