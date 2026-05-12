import { useState, useEffect, useRef } from 'react';
import { CheckCircle, Smartphone, QrCode, Wifi } from 'lucide-react';
import { createDevice, getQRUrl, getSSEUrl } from '../api';
import toast from 'react-hot-toast';

const STEPS = ['Create', 'Scan QR', 'Connected'];

export default function AddDevice({ prefill, onNav }) {
  const [step, setStep]     = useState(prefill ? 1 : 0);
  const [label, setLabel]   = useState('');
  const [device, setDevice] = useState(prefill || null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus]   = useState(prefill?.status || '');
  const esRef = useRef(null);

  // If prefill device is already connected, jump to step 2
  useEffect(() => {
    if (prefill?.isReady) setStep(2);
  }, [prefill]);

  // SSE listener once we have a device token
  useEffect(() => {
    if (!device?.token || step !== 1) return;

    const es = new EventSource(getSSEUrl(device.token));
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'waiting') setStatus(msg.status || 'launching');
        if (msg.type === 'qr')      setStatus('qr_ready');
        if (msg.type === 'connected') {
          setStatus('connected');
          setStep(2);
          es.close();
          toast.success('Device connected successfully!');
        }
      } catch { /* ignore parse errors */ }
    };

    es.onerror = () => {
      // SSE dropped — keep iframe visible, user can still scan
    };

    return () => es.close();
  }, [device?.token, step]);

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

      {/* Step 0 — Create */}
      {step === 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title"><Smartphone size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />New Device</span>
          </div>
          <div className="card-body">
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Device Label <span className="text-muted">(optional)</span></label>
                <input
                  className="form-control"
                  placeholder="e.g. My iPhone, Office Phone"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
                <div className="form-hint">A friendly name to identify this device.</div>
              </div>
              <button className="btn btn-primary btn-lg w-full" type="submit" disabled={loading}>
                {loading ? <><span className="spinner" /> Creating…</> : 'Create Device'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Step 1 — Scan QR */}
      {step === 1 && device && (
        <div className="card">
          <div className="card-header">
            <span className="card-title"><QrCode size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />Scan QR Code</span>
            <span className={`badge ${status === 'qr_ready' ? 'qr_ready' : 'launching'}`}>
              <span className="badge-dot" />
              {status === 'qr_ready' ? 'QR Ready' : status || 'Starting…'}
            </span>
          </div>
          <div className="card-body">
            <div className="alert alert-info" style={{ marginBottom: 16 }}>
              <Wifi size={16} style={{ flexShrink: 0 }} />
              <span>Open <strong>WhatsApp → Linked Devices → Link a Device</strong> and scan the QR code below.</span>
            </div>

            <div className="qr-frame">
              <iframe
                src={getQRUrl(device.token)}
                title="WhatsApp QR Code"
                width="460"
                height="480"
              />
            </div>

            <div className="text-muted text-sm" style={{ marginTop: 12, textAlign: 'center' }}>
              QR refreshes automatically. Waiting for scan…
            </div>
          </div>
        </div>
      )}

      {/* Step 2 — Connected */}
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
              <button className="btn btn-primary" onClick={() => onNav('send')}>Send Message</button>
              <button className="btn btn-secondary" onClick={() => onNav('dashboard')}>Dashboard</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
