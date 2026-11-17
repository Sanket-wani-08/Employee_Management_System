// Project management page with team assignments and task lists

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

const STATUS_MAP = {
  PLANNED:     { label: 'Planned',     color: 'secondary' },
  IN_PROGRESS: { label: 'In Progress', color: 'primary'   },
  COMPLETED:   { label: 'Completed',   color: 'success'   },
  ON_HOLD:     { label: 'On Hold',     color: 'warning'   },
};

const TASK_STATUS_MAP = {
  TODO:        { label: 'To Do',       color: 'secondary' },
  IN_PROGRESS: { label: 'In Progress', color: 'primary'   },
  REVIEW:      { label: 'Review',      color: 'warning'   },
  COMPLETED:   { label: 'Completed',   color: 'success'   },
};

const EMPTY_FORM = { name: '', description: '', start_date: '', end_date: '', status: 'PLANNED', project_manager: '' };

export default function Projects() {
  const { isAdmin, isHR, isProjectManager } = useAuth();
  const canWrite = isAdmin || isHR || isProjectManager;

  // Component state
  const [projects, setProjects]         = useState([]);
  const [employees, setEmployees]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Create/Edit modal state
  const [showModal, setShowModal]       = useState(false);
  const [editTarget, setEditTarget]     = useState(null);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [formError, setFormError]       = useState('');
  const [saving, setSaving]             = useState(false);

  // Delete target
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Project details modal
  const [detailProject, setDetailProject] = useState(null);
  const [projectTasks, setProjectTasks]   = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [memberToAdd, setMemberToAdd]     = useState('');
  const [memberSaving, setMemberSaving]   = useState(false);

  // Fetch project records
  const fetchProjects = useCallback(() => {
    setLoading(true);
    const params = statusFilter ? `?status=${statusFilter}` : '';
    api.get(`/projects/${params}`)
      .then(res => setProjects(Array.isArray(res.data) ? res.data : (res.data.results || [])))
      .catch(() => setError('Failed to load projects.'))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  useEffect(() => {
    api.get('/employees/').then(res =>
      setEmployees(Array.isArray(res.data) ? res.data : (res.data.results || []))
    ).catch(() => {});
  }, []);

  // Auto-dismiss alerts after 3 seconds
  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(''), 3000); return () => clearTimeout(t); }
  }, [success]);

  // Open modal for creating or editing project
  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setFormError(''); setShowModal(true); };
  const openEdit   = (p)  => {
    setEditTarget(p);
    setForm({
      name: p.name, description: p.description || '',
      start_date: p.start_date || '', end_date: p.end_date || '',
      status: p.status, project_manager: p.project_manager?.id || p.project_manager || '',
    });
    setFormError('');
    setShowModal(true);
  };

  // Save project details
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    const payload = { ...form };
    if (!payload.project_manager) delete payload.project_manager;
    try {
      if (editTarget) { await api.patch(`/projects/${editTarget.id}/`, payload); setSuccess('Project updated.'); }
      else            { await api.post('/projects/', payload); setSuccess('Project created.'); }
      setShowModal(false);
      fetchProjects();
    } catch (err) {
      const d = err.response?.data || {};
      setFormError(d.name?.[0] || d.detail || JSON.stringify(d));
    } finally { setSaving(false); }
  };

  // Delete project
  const handleDelete = async (proj) => {
    try {
      await api.delete(`/projects/${proj.id}/`);
      setSuccess('Project deleted.');
      setDeleteTarget(null);
      fetchProjects();
    } catch (err) { setError(err.response?.data?.detail || 'Delete failed.'); setDeleteTarget(null); }
  };

  // Open detail modal with tasks and team members
  const openDetail = async (proj) => {
    setDetailProject(proj);
    setLoadingDetail(true);
    setMemberToAdd('');
    try {
      const res = await api.get(`/projects/${proj.id}/tasks/`);
      setProjectTasks(Array.isArray(res.data) ? res.data : (res.data.results || []));
    } catch { setProjectTasks([]); }
    finally { setLoadingDetail(false); }
  };

  const handleAddMember = async () => {
    if (!memberToAdd) return;
    setMemberSaving(true);
    try {
      await api.post(`/projects/${detailProject.id}/add-member/`, { employee_id: memberToAdd });
      setSuccess('Member added.');
      fetchProjects();
      const res = await api.get(`/projects/${detailProject.id}/`);
      setDetailProject(res.data);
      setMemberToAdd('');
    } catch (err) { setError(err.response?.data?.error || 'Failed to add member.'); }
    finally { setMemberSaving(false); }
  };

  const handleRemoveMember = async (empId) => {
    try {
      await api.post(`/projects/${detailProject.id}/remove-member/`, { employee_id: empId });
      setSuccess('Member removed.');
      fetchProjects();
      const res = await api.get(`/projects/${detailProject.id}/`);
      setDetailProject(res.data);
    } catch (err) { setError(err.response?.data?.error || 'Failed to remove member.'); }
  };

  // Calculate task completion percentage
  const getProgress = (p) => {
    const total = p.total_tasks || 0;
    const done  = p.completed_tasks || 0;
    return total > 0 ? Math.round((done / total) * 100) : 0;
  };

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-0 fw-bold"><i className="bi bi-kanban-fill me-2 text-primary"></i>Projects</h4>
          <p className="text-muted small mb-0">Track and manage all projects</p>
        </div>
        <div className="d-flex gap-2">
          <select className="form-select form-select-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {canWrite && (
            <button className="btn btn-primary btn-sm" onClick={openCreate}>
              <i className="bi bi-plus-circle me-1"></i>New Project
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error   && <div className="alert alert-danger alert-dismissible">{error}<button className="btn-close" onClick={() => setError('')}></button></div>}
      {success && <div className="alert alert-success alert-dismissible">{success}<button className="btn-close" onClick={() => setSuccess('')}></button></div>}

      {/* Project Cards Grid */}
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
      ) : (
        <div className="row g-4">
          {projects.length === 0 && (
            <div className="col-12 text-center text-muted py-5">No projects found.</div>
          )}
          {projects.map(proj => {
            const st = STATUS_MAP[proj.status] || { label: proj.status, color: 'secondary' };
            const pct = getProgress(proj);
            return (
              <div key={proj.id} className="col-xl-4 col-md-6">
                <div className="card shadow-sm border-0 h-100">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h6 className="fw-bold mb-0">{proj.name}</h6>
                      <span className={`badge bg-${st.color}`}>{st.label}</span>
                    </div>
                    <p className="text-muted small mb-3" style={{ minHeight: '2.5rem' }}>
                      {proj.description?.slice(0, 80) || 'No description'}
                    </p>

                    {/* Progress */}
                    <div className="mb-2">
                      <div className="d-flex justify-content-between small mb-1">
                        <span className="text-muted">Progress</span>
                        <span className="fw-semibold">{pct}%</span>
                      </div>
                      <div className="progress" style={{ height: '6px' }}>
                        <div className={`progress-bar bg-${pct === 100 ? 'success' : 'primary'}`} style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>

                    <div className="row g-2 text-center mt-2 mb-3">
                      <div className="col-4">
                        <div className="small text-muted">Manager</div>
                        <div className="small fw-semibold">{proj.project_manager?.user?.first_name || '—'}</div>
                      </div>
                      <div className="col-4">
                        <div className="small text-muted">Team</div>
                        <div className="small fw-semibold">{proj.team_members?.length ?? proj.team_count ?? 0}</div>
                      </div>
                      <div className="col-4">
                        <div className="small text-muted">Tasks</div>
                        <div className="small fw-semibold">{proj.total_tasks || 0}</div>
                      </div>
                    </div>
                  </div>
                  <div className="card-footer bg-white border-0 d-flex gap-2">
                    <button
                      className="btn btn-sm btn-outline-primary flex-grow-1"
                      onClick={() => openDetail(proj)}
                      data-bs-toggle="modal" data-bs-target="#detailModal"
                    >
                      <i className="bi bi-eye me-1"></i>Details
                    </button>
                    {canWrite && (
                      <>
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => openEdit(proj)}>
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => setDeleteTarget(proj)}>
                          <i className="bi bi-trash"></i>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Project Modal */}
      {showModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <form onSubmit={handleSave}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">{editTarget ? 'Edit Project' : 'Create Project'}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                </div>
                <div className="modal-body">
                  {formError && <div className="alert alert-danger py-2 small">{formError}</div>}
                  <div className="row g-3">
                    <div className="col-md-8">
                      <label className="form-label fw-semibold">Project Name <span className="text-danger">*</span></label>
                      <input className="form-control" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Status</label>
                      <select className="form-select" value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}>
                        {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Description</label>
                      <textarea className="form-control" rows={3} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Project Manager</label>
                      <select className="form-select" value={form.project_manager} onChange={e => setForm(f => ({...f, project_manager: e.target.value}))}>
                        <option value="">— Select —</option>
                        {employees.filter(e => ['ADMIN','PROJECT_MANAGER','HR'].includes(e.user?.role)).map(e => (
                          <option key={e.id} value={e.id}>{e.user?.first_name} {e.user?.last_name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">Start Date</label>
                      <input type="date" className="form-control" value={form.start_date} onChange={e => setForm(f => ({...f, start_date: e.target.value}))} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-semibold">End Date</label>
                      <input type="date" className="form-control" value={form.end_date} onChange={e => setForm(f => ({...f, end_date: e.target.value}))} />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving…' : (editTarget ? 'Update' : 'Create Project')}
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
              <div className="modal-body text-center py-4">
                <i className="bi bi-exclamation-triangle-fill text-danger fs-1"></i>
                <p className="mt-2">Delete <strong>{deleteTarget.name}</strong>?</p>
                <button className="btn btn-danger me-2 btn-sm" onClick={() => handleDelete(deleteTarget)}>Delete</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setDeleteTarget(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Details Modal (Tasks & Team Members) */}
      <div className="modal fade" id="detailModal" tabIndex="-1">
        <div className="modal-dialog modal-xl modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title fw-bold">
                <i className="bi bi-kanban me-2 text-primary"></i>
                {detailProject?.name}
                {detailProject && <span className={`badge bg-${STATUS_MAP[detailProject.status]?.color} ms-2`}>{STATUS_MAP[detailProject.status]?.label}</span>}
              </h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div className="modal-body">
              {loadingDetail ? (
                <div className="text-center py-4"><div className="spinner-border text-primary"></div></div>
              ) : (
                <div className="row g-4">
                  {/* Tasks */}
                  <div className="col-lg-7">
                    <h6 className="fw-bold mb-3"><i className="bi bi-list-task me-2"></i>Tasks ({projectTasks.length})</h6>
                    {projectTasks.length === 0 ? (
                      <p className="text-muted">No tasks yet.</p>
                    ) : (
                      <table className="table table-sm">
                        <thead className="table-light"><tr><th>Title</th><th>Assignee</th><th>Priority</th><th>Status</th><th>Deadline</th></tr></thead>
                        <tbody>
                          {projectTasks.map(t => (
                            <tr key={t.id}>
                              <td className="small">{t.title}</td>
                              <td className="small text-muted">{t.assigned_to?.user?.first_name || '—'}</td>
                              <td><span className={`badge bg-${t.priority === 'CRITICAL' ? 'danger' : t.priority === 'HIGH' ? 'warning' : 'secondary'} small`}>{t.priority}</span></td>
                              <td><span className={`badge bg-${TASK_STATUS_MAP[t.status]?.color} small`}>{TASK_STATUS_MAP[t.status]?.label || t.status}</span></td>
                              <td className="small text-danger">{t.deadline || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Team */}
                  <div className="col-lg-5">
                    <h6 className="fw-bold mb-3"><i className="bi bi-people me-2"></i>Team ({detailProject?.team_members?.length || 0})</h6>
                    {canWrite && (
                      <div className="input-group mb-3">
                        <select className="form-select form-select-sm" value={memberToAdd} onChange={e => setMemberToAdd(e.target.value)}>
                          <option value="">Select employee…</option>
                          {employees.map(e => (
                            <option key={e.id} value={e.id}>{e.user?.first_name} {e.user?.last_name}</option>
                          ))}
                        </select>
                        <button className="btn btn-sm btn-primary" onClick={handleAddMember} disabled={memberSaving || !memberToAdd}>
                          {memberSaving ? '…' : 'Add'}
                        </button>
                      </div>
                    )}
                    <ul className="list-group list-group-flush">
                      {(detailProject?.team_members || []).map(m => (
                        <li key={m.id} className="list-group-item d-flex justify-content-between align-items-center px-0">
                          <div>
                            <div className="small fw-semibold">{m.user?.first_name} {m.user?.last_name}</div>
                            <div className="small text-muted">{m.designation || m.user?.role}</div>
                          </div>
                          {canWrite && (
                            <button className="btn btn-xs btn-outline-danger btn-sm" onClick={() => handleRemoveMember(m.id)}>
                              <i className="bi bi-x"></i>
                            </button>
                          )}
                        </li>
                      ))}
                      {(detailProject?.team_members || []).length === 0 && (
                        <li className="list-group-item text-muted px-0">No team members yet.</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
