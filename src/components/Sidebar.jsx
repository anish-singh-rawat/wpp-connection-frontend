import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, PlusCircle, Send, Users, ListOrdered,
  Inbox, MessageSquare, ShieldCheck, UserCircle, Key,
  LogOut, Settings, UserCog,
} from 'lucide-react';
import { checkHealth, logoutApi } from '../api';
import { useAuth } from '../context/AuthContext';
import socket from '../socket';
import toast from 'react-hot-toast';

const NAV_SUPER_ADMIN = [
  { section: 'Overview' },
  { label: 'Dashboard',     icon: LayoutDashboard, to: '/admin' },
  { section: 'Management' },
  { label: 'Customers',     icon: ShieldCheck,     to: '/admin/customers' },
  { label: 'Sub Customers', icon: UserCog,         to: '/admin/sub-customers' },
  { label: 'API Tokens',    icon: Key,             to: '/admin/api-tokens' },
  { section: 'WhatsApp' },
  { label: 'Add Device',    icon: PlusCircle,      to: '/admin/add-device' },
  { label: 'Send Message',  icon: Send,            to: '/admin/send' },
  { label: 'Bulk Send',     icon: Users,           to: '/admin/bulk' },
  { label: 'Queue',         icon: ListOrdered,     to: '/admin/queue' },
  { label: 'Inbox',         icon: Inbox,           to: '/admin/inbox' },
  { section: 'Account' },
  { label: 'Profile',       icon: UserCircle,      to: '/admin/profile' },
];

const NAV_CUSTOMER = [
  { section: 'Overview' },
  { label: 'Dashboard',     icon: LayoutDashboard, to: '/dashboard' },
  { section: 'WhatsApp' },
  { label: 'Add Device',    icon: PlusCircle,      to: '/dashboard/add-device' },
  { label: 'Send Message',  icon: Send,            to: '/dashboard/send' },
  { label: 'Bulk Send',     icon: Users,           to: '/dashboard/bulk' },
  { label: 'Queue',         icon: ListOrdered,     to: '/dashboard/queue' },
  { label: 'Inbox',         icon: Inbox,           to: '/dashboard/inbox' },
  { section: 'Management' },
  { label: 'Sub Customers', icon: UserCog,         to: '/dashboard/sub-customers' },
  { label: 'API Token',     icon: Key,             to: '/dashboard/api-token' },
  { section: 'Account' },
  { label: 'Profile',       icon: UserCircle,      to: '/dashboard/profile' },
];

const NAV_SUB_CUSTOMER = [
  { section: 'Overview' },
  { label: 'Dashboard',     icon: LayoutDashboard, to: '/sub-customer' },
  { section: 'WhatsApp' },
  { label: 'Add Device',    icon: PlusCircle,      to: '/sub-customer/add-device' },
  { label: 'Send Message',  icon: Send,            to: '/sub-customer/send' },
  { label: 'Bulk Send',     icon: Users,           to: '/sub-customer/bulk' },
  { label: 'Queue',         icon: ListOrdered,     to: '/sub-customer/queue' },
  { label: 'Inbox',         icon: Inbox,           to: '/sub-customer/inbox' },
  { section: 'Account' },
  { label: 'Profile',       icon: UserCircle,      to: '/sub-customer/profile' },
];

function getNav(role) {
  if (role === 'SUPER_ADMIN')   return NAV_SUPER_ADMIN;
  if (role === 'SUB_CUSTOMER')  return NAV_SUB_CUSTOMER;
  return NAV_CUSTOMER; 
}

export default function Sidebar() {
  const { user, role, logout } = useAuth();
  const navigate    = useNavigate();
  const [health, setHealth] = useState(null);

  useEffect(() => {
    checkHealth()
      .then(() => setHealth('ok'))
      .catch(() => setHealth('fail'));

    const onConnect    = () => setHealth('ok');
    const onDisconnect = () => setHealth('fail');
    if (socket.connected) setHealth('ok');
    socket.on('connect',    onConnect);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('connect',    onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  const handleLogout = async () => {
    try { await logoutApi(); } catch (_) {}
    logout();
    toast.success('Signed out.');
    navigate('/login', { replace: true });
  };

  const nav = getNav(role);

  const roleBadgeStyle = {
    SUPER_ADMIN:  { bg: 'rgba(139,92,246,.15)', color: '#7c3aed', label: 'Super Admin' },
    CUSTOMER:     { bg: 'rgba(37,211,102,.12)', color: '#0a7a3e', label: 'Customer' },
    SUB_CUSTOMER: { bg: 'rgba(59,130,246,.12)', color: '#1d4ed8', label: 'Sub Customer' },
  }[role] || { bg: 'transparent', color: 'var(--sidebar-sub)', label: role };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <MessageSquare size={20} />
        </div>
        <div>
          <div className="sidebar-logo-text">WPPConnect</div>
          <div className="sidebar-logo-sub">WhatsApp API</div>
        </div>
      </div>

      {/* User info */}
      {user && (
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,.06)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'var(--green)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0,
          }}>
            {(user.name || 'U')[0].toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--sidebar-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.name}
            </div>
            <div style={{
              fontSize: 10, fontWeight: 600,
              background: roleBadgeStyle.bg,
              color: roleBadgeStyle.color,
              borderRadius: 4, padding: '1px 6px',
              display: 'inline-block', marginTop: 2,
            }}>
              {roleBadgeStyle.label}
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="sidebar-nav">
        {nav.map((item, i) => {
          if (item.section) {
            return <div key={`sec-${i}`} className="nav-section-label">{item.section}</div>;
          }
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to.split('/').length <= 2}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span className={`health-dot${health === 'ok' ? ' ok' : health === 'fail' ? ' fail' : ''}`} />
          <span className="health-label">
            {health === 'ok' ? 'Online' : health === 'fail' ? 'Offline' : 'Checking…'}
          </span>
        </div>
        <button
          onClick={handleLogout}
          title="Sign out"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--sidebar-sub)', padding: 4, borderRadius: 6,
            display: 'flex', alignItems: 'center',
          }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
