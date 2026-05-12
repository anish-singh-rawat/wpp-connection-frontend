import { useState, useEffect } from 'react';
import { Users, Upload, Send, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { listDevices, bulkSend, bulkSendCSV, parseNumbers } from '../api';
import toast from 'react-hot-toast';

export default function BulkSend({ selectedDevice, onNav, onSelectDevice }) {
  const [tab, setTab]         = useState('manual');
  const [devices, setDevices] = useState([]);
  const [token, setToken]     = useState(selectedDevice?.token || '');
  const [numbers, setNumbers] = useState('');
  const [message, setMessage] = useState('');
  const [csvFile, setCsvFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);

  useEffect(() => {
    listDevices()
      .then((d) => setDevices((d.devices || []).filter((x) => x.isReady)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedDevice?.token) setToken(selectedDevice.token);
  }, [selectedDevice]);

  const handleManual = async (e) => {
    e.preventDefault();
    if (!token) return toast.error('Select a device.');
    const parsed = parseNumbers(numbers);
    if (parsed.length === 0) return toast.error('Enter at least one valid number.');
    if (!message.trim()) return toast.error('Enter a message.');

    setLoading(true);
    setResult(null);
    try {
      const data = await bulkSend(token, parsed, message);
      setResult({ success: true, data });
      toast.success(`${data.queued} messages queued!`);
      // Find the device object and navigate to queue
      const dev = devices.find((d) => d.token === token);
      if (dev) onSelectDevice(dev);
    } catch (err) {
      setResult({ success: false, error: err.message });
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCSV = async (e) => {
    e.preventDefault();
    if (!token) return toast.error('Select a device.');
    if (!csvFile) return toast.error('Select a CSV file.');
    if (!message.trim()) return toast.error('Enter a message.');

    setLoading(true);
    setResult(null);
    try {
      const data = await bulkSendCSV(token, csvFile, message);
      setResult({ success: true, data });
      toast.success(`${data.queued} messages queued from CSV!`);
      const dev = devices.find((d) => d.token === token);
      if (dev) onSelectDevice(dev);
    } catch (err) {
      setResult({ success: false, error: err.message });
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const parsedCount = parseNumbers(numbers).length;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div className="card">
        <div className="card-header">
          <span className="card-title"><Users size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />Bulk Send</span>
          <div className="tabs">
            <button className={`tab-btn${tab === 'manual' ? ' active' : ''}`} onClick={() => setTab('manual')}>
              Manual
            </button>
            <button className={`tab-btn${tab === 'csv' ? ' active' : ''}`} onClick={() => setTab('csv')}>
              CSV Upload
            </button>
          </div>
        </div>

        <div className="card-body">
          {result && (
            <div className={`alert ${result.success ? 'alert-success' : 'alert-error'}`}>
              {result.success ? (
                <>
                  <CheckCircle size={16} />
                  <div>
                    <strong>{result.data.queued} queued</strong>
                    {result.data.duplicates > 0 && `, ${result.data.duplicates} duplicates skipped`}
                    {result.data.parsed != null && `, ${result.data.parsed} parsed from CSV`}
                    {' '}
                    <button
                      className="btn btn-sm btn-secondary"
                      style={{ marginLeft: 8 }}
                      onClick={() => onNav('queue')}
                    >
                      View Queue →
                    </button>
                  </div>
                </>
              ) : (
                <><AlertCircle size={16} /> {result.error}</>
              )}
            </div>
          )}

          {/* Device selector — shared */}
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
          </div>

          {/* Manual tab */}
          {tab === 'manual' && (
            <form onSubmit={handleManual}>
              <div className="form-group">
                <label className="form-label">
                  Phone Numbers
                  {parsedCount > 0 && (
                    <span className="badge sent" style={{ marginLeft: 8 }}>{parsedCount} valid</span>
                  )}
                </label>
                <textarea
                  className="form-control"
                  placeholder={'919800000000\n917000000000\n916000000000'}
                  value={numbers}
                  onChange={(e) => setNumbers(e.target.value)}
                  rows={6}
                  required
                />
                <div className="form-hint">One number per line. Country code required. Commas and semicolons also accepted.</div>
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
                {loading
                  ? <><span className="spinner" /> Queuing…</>
                  : <><Send size={16} /> Send to {parsedCount || '…'} Numbers</>
                }
              </button>
            </form>
          )}

          {/* CSV tab */}
          {tab === 'csv' && (
            <form onSubmit={handleCSV}>
              <div className="form-group">
                <label className="form-label">CSV File</label>
                <div
                  style={{
                    border: '2px dashed var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '24px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: csvFile ? 'rgba(37,211,102,.04)' : 'var(--input-bg)',
                    transition: 'all .2s',
                  }}
                  onClick={() => document.getElementById('csv-input').click()}
                >
                  {csvFile ? (
                    <div className="flex items-center gap-2" style={{ justifyContent: 'center' }}>
                      <FileText size={20} color="var(--green)" />
                      <span style={{ fontWeight: 600 }}>{csvFile.name}</span>
                      <span className="text-muted text-sm">({(csvFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  ) : (
                    <>
                      <Upload size={28} style={{ opacity: .4, marginBottom: 8 }} />
                      <div style={{ fontWeight: 600 }}>Click to upload CSV</div>
                      <div className="text-muted text-sm">Max 2MB · Must have a column with phone numbers</div>
                    </>
                  )}
                </div>
                <input
                  id="csv-input"
                  type="file"
                  accept=".csv"
                  style={{ display: 'none' }}
                  onChange={(e) => setCsvFile(e.target.files[0] || null)}
                />
                <div className="form-hint">
                  Accepted formats: single column of numbers, or CSV with a <code>number</code> / <code>phone</code> column.
                </div>
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
                disabled={loading || !token || !csvFile}
              >
                {loading
                  ? <><span className="spinner" /> Uploading…</>
                  : <><Upload size={16} /> Upload &amp; Send</>
                }
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
