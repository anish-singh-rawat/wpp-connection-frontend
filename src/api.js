const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8086';


function getJwt()     { return localStorage.getItem('wpp_jwt')     || ''; }
function getRefresh() { return localStorage.getItem('wpp_refresh') || ''; }

function authHeaders(extra = {}) {
  const jwt = getJwt();
  return {
    'Content-Type': 'application/json',
    ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    ...extra,
  };
}

function authFormHeaders() {
  const jwt = getJwt();
  return jwt ? { Authorization: `Bearer ${jwt}` } : {};
}


async function request(method, path, body, isFormData = false) {
  const opts = { method };

  if (isFormData) {
    opts.headers = authFormHeaders();
    opts.body    = body;
  } else {
    opts.headers = authHeaders();
    if (body) opts.body = JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}${path}`, opts);

  if (!res.ok) {
    if (res.status === 413) {
      throw new Error('File is too large. Please use a file smaller than 16 MB.');
    }

    
    if (res.status === 401 && path !== '/auth/login' && path !== '/auth/refresh') {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        
        return request(method, path, body, isFormData);
      }
      
      localStorage.removeItem('wpp_jwt');
      localStorage.removeItem('wpp_refresh');
      localStorage.removeItem('wpp_user');
      window.location.href = '/login';
      throw new Error('Session expired. Please log in again.');
    }

    let errMsg = `Request failed (HTTP ${res.status})`;
    try {
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const data = await res.json();
        errMsg = data.error || data.message || errMsg;
      }
    } catch (_) {}
    throw new Error(errMsg);
  }

  return res.json();
}

async function tryRefreshToken() {
  const refresh = getRefresh();
  if (!refresh) return false;

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    if (data.data?.token) {
      localStorage.setItem('wpp_jwt', data.data.token);
      if (data.data.refreshToken) {
        localStorage.setItem('wpp_refresh', data.data.refreshToken);
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
}


export const loginApi         = (email, password)  => request('POST', '/auth/login',           { email, password });
export const getMe            = ()                 => request('GET',  '/auth/me');
export const updateProfile    = (name)             => request('PUT',  '/auth/profile',          { name });
export const changePassword   = (currentPassword, newPassword) =>
  request('PUT', '/auth/change-password', { currentPassword, newPassword });
export const refreshTokenApi  = ()                 => request('POST', '/auth/refresh',          { refreshToken: getRefresh() });
export const logoutApi        = ()                 => request('POST', '/auth/logout');


export const checkHealth = ()       => request('GET',    '/health');
export const createDevice = (label) => request('POST',   '/devices',        { label });
export const listDevices  = ()      => request('GET',    '/devices');
export const getDevice    = (token) => request('GET',    `/devices/${token}`);
export const deleteDevice = (token) => request('DELETE', `/devices/${token}`);


export const getSSEUrl      = (token) => {
  const jwt = getJwt();
  return `${BASE_URL}/devices/${token}/qrcode/events${jwt ? `?token=${encodeURIComponent(jwt)}` : ''}`;
};
export const getQRImageUrl  = (token) => {
  const jwt = getJwt();
  return `${BASE_URL}/devices/${token}/qrcode/image${jwt ? `?token=${encodeURIComponent(jwt)}` : ''}`;
};
export const getQRPageUrl   = (token) => `${BASE_URL}/devices/${token}/qrcode/page`;
export const getQRStatusUrl = (token) => `${BASE_URL}/devices/${token}/qrcode/status`;
export const getQRStatus    = (token) =>
  request('GET', `/devices/${token}/qrcode/status`);


export const sendMessage = (token, number, message, link = '') => {
  const body = { number, message };
  if (link?.trim()) body.link = link.trim();
  return request('POST', `/devices/${token}/send`, body);
};

export const sendMediaMessage = (token, number, mediaFile, message = '', link = '') => {
  const fd = new FormData();
  fd.append('media', mediaFile);
  fd.append('number', number);
  if (message?.trim()) fd.append('message', message.trim());
  if (link?.trim())    fd.append('link',    link.trim());
  return request('POST', `/devices/${token}/send-media`, fd, true);
};

export const bulkSend = (token, numbers, message, link = '') => {
  const body = { numbers, message };
  if (link?.trim()) body.link = link.trim();
  return request('POST', `/devices/${token}/bulk-send`, body);
};

export const bulkSendMedia = (token, numbers, mediaFile, message = '', link = '') => {
  const fd = new FormData();
  fd.append('media', mediaFile);
  fd.append('numbers', JSON.stringify(numbers));
  if (message?.trim()) fd.append('message', message.trim());
  if (link?.trim())    fd.append('link',    link.trim());
  return request('POST', `/devices/${token}/bulk-send-media`, fd, true);
};

export const bulkSendCSV = (token, file, message) => {
  const fd = new FormData();
  fd.append('file', file);
  if (message) fd.append('message', message);
  return request('POST', `/devices/${token}/bulk-send/csv`, fd, true);
};

export const getQueue    = (token, status = 'all') =>
  request('GET', `/devices/${token}/queue?status=${status}`);

export const getJob      = (token, jobId) =>
  request('GET', `/devices/${token}/queue/${jobId}`);

export const getMessages = (token, limit = 50) =>
  request('GET', `/devices/${token}/messages?limit=${limit}`);


export const listCustomers   = (params = '') => request('GET',    `/customers${params ? '?' + params : ''}`);
export const getCustomer     = (id)          => request('GET',    `/customers/${id}`);
export const createCustomer  = (data)        => request('POST',   '/customers',          data);
export const updateCustomer  = (id, data)    => request('PUT',    `/customers/${id}`,    data);
export const deleteCustomer  = (id)          => request('DELETE', `/customers/${id}`);
export const suspendCustomer = (id)          => request('POST',   `/customers/${id}/suspend`);
export const activateCustomer= (id)          => request('POST',   `/customers/${id}/activate`);
export const resetCustomerPassword = (id, newPassword) =>
  request('POST', `/customers/${id}/reset-password`, { newPassword });


export const listSubCustomers   = (params = '') => request('GET',    `/sub-customers${params ? '?' + params : ''}`);
export const getSubCustomer     = (id)          => request('GET',    `/sub-customers/${id}`);
export const createSubCustomer  = (data)        => request('POST',   '/sub-customers',          data);
export const updateSubCustomer  = (id, data)    => request('PUT',    `/sub-customers/${id}`,    data);
export const deleteSubCustomer  = (id)          => request('DELETE', `/sub-customers/${id}`);
export const suspendSubCustomer = (id)          => request('POST',   `/sub-customers/${id}/suspend`);
export const activateSubCustomer= (id)          => request('POST',   `/sub-customers/${id}/activate`);
export const resetSubCustomerPassword = (id, newPassword) =>
  request('POST', `/sub-customers/${id}/reset-password`, { newPassword });


export const getMyTokenInfo   = ()     => request('GET',  '/api-tokens/my');
export const generateMyToken  = ()     => request('POST', '/api-tokens/my/generate');
export const regenerateMyToken= ()     => request('POST', '/api-tokens/my/regenerate');
export const enableMyToken    = ()     => request('POST', '/api-tokens/my/enable');
export const disableMyToken   = ()     => request('POST', '/api-tokens/my/disable');

export const listAllTokens    = ()     => request('GET',  '/api-tokens');
export const getTokenInfoFor  = (id)   => request('GET',  `/api-tokens/${id}`);
export const generateTokenFor = (id)   => request('POST', `/api-tokens/${id}/generate`);
export const regenerateTokenFor=(id)   => request('POST', `/api-tokens/${id}/regenerate`);
export const enableTokenFor   = (id)   => request('POST', `/api-tokens/${id}/enable`);
export const disableTokenFor  = (id)   => request('POST', `/api-tokens/${id}/disable`);


export const formatNumber = (raw) => raw.replace(/\D/g, '');

export const parseNumbers = (text) =>
  text
    .split(/[\n,;]+/)
    .map((n) => n.replace(/\D/g, ''))
    .filter((n) => n.length >= 10);

export { BASE_URL };
