import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Inbox as InboxIcon, RefreshCw, MessageCircle } from 'lucide-react';
import { listDevices, getMessages } from '../api';
import socket from '../socket';
import toast from 'react-hot-toast';

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(ts).toLocaleDateString();
}

function avatarLetter(from = '') {
  const num = from.replace('@c.us', '').replace(/\D/g, '');
  return num.slice(-2, -1) || '?';
}

const AVATAR_COLORS = [
  'linear-gradient(135deg,#667eea,#764ba2)',
  'linear-gradient(135deg,#f093fb,#f5576c)',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
  'linear-gradient(135deg,#43e97b,#38f9d7)',
  'linear-gradient(135deg,#fa709a,#fee140)',
  'linear-gradient(135deg,#a18cd1,#fbc2eb)',
];

function avatarColor(from = '') {
  let hash = 0;
  for (const c of from) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function Inbox() {
  const location = useLocation();
  const selectedDevice = location.state?.device || null;

  const [devices, setDevices]   = useState([]);
  const [token, setToken]       = useState(selectedDevice?.token || '');
  const [limit, setLimit]       = useState(50);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading]   = useState(false);

  const [sessionName, setSessionName] = useState(selectedDevice?.session || '');

  useEffect(() => {
    listDevices()
      .then((d) => setDevices(d.devices || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedDevice?.token) setToken(selectedDevice.token);
  }, [selectedDevice?.token]);

  useEffect(() => {
    const found = devices.find((d) => d.token === token);
    setSessionName(found?.session || '');
  }, [token, devices]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await getMessages(token, limit);
      setMessages(data.messages || []);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, limit]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!sessionName) return;

    const onInboxMessage = ({ sessionName: sn, message }) => {
      if (sn !== sessionName) return;
      setMessages((prev) => {
        const isDup = prev.some(
          (m) => m.from === message.from && m.body === message.body && m.receivedAt === message.receivedAt
        );
        if (isDup) return prev;
        return [message, ...prev].slice(0, limit);
      });
    };

    socket.on('inbox:message', onInboxMessage);
    return () => socket.off('inbox:message', onInboxMessage);
  }, [sessionName, limit]);

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ padding: '16px 22px' }}>
          <div className="flex gap-3 items-center" style={{ flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}>
              <select
                className="form-control"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              >
                <option value="">— Select device —</option>
                {devices.map((d) => (
                  <option key={d.token} value={d.token}>
                    {d.label || 'Unnamed'} ({d.session})
                  </option>
                ))}
              </select>
            </div>

            <select
              className="form-control"
              style={{ width: 120 }}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            >
              {[20, 50, 100, 200].map((n) => (
                <option key={n} value={n}>Last {n}</option>
              ))}
            </select>

            <button className="btn btn-secondary btn-sm" onClick={load} disabled={!token}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <InboxIcon size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Inbox
            {messages.length > 0 && (
              <span className="badge sent" style={{ marginLeft: 8 }}>{messages.length}</span>
            )}
          </span>
          <span className="text-muted text-sm">
            {sessionName ? 'Live updates via socket' : 'Select a device'}
          </span>
        </div>

        {!token ? (
          <div className="empty-state"><InboxIcon size={40} /><p>Select a device to view messages.</p></div>
        ) : loading && messages.length === 0 ? (
          <div className="empty-state"><div className="spinner spinner-lg" /></div>
        ) : messages.length === 0 ? (
          <div className="empty-state">
            <MessageCircle size={40} />
            <p>No messages received yet.</p>
          </div>
        ) : (
          <div className="inbox-list">
            {messages.map((msg, i) => {
              const from   = msg.from || '';
              const number = from.replace('@c.us', '');
              return (
                <div key={i} className="inbox-item">
                  <div className="inbox-avatar" style={{ background: avatarColor(from) }}>
                    {avatarLetter(from)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="inbox-from">+{number}</div>
                    <div className="inbox-body">{msg.body}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span className="inbox-time">{timeAgo(msg.receivedAt || msg.timestamp)}</span>
                    <span className="badge sent" style={{ fontSize: 10 }}>{msg.type || 'chat'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
