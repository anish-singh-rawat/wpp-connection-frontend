import { useEffect, useState } from 'react';
import {
  LayoutDashboard, PlusCircle, Send, Users, ListOrdered,
  Inbox, MessageSquare, Wifi, WifiOff,
} from 'lucide-react';
import { checkHealth } from '../api';

const NAV = [
  { label: 'Dashboard',   icon: LayoutDashboard, page: 'dashboard' },
  { label: 'Add Device',  icon: PlusCircle,       page: 'add-device' },
  { label: 'Send Message',icon: Send,             page: 'send' },
  { label: 'Bulk Send',   icon: Users,            page: 'bulk' },
  { label: 'Queue',       icon: ListOrdered,      page: 'queue' },
  { label: 'Inbox',       icon: Inbox,            page: 'inbox' },
];

export default function Sidebar({ current, onNav }) {
  const [health, setHealth] = useState(null); // null | 'ok' | 'fail'

  useEffect(() => {
    const ping = async () => {
      try {
        await checkHealth();
        setHealth('ok');
      } catch {
        setHealth('fail');
      }
    };
    ping();
    const id = setInterval(ping, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <MessageSquare size={20} />
        </div>
        <div>
          <div className="sidebar-logo-text">WPPConnect</div>
          <div className="sidebar-logo-sub">WhatsApp API</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {NAV.map(({ label, icon: Icon, page }) => (
          <button
            key={page}
            className={`nav-item${current === page ? ' active' : ''}`}
            onClick={() => onNav(page)}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span className={`health-dot${health === 'ok' ? ' ok' : health === 'fail' ? ' fail' : ''}`} />
        <span className="health-label">
          {health === 'ok' ? 'Server online' : health === 'fail' ? 'Server offline' : 'Checking…'}
        </span>
      </div>
    </aside>
  );
}
