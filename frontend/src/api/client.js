const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(
  /\/$/,
  ''
);

const TOKEN_KEY = 'topik_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/**
 * Core request helper. Adds the Authorization header when a token exists,
 * parses JSON, and throws an Error (with `.status`) on non-2xx responses.
 */
async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const token = getToken();
  const finalHeaders = { ...headers };

  let payload = body;
  if (body !== undefined && body !== null && !(body instanceof FormData)) {
    finalHeaders['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: payload,
  });

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (err) {
      data = { raw: text };
    }
  }

  if (!res.ok) {
    const message =
      (data && (data.error || data.message)) ||
      `Request failed with status ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const get = (path) => request(path, { method: 'GET' });
export const post = (path, body) => request(path, { method: 'POST', body });
export const put = (path, body) => request(path, { method: 'PUT', body });
export const del = (path) => request(path, { method: 'DELETE' });

export default { get, post, put, del, getToken, setToken };
