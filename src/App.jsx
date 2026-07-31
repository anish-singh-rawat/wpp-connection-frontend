import { Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';

import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';

import Login       from './pages/Login';
import Dashboard   from './pages/Dashboard';
import AddDevice   from './pages/AddDevice';
import SendMessage from './pages/SendMessage';
import BulkSend    from './pages/BulkSend';
import Queue       from './pages/Queue';
import Inbox       from './pages/Inbox';
import Profile     from './pages/Profile';
import SubCustomers from './pages/SubCustomers';
import ApiToken    from './pages/ApiToken';
import Customers   from './pages/admin/Customers';

const PAGE_META = {
  '':             { title: 'Dashboard',     sub: 'Overview of your WhatsApp devices' },
  'add-device':   { title: 'Add Device',    sub: 'Connect a new WhatsApp account via QR code' },
  send:           { title: 'Send Message',  sub: 'Send a single WhatsApp message' },
  bulk:           { title: 'Bulk Send',     sub: 'Send messages to multiple numbers at once' },
  queue:          { title: 'Queue Monitor', sub: 'Track the status of your bulk message jobs' },
  inbox:          { title: 'Inbox',         sub: 'View incoming messages from your devices' },
  'sub-customers':{ title: 'Sub Customers', sub: 'Manage your sub-customer accounts' },
  'api-token':    { title: 'API Token',     sub: 'Manage your external API access token' },
  'api-tokens':   { title: 'API Tokens',    sub: 'Manage all customer API tokens' },
  customers:      { title: 'Customers',     sub: 'Manage all customer accounts' },
  profile:        { title: 'Profile',       sub: 'Update your account information' },
};

function getMeta(pathname) {
  const segments = pathname.replace(/^\//, '').split('/');
  // segments[0] = root prefix (admin, dashboard, sub-customer), segments[1] = page key
  const key = segments.length > 1 ? segments[1] : '';
  return PAGE_META[key] || PAGE_META[''];
}

// ── App layout shell ──────────────────────────────────────────────────────────
function AppLayout() {
  const location = useLocation();
  const { user, role } = useAuth();
  const meta = getMeta(location.pathname);

  const roleLabel = {
    SUPER_ADMIN:  { text: 'Super Admin', color: '#7c3aed', bg: 'rgba(139,92,246,.12)' },
    CUSTOMER:     { text: 'Customer',    color: '#0a7a3e', bg: 'rgba(37,211,102,.12)' },
    SUB_CUSTOMER: { text: 'Sub Customer',color: '#1d4ed8', bg: 'rgba(59,130,246,.12)' },
  }[role] || {};

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <header className="topbar">
          <div>
            <div className="topbar-title">{meta.title}</div>
            <div className="topbar-sub">{meta.sub}</div>
          </div>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                background: roleLabel.bg, color: roleLabel.color, whiteSpace: 'nowrap',
              }}>
                {roleLabel.text}
              </span>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'var(--green)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0,
              }}>
                {(user.name || 'U')[0].toUpperCase()}
              </div>
            </div>
          )}
        </header>
        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function RoleRedirect() {
  const { isAuthenticated, role } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role === 'SUPER_ADMIN')  return <Navigate to="/admin"        replace />;
  if (role === 'SUB_CUSTOMER') return <Navigate to="/sub-customer" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/"      element={<RoleRedirect />} />

        {/* ── SUPER_ADMIN ─────────────────────────────────────────────── */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
            <AppLayout />
          </ProtectedRoute>
        }>
          <Route index                  element={<Dashboard />} />
          <Route path="customers"       element={<Customers />} />
          <Route path="sub-customers"   element={<SubCustomers />} />
          <Route path="api-tokens"      element={<ApiToken />} />
          <Route path="add-device"      element={<AddDevice />} />
          <Route path="add-device/:token" element={<AddDevice />} />
          <Route path="send"            element={<SendMessage />} />
          <Route path="bulk"            element={<BulkSend />} />
          <Route path="queue"           element={<Queue />} />
          <Route path="inbox"           element={<Inbox />} />
          <Route path="profile"         element={<Profile />} />
        </Route>

        {/* ── CUSTOMER ────────────────────────────────────────────────── */}
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={['CUSTOMER']}>
            <AppLayout />
          </ProtectedRoute>
        }>
          <Route index                  element={<Dashboard />} />
          <Route path="sub-customers"   element={<SubCustomers />} />
          <Route path="api-token"       element={<ApiToken />} />
          <Route path="add-device"      element={<AddDevice />} />
          <Route path="add-device/:token" element={<AddDevice />} />
          <Route path="send"            element={<SendMessage />} />
          <Route path="bulk"            element={<BulkSend />} />
          <Route path="queue"           element={<Queue />} />
          <Route path="inbox"           element={<Inbox />} />
          <Route path="profile"         element={<Profile />} />
        </Route>

        {/* ── SUB_CUSTOMER ────────────────────────────────────────────── */}
        <Route path="/sub-customer" element={
          <ProtectedRoute allowedRoles={['SUB_CUSTOMER']}>
            <AppLayout />
          </ProtectedRoute>
        }>
          <Route index                  element={<Dashboard />} />
          <Route path="add-device"      element={<AddDevice />} />
          <Route path="add-device/:token" element={<AddDevice />} />
          <Route path="send"            element={<SendMessage />} />
          <Route path="bulk"            element={<BulkSend />} />
          <Route path="queue"           element={<Queue />} />
          <Route path="inbox"           element={<Inbox />} />
          <Route path="profile"         element={<Profile />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<RoleRedirect />} />
      </Routes>

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
    </>
  );
}
