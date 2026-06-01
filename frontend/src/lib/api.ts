import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'https://federal-wasp-gebxby-18a594b4.koyeb.app';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

let csrfToken: string | null = null;
let csrfHeaderName = 'X-CSRF-TOKEN';
let csrfPromise: Promise<string> | null = null;

api.interceptors.request.use(async (config) => {
  if (!isUnsafeMethod(config.method) || config.url?.includes('/api/csrf')) {
    return config;
  }
  const token = await ensureCsrfToken();
  config.headers = config.headers ?? {};
  config.headers[csrfHeaderName] = token;
  return config;
});

type CacheOptions = {
  ttlMs?: number;
  scope?: string;
  force?: boolean;
};

type CacheEntry<T> = {
  expiresAt: number;
  data?: T;
  promise?: Promise<T>;
};

const getCache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_CACHE_TTL_MS = 30_000;

export async function cachedGet<T>(url: string, config?: AxiosRequestConfig, options?: CacheOptions): Promise<T> {
  const key = buildCacheKey(url, config, options?.scope);
  const now = Date.now();
  const existing = getCache.get(key) as CacheEntry<T> | undefined;

  if (!options?.force && existing?.data !== undefined && existing.expiresAt > now) {
    return existing.data;
  }

  if (!options?.force && existing?.promise) {
    return existing.promise;
  }

  const promise = api.get<T>(url, config)
    .then((response) => {
      const data = response.data;
      getCache.set(key, {
        data,
        expiresAt: Date.now() + (options?.ttlMs ?? DEFAULT_CACHE_TTL_MS),
      });
      return data;
    })
    .catch((error) => {
      getCache.delete(key);
      throw error;
    });

  getCache.set(key, { expiresAt: 0, promise });
  return promise;
}

export function invalidateApiCache(matcher?: string | RegExp | ((key: string) => boolean)) {
  if (!matcher) {
    getCache.clear();
    return;
  }

  for (const key of getCache.keys()) {
    if (typeof matcher === 'string' && key.includes(matcher)) {
      getCache.delete(key);
    } else if (matcher instanceof RegExp && matcher.test(key)) {
      getCache.delete(key);
    } else if (typeof matcher === 'function' && matcher(key)) {
      getCache.delete(key);
    }
  }
}

export async function logout() {
  await api.post('/logout');
  invalidateApiCache();
}

export function isRequestCanceled(error: unknown) {
  return axios.isCancel(error) || (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ERR_CANCELED');
}

export function oauthLoginUrl() {
  return `${API_BASE_URL}/oauth2/authorization/google`;
}

export default api;

async function ensureCsrfToken() {
  if (csrfToken) {
    return csrfToken;
  }
  if (!csrfPromise) {
    csrfPromise = axios.get<{ token: string; headerName?: string }>(`${API_BASE_URL}/api/csrf`, { withCredentials: true })
      .then((response) => {
        csrfHeaderName = response.data.headerName || csrfHeaderName;
        csrfToken = response.data.token;
        return csrfToken;
      })
      .finally(() => {
        csrfPromise = null;
      });
  }
  return csrfPromise;
}

function isUnsafeMethod(method?: string) {
  const clean = (method ?? 'get').toLowerCase();
  return clean === 'post' || clean === 'put' || clean === 'patch' || clean === 'delete';
}

function buildCacheKey(url: string, config?: AxiosRequestConfig, scope = 'global') {
  return `${scope}|${url}|${stableStringify(config?.params ?? {})}`;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`)
    .join(',')}}`;
}
