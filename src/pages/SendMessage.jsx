import { useState, useEffect } from 'react';
import { Send, CheckCircle, AlertCircle } from 'lucide-react';
import { listDevices, sendMessage, formatNumber } from '../api';
import toast from 'react-hot-toast';

export default function SendMessage({ selectedDevice }) {
  const [devices, setDevices]   = useState([]);
  const [token, setToken]       = useState(selectedDevice?.token || '');
  const [number, setNumber]     = useState('');
  const [message, setMessage]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null); // { success, data }

  useEffect(() => {
    listDevices()
      .then((d) => setDevices((d.devices || []).filter((x) => x.isReady)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedDevice?.token) setToken(selectedDevice.token);
  }, [selectedDevice]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!token) return toast.error('Select a device first.');
    if (!number.trim()) return toast.error('Enter a phone number.');
    if (!message.trim()) return toast.error('Enter a message.');

    setLoading(true);
    setResult(null);
    try {
      const data = await sendMessage(token, formatNumber(number), message);
      setResult({ success: true, data });
      toast.success('Message sent!');
      setNumber('');
      setMessage('');
    } catch (err) {
      setResult({ success: false, error: err.message });
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <div className="card">
        <div className="card-header">
          <span className="card-title"><Send size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />Send Message</span>
        </div>
        <div className="card-body">
          {result && (
            <div className={`alert ${result.success ? 'alert-success' : 'alert-error'}`}>
              {result.success
                ? <><CheckCircle size={16} /> Message sent to {result.data?.result?.number}</>
                : <><AlertCircle size={16} /> {result.error}</>
              }
            </div>
          )}

          <form onSubmit={handleSend}>
            <div className="form-group">
              <label className="form-label">Device</label>
              <select
                className="form-control"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              >
                <option value="">— Select a connected device —</option>
                {devices.map((d) => (
                  <option key={d.token} value={d.token}>
                    {d.label || 'Unnamed'} ({d.session})
                  </option>
                ))}
              </select>
              {devices.length === 0 && (
                <div className="form-hint" style={{ color: 'var(--orange)' }}>
                  No connected devices. Add and connect a device first.
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                className="form-control"
                placeholder="919800000000 (country code + number)"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                required
              />
              <div className="form-hint">Include country code, digits only. E.g. 919800000000 for India.</div>
            </div>

            <div className="form-group">
              <label className="form-label">Message</label>
              <textarea
                className="form-control"
                placeholder="Type your message here…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                required
              />
            </div>

            <button
              className="btn btn-primary btn-lg w-full"
              type="submit"
              disabled={loading || !token}
            >
              {loading ? <><span className="spinner" /> Sending…</> : <><Send size={16} /> Send Message</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
