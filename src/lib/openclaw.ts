// OpenClaw Gateway API Client

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789';
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '';

interface GatewayResponse<T = unknown> {
  ok: boolean;
  result?: T;
  error?: string;
}

async function gatewayRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: unknown
): Promise<GatewayResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (GATEWAY_TOKEN) {
    headers['Authorization'] = `Bearer ${GATEWAY_TOKEN}`;
  }

  const response = await fetch(`${GATEWAY_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  return response.json();
}

// Session/Status APIs
export async function getStatus() {
  return gatewayRequest('/api/status');
}

export async function getSessions() {
  return gatewayRequest('/api/sessions');
}

// Cron APIs
export async function getCronJobs() {
  return gatewayRequest('/api/cron/jobs');
}

export async function createCronJob(job: unknown) {
  return gatewayRequest('/api/cron/jobs', 'POST', job);
}

export async function deleteCronJob(jobId: string) {
  return gatewayRequest(`/api/cron/jobs/${jobId}`, 'POST', { action: 'delete' });
}

// Chat API
export async function sendMessage(message: string, sessionKey?: string) {
  return gatewayRequest('/api/chat', 'POST', { message, sessionKey });
}

export async function getSessionHistory(sessionKey: string) {
  return gatewayRequest(`/api/sessions/${sessionKey}/history`);
}
