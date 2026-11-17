import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="container py-5 text-center">
      <div className="py-5">
        <h1 className="display-1 fw-bold text-primary">404</h1>
        <h3 className="fw-semibold text-dark">Page Not Found</h3>
        <p className="text-muted">The requested view does not exist or has been moved.</p>
        <Link to="/dashboard" className="btn btn-primary mt-3">
          <i className="bi bi-house-door-fill me-2"></i>Back to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFound;

