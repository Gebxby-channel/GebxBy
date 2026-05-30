import axios, { AxiosHeaders, type AxiosRequestConfig } from 'axios';

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

api.interceptors.request.use(async (config) => {
  if (needsCsrf(config.method)) {
    const token = await getCsrfToken();
    if (!config.headers) {
      config.headers = new AxiosHeaders();
    }
    config.headers.set(token.headerName, token.token);
  }
  return config;
});

export async function postWithCsrf<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
  return api.post<T>(url, data, config);
}

export async function logout() {
  await postWithCsrf('/logout');
  csrfPayload = null;
}

export function oauthLoginUrl() {
  return `${API_BASE_URL}/oauth2/authorization/google`;
}

export default api;
