import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import AddDevice from './pages/AddDevice';
import SendMessage from './pages/SendMessage';
import BulkSend from './pages/BulkSend';
import Queue from './pages/Queue';
import Inbox from './pages/Inbox';

const PAGE_META = {
  '/':           { title: 'Dashboard',     sub: 'Overview of all your WhatsApp devices' },
  '/add-device': { title: 'Add Device',    sub: 'Connect a new WhatsApp account via QR code' },
  '/send':       { title: 'Send Message',  sub: 'Send a single WhatsApp message' },
  '/bulk':       { title: 'Bulk Send',     sub: 'Send messages to multiple numbers at once' },
  '/queue':      { title: 'Queue Monitor', sub: 'Track the status of your bulk message jobs' },
  '/inbox':      { title: 'Inbox',         sub: 'View incoming messages from your devices' },
};

export default function App() {
  const location = useLocation();

  const metaKey = location.pathname.startsWith('/add-device')
    ? '/add-device'
    : location.pathname;

  const { title, sub } = PAGE_META[metaKey] || PAGE_META['/'];

  const device = location.state?.device || null;

  return (
    <div className="app-layout">
      <Sidebar />

      <div className="main-content">
        <header className="topbar">
          <div>
            <div className="topbar-title">{title}</div>
            <div className="topbar-sub">{sub}</div>
          </div>
          {device && (
            <div className="flex items-center gap-2">
              <span className="text-muted text-sm">Active device:</span>
              <span className="badge connected">
                <span className="badge-dot" />
                {device.label || device.session}
              </span>
            </div>
          )}
        </header>

        <main className="page">
          <Routes>
            <Route path="/"            element={<Dashboard />} />
            <Route path="/add-device"  element={<AddDevice />} />
            <Route path="/add-device/:token" element={<AddDevice />} />
            <Route path="/send"        element={<SendMessage />} />
            <Route path="/bulk"        element={<BulkSend />} />
            <Route path="/queue"       element={<Queue />} />
            <Route path="/inbox"       element={<Inbox />} />
            <Route path="*"            element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: '10px',
            background: '#1a202c',
            color: '#f7fafc',
            fontSize: '13px',
          },
          success: { iconTheme: { primary: '#25d366', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </div>
  );
}
