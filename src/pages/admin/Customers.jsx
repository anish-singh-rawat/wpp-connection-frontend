import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, Plus, Search, RefreshCw, Edit2, Trash2,
  CheckCircle, XCircle, Key, RotateCcw, AlertCircle,
} from 'lucide-react';
import {
  listCustomers, createCustomer, updateCustomer,
  deleteCustomer, suspendCustomer, activateCustomer,
  resetCustomerPassword,
} from '../../api';
import toast from 'react-hot-toast';

function CreateModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', rateLimit: 100 });
  const [saving, setSaving] = useState(false);
  const [apiTokenResult, setApiTokenResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await createCustomer(form);
      if (res.data?.apiToken) setApiTokenResult(res.data.apiToken);
      toast.success('Customer created!');
      onCreated();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (apiTokenResult) {
    return (
      <div className="modal-overlay">
        <div className="modal" style={{ maxWidth: 480 }}>
          <div className="modal-header">
            <span className="modal-title"><Key size={16} style={{ marginRight: 6 }} />API Token Generated</span>
          </div>
          <div className="modal-body">
            <div className="alert alert-warning" style={{ marginBottom: 16 }}>
              <AlertCircle size={16} />
              <span>Copy this token now. It will <strong>never be shown again.</strong></span>
            </div>
            <div style={{
              background: 'var(--input-bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 14px',
              fontFamily: 'monospace',
              fontSize: 12,
              wordBreak: 'break-all',
              userSelect: 'all',
            }}>
              {apiTokenResult}
            </div>
            <button
              className="btn btn-primary w-full"
              style={{ marginTop: 14 }}
              onClick={() => { navigator.clipboard.writeText(apiTokenResult); toast.success('Copied!'); }}
            >
              Copy Token
            </button>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Create Customer</span>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {['name', 'email', 'password'].map((f) => (
              <div className="form-group" key={f}>
                <label className="form-label">{f.charAt(0).toUpperCase() + f.slice(1)}</label>
                <input
                  className="form-control"
                  type={f === 'password' ? 'password' : f === 'email' ? 'email' : 'text'}
                  value={form[f]}
                  onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                  required
                />
              </div>
            ))}
            <div className="form-group">
              <label className="form-label">Rate Limit (req/min)</label>
              <input
                className="form-control"
                type="number"
                min="1"
                max="1000"
                value={form.rateLimit}
                onChange={(e) => setForm({ ...form, rateLimit: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><span className="spinner" /> Creating…</> : 'Create Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditModal({ customer, onClose, onUpdated }) {
  const [form, setForm] = useState({ name: customer.name, rateLimit: customer.rateLimit || 100 });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateCustomer(customer._id, form);
      toast.success('Customer updated!');
      onUpdated();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Edit Customer</span>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Rate Limit (req/min)</label>
              <input className="form-control" type="number" min="1" max="1000" value={form.rateLimit}
                onChange={(e) => setForm({ ...form, rateLimit: Number(e.target.value) })} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><span className="spinner" /> Saving…</> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResetPasswordModal({ customer, onClose }) {
  const [password, setPassword] = useState('');
  const [saving, setSaving]     = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await resetCustomerPassword(customer._id, password);
      toast.success('Password reset!');
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <span className="modal-title">Reset Password — {customer.name}</span>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input className="form-control" type="password" value={password}
                onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-danger" disabled={saving}>
              {saving ? <><span className="spinner" /> Resetting…</> : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


export default function Customers() {
  const [customers, setCustomers]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = search ? `search=${encodeURIComponent(search)}` : '';
      const res = await listCustomers(params);
      setCustomers(res.data?.customers || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const handleToggleStatus = async (c) => {
    try {
      if (c.status === 'suspended') {
        await activateCustomer(c._id);
        toast.success(`${c.name} activated.`);
      } else {
        await suspendCustomer(c._id);
        toast.success(`${c.name} suspended.`);
      }
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (c) => {
    if (!confirm(`Delete customer "${c.name}"? This cannot be undone.`)) return;
    try {
      await deleteCustomer(c._id);
      toast.success(`${c.name} deleted.`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onCreated={load} />
      )}
      {editTarget && (
        <EditModal customer={editTarget} onClose={() => setEditTarget(null)} onUpdated={load} />
      )}
      {resetTarget && (
        <ResetPasswordModal customer={resetTarget} onClose={() => setResetTarget(null)} />
      )}

      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <ShieldCheck size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Customers
            <span className="badge pending" style={{ marginLeft: 8 }}>{customers.length}</span>
          </span>
          <div className="flex gap-2">
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-control"
                style={{ paddingLeft: 32, width: 200 }}
                placeholder="Search customers…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="btn btn-secondary btn-sm" onClick={load}>
              <RefreshCw size={14} />
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
              <Plus size={14} /> Add Customer
            </button>
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><div className="spinner spinner-lg" /></div>
        ) : customers.length === 0 ? (
          <div className="empty-state">
            <ShieldCheck size={40} />
            <p>No customers found.</p>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <Plus size={14} /> Add First Customer
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>API Token</th>
                  <th>Rate Limit</th>
                  <th>Created</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c._id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td className="text-muted">{c.email}</td>
                    <td>
                      <span className={`badge ${c.status === 'active' ? 'sent' : 'failed'}`}>
                        <span className="badge-dot" />
                        {c.status}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${c.apiTokenStatus === 'enabled' ? 'sent' : 'pending'}`}>
                        {c.apiTokenStatus || '—'}
                      </span>
                    </td>
                    <td className="mono">{c.rateLimit}/min</td>
                    <td className="text-muted text-sm">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary btn-sm btn-icon" title="Edit"
                          onClick={() => setEditTarget(c)}>
                          <Edit2 size={13} />
                        </button>
                        <button className="btn btn-secondary btn-sm btn-icon" title="Reset Password"
                          onClick={() => setResetTarget(c)}>
                          <RotateCcw size={13} />
                        </button>
                        <button
                          className={`btn btn-sm btn-icon ${c.status === 'active' ? 'btn-danger' : 'btn-secondary'}`}
                          title={c.status === 'active' ? 'Suspend' : 'Activate'}
                          onClick={() => handleToggleStatus(c)}
                        >
                          {c.status === 'active' ? <XCircle size={13} /> : <CheckCircle size={13} />}
                        </button>
                        <button className="btn btn-danger btn-sm btn-icon" title="Delete"
                          onClick={() => handleDelete(c)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
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
