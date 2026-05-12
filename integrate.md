# Frontend Integration Guide — WPPConnect WhatsApp API

This document covers everything a frontend developer needs to integrate with the backend:
exact request formats, response shapes, headers, error codes, UI recommendations, and flow diagrams.

---

## Base Configuration

```
Base URL (local):       http://localhost:8086
Base URL (production):  http://YOUR_SERVER_IP:8086
                        https://your-domain.com  (after nginx + SSL)
```

### Required Headers

| Endpoint type | Header | Value |
|---|---|---|
| Device management | `x-api-key` | Your master API key from `.env` |
| Device messaging | *(none)* | Token is in the URL path |
| All POST/PUT | `Content-Type` | `application/json` |
| CSV upload | `Content-Type` | `multipart/form-data` *(set by browser automatically)* |

---

## Authentication Model

```
┌─────────────────────────────────────────────────────┐
│  MASTER API KEY  (stored securely on your frontend) │
│  Used for: create device, list devices, delete      │
│  Header: x-api-key: YOUR_KEY                        │
└─────────────────────────────────────────────────────┘
                        │
                        ▼ creates
┌─────────────────────────────────────────────────────┐
│  DEVICE TOKEN  (UUID, returned on device creation)  │
│  Used for: QR scan, send messages, queue, inbox     │
│  Location: in URL path  /devices/:token/...         │
│  Store per-user in your DB or localStorage          │
└─────────────────────────────────────────────────────┘
```

---

## Complete API Reference

---

### 1. Health Check

```
GET /health
Auth: none
```

**Response `200`:**
```json
{
  "status": "ok",
  "env": "production",
  "uptime": 3600.5
}
```

**Frontend use:** Ping this on app load to confirm backend is reachable. Show a connection indicator.

---

### 2. Create Device

```
POST /devices
Content-Type: application/json
x-api-key: YOUR_API_KEY
```

**Request body:**
```json
{
  "label": "My iPhone"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `label` | string | No | Human-readable name for this device |

**Response `201`:**
```json
{
  "success": true,
  "message": "Device created. Open the qrcode_url in your browser to scan.",
  "device": {
    "token": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "label": "My iPhone",
    "session": "device-a1b2c3d4",
    "createdAt": "2026-05-11T10:00:00.000Z",
    "qrcode_url": "/devices/a1b2c3d4-e5f6-7890-abcd-ef1234567890/qrcode",
    "status_url": "/devices/a1b2c3d4-e5f6-7890-abcd-ef1234567890/qrcode/status"
  }
}
```

**Error `401`:**
```json
{
  "success": false,
  "error": "Unauthorized. Invalid or missing API key."
}
```

**Frontend action after success:**
1. Save `device.token` — you need it for all future calls
2. Open `device.qrcode_url` in an iframe or redirect to QR scan page
3. Poll `device.status_url` every 3s until `isReady: true`

---

### 3. List All Devices

```
GET /devices
x-api-key: YOUR_API_KEY
```

**Response `200`:**
```json
{
  "success": true,
  "count": 2,
  "devices": [
    {
      "token": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "label": "My iPhone",
      "session": "device-a1b2c3d4",
      "createdAt": "2026-05-11T10:00:00.000Z",
      "status": "connected",
      "isReady": true,
      "qrcode_url": "/devices/a1b2c3d4-.../qrcode"
    },
    {
      "token": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "label": "Office Phone",
      "session": "device-b2c3d4e5",
      "createdAt": "2026-05-11T11:00:00.000Z",
      "status": "qr_ready",
      "isReady": false,
      "qrcode_url": "/devices/b2c3d4e5-.../qrcode"
    }
  ]
}
```

**Session status values:**

| Value | UI label | Color |
|---|---|---|
| `launching` | Starting… | Yellow |
| `loading (50%)` | Loading 50% | Yellow |
| `qr_pending` | Waiting for QR | Orange |
| `qr_ready` | Scan QR Code | Orange |
| `connected` | Connected | Green |
| `retrying` | Reconnecting… | Orange |
| `disconnected` | Disconnected | Red |

---

### 4. Get Single Device

```
GET /devices/:token
x-api-key: YOUR_API_KEY
```

**Response `200`:**
```json
{
  "success": true,
  "device": {
    "token": "a1b2c3d4-...",
    "label": "My iPhone",
    "session": "device-a1b2c3d4",
    "createdAt": "2026-05-11T10:00:00.000Z",
    "status": "connected",
    "isReady": true
  }
}
```

**Error `404`:**
```json
{
  "success": false,
  "error": "Device not found."
}
```

---

### 5. Delete Device

```
DELETE /devices/:token
x-api-key: YOUR_API_KEY
```

**Response `200`:**
```json
{
  "success": true,
  "message": "Device \"My iPhone\" removed."
}
```

---

### 6. QR Code Page (Browser)

```
GET /devices/:token/qrcode
Auth: none (token in URL is the auth)
```

Open this URL directly in a browser tab or embed in an `<iframe>`.
The page uses Server-Sent Events — QR appears automatically, no refresh needed.

**Embed in frontend:**
```html
<iframe
  src="https://your-api.com/devices/TOKEN/qrcode"
  width="460"
  height="520"
  style="border:none; border-radius:12px;"
