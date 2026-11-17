// Reports page with live data preview and CSV file downloads

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

export default function Reports() {
  const { isAdmin, isHR } = useAuth();
  const canAccessEmployeeReport = isAdmin || isHR;

  // Component state
  const [activeReport, setActiveReport] = useState(canAccessEmployeeReport ? 'employees' : 'attendance');
  const [data, setData]                 = useState([]);
  const [loading, setLoading]           = useState(true);
  const [downloading, setDownloading]   = useState(false);
  const [error, setError]               = useState('');

  // Attendance Date Filters
  const [startDate, setStartDate]       = useState('');
  const [endDate, setEndDate]           = useState('');

  // Fetch report preview data
  const fetchReportData = useCallback(() => {
    setLoading(true);
    setError('');

    let endpoint = `/dashboard/reports/${activeReport}/`;
    const params = new URLSearchParams();

    if (activeReport === 'attendance') {
      if (startDate) params.set('start_date', startDate);
      if (endDate)   params.set('end_date', endDate);
    }

    const url = params.toString() ? `${endpoint}?${params.toString()}` : endpoint;

    api.get(url)
      .then(res => {
        setData(Array.isArray(res.data) ? res.data : []);
      })
      .catch(err => {
        setError(err.response?.data?.detail || 'Failed to load report data.');
        setData([]);
      })
      .finally(() => setLoading(false));
  }, [activeReport, startDate, endDate]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Download report as CSV file
  const handleExportCSV = async () => {
    setDownloading(true);
    setError('');

    let exportUrl = `/dashboard/reports/${activeReport}/export-csv/`;
    const params = new URLSearchParams();

    if (activeReport === 'attendance') {
      if (startDate) params.set('start_date', startDate);
      if (endDate)   params.set('end_date', endDate);
    }

    if (params.toString()) {
      exportUrl += `?${params.toString()}`;
    }

    try {
      const response = await api.get(exportUrl, {
        responseType: 'blob', // Critical for file downloads
      });

      // Create a blob URL and simulate download link click
      const blob = new Blob([response.data], { type: 'text/csv' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `${activeReport}_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setError('Failed to download CSV export. Please check permissions.');
    } finally {
      setDownloading(false);
    }
  };

  // Available report tabs based on user role
  const REPORT_TABS = [
    ...(canAccessEmployeeReport ? [{ id: 'employees', label: 'Employees', icon: 'bi-people' }] : []),
    { id: 'attendance', label: 'Attendance', icon: 'bi-clock-history' },
    { id: 'leaves',     label: 'Leaves',     icon: 'bi-calendar-check' },
    { id: 'projects',   label: 'Projects',   icon: 'bi-kanban' },
    { id: 'tasks',      label: 'Tasks',      icon: 'bi-check2-square' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-0 fw-bold"><i className="bi bi-file-earmark-spreadsheet me-2 text-primary"></i>Reports & Exports</h4>
          <p className="text-muted small mb-0">View live system reports and export raw data to CSV</p>
        </div>
        <button
          className="btn btn-success"
          onClick={handleExportCSV}
          disabled={downloading || loading || data.length === 0}
        >
          {downloading ? (
            <><span className="spinner-border spinner-border-sm me-1"></span>Exporting…</>
          ) : (
            <><i className="bi bi-download me-1"></i>Download CSV</>
          )}
        </button>
      </div>

      {/* Error alert */}
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Tabs */}
      <div className="card shadow-sm border-0 mb-3">
        <div className="card-body p-2 d-flex flex-wrap justify-content-between align-items-center gap-2">
          <ul className="nav nav-pills">
            {REPORT_TABS.map(tab => (
              <li key={tab.id} className="nav-item me-1">
                <button
                  className={`btn btn-sm ${activeReport === tab.id ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setActiveReport(tab.id)}
                >
                  <i className={`bi ${tab.icon} me-1`}></i>
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>

          {/* Date Range for Attendance */}
          {activeReport === 'attendance' && (
            <div className="d-flex align-items-center gap-2">
              <span className="small text-muted">From:</span>
              <input
                type="date"
                className="form-control form-control-sm"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
              <span className="small text-muted">To:</span>
              <input
                type="date"
                className="form-control form-control-sm"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
              {(startDate || endDate) && (
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  title="Reset dates"
                >
                  <i className="bi bi-x"></i>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Table Preview */}
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
      ) : (
        <div className="card shadow-sm border-0">
          <div className="card-header bg-white d-flex justify-content-between align-items-center py-2">
            <span className="fw-semibold text-muted small">
              <i className="bi bi-table me-1"></i>
              Live Preview ({data.length} records)
            </span>
            <span className="badge bg-light text-dark border">Read-only Snapshot</span>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive" style={{ maxHeight: '550px' }}>
              <table className="table table-hover table-striped align-middle mb-0">
                <thead className="table-dark sticky-top">
                  {/* Dynamic headers depending on active report */}
                  {activeReport === 'employees' && (
                    <tr>
                      <th>ID</th>
                      <th>Full Name</th>
                      <th>Email</th>
                      <th>Department</th>
                      <th>Designation</th>
                      <th>Joining Date</th>
                      <th>Salary</th>
                      <th>Status</th>
                    </tr>
                  )}
                  {activeReport === 'attendance' && (
                    <tr>
                      <th>Date</th>
                      <th>Employee ID</th>
                      <th>Full Name</th>
                      <th>Department</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Status</th>
                    </tr>
                  )}
                  {activeReport === 'leaves' && (
                    <tr>
                      <th>Employee ID</th>
                      <th>Name</th>
                      <th>Leave Type</th>
                      <th>Date Span</th>
                      <th>Days</th>
                      <th>Status</th>
                      <th>Reviewed By</th>
                    </tr>
                  )}
                  {activeReport === 'projects' && (
                    <tr>
                      <th>Project Name</th>
                      <th>Status</th>
                      <th>Manager</th>
                      <th>Start Date</th>
                      <th>Deadline</th>
                      <th>Total Tasks</th>
                      <th>Completed Tasks</th>
                    </tr>
                  )}
                  {activeReport === 'tasks' && (
                    <tr>
                      <th>Task Title</th>
                      <th>Project</th>
                      <th>Assigned To</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Deadline</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {data.length === 0 && (
                    <tr><td colSpan={10} className="text-center text-muted py-4">No records to preview.</td></tr>
                  )}

                  {activeReport === 'employees' && data.map((r, i) => (
                    <tr key={i}>
                      <td className="small text-muted">{r.employee_id}</td>
                      <td className="fw-semibold">{r.full_name}</td>
                      <td className="small text-muted">{r.email}</td>
                      <td>{r.department}</td>
                      <td className="small">{r.designation}</td>
                      <td className="small">{r.joining_date}</td>
                      <td className="small fw-semibold">₹{Number(r.salary || 0).toLocaleString()}</td>
                      <td><span className={`badge bg-${r.status === 'ACTIVE' ? 'success' : 'secondary'}`}>{r.status}</span></td>
                    </tr>
                  ))}

                  {activeReport === 'attendance' && data.map((r, i) => (
                    <tr key={i}>
                      <td className="fw-semibold">{r.date}</td>
                      <td className="small text-muted">{r.employee_id}</td>
                      <td>{r.employee_name}</td>
                      <td>{r.department}</td>
                      <td className="text-success small fw-semibold">{r.check_in || '—'}</td>
                      <td className="text-primary small fw-semibold">{r.check_out || '—'}</td>
                      <td><span className={`badge bg-${r.status === 'PRESENT' ? 'success' : r.status === 'HALF_DAY' ? 'warning' : 'danger'}`}>{r.status}</span></td>
                    </tr>
                  ))}

                  {activeReport === 'leaves' && data.map((r, i) => (
                    <tr key={i}>
                      <td className="small text-muted">{r.employee_id}</td>
                      <td className="fw-semibold">{r.name}</td>
                      <td><span className="badge bg-info text-dark">{r.leave_type}</span></td>
                      <td className="small">{r.start_date} to {r.end_date}</td>
                      <td><span className="badge bg-light text-dark border">{r.days}d</span></td>
                      <td><span className={`badge bg-${r.status === 'Approved' ? 'success' : r.status === 'Pending' ? 'warning' : 'danger'}`}>{r.status}</span></td>
                      <td className="small text-muted">{r.reviewed_by || '—'}</td>
                    </tr>
                  ))}

                  {activeReport === 'projects' && data.map((r, i) => (
                    <tr key={i}>
                      <td className="fw-semibold">{r.name}</td>
                      <td><span className="badge bg-primary">{r.status}</span></td>
                      <td>{r.manager}</td>
                      <td className="small">{r.start_date || '—'}</td>
                      <td className="small text-danger">{r.deadline || '—'}</td>
                      <td><span className="badge bg-light text-dark border">{r.total_tasks}</span></td>
                      <td><span className="badge bg-success">{r.completed_tasks}</span></td>
                    </tr>
                  ))}

                  {activeReport === 'tasks' && data.map((r, i) => (
                    <tr key={i}>
                      <td className="fw-semibold">{r.title}</td>
                      <td><span className="badge bg-light text-dark border">{r.project}</span></td>
                      <td>{r.assigned_to}</td>
                      <td><span className={`badge bg-${r.priority === 'Critical' ? 'danger' : r.priority === 'High' ? 'warning' : 'info'}`}>{r.priority}</span></td>
                      <td><span className="badge bg-secondary">{r.status}</span></td>
                      <td className="small text-danger">{r.deadline || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
