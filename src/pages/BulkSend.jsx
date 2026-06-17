import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Users, Upload, Send, CheckCircle, AlertCircle, FileText, Link, ImagePlus, X, FileVideo } from 'lucide-react';
import { listDevices, bulkSend, bulkSendMedia, bulkSendCSV, parseNumbers } from '../api';
import toast from 'react-hot-toast';

export default function BulkSend() {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedDevice = location.state?.device || null;
  const fileInputRef   = useRef(null);

  const [tab, setTab]         = useState('manual');
  const [devices, setDevices] = useState([]);
  const [token, setToken]     = useState(selectedDevice?.token || '');
  const [numbers, setNumbers] = useState('');
  const [message, setMessage] = useState('');
  const [link, setLink]       = useState('');
  const [mediaFile, setMediaFile]         = useState(null);
  const [mediaPreview, setMediaPreview]   = useState(null);
  const [csvFile, setCsvFile]             = useState(null);
  const [csvHasMessage, setCsvHasMessage] = useState(false);
  const [loading, setLoading]             = useState(false);
  const [result, setResult]               = useState(null);

  useEffect(() => {
    return () => { if (mediaPreview) URL.revokeObjectURL(mediaPreview); };
  }, [mediaPreview]);

  useEffect(() => {
    listDevices()
      .then((d) => setDevices((d.devices || []).filter((x) => x.isReady)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedDevice?.token) setToken(selectedDevice.token);
  }, [selectedDevice?.token]);

  const handleManual = async (e) => {
    e.preventDefault();
    if (!token) return toast.error('Select a device.');
    const parsed = parseNumbers(numbers);
    if (parsed.length === 0) return toast.error('Enter at least one valid number.');
    if (!mediaFile && !message.trim()) return toast.error('Enter a message or attach a media file.');

    setLoading(true);
    setResult(null);
    try {
      let data;
      if (mediaFile) {
        data = await bulkSendMedia(token, parsed, mediaFile, message, link);
      } else {
        data = await bulkSend(token, parsed, message, link);
      }
      setResult({ success: true, data });
      toast.success(`${data.queued} messages queued!`);
      const dev = devices.find((d) => d.token === token);
      navigate('/queue', { state: { device: dev || null } });
    } catch (err) {
      setResult({ success: false, error: err.message });
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMediaFileChange = (file) => {
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) { toast.error('File too large. Max 16 MB.'); return; }
    setMediaFile(file);
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaPreview(URL.createObjectURL(file));
  };

  const clearMedia = () => {
    setMediaFile(null);
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCsvFileChange = (file) => {
    setCsvFile(file || null);
    setCsvHasMessage(false);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const firstLine = (ev.target.result || '').split('\n')[0] || '';
      const headers = firstLine.split(',').map((h) => h.trim().toLowerCase());
      setCsvHasMessage(headers.includes('message'));
    };
    reader.readAsText(file.slice(0, 256));
  };

  const handleCSV = async (e) => {
    e.preventDefault();
    if (!token) return toast.error('Select a device.');
    if (!csvFile) return toast.error('Select a CSV file.');
    if (!csvHasMessage && !message.trim()) return toast.error('Enter a message.');

    setLoading(true);
    setResult(null);
    try {
      const data = await bulkSendCSV(token, csvFile, message);
      setResult({ success: true, data });
      toast.success(`${data.queued} messages queued from CSV!`);
      const dev = devices.find((d) => d.token === token);
      navigate('/queue', { state: { device: dev || null } });
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
          <span className="card-title">
            <Users size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Bulk Send
          </span>
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
                      onClick={() => navigate('/queue', { state: { device: devices.find((d) => d.token === token) || null } })}
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
                <label className="form-label">
                  <ImagePlus size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  Media
                  <span className="text-muted" style={{ fontWeight: 400, marginLeft: 6 }}>(optional)</span>
                </label>
                {!mediaFile ? (
                  <div
                    style={{
                      border: '2px dashed var(--border)', borderRadius: 'var(--radius-sm)',
                      padding: '16px', textAlign: 'center', cursor: 'pointer', background: 'var(--input-bg)',
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); handleMediaFileChange(e.dataTransfer.files[0]); }}
                  >
                    <ImagePlus size={24} style={{ opacity: .4, marginBottom: 6 }} />
                    <div style={{ fontWeight: 600, fontSize: 13 }}>Click or drag to attach file</div>
                    <div className="text-muted text-sm">Images · Videos · PDF · CSV/Excel · Max 16 MB</div>
                  </div>
                ) : (
                  <div style={{
                    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                    padding: '10px 14px', background: 'var(--input-bg)',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    {mediaFile.type.startsWith('image') ? (
                      <img src={mediaPreview} alt="preview" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                    ) : (
                      <div style={{
                        width: 48, height: 48, borderRadius: 4,
                        background: (mediaFile.type === 'application/pdf' || mediaFile.name.endsWith('.csv') || mediaFile.name.endsWith('.pdf'))
                          ? 'rgba(99,102,241,.1)' : 'rgba(37,211,102,.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        {(mediaFile.type === 'application/pdf' || mediaFile.name.endsWith('.csv') || mediaFile.name.endsWith('.pdf'))
                          ? <FileText size={22} color="#6366f1" />
                          : <FileVideo size={22} color="var(--green)" />}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mediaFile.name}</div>
                      <div className="text-muted text-sm">{(mediaFile.size / 1024 / 1024).toFixed(2)} MB</div>
                    </div>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={clearMedia}><X size={13} /></button>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/3gpp,video/quicktime,application/pdf,.csv" style={{ display: 'none' }} onChange={(e) => handleMediaFileChange(e.target.files[0])} />
              </div>

              <div className="form-group">
                <label className="form-label">
                  {mediaFile ? 'Caption' : 'Message'}
                  {mediaFile && <span className="text-muted" style={{ fontWeight: 400, marginLeft: 6 }}>(optional)</span>}
                </label>
                <textarea
                  className="form-control"
                  placeholder={mediaFile ? 'Add a caption…' : 'Type your message here…'}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  required={!mediaFile}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Link size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  Link URL
                  <span className="text-muted" style={{ fontWeight: 400, marginLeft: 6 }}>(optional)</span>
                </label>
                <input
                  className="form-control"
                  placeholder="https://example.com"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  type="url"
                />
                <div className="form-hint">
                  Appended to every message. WhatsApp shows a link preview automatically.
                </div>
              </div>

              <button
                className="btn btn-primary btn-lg w-full"
                type="submit"
                disabled={loading || !token}
              >
                {loading
                  ? <><span className="spinner" /> Queuing…</>
                  : <><Send size={16} /> Send to {parsedCount || '…'} Numbers</>}
              </button>
            </form>
          )}

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
                  onChange={(e) => handleCsvFileChange(e.target.files[0] || null)}
                />
                <div className="form-hint">
                  Accepted formats: single column of numbers, or CSV with a <code>number</code> / <code>phone</code> column.
                </div>
              </div>

              {csvHasMessage ? (
                <div
                  className="alert alert-success"
                  style={{ marginBottom: 16, alignItems: 'flex-start' }}
                >
                  <CheckCircle size={16} style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <strong>Message column detected</strong>
                    <div className="text-sm" style={{ marginTop: 2 }}>
                      Each row's <code>Message</code> value will be used — no need to type a message here.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Message</label>
                  <textarea
                    className="form-control"
                    placeholder="Type your message here…"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    required={!csvHasMessage}
                  />
                  <div className="form-hint">
                    Tip: add a <code>Message</code> column to your CSV to send a personalised message per row.
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">
                  <Link size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  Link URL
                  <span className="text-muted" style={{ fontWeight: 400, marginLeft: 6 }}>(optional)</span>
                </label>
                <input
                  className="form-control"
                  placeholder="https://example.com"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  type="url"
                />
                <div className="form-hint">
                  Appended to every message. WhatsApp shows a link preview automatically.
                </div>
              </div>

              <button
                className="btn btn-primary btn-lg w-full"
                type="submit"
                disabled={loading || !token || !csvFile}
              >
                {loading
                  ? <><span className="spinner" /> Uploading…</>
                  : <><Upload size={16} /> Upload &amp; Send</>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