></iframe>
```

---

### 7. QR Status (JSON polling)

```
GET /devices/:token/qrcode/status
Auth: none
```

**Response `200`:**
```json
{
  "token": "a1b2c3d4-...",
  "session": "device-a1b2c3d4",
  "status": "qr_ready",
  "isReady": false,
  "hasQR": true
}
```

**Poll this every 3 seconds** after creating a device. Stop polling when `isReady: true`.

```javascript
// Frontend polling example
async function waitForConnection(token, baseUrl) {
  return new Promise((resolve) => {
    const interval = setInterval(async () => {
      const res = await fetch(`${baseUrl}/devices/${token}/qrcode/status`);
      const data = await res.json();
      if (data.isReady) {
        clearInterval(interval);
        resolve(data);
      }
    }, 3000);
  });
}
```

---

### 8. QR SSE Stream (Real-time)

```
GET /devices/:token/qrcode/events
Content-Type: text/event-stream
Auth: none
```

Connect with `EventSource` for instant updates without polling.

```javascript
const es = new EventSource(`${baseUrl}/devices/${token}/qrcode/events`);

es.onmessage = (e) => {
  const msg = JSON.parse(e.data);

  if (msg.type === 'waiting') {
    // msg.status = 'launching' | 'loading (50%)' | 'retrying' etc.
    showSpinner(msg.status);
  }

  if (msg.type === 'qr') {
    // msg.qr = 'data:image/png;base64,...'
    showQRImage(msg.qr);
  }

  if (msg.type === 'connected') {
    showConnectedState();
    es.close();
  }
};

