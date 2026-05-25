import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, PlusCircle, Send, Users, ListOrdered,
  Inbox, MessageSquare,
} from 'lucide-react';
import { checkHealth } from '../api';
import socket from '../socket';

const NAV = [
  { label: 'Dashboard',    icon: LayoutDashboard, to: '/' },
  { label: 'Add Device',   icon: PlusCircle,      to: '/add-device' },
  { label: 'Send Message', icon: Send,            to: '/send' },
  { label: 'Bulk Send',    icon: Users,           to: '/bulk' },
  { label: 'Queue',        icon: ListOrdered,     to: '/queue' },
  { label: 'Inbox',        icon: Inbox,           to: '/inbox' },
];

export default function Sidebar() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    checkHealth()
      .then(() => setHealth('ok'))
      .catch(() => setHealth('fail'));

    const onConnect    = () => setHealth('ok');
    const onDisconnect = () => setHealth('fail');
    const onHealth     = () => setHealth('ok');

    if (socket.connected) setHealth('ok');

    socket.on('connect',    onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('health',     onHealth);

    return () => {
      socket.off('connect',    onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('health',     onHealth);
    };
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
        {NAV.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
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
