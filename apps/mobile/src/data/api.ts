/**
 * Talks to the shared BaskyCLub API (baskyclub-server).
 * Address: EXPO_PUBLIC_API_URL in .env — e.g. http://localhost:3000 for the iOS
 * simulator and web, or http://<your Mac's Wi-Fi IP>:3000 for a real phone.
 */
import { Platform } from 'react-native';

const DEFAULT_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_URL).replace(/\/$/, '');

let token: string | null = null;
export const setToken = (t: string | null) => {
  token = t;
};
export const getToken = () => token;

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    /** Matches the server's log line (x-request-id), so a problem can be traced. */
    public requestId?: string,
  ) {
    super(message);
  }
}

type Body = Record<string, unknown> | unknown[] | FormData | undefined;

export async function api<T = any>(method: string, path: string, body?: Body): Promise<T> {
  const headers: Record<string, string> = { accept: 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isForm) headers['content-type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'offline', `Can't reach the BaskyCLub server at ${API_URL}. Is it running?`);
  }
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const code = json?.error?.code ?? 'error';
    const ref = json?.error?.requestId ?? res.headers.get('x-request-id') ?? undefined;
    // Same shape as the server log, so both sides can be matched by ref.
    if (__DEV__) console.warn(`[api] ${method} ${path} → ${res.status} ${code}${ref ? ` ref=${ref}` : ''}`);
    let message = json?.error?.message ?? 'Something went wrong.';
    if (res.status >= 500 && ref) message += ` (ref ${ref})`;
    throw new ApiError(res.status, code, message, ref);
  }
  return json as T;
}

export const get = <T = any>(path: string) => api<T>('GET', path);
export const post = <T = any>(path: string, body?: Body) => api<T>('POST', path, body ?? {});
export const patch = <T = any>(path: string, body: Body) => api<T>('PATCH', path, body);
export const del = <T = any>(path: string) => api<T>('DELETE', path);

/** Uploads one photo picked on the phone (or in the browser) and returns its link. */
export async function uploadPhoto(uri: string): Promise<string> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    form.append('file', blob, 'photo.jpg');
  } else {
    const name = uri.split('/').pop() || 'photo.jpg';
    const type = name.toLowerCase().endsWith('.png') ? 'image/png' : name.toLowerCase().endsWith('.heic') ? 'image/heic' : 'image/jpeg';
    // React Native's FormData accepts { uri, name, type } for files
    form.append('file', { uri, name, type } as unknown as Blob);
  }
  const res = await api<{ url: string }>('POST', '/api/uploads', form);
  return res.url;
}
