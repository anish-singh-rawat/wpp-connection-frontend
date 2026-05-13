const STATUS_LABELS = {
  connected:    'Connected',
  qr_ready:     'Scan QR Code',
  qr_pending:   'Waiting for QR',
  launching:    'Starting…',
  retrying:     'Reconnecting…',
  disconnected: 'Disconnected',
  pending:      'Pending',
  sending:      'Sending',
  sent:         'Sent',
  failed:       'Failed',
  duplicate:    'Duplicate',
};

function statusClass(status = '') {
  if (!status) return 'disconnected';
  const s = status.toLowerCase();
  if (s.startsWith('loading')) return 'loading';
  return s.replace(/\s+/g, '_');
}

export default function StatusBadge({ status }) {
  const cls = statusClass(status);
  const label = STATUS_LABELS[cls] || status;
  return (
    <span className={`badge ${cls}`}>
      <span className="badge-dot" />
      {label}
    </span>
  );
}
