import { api } from './client';
import type { AuthResponse } from '@/types';

export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }).then((r) => r.data),
  register: (fullName: string, email: string, password: string, lang: string) =>
    api.post<AuthResponse>('/auth/register', { fullName, email, password }, { params: { lang } }).then((r) => r.data),
};
