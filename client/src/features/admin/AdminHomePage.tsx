import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpenCheck,
  ClipboardList,
  Clock3,
  LogOut,
  Plus,
  Sparkles,
} from 'lucide-react';
import { testApi } from '../tests/api';
import type { TestSummary } from '../tests/types';

export function AdminHomePage({
  username,
  onTests,
  onLogout,
}: {
  username: string;
  onTests: () => void;
  onLogout: () => void;
}): React.JSX.Element {
  const [tests, setTests] = useState<TestSummary[]>([]);
  useEffect(() => {
    void testApi
      .list()
      .then(setTests)
      .catch(() => setTests([]));
  }, []);
  const totalQuestions = tests.length ? 'Managed per test' : 'Start creating';
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-indigo-600 text-white">
              <ClipboardList size={22} />
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight">ExamOcean</p>
              <p className="text-xs text-slate-500">Test Series Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:block">
              Hello, <b>{username}</b>
            </span>
            <button onClick={onLogout} className="button button-secondary min-h-10 px-3">
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <section className="rounded-3xl bg-linear-to-r from-indigo-700 via-indigo-600 to-violet-600 p-7 text-white sm:p-10">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-sm font-bold tracking-wide text-indigo-100">
              <Sparkles size={17} />
              ADMIN HOME
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Your test series command center.
            </h1>
            <p className="mt-3 text-indigo-100">
              Create assessments from question images, set answer keys, and keep every published
              test organized.
            </p>
            <button
              onClick={onTests}
              className="button mt-7 bg-white text-indigo-700 hover:bg-indigo-50"
            >
              <Plus size={18} />
              Manage test series
            </button>
          </div>
        </section>
        <section className="mt-7 grid gap-4 sm:grid-cols-3">
          <Metric
            icon={<BookOpenCheck size={20} />}
            label="Published tests"
            value={String(tests.length)}
          />
          <Metric
            icon={<ClipboardList size={20} />}
            label="Question workflow"
            value={totalQuestions}
          />
          <Metric icon={<Clock3 size={20} />} label="Availability" value="Scheduled" />
        </section>
        <section className="mt-7 card p-5 sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-indigo-600">QUICK START</p>
              <h2 className="mt-1 text-xl font-bold">Create your next test series</h2>
              <p className="mt-1 text-sm text-slate-500">
                Upload numbered question images and confirm the correct answer for each question.
              </p>
            </div>
            <button onClick={onTests} className="button button-primary shrink-0">
              Open tests
              <ArrowRight size={17} />
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}): React.JSX.Element {
  return (
    <article className="card p-5">
      <div className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
        {icon}
      </div>
      <p className="mt-4 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </article>
  );
}
