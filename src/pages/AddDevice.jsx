import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { CheckCircle, Smartphone, QrCode, Wifi, RefreshCw, AlertTriangle } from 'lucide-react';
import { createDevice, getQRImageUrl } from '../api';
import socket from '../socket';
import toast from 'react-hot-toast';

const STEPS = ['Create', 'Scan QR', 'Connected'];
const REDIRECT_DELAY = 4; // seconds before auto-navigating to /send

function waitingLabel(status) {
  if (!status || status === 'launching') return 'Starting WhatsApp session…';
  if (status.startsWith('loading')) return `Loading WhatsApp Web… (${status.match(/\d+/)?.[0] ?? ''}%)`;
  if (status === 'qr_pending') return 'Generating QR code…';
  if (status === 'qr_ready')   return 'QR code ready — loading…';
  if (status === 'retrying')   return 'Retrying…';
  return 'Please wait…';
}

export default function AddDevice() {
  const navigate = useNavigate();
  const { token: routeToken } = useParams();
  const location = useLocation();
  const prefill = location.state?.device || null;

  // Determine initial stage from the device status we already know about.
  // If the backend already says qr_ready, jump straight to 'qr' — don't show the spinner.
  const [stage, setStage] = useState(() => {
    if (prefill?.status === 'connected') return 'connected';
    if (prefill?.status === 'qr_ready')  return 'qr';   // ← show QR immediately
    if (prefill || routeToken)           return 'waiting';
    return 'idle';
  });

  const [label, setLabel]             = useState('');
  const [device, setDevice]           = useState(prefill || null);
  // If we already know the QR image URL (prefill with qr_ready), seed it right away.
  const [qrSrc, setQrSrc]             = useState(
    prefill?.status === 'qr_ready' ? `${getQRImageUrl(prefill.token)}?t=${Date.now()}` : ''
  );
  const [waitStatus, setWaitStatus]   = useState('launching');
  const [activeToken, setActiveToken] = useState(prefill?.token || routeToken || null);
  const [redirectIn, setRedirectIn]   = useState(REDIRECT_DELAY);

  const redirectTimerRef = useRef(null);
  const stageRef         = useRef(stage);
  // True once the backend has sent at least one QR to this client.
  // Guards against the premature device:connected that fires on session launch.
  const qrWasShownRef = useRef(stage === 'qr'); // already true if we seeded from prefill

  useEffect(() => { stageRef.current = stage; }, [stage]);

  // ── Auto-redirect countdown after connection ───────────────────────────────

  function startRedirectCountdown(dev) {
    clearInterval(redirectTimerRef.current);
    setRedirectIn(REDIRECT_DELAY);
    redirectTimerRef.current = setInterval(() => {
      setRedirectIn((t) => {
        if (t <= 1) {
          clearInterval(redirectTimerRef.current);
          redirectTimerRef.current = null;
          navigate('/send', { state: { device: dev } }); // ← go to /send, not dashboard
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  // ── Show QR ────────────────────────────────────────────────────────────────

  const showQR = useCallback((qrDataUri) => {
    qrWasShownRef.current = true;
    setQrSrc(qrDataUri);
    setStage('qr');
  }, []);

  // ── Socket.IO listeners ────────────────────────────────────────────────────

  useEffect(() => {
    if (!activeToken) return;

    socket.emit('join:device', activeToken);

    // device:qr — backend sends the raw base64 QR data URI
    const onDeviceQR = ({ token, qr }) => {
      if (token !== activeToken) return;
      if (stageRef.current === 'connected') return;
      console.log('[Socket] device:qr | stage:', stageRef.current);
      showQR(qr);
    };

    // device:status — covers all status transitions
    const onDeviceStatus = ({ token, status }) => {
      if (token !== activeToken) return;
      if (stageRef.current === 'connected') return;

      console.log('[Socket] device:status →', status, '| stage:', stageRef.current, '| qrShown:', qrWasShownRef.current);

      setWaitStatus(status);

      if (status === 'connected') {
        if (!qrWasShownRef.current) {
          // Backend fires this prematurely on session launch — ignore until QR was shown
          console.warn('[Socket] Ignoring premature connected — QR not yet shown');
          return;
        }
        setStage('connected');
        toast.success(`${device?.label || 'Device'} connected!`);
        startRedirectCountdown(device);
        return;
      }

      if (status === 'retrying') {
        setStage('error');
        return;
      }

      // Backend says QR is ready but we haven't received device:qr yet — fetch image URL
      if (status === 'qr_ready' && stageRef.current !== 'qr') {
        showQR(`${getQRImageUrl(activeToken)}?t=${Date.now()}`);
      }
    };

    // device:connected — explicit connected event
    const onDeviceConnected = ({ token }) => {
      if (token !== activeToken) return;
      if (stageRef.current === 'connected') return;

      console.log('[Socket] device:connected | stage:', stageRef.current, '| qrShown:', qrWasShownRef.current);

      if (!qrWasShownRef.current) {
        console.warn('[Socket] Ignoring premature device:connected — QR not yet shown');
        return;
      }
      setStage('connected');
      toast.success(`${device?.label || 'Device'} connected!`);
      startRedirectCountdown(device);
    };

    socket.on('device:qr',        onDeviceQR);
    socket.on('device:status',    onDeviceStatus);
    socket.on('device:connected', onDeviceConnected);

    return () => {
      socket.emit('leave:device', activeToken);
      socket.off('device:qr',        onDeviceQR);
      socket.off('device:status',    onDeviceStatus);
      socket.off('device:connected', onDeviceConnected);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeToken, showQR]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────

  useEffect(() => {
    return () => { clearInterval(redirectTimerRef.current); };
  }, []);

  // ── Create new device ──────────────────────────────────────────────────────

  async function handleCreate(e) {
    e.preventDefault();
    setStage('creating');
    try {
      const data = await createDevice(label.trim());
      const dev = data.device;
      setDevice(dev);
      window.history.replaceState({ device: dev }, '', `/add-device/${dev.token}`);
      setActiveToken(dev.token);
      setWaitStatus('launching');
      setStage('waiting');
    } catch (err) {
      toast.error(err.message);
      setStage('idle');
    }
  }

  function retry() {
    clearInterval(redirectTimerRef.current);
    qrWasShownRef.current = false;
    setQrSrc('');
    setWaitStatus('launching');
    setStage('idle');
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const stepIndex = (stage === 'idle' || stage === 'creating') ? 0
    : stage === 'connected' ? 2 : 1;

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>

      {/* Step indicator */}
      <div className="steps mb-6">
        {STEPS.map((s, i) => (
          <div key={s} className={`step${stepIndex === i ? ' active' : ''}${stepIndex > i ? ' done' : ''}`}>
            <div className="step-circle">
              {stepIndex > i ? <CheckCircle size={16} /> : i + 1}
            </div>
            <div className="step-label">{s}</div>
          </div>
        ))}
      </div>

      {/* ── idle ─────────────────────────────────────────────────────────── */}
      {stage === 'idle' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <Smartphone size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              New Device
            </span>
          </div>
          <div className="card-body">
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">
                  Device Label <span className="text-muted">(optional)</span>
                </label>
                <input
                  className="form-control"
                  placeholder="e.g. My iPhone, Office Phone"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
                <div className="form-hint">A friendly name to identify this device.</div>
              </div>
              <button className="btn btn-primary btn-lg w-full" type="submit">
                Create Device
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── creating ─────────────────────────────────────────────────────── */}
      {stage === 'creating' && (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div className="spinner spinner-lg" style={{ margin: '0 auto 16px' }} />
            <p className="text-muted">Setting up device…</p>
          </div>
        </div>
      )}

      {/* ── waiting — spinner until QR arrives via socket ────────────────── */}
      {stage === 'waiting' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <QrCode size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Preparing QR Code
            </span>
          </div>
          <div className="card-body" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div className="spinner spinner-lg" style={{ margin: '0 auto 20px' }} />
            <p className="text-muted">{waitingLabel(waitStatus)}</p>
          </div>
        </div>
      )}

      {/* ── qr — show QR, stays until backend sends a new one or connected ─ */}
      {stage === 'qr' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <QrCode size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Scan QR Code
            </span>
            <span className="badge qr_ready">
              <span className="badge-dot" />
              QR Ready
            </span>
          </div>
          <div className="card-body">
            <div className="alert alert-info" style={{ marginBottom: 16 }}>
              <Wifi size={16} style={{ flexShrink: 0 }} />
              <span>
                Open <strong>WhatsApp → Linked Devices → Link a Device</strong> and scan the QR below.
              </span>
            </div>
            <div className="qr-display">
              <img src={qrSrc} alt="Scan with WhatsApp" className="qr-img" />
            </div>
            {/* No countdown — QR stays until backend sends a new one or connected fires */}
            <p className="text-muted text-sm" style={{ textAlign: 'center', marginTop: 14 }}>
              Waiting for scan… The QR will refresh automatically if it expires.
            </p>
          </div>
        </div>
      )}

      {/* ── error ────────────────────────────────────────────────────────── */}
      {stage === 'error' && (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'rgba(239,68,68,.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <AlertTriangle size={36} color="var(--red)" />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Connection Failed</h2>
            <p className="text-muted" style={{ marginBottom: 24 }}>
              Could not connect to WhatsApp. Please try again.
            </p>
            <button className="btn btn-primary" onClick={retry}>
              <RefreshCw size={15} style={{ marginRight: 6 }} /> Retry
            </button>
          </div>
        </div>
      )}

      {/* ── connected ────────────────────────────────────────────────────── */}
      {stage === 'connected' && (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'rgba(37,211,102,.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              animation: 'pulse 1.5s ease-in-out 2',
            }}>
              <CheckCircle size={40} color="var(--green)" />
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
              WhatsApp Connected!
            </h2>
            <p className="text-muted" style={{ marginBottom: 6 }}>
              <strong style={{ color: 'var(--text)' }}>{device?.label || 'Your device'}</strong> is now
              linked and ready to send &amp; receive messages.
            </p>

            <p className="text-muted text-sm" style={{ marginBottom: 16 }}>
              Redirecting to Send Message in{' '}
              <strong style={{ color: 'var(--green)' }}>{redirectIn}s</strong>…
            </p>

            {/* Progress bar */}
            <div style={{
              height: 4, borderRadius: 2,
              background: 'var(--border)',
              overflow: 'hidden',
              maxWidth: 320,
              margin: '0 auto 28px',
            }}>
              <div style={{
                height: '100%',
                borderRadius: 2,
                background: 'var(--green)',
                width: `${((REDIRECT_DELAY - redirectIn) / REDIRECT_DELAY) * 100}%`,
                transition: 'width 1s linear',
              }} />
            </div>

            <div className="flex gap-3" style={{ justifyContent: 'center' }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  clearInterval(redirectTimerRef.current);
                  navigate('/send', { state: { device } });
                }}
              >
                Send Message Now
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  clearInterval(redirectTimerRef.current);
                  navigate('/');
                }}
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
