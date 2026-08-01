import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { CheckCircle, Smartphone, QrCode, Wifi, RefreshCw, AlertTriangle } from 'lucide-react';
import { createDevice, getQRStatus, BASE_URL } from '../api';
import { useRolePath } from '../hooks/useRolePath';
import socket from '../socket';
import toast from 'react-hot-toast';

const STEPS = ['Create', 'Scan QR', 'Connected'];

function waitingLabel(status) {
  if (!status || status === 'launching') return 'Starting WhatsApp session…';
  if (status.startsWith('loading')) return `Loading WhatsApp Web… (${status.match(/\d+/)?.[0] ?? ''}%)`;
  if (status === 'qr_pending') return 'Generating QR code…';
  if (status === 'qr_ready')   return 'QR code ready — loading…';
  if (status === 'retrying')   return 'Retrying…';
  return 'Please wait…';
}

async function fetchQRAsDataUrl(token) {
  const jwt = localStorage.getItem('wpp_jwt') || '';
  const url = `${BASE_URL}/devices/${token}/qrcode/image${jwt ? `?token=${encodeURIComponent(jwt)}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

export default function AddDevice() {
  const navigate  = useNavigate();
  const rolePath  = useRolePath();
  const { token: routeToken } = useParams();
  const location  = useLocation();
  const prefill = location.state?.device || null;

  const [stage, setStage] = useState(() => {
    if (prefill?.status === 'connected') return 'connected';
    if (prefill?.status === 'qr_ready')  return 'qr';
    if (prefill || routeToken)           return 'waiting';
    return 'idle';
  });

  const [label, setLabel]             = useState('');
  const [device, setDevice]           = useState(prefill || null);
  const [qrSrc, setQrSrc]             = useState('');
  const [waitStatus, setWaitStatus]   = useState('launching');
  const [activeToken, setActiveToken] = useState(prefill?.token || routeToken || null);

  const stageRef      = useRef(stage);
  const qrWasShownRef = useRef(stage === 'qr');

  useEffect(() => { stageRef.current = stage; }, [stage]);


  const showQR = useCallback((qrDataUri) => {
    qrWasShownRef.current = true;
    setQrSrc(qrDataUri);
    setStage('qr');
  }, []);

  const syncStatus = useCallback(async (tok) => {
    if (!tok) return;
    if (stageRef.current === 'connected' || stageRef.current === 'scanning') return;
    try {
      const data = await getQRStatus(tok);
      if (data.status === 'connected' || data.isReady) {
        setStage('connected');
        navigate(rolePath('/send'), { state: { device } });
        return;
      }
      if ((data.status === 'qr_ready' || data.hasQR) && stageRef.current !== 'qr') {
        const dataUrl = await fetchQRAsDataUrl(tok);
        if (dataUrl) showQR(dataUrl);
        return;
      }
      if (stageRef.current === 'waiting') {
        setWaitStatus(data.status || 'launching');
      }
    } catch (_) {}
  }, [showQR]);


  useEffect(() => {
    if (!activeToken) return;

    socket.emit('join:device', activeToken);
    syncStatus(activeToken);

    const onDeviceQR = ({ token, qr }) => {
      if (token !== activeToken) return;
      if (stageRef.current === 'connected') return;
      console.log('[Socket] device:qr | stage:', stageRef.current);
      showQR(qr);
    };

    const onDeviceStatus = ({ token, status }) => {
      if (token !== activeToken) return;
      if (stageRef.current === 'connected') return;

      setWaitStatus(status);

      if (status === 'connecting' && qrWasShownRef.current) {
        setStage('scanning');
        return;
      }

      if (status === 'connected') {
        setStage('connected');
        toast.success(`${device?.label || 'Device'} connected!`);
        navigate(rolePath('/send'), { state: { device } });
        return;
      }

      if (status === 'retrying') {
        setStage('error');
        return;
      }

      if (status.startsWith('loading') && qrWasShownRef.current && stageRef.current === 'qr') {
        setStage('scanning');
        return;
      }

      if (status === 'qr_ready' && stageRef.current !== 'qr') {
        fetchQRAsDataUrl(activeToken).then((dataUrl) => {
          if (dataUrl) showQR(dataUrl);
        });
      }
    };

    const onDeviceConnected = ({ token }) => {
      if (token !== activeToken) return;
      if (stageRef.current === 'connected') return;
      setStage('connected');
      toast.success(`${device?.label || 'Device'} connected!`);
      navigate(rolePath('/send'), { state: { device } });
    };

    const onReconnect = () => {
      console.log('[Socket] Reconnected — re-joining room and syncing status');
      socket.emit('join:device', activeToken);
      syncStatus(activeToken);
    };

    socket.on('device:qr',        onDeviceQR);
    socket.on('device:status',    onDeviceStatus);
    socket.on('device:connected', onDeviceConnected);
    socket.io.on('reconnect',     onReconnect);

    return () => {
      socket.emit('leave:device', activeToken);
      socket.off('device:qr',        onDeviceQR);
      socket.off('device:status',    onDeviceStatus);
      socket.off('device:connected', onDeviceConnected);
      socket.io.off('reconnect',     onReconnect);
    };
  }, [activeToken, showQR, syncStatus]);

  useEffect(() => {
    return () => {
      socket.emit('leave:device', activeToken);
    };
  }, [activeToken]);

  async function handleCreate(e) {
    e.preventDefault();
    setStage('creating');
    try {
      const data = await createDevice(label.trim());
      const dev = data.device;
      setDevice(dev);
      window.history.replaceState({ device: dev }, '', rolePath(`/add-device/${dev.token}`));
      setActiveToken(dev.token);
      setWaitStatus('launching');
      setStage('waiting');
    } catch (err) {
      toast.error(err.message);
      setStage('idle');
    }
  }

  function retry() {
    qrWasShownRef.current = false;
    setQrSrc('');
    setWaitStatus('launching');
    setStage('idle');
  }

  const stepIndex = (stage === 'idle' || stage === 'creating') ? 0
    : stage === 'connected' ? 2 : 1;

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>

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

      {stage === 'creating' && (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div className="spinner spinner-lg" style={{ margin: '0 auto 16px' }} />
            <p className="text-muted">Setting up device…</p>
          </div>
        </div>
      )}

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
              {qrSrc
                ? <img src={qrSrc} alt="Scan with WhatsApp" className="qr-img" />
                : <div className="spinner spinner-lg" />}
            </div>
            <p className="text-muted text-sm" style={{ textAlign: 'center', marginTop: 14 }}>
              Waiting for scan… The QR refreshes automatically when it expires.
            </p>
          </div>
        </div>
      )}

      {stage === 'scanning' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <Wifi size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Connecting to WhatsApp
            </span>
            <span className="badge" style={{ background: 'rgba(37,211,102,.15)', color: '#25d366' }}>
              <span className="badge-dot" style={{ background: '#25d366', animation: 'pulse-dot 1.2s infinite' }} />
              Connecting…
            </span>
          </div>
          <div className="card-body" style={{ padding: '40px 24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>

              {/* WhatsApp Web style green ring loader */}
              <div style={{ position: 'relative', width: 96, height: 96 }}>
                <svg width="96" height="96" viewBox="0 0 96 96" style={{ position: 'absolute', top: 0, left: 0 }}>
                  <circle cx="48" cy="48" r="42" fill="none" stroke="rgba(37,211,102,.12)" strokeWidth="6" />
                  <circle
                    cx="48" cy="48" r="42"
                    fill="none"
                    stroke="#25d366"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray="264"
                    strokeDashoffset="66"
                    style={{ transformOrigin: '48px 48px', animation: 'wa-spin 1.4s linear infinite' }}
                  />
                </svg>
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
                    <path
                      d="M19 2C9.6 2 2 9.6 2 19c0 3.0 .8 5.8 2.2 8.2L2 36l9.1-2.4C13.4 35 16.1 36 19 36c9.4 0 17-7.6 17-17S28.4 2 19 2z"
                      fill="#25d366"
                    />
                    <path
                      d="M27.5 22.4c-.4-.2-2.5-1.2-2.9-1.4-.4-.2-.7-.2-1 .2-.3.4-1.1 1.4-1.4 1.7-.3.3-.5.3-.9.1-.4-.2-1.8-.7-3.4-2.1-1.3-1.1-2.1-2.5-2.4-2.9-.2-.4 0-.6.2-.8.2-.2.4-.5.6-.7.2-.2.3-.4.4-.7.1-.3 0-.6-.1-.8-.1-.2-1-2.4-1.4-3.3-.4-.9-.8-.7-1-.7h-.9c-.3 0-.8.1-1.2.6-.4.5-1.6 1.5-1.6 3.7s1.6 4.3 1.8 4.6c.2.3 3.2 4.9 7.8 6.7 1.1.4 1.9.7 2.6.9 1.1.3 2.1.3 2.9.2.9-.1 2.7-1.1 3.1-2.2.4-1.1.4-2 .3-2.2-.1-.2-.4-.3-.8-.5z"
                      fill="white"
                    />
                  </svg>
                </div>
              </div>

              {/* Status text */}
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 8 }}>
                  QR Code Scanned Successfully
                </p>
                <p className="text-muted text-sm">
                  Connecting to WhatsApp… Keep the app open on your phone.
                </p>
                {waitStatus.startsWith('loading') && (
                  <p style={{ color: '#25d366', fontSize: 13, fontWeight: 600, marginTop: 10 }}>
                    Loading… {waitStatus.match(/\d+/)?.[0] ?? ''}%
                  </p>
                )}
              </div>

              {/* Green progress dots */}
              <div style={{ display: 'flex', gap: 8 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#25d366',
                    animation: `bounce-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>

            </div>
          </div>
        </div>
      )}

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
            <p className="text-muted" style={{ marginBottom: 28 }}>
              <strong style={{ color: 'var(--text)' }}>{device?.label || 'Your device'}</strong> is now
              linked and ready to send &amp; receive messages.
            </p>
            <div className="flex gap-3" style={{ justifyContent: 'center' }}>
              <button
                className="btn btn-primary"
                onClick={() => navigate(rolePath('/send'), { state: { device } })}
              >
                Send Message Now
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => navigate(rolePath('/'))}
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
