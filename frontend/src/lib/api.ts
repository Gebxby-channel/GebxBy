import axios from 'axios';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'https://federal-wasp-gebxby-18a594b4.koyeb.app';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export async function logout() {
  await api.post('/logout');
}

export function oauthLoginUrl() {
  return `${API_BASE_URL}/oauth2/authorization/google`;
}

export default api;
