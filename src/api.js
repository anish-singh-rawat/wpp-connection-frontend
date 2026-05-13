const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8086';
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const checkHealth = () => request('GET', '/health');

export const createDevice = (label) => request('POST', '/devices', { label });
export const listDevices = () => request('GET', '/devices');
export const getDevice = (token) => request('GET', `/devices/${token}`);
export const deleteDevice = (token) => request('DELETE', `/devices/${token}`);

export const getSSEUrl = (token) => `${BASE_URL}/devices/${token}/qrcode/events`;
export const getQRImageUrl = (token) => `${BASE_URL}/devices/${token}/qrcode/image`;
export const getQRStatusUrl = (token) => `${BASE_URL}/devices/${token}/qrcode/status`;
export const getQRStatus = (token) =>
  fetch(`${BASE_URL}/devices/${token}/qrcode/status`).then((r) => r.json());

export const sendMessage = (token, number, message) => request('POST', `/devices/${token}/send`, { number, message });

export const bulkSend = (token, numbers, message) => request('POST', `/devices/${token}/bulk-send`, { numbers, message });

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
