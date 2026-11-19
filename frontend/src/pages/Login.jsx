import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

const Login = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect destination after login
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Invalid username or password. Please verify credentials.');
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Unable to reach server. Please ensure the Django backend is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Demo credential switcher for technical interviews
  const handleDemoSelect = (demoUser, demoPass) => {
    setUsername(demoUser);
    setPassword(demoPass);
    setError('');
  };

  return (
    <div>
      <div className="text-center mb-4">
        <h4 className="fw-bold text-dark mb-1">Welcome Back</h4>
        <p className="text-muted small">Sign in to your enterprise workforce account</p>
      </div>

      {error && (
        <div className="alert alert-danger py-2 px-3 small d-flex align-items-center mb-3" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2 fs-6 flex-shrink-0"></i>
          <div>{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label small fw-semibold text-secondary">Username or Email</label>
          <div className="input-group">
            <span className="input-group-text bg-light text-muted border-end-0">
              <i className="bi bi-person"></i>
            </span>
            <input
              type="text"
              className="form-control border-start-0 ps-0"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>
        </div>

        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <label className="form-label small fw-semibold text-secondary mb-0">Password</label>
            <span
              className="text-primary small text-decoration-none cursor-pointer"
              style={{ cursor: 'pointer', fontSize: '0.8rem' }}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <span><i className="bi bi-eye-slash me-1"></i>Hide</span>
              ) : (
                <span><i className="bi bi-eye me-1"></i>Show</span>
              )}
            </span>
          </div>
          <div className="input-group">
            <span className="input-group-text bg-light text-muted border-end-0">
              <i className="bi bi-lock"></i>
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-control border-start-0 ps-0"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary w-100 py-2 fw-semibold shadow-sm"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Authenticating...
            </>
          ) : (
            <>
              <i className="bi bi-box-arrow-in-right me-2"></i>Sign In
            </>
          )}
        </button>
      </form>

      {/* Quick Demo Switcher - Perfect for Interview Demonstration */}
      <div className="mt-4 pt-3 border-top">
        <label className="d-block small text-muted text-center mb-2 fw-semibold">
          <i className="bi bi-lightning-charge-fill text-warning me-1"></i>One-Click Interview Demo Accounts (Password: 123456):
        </label>
        <div className="row g-2">
          <div className="col-6">
            <button
              type="button"
              className={`btn btn-sm w-100 py-1 ${username === 'admin' ? 'btn-danger' : 'btn-outline-danger'}`}
              onClick={() => handleDemoSelect('admin', '123456')}
            >
              <i className="bi bi-shield-fill me-1"></i>Admin (Rajesh)
            </button>
          </div>
          <div className="col-6">
            <button
              type="button"
              className={`btn btn-sm w-100 py-1 ${username === 'hr_neha' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => handleDemoSelect('hr_neha', '123456')}
            >
              <i className="bi bi-person-badge-fill me-1"></i>HR Lead (Neha)
            </button>
          </div>
          <div className="col-6">
            <button
              type="button"
              className={`btn btn-sm w-100 py-1 ${username === 'pm_mahajan' ? 'btn-warning text-dark' : 'btn-outline-warning text-dark'}`}
              onClick={() => handleDemoSelect('pm_mahajan', '123456')}
            >
              <i className="bi bi-kanban me-1"></i>PM (Pratham)
            </button>
          </div>
          <div className="col-6">
            <button
              type="button"
              className={`btn btn-sm w-100 py-1 ${username === 'sanket_wani' ? 'btn-success' : 'btn-outline-success'}`}
              onClick={() => handleDemoSelect('sanket_wani', '123456')}
            >
              <i className="bi bi-code-slash me-1"></i>Dev (Sanket)
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 text-center">
        <span className="text-muted small">Need an account? </span>
        <Link to="/register" className="small fw-semibold text-primary text-decoration-none">
          Create Account
        </Link>
      </div>
    </div>
  );
};

export default Login;
