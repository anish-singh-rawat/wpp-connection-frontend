import { useState, useEffect, useCallback } from 'react';
import { UserCog, Plus, Search, RefreshCw, Edit2, Trash2, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import {
  listSubCustomers, createSubCustomer, updateSubCustomer,
  deleteSubCustomer, suspendSubCustomer, activateSubCustomer,
  resetSubCustomerPassword,
} from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

function CreateModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createSubCustomer(form);
      toast.success('Sub-customer created!');
      onCreated();
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
          <span className="modal-title">Create Sub-Customer</span>
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
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><span className="spinner" /> Creating…</> : 'Create Sub-Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditModal({ subCustomer, onClose, onUpdated }) {
  const [name, setName]   = useState(subCustomer.name);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSubCustomer(subCustomer._id, { name });
      toast.success('Sub-customer updated!');
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
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <span className="modal-title">Edit Sub-Customer</span>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-control" value={name}
                onChange={(e) => setName(e.target.value)} required />
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

function ResetPasswordModal({ subCustomer, onClose }) {
  const [password, setPassword] = useState('');
  const [saving, setSaving]     = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await resetSubCustomerPassword(subCustomer._id, password);
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
          <span className="modal-title">Reset Password — {subCustomer.name}</span>
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

export default function SubCustomers() {
  const { role } = useAuth();
  const isCustomer = role === 'CUSTOMER';

  const [subCustomers, setSubCustomers] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [showCreate, setShowCreate]     = useState(false);
  const [editTarget, setEditTarget]     = useState(null);
  const [resetTarget, setResetTarget]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = search ? `search=${encodeURIComponent(search)}` : '';
      const res = await listSubCustomers(params);
      setSubCustomers(res.data?.subCustomers || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const handleToggleStatus = async (sc) => {
    try {
      if (sc.status === 'suspended') {
        await activateSubCustomer(sc._id);
        toast.success(`${sc.name} activated.`);
      } else {
        await suspendSubCustomer(sc._id);
        toast.success(`${sc.name} suspended.`);
      }
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (sc) => {
    if (!confirm(`Delete sub-customer "${sc.name}"?`)) return;
    try {
      await deleteSubCustomer(sc._id);
      toast.success(`${sc.name} deleted.`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      {isCustomer && showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={load} />}
      {isCustomer && editTarget  && <EditModal subCustomer={editTarget} onClose={() => setEditTarget(null)} onUpdated={load} />}
      {isCustomer && resetTarget && <ResetPasswordModal subCustomer={resetTarget} onClose={() => setResetTarget(null)} />}

      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <UserCog size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Sub Customers
            <span className="badge pending" style={{ marginLeft: 8 }}>{subCustomers.length}</span>
          </span>
          <div className="flex gap-2">
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="form-control" style={{ paddingLeft: 32, width: 200 }}
                placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <button className="btn btn-secondary btn-sm" onClick={load}><RefreshCw size={14} /></button>
            {isCustomer && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
                <Plus size={14} /> Add Sub-Customer
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><div className="spinner spinner-lg" /></div>
        ) : subCustomers.length === 0 ? (
          <div className="empty-state">
            <UserCog size={40} />
            <p>No sub-customers yet.</p>
            {isCustomer && (
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                <Plus size={14} /> Add First Sub-Customer
              </button>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Created</th>
                  {isCustomer && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {subCustomers.map((sc) => (
                  <tr key={sc._id}>
                    <td style={{ fontWeight: 600 }}>{sc.name}</td>
                    <td className="text-muted">{sc.email}</td>
                    <td>
                      <span className={`badge ${sc.status === 'active' ? 'sent' : 'failed'}`}>
                        <span className="badge-dot" />
                        {sc.status}
                      </span>
                    </td>
                    <td className="text-muted text-sm">{new Date(sc.createdAt).toLocaleDateString()}</td>
                    {isCustomer && (
                      <td>
                        <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                          <button className="btn btn-secondary btn-sm btn-icon" title="Edit" onClick={() => setEditTarget(sc)}><Edit2 size={13} /></button>
                          <button className="btn btn-secondary btn-sm btn-icon" title="Reset Password" onClick={() => setResetTarget(sc)}><RotateCcw size={13} /></button>
                          <button className={`btn btn-sm btn-icon ${sc.status === 'active' ? 'btn-danger' : 'btn-secondary'}`}
                            title={sc.status === 'active' ? 'Suspend' : 'Activate'}
                            onClick={() => handleToggleStatus(sc)}>
                            {sc.status === 'active' ? <XCircle size={13} /> : <CheckCircle size={13} />}
                          </button>
                          <button className="btn btn-danger btn-sm btn-icon" title="Delete" onClick={() => handleDelete(sc)}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    )}
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
