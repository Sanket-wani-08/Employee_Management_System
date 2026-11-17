// Departments page - manage company departments and view assigned employees

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

const EMPTY_FORM = { name: '', description: '' };

export default function Departments() {
  const { isAdmin, isHR } = useAuth();
  const canWrite = isAdmin || isHR;

  // Component state
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');

  // Form modal state
  const [showModal, setShowModal]       = useState(false);
  const [editTarget, setEditTarget]     = useState(null);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [formError, setFormError]       = useState('');
  const [saving, setSaving]             = useState(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);

  // Department employees modal state
  const [viewDept, setViewDept]         = useState(null);
  const [deptEmployees, setDeptEmployees] = useState([]);
  const [loadingEmps, setLoadingEmps]   = useState(false);

  // Fetch departments list
  const fetchDepartments = useCallback(() => {
    setLoading(true);
    setError('');
    api.get('/departments/')
      .then(res => setDepartments(Array.isArray(res.data) ? res.data : (res.data.results || [])))
      .catch(() => setError('Failed to load departments.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  // Open modal for creating new department
  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowModal(true);
  };

  // Open modal for editing existing department
  const openEdit = (dept) => {
    setEditTarget(dept);
    setForm({ name: dept.name, description: dept.description || '' });
    setFormError('');
    setShowModal(true);
  };

  // Save changes (create or edit)
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Department name is required.'); return; }
    setSaving(true);
    setFormError('');
    try {
      if (editTarget) {
        await api.patch(`/departments/${editTarget.id}/`, form);
        setSuccess('Department updated successfully.');
      } else {
        await api.post('/departments/', form);
        setSuccess('Department created successfully.');
      }
      setShowModal(false);
      fetchDepartments();
    } catch (err) {
      const data = err.response?.data;
      setFormError(data?.name?.[0] || data?.detail || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  // Delete department
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/departments/${deleteTarget.id}/`);
      setSuccess('Department deleted.');
      setDeleteTarget(null);
      fetchDepartments();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Delete failed.';
      setError(msg);
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  // View employees in selected department
  const handleViewEmployees = async (dept) => {
    setViewDept(dept);
    setLoadingEmps(true);
    try {
      const res = await api.get(`/departments/${dept.id}/employees/`);
      setDeptEmployees(Array.isArray(res.data) ? res.data : (res.data.results || []));
    } catch {
      setDeptEmployees([]);
    } finally {
      setLoadingEmps(false);
    }
  };

  // Auto-dismiss alerts after 3 seconds
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  return (
    <div>
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-0 fw-bold"><i className="bi bi-building me-2 text-primary"></i>Departments</h4>
          <p className="text-muted small mb-0">Manage organisational departments</p>
        </div>
        {canWrite && (
          <button className="btn btn-primary" onClick={openCreate}>
            <i className="bi bi-plus-circle me-1"></i>Add Department
          </button>
        )}
      </div>

      {/* Alerts */}
      {error   && <div className="alert alert-danger alert-dismissible" role="alert">{error}<button type="button" className="btn-close" onClick={() => setError('')}></button></div>}
      {success && <div className="alert alert-success alert-dismissible" role="alert">{success}<button type="button" className="btn-close" onClick={() => setSuccess('')}></button></div>}

      {/* Departments Table */}
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
      ) : (
        <div className="card shadow-sm border-0">
          <div className="card-body p-0">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-dark">
                <tr>
                  <th>#</th>
                  <th>Department Name</th>
                  <th>Description</th>
                  <th className="text-center">Employees</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-muted py-4">No departments found.</td></tr>
                )}
                {departments.map((dept, i) => (
                  <tr key={dept.id}>
                    <td className="text-muted small">{i + 1}</td>
                    <td className="fw-semibold">{dept.name}</td>
                    <td className="text-muted small">{dept.description || '—'}</td>
                    <td className="text-center">
                      <button
                        className="btn btn-sm btn-outline-info"
                        onClick={() => handleViewEmployees(dept)}
                        data-bs-toggle="modal" data-bs-target="#empModal"
                      >
                        <i className="bi bi-people me-1"></i>{dept.total_employees ?? dept.employee_count ?? 0}
                      </button>
                    </td>
                    <td className="text-end">
                      {canWrite && (
                        <>
                          <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(dept)}>
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => setDeleteTarget(dept)}>
                            <i className="bi bi-trash"></i>
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={handleSave}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">
                    {editTarget ? 'Edit Department' : 'Add Department'}
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                </div>
                <div className="modal-body">
                  {formError && <div className="alert alert-danger py-2">{formError}</div>}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Department Name <span className="text-danger">*</span></label>
                    <input
                      className="form-control"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Engineering"
                      autoFocus
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Description</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Brief description..."
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <><span className="spinner-border spinner-border-sm me-1"></span>Saving…</> : 'Save Department'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-sm">
            <div className="modal-content">
              <div className="modal-header border-0">
                <h5 className="modal-title text-danger fw-bold"><i className="bi bi-trash me-2"></i>Confirm Delete</h5>
              </div>
              <div className="modal-body">
                Delete <strong>{deleteTarget.name}</strong>? This cannot be undone.
                {deleteTarget.employee_count > 0 && (
                  <div className="alert alert-warning mt-2 py-2 small">
                    <i className="bi bi-exclamation-triangle me-1"></i>
                    This department has employees. The delete may be blocked.
                  </div>
                )}
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-secondary btn-sm" onClick={() => setDeleteTarget(null)}>Cancel</button>
                <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Department Employees Modal */}
      <div className="modal fade" id="empModal" tabIndex="-1">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title fw-bold">
                <i className="bi bi-people me-2 text-info"></i>
                {viewDept?.name} — Employees
              </h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div className="modal-body p-0">
              {loadingEmps ? (
                <div className="text-center py-4"><div className="spinner-border text-info"></div></div>
              ) : (
                <table className="table table-sm mb-0">
                  <thead className="table-light">
                    <tr><th>Name</th><th>Email</th><th>Designation</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {deptEmployees.length === 0 && (
                      <tr><td colSpan={4} className="text-center text-muted py-3">No employees in this department</td></tr>
                    )}
                    {deptEmployees.map(emp => (
                      <tr key={emp.id}>
                        <td className="fw-semibold">{emp.full_name || `${emp.user?.first_name} ${emp.user?.last_name}`}</td>
                        <td className="small text-muted">{emp.user?.email || emp.email}</td>
                        <td>{emp.designation || '—'}</td>
                        <td>
                          <span className={`badge bg-${emp.employment_status === 'ACTIVE' ? 'success' : emp.employment_status === 'INACTIVE' ? 'warning' : 'danger'}`}>
                            {emp.employment_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
