import { useState, useEffect } from 'react';
import { Key, RefreshCw, AlertCircle, CheckCircle, Copy, Eye, EyeOff, Power } from 'lucide-react';
import {
  getMyTokenInfo, generateMyToken, regenerateMyToken,
  enableMyToken, disableMyToken,
} from '../api';
import toast from 'react-hot-toast';

export default function ApiToken() {
  const [info, setInfo]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [working, setWorking]     = useState(false);
  const [plainToken, setPlainToken] = useState(null);
  const [showToken, setShowToken] = useState(false);

  const loadInfo = async () => {
    setLoading(true);
    try {
      const res = await getMyTokenInfo();
      setInfo(res.data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadInfo(); }, []);

  const handleGenerate = async () => {
    if (info?.hasToken) {
      if (!confirm('Regenerate token? Your existing token will stop working immediately.')) return;
      setWorking(true);
      try {
        const res = await regenerateMyToken();
        setPlainToken(res.data.apiToken);
        setShowToken(true);
        toast.success('Token regenerated!');
        loadInfo();
      } catch (err) {
        toast.error(err.message);
      } finally {
        setWorking(false);
      }
    } else {
      setWorking(true);
      try {
        const res = await generateMyToken();
        setPlainToken(res.data.apiToken);
        setShowToken(true);
        toast.success('Token generated!');
        loadInfo();
      } catch (err) {
        toast.error(err.message);
      } finally {
        setWorking(false);
      }
    }
  };

  const handleToggleStatus = async () => {
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

  if (loading) {
    return <div className="empty-state"><div className="spinner spinner-lg" /></div>;
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {/* Token reveal card */}
      {plainToken && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span className="card-title"><Key size={16} style={{ marginRight: 6 }} />Your API Token</span>
          </div>
          <div className="card-body">
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
              filter: showToken ? 'none' : 'blur(6px)',
              userSelect: showToken ? 'all' : 'none',
              transition: 'filter .2s',
            }}>
              {plainToken}
            </div>

            <div className="flex gap-2" style={{ marginTop: 12 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowToken((v) => !v)}>
                {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                {showToken ? 'Hide' : 'Reveal'}
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => { navigator.clipboard.writeText(plainToken); toast.success('Copied!'); }}
              >
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

      {/* Token info card */}
      <div className="card">
        <div className="card-header">
          <span className="card-title"><Key size={16} style={{ marginRight: 6 }} />API Token Management</span>
          <button className="btn btn-secondary btn-sm" onClick={loadInfo} disabled={loading}>
            <RefreshCw size={14} />
          </button>
        </div>
        <div className="card-body">
          {/* Status summary */}
          <div style={{
            background: 'var(--input-bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '16px 20px',
            marginBottom: 20,
          }}>
            <div className="flex items-center" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Token Status</div>
                {info?.hasToken ? (
                  <span className={`badge ${info.apiTokenStatus === 'enabled' ? 'sent' : 'failed'}`}>
                    <span className="badge-dot" />
                    {info.apiTokenStatus === 'enabled' ? 'Active' : 'Disabled'}
                  </span>
                ) : (
                  <span className="badge pending"><span className="badge-dot" />No token yet</span>
                )}
              </div>

              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Rate Limit</div>
                <span className="mono" style={{ fontSize: 14 }}>{info?.rateLimit || 100} req/min</span>
              </div>

              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Customer</div>
                <span style={{ fontSize: 13 }}>{info?.customerEmail}</span>
              </div>
            </div>
          </div>

          {/* Usage instructions */}
          <div className="alert alert-info" style={{ marginBottom: 20 }}>
            <AlertCircle size={16} />
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>How to use your API token</div>
              <div className="text-sm">
                Include it in requests as <code>Authorization: Bearer YOUR_TOKEN</code> or
                {' '}<code>x-api-key: YOUR_TOKEN</code> header.
              </div>
              <div className="text-sm" style={{ marginTop: 6 }}>
                Example: <code>POST /devices/:token/send</code>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3" style={{ flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={handleGenerate}
              disabled={working}
            >
              {working
                ? <><span className="spinner" /> Processing…</>
                : info?.hasToken
                  ? <><RefreshCw size={15} /> Regenerate Token</>
                  : <><Key size={15} /> Generate Token</>}
            </button>

            {info?.hasToken && (
              <button
                className={`btn ${info.apiTokenStatus === 'enabled' ? 'btn-danger' : 'btn-secondary'}`}
                onClick={handleToggleStatus}
                disabled={working}
              >
                <Power size={15} />
                {info.apiTokenStatus === 'enabled' ? 'Disable Token' : 'Enable Token'}
              </button>
            )}
          </div>

          {info?.hasToken && (
            <p className="text-muted text-sm" style={{ marginTop: 12 }}>
              {info.apiTokenStatus === 'enabled'
                ? '✓ External applications can currently use this token to call APIs.'
                : '⚠ Token is disabled. External API calls will be rejected.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
