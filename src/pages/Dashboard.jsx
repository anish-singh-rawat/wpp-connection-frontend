import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, CheckCircle, AlertCircle, Trash2, Send, ListOrdered, RefreshCw, PlusCircle } from 'lucide-react';
import { listDevices, deleteDevice } from '../api';
import StatusBadge from '../components/StatusBadge';
import socket from '../socket';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await listDevices();
      setDevices(data.devices || []);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const onDevicesUpdate = () => load();

    const onDeviceStatus = ({ token, status, isReady }) => {
      setDevices((prev) =>
        prev.map((d) => (d.token === token ? { ...d, status, isReady } : d))
      );
    };

    const onDeviceConnected = ({ token }) => {
      setDevices((prev) =>
        prev.map((d) => (d.token === token ? { ...d, status: 'connected', isReady: true } : d))
      );
    };

    socket.on('devices:update',   onDevicesUpdate);
    socket.on('device:status',    onDeviceStatus);
    socket.on('device:connected', onDeviceConnected);

    return () => {
      socket.off('devices:update',   onDevicesUpdate);
      socket.off('device:status',    onDeviceStatus);
      socket.off('device:connected', onDeviceConnected);
    };
  }, [load]);

  const handleDelete = async (token, label) => {
    if (!confirm(`Remove device "${label}"?`)) return;
    setDeleting(token);
    try {
      const data = await deleteDevice(token);
      toast.success(data.message || 'Device removed');
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDeleting(null);
    }
  };

  const connected = devices.filter((d) => d.isReady).length;
  const pending   = devices.filter((d) => !d.isReady).length;

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon green"><Smartphone size={22} /></div>
          <div>
            <div className="stat-value">{devices.length}</div>
            <div className="stat-label">Total Devices</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><CheckCircle size={22} /></div>
          <div>
            <div className="stat-value">{connected}</div>
            <div className="stat-label">Connected</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><AlertCircle size={22} /></div>
          <div>
            <div className="stat-value">{pending}</div>
            <div className="stat-label">Pending / Offline</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Devices</span>
          <div className="flex gap-2">
            <button className="btn btn-secondary btn-sm" onClick={load}>
              <RefreshCw size={14} /> Refresh
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/add-device')}>
              <PlusCircle size={14} /> Add Device
            </button>
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><div className="spinner spinner-lg" /></div>
        ) : devices.length === 0 ? (
          <div className="empty-state">
            <Smartphone size={48} />
            <p>No devices yet. Add your first device to get started.</p>
            <button className="btn btn-primary" onClick={() => navigate('/add-device')}>
              <PlusCircle size={16} /> Add Device
            </button>
          </div>
        ) : (
          <div className="card-body">
            <div className="devices-grid">
              {devices.map((d) => (
                <div key={d.token} className="device-card">
                  <div className="device-card-header">
                    <div className="device-avatar">
                      {(d.label || 'D')[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="device-name">{d.label || 'Unnamed Device'}</div>
                      <div className="device-token">{d.token.slice(0, 18)}…</div>
                    </div>
                    <StatusBadge status={d.status} />
                  </div>

                  <div className="device-card-body">
                    <div className="flex gap-2 items-center text-sm text-muted">
                      <span>Session:</span>
                      <span className="mono">{d.session}</span>
                    </div>
                    <div className="flex gap-2 items-center text-sm text-muted" style={{ marginTop: 6 }}>
                      <span>Created:</span>
                      <span>{new Date(d.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="device-card-footer">
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={d.status !== 'connected'}
                      onClick={() => navigate('/send', { state: { device: d } })}
                    >
                      <Send size={13} /> Send
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => navigate('/queue', { state: { device: d } })}
                    >
                      <ListOrdered size={13} /> Queue
                    </button>
                    {d.status === 'qr_ready' && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate(`/add-device/${d.token}`, { state: { device: d } })}
                      >
                        Scan QR
                      </button>
                    )}
                    <button
                      className="btn btn-danger btn-sm"
                      disabled={deleting === d.token}
                      onClick={() => handleDelete(d.token, d.label)}
                      style={{ marginLeft: 'auto' }}
                    >
                      {deleting === d.token
                        ? <span className="spinner" style={{ width: 13, height: 13 }} />
                        : <Trash2 size={13} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
