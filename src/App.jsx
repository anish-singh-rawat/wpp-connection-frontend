import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import AddDevice from './pages/AddDevice';
import SendMessage from './pages/SendMessage';
import BulkSend from './pages/BulkSend';
import Queue from './pages/Queue';
import Inbox from './pages/Inbox';

const PAGE_TITLES = {
  dashboard:  { title: 'Dashboard',    sub: 'Overview of all your WhatsApp devices' },
  'add-device': { title: 'Add Device', sub: 'Connect a new WhatsApp account via QR code' },
  send:       { title: 'Send Message', sub: 'Send a single WhatsApp message' },
  bulk:       { title: 'Bulk Send',    sub: 'Send messages to multiple numbers at once' },
  queue:      { title: 'Queue Monitor',sub: 'Track the status of your bulk message jobs' },
  inbox:      { title: 'Inbox',        sub: 'View incoming messages from your devices' },
};

export default function App() {
  const [page, setPage]               = useState('dashboard');
  const [selectedDevice, setSelectedDevice] = useState(null);

  const { title, sub } = PAGE_TITLES[page] || PAGE_TITLES.dashboard;

  const handleNav = (p) => setPage(p);

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return (
          <Dashboard
            onNav={handleNav}
            onSelectDevice={setSelectedDevice}
          />
        );
      case 'add-device':
        return (
          <AddDevice
            prefill={selectedDevice?.isReady === false ? selectedDevice : null}
            onNav={handleNav}
          />
        );
      case 'send':
        return <SendMessage selectedDevice={selectedDevice} />;
      case 'bulk':
        return (
          <BulkSend
            selectedDevice={selectedDevice}
            onNav={handleNav}
            onSelectDevice={setSelectedDevice}
          />
        );
      case 'queue':
        return <Queue selectedDevice={selectedDevice} />;
      case 'inbox':
        return <Inbox selectedDevice={selectedDevice} />;
      default:
        return <Dashboard onNav={handleNav} onSelectDevice={setSelectedDevice} />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar current={page} onNav={handleNav} />

      <div className="main-content">
        <header className="topbar">
          <div>
            <div className="topbar-title">{title}</div>
            <div className="topbar-sub">{sub}</div>
          </div>
          {selectedDevice && (
            <div className="flex items-center gap-2">
              <span className="text-muted text-sm">Active device:</span>
              <span
                className="badge connected"
                style={{ cursor: 'pointer' }}
                onClick={() => handleNav('dashboard')}
              >
                <span className="badge-dot" />
                {selectedDevice.label || selectedDevice.session}
              </span>
            </div>
          )}
        </header>

        <main className="page">
          {renderPage()}
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
