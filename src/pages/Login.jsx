import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  MessageSquare, LogIn, Eye, EyeOff, AlertCircle,
  Zap, Shield, Users, BarChart2,
} from 'lucide-react';
import { loginApi } from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const FEATURES = [
  {
    icon: <Zap size={18} color="#25d366" />,
    title: 'Instant Messaging',
    desc:  'Send single, bulk, and CSV-based messages in seconds.',
  },
  {
    icon: <Shield size={18} color="#25d366" />,
    title: 'Enterprise Security',
    desc:  'Multi-tenant RBAC with API token authentication.',
  },
  {
    icon: <Users size={18} color="#25d366" />,
    title: 'Multi-Tenant Ready',
    desc:  'Manage Customers and Sub-Customers from one dashboard.',
  },
  {
    icon: <BarChart2 size={18} color="#25d366" />,
    title: 'Live Queue Monitor',
    desc:  'Track every message job with real-time status updates.',
  },
];

export default function Login() {
  const { login, isAuthenticated, role } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  if (isAuthenticated) {
    if (role === 'SUPER_ADMIN')  return <Navigate to="/admin"        replace />;
    if (role === 'SUB_CUSTOMER') return <Navigate to="/sub-customer" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return;
    }

    setLoading(true);
    try {
      const res = await loginApi(email.trim(), password);
      if (res.success) {
        login(res.data);
        toast.success(`Welcome back, ${res.data.user.name}!`);
        const r = res.data.user.role;
        if (r === 'SUPER_ADMIN')   navigate('/admin',        { replace: true });
        else if (r === 'SUB_CUSTOMER') navigate('/sub-customer', { replace: true });
        else                       navigate('/dashboard',    { replace: true });
      } else {
        setError(res.error || 'Login failed.');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
      {/* ── Left panel — branding + feature list ── */}
      <div className="login-panel-left">
        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 480 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 48 }}>
            <div style={{
              width: 52, height: 52,
              background: 'linear-gradient(135deg, #25d366, #128c7e)',
              borderRadius: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(37,211,102,.35)',
            }}>
              <MessageSquare size={26} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-.3px' }}>
                WPPConnect
              </div>
              <div style={{ fontSize: 12, color: '#8696a0', marginTop: 1 }}>
                WhatsApp Business Platform
              </div>
            </div>
          </div>

          <h2 style={{
            fontSize: 32, fontWeight: 800, color: '#fff',
            lineHeight: 1.25, marginBottom: 12, letterSpacing: '-.5px',
          }}>
            The all-in-one<br />
            <span style={{ color: '#25d366' }}>WhatsApp API</span> platform
          </h2>
          <p style={{ fontSize: 15, color: '#8696a0', lineHeight: 1.7, marginBottom: 48 }}>
            Connect devices, automate messages, and manage your entire WhatsApp
            operation from a single secure dashboard.
          </p>

          {/* Feature list */}
          <div>
            {FEATURES.map((f) => (
              <div className="login-feature" key={f.title}>
                <div className="login-feature-icon">{f.icon}</div>
                <div className="login-feature-text">
                  <strong>{f.title}</strong>
                  <span>{f.desc}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom decoration */}
          <div style={{
            marginTop: 52,
            padding: '14px 20px',
            background: 'rgba(255,255,255,.04)',
            border: '1px solid rgba(255,255,255,.08)',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#25d366',
              boxShadow: '0 0 8px #25d366',
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 13, color: '#8696a0' }}>
              Trusted by businesses worldwide for reliable WhatsApp automation.
            </span>
          </div>
        </div>
      </div>

      {/* ── Right panel — login form ── */}
      <div className="login-panel-right">
        <div style={{ width: '100%', maxWidth: 380 }}>
          {/* Mobile logo (hidden on desktop via CSS left panel) */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{
              width: 52, height: 52,
              background: 'linear-gradient(135deg, #25d366, #128c7e)',
              borderRadius: 16,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(37,211,102,.25)',
              marginBottom: 16,
            }}>
              <MessageSquare size={26} color="#fff" />
            </div>
            <h1 style={{
              fontSize: 26, fontWeight: 800, color: 'var(--text)',
              letterSpacing: '-.4px', marginBottom: 6,
            }}>
              Sign in
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              Enter your credentials to access your dashboard
            </p>
          </div>

          {/* Error alert */}
          {error && (
            <div className="alert alert-error" style={{ marginBottom: 24 }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: 13 }}>Email address</label>
              <input
                className="form-control"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                required
                style={{ fontSize: 14, padding: '11px 14px' }}
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="form-label" style={{ fontSize: 13, margin: 0 }}>Password</label>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-control"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  style={{ fontSize: 14, padding: '11px 44px 11px 14px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  tabIndex={-1}
                  style={{
                    position: 'absolute', right: 12, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none',
                    color: 'var(--text-muted)', cursor: 'pointer',
                    padding: 4, display: 'flex', alignItems: 'center',
                  }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              className="btn btn-primary w-full"
              type="submit"
              disabled={loading}
              style={{
                marginTop: 8,
                padding: '13px 24px',
                fontSize: 15,
                fontWeight: 700,
                borderRadius: 10,
                background: loading ? 'var(--green-dark)' : 'linear-gradient(135deg, #25d366, #128c7e)',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(37,211,102,.35)',
                transition: 'all .2s',
                justifyContent: 'center',
              }}
            >
              {loading
                ? <><span className="spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,.3)' }} /> Signing in…</>
                : <><LogIn size={17} /> Sign In</>}
            </button>
          </form>

          {/* Divider */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            margin: '28px 0 20px',
          }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Secure access</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          {/* Help text */}
          <div style={{
            padding: '14px 16px',
            background: 'var(--input-bg)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            textAlign: 'center',
          }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Don't have an account?{' '}
              <span style={{ color: 'var(--green-dark)', fontWeight: 600 }}>
                Contact your administrator
              </span>{' '}
              to get access.
            </p>
          </div>

          {/* Version */}
          <p style={{
            textAlign: 'center', marginTop: 28,
            fontSize: 11, color: 'var(--text-muted)', opacity: .6,
          }}>
            WPPConnect · Multi-Tenant WhatsApp Platform
          </p>
        </div>
      </div>
    </div>
  );
}
