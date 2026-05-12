import { useState, useEffect, useRef } from 'react';
import { CheckCircle, Smartphone, QrCode, Wifi, RefreshCw } from 'lucide-react';
import { createDevice, getSSEUrl, BASE_URL } from '../api';
import toast from 'react-hot-toast';

const STEPS = ['Create', 'Scan QR', 'Connected'];

export default function AddDevice({ prefill, onNav }) {
  const [step, setStep]       = useState(prefill ? 1 : 0);
  const [label, setLabel]     = useState('');
  const [device, setDevice]   = useState(prefill || null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus]   = useState(prefill?.status || '');
  const [qrSrc, setQrSrc]     = useState(null);   
  const [qrError, setQrError] = useState(false);  
  const esRef = useRef(null);

  useEffect(() => {
    if (prefill?.isReady) setStep(2);
  }, [prefill]);

  useEffect(() => {
    if (!device?.token || step !== 1) return;

    setQrSrc(null);
    setQrError(false);

    const es = new EventSource(getSSEUrl(device.token));
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);

        if (msg.type === 'waiting') {
          setStatus(msg.status || 'launching');
        }

        if (msg.type === 'qr') {
          setQrSrc(msg.qr);
          setStatus('qr_ready');
          setQrError(false);
        }

        if (msg.type === 'connected') {
          setStatus('connected');
          setStep(2);
          es.close();
          toast.success('Device connected successfully!');
        }
      } catch(err) {
        console.log("error",err)
       }
    };

    es.onerror = () => {
      // SSE connection dropped — show the direct image URL as fallback
      setQrError(true);
    };

    return () => es.close();
  }, [device?.token, step]);

  useEffect(() => {
    if (!qrError || !device?.token || step !== 1) return;

    const pollImage = () => {
      setQrSrc(`${BASE_URL}/devices/${device.token}/qrcode/image?t=${Date.now()}`);
    };

    pollImage();
    const id = setInterval(pollImage, 5000);
    return () => clearInterval(id);
  }, [qrError, device?.token, step]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await createDevice(label.trim());
      setDevice(data.device);
      setStep(1);
      toast.success('Device created! Scan the QR code below.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshQR = () => {
    if (esRef.current) esRef.current.close();
    setQrSrc(null);
    setQrError(false);
    setStatus('launching');
    setDevice((d) => ({ ...d }));
  };

  const badgeClass = status === 'qr_ready' ? 'qr_ready'
    : status === 'connected' ? 'connected'
    : 'launching';

  const badgeLabel = status === 'qr_ready' ? 'QR Ready'
    : status === 'connected' ? 'Connected'
    : status || 'Starting…';

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      {/* Step indicator */}
      <div className="steps mb-6">
        {STEPS.map((s, i) => (
          <div key={s} className={`step${step === i ? ' active' : ''}${step > i ? ' done' : ''}`}>
            <div className="step-circle">
              {step > i ? <CheckCircle size={16} /> : i + 1}
            </div>
            <div className="step-label">{s}</div>
          </div>
        ))}
      </div>

      {/* ── Step 0 — Create ─────────────────────────────────────────────── */}
      {step === 0 && (
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
              <button
                className="btn btn-primary btn-lg w-full"
                type="submit"
                disabled={loading}
              >
                {loading ? <><span className="spinner" /> Creating…</> : 'Create Device'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Step 1 — Scan QR ────────────────────────────────────────────── */}
      {step === 1 && device && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <QrCode size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Scan QR Code
            </span>
            <span className={`badge ${badgeClass}`}>
              <span className="badge-dot" />
              {badgeLabel}
            </span>
          </div>

          <div className="card-body">
            <div className="alert alert-info" style={{ marginBottom: 16 }}>
              <Wifi size={16} style={{ flexShrink: 0 }} />
              <span>
                Open <strong>WhatsApp → Linked Devices → Link a Device</strong> and scan the QR code below.
              </span>
            </div>

            {/* QR display area */}
            <div className="qr-display">
              {!qrSrc ? (
                /* Waiting for QR */
                <div className="qr-waiting">
                  <div className="spinner spinner-lg" />
                  <p className="text-muted text-sm" style={{ marginTop: 12 }}>
                    {status === 'launching' && 'Starting WhatsApp session…'}
                    {status?.startsWith('loading') && 'Loading session (50%)…'}
                    {status === 'qr_pending' && 'Generating QR code…'}
                    {(!status || status === '') && 'Connecting to server…'}
                  </p>
                </div>
              ) : (
                /* QR image — from SSE base64 or fallback URL */
                <img
                  src={qrSrc}
                  alt="WhatsApp QR Code"
                  className="qr-img"
                  onError={() => {
                    // Image URL failed — clear and retry via SSE
                    setQrSrc(null);
                    setQrError(true);
                  }}
                />
              )}
            </div>

            <div
              className="flex items-center gap-2"
              style={{ marginTop: 14, justifyContent: 'center' }}
            >
              <span className="text-muted text-sm">
                {qrSrc ? 'QR refreshes automatically.' : 'Waiting for QR…'}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleRefreshQR}
                title="Force refresh QR"
              >
                <RefreshCw size={13} /> Refresh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2 — Connected ──────────────────────────────────────────── */}
      {step === 2 && (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{
              width: 72, height: 72,
              borderRadius: '50%',
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
              <button className="btn btn-primary" onClick={() => onNav('send')}>
                Send Message
              </button>
              <button className="btn btn-secondary" onClick={() => onNav('dashboard')}>
                Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
