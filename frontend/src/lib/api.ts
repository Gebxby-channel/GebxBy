import axios, { AxiosHeaders, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';

interface CsrfPayload {
  headerName: string;
  token: string;
}

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'https://federal-wasp-gebxby-18a594b4.koyeb.app';

const csrfClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

let csrfPayload: CsrfPayload | null = null;

const needsCsrf = (method?: string) => {
  const normalized = method?.toUpperCase() ?? 'GET';
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(normalized);
};

export async function getCsrfToken() {
  if (!csrfPayload) {
    const response = await csrfClient.get<CsrfPayload>('/api/csrf');
    csrfPayload = response.data;
  }
  return csrfPayload;
}

export function resetCsrfToken() {
  csrfPayload = null;
}

api.interceptors.request.use(async (config) => {
  if (needsCsrf(config.method)) {
    const token = await getCsrfToken();
    config.headers = AxiosHeaders.from(config.headers);
    config.headers.set(token.headerName, token.token);
    config.headers.set('X-CSRF-TOKEN', token.token);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _csrfRetry?: boolean }) | undefined;
    if (error.response?.status === 403 && originalRequest && needsCsrf(originalRequest.method) && !originalRequest._csrfRetry) {
      originalRequest._csrfRetry = true;
      resetCsrfToken();
      const token = await getCsrfToken();
      originalRequest.headers = AxiosHeaders.from(originalRequest.headers);
      originalRequest.headers.set(token.headerName, token.token);
      originalRequest.headers.set('X-CSRF-TOKEN', token.token);
      return api.request(originalRequest);
    }
    return Promise.reject(error);
  },
);

export async function postWithCsrf<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
  return api.post<T>(url, data, config);
}

export async function logout() {
  await postWithCsrf('/logout');
  resetCsrfToken();
}

export function oauthLoginUrl() {
  return `${API_BASE_URL}/oauth2/authorization/google`;
}

export default api;
