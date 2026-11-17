import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import api from '../services/api';

const Register = () => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    designation: '',
    department: '',
    phone: '',
    password: '',
    confirm_password: '',
  });

  const [departments, setDepartments] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  // Load departments dropdown
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await api.get('/departments/');
        // Handle paginated or non-paginated department list
        const depts = response.data.results || response.data;
        if (Array.isArray(depts)) {
          setDepartments(depts);
        }
      } catch (err) {
        // Safe to ignore if unauthenticated guest
        console.warn('Could not pre-fetch departments for public registration dropdown.');
      }
    };
    fetchDepartments();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validations
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setError('Password confirmation does not match password.');
      return;
    }

    setLoading(true);

    try {
      // Build payload, converting empty department to null
      const payload = {
        ...formData,
        department: formData.department ? parseInt(formData.department) : null,
      };

      await register(payload);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const resp = err.response?.data;
      if (resp) {
        if (typeof resp === 'string') {
          setError(resp);
        } else if (resp.detail) {
          setError(resp.detail);
        } else {
          // Extract first field validation error message
          const [field, messages] = Object.entries(resp)[0];
          const msg = Array.isArray(messages) ? messages[0] : String(messages);
          setError(`${field.replace('_', ' ').toUpperCase()}: ${msg}`);
        }
      } else {
        setError('Registration failed. Please check network connectivity.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-3">
        <h4 className="fw-bold text-dark mb-1">Create Account</h4>
        <p className="text-muted small">Register as a new workforce member</p>
      </div>

      {error && (
        <div className="alert alert-danger py-2 px-3 small d-flex align-items-center mb-3" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2 fs-6 flex-shrink-0"></i>
          <div>{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="row g-2 mb-2">
          <div className="col-6">
            <label className="form-label small fw-semibold text-secondary mb-1">First Name</label>
            <input
              type="text"
              name="first_name"
              className="form-control form-control-sm"
              value={formData.first_name}
              onChange={handleChange}
              placeholder="John"
              required
            />
          </div>
          <div className="col-6">
            <label className="form-label small fw-semibold text-secondary mb-1">Last Name</label>
            <input
              type="text"
              name="last_name"
              className="form-control form-control-sm"
              value={formData.last_name}
              onChange={handleChange}
              placeholder="Doe"
              required
            />
          </div>
        </div>

        <div className="mb-2">
          <label className="form-label small fw-semibold text-secondary mb-1">Username</label>
          <div className="input-group input-group-sm">
            <span className="input-group-text bg-light"><i className="bi bi-person"></i></span>
            <input
              type="text"
              name="username"
              className="form-control"
              value={formData.username}
              onChange={handleChange}
              placeholder="johndoe"
              required
            />
          </div>
        </div>

        <div className="mb-2">
          <label className="form-label small fw-semibold text-secondary mb-1">Corporate Email</label>
          <div className="input-group input-group-sm">
            <span className="input-group-text bg-light"><i className="bi bi-envelope"></i></span>
            <input
              type="email"
              name="email"
              className="form-control"
              value={formData.email}
              onChange={handleChange}
              placeholder="john.doe@company.com"
              required
            />
          </div>
        </div>

        <div className="row g-2 mb-2">
          <div className="col-6">
            <label className="form-label small fw-semibold text-secondary mb-1">Designation</label>
            <input
              type="text"
              name="designation"
              className="form-control form-control-sm"
              placeholder="e.g. Developer"
              value={formData.designation}
              onChange={handleChange}
            />
          </div>
          <div className="col-6">
            <label className="form-label small fw-semibold text-secondary mb-1">Phone</label>
            <input
              type="text"
              name="phone"
              className="form-control form-control-sm"
              placeholder="+1-555-0100"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>
        </div>

        {departments.length > 0 && (
          <div className="mb-2">
            <label className="form-label small fw-semibold text-secondary mb-1">Department</label>
            <select
              name="department"
              className="form-select form-select-sm"
              value={formData.department}
              onChange={handleChange}
            >
              <option value="">Select Department (Optional)</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="row g-2 mb-3">
          <div className="col-6">
            <div className="d-flex justify-content-between align-items-center">
              <label className="form-label small fw-semibold text-secondary mb-1">Password</label>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              className="form-control form-control-sm"
              value={formData.password}
              onChange={handleChange}
              placeholder="Min 6 chars"
              required
            />
          </div>
          <div className="col-6">
            <label className="form-label small fw-semibold text-secondary mb-1">Confirm</label>
            <input
              type={showPassword ? 'text' : 'password'}
              name="confirm_password"
              className="form-control form-control-sm"
              value={formData.confirm_password}
              onChange={handleChange}
              placeholder="Repeat password"
              required
            />
          </div>
        </div>

        <div className="form-check mb-3">
          <input
            className="form-check-input"
            type="checkbox"
            id="showPass"
            checked={showPassword}
            onChange={(e) => setShowPassword(e.target.checked)}
          />
          <label className="form-check-label small text-muted" htmlFor="showPass">
            Show passwords
          </label>
        </div>

        <button
          type="submit"
          className="btn btn-primary w-100 py-2 fw-semibold shadow-sm"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Registering Account...
            </>
          ) : (
            'Complete Registration'
          )}
        </button>
      </form>

      <div className="mt-3 pt-3 border-top text-center">
        <span className="text-muted small">Already have an account? </span>
        <Link to="/login" className="small fw-semibold text-primary text-decoration-none">
          Sign In
        </Link>
      </div>
    </div>
  );
};

export default Register;
