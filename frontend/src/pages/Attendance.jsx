// Daily attendance tracking, employee punch clock, and HR attendance management

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

const STATUS_MAP = {
  PRESENT:  { label: 'Present',  color: 'success' },
  ABSENT:   { label: 'Absent',   color: 'danger'  },
  HALF_DAY: { label: 'Half Day', color: 'warning' },
  LATE:     { label: 'Late',     color: 'info'    },
};

const EMPTY_MANUAL_FORM = {
  employee: '',
  date: new Date().toISOString().split('T')[0],
  check_in: '',
  check_out: '',
  status: 'PRESENT',
  notes: '',
};

export default function Attendance() {
  const { user, isAdmin, isHR } = useAuth();
  const canManage = isAdmin || isHR;

  // Component state
  const [records, setRecords]       = useState([]);
  const [summary, setSummary]       = useState(null);
  const [todayStatus, setTodayStatus] = useState(null);
  const [employees, setEmployees]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [success, setSuccess]         = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // View tabs: 'my' or 'company'
  const [viewMode, setViewMode]     = useState(canManage ? 'company' : 'my');

  // Filters
  const [dateFilter, setDateFilter]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [empFilter, setEmpFilter]       = useState('');

  // Manual Log Modal (HR / Admin)
  const [showModal, setShowModal]       = useState(false);
  const [manualForm, setManualForm]     = useState(EMPTY_MANUAL_FORM);
  const [savingManual, setSavingManual] = useState(false);
  const [modalError, setModalError]     = useState('');

  // Fetch today's check-in / check-out status
  const fetchTodayStatus = useCallback(() => {
    api.get('/attendance/today/')
      .then(res => setTodayStatus(res.data))
      .catch(() => {});
  }, []);

  // Fetch summary counts (present, absent, etc.)
  const fetchSummary = useCallback(() => {
    api.get('/attendance/summary/')
      .then(res => setSummary(res.data))
      .catch(() => {});
  }, []);

  // Fetch attendance records list
  const fetchRecords = useCallback(() => {
    setLoading(true);
    const endpoint = viewMode === 'my' ? '/attendance/my-attendance/' : '/attendance/';
    const params = new URLSearchParams();

    if (dateFilter) params.set('date', dateFilter);
    if (statusFilter) params.set('status', statusFilter);
    if (viewMode === 'company' && empFilter) params.set('employee', empFilter);

    const url = params.toString() ? `${endpoint}?${params.toString()}` : endpoint;

    api.get(url)
      .then(res => {
        const data = res.data;
        setRecords(Array.isArray(data) ? data : (data.results || []));
      })
      .catch(() => setError('Failed to load attendance records.'))
      .finally(() => setLoading(false));
  }, [viewMode, dateFilter, statusFilter, empFilter]);

  useEffect(() => {
    fetchTodayStatus();
    fetchSummary();
    fetchRecords();
  }, [fetchTodayStatus, fetchSummary, fetchRecords]);

  // Load employee list for HR/Admin filter & modal
  useEffect(() => {
    if (canManage) {
      api.get('/employees/').then(res => {
        setEmployees(Array.isArray(res.data) ? res.data : (res.data.results || []));
      }).catch(() => {});
    }
  }, [canManage]);

  // Auto-dismiss alert
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  // Check-in button handler
  const handleCheckIn = async () => {
    setActionLoading(true);
    setError('');
    try {
      const res = await api.post('/attendance/check-in/', {});
      setSuccess(res.data.message || 'Check-in successful!');
      fetchTodayStatus();
      fetchSummary();
      fetchRecords();
    } catch (err) {
      setError(err.response?.data?.error || 'Check-in failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Check-out button handler
  const handleCheckOut = async () => {
    setActionLoading(true);
    setError('');
    try {
      const res = await api.post('/attendance/check-out/', {});
      setSuccess(res.data.message || 'Check-out successful!');
      fetchTodayStatus();
      fetchSummary();
      fetchRecords();
    } catch (err) {
      setError(err.response?.data?.error || 'Check-out failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Manual record creation by HR/Admin
  const handleManualSave = async (e) => {
    e.preventDefault();
    if (!manualForm.employee) { setModalError('Please select an employee.'); return; }
    if (!manualForm.date) { setModalError('Please pick a date.'); return; }

    setSavingManual(true);
    setModalError('');

    const payload = { ...manualForm };
    if (!payload.check_in) delete payload.check_in;
    if (!payload.check_out) delete payload.check_out;

    try {
      await api.post('/attendance/', payload);
      setSuccess('Attendance log recorded.');
      setShowModal(false);
      setManualForm(EMPTY_MANUAL_FORM);
      fetchSummary();
      fetchRecords();
    } catch (err) {
      const d = err.response?.data || {};
      setModalError(d.detail || d.error || d.non_field_errors?.[0] || JSON.stringify(d));
    } finally {
      setSavingManual(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-0 fw-bold"><i className="bi bi-clock-history me-2 text-primary"></i>Attendance Management</h4>
          <p className="text-muted small mb-0">Daily check-in / check-out and attendance records</p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => { setModalError(''); setShowModal(true); }}>
            <i className="bi bi-plus-circle me-1"></i>Manual Log
          </button>
        )}
      </div>

      {/* Alerts */}
      {error   && <div className="alert alert-danger alert-dismissible">{error}<button className="btn-close" onClick={() => setError('')}></button></div>}
      {success && <div className="alert alert-success alert-dismissible">{success}<button className="btn-close" onClick={() => setSuccess('')}></button></div>}

      {/* Top Banner: Today's Action Card + Summary Cards */}
      <div className="row g-3 mb-4">
        {/* Today's Punch Card */}
        <div className="col-xl-4 col-lg-5">
          <div className="card shadow-sm border-0 h-100 bg-light">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-semibold text-muted small"><i className="bi bi-stopwatch me-1"></i>Today's Shift</span>
                <span className="badge bg-secondary">{todayStatus?.date || 'Today'}</span>
              </div>
              <div className="d-flex gap-2 mb-3">
                <div className="flex-grow-1 p-2 bg-white rounded border text-center">
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>Check In</div>
                  <div className="fw-bold fs-6 text-success">{todayStatus?.check_in_time || '—'}</div>
                </div>
                <div className="flex-grow-1 p-2 bg-white rounded border text-center">
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>Check Out</div>
                  <div className="fw-bold fs-6 text-primary">{todayStatus?.check_out_time || '—'}</div>
                </div>
              </div>

              {/* Punch Button */}
              {!todayStatus?.checked_in ? (
                <button
                  className="btn btn-success w-100 fw-semibold"
                  onClick={handleCheckIn}
                  disabled={actionLoading}
                >
                  <i className="bi bi-box-arrow-in-right me-1"></i>
                  {actionLoading ? 'Recording...' : 'Check In Now'}
                </button>
              ) : !todayStatus?.checked_out ? (
                <button
                  className="btn btn-warning w-100 fw-semibold text-dark"
                  onClick={handleCheckOut}
                  disabled={actionLoading}
                >
                  <i className="bi bi-box-arrow-left me-1"></i>
                  {actionLoading ? 'Recording...' : 'Check Out Now'}
                </button>
              ) : (
                <div className="alert alert-success py-2 mb-0 text-center small fw-semibold">
                  <i className="bi bi-check-circle-fill me-1"></i>Shift Completed for Today
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Attendance Summary Metrics */}
        <div className="col-xl-8 col-lg-7">
          <div className="row g-2 h-100">
            <div className="col-sm-6 col-md-3">
              <div className="card shadow-sm border-0 h-100 border-start border-4 border-primary">
                <div className="card-body p-3">
                  <div className="text-muted small">Total Logs</div>
                  <div className="fs-4 fw-bold">{summary?.total_records ?? '—'}</div>
                </div>
              </div>
            </div>
            <div className="col-sm-6 col-md-3">
              <div className="card shadow-sm border-0 h-100 border-start border-4 border-success">
                <div className="card-body p-3">
                  <div className="text-muted small">Present</div>
                  <div className="fs-4 fw-bold text-success">{summary?.present ?? '—'}</div>
                </div>
              </div>
            </div>
            <div className="col-sm-6 col-md-3">
              <div className="card shadow-sm border-0 h-100 border-start border-4 border-warning">
                <div className="card-body p-3">
                  <div className="text-muted small">Half Day</div>
                  <div className="fs-4 fw-bold text-warning">{summary?.half_day ?? '—'}</div>
                </div>
              </div>
            </div>
            <div className="col-sm-6 col-md-3">
              <div className="card shadow-sm border-0 h-100 border-start border-4 border-danger">
                <div className="card-body p-3">
                  <div className="text-muted small">Absent</div>
                  <div className="fs-4 fw-bold text-danger">{summary?.absent ?? '—'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        {canManage ? (
          <ul className="nav nav-pills">
            <li className="nav-item me-2">
              <button
                className={`btn btn-sm ${viewMode === 'company' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setViewMode('company')}
              >
                <i className="bi bi-buildings me-1"></i>Company Records
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`btn btn-sm ${viewMode === 'my' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setViewMode('my')}
              >
                <i className="bi bi-person me-1"></i>My Logs
              </button>
            </li>
          </ul>
        ) : (
          <span className="fw-semibold text-muted small"><i className="bi bi-calendar-check me-1"></i>My Attendance History</span>
        )}

        {/* Filter Controls */}
        <div className="d-flex gap-2 flex-wrap">
          <input
            type="date"
            className="form-control form-control-sm"
            style={{ width: '150px' }}
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
          />
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
          {viewMode === 'company' && (
            <select
              className="form-select form-select-sm"
              style={{ width: '160px' }}
              value={empFilter}
              onChange={e => setEmpFilter(e.target.value)}
            >
              <option value="">All Employees</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.user?.first_name} {e.user?.last_name}</option>
              ))}
            </select>
          )}
          {(dateFilter || statusFilter || empFilter) && (
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => { setDateFilter(''); setStatusFilter(''); setEmpFilter(''); }}
            >
              <i className="bi bi-x-circle"></i>
            </button>
          )}
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
                    <th>Date</th>
                    {viewMode === 'company' && <th>Employee</th>}
                    {viewMode === 'company' && <th>Department</th>}
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Status</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {records.length === 0 && (
                    <tr><td colSpan={viewMode === 'company' ? 7 : 5} className="text-center text-muted py-4">No attendance records found.</td></tr>
                  )}
                  {records.map(rec => {
                    const st = STATUS_MAP[rec.status] || { label: rec.status, color: 'secondary' };
                    return (
                      <tr key={rec.id}>
                        <td className="fw-semibold">
                          <i className="bi bi-calendar3 me-1 text-muted"></i>
                          {rec.date}
                        </td>
                        {viewMode === 'company' && (
                          <td>
                            <div className="fw-semibold">{rec.employee_name || '—'}</div>
                            <small className="text-muted">EMP-{String(rec.employee_code || rec.employee || '').padStart(3, '0')}</small>
                          </td>
                        )}
                        {viewMode === 'company' && (
                          <td><span className="badge bg-light text-dark border">{rec.department_name || '—'}</span></td>
                        )}
                        <td className="text-success fw-semibold">{rec.check_in || '—'}</td>
                        <td className="text-primary fw-semibold">{rec.check_out || '—'}</td>
                        <td><span className={`badge bg-${st.color}`}>{st.label}</span></td>
                        <td className="text-muted small">{rec.notes || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Manual Attendance Log Modal (HR / Admin) */}
      {showModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={handleManualSave}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">
                    <i className="bi bi-pencil-square me-2 text-primary"></i>Record Attendance Log
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                </div>
                <div className="modal-body">
                  {modalError && <div className="alert alert-danger py-2 small">{modalError}</div>}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Employee <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      value={manualForm.employee}
                      onChange={e => setManualForm(f => ({ ...f, employee: e.target.value }))}
                      required
                    >
                      <option value="">— Select Employee —</option>
                      {employees.map(e => (
                        <option key={e.id} value={e.id}>{e.user?.first_name} {e.user?.last_name} ({e.user?.username})</option>
                      ))}
                    </select>
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Date <span className="text-danger">*</span></label>
                      <input
                        type="date"
                        className="form-control"
                        value={manualForm.date}
                        onChange={e => setManualForm(f => ({ ...f, date: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Status</label>
                      <select
                        className="form-select"
                        value={manualForm.status}
                        onChange={e => setManualForm(f => ({ ...f, status: e.target.value }))}
                      >
                        {Object.entries(STATUS_MAP).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Check-In Time</label>
                      <input
                        type="time"
                        step="1"
                        className="form-control"
                        value={manualForm.check_in}
                        onChange={e => setManualForm(f => ({ ...f, check_in: e.target.value }))}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Check-Out Time</label>
                      <input
                        type="time"
                        step="1"
                        className="form-control"
                        value={manualForm.check_out}
                        onChange={e => setManualForm(f => ({ ...f, check_out: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="mb-2">
                    <label className="form-label fw-semibold">Notes</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={manualForm.notes}
                      onChange={e => setManualForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="e.g. Approved remote work adjustment"
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={savingManual}>
                    {savingManual ? 'Saving…' : 'Save Attendance Log'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
