import { useState } from 'react';
import { UserCircle, Lock, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { updateProfile, changePassword } from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, login, token } = useAuth();

  const [name, setName]             = useState(user?.name || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [pwForm, setPwForm]         = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [savingPw, setSavingPw]     = useState(false);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile(name);
      login({ token, refreshToken: localStorage.getItem('wpp_refresh'), user: { ...user, name } });
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) {
      toast.error('New passwords do not match.');
      return;
    }
    if (pwForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    setSavingPw(true);
    try {
      await changePassword(pwForm.currentPassword, pwForm.newPassword);
      toast.success('Password changed!');
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingPw(false);
    }
  };

  const roleColors = {
    SUPER_ADMIN:  { bg: 'rgba(139,92,246,.12)', color: '#7c3aed', label: 'Super Admin' },
    CUSTOMER:     { bg: 'rgba(37,211,102,.12)', color: '#0a7a3e', label: 'Customer' },
    SUB_CUSTOMER: { bg: 'rgba(59,130,246,.12)', color: '#1d4ed8', label: 'Sub Customer' },
  }[user?.role] || {};

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      {/* Profile info card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">
            <UserCircle size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Profile
          </span>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
            background: roleColors.bg, color: roleColors.color,
          }}>
            {roleColors.label}
          </span>
        </div>
        <div className="card-body">
          <div className="form-group" style={{ marginBottom: 8 }}>
            <label className="form-label">Email</label>
            <input className="form-control" value={user?.email || ''} disabled
              style={{ opacity: .7, cursor: 'not-allowed' }} />
            <div className="form-hint">Email cannot be changed.</div>
          </div>

          <form onSubmit={handleProfileSave}>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-control" value={name}
                onChange={(e) => setName(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary" disabled={savingProfile}>
              {savingProfile
                ? <><span className="spinner" /> Saving…</>
                : <><Save size={14} /> Save Profile</>}
            </button>
          </form>
        </div>
      </div>

      {/* Change password card */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <Lock size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Change Password
          </span>
        </div>
        <div className="card-body">
          <form onSubmit={handlePasswordSave}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input className="form-control" type="password"
                value={pwForm.currentPassword}
                onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                required autoComplete="current-password" />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input className="form-control" type="password"
                value={pwForm.newPassword}
                onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                required minLength={6} autoComplete="new-password" />
              <div className="form-hint">Minimum 6 characters.</div>
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input className="form-control" type="password"
                value={pwForm.confirm}
                onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                required minLength={6} autoComplete="new-password" />
            </div>
            <button type="submit" className="btn btn-primary" disabled={savingPw}>
              {savingPw
                ? <><span className="spinner" /> Changing…</>
                : <><Lock size={14} /> Change Password</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
