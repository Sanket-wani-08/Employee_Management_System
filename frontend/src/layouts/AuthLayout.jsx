import { Outlet, Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const AuthLayout = () => {
  const { isAuthenticated, loading } = useAuth();

  // If already logged in, redirect away from auth pages to dashboard
  if (!loading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-vh-100 d-flex flex-column justify-content-center align-items-center bg-light py-5">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-11 col-sm-9 col-md-7 col-lg-5 col-xl-4">
            <div className="text-center mb-4">
              <div className="d-inline-flex align-items-center justify-content-center bg-primary text-white rounded-circle mb-2 shadow" style={{ width: '60px', height: '60px' }}>
                <i className="bi bi-briefcase-fill fs-2"></i>
              </div>
              <h3 className="fw-bold text-dark mb-0">Workforce Hub</h3>
              <p className="text-muted small">Enterprise Workforce & Project Management</p>
            </div>
            <div className="card shadow border-0 rounded-3">
              <div className="card-body p-4">
                <Outlet />
              </div>
            </div>
            <div className="text-center mt-4">
              <small className="text-muted">
                Enterprise Edition • Built with Django & React
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;