es.onerror = () => {
  // Connection dropped — reload or retry
  setTimeout(() => location.reload(), 3000);
};
```

**Event shapes:**

```
data: {"type":"waiting","status":"launching"}
data: {"type":"waiting","status":"loading (50%)"}
data: {"type":"qr","qr":"data:image/png;base64,iVBORw0KGgo..."}
data: {"type":"connected"}
: ping
```

---

### 9. Send Single Message

```
POST /devices/:token/send
Content-Type: application/json
Auth: none (token in URL)
```

**Request body:**
```json
{
  "number": "919800000000",
  "message": "Hello from the API!"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `number` | string | Yes | Country code + number, digits only. No `+`, spaces, or dashes |
| `message` | string | Yes | Plain text message |

**Response `200`:**
```json
{
  "success": true,
  "result": {
    "number": "919800000000",
    "status": "sent"
  }
}
```

**Error `500` — session not ready:**
```json
{
  "success": false,
  "error": "Session \"device-a1b2c3d4\" is not ready. Scan QR at /devices/{token}/qrcode"
}
```

**Error `400` — validation:**
```json
{
  "success": false,
  "error": "\"number\" is required."
}
```

---

### 10. Bulk Send (JSON)

```
POST /devices/:token/bulk-send
Content-Type: application/json
Auth: none (token in URL)
```

**Request body:**
```json
{
  "numbers": [
    "919800000000",
    "917000000000",
    "916000000000"
  ],
  "message": "Hello everyone! This is a bulk message."
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `numbers` | string[] | Yes | Array of phone numbers with country code |
| `message` | string | Yes | Same message sent to all numbers |

**Response `200`:**
```json
{
  "success": true,
  "session": "device-a1b2c3d4",
  "queued": 3,
  "duplicates": 0,
  "jobs": [
    {
      "number": "919800000000",
      "jobId": "550e8400-e29b-41d4-a716-446655440000",
      "status": "queued"
    },
    {
      "number": "917000000000",
      "jobId": "550e8400-e29b-41d4-a716-446655440001",
      "status": "queued"
    },
    {
      "number": "916000000000",
      "jobId": "550e8400-e29b-41d4-a716-446655440002",
      "status": "queued"
    }
  ]
}
```

**Duplicate example** (same number+message already in queue):
```json
{
  "number": "919800000000",
  "jobId": null,
  "status": "duplicate"
}
```

**Error `400`:**
```json
{
  "success": false,
  "error": "\"numbers\" must be a non-empty array."
}
```

> Messages are sent **one at a time** with 5–10 second random delays between each.
> The endpoint returns immediately — use the queue endpoints to track progress.

---

### 11. Bulk Send (CSV Upload)

```
POST /devices/:token/bulk-send/csv
Content-Type: multipart/form-data
Auth: none (token in URL)
```

**Form fields:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `file` | File | Yes | `.csv` file, max 2MB |
| `message` | string | Yes | Message to send to all numbers |

**Accepted CSV formats:**
```csv
number
919800000000
917000000000
```
```csv
phone,name
919800000000,Alice
917000000000,Bob
```
```csv
919800000000
917000000000
```

**Response `200`:**
```json
{
  "success": true,
  "session": "device-a1b2c3d4",
  "parsed": 2,
  "queued": 2,
  "duplicates": 0,
  "jobs": [
    { "number": "919800000000", "jobId": "uuid-1", "status": "queued" },
    { "number": "917000000000", "jobId": "uuid-2", "status": "queued" }
  ]
}
```

**Frontend upload example:**
```javascript
const formData = new FormData();
formData.append('file', csvFile);          // File object from <input type="file">
formData.append('message', 'Hello!');

const res = await fetch(`${baseUrl}/devices/${token}/bulk-send/csv`, {
  method: 'POST',
  body: formData,
  // DO NOT set Content-Type manually — browser sets it with boundary automatically
});
const data = await res.json();
```

---

### 12. Queue Status

```
GET /devices/:token/queue
GET /devices/:token/queue?status=pending
GET /devices/:token/queue?status=sent
GET /devices/:token/queue?status=failed
Auth: none (token in URL)
```

**Query params:**

| Param | Values | Default |
|---|---|---|
| `status` | `pending`, `sending`, `sent`, `failed`, `all` | `all` |

**Response `200`:**
```json
{
  "success": true,
  "session": "device-a1b2c3d4",
  "count": 3,
  "jobs": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "dedupKey": "device-a1b2c3d4:919800000000@c.us:Hello!",
      "sessionName": "device-a1b2c3d4",
      "number": "919800000000",
      "chatId": "919800000000@c.us",
      "message": "Hello!",
      "status": "sent",
      "attempts": 1,
      "error": null,
      "enqueuedAt": "2026-05-11T10:05:00.000Z",
      "processedAt": "2026-05-11T10:05:08.000Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "sessionName": "device-a1b2c3d4",
      "number": "917000000000",
      "chatId": "917000000000@c.us",
      "message": "Hello!",
      "status": "failed",
      "attempts": 3,
      "error": "WhatsApp client is not ready.",
      "enqueuedAt": "2026-05-11T10:05:00.000Z",
      "processedAt": "2026-05-11T10:05:45.000Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "sessionName": "device-a1b2c3d4",
      "number": "916000000000",
      "chatId": "916000000000@c.us",
      "message": "Hello!",
      "status": "pending",
      "attempts": 0,
      "error": null,
      "enqueuedAt": "2026-05-11T10:05:01.000Z",
      "processedAt": null
    }
  ]
}
```

**Job status values:**

| Status | Meaning | UI |
|---|---|---|
| `pending` | Waiting in queue | Gray / clock icon |
| `sending` | Currently being sent | Blue / spinner |
| `sent` | Delivered successfully | Green / checkmark |
| `failed` | All retries exhausted | Red / X icon |
| `duplicate` | Skipped — already queued | Yellow / warning |

---

### 13. Get Single Job

```
GET /devices/:token/queue/:jobId
Auth: none (token in URL)
```

**Response `200`:**
```json
{
  "success": true,
  "job": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "sessionName": "device-a1b2c3d4",
    "number": "919800000000",
    "chatId": "919800000000@c.us",
    "message": "Hello!",
    "status": "sent",
    "attempts": 1,
    "error": null,
    "enqueuedAt": "2026-05-11T10:05:00.000Z",
    "processedAt": "2026-05-11T10:05:08.000Z"
  }
}
```

**Error `404`:**
```json
{
  "success": false,
  "error": "Job not found."
}
```

---

### 14. Incoming Messages

```
GET /devices/:token/messages
GET /devices/:token/messages?limit=20
Auth: none (token in URL)
```

**Query params:**

| Param | Type | Default | Max |
|---|---|---|---|
| `limit` | number | 50 | 200 |

**Response `200`:**
```json
{
  "success": true,
  "session": "device-a1b2c3d4",
  "count": 2,
  "messages": [
    {
      "from": "919800000000@c.us",
      "body": "Hey, got your message!",
      "type": "chat",
      "timestamp": "2026-05-11T10:10:00.000Z",
      "receivedAt": "2026-05-11T10:10:01.000Z"
    },
    {
      "from": "917000000000@c.us",
      "body": "Thanks!",
      "type": "chat",
      "timestamp": "2026-05-11T10:09:00.000Z",
      "receivedAt": "2026-05-11T10:09:01.000Z"
    }
  ]
}
```

---

## Error Reference

All errors follow this shape:
```json
{
  "success": false,
  "error": "Human-readable error message."
}
```

| HTTP Code | Meaning | Common cause |
|---|---|---|
| `400` | Bad Request | Missing required field, invalid input |
| `401` | Unauthorized | Missing or wrong `x-api-key` |
| `404` | Not Found | Invalid token, job ID not found |
| `429` | Too Many Requests | Rate limit hit (30 req/min per IP) |
| `500` | Server Error | Session not ready, WhatsApp error |

---

## Frontend UI Recommendations

### Pages / Screens to build

---

#### 1. Dashboard
- List of all connected devices (`GET /devices`)
- Status badge per device (green/orange/red based on `status`)
- Button: **Add Device**
- Button per device: **Send Message**, **View Queue**, **Delete**
- Auto-refresh device list every 10 seconds

---

#### 2. Add Device Flow

**Step 1 — Create device**
- Input: device label (optional)
- Button: Create
- Call `POST /devices`
- On success: save token, move to Step 2

**Step 2 — Scan QR**
- Embed QR page in iframe OR open in new tab:
  ```
  /devices/:token/qrcode
  ```
- Show instructions: "Open WhatsApp → Linked Devices → Link a Device"
- Poll `GET /devices/:token/qrcode/status` every 3s
- When `isReady: true` → show success screen, redirect to dashboard

**Step 3 — Connected**
- Show green checkmark
- Device is ready to send messages

---

#### 3. Send Message Page

- Dropdown: select device (only show `isReady: true` devices)
- Input: phone number (with country code hint)
- Textarea: message
- Button: Send
- Call `POST /devices/:token/send`
- Show success/error toast

---

#### 4. Bulk Send Page

**Tab 1 — Manual input**
- Dropdown: select device
- Textarea: one number per line (frontend splits by newline → array)
- Textarea: message
- Button: Send Bulk
- Call `POST /devices/:token/bulk-send`
- Show: X queued, Y duplicates skipped
- Auto-redirect to Queue page

**Tab 2 — CSV Upload**
- Dropdown: select device
- File input: `.csv` only
- Input: message
- Button: Upload & Send
- Call `POST /devices/:token/bulk-send/csv`
- Show parsed count and queued count

---

#### 5. Queue Monitor Page

- Dropdown: select device
- Filter tabs: All | Pending | Sent | Failed
- Call `GET /devices/:token/queue?status=...`
- Table columns: Number | Message | Status | Attempts | Time
- Auto-refresh every 5 seconds while any job is `pending` or `sending`
- Show progress bar: `sent / total`
- Failed jobs: show error message, option to retry (re-submit to bulk-send)

---

#### 6. Inbox Page

- Dropdown: select device
- Call `GET /devices/:token/messages?limit=50`
- Show messages in chat-style list
- Auto-refresh every 10 seconds
- Show: sender number, message body, timestamp

---

### Frontend State Management

```javascript
// Recommended state shape per device
{
  token: "a1b2c3d4-...",
  label: "My iPhone",
  session: "device-a1b2c3d4",
  status: "connected",      // from GET /devices
  isReady: true,
  createdAt: "2026-...",
}

