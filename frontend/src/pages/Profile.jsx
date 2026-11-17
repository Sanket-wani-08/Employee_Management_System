import { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import api from '../services/api';

const Profile = () => {
  const { user, isAdmin, isHR } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
  });

  const fetchProfile = async () => {
    try {
      const response = await api.get('/auth/me/');
      setProfileData(response.data);
      setEditForm({
        first_name: response.data.first_name || '',
        last_name: response.data.last_name || '',
        phone: response.data.phone || '',
      });
    } catch (err) {
      setMessage({ text: 'Unable to load profile data from backend.', type: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setMessage({ text: '', type: '' });

    try {
      await api.patch('/employees/me/', editForm);
      setMessage({ text: 'Profile updated successfully!', type: 'success' });
      await fetchProfile();
    } catch (err) {
      setMessage({
        text: err.response?.data?.detail || 'Failed to update profile. Please try again.',
        type: 'danger',
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading profile...</span>
        </div>
        <p className="mt-2 text-muted small">Retrieving personal profile...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold text-dark mb-1">My Profile</h3>
          <p className="text-muted small mb-0">Manage your workforce credentials and personal information</p>
        </div>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type} alert-dismissible fade show`} role="alert">
          <i className={`bi ${message.type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} me-2`}></i>
          {message.text}
          <button type="button" className="btn-close" onClick={() => setMessage({ text: '', type: '' })}></button>
        </div>
      )}

      <div className="row g-4">
        {/* Left Column: Profile Card */}
        <div className="col-lg-4">
          <div className="card shadow-sm border-0 text-center p-4">
            <div className="mx-auto rounded-circle bg-primary text-white d-flex align-items-center justify-content-center shadow mb-3" style={{ width: '80px', height: '80px', fontSize: '2rem' }}>
              {profileData?.first_name ? profileData.first_name[0] : profileData?.username[0]?.toUpperCase()}
            </div>
            <h5 className="fw-bold mb-1">{profileData?.full_name || profileData?.username}</h5>
            <p className="text-muted small mb-2">{profileData?.designation || 'Staff Member'}</p>

            <div className="mb-3">
              <span className="badge bg-primary px-3 py-1 me-1">{profileData?.role}</span>
              {profileData?.employment_status && (
                <span className="badge bg-success px-2 py-1">{profileData.employment_status}</span>
              )}
            </div>

            <hr className="my-3" />

            <div className="text-start small">
              <div className="d-flex justify-content-between py-1 border-bottom">
                <span className="text-muted">Employee ID</span>
                <span className="fw-bold text-dark">{profileData?.employee_id || 'N/A'}</span>
              </div>
              <div className="d-flex justify-content-between py-1 border-bottom">
                <span className="text-muted">Department</span>
                <span className="fw-semibold text-dark">{profileData?.department_name || 'N/A'}</span>
              </div>
              <div className="d-flex justify-content-between py-1 border-bottom">
                <span className="text-muted">Joining Date</span>
                <span>{profileData?.joining_date || 'N/A'}</span>
              </div>
              {(isAdmin || isHR) && profileData?.salary && (
                <div className="d-flex justify-content-between py-1">
                  <span className="text-muted">Annual Salary</span>
                  <span className="fw-bold text-success">${Number(profileData.salary).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Edit Profile Form */}
        <div className="col-lg-8">
          <div className="card shadow-sm border-0 p-4">
            <h5 className="fw-bold text-dark mb-3">
              <i className="bi bi-pencil-square text-primary me-2"></i>Edit Personal Information
            </h5>

            <form onSubmit={handleUpdate}>
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">First Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Last Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Phone Number</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="+1-555-0100"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Email Address (Read Only)</label>
                  <input
                    type="email"
                    className="form-control bg-light"
                    value={profileData?.email || ''}
                    disabled
                  />
                  <small className="text-muted" style={{ fontSize: '0.75rem' }}>Contact HR to modify corporate email.</small>
                </div>
              </div>

              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Username (Read Only)</label>
                  <input
                    type="text"
                    className="form-control bg-light"
                    value={profileData?.username || ''}
                    disabled
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Department Assignment</label>
                  <input
                    type="text"
                    className="form-control bg-light"
                    value={profileData?.department_name || 'N/A'}
                    disabled
                  />
                </div>
              </div>

              <div className="d-flex justify-content-end">
                <button
                  type="submit"
                  className="btn btn-primary px-4"
                  disabled={updating}
                >
                  {updating ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-save me-2"></i>Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
