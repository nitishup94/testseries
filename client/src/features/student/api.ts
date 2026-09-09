import type { Answer } from '../tests/types';

const API_BASE = '/testseries/server';
const tokenKey = 'testseries.studentToken';
const pendingSsoTokenKey = 'testseries.pendingSsoToken';

export interface StudentSession {
  token: string;
  student: { id: number; name: string; email: string };
}

function readUrlToken(): string | null {
  if (typeof window === 'undefined') return null;

  const search = new URLSearchParams(window.location.search);
  const token =
    search.get('token') ?? search.get('auth_token') ?? localStorage.getItem(pendingSsoTokenKey);
  if (!token) return null;

  const looksLikeJwt = token.split('.').length === 3 && token.length > 20;
  if (!looksLikeJwt) return null;

  localStorage.setItem(pendingSsoTokenKey, token);

  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.delete('token');
  nextUrl.searchParams.delete('auth_token');
  window.history.replaceState(
    {},
    '',
    `${nextUrl.pathname}${nextUrl.search ? `?${nextUrl.searchParams.toString()}` : ''}${nextUrl.hash}`,
  );

  return token;
}
export interface TestCard {
  id: number;
  attemptId?: number;
  name: string;
  course: string;
  durationMinutes: number;
  marksPerQuestion: number | string;
  questionCount: number;
  availableFrom: string;
  availableTo: string;
  expiresAt?: string;
  remainingTimeSeconds?: number | string | null;
  status?: 'Draft' | 'Completed';
  score?: number | null;
  accuracy?: number | null;
  percentage?: number | null;
}
export interface Dashboard {
  student: StudentSession['student'];
  pending: TestCard[];
  draft: TestCard[];
  completed: TestCard[];
  analytics: Array<{ name: string; score: number; accuracy: number; percentage: number }>;
}
export interface AttemptQuestion {
  id: number;
  questionNumber: number;
  imagePath: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: Answer;
  selectedAnswer: Answer | null;
  visited: boolean | number;
  markedForReview: boolean | number;
  timeSpentSeconds: number;
}
export interface Attempt {
  id: number;
  name: string;
  course: string;
  status: 'Draft' | 'Completed';
  started_at: string;
  expires_at: string;
  available_to?: string;
  availableTo?: string;
  remainingTimeSeconds?: number;
  current_question: number;
  durationMinutes: number;
  marksPerQuestion: number;
  hasNegativeMarking: boolean | number;
  negativeMarksPerQuestion: number | null;
  solutionPdfPath?: string | null;
  score?: number;
  correct_count?: number;
  incorrect_count?: number;
  unanswered_count?: number;
  positive_marks?: number;
  negative_marks?: number;
  accuracy?: number;
  percentage?: number;
  time_taken_seconds?: number;
  questions: AttemptQuestion[];
}
export interface Analysis {
  questionId: number;
  totalAttempts: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  averageTimeSeconds: number;
  topPerformerTimeSeconds: number | null;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  const token = localStorage.getItem(tokenKey);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const normalizedUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
  const response = await fetch(normalizedUrl, { ...options, headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message ?? 'Request failed.');
  return data as T;
}
export const studentApi = {
  login: (email: string, password: string): Promise<StudentSession> =>
    request('/api/student/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }),
  ssoLogin: (externalToken: string): Promise<StudentSession> =>
    request('/api/student/auth/studyplanner-sso', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: externalToken }),
    }),
  readUrlToken,
  consumeSsoToken: (): string | null => {
    const token = localStorage.getItem(pendingSsoTokenKey);
    localStorage.removeItem(pendingSsoTokenKey);
    return token;
  },
  session: (): string | null => localStorage.getItem(tokenKey),
  setToken: (token: string): void => localStorage.setItem(tokenKey, token),
  setSession: (session: StudentSession | { token: string }): void => {
    localStorage.setItem(tokenKey, session.token);
    localStorage.removeItem(pendingSsoTokenKey);
  },
  clearSession: (): void => {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(pendingSsoTokenKey);
  },
  dashboard: (): Promise<Dashboard> => request('/api/student/dashboard'),
  start: (testId: number): Promise<{ attemptId: number }> =>
    request(`/api/student/tests/${testId}/start`, { method: 'POST' }),
  attempt: (attemptId: number): Promise<Attempt> => request(`/api/student/attempts/${attemptId}`),
  saveProgress: (
    attemptId: number,
    currentQuestion: number,
    answers: AttemptQuestion[],
    remainingTimeSeconds?: number,
    freezeCountdown = false,
  ): Promise<{ saved: boolean; remainingTimeSeconds?: number }> =>
    request(`/api/student/attempts/${attemptId}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentQuestion,
        remainingTimeSeconds,
        freezeCountdown,
        answers: answers.map(
          ({ id, selectedAnswer, visited, markedForReview, timeSpentSeconds }) => ({
            questionId: id,
            selectedAnswer,
            visited: Boolean(visited),
            markedForReview: Boolean(markedForReview),
            timeSpentSeconds,
          }),
        ),
      }),
    }),
  submit: (attemptId: number): Promise<Record<string, number>> =>
    request(`/api/student/attempts/${attemptId}/submit`, { method: 'POST' }),
  analysis: (attemptId: number): Promise<Analysis[]> =>
    request(`/api/student/attempts/${attemptId}/analysis`),
};