// Queue summary (computed from GET /devices/:token/queue)
{
  total: 100,
  sent: 87,
  pending: 10,
  failed: 3,
  progress: 87,             // percentage
}
```

---

### Number Format Rules

Always strip non-digits before sending:

```javascript
function formatNumber(raw) {
  return raw.replace(/\D/g, '');
  // "91 98000 00000" → "919800000000"
  // "+91-98000-00000" → "919800000000"
  // "919800000000" → "919800000000"
}
```

---

### Bulk Send from Textarea

```javascript
function parseNumbers(text) {
  return text
    .split(/[\n,;]+/)           // split by newline, comma, or semicolon
    .map(n => n.replace(/\D/g, ''))  // strip non-digits
    .filter(n => n.length >= 10);    // remove empty/short entries
}
```

---

### Polling Queue Until Complete

```javascript
async function pollQueueUntilDone(token, baseUrl, onUpdate) {
  const interval = setInterval(async () => {
    const res = await fetch(`${baseUrl}/devices/${token}/queue`);
    const data = await res.json();

    const pending = data.jobs.filter(j => j.status === 'pending' || j.status === 'sending');
    const sent    = data.jobs.filter(j => j.status === 'sent').length;
    const failed  = data.jobs.filter(j => j.status === 'failed').length;

    onUpdate({ total: data.count, sent, failed, pending: pending.length });

    if (pending.length === 0) {
      clearInterval(interval);
    }
  }, 4000);
}
```

---

### CORS Note

If your frontend is on a different origin than the API, add CORS headers on the backend. Add this to `src/server.js` before routes:

```javascript
const cors = require('cors');
app.use(cors({
  origin: ['http://localhost:3000', 'https://your-frontend.com'],
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'x-api-key'],
}));
```

Install: `npm install cors`

---

### Environment Variables for Frontend

Store these in your frontend `.env`:

```
VITE_API_BASE_URL=https://your-api.com
VITE_API_KEY=your-master-api-key
```

Never expose the master API key in a public frontend. If your app is public-facing, proxy device management calls through your own backend.

---

## Quick Reference Card

```
METHOD  ENDPOINT                              AUTH          DESCRIPTION
──────  ────────────────────────────────────  ────────────  ─────────────────────────
GET     /health                               none          Server health check
POST    /devices                              x-api-key     Create device → get token
GET     /devices                              x-api-key     List all devices + status
GET     /devices/:token                       x-api-key     Get single device
DELETE  /devices/:token                       x-api-key     Remove device

GET     /devices/:token/qrcode                token in URL  QR browser page (iframe)
GET     /devices/:token/qrcode/events         token in URL  SSE stream (real-time QR)
GET     /devices/:token/qrcode/status         token in URL  JSON connection status

POST    /devices/:token/send                  token in URL  Send single message
POST    /devices/:token/bulk-send             token in URL  Bulk send via JSON array
POST    /devices/:token/bulk-send/csv         token in URL  Bulk send via CSV upload

GET     /devices/:token/queue                 token in URL  All jobs for this device
GET     /devices/:token/queue?status=failed   token in URL  Filter jobs by status
GET     /devices/:token/queue/:jobId          token in URL  Single job details

GET     /devices/:token/messages              token in URL  Received messages inbox
GET     /devices/:token/messages?limit=20     token in URL  Limit inbox results
```
