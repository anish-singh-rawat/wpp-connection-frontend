import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { CheckCircle, Smartphone, QrCode, Wifi, RefreshCw, AlertTriangle } from 'lucide-react';
import { createDevice, getSSEUrl, getQRImageUrl, getQRStatus } from '../api';
import toast from 'react-hot-toast';

// Stages: idle | creating | countdown | qr | connected | error
const STEPS         = ['Create', 'Scan QR', 'Connected'];
const DEFAULT_EST   = 20;
const QR_VALIDITY   = 20;

function waitingLabel(status) {
  if (!status || status === 'launching')  return 'Starting WhatsApp session…';
  if (status.startsWith('loading'))       return `Loading WhatsApp Web… (${status.match(/\d+/)?.[0] ?? ''}%)`;
  if (status === 'qr_pending')            return 'Generating QR code…';
  if (status === 'retrying')              return 'Retrying…';
  return status;
}

export default function AddDevice() {
  const navigate              = useNavigate();
  const { token: routeToken } = useParams();
  const location              = useLocation();
  const prefill               = location.state?.device || null;

  const [stage,      setStage]      = useState(() => {
    if (prefill?.isReady)        return 'connected';
    if (prefill || routeToken)   return 'countdown';
    return 'idle';
  });
  const [label,      setLabel]      = useState('');
  const [device,     setDevice]     = useState(prefill || null);
  const [qrSrc,      setQrSrc]      = useState('');
  const [countdown,  setCountdown]  = useState(DEFAULT_EST);
  const [qrExpiry,   setQrExpiry]   = useState(QR_VALIDITY);
  const [waitStatus, setWaitStatus] = useState('launching');
  const [countDone,  setCountDone]  = useState(false);

  // Use refs so closures always see the latest interval IDs
  const countRef    = useRef(null);
  const qrRef       = useRef(null);
  const esRef       = useRef(null);
  const pollRef     = useRef(null);   // status polling after countdown expires
  const estimateRef = useRef(DEFAULT_EST);
  // Ref mirror of stage so SSE handler always sees current stage
  const stageRef    = useRef(stage);
  useEffect(() => { stageRef.current = stage; }, [stage]);

  // ── stop timers ──────────────────────────────────────────────────────────
  function stopCountdown() {
    clearInterval(countRef.current);
    countRef.current = null;
  }
  function stopQrTimer() {
    clearInterval(qrRef.current);
    qrRef.current = null;
  }
  function stopStatusPoll() {
    clearInterval(pollRef.current);
    pollRef.current = null;
  }

  // ── start countdown ──────────────────────────────────────────────────────
  function startCountdown(from, tok) {
    estimateRef.current = from;
    stopCountdown();
    setCountdown(from);
    setCountDone(false);
    countRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(countRef.current);
          countRef.current = null;
          setCountDone(true);
          // Countdown expired — start polling status every 3s
          if (tok) startStatusPoll(tok);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  // ── start QR expiry timer ────────────────────────────────────────────────
  function startQrExpiry() {
    stopQrTimer();
    setQrExpiry(QR_VALIDITY);
    qrRef.current = setInterval(() => {
      setQrExpiry((t) => {
        if (t <= 1) {
          clearInterval(qrRef.current);
          qrRef.current = null;
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  // ── transition to QR stage ───────────────────────────────────────────────
  // Extracted so both SSE handler and status-poll can call it
  function showQR(qrDataUri) {
    stopCountdown();
    stopStatusPoll();
    setCountDone(false);
    setQrSrc(qrDataUri);
    setStage('qr');
    startQrExpiry();
  }

  // ── poll /qrcode/status every 3s (used after countdown expires) ──────────
  function startStatusPoll(tok) {
    stopStatusPoll();
    const poll = async () => {
      try {
        const data = await getQRStatus(tok);
        if (data.isReady) {
          stopStatusPoll();
          stopCountdown();
          stopQrTimer();
          esRef.current?.close();
          setStage('connected');
          toast.success('Device connected successfully!');
          return;
        }
        if (data.hasQR) {
          stopStatusPoll();
          const imgUrl = `${getQRImageUrl(tok)}?t=${Date.now()}`;
          showQR(imgUrl);
        }
      } catch (_) {}
    };
    poll(); // fire immediately, then every 3s
    pollRef.current = setInterval(poll, 3000);
  }

  // ── check current status immediately (handles already-ready QR) ──────────
  async function checkStatusNow(tok) {
    try {
      const data = await getQRStatus(tok);
      if (data.isReady) {
        // Already connected — skip QR entirely
        stopCountdown();
        stopQrTimer();
        setStage('connected');
        return true;
      }
      if (data.hasQR) {
        // QR already generated — fetch the image directly, don't wait for SSE
        const imgUrl = `${getQRImageUrl(tok)}?t=${Date.now()}`;
        showQR(imgUrl);
        return true;
      }
    } catch (_) {}
    return false;
  }

  // ── open SSE ─────────────────────────────────────────────────────────────
  function openSSE(tok) {
    if (esRef.current) esRef.current.close();

    const es = new EventSource(getSSEUrl(tok));
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);

        if (msg.type === 'waiting') {
          setWaitStatus(msg.status || 'launching');
        }

        if (msg.type === 'qr') {
          // QR arrived via SSE — use the base64 data URI directly
          showQR(msg.qr);
        }

        if (msg.type === 'connected') {
          stopCountdown();
          stopQrTimer();
          stopStatusPoll();
          es.close();
          setStage('connected');
          toast.success('Device connected successfully!');
        }

        if (msg.type === 'waiting' && msg.status === 'retrying') {
          stopCountdown();
          stopQrTimer();
          stopStatusPoll();
          es.close();
          setStage('error');
        }
      } catch (err) {
        console.log('SSE parse error', err);
      }
    };

    // EventSource auto-reconnects on drop.
    // On reconnect the server re-sends the latest QR immediately.
    es.onerror = () => {};
  }

  // ── start the full flow for a token ─────────────────────────────────────
  async function startFlow(tok, estimatedSeconds) {
    setWaitStatus('launching');
    startCountdown(estimatedSeconds, tok);

    // Check immediately — QR may already be ready (e.g. page reload mid-flow)
    const alreadyReady = await checkStatusNow(tok);
    if (!alreadyReady) {
      openSSE(tok);
    } else {
      // Still open SSE so we catch the `connected` event when user scans
      openSSE(tok);
    }
  }

  // ── kick off for re-scan (prefill / routeToken) ──────────────────────────
  useEffect(() => {
    if ((prefill || routeToken) && !prefill?.isReady) {
      const tok = prefill?.token || routeToken;
      if (!tok) return;
      startFlow(tok, prefill?.estimated_qr_seconds ?? DEFAULT_EST);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopCountdown();
      stopQrTimer();
      stopStatusPoll();
      esRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── create device ────────────────────────────────────────────────────────
  async function handleCreate(e) {
    e.preventDefault();
    setStage('creating');
    try {
      const data = await createDevice(label.trim());
      const dev  = data.device;
      setDevice(dev);

      navigate(`/add-device/${dev.token}`, {
        replace: true,
        state: { device: dev },
      });

      setStage('countdown');
      await startFlow(dev.token, dev.estimated_qr_seconds ?? DEFAULT_EST);
    } catch (err) {
      toast.error(err.message);
      setStage('idle');
    }
  }

  // ── retry ────────────────────────────────────────────────────────────────
  function retry() {
    esRef.current?.close();
    stopCountdown();
    stopQrTimer();
    stopStatusPoll();
    setQrSrc('');
    setCountDone(false);
    setWaitStatus('launching');
    setStage('idle');
  }

  // ── derived UI values ────────────────────────────────────────────────────
  const stepIndex     = (stage === 'idle' || stage === 'creating') ? 0
    : stage === 'connected' ? 2 : 1;
  const circumference = 2 * Math.PI * 36;
  const ringOffset    = countDone
    ? circumference
    : circumference * (1 - countdown / estimateRef.current);

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

      {/* ── countdown ────────────────────────────────────────────────────── */}
      {stage === 'countdown' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <QrCode size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Preparing QR Code
            </span>
            <span className="badge launching">
              <span className="badge-dot" />
              Starting…
            </span>
          </div>
          <div className="card-body" style={{ textAlign: 'center', padding: '40px 24px' }}>
            {!countDone ? (
              <svg width={96} height={96} style={{ display: 'block', margin: '0 auto 20px' }}>
                <circle cx={48} cy={48} r={36} fill="none" stroke="var(--border)" strokeWidth={6} />
                <circle
                  cx={48} cy={48} r={36}
                  fill="none" stroke="var(--green)" strokeWidth={6} strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={ringOffset}
                  transform="rotate(-90 48 48)"
                  style={{ transition: 'stroke-dashoffset 0.9s linear' }}
                />
                <text x={48} y={53} textAnchor="middle" fontSize={22} fontWeight={700} fill="var(--text)">
                  {countdown}
                </text>
              </svg>
            ) : (
              <div className="spinner spinner-lg" style={{ margin: '0 auto 20px' }} />
            )}
            <p className="text-muted" style={{ marginBottom: 6 }}>
              {waitingLabel(waitStatus)}
            </p>
            <p className="text-muted text-sm">
              {countDone
                ? 'Taking a bit longer than usual — almost there…'
                : `Usually ready in about ${estimateRef.current}s`}
            </p>
          </div>
        </div>
      )}

      {/* ── qr ───────────────────────────────────────────────────────────── */}
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

            <div className="flex items-center gap-2" style={{ marginTop: 14, justifyContent: 'center' }}>
              <span className="text-muted text-sm">
                QR refreshes in{' '}
                <strong style={{ color: qrExpiry <= 5 ? 'var(--red)' : 'var(--text)' }}>
                  {qrExpiry}s
                </strong>
              </span>
            </div>
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
              ⚠️ Connection failed. Please try again.
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
              width: 72, height: 72, borderRadius: '50%',
              background: 'rgba(37,211,102,.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <CheckCircle size={36} color="var(--green)" />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Device Connected!</h2>
            <p className="text-muted" style={{ marginBottom: 24 }}>
              {device?.label || 'Your device'} is now ready to send and receive messages.
            </p>
            <div className="flex gap-3" style={{ justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => navigate('/send', { state: { device } })}>
                Send Message
              </button>
              <button className="btn btn-secondary" onClick={() => navigate('/')}>
                Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
