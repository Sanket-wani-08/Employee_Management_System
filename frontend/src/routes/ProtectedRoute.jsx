import { Navigate, useLocation, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const ProtectedRoute = ({ allowedRoles = null }) => {
  const { isAuthenticated, loading, hasRole, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading session...</span>
          </div>
          <p className="mt-3 text-muted fw-semibold">Authenticating workforce portal...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login preserving attempted path
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If route is restricted to specific roles, check permissions
  if (allowedRoles && !hasRole(allowedRoles)) {
    return (
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-7 text-center">
            <div className="card shadow-sm border-danger p-4">
              <div className="text-danger mb-3">
                <i className="bi bi-shield-lock-fill" style={{ fontSize: '3.5rem' }}></i>
              </div>
              <h3 className="fw-bold text-dark">Access Restricted</h3>
              <p className="text-muted">
                Your account role (<strong>{user?.role}</strong>) does not have authorization to view this section.
              </p>
              <div className="mt-3">
                <a href="/dashboard" className="btn btn-primary">
                  <i className="bi bi-speedometer2 me-2"></i>Return to Dashboard
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;

