import { ipcMain } from 'electron';
import { proxyAwareFetch } from '../../utils/proxy-fetch';
import { getPort } from '../../utils/config';
import { getHostApiToken } from '../../api/server';

// Simple cookie jar for relay requests
const relayCookies: Map<string, string> = new Map();

type HostApiFetchRequest = {
  path: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
};

type RelayFetchRequest = {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  credentials?: boolean;
  signal?: AbortSignal;
};

export function registerHostApiProxyHandlers(): void {
  const hostApiPort = getPort('CLAWX_HOST_API');

  // Expose the per-session auth token to the renderer so the browser-fallback
  // path in host-api.ts can authenticate against the Host API server.
  ipcMain.handle('hostapi:token', () => getHostApiToken());

  ipcMain.handle('hostapi:fetch', async (_, request: HostApiFetchRequest) => {
    try {
      const path = typeof request?.path === 'string' ? request.path : '';
      if (!path || !path.startsWith('/')) {
        throw new Error(`Invalid host API path: ${String(request?.path)}`);
      }

      const method = (request.method || 'GET').toUpperCase();
      const headers: Record<string, string> = { ...(request.headers || {}) };
      // Inject the per-session auth token so the Host API server accepts this request.
      headers['Authorization'] = `Bearer ${getHostApiToken()}`;
      let body: string | undefined;

      if (request.body !== undefined && request.body !== null) {
        if (typeof request.body === 'string') {
          body = request.body;
        } else {
          body = JSON.stringify(request.body);
        }
        // Ensure Content-Type is set for requests with a body so the
        // server's anti-CSRF Content-Type gate does not reject them.
        if (!headers['Content-Type'] && !headers['content-type']) {
          headers['Content-Type'] = 'application/json';
        }
      }

      const response = await proxyAwareFetch(`http://127.0.0.1:${hostApiPort}${path}`, {
        method,
        headers,
        body,
      });

      const data: { status: number; ok: boolean; json?: unknown; text?: string } = {
        status: response.status,
        ok: response.ok,
      };

      if (response.status !== 204) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          data.json = await response.json().catch(() => undefined);
        } else {
          data.text = await response.text().catch(() => '');
        }
      }

      return { ok: true, data };
    } catch (error) {
      return {
        ok: false,
        error: {
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  });

  // Proxy handler for external relay station requests (bypasses CORS)
  ipcMain.handle('relay:fetch', async (_, request: RelayFetchRequest) => {
    try {
      const url = typeof request?.url === 'string' ? request.url : '';
      if (!url) {
        throw new Error('Invalid relay URL');
      }

      const method = (request.method || 'GET').toUpperCase();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(request.headers || {}),
      };
      let body: string | undefined;

      if (request.body !== undefined && request.body !== null) {
        if (typeof request.body === 'string') {
          body = request.body;
        } else {
          body = JSON.stringify(request.body);
        }
      }

      const urlObj = new URL(url);
      const domain = urlObj.hostname;

      // Attach stored cookies for this domain
      const storedCookie = relayCookies.get(domain);
      if (storedCookie) {
        headers['Cookie'] = storedCookie;
      }

      // Build fetch options with optional abort signal and timeout
      const fetchOptions: RequestInit = {
        method,
        headers,
        body,
      };
      if (request.signal) {
        fetchOptions.signal = request.signal;
      }

      // Apply a default timeout if no signal is provided
      const controller = new AbortController();
      if (!request.signal) {
        const timer = setTimeout(() => controller.abort(), 60000); // 60秒超时
        fetchOptions.signal = controller.signal;
        // Store timer to clear on success/error
        (fetchOptions as { _timer?: ReturnType<typeof setTimeout> })._timer = timer;
      }

      const response = await proxyAwareFetch(url, fetchOptions);

      // Clear timeout if we set one
      const timer = (fetchOptions as { _timer?: ReturnType<typeof setTimeout> })._timer;
      if (timer) clearTimeout(timer);

      // Extract and store Set-Cookie headers
      let setCookieHeaders: string[] = [];
      const rawHeaders = response.headers as Record<string, string | string[]>;
      if (Array.isArray(rawHeaders['set-cookie'])) {
        setCookieHeaders = rawHeaders['set-cookie'] as string[];
      } else if (typeof rawHeaders['set-cookie'] === 'string') {
        setCookieHeaders = [rawHeaders['set-cookie']];
      } else if (typeof (response.headers as unknown as { list?: (name: string) => string[] }).list === 'function') {
        setCookieHeaders = (response.headers as unknown as { list: (name: string) => string[] }).list('set-cookie');
      }
      for (const setCookie of setCookieHeaders) {
        const cookiePart = setCookie.split(';')[0];
        const existing = relayCookies.get(domain) || '';
        if (existing) {
          const cookieName = cookiePart.split('=')[0];
          const updated = existing
            .split(';')
            .filter(c => c.trim().startsWith(cookieName + '='))
            .concat(cookiePart)
            .join('; ');
          relayCookies.set(domain, updated);
        } else {
          relayCookies.set(domain, cookiePart);
        }
      }

      const data: { status: number; ok: boolean; json?: unknown; text?: string } = {
        status: response.status,
        ok: response.ok,
      };

      if (response.status !== 204) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          data.json = await response.json().catch(() => undefined);
        } else {
          data.text = await response.text().catch(() => '');
        }
      }

      return { ok: true, data };
    } catch (error) {
      return {
        ok: false,
        error: {
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  });
}
