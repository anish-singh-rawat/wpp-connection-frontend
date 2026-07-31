import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Send, CheckCircle, AlertCircle, Link, ImagePlus, X, FileVideo, Image, FileText } from 'lucide-react';
import { listDevices, sendMessage, sendMediaMessage, formatNumber } from '../api';
import toast from 'react-hot-toast';

const ACCEPTED = 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/3gpp,video/quicktime,application/pdf,.csv';
const MAX_SIZE       = 16 * 1024 * 1024;
const MAX_SIZE_LABEL = '16 MB';

function FileTypeIcon({ mime, name }) {
  if (!mime && !name) return null;
  const ext = (name || '').split('.').pop().toLowerCase();
  if (mime?.startsWith('video')) return <FileVideo size={16} />;
  if (mime === 'application/pdf' || ext === 'pdf') return <FileText size={16} />;
  if (ext === 'csv' || mime?.includes('csv') || mime?.includes('excel') || mime?.includes('sheet')) return <FileText size={16} />;
  return <Image size={16} />;
}

function isDocument(file) {
  if (!file) return false;
  const ext = file.name.split('.').pop().toLowerCase();
  return file.type === 'application/pdf' || ext === 'pdf' || ext === 'csv'
    || file.type?.includes('csv') || file.type?.includes('excel') || file.type?.includes('sheet');
}

export default function SendMessage() {
  const location       = useLocation();
  const selectedDevice = location.state?.device || null;
  const fileInputRef   = useRef(null);

  const [devices, setDevices]       = useState([]);
  const [token, setToken]           = useState(selectedDevice?.token || '');
  const [number, setNumber]         = useState('');
  const [message, setMessage]       = useState('');
  const [link, setLink]             = useState('');
  const [mediaFile, setMediaFile]   = useState(null);
  const [preview, setPreview]       = useState(null);
  const [mediaError, setMediaError] = useState(''); 
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState(null);

  useEffect(() => {
    listDevices()
      .then((d) => setDevices((d.devices || []).filter((x) => x.isReady)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedDevice?.token) setToken(selectedDevice.token);
  }, [selectedDevice?.token]);

  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);

  const handleFileChange = (file) => {
    if (!file) return;
    setMediaError('');
    if (file.size > MAX_SIZE) {
      setMediaFile(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setMediaError(
        `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB — exceeds the ${MAX_SIZE_LABEL} limit. Please choose a smaller file.`
      );
      return;
    }
    setMediaFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const clearMedia = () => {
    setMediaFile(null);
    setMediaError('');
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!token)          return toast.error('Select a device first.');
    if (!number.trim())  return toast.error('Enter a phone number.');
    if (!mediaFile && !message.trim()) return toast.error('Enter a message or attach a media file.');
    if (mediaError)      return;

    setLoading(true);
    setResult(null);
    try {
      let data;
      if (mediaFile) {
        data = await sendMediaMessage(token, formatNumber(number), mediaFile, message, link);
      } else {
        data = await sendMessage(token, formatNumber(number), message, link);
      }
      setResult({ success: true, data });
      toast.success('Message sent!');
      setNumber('');
      setMessage('');
      setLink('');
      clearMedia();
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
          <span className="card-title">
            <Send size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Send Message
          </span>
        </div>
        <div className="card-body">
          {result && (
            <div className={`alert ${result.success ? 'alert-success' : 'alert-error'}`}>
              {result.success
                ? <><CheckCircle size={16} /> Message sent to {result.data?.result?.number}</>
                : <><AlertCircle size={16} /> {result.error}</>}
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
              <label className="form-label">
                <ImagePlus size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                Media
                <span className="text-muted" style={{ fontWeight: 400, marginLeft: 6 }}>(optional)</span>
              </label>


              {mediaError && (
                <div style={{
                  border: '2px solid #ef4444',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px',
                  background: 'rgba(239,68,68,.07)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  marginBottom: 6,
                }}>
                  <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#ef4444' }}>File too large</div>
                    <div style={{ fontSize: 12, color: '#ef4444', marginTop: 3, lineHeight: 1.5 }}>{mediaError}</div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={clearMedia}
                    title="Dismiss and choose another file"
                    style={{ flexShrink: 0 }}
                  >
                    <X size={13} /> Try again
                  </button>
                </div>
              )}


              {!mediaFile && !mediaError && (
                <div
                  style={{
                    border: '2px dashed var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: 'var(--input-bg)',
                    transition: 'border-color .2s',
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); handleFileChange(e.dataTransfer.files[0]); }}
                >
                  <ImagePlus size={28} style={{ opacity: .4, marginBottom: 8 }} />
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Click or drag to attach file</div>
                  <div className="text-muted text-sm" style={{ marginTop: 4 }}>
                    Images · Videos · PDF · CSV/Excel · Max {MAX_SIZE_LABEL}
                  </div>
                </div>
              )}


              {mediaFile && !mediaError && (
                <div style={{
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px',
                  background: 'var(--input-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}>
                  {mediaFile.type.startsWith('image') ? (
                    <img
                      src={preview}
                      alt="preview"
                      style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{
                      width: 56, height: 56, borderRadius: 6,
                      background: isDocument(mediaFile) ? 'rgba(99,102,241,.1)' : 'rgba(37,211,102,.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {isDocument(mediaFile)
                        ? <FileText size={24} color="#6366f1" />
                        : <FileVideo size={24} color="var(--green)" />}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {mediaFile.name}
                    </div>
                    <div className="text-muted text-sm">
                      <FileTypeIcon mime={mediaFile.type} name={mediaFile.name} />
                      {' '}{(mediaFile.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={clearMedia} style={{ flexShrink: 0 }}>
                    <X size={14} />
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED}
                style={{ display: 'none' }}
                onChange={(e) => handleFileChange(e.target.files[0])}
              />
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
                rows={3}
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
                Appended to the {mediaFile ? 'caption' : 'message'}. WhatsApp shows a link preview automatically.
              </div>
            </div>

            <button
              className="btn btn-primary btn-lg w-full"
              type="submit"
              disabled={loading || !token || !!mediaError}
            >
              {loading
                ? <><span className="spinner" /> Sending…</>
                : <><Send size={16} /> {mediaFile ? 'Send Media' : 'Send Message'}</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
