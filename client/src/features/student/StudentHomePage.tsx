import { useEffect, useState } from 'react';
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GraduationCap,
  LogOut,
  Play,
  RotateCcw,
  Send,
} from 'lucide-react';
import type { Answer } from '../tests/types';
import {
  studentApi,
  type Analysis,
  type Attempt,
  type AttemptQuestion,
  type Dashboard,
  type TestCard,
} from './api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

type View = 'dashboard' | 'attempt' | 'result';
type StudentTestSection = 'pending' | 'draft' | 'completed';
const answers: Answer[] = ['A', 'B', 'C', 'D'];
const sectionLabelClasses: Record<StudentTestSection, string> = {
  pending: 'bg-indigo-100 text-indigo-700',
  draft: 'bg-amber-100 text-amber-800',
  completed: 'bg-emerald-100 text-emerald-800',
};
const formatTime = (seconds: number): string =>
  `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
const displayDate = (value: string): string =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );

export function StudentHomePage({ onAdminLogin }: { onAdminLogin: () => void }): React.JSX.Element {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [view, setView] = useState<View>('dashboard');
  const [section, setSection] = useState<StudentTestSection>('pending');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(studentApi.session()));
  const loadDashboard = async (): Promise<void> => {
    setLoading(true);
    try {
      setDashboard(await studentApi.dashboard());
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load dashboard.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (studentApi.session()) void loadDashboard();
  }, []);
  const open = async (id: number, nextView: View = 'attempt'): Promise<void> => {
    setLoading(true);
    try {
      setAttempt(await studentApi.attempt(id));
      setView(nextView);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open test.');
    } finally {
      setLoading(false);
    }
  };
  const start = async (test: TestCard): Promise<void> => {
    try {
      const { attemptId } = await studentApi.start(test.id);
      await open(attemptId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start test.');
    }
  };
  const back = (): void => {
    setAttempt(null);
    setView('dashboard');
    void loadDashboard();
  };
  if (!studentApi.session())
    return <StudentLogin onAdminLogin={onAdminLogin} onLoggedIn={loadDashboard} />;
  if (view === 'attempt' && attempt)
    return (
      <TestRunner
        attempt={attempt}
        onBack={back}
        onSubmitted={(updated) => {
          setAttempt(updated);
          setView('result');
          void loadDashboard();
        }}
      />
    );
  if (view === 'result' && attempt) return <ResultView attempt={attempt} onBack={back} />;
  const tests = dashboard?.[section] ?? [];
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Brand />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:inline">
              Hi, {dashboard?.student.name}
            </span>
            <button
              className="button button-secondary"
              onClick={() => {
                studentApi.clearSession();
                setDashboard(null);
              }}
            >
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <p className="text-sm font-bold tracking-widest text-indigo-600">STUDENT DASHBOARD</p>
        <h1 className="mt-2 text-3xl font-bold">Your test journey</h1>
        <p className="mt-2 text-slate-600">
          Pick up your practice, review results, and spot your progress.
        </p>
        {error && <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <section className="mt-7 grid gap-4 md:grid-cols-3">
          <Summary
            title="Pending tests"
            status="pending"
            count={dashboard?.pending.length ?? 0}
            active={section === 'pending'}
            onClick={() => setSection('pending')}
          />
          <Summary
            title="Draft tests"
            status="draft"
            count={dashboard?.draft.length ?? 0}
            active={section === 'draft'}
            onClick={() => setSection('draft')}
          />
          <Summary
            title="Completed tests"
            status="completed"
            count={dashboard?.completed.length ?? 0}
            active={section === 'completed'}
            onClick={() => setSection('completed')}
          />
        </section>
        <section className="mt-9">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">
              {section[0].toUpperCase() + section.slice(1)} tests
            </h2>
          </div>
          {loading ? (
            <p className="mt-5 text-slate-500">Loading your tests…</p>
          ) : tests.length ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {tests.map((test) => (
                <TestCardView
                  key={test.id}
                  test={test}
                  section={section}
                  onStart={start}
                  onOpen={open}
                />
              ))}
            </div>
          ) : (
            <div className="card mt-4 p-8 text-center text-slate-600">
              No {section} tests right now.
            </div>
          )}
        </section>
        {dashboard && <Analytics points={dashboard.analytics} />}
      </div>
    </main>
  );
}
function StudentLogin({
  onAdminLogin,
  onLoggedIn,
}: {
  onAdminLogin: () => void;
  onLoggedIn: () => Promise<void>;
}): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const login = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setBusy(true);
    try {
      studentApi.setSession(await studentApi.login(email, password));
      await onLoggedIn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign in failed.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-4">
      <form onSubmit={login} className="card w-full max-w-md p-6 sm:p-8">
        <Brand />
        <h1 className="mt-8 text-2xl font-bold">Student sign in</h1>
        <p className="mt-2 text-sm text-slate-600">Use your existing StudyPlanner account.</p>
        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <label className="field mt-6">
          Email
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="field mt-4">
          Password
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button className="button button-primary mt-6 w-full" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in to dashboard'}
        </button>
        <button
          type="button"
          className="mt-5 text-sm font-semibold text-indigo-600"
          onClick={onAdminLogin}
        >
          Administrator? Sign in here
        </button>
      </form>
    </main>
  );
}
function Brand(): React.JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 place-items-center rounded-xl bg-indigo-600 text-white">
        <GraduationCap size={23} />
      </div>
      <div>
        <p className="text-lg font-bold tracking-tight">ExamDesk</p>
        <p className="text-xs text-slate-500">Test Series Platform</p>
      </div>
    </div>
  );
}
function Summary({
  title,
  status,
  count,
  active,
  onClick,
}: {
  title: string;
  status: StudentTestSection;
  count: number;
  active: boolean;
  onClick: () => void;
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`card flex min-h-32 items-center gap-4 p-5 text-left ${active ? 'border-indigo-500 ring-2 ring-indigo-100' : ''}`}
    >
      <span className="grid size-11 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
        <BookOpen size={20} />
      </span>
      <span>
        <span className="block text-3xl font-bold">{count}</span>
        <span
          className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${sectionLabelClasses[status]}`}
        >
          {title}
        </span>
      </span>
    </button>
  );
}
function TestCardView({
  test,
  section,
  onStart,
  onOpen,
}: {
  test: TestCard;
  section: StudentTestSection;
  onStart: (test: TestCard) => Promise<void>;
  onOpen: (id: number, view?: View) => Promise<void>;
}): React.JSX.Element {
  const action =
    section === 'pending'
      ? () => void onStart(test)
      : () =>
          test.attemptId &&
          void onOpen(test.attemptId, section === 'completed' ? 'result' : 'attempt');
  return (
    <article className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-wider text-indigo-600">{test.course}</p>
          <h3 className="mt-1 text-lg font-bold">{test.name}</h3>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${sectionLabelClasses[section]}`}
        >
          {section}
        </span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-slate-600">
        <span className="flex items-center gap-2">
          <Clock3 size={16} />
          {test.durationMinutes} min
        </span>
        <span className="flex items-center gap-2">
          <BookOpen size={16} />
          {test.questionCount} questions
        </span>
        <span>{test.questionCount * test.marksPerQuestion} total marks</span>
        {section === 'completed' && (
          <span>
            {Number(test.score).toFixed(2)} score · {Number(test.accuracy).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-500">
        Available: {displayDate(test.availableFrom)} – {displayDate(test.availableTo)}
      </p>
      <button className="button button-primary mt-5 w-full" onClick={action}>
        {section === 'pending' ? (
          <>
            <Play size={16} /> Start test
          </>
        ) : section === 'draft' ? (
          <>
            <RotateCcw size={16} /> Resume test
          </>
        ) : (
          'View detailed result'
        )}
      </button>
    </article>
  );
}
function TestRunner({
  attempt: initial,
  onBack,
  onSubmitted,
}: {
  attempt: Attempt;
  onBack: () => void;
  onSubmitted: (attempt: Attempt) => void;
}): React.JSX.Element {
  const [attempt, setAttempt] = useState(initial);
  const [index, setIndex] = useState(Math.max(0, initial.current_question - 1));
  const [now, setNow] = useState(Date.now());
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const question = attempt.questions[index];
  const secondsLeft = Math.max(
    0,
    Math.floor((new Date(attempt.expires_at).getTime() - now) / 1000),
  );
  const save = async (updated = attempt, current = index): Promise<void> => {
    await studentApi.saveProgress(updated.id, current + 1, updated.questions);
  };
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => void save(), 15000);
    return () => window.clearInterval(timer);
  }, [attempt, index]);
  useEffect(() => {
    const timer = window.setInterval(
      () =>
        setAttempt((value) => ({
          ...value,
          questions: value.questions.map((item, itemIndex) =>
            itemIndex === index
              ? { ...item, visited: true, timeSpentSeconds: item.timeSpentSeconds + 1 }
              : item,
          ),
        })),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [index]);
  const update = (fn: (q: AttemptQuestion) => AttemptQuestion): void =>
    setAttempt((value) => ({
      ...value,
      questions: value.questions.map((item, i) =>
        i === index ? fn({ ...item, visited: true }) : item,
      ),
    }));
  const move = async (next: number): Promise<void> => {
    const target = Math.max(0, Math.min(next, attempt.questions.length - 1));
    const updated = {
      ...attempt,
      questions: attempt.questions.map((item, itemIndex) =>
        itemIndex === index ? { ...item, visited: true } : item,
      ),
    };
    setAttempt(updated);
    setIndex(target);
    await save(updated, target);
  };
  const submit = async (): Promise<void> => {
    setBusy(true);
    try {
      await save();
      await studentApi.submit(attempt.id);
      onSubmitted(await studentApi.attempt(attempt.id));
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (secondsLeft === 0 && !busy) void submit();
  }, [secondsLeft]);
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <p className="text-sm font-bold">{attempt.name}</p>
            <p className="text-xs text-slate-500">
              Question {index + 1} of {attempt.questions.length}
            </p>
          </div>
          <div
            className={`rounded-lg px-3 py-2 font-mono text-lg font-bold ${secondsLeft < 300 ? 'bg-red-50 text-red-700' : 'bg-indigo-50 text-indigo-700'}`}
          >
            ⏱ {formatTime(secondsLeft)}
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-5 p-4 lg:grid-cols-[1fr_280px] sm:p-6">
        <section className="card p-5 sm:p-7">
          <div className="flex items-center justify-between">
            <p className="font-bold">Question {question.questionNumber}</p>
            <button
              className="text-sm font-semibold text-indigo-600"
              onClick={() => update((q) => ({ ...q, markedForReview: !q.markedForReview }))}
            >
              {question.markedForReview ? 'Unmark review' : 'Mark for review'}
            </button>
          </div>
          <img
            className="mt-5 max-h-96 w-full object-contain"
            src={question.imagePath}
            alt={`Question ${question.questionNumber}`}
          />
          <fieldset className="mt-6 grid gap-3">
            <legend className="sr-only">Select an answer</legend>
            {answers.map((letter) => (
              <label
                key={letter}
                className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border p-3 ${question.selectedAnswer === letter ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}
              >
                <input
                  type="radio"
                  name="answer"
                  checked={question.selectedAnswer === letter}
                  onChange={() => update((q) => ({ ...q, selectedAnswer: letter }))}
                />
                <span className="font-bold">{letter}.</span>
                <span>{question[`option${letter}` as keyof AttemptQuestion] as string}</span>
              </label>
            ))}
          </fieldset>
          <div className="mt-7 flex flex-wrap justify-between gap-3">
            <button
              className="button button-secondary"
              onClick={() => update((q) => ({ ...q, selectedAnswer: null }))}
            >
              Clear answer
            </button>
            <div className="flex gap-3">
              <button
                className="button button-secondary"
                disabled={index === 0}
                onClick={() => void move(index - 1)}
              >
                <ChevronLeft size={17} /> Previous
              </button>
              <button
                className="button button-primary"
                disabled={index === attempt.questions.length - 1}
                onClick={() => void move(index + 1)}
              >
                Next <ChevronRight size={17} />
              </button>
            </div>
          </div>
        </section>
        <aside className="card h-fit p-5">
          <h2 className="font-bold">Question palette</h2>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {attempt.questions.map((item, i) => (
              <button
                key={item.id}
                onClick={() => void move(i)}
                className={`min-h-10 rounded-md text-sm font-bold ${i === index ? 'ring-2 ring-indigo-500' : ''} ${item.markedForReview ? 'bg-violet-600 text-white' : item.selectedAnswer ? 'bg-emerald-600 text-white' : item.visited ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'}`}
              >
                {item.questionNumber}
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            Green: answered · red: visited/unanswered · purple: marked for review.
          </p>
          <button
            className="button mt-5 w-full border border-red-200 bg-red-50 text-red-700"
            onClick={() => setConfirm(true)}
          >
            <Send size={16} /> Submit test
          </button>
          <button
            className="mt-4 w-full text-sm font-semibold text-slate-600"
            onClick={() => void save().then(onBack)}
          >
            Save and exit
          </button>
        </aside>
      </div>
      {confirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-20 grid place-items-center bg-slate-950/40 p-4"
        >
          <div className="card max-w-md p-6">
            <h2 className="text-xl font-bold">Submit your test?</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              You cannot change answers after submission. Unanswered questions will be scored as
              skipped.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button className="button button-secondary" onClick={() => setConfirm(false)}>
                Cancel
              </button>
              <button
                className="button button-primary"
                disabled={busy}
                onClick={() => void submit()}
              >
                {busy ? 'Submitting…' : 'Submit now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
function ResultView({
  attempt,
  onBack,
}: {
  attempt: Attempt;
  onBack: () => void;
}): React.JSX.Element {
  const [analysis, setAnalysis] = useState<Analysis[]>([]);
  useEffect(() => {
    void studentApi.analysis(attempt.id).then(setAnalysis);
  }, [attempt.id]);
  const total = attempt.questions.length;
  const metrics: Array<[string, string | number]> = [
    ['Correct', attempt.correct_count ?? 0],
    ['Incorrect', attempt.incorrect_count ?? 0],
    ['Skipped', attempt.unanswered_count ?? 0],
    ['Positive marks', attempt.positive_marks ?? 0],
    ['Negative marks', attempt.negative_marks ?? 0],
    ['Time taken', formatTime(attempt.time_taken_seconds ?? 0)],
  ];
  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <button className="button button-secondary" onClick={onBack}>
          <ChevronLeft size={16} /> Dashboard
        </button>
        <section className="card mt-5 overflow-hidden">
          <div className="bg-indigo-700 p-6 text-white sm:p-8">
            <p className="text-sm font-bold tracking-wider text-indigo-200">TEST RESULT</p>
            <h1 className="mt-2 text-3xl font-bold">{attempt.name}</h1>
            <p className="mt-5 text-5xl font-bold">
              {Number(attempt.score).toFixed(2)}{' '}
              <span className="text-xl font-medium text-indigo-200">
                / {(total * attempt.marksPerQuestion).toFixed(2)}
              </span>
            </p>
          </div>
          <div className="grid gap-4 p-6 sm:grid-cols-3">
            {metrics.map(([label, value]) => (
              <div key={label} className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-1 text-xl font-bold">{value}</p>
              </div>
            ))}
          </div>
          <div className="border-t p-6">
            <p className="font-bold">
              Accuracy: {Number(attempt.accuracy).toFixed(1)}% · Percentage:{' '}
              {Number(attempt.percentage).toFixed(1)}%
            </p>
          </div>
        </section>
        <section className="mt-6">
          <h2 className="text-2xl font-bold">Question analysis</h2>
          <div className="mt-4 space-y-4">
            {attempt.questions.map((question) => {
              const stats = analysis.find((item) => item.questionId === question.id);
              const status = !question.selectedAnswer
                ? 'Skipped'
                : question.selectedAnswer === question.correctAnswer
                  ? 'Correct'
                  : 'Incorrect';
              const marks =
                status === 'Correct'
                  ? attempt.marksPerQuestion
                  : status === 'Incorrect' && attempt.hasNegativeMarking
                    ? -Number(attempt.negativeMarksPerQuestion)
                    : 0;
              return (
                <article key={question.id} className="card p-5">
                  <div className="flex flex-wrap justify-between gap-3">
                    <h3 className="font-bold">Question {question.questionNumber}</h3>
                    <span className="font-bold">
                      {status} · {marks} marks
                    </span>
                  </div>
                  <img
                    className="mt-4 max-h-96 w-full rounded-lg border border-slate-100 bg-slate-50 object-contain"
                    src={question.imagePath}
                    alt={`Question ${question.questionNumber}`}
                    loading="lazy"
                    decoding="async"
                  />
                  <p className="mt-3 text-sm text-slate-600">
                    Your answer: <b>{question.selectedAnswer ?? 'Not answered'}</b> · Correct
                    answer: <b>{question.correctAnswer}</b>
                  </p>
                  {stats && (
                    <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-5">
                      <span>
                        {stats.correctCount}/{stats.totalAttempts} correct (
                        {Math.round((stats.correctCount / Math.max(stats.totalAttempts, 1)) * 100)}
                        %)
                      </span>
                      <span>
                        {stats.incorrectCount}/{stats.totalAttempts} incorrect (
                        {Math.round(
                          (stats.incorrectCount / Math.max(stats.totalAttempts, 1)) * 100,
                        )}
                        %)
                      </span>
                      <span>{stats.skippedCount} skipped</span>
                      <span>Avg: {formatTime(stats.averageTimeSeconds)}</span>
                      <span>
                        Top:{' '}
                        {stats.topPerformerTimeSeconds === null
                          ? '—'
                          : formatTime(stats.topPerformerTimeSeconds)}
                      </span>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
function Analytics({ points }: { points: Dashboard['analytics'] }): React.JSX.Element {
  const chronological = [...points].reverse();
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold">Performance trends</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Chart title="Score trend" points={chronological} metric="score" suffix=" marks" />
        <Chart title="Accuracy trend" points={chronological} metric="accuracy" suffix="%" />
      </div>
    </section>
  );
}
function Chart({
  title,
  points,
  metric,
  suffix,
}: {
  title: string;
  points: Dashboard['analytics'];
  metric: 'score' | 'accuracy';
  suffix: string;
}): React.JSX.Element {
  const color = metric === 'score' ? '#4f46e5' : '#0891b2';
  const data: ChartData<'line'> = {
    labels: points.map((_point, index) => `Test ${index + 1}`),
    datasets: [
      {
        label: title,
        data: points.map((point) => point[metric]),
        borderColor: color,
        backgroundColor: metric === 'score' ? 'rgba(79, 70, 229, 0.14)' : 'rgba(8, 145, 178, 0.14)',
        fill: true,
        tension: 0.42,
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: color,
        pointBorderWidth: 3,
      },
    ],
  };
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: { display: false },
      tooltip: {
        displayColors: false,
        backgroundColor: '#172033',
        padding: 12,
        titleFont: { weight: 'bold' },
        callbacks: {
          title: (items) => points[items[0].dataIndex]?.name ?? 'Test',
          label: (item) => `${Number(item.parsed.y ?? 0).toFixed(2)}${suffix}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: '#64748b', font: { size: 11 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: '#e2e8f0' },
        border: { display: false },
        ticks: {
          color: '#64748b',
          font: { size: 11 },
          callback: (value) => `${value}${suffix}`,
        },
      },
    },
  };
  return (
    <article className="card p-5">
      <h3 className="font-bold">{title}</h3>
      {points.length ? (
        <div className="mt-4 h-64">
          <Line data={data} options={options} aria-label={title} />
        </div>
      ) : (
        <p className="mt-4 grid h-36 place-items-center rounded-lg bg-slate-50 text-sm text-slate-500">
          Complete a test to see this trend.
        </p>
      )}
    </article>
  );
}
