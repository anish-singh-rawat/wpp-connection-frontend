const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://168.144.144.141:8086';
const API_KEY = import.meta.env.VITE_API_KEY || '';

const headers = (extra = {}) => ({
  'Content-Type': 'application/json',
  'x-api-key': API_KEY,
  ...extra,
});

async function request(method, path, body, isFormData = false) {
  const opts = { method };
  if (isFormData) {
    opts.headers = { 'x-api-key': API_KEY };
    opts.body = body;
  } else {
    opts.headers = headers();
    if (body) opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE_URL}${path}`, opts);

  if (!res.ok) {
    // 413 from nginx/reverse-proxy returns HTML, not JSON — handle it explicitly
    if (res.status === 413) {
      throw new Error('File is too large for the server. Please use a file smaller than 16 MB.');
    }
    // Try to parse a JSON error body; fall back to a plain status message
    let errMsg = `Request failed (HTTP ${res.status})`;
    try {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        errMsg = data.error || data.message || errMsg;
      }
    } catch (_) {
      // ignore parse errors — use the fallback message above
    }
    throw new Error(errMsg);
  }

  return res.json();
}

export const checkHealth = () => request('GET', '/health');

export const createDevice = (label) => request('POST', '/devices', { label });
export const listDevices = () => request('GET', '/devices');
export const getDevice = (token) => request('GET', `/devices/${token}`);
export const deleteDevice = (token) => request('DELETE', `/devices/${token}`);

export const getSSEUrl     = (token) => `${BASE_URL}/devices/${token}/qrcode/events`;
export const getQRImageUrl = (token) => `${BASE_URL}/devices/${token}/qrcode/image`;
export const getQRPageUrl  = (token) => `${BASE_URL}/devices/${token}/qrcode/page`;
export const getQRStatusUrl = (token) => `${BASE_URL}/devices/${token}/qrcode/status`;
export const getQRStatus   = (token) =>
  fetch(`${BASE_URL}/devices/${token}/qrcode/status`).then((r) => r.json());

export const sendMessage = (token, number, message, link = '') => {
  const body = { number, message };
  if (link && link.trim()) body.link = link.trim();
  return request('POST', `/devices/${token}/send`, body);
};

export const sendMediaMessage = (token, number, mediaFile, message = '', link = '') => {
  const fd = new FormData();
  fd.append('media', mediaFile);
  fd.append('number', number);
  if (message.trim()) fd.append('message', message.trim());
  if (link.trim())    fd.append('link', link.trim());
  return request('POST', `/devices/${token}/send-media`, fd, true);
};

export const bulkSend = (token, numbers, message, link = '') => {
  const body = { numbers, message };
  if (link && link.trim()) body.link = link.trim();
  return request('POST', `/devices/${token}/bulk-send`, body);
};

export const bulkSendMedia = (token, numbers, mediaFile, message = '', link = '') => {
  const fd = new FormData();
  fd.append('media', mediaFile);
  fd.append('numbers', JSON.stringify(numbers));
  if (message.trim()) fd.append('message', message.trim());
  if (link.trim())    fd.append('link', link.trim());
  return request('POST', `/devices/${token}/bulk-send-media`, fd, true);
};

export const bulkSendCSV = (token, file, message) => {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('message', message);
  return request('POST', `/devices/${token}/bulk-send/csv`, fd, true);
};

export const getQueue = (token, status = 'all') =>
  fetch(`${BASE_URL}/devices/${token}/queue?status=${status}`).then((r) => r.json());

export const getJob = (token, jobId) =>
  fetch(`${BASE_URL}/devices/${token}/queue/${jobId}`).then((r) => r.json());

export const getMessages = (token, limit = 50) =>
  fetch(`${BASE_URL}/devices/${token}/messages?limit=${limit}`).then((r) => r.json());

export const formatNumber = (raw) => raw.replace(/\D/g, '');

export const parseNumbers = (text) =>
  text
    .split(/[\n,;]+/)
    .map((n) => n.replace(/\D/g, ''))
    .filter((n) => n.length >= 10);

export { BASE_URL };
