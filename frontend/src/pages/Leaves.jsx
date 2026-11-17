// Leave application management, date validation, and HR approval queue

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

const TYPE_MAP = {
  CASUAL: { label: 'Casual Leave', color: 'info' },
  SICK:   { label: 'Sick Leave',   color: 'danger' },
  PAID:   { label: 'Paid Leave',   color: 'primary' },
  UNPAID: { label: 'Unpaid Leave', color: 'secondary' },
};

const STATUS_MAP = {
  PENDING:  { label: 'Pending',  color: 'warning' },
  APPROVED: { label: 'Approved', color: 'success' },
  REJECTED: { label: 'Rejected', color: 'danger' },
};

const EMPTY_APP_FORM = {
  leave_type: 'CASUAL',
  start_date: '',
  end_date: '',
  reason: '',
};

export default function Leaves() {
  const { isAdmin, isHR } = useAuth();
  const canReview = isAdmin || isHR;

  // Component state
  const [leaves, setLeaves]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');
  const [pendingCount, setPendingCount] = useState(0);

  // Tabs: 'pending' (if HR/Admin), 'company' (if HR/Admin), 'my'
  const [tab, setTab]                 = useState(canReview ? 'pending' : 'my');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter]   = useState('');

  // Apply Modal
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyForm, setApplyForm]     = useState(EMPTY_APP_FORM);
  const [applyError, setApplyError]   = useState('');
  const [applying, setApplying]       = useState(false);

  // Review Modal (HR / Admin)
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewDecision, setReviewDecision] = useState('APPROVED');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewing, setReviewing]     = useState(false);
  const [reviewError, setReviewError] = useState('');

  // Fetch leaves list based on active tab
  const fetchLeaves = useCallback(() => {
    setLoading(true);
    let endpoint = '/leaves/';
    if (tab === 'pending') {
      endpoint = '/leaves/pending/';
    } else if (tab === 'my') {
      endpoint = '/leaves/my-leaves/';
    }

    const params = new URLSearchParams();
    if (tab === 'company') {
      if (statusFilter) params.set('status', statusFilter);
    }
    if (typeFilter) params.set('leave_type', typeFilter);

    const url = params.toString() ? `${endpoint}?${params.toString()}` : endpoint;

    api.get(url)
      .then(res => {
        const data = res.data;
        setLeaves(Array.isArray(data) ? data : (data.results || []));
      })
      .catch(() => setError('Failed to load leave records.'))
      .finally(() => setLoading(false));
  }, [tab, statusFilter, typeFilter]);

  // Fetch pending count for badge
  const fetchPendingCount = useCallback(() => {
    if (canReview) {
      api.get('/leaves/pending/')
        .then(res => {
          const data = res.data;
          setPendingCount(Array.isArray(data) ? data.length : (data.count || 0));
        })
        .catch(() => {});
    }
  }, [canReview]);

  useEffect(() => {
    fetchLeaves();
    fetchPendingCount();
  }, [fetchLeaves, fetchPendingCount]);

  // Auto-dismiss alert
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  // Submit leave application
  const handleApply = async (e) => {
    e.preventDefault();
    if (!applyForm.start_date || !applyForm.end_date) {
      setApplyError('Both start and end dates are required.');
      return;
    }
    if (new Date(applyForm.end_date) < new Date(applyForm.start_date)) {
      setApplyError('End date cannot be earlier than start date.');
      return;
    }

    setApplying(true);
    setApplyError('');

    try {
      await api.post('/leaves/', applyForm);
      setSuccess('Leave request submitted successfully.');
      setShowApplyModal(false);
      setApplyForm(EMPTY_APP_FORM);
      fetchLeaves();
      fetchPendingCount();
    } catch (err) {
      const d = err.response?.data || {};
      setApplyError(d.non_field_errors?.[0] || d.error || d.detail || JSON.stringify(d));
    } finally {
      setApplying(false);
    }
  };

  // Review leave request (Approve / Reject)
  const handleReview = async () => {
    if (!reviewTarget) return;
    setReviewing(true);
    setReviewError('');

    try {
      await api.post(`/leaves/${reviewTarget.id}/review/`, {
        status: reviewDecision,
        review_comment: reviewComment,
      });
      setSuccess(`Leave marked as ${STATUS_MAP[reviewDecision]?.label}.`);
      setReviewTarget(null);
      setReviewComment('');
      fetchLeaves();
      fetchPendingCount();
    } catch (err) {
      setReviewError(err.response?.data?.error || err.response?.data?.detail || 'Review failed.');
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-0 fw-bold"><i className="bi bi-calendar2-check me-2 text-primary"></i>Leave Management</h4>
          <p className="text-muted small mb-0">Apply for leaves and track approval workflows</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setApplyError(''); setShowApplyModal(true); }}>
          <i className="bi bi-plus-circle me-1"></i>Apply for Leave
        </button>
      </div>

      {/* Alerts */}
      {error   && <div className="alert alert-danger alert-dismissible">{error}<button className="btn-close" onClick={() => setError('')}></button></div>}
      {success && <div className="alert alert-success alert-dismissible">{success}<button className="btn-close" onClick={() => setSuccess('')}></button></div>}

      {/* Navigation Tabs */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <ul className="nav nav-pills">
          {canReview && (
            <li className="nav-item me-2">
              <button
                className={`btn btn-sm ${tab === 'pending' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setTab('pending')}
              >
                <i className="bi bi-hourglass-split me-1"></i>
                Pending Approval
                {pendingCount > 0 && <span className="badge bg-danger ms-2">{pendingCount}</span>}
              </button>
            </li>
          )}
          {canReview && (
            <li className="nav-item me-2">
              <button
                className={`btn btn-sm ${tab === 'company' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setTab('company')}
              >
                <i className="bi bi-collection me-1"></i>All Requests
              </button>
            </li>
          )}
          <li className="nav-item">
            <button
              className={`btn btn-sm ${tab === 'my' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setTab('my')}
            >
              <i className="bi bi-person me-1"></i>My Leave History
            </button>
          </li>
        </ul>

        {/* Filters */}
        <div className="d-flex gap-2">
          {tab === 'company' && (
            <select
              className="form-select form-select-sm"
              style={{ width: '130px' }}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_MAP).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          )}
          <select
            className="form-select form-select-sm"
            style={{ width: '140px' }}
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            <option value="">All Leave Types</option>
            {Object.entries(TYPE_MAP).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          {(statusFilter || typeFilter) && (
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => { setStatusFilter(''); setTypeFilter(''); }}
            >
              <i className="bi bi-x-circle"></i>
            </button>
          )}
        </div>
      </div>

      {/* Leave Requests Table */}
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
      ) : (
        <div className="card shadow-sm border-0">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-dark">
                  <tr>
                    {(tab === 'pending' || tab === 'company') && <th>Employee</th>}
                    <th>Type</th>
                    <th>Date Span</th>
                    <th>Days</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Reviewer Notes</th>
                    {canReview && tab === 'pending' && <th className="text-end">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {leaves.length === 0 && (
                    <tr>
                      <td colSpan={canReview && tab === 'pending' ? 8 : 7} className="text-center text-muted py-4">
                        {tab === 'pending' ? 'No pending leave applications 🎉' : 'No leave records found.'}
                      </td>
                    </tr>
                  )}
                  {leaves.map(l => {
                    const st = STATUS_MAP[l.status] || { label: l.status, color: 'secondary' };
                    const tp = TYPE_MAP[l.leave_type] || { label: l.leave_type, color: 'secondary' };

                    return (
                      <tr key={l.id}>
                        {(tab === 'pending' || tab === 'company') && (
                          <td>
                            <div className="fw-semibold">{l.employee_name || '—'}</div>
                            <small className="text-muted">EMP-{String(l.employee_code || '').padStart(3, '0')} • {l.department_name}</small>
                          </td>
                        )}
                        <td><span className={`badge bg-${tp.color}`}>{tp.label}</span></td>
                        <td>
                          <div className="small fw-semibold">{l.start_date} to {l.end_date}</div>
                          <small className="text-muted">Applied: {l.applied_on ? l.applied_on.split('T')[0] : '—'}</small>
                        </td>
                        <td><span className="badge bg-light text-dark border fw-bold">{l.total_days} days</span></td>
                        <td className="small text-muted" style={{ maxWidth: '240px' }}>{l.reason || '—'}</td>
                        <td><span className={`badge bg-${st.color}`}>{st.label}</span></td>
                        <td className="small text-muted">
                          {l.reviewed_by_name ? (
                            <>
                              <div><i className="bi bi-person-check me-1"></i>{l.reviewed_by_name}</div>
                              {l.review_comment && <div className="fst-italic">{l.review_comment}</div>}
                            </>
                          ) : '—'}
                        </td>
                        {canReview && tab === 'pending' && (
                          <td className="text-end">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => {
                                setReviewTarget(l);
                                setReviewDecision('APPROVED');
                                setReviewComment('');
                                setReviewError('');
                              }}
                            >
                              <i className="bi bi-shield-check me-1"></i>Review
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
        </div>
      )}

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={handleApply}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">
                    <i className="bi bi-calendar-plus me-2 text-primary"></i>Apply for Leave
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setShowApplyModal(false)}></button>
                </div>
                <div className="modal-body">
                  {applyError && <div className="alert alert-danger py-2 small">{applyError}</div>}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Leave Type</label>
                    <select
                      className="form-select"
                      value={applyForm.leave_type}
                      onChange={e => setApplyForm(f => ({ ...f, leave_type: e.target.value }))}
                    >
                      {Object.entries(TYPE_MAP).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Start Date <span className="text-danger">*</span></label>
                      <input
                        type="date"
                        className="form-control"
                        value={applyForm.start_date}
                        onChange={e => setApplyForm(f => ({ ...f, start_date: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">End Date <span className="text-danger">*</span></label>
                      <input
                        type="date"
                        className="form-control"
                        value={applyForm.end_date}
                        onChange={e => setApplyForm(f => ({ ...f, end_date: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div className="mb-2">
                    <label className="form-label fw-semibold">Reason <span className="text-danger">*</span></label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={applyForm.reason}
                      onChange={e => setApplyForm(f => ({ ...f, reason: e.target.value }))}
                      placeholder="Please specify the reason for your leave request..."
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowApplyModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={applying}>
                    {applying ? <><span className="spinner-border spinner-border-sm me-1"></span>Submitting…</> : 'Submit Application'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Review Decision Modal (HR / Admin) */}
      {reviewTarget && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-shield-check me-2 text-primary"></i>Review Leave Request
                </h5>
                <button type="button" className="btn-close" onClick={() => setReviewTarget(null)}></button>
              </div>
              <div className="modal-body">
                {reviewError && <div className="alert alert-danger py-2 small">{reviewError}</div>}
                <div className="p-3 bg-light rounded mb-3">
                  <div className="fw-bold">{reviewTarget.employee_name} ({reviewTarget.department_name})</div>
                  <div className="small text-muted">
                    {reviewTarget.leave_type_display} • {reviewTarget.start_date} to {reviewTarget.end_date} ({reviewTarget.total_days} days)
                  </div>
                  <div className="small mt-2"><strong>Reason:</strong> {reviewTarget.reason}</div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Decision</label>
                  <div className="d-flex gap-3">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        id="approve"
                        value="APPROVED"
                        checked={reviewDecision === 'APPROVED'}
                        onChange={e => setReviewDecision(e.target.value)}
                      />
                      <label className="form-check-label fw-semibold text-success" htmlFor="approve">
                        Approve Leave
                      </label>
                    </div>
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        id="reject"
                        value="REJECTED"
                        checked={reviewDecision === 'REJECTED'}
                        onChange={e => setReviewDecision(e.target.value)}
                      />
                      <label className="form-check-label fw-semibold text-danger" htmlFor="reject">
                        Reject Leave
                      </label>
                    </div>
                  </div>
                </div>

                <div className="mb-2">
                  <label className="form-label fw-semibold">Reviewer Comments</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={reviewComment}
                    onChange={e => setReviewComment(e.target.value)}
                    placeholder="Optional remarks (e.g. Approved, please hand over project tasks)"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setReviewTarget(null)}>Cancel</button>
                <button
                  className={`btn ${reviewDecision === 'APPROVED' ? 'btn-success' : 'btn-danger'}`}
                  onClick={handleReview}
                  disabled={reviewing}
                >
                  {reviewing ? 'Saving…' : `Confirm ${reviewDecision === 'APPROVED' ? 'Approval' : 'Rejection'}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
