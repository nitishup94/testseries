import type { TestAttemptSummary, TestDraft, TestSummary } from './types';

const tokenKey = 'testseries.adminToken';
const usernameKey = 'testseries.adminUsername';
export interface AdminSession {
  token: string;
  admin: { id: number; username: string };
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem(tokenKey);
  const headers = new Headers(options?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(url, { ...options, headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message ?? 'Request failed.');
  return data as T;
}
export const testApi = {
  login: (username: string, password: string): Promise<AdminSession> =>
    request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }),
  getToken: (): string | null => localStorage.getItem(tokenKey),
  setSession: (session: AdminSession): void => {
    localStorage.setItem(tokenKey, session.token);
    localStorage.setItem(usernameKey, session.admin.username);
  },
  getUsername: (): string | null => localStorage.getItem(usernameKey),
  clearToken: (): void => {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(usernameKey);
  },
  list: (): Promise<TestSummary[]> => request('/api/tests'),
  attempts: (testId: number): Promise<TestAttemptSummary[]> =>
    request(`/api/tests/${testId}/attempts`),
  get: (id: number): Promise<TestDraft> => request(`/api/tests/${id}`),
  upload: (
    files: File[],
  ): Promise<Array<{ questionNumber: number; filename: string; imagePath: string }>> => {
    const form = new FormData();
    files.forEach((file) => form.append('images', file));
    return request('/api/uploads/questions', { method: 'POST', body: form });
  },
  save: (draft: TestDraft): Promise<{ id: number; status: string }> => {
    const { id, ...body } = draft;
    return request(id ? `/api/tests/${id}` : '/api/tests', {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...body,
        durationMinutes: Number(body.durationMinutes),
        marksPerQuestion: Number(body.marksPerQuestion),
        negativeMarksPerQuestion: body.hasNegativeMarking
          ? Number(body.negativeMarksPerQuestion)
          : null,
        questions: body.questions.map((question) => ({
          questionNumber: question.questionNumber,
          imagePath: question.imagePath,
          correctAnswer: question.correctAnswer,
        })),
      }),
    });
  },
};
