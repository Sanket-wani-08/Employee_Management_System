// Task management page with priority badges, status updates and task creation

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

const STATUS_MAP = {
  TODO:        { label: 'To Do',       color: 'secondary' },
  IN_PROGRESS: { label: 'In Progress', color: 'primary'   },
  REVIEW:      { label: 'Review',      color: 'warning'   },
  COMPLETED:   { label: 'Completed',   color: 'success'   },
};

const PRIORITY_MAP = {
  LOW:      { label: 'Low',      color: 'secondary' },
  MEDIUM:   { label: 'Medium',   color: 'info'      },
  HIGH:     { label: 'High',     color: 'warning'   },
  CRITICAL: { label: 'Critical', color: 'danger'    },
};

const EMPTY_FORM = {
  title: '',
  description: '',
  project: '',
  assigned_to: '',
  priority: 'MEDIUM',
  status: 'TODO',
  deadline: '',
};

export default function Tasks() {
  const { user, isAdmin, isHR, isProjectManager } = useAuth();
  const canManage = isAdmin || isHR || isProjectManager;

  // Component state
  const [tasks, setTasks]             = useState([]);
  const [projects, setProjects]       = useState([]);
  const [employees, setEmployees]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');
  const [total, setTotal]             = useState(0);

  // Filters & Tabs
  const [tab, setTab]                 = useState('all'); // 'all' or 'mine'
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');

  // Create / Edit Modal
  const [showModal, setShowModal]     = useState(false);
  const [editTarget, setEditTarget]   = useState(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [formError, setFormError]     = useState('');
  const [saving, setSaving]           = useState(false);

  // Status Change Quick Action
  const [statusTarget, setStatusTarget] = useState(null);
  const [newStatus, setNewStatus]     = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Delete Confirm
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);

  // Fetch tasks based on active tab and filters
  const fetchTasks = useCallback(() => {
    setLoading(true);
    const endpoint = tab === 'mine' ? '/tasks/my-tasks/' : '/tasks/';
    const params = new URLSearchParams();

    if (tab !== 'mine') {
      if (search)         params.set('search', search);
      if (statusFilter)   params.set('status', statusFilter);
      if (priorityFilter) params.set('priority', priorityFilter);
      if (projectFilter)  params.set('project', projectFilter);
    }

    const url = params.toString() ? `${endpoint}?${params.toString()}` : endpoint;

    api.get(url)
      .then(res => {
        const data = res.data;
        if (Array.isArray(data)) {
          setTasks(data);
          setTotal(data.length);
        } else {
          setTasks(data.results || []);
          setTotal(data.count || 0);
        }
      })
      .catch(() => setError('Failed to load tasks.'))
      .finally(() => setLoading(false));
  }, [tab, search, statusFilter, priorityFilter, projectFilter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Load Projects and Employees for dropdowns
  useEffect(() => {
    api.get('/projects/').then(res => {
      setProjects(Array.isArray(res.data) ? res.data : (res.data.results || []));
    }).catch(() => {});

    api.get('/employees/').then(res => {
      setEmployees(Array.isArray(res.data) ? res.data : (res.data.results || []));
    }).catch(() => {});
  }, []);

  // Auto-dismiss alert
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  // Modal open and save handlers
  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (task) => {
    setEditTarget(task);
    setForm({
      title: task.title,
      description: task.description || '',
      project: task.project?.id || task.project || '',
      assigned_to: task.assigned_to?.id || task.assigned_to || '',
      priority: task.priority || 'MEDIUM',
      status: task.status || 'TODO',
      deadline: task.deadline || '',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setFormError('Task title is required.'); return; }
    if (!form.project) { setFormError('Project selection is required.'); return; }

    setSaving(true);
    setFormError('');

    const payload = { ...form };
    if (!payload.assigned_to) delete payload.assigned_to;
    if (!payload.deadline) delete payload.deadline;

    try {
      if (editTarget) {
        await api.patch(`/tasks/${editTarget.id}/`, payload);
        setSuccess('Task updated successfully.');
      } else {
        await api.post('/tasks/', payload);
        setSuccess('Task created successfully.');
      }
      setShowModal(false);
      fetchTasks();
    } catch (err) {
      const d = err.response?.data || {};
      setFormError(d.title?.[0] || d.project?.[0] || d.detail || JSON.stringify(d));
    } finally {
      setSaving(false);
    }
  };

  // Update task status workflow (TODO -> IN_PROGRESS -> REVIEW -> COMPLETED)
  const handleUpdateStatus = async () => {
    if (!statusTarget || !newStatus) return;
    setUpdatingStatus(true);
    try {
      await api.patch(`/tasks/${statusTarget.id}/update-status/`, { status: newStatus });
      setSuccess(`Task status changed to ${STATUS_MAP[newStatus]?.label}.`);
      setStatusTarget(null);
      fetchTasks();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Status transition failed.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Delete task
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/tasks/${deleteTarget.id}/`);
      setSuccess('Task deleted.');
      setDeleteTarget(null);
      fetchTasks();
    } catch (err) {
      setError(err.response?.data?.detail || 'Delete failed.');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-0 fw-bold"><i className="bi bi-check2-square me-2 text-primary"></i>Task Management</h4>
          <p className="text-muted small mb-0">Total: <strong>{total}</strong> tasks</p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={openCreate}>
            <i className="bi bi-plus-circle me-1"></i>New Task
          </button>
        )}
      </div>

      {/* Alerts */}
      {error   && <div className="alert alert-danger alert-dismissible">{error}<button className="btn-close" onClick={() => setError('')}></button></div>}
      {success && <div className="alert alert-success alert-dismissible">{success}<button className="btn-close" onClick={() => setSuccess('')}></button></div>}

      {/* Tabs */}
      <ul className="nav nav-pills mb-3">
        <li className="nav-nav-item me-2">
          <button
            className={`btn btn-sm ${tab === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setTab('all')}
          >
            <i className="bi bi-list-ul me-1"></i>All Tasks
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`btn btn-sm ${tab === 'mine' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setTab('mine')}
          >
            <i className="bi bi-person-check me-1"></i>My Assigned Tasks
          </button>
        </li>
      </ul>

      {/* Filters (Shown when viewing all) */}
      {tab === 'all' && (
        <div className="card shadow-sm border-0 mb-3">
          <div className="card-body py-2">
            <div className="row g-2 align-items-center">
              <div className="col-md-4">
                <div className="input-group input-group-sm">
                  <span className="input-group-text"><i className="bi bi-search"></i></span>
                  <input
                    className="form-control"
                    placeholder="Search by title, description, assignee..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="col-md-3">
                <select className="form-select form-select-sm" value={projectFilter} onChange={e => setProjectFilter(e.target.value)}>
                  <option value="">All Projects</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="col-md-2">
                <select className="form-select form-select-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="">All Statuses</option>
                  {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div className="col-md-2">
                <select className="form-select form-select-sm" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
                  <option value="">All Priorities</option>
                  {Object.entries(PRIORITY_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div className="col-md-1">
                <button
                  className="btn btn-sm btn-outline-secondary w-100"
                  onClick={() => { setSearch(''); setStatusFilter(''); setPriorityFilter(''); setProjectFilter(''); }}
                  title="Clear Filters"
                >
                  <i className="bi bi-x-circle"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Table */}
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
      ) : (
        <div className="card shadow-sm border-0">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-dark">
                  <tr>
                    <th>Task Title</th>
                    <th>Project</th>
                    <th>Assignee</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Deadline</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.length === 0 && (
                    <tr><td colSpan={7} className="text-center text-muted py-4">No tasks found.</td></tr>
                  )}
                  {tasks.map(task => {
                    const st = STATUS_MAP[task.status] || { label: task.status, color: 'secondary' };
                    const pr = PRIORITY_MAP[task.priority] || { label: task.priority, color: 'secondary' };
                    const isAssignee = user?.employee_id && task.assigned_to_detail?.employee_id === user?.employee_id;
                    const canChangeStatus = isAssignee || canManage;

                    return (
                      <tr key={task.id}>
                        <td>
                          <div className="fw-semibold">{task.title}</div>
                          {task.description && (
                            <small className="text-muted text-truncate d-inline-block" style={{ maxWidth: '280px' }}>
                              {task.description}
                            </small>
                          )}
                        </td>
                        <td><span className="badge bg-light text-dark border">{task.project_name || '—'}</span></td>
                        <td>
                          <div className="small fw-semibold">{task.assigned_to_name || 'Unassigned'}</div>
                        </td>
                        <td><span className={`badge bg-${pr.color}`}>{pr.label}</span></td>
                        <td>
                          <span className={`badge bg-${st.color}`}>{st.label}</span>
                        </td>
                        <td className="small text-danger">
                          {task.deadline ? (
                            <>
                              <i className="bi bi-calendar-event me-1"></i>
                              {task.deadline}
                            </>
                          ) : '—'}
                        </td>
                        <td className="text-end">
                          {canChangeStatus && (
                            <button
                              className="btn btn-sm btn-outline-info me-1"
                              title="Update Status"
                              onClick={() => { setStatusTarget(task); setNewStatus(task.status); }}
                            >
                              <i className="bi bi-arrow-repeat"></i>
                            </button>
                          )}
                          {canManage && (
                            <>
                              <button
                                className="btn btn-sm btn-outline-primary me-1"
                                title="Edit Task"
                                onClick={() => openEdit(task)}
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                title="Delete Task"
                                onClick={() => setDeleteTarget(task)}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <form onSubmit={handleSave}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">
                    <i className={`bi ${editTarget ? 'bi-pencil-square' : 'bi-plus-circle'} me-2 text-primary`}></i>
                    {editTarget ? 'Edit Task' : 'Create New Task'}
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                </div>
                <div className="modal-body">
                  {formError && <div className="alert alert-danger py-2 small">{formError}</div>}
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label fw-semibold">Task Title <span className="text-danger">*</span></label>
                      <input
                        className="form-control"
                        value={form.title}
                        onChange={e => f('title', e.target.value)}
                        placeholder="e.g. Implement JWT Refresh Rotator"
                        required
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Description</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        value={form.description}
                        onChange={e => f('description', e.target.value)}
                        placeholder="Detailed task description..."
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Project <span className="text-danger">*</span></label>
                      <select
                        className="form-select"
                        value={form.project}
                        onChange={e => f('project', e.target.value)}
                        required
                      >
                        <option value="">— Select Project —</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Assigned Employee</label>
                      <select
                        className="form-select"
                        value={form.assigned_to}
                        onChange={e => f('assigned_to', e.target.value)}
                      >
                        <option value="">— Unassigned —</option>
                        {employees.map(e => (
                          <option key={e.id} value={e.id}>
                            {e.user?.first_name} {e.user?.last_name} ({e.department?.name || 'No Dept'})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Priority</label>
                      <select
                        className="form-select"
                        value={form.priority}
                        onChange={e => f('priority', e.target.value)}
                      >
                        {Object.entries(PRIORITY_MAP).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Status</label>
                      <select
                        className="form-select"
                        value={form.status}
                        onChange={e => f('status', e.target.value)}
                      >
                        {Object.entries(STATUS_MAP).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Deadline</label>
                      <input
                        type="date"
                        className="form-control"
                        value={form.deadline}
                        onChange={e => f('deadline', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <><span className="spinner-border spinner-border-sm me-1"></span>Saving…</> : (editTarget ? 'Update Task' : 'Create Task')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Status Transition Modal */}
      {statusTarget && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-sm">
            <div className="modal-content">
              <div className="modal-header border-0 pb-0">
                <h6 className="modal-title fw-bold"><i className="bi bi-arrow-repeat me-1 text-info"></i>Change Task Status</h6>
                <button type="button" className="btn-close" onClick={() => setStatusTarget(null)}></button>
              </div>
              <div className="modal-body">
                <p className="small text-muted mb-2">{statusTarget.title}</p>
                <label className="form-label fw-semibold small">Target Workflow Status:</label>
                <select className="form-select form-select-sm" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                  {Object.entries(STATUS_MAP).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div className="modal-footer border-0 pt-0">
                <button className="btn btn-secondary btn-sm" onClick={() => setStatusTarget(null)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={handleUpdateStatus} disabled={updatingStatus}>
                  {updatingStatus ? 'Updating…' : 'Save Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-sm">
            <div className="modal-content">
              <div className="modal-body text-center py-4">
                <i className="bi bi-exclamation-triangle-fill text-danger fs-1"></i>
                <p className="mt-2 fw-semibold">Delete Task?</p>
                <p className="text-muted small">Are you sure you want to delete <strong>{deleteTarget.title}</strong>?</p>
                <div className="d-flex justify-content-center gap-2">
                  <button className="btn btn-secondary btn-sm" onClick={() => setDeleteTarget(null)}>Cancel</button>
                  <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
                    {deleting ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
