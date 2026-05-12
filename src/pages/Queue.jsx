import { useState, useEffect, useCallback } from 'react';
import { ListOrdered, RefreshCw, Clock, CheckCircle, XCircle, Loader, AlertTriangle } from 'lucide-react';
import { listDevices, getQueue } from '../api';
import StatusBadge from '../components/StatusBadge';
import toast from 'react-hot-toast';

const STATUS_FILTERS = ['all', 'pending', 'sending', 'sent', 'failed'];

function JobStatusIcon({ status }) {
  if (status === 'sent')    return <CheckCircle size={15} color="var(--green)" />;
  if (status === 'failed')  return <XCircle size={15} color="var(--red)" />;
  if (status === 'sending') return <Loader size={15} color="var(--blue)" style={{ animation: 'spin .7s linear infinite' }} />;
  if (status === 'pending') return <Clock size={15} color="#9ca3af" />;
  return <AlertTriangle size={15} color="var(--yellow)" />;
}

export default function Queue({ selectedDevice }) {
  const [devices, setDevices]   = useState([]);
  const [token, setToken]       = useState(selectedDevice?.token || '');
  const [filter, setFilter]     = useState('all');
  const [jobs, setJobs]         = useState([]);
  const [loading, setLoading]   = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    listDevices()
      .then((d) => setDevices(d.devices || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedDevice?.token) setToken(selectedDevice.token);
  }, [selectedDevice]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await getQueue(token, filter);
      setJobs(data.jobs || []);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, filter]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh while jobs are active
  useEffect(() => {
    if (!autoRefresh) return;
    const hasPending = jobs.some((j) => j.status === 'pending' || j.status === 'sending');
    if (!hasPending) return;
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [jobs, autoRefresh, load]);

  const total   = jobs.length;
  const sent    = jobs.filter((j) => j.status === 'sent').length;
  const failed  = jobs.filter((j) => j.status === 'failed').length;
  const pending = jobs.filter((j) => j.status === 'pending' || j.status === 'sending').length;
  const progress = total > 0 ? Math.round((sent / total) * 100) : 0;

  return (
    <div>
      {/* Controls */}
      <div className="card mb-6" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ padding: '16px 22px' }}>
          <div className="flex gap-3 items-center" style={{ flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}>
              <select
                className="form-control"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              >
                <option value="">— Select device —</option>
                {devices.map((d) => (
                  <option key={d.token} value={d.token}>
                    {d.label || 'Unnamed'} ({d.session})
                  </option>
                ))}
              </select>
            </div>

            <div className="tabs">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  className={`tab-btn${filter === s ? ' active' : ''}`}
                  onClick={() => setFilter(s)}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            <button className="btn btn-secondary btn-sm" onClick={load} disabled={!token}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Progress summary */}
      {token && total > 0 && (
        <div className="card mb-6" style={{ marginBottom: 20 }}>
          <div className="card-body">
            <div className="flex gap-4 items-center mb-4" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
              <div className="stat-card" style={{ flex: '1 1 100px', padding: '12px 16px' }}>
                <div className="stat-icon green"><CheckCircle size={18} /></div>
                <div><div className="stat-value" style={{ fontSize: 20 }}>{sent}</div><div className="stat-label">Sent</div></div>
              </div>
              <div className="stat-card" style={{ flex: '1 1 100px', padding: '12px 16px' }}>
                <div className="stat-icon orange"><Clock size={18} /></div>
                <div><div className="stat-value" style={{ fontSize: 20 }}>{pending}</div><div className="stat-label">Pending</div></div>
              </div>
              <div className="stat-card" style={{ flex: '1 1 100px', padding: '12px 16px' }}>
                <div className="stat-icon red"><XCircle size={18} /></div>
                <div><div className="stat-value" style={{ fontSize: 20 }}>{failed}</div><div className="stat-label">Failed</div></div>
              </div>
              <div className="stat-card" style={{ flex: '1 1 100px', padding: '12px 16px' }}>
                <div className="stat-icon blue"><ListOrdered size={18} /></div>
                <div><div className="stat-value" style={{ fontSize: 20 }}>{total}</div><div className="stat-label">Total</div></div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="progress-bar" style={{ flex: 1 }}>
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)', minWidth: 40 }}>{progress}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <ListOrdered size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Queue Jobs
            {total > 0 && <span className="badge pending" style={{ marginLeft: 8 }}>{total}</span>}
          </span>
          {pending > 0 && (
            <span className="flex items-center gap-2 text-sm text-muted">
              <span className="spinner" style={{ width: 14, height: 14 }} />
              Auto-refreshing…
            </span>
          )}
        </div>

        {!token ? (
          <div className="empty-state"><ListOrdered size={40} /><p>Select a device to view its queue.</p></div>
        ) : loading && jobs.length === 0 ? (
          <div className="empty-state"><div className="spinner spinner-lg" /></div>
        ) : jobs.length === 0 ? (
          <div className="empty-state"><ListOrdered size={40} /><p>No jobs found for this filter.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Attempts</th>
                  <th>Queued At</th>
                  <th>Processed</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id}>
                    <td className="mono">{job.number}</td>
                    <td style={{ maxWidth: 220 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {job.message}
                      </span>
                      {job.error && (
                        <span style={{ fontSize: 11, color: 'var(--red)', display: 'block', marginTop: 2 }}>
                          ⚠ {job.error}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <JobStatusIcon status={job.status} />
                        <StatusBadge status={job.status} />
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>{job.attempts}</td>
                    <td className="text-muted text-sm">
                      {job.enqueuedAt ? new Date(job.enqueuedAt).toLocaleTimeString() : '—'}
                    </td>
                    <td className="text-muted text-sm">
                      {job.processedAt ? new Date(job.processedAt).toLocaleTimeString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
