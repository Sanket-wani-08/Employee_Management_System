// Employee management page with search, filters, pagination and CRUD modals

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

const STATUS_MAP = {
  ACTIVE:      { label: 'Active',      color: 'success'   },
  INACTIVE:    { label: 'Inactive',    color: 'warning'   },
  TERMINATED:  { label: 'Terminated',  color: 'danger'    },
};

const ROLE_MAP = {
  ADMIN:           { label: 'Admin',           color: 'danger'  },
  HR:              { label: 'HR',              color: 'info'    },
  PROJECT_MANAGER: { label: 'Project Manager', color: 'primary' },
  EMPLOYEE:        { label: 'Employee',        color: 'secondary'},
};

const EMPTY_FORM = {
  username: '', email: '', first_name: '', last_name: '', password: '', role: 'EMPLOYEE',
  department: '', designation: '', phone_number: '', date_of_joining: '',
  salary: '', employment_status: 'ACTIVE',
};

export default function Employees() {
  const { isAdmin, isHR } = useAuth();
  const canWrite = isAdmin || isHR;

  // Component state
  const [employees, setEmployees]     = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');
  const [total, setTotal]             = useState(0);

  // Filter state
  const [search, setSearch]           = useState('');
  const [deptFilter, setDeptFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage]               = useState(1);
  const PAGE_SIZE = 10;

  // Modal state
  const [showModal, setShowModal]     = useState(false);
  const [editTarget, setEditTarget]   = useState(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [formError, setFormError]     = useState('');
  const [saving, setSaving]           = useState(false);

  // Delete target
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);

  // Fetch employees with search and pagination
  const fetchEmployees = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search)       params.set('search', search);
    if (deptFilter)   params.set('department', deptFilter);
    if (statusFilter) params.set('employment_status', statusFilter);
    params.set('page', page);
    params.set('page_size', PAGE_SIZE);

    api.get(`/employees/?${params}`)
      .then(res => {
        const data = res.data;
        if (Array.isArray(data)) { setEmployees(data); setTotal(data.length); }
        else { setEmployees(data.results || []); setTotal(data.count || 0); }
      })
      .catch(() => setError('Failed to load employees.'))
      .finally(() => setLoading(false));
  }, [search, deptFilter, statusFilter, page]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  useEffect(() => {
    api.get('/departments/').then(res =>
      setDepartments(Array.isArray(res.data) ? res.data : (res.data.results || []))
    ).catch(() => {});
  }, []);

  // Reset page when search or filter changes
  useEffect(() => { setPage(1); }, [search, deptFilter, statusFilter]);

  // Auto-dismiss alert messages
  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(''), 3000); return () => clearTimeout(t); }
  }, [success]);

  // Open create modal
  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowModal(true);
  };

  // Open edit modal
  const openEdit = (emp) => {
    setEditTarget(emp);
    setForm({
      username: emp.user?.username || '',
      email: emp.user?.email || '',
      first_name: emp.user?.first_name || '',
      last_name: emp.user?.last_name || '',
      password: '',
      role: emp.user?.role || 'EMPLOYEE',
      department: emp.department?.id || emp.department || '',
      designation: emp.designation || '',
      phone_number: emp.phone_number || '',
      date_of_joining: emp.date_of_joining || '',
      salary: emp.salary || '',
      employment_status: emp.employment_status || 'ACTIVE',
    });
    setFormError('');
    setShowModal(true);
  };

  // Save employee changes
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');

    // Build payload — omit blank password on edit
    const payload = { ...form };
    if (!payload.password) delete payload.password;
    if (!payload.salary) delete payload.salary;

    try {
      if (editTarget) {
        await api.patch(`/employees/${editTarget.id}/`, payload);
        setSuccess('Employee updated.');
      } else {
        await api.post('/employees/', payload);
        setSuccess('Employee created.');
      }
      setShowModal(false);
      fetchEmployees();
    } catch (err) {
      const data = err.response?.data || {};
      const msg = data.username?.[0] || data.email?.[0] || data.non_field_errors?.[0]
                || data.detail || JSON.stringify(data);
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  // Delete employee
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/employees/${deleteTarget.id}/`);
      setSuccess('Employee deleted.');
      setDeleteTarget(null);
      fetchEmployees();
    } catch (err) {
      setError(err.response?.data?.detail || 'Delete failed.');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  // Helper bindings
  const f = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-0 fw-bold"><i className="bi bi-people-fill me-2 text-primary"></i>Employees</h4>
          <p className="text-muted small mb-0">Total: <strong>{total}</strong> records</p>
        </div>
        {canWrite && (
          <button className="btn btn-primary" onClick={openCreate}>
            <i className="bi bi-person-plus-fill me-1"></i>Add Employee
          </button>
        )}
      </div>

      {/* Alerts */}
      {error   && <div className="alert alert-danger alert-dismissible">{error}<button className="btn-close" onClick={() => setError('')}></button></div>}
      {success && <div className="alert alert-success alert-dismissible">{success}<button className="btn-close" onClick={() => setSuccess('')}></button></div>}

      {/* Filters */}
      <div className="card shadow-sm border-0 mb-3">
        <div className="card-body py-2">
          <div className="row g-2 align-items-center">
            <div className="col-md-5">
              <div className="input-group input-group-sm">
                <span className="input-group-text"><i className="bi bi-search"></i></span>
                <input
                  className="form-control"
                  placeholder="Search by name, email, username…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3">
              <select className="form-select form-select-sm" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
                <option value="">All Departments</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <select className="form-select form-select-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="TERMINATED">Terminated</option>
              </select>
            </div>
            <div className="col-md-2">
              <button className="btn btn-sm btn-outline-secondary w-100" onClick={() => { setSearch(''); setDeptFilter(''); setStatusFilter(''); }}>
                <i className="bi bi-x-circle me-1"></i>Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
      ) : (
        <div className="card shadow-sm border-0">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-dark">
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Department</th>
                    <th>Designation</th>
                    <th>Role</th>
                    <th>Status</th>
                    {canWrite && <th className="text-end">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {employees.length === 0 && (
                    <tr><td colSpan={8} className="text-center text-muted py-4">No employees found.</td></tr>
                  )}
                  {employees.map(emp => {
                    const status = STATUS_MAP[emp.employment_status] || { label: emp.employment_status, color: 'secondary' };
                    const role   = ROLE_MAP[emp.user?.role] || { label: emp.user?.role, color: 'secondary' };
                    return (
                      <tr key={emp.id}>
                        <td className="text-muted small">EMP-{String(emp.employee_id || emp.id).padStart(3,'0')}</td>
                        <td>
                          <div className="fw-semibold">{emp.user?.first_name} {emp.user?.last_name}</div>
                          <div className="text-muted small">@{emp.user?.username}</div>
                        </td>
                        <td className="small text-muted">{emp.user?.email}</td>
                        <td>{emp.department?.name || '—'}</td>
                        <td className="small">{emp.designation || '—'}</td>
                        <td><span className={`badge bg-${role.color}`}>{role.label}</span></td>
                        <td><span className={`badge bg-${status.color}`}>{status.label}</span></td>
                        {canWrite && (
                          <td className="text-end">
                            <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(emp)}>
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => setDeleteTarget(emp)}>
                              <i className="bi bi-trash"></i>
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="card-footer bg-white d-flex justify-content-between align-items-center">
              <small className="text-muted">Page {page} of {totalPages} ({total} total)</small>
              <nav>
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setPage(p => p - 1)}>‹</button>
                  </li>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                      <button className="page-link" onClick={() => setPage(p)}>{p}</button>
                    </li>
                  ))}
                  <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setPage(p => p + 1)}>›</button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <form onSubmit={handleSave}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">
                    <i className={`bi ${editTarget ? 'bi-pencil-square' : 'bi-person-plus-fill'} me-2`}></i>
                    {editTarget ? 'Edit Employee' : 'Add New Employee'}
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                </div>
                <div className="modal-body">
                  {formError && <div className="alert alert-danger py-2 small">{formError}</div>}

                  <h6 className="text-muted mb-3 border-bottom pb-2">Account Information</h6>
                  <div className="row g-3 mb-3">
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Username <span className="text-danger">*</span></label>
                      <input className="form-control" value={form.username} onChange={e => f('username', e.target.value)} required disabled={!!editTarget} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Email <span className="text-danger">*</span></label>
                      <input type="email" className="form-control" value={form.email} onChange={e => f('email', e.target.value)} required />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">{editTarget ? 'New Password' : 'Password'} {!editTarget && <span className="text-danger">*</span>}</label>
                      <input type="password" className="form-control" value={form.password} onChange={e => f('password', e.target.value)} required={!editTarget} placeholder={editTarget ? 'Leave blank to keep' : ''} />
                    </div>
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">First Name</label>
                      <input className="form-control" value={form.first_name} onChange={e => f('first_name', e.target.value)} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Last Name</label>
                      <input className="form-control" value={form.last_name} onChange={e => f('last_name', e.target.value)} />
                    </div>
                  </div>

                  <h6 className="text-muted mb-3 border-bottom pb-2 mt-3">Employment Details</h6>
                  <div className="row g-3 mb-3">
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Role</label>
                      <select className="form-select" value={form.role} onChange={e => f('role', e.target.value)}>
                        <option value="EMPLOYEE">Employee</option>
                        <option value="PROJECT_MANAGER">Project Manager</option>
                        <option value="HR">HR</option>
                        {isAdmin && <option value="ADMIN">Admin</option>}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Department</label>
                      <select className="form-select" value={form.department} onChange={e => f('department', e.target.value)}>
                        <option value="">— Select —</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Status</label>
                      <select className="form-select" value={form.employment_status} onChange={e => f('employment_status', e.target.value)}>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                        <option value="TERMINATED">Terminated</option>
                      </select>
                    </div>
                  </div>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Designation</label>
                      <input className="form-control" value={form.designation} onChange={e => f('designation', e.target.value)} placeholder="e.g. Senior Developer" />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Phone</label>
                      <input className="form-control" value={form.phone_number} onChange={e => f('phone_number', e.target.value)} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Date of Joining</label>
                      <input type="date" className="form-control" value={form.date_of_joining} onChange={e => f('date_of_joining', e.target.value)} />
                    </div>
                    {(isAdmin || isHR) && (
                      <div className="col-md-4">
                        <label className="form-label fw-semibold">Salary (₹)</label>
                        <input type="number" className="form-control" value={form.salary} onChange={e => f('salary', e.target.value)} />
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <><span className="spinner-border spinner-border-sm me-1"></span>Saving…</> : (editTarget ? 'Update Employee' : 'Create Employee')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-sm">
            <div className="modal-content">
              <div className="modal-body text-center py-4">
                <i className="bi bi-exclamation-triangle-fill text-danger fs-1"></i>
                <p className="mt-2">Delete <strong>{deleteTarget.user?.first_name} {deleteTarget.user?.last_name}</strong>?</p>
                <p className="text-muted small">This cannot be undone.</p>
                <button className="btn btn-danger me-2" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Deleting…' : 'Yes, Delete'}
                </button>
                <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
