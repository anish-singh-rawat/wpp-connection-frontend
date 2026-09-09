import { useState, useEffect } from 'react';
import {
  Key, RefreshCw, AlertCircle, Copy, Eye, EyeOff, Power,
  ShieldCheck, Search, CheckCircle, XCircle, Smartphone, Check,
} from 'lucide-react';
import {
  getMyTokenInfo, generateMyToken, regenerateMyToken, enableMyToken, disableMyToken,
  listAllTokens, getTokenInfoFor, generateTokenFor, regenerateTokenFor, enableTokenFor, disableTokenFor,
  listDevices,
} from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

// ── CUSTOMER view ─────────────────────────────────────────────────────────────
function CustomerTokenView() {
  const [info, setInfo]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [working, setWorking]         = useState(false);
  const [plainToken, setPlainToken]   = useState(null);
  const [showToken, setShowToken]     = useState(false);

  const [devices, setDevices]         = useState([]);
  const [copiedToken, setCopiedToken] = useState(null);

  const loadInfo = async () => {
    setLoading(true);
    try {
      const [res, devRes] = await Promise.allSettled([getMyTokenInfo(), listDevices()]);
      if (res.status === 'fulfilled') setInfo(res.value.data);
      else toast.error(res.reason?.message || 'Failed to load token info');

      if (devRes.status === 'fulfilled') setDevices(devRes.value.devices || devRes.value.data?.devices || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyDeviceToken = (token) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    toast.success('Device Token copied!');
    setTimeout(() => setCopiedToken(null), 2000);
  };

  useEffect(() => { loadInfo(); }, []);

  const handleGenerate = async () => {
    if (info?.hasToken) {
      if (!confirm('Regenerate token? Your current token stops working immediately.')) return;
    }
    setWorking(true);
    try {
      const res = info?.hasToken ? await regenerateMyToken() : await generateMyToken();
      setPlainToken(res.data.apiToken);
      setShowToken(true);
      toast.success(info?.hasToken ? 'Token regenerated!' : 'Token generated!');
      loadInfo();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setWorking(false);
    }
  };

  const handleToggle = async () => {
    setWorking(true);
    try {
      if (info?.apiTokenStatus === 'enabled') {
        await disableMyToken();
        toast.success('Token disabled.');
      } else {
        await enableMyToken();
        toast.success('Token enabled.');
      }
      loadInfo();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setWorking(false);
    }
  };

  if (loading) return <div className="empty-state"><div className="spinner spinner-lg" /></div>;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {plainToken && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span className="card-title"><Key size={16} style={{ marginRight: 6 }} />Your New API Token</span>
          </div>
          <div className="card-body">
            <div className="alert alert-warning" style={{ marginBottom: 16 }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>Copy this token now — it will <strong>never be shown again.</strong></span>
            </div>
            <div style={{
              background: 'var(--input-bg)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', padding: '12px 14px',
              fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all',
              filter: showToken ? 'none' : 'blur(6px)',
              userSelect: showToken ? 'all' : 'none', transition: 'filter .2s',
            }}>
              {plainToken}
            </div>
            <div className="flex gap-2" style={{ marginTop: 12 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowToken(v => !v)}>
                {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                {showToken ? 'Hide' : 'Reveal'}
              </button>
              <button className="btn btn-primary btn-sm"
                onClick={() => { navigator.clipboard.writeText(plainToken); toast.success('Copied!'); }}>
                <Copy size={14} /> Copy Token
              </button>
              <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }}
                onClick={() => setPlainToken(null)}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <span className="card-title"><Key size={16} style={{ marginRight: 6 }} />API Token Management</span>
          <button className="btn btn-secondary btn-sm" onClick={loadInfo}><RefreshCw size={14} /></button>
        </div>
        <div className="card-body">
          <div style={{
            background: 'var(--input-bg)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', padding: '16px 20px', marginBottom: 20,
          }}>
            <div className="flex items-center" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Token Status</div>
                {info?.hasToken
                  ? <span className={`badge ${info.apiTokenStatus === 'enabled' ? 'sent' : 'failed'}`}>
                      <span className="badge-dot" />
                      {info.apiTokenStatus === 'enabled' ? 'Active' : 'Disabled'}
                    </span>
                  : <span className="badge pending"><span className="badge-dot" />No token yet</span>}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Rate Limit</div>
                <span className="mono" style={{ fontSize: 14 }}>{info?.rateLimit || 100} req/min</span>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Account</div>
                <span style={{ fontSize: 13 }}>{info?.customerEmail}</span>
              </div>
            </div>
          </div>

          <div className="alert alert-info" style={{ marginBottom: 20 }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>How to use</div>
              <div className="text-sm">
                Set header: <code>Authorization: Bearer YOUR_TOKEN</code>
                {' '}or{' '}
                <code>x-api-key: YOUR_TOKEN</code>
              </div>
            </div>
          </div>

          <div className="flex gap-3" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={handleGenerate} disabled={working}>
              {working ? <><span className="spinner" /> Working…</>
                : info?.hasToken ? <><RefreshCw size={15} /> Regenerate Token</>
                : <><Key size={15} /> Generate Token</>}
            </button>
            {info?.hasToken && (
              <button className={`btn ${info.apiTokenStatus === 'enabled' ? 'btn-danger' : 'btn-secondary'}`}
                onClick={handleToggle} disabled={working}>
                <Power size={15} />
                {info.apiTokenStatus === 'enabled' ? 'Disable Token' : 'Enable Token'}
              </button>
            )}
          </div>
          {info?.hasToken && (
            <p className="text-muted text-sm" style={{ marginTop: 12 }}>
              {info.apiTokenStatus === 'enabled'
                ? '✓ External applications can call APIs using this token.'
                : '⚠ Token is disabled. External calls will be rejected.'}
            </p>
          )}
        </div>
      </div>

      {/* ── WhatsApp Device Tokens Section ── */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <span className="card-title">
            <Smartphone size={16} style={{ marginRight: 6 }} />
            WhatsApp Device Tokens
          </span>
          <span className="badge pending">{devices.length} {devices.length === 1 ? 'Device' : 'Devices'}</span>
        </div>
        <div className="card-body">
          <p className="text-muted text-sm" style={{ marginBottom: 16 }}>
            Use this <strong>Device Token</strong> in your API URL path: <code>/devices/{'{deviceToken}'}/send</code> or in your environment variable <code>WHATSAPP_DEVICE_TOKEN</code>.
          </p>

          {devices.length === 0 ? (
            <div style={{
              background: 'var(--input-bg)',
              border: '1px dashed var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '24px 16px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 13,
            }}>
              No devices created yet. Go to <strong>Add Device</strong> to register and scan a WhatsApp QR code.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {devices.map((device) => {
                const isCopied = copiedToken === device.token;
                return (
                  <div
                    key={device.token}
                    style={{
                      background: 'var(--input-bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '14px 16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{device.label || 'Default Device'}</span>
                        <span className={`badge ${device.status === 'connected' ? 'connected' : device.status === 'qr_ready' ? 'qr_ready' : 'disconnected'}`} style={{ fontSize: 11 }}>
                          <span className="badge-dot" />
                          {device.status || 'unknown'}
                        </span>
                      </div>
                      {device.session && (
                        <span className="text-muted text-xs mono" style={{ fontSize: 11 }}>
                          {device.session}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="text"
                        readOnly
                        value={device.token}
                        className="mono"
                        style={{
                          flex: 1,
                          fontSize: 12,
                          padding: '7px 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)',
                          background: 'var(--card-bg)',
                          color: 'var(--text)',
                          outline: 'none',
                        }}
                      />
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => copyDeviceToken(device.token)}
                        title="Copy Device Token"
                        style={{ minWidth: 80, justifyContent: 'center' }}
                      >
                        {isCopied ? (
                          <>
                            <Check size={14} style={{ color: 'var(--green)' }} />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SUPER_ADMIN view ──────────────────────────────────────────────────────────
function AdminTokenView() {
  const [tokens, setTokens]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(null); // customerId being worked on
  const [search, setSearch]   = useState('');
  const [revealed, setRevealed] = useState(null); // { id, token }

  const load = async () => {
    setLoading(true);
    try {
      const res = await listAllTokens();
      setTokens(res.data?.tokens || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleGenerate = async (id, hasToken) => {
    if (hasToken && !confirm('Regenerate this customer\'s token? The old one stops working immediately.')) return;
    setWorking(id);
    try {
      const res = hasToken ? await regenerateTokenFor(id) : await generateTokenFor(id);
      setRevealed({ id, token: res.data.apiToken });
      toast.success(hasToken ? 'Token regenerated!' : 'Token generated!');
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setWorking(null);
    }
  };

  const handleToggle = async (id, currentStatus) => {
    setWorking(id);
    try {
      if (currentStatus === 'enabled') {
        await disableTokenFor(id);
        toast.success('Token disabled.');
      } else {
        await enableTokenFor(id);
        toast.success('Token enabled.');
      }
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setWorking(null);
    }
  };

  const filtered = tokens.filter(t =>
    !search || t.customerEmail?.toLowerCase().includes(search.toLowerCase()) ||
    t.customerName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {revealed && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span className="card-title"><Key size={16} style={{ marginRight: 6 }} />Token Generated</span>
            <button className="btn btn-secondary btn-sm" onClick={() => setRevealed(null)}>Dismiss</button>
          </div>
          <div className="card-body">
            <div className="alert alert-warning" style={{ marginBottom: 12 }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>Share this with the customer now — it won't be shown again.</span>
            </div>
            <div style={{
              background: 'var(--input-bg)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', padding: '12px 14px',
              fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all', userSelect: 'all',
            }}>
              {revealed.token}
            </div>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }}
              onClick={() => { navigator.clipboard.writeText(revealed.token); toast.success('Copied!'); }}>
              <Copy size={13} /> Copy Token
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <Key size={16} style={{ marginRight: 6 }} />
            Customer API Tokens
            <span className="badge pending" style={{ marginLeft: 8 }}>{tokens.length}</span>
          </span>
          <div className="flex gap-2">
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="form-control" style={{ paddingLeft: 32, width: 200 }}
                placeholder="Search customers…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <button className="btn btn-secondary btn-sm" onClick={load}><RefreshCw size={14} /></button>
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><div className="spinner spinner-lg" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><Key size={40} /><p>No customers found.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Email</th>
                  <th>Account</th>
                  <th>Token Status</th>
                  <th>Rate Limit</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.customerId}>
                    <td style={{ fontWeight: 600 }}>{t.customerName}</td>
                    <td className="text-muted" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.customerEmail}</td>
                    <td>
                      <span className={`badge ${t.status === 'active' ? 'sent' : 'failed'}`}>
                        <span className="badge-dot" />{t.status}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${t.apiTokenStatus === 'enabled' ? 'sent' : t.apiTokenStatus === 'disabled' ? 'failed' : 'pending'}`}>
                        <span className="badge-dot" />
                        {t.apiTokenStatus || 'No token'}
                      </span>
                    </td>
                    <td className="mono">{t.rateLimit}/min</td>
                    <td>
                      <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={working === t.customerId}
                          onClick={() => handleGenerate(t.customerId, !!t.apiTokenStatus && t.apiTokenStatus !== 'No token')}
                          title={t.apiTokenStatus ? 'Regenerate Token' : 'Generate Token'}
                        >
                          {working === t.customerId
                            ? <span className="spinner" style={{ width: 13, height: 13 }} />
                            : <><Key size={13} /> {t.apiTokenStatus ? 'Regen' : 'Generate'}</>}
                        </button>
                        {t.apiTokenStatus && (
                          <button
                            className={`btn btn-sm ${t.apiTokenStatus === 'enabled' ? 'btn-danger' : 'btn-secondary'}`}
                            disabled={working === t.customerId}
                            onClick={() => handleToggle(t.customerId, t.apiTokenStatus)}
                            title={t.apiTokenStatus === 'enabled' ? 'Disable' : 'Enable'}
                          >
                            {t.apiTokenStatus === 'enabled' ? <XCircle size={13} /> : <CheckCircle size={13} />}
                          </button>
                        )}
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

// ── Router ────────────────────────────────────────────────────────────────────
export default function ApiToken() {
  const { role } = useAuth();

  if (role === 'SUPER_ADMIN') return <AdminTokenView />;
  return <CustomerTokenView />;
}
