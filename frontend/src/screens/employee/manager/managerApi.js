export function getApiBase() {
  const fromVite = import.meta.env.VITE_API_URL;
  const fromReact = import.meta.env.REACT_APP_API_URL;
  const raw = (fromVite || fromReact || '/api').trim();
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

export function getHealthUrl() {
  const base = getApiBase();
  if (base.endsWith('/api')) {
    return `${base.slice(0, -4)}/health`;
  }
  return `${base}/health`;
}

async function parseError(response) {
  let message = `Request failed (${response.status})`;

  try {
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await response.json();
      if (body?.error) {
        message = body.error;
      } else if (body?.message) {
        message = body.message;
      }
      return message;
    }

    const text = await response.text();
    if (!text || !text.trim()) {
      return message;
    }

    const trimmed = text.trim();
    if (response.status === 404) {
      const preMatch = trimmed.match(/<pre>([\s\S]*?)<\/pre>/i);
      if (preMatch?.[1]) {
        const route = preMatch[1].replace(/Cannot GET/i, '').trim();
        return `Backend route is missing: ${route}`;
      }
      if (trimmed.includes('Cannot GET')) {
        const route = trimmed.replace('Cannot GET', '').trim();
        return `Backend route is missing: ${route}`;
      }
    }

    return trimmed;
  } catch {
    return message;
  }
}

export async function apiRequest(path, options = {}) {
  const base = getApiBase();
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

  let response;
  try {
    response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch {
    throw new Error(
      `Network error reaching ${url}. Check VITE_API_URL/proxy and confirm backend is running.`,
    );
  }

  if (!response.ok) {
    const details = await parseError(response);
    throw new Error(`${details} [${options.method || 'GET'} ${url}]`);
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

export async function checkDatabaseHealth() {
  const response = await fetch(getHealthUrl());
  if (!response.ok) {
    throw new Error(`Health check failed (${response.status})`);
  }
  return response.json();
}

export function unwrapList(payload, preferredKey) {
  if (Array.isArray(payload)) return payload;
  if (preferredKey && Array.isArray(payload?.[preferredKey])) return payload[preferredKey];

  const candidates = ['data', 'rows', 'items', 'results'];
  for (const key of candidates) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }

  return [];
}
