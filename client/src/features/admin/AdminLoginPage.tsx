import { useState, type FormEvent } from 'react';
import { AlertCircle, LockKeyhole, ShieldCheck } from 'lucide-react';
import { testApi } from '../tests/api';

export function AdminLoginPage({
  onAuthenticated,
}: {
  onAuthenticated: (username: string) => void;
}): React.JSX.Element {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const session = await testApi.login(username, password);
      testApi.setSession(session);
      onAuthenticated(session.admin.username);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-4 py-10">
      <section className="grid w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl md:grid-cols-[1fr_0.9fr]">
        <div className="hidden bg-linear-to-br from-indigo-600 via-indigo-700 to-violet-900 p-10 text-white md:block">
          <div className="grid size-12 place-items-center rounded-2xl bg-white/15">
            <ShieldCheck size={28} />
          </div>
          <p className="mt-16 text-sm font-bold tracking-[0.18em] text-indigo-200">
            ExamOcean ADMIN
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight">
            Build better assessments, with confidence.
          </h1>
        </div>
        <div className="p-7 sm:p-10">
          <div className="md:hidden">
            <div className="grid size-11 place-items-center rounded-xl bg-indigo-600 text-white">
              <ShieldCheck size={23} />
            </div>
            <p className="mt-5 text-sm font-bold text-indigo-600">ExamOcean ADMIN</p>
          </div>
          <h2 className="mt-8 text-2xl font-bold tracking-tight text-slate-900">
            Sign in to continue
          </h2>
          <p className="mt-2 text-sm text-slate-500">Use your administrator credentials.</p>
          {error && (
            <p
              role="alert"
              className="mt-5 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
            >
              <AlertCircle size={17} />
              {error}
            </p>
          )}
          <form onSubmit={(event) => void submit(event)} className="mt-7 grid gap-4">
            <label className="field">
              Username
              <input
                className="input"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </label>
            <label className="field">
              Password
              <input
                type="password"
                className="input"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            <button disabled={submitting} className="button button-primary mt-2 w-full">
              {submitting ? (
                'Signing in…'
              ) : (
                <>
                  <LockKeyhole size={17} />
                  Sign in securely
                </>
              )}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
