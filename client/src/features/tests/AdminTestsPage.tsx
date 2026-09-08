import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  FileImage,
  LoaderCircle,
  LogOut,
  Pencil,
  Plus,
  UploadCloud,
  Users,
  X,
} from 'lucide-react';
import { testApi } from './api';
import {
  blankDraft,
  courses,
  optionFormats,
  type Answer,
  type Question,
  type TestDraft,
  type TestAttemptSummary,
  type TestSummary,
} from './types';

type Screen = 'list' | 'form';
const answerChoices: Answer[] = ['A', 'B', 'C', 'D'];
const optionLabels = {
  Alphabetic: ['A', 'B', 'C', 'D'],
  Numeric: ['1', '2', '3', '4'],
  Roman: ['I', 'II', 'III', 'IV'],
} as const;
const localDate = (date: string) =>
  date ? new Date(date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const formatDuration = (seconds: number): string => `${Math.floor(seconds / 60)}m ${seconds % 60}s`;

export function AdminTestsPage({
  onHome,
  onLogout,
}: {
  onHome: () => void;
  onLogout: () => void;
}): React.JSX.Element {
  const [screen, setScreen] = useState<Screen>('list');
  const [tests, setTests] = useState<TestSummary[]>([]);
  const [draft, setDraft] = useState<TestDraft>(blankDraft);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [questionErrors, setQuestionErrors] = useState<number[]>([]);
  const [resultsTest, setResultsTest] = useState<TestSummary | null>(null);
  const [attempts, setAttempts] = useState<TestAttemptSummary[]>([]);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const loadTests = async (): Promise<void> => {
    setLoading(true);
    try {
      setTests(await testApi.list());
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : 'Could not load tests.',
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void loadTests();
  }, []);
  const beginNew = (): void => {
    setDraft(blankDraft());
    setPendingFiles([]);
    setNotice(null);
    setQuestionErrors([]);
    setScreen('form');
  };
  const editTest = async (id: number): Promise<void> => {
    setLoading(true);
    setNotice(null);
    try {
      const data = await testApi.get(id);
      setDraft({
        ...data,
        id,
        course: data.course,
        durationMinutes: String(data.durationMinutes),
        marksPerQuestion: String(data.marksPerQuestion),
        negativeMarksPerQuestion:
          data.negativeMarksPerQuestion === null ? '' : String(data.negativeMarksPerQuestion),
        availableFrom: data.availableFrom.slice(0, 16),
        availableTo: data.availableTo.slice(0, 16),
      });
      setPendingFiles([]);
      setQuestionErrors([]);
      setScreen('form');
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : 'Could not open test.',
      });
    } finally {
      setLoading(false);
    }
  };
  const viewAttempts = async (test: TestSummary): Promise<void> => {
    setResultsTest(test);
    setAttemptsLoading(true);
    try {
      setAttempts(await testApi.attempts(test.id));
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : 'Could not load student results.',
      });
      setResultsTest(null);
    } finally {
      setAttemptsLoading(false);
    }
  };
  const acceptFiles = (files: File[]): void => {
    const images = files.filter((file) => file.type.startsWith('image/'));
    if (!images.length) {
      setNotice({ type: 'error', text: 'Choose image files only.' });
      return;
    }
    setPendingFiles((current) => [...current, ...images]);
    setNotice(null);
  };
  const onDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    acceptFiles(Array.from(event.dataTransfer.files));
  };
  const proceed = async (): Promise<void> => {
    if (!pendingFiles.length) {
      if (!draft.questions.length)
        setNotice({ type: 'error', text: 'Upload at least one question image first.' });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const uploaded = await testApi.upload(pendingFiles);
      const existing = new Set(draft.questions.map((q) => q.questionNumber));
      if (uploaded.some((item) => existing.has(item.questionNumber)))
        throw new Error('A question image with one of those numbers already exists.');
      setDraft((current) => ({
        ...current,
        questions: [
          ...current.questions,
          ...uploaded.map((item) => ({
            ...item,
            correctAnswer: '' as const,
          })),
        ].sort((a, b) => a.questionNumber - b.questionNumber),
      }));
      setPendingFiles([]);
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : 'Image upload failed.',
      });
    } finally {
      setSaving(false);
    }
  };
  const updateQuestion = (number: number, patch: Partial<Question>): void =>
    setDraft((current) => ({
      ...current,
      questions: current.questions.map((q) =>
        q.questionNumber === number ? { ...q, ...patch } : q,
      ),
    }));
  const removeQuestion = (number: number): void =>
    setDraft((current) => ({
      ...current,
      questions: current.questions.filter((q) => q.questionNumber !== number),
    }));
  const selectAnswer = (number: number, answer: Answer): void => {
    updateQuestion(number, { correctAnswer: answer });
    setQuestionErrors((current) => current.filter((questionNumber) => questionNumber !== number));
  };
  const valid = Boolean(
    draft.course &&
      draft.name.trim() &&
      draft.durationMinutes &&
      draft.availableFrom &&
      draft.availableTo &&
      draft.marksPerQuestion &&
      draft.questions.length &&
      draft.questions.every((q) => q.correctAnswer) &&
      (!draft.hasNegativeMarking || draft.negativeMarksPerQuestion),
  );
  const submit = async (): Promise<void> => {
    const unansweredQuestions = draft.questions
      .filter((question) => !question.correctAnswer)
      .map((question) => question.questionNumber);
    setQuestionErrors(unansweredQuestions);
    if (!valid) {
      setNotice({
        type: 'error',
        text: unansweredQuestions.length
          ? 'Choose the correct answer for every question before publishing.'
          : 'Complete all required test details before publishing.',
      });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      await testApi.save(draft);
      await loadTests();
      setScreen('list');
      setNotice({ type: 'success', text: `“${draft.name}” was saved and published successfully.` });
    } catch (error) {
      setNotice({
        type: 'error',
        text: error instanceof Error ? error.message : 'Could not save this test.',
      });
    } finally {
      setSaving(false);
    }
  };
  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-indigo-600 text-white">
              <ClipboardList size={22} />
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight">ExamDesk</p>
              <p className="text-xs text-slate-500">Admin workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onHome} className="button button-secondary min-h-9 px-3">
              Admin home
            </button>
            <button
              onClick={onLogout}
              className="button button-secondary min-h-9 px-3"
              aria-label="Sign out"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {notice && (
          <div
            role={notice.type === 'success' ? 'status' : 'alert'}
            className={`mb-5 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${notice.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}
          >
            {notice.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {notice.text}
            <button
              aria-label="Dismiss notification"
              onClick={() => setNotice(null)}
              className="ml-auto"
            >
              <X size={18} />
            </button>
          </div>
        )}
        {screen === 'list' ? (
          <TestList
            tests={tests}
            loading={loading}
            onNew={beginNew}
            onEdit={editTest}
            onViewAttempts={viewAttempts}
          />
        ) : (
          <TestForm
            draft={draft}
            pendingFiles={pendingFiles}
            saving={saving}
            inputRef={inputRef}
            onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
            onDrop={onDrop}
            onFiles={(event) => acceptFiles(Array.from(event.target.files ?? []))}
            onRemovePending={(index) =>
              setPendingFiles((current) => current.filter((_, i) => i !== index))
            }
            onProceed={() => void proceed()}
            onSelectAnswer={selectAnswer}
            onRemoveQuestion={removeQuestion}
            questionErrors={questionErrors}
            onBack={() => setScreen('list')}
            onSubmit={() => void submit()}
          />
        )}
        {resultsTest && (
          <StudentResultsModal
            test={resultsTest}
            attempts={attempts}
            loading={attemptsLoading}
            onClose={() => setResultsTest(null)}
          />
        )}
      </div>
    </main>
  );
}

function TestList({
  tests,
  loading,
  onNew,
  onEdit,
  onViewAttempts,
}: {
  tests: TestSummary[];
  loading: boolean;
  onNew: () => void;
  onEdit: (id: number) => Promise<void>;
  onViewAttempts: (test: TestSummary) => Promise<void>;
}): React.JSX.Element {
  return (
    <section>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-indigo-600">TEST LIBRARY</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Your published tests</h1>
        </div>
        <button onClick={onNew} className="button button-primary">
          <Plus size={18} />
          Create test
        </button>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-180 text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-4 font-semibold">Test</th>
              <th className="px-5 py-4 font-semibold">Course</th>
              <th className="px-5 py-4 font-semibold">Availability</th>
              <th className="px-5 py-4 font-semibold">Status</th>
              <th className="px-5 py-4 font-semibold">Students</th>
              <th className="px-5 py-4">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                  <LoaderCircle className="mx-auto mb-2 animate-spin" />
                  Loading tests…
                </td>
              </tr>
            ) : tests.length ? (
              tests.map((test) => (
                <tr key={test.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-5 py-4">
                    <p className="font-semibold">{test.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {test.durationMinutes} min · {test.marksPerQuestion} marks/question
                    </p>
                  </td>
                  <td className="px-5 py-4">{test.course}</td>
                  <td className="px-5 py-4 text-xs text-slate-600">
                    {localDate(test.availableFrom)} — {localDate(test.availableTo)}
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      Published
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2 text-xs font-semibold">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                        {test.completedCount} completed
                      </span>
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
                        {test.draftCount} draft
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => void onViewAttempts(test)}
                      className="button button-secondary mr-2 min-h-9 px-3"
                    >
                      <Users size={15} />
                      Students
                    </button>
                    <button
                      onClick={() => void onEdit(test.id)}
                      className="button button-secondary min-h-9 px-3"
                    >
                      <Pencil size={15} />
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center">
                  <FileImage className="mx-auto mb-3 text-slate-300" size={32} />
                  <p className="font-semibold">No tests created yet</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Start by adding your first question set.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StudentResultsModal({
  test,
  attempts,
  loading,
  onClose,
}: {
  test: TestSummary;
  attempts: TestAttemptSummary[];
  loading: boolean;
  onClose: () => void;
}): React.JSX.Element {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-results-title"
      className="fixed inset-0 z-30 grid place-items-center bg-slate-950/45 p-4"
    >
      <section className="card max-h-[90vh] w-full max-w-7xl overflow-hidden shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
          <div>
            <p className="text-sm font-semibold text-indigo-600">STUDENT RESULTS</p>
            <h2 id="student-results-title" className="mt-1 text-2xl font-bold">
              {test.name}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {test.completedCount} completed · {test.draftCount} in progress
            </p>
          </div>
          <button
            onClick={onClose}
            className="button button-secondary size-10 min-h-10 p-0"
            aria-label="Close student results"
          >
            <X size={18} />
          </button>
        </header>
        <div className="max-h-[calc(90vh-130px)] overflow-auto">
          <table className="w-full min-w-280 text-left text-sm">
            <thead className="sticky top-0 border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-4 font-semibold">Rank</th>
                <th className="px-4 py-4 font-semibold">Student</th>
                <th className="px-4 py-4 font-semibold">Status</th>
                <th className="px-4 py-4 font-semibold">Attempted</th>
                <th className="px-4 py-4 font-semibold">Correct</th>
                <th className="px-4 py-4 font-semibold">Wrong</th>
                <th className="px-4 py-4 font-semibold">Left</th>
                <th className="px-4 py-4 font-semibold">+ Marks</th>
                <th className="px-4 py-4 font-semibold">− Marks</th>
                <th className="px-4 py-4 font-semibold">Final marks</th>
                <th className="px-4 py-4 font-semibold">Time taken</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-5 py-12 text-center text-slate-500">
                    <LoaderCircle className="mx-auto mb-2 animate-spin" />
                    Loading student results…
                  </td>
                </tr>
              ) : attempts.length ? (
                attempts.map((attempt) => (
                  <tr key={attempt.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-4 font-bold text-indigo-700">
                      {attempt.rank ? `#${attempt.rank}` : '—'}
                    </td>
                    <td className="px-4 py-4 font-semibold">{attempt.studentName}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${attempt.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}
                      >
                        {attempt.status === 'Completed' ? 'Completed' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {attempt.attemptedQuestions}/{attempt.totalQuestions}
                    </td>
                    <td className="px-4 py-4 text-emerald-700">{attempt.correctCount}</td>
                    <td className="px-4 py-4 text-rose-700">{attempt.incorrectCount}</td>
                    <td className="px-4 py-4">{attempt.unansweredCount}</td>
                    <td className="px-4 py-4 text-emerald-700">
                      {attempt.positiveMarks.toFixed(2)}
                    </td>
                    <td className="px-4 py-4 text-rose-700">{attempt.negativeMarks.toFixed(2)}</td>
                    <td className="px-4 py-4 font-bold">{attempt.finalScore.toFixed(2)}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {formatDuration(attempt.timeTakenSeconds)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="px-5 py-14 text-center text-slate-500">
                    No students have started this test yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function TestForm(props: {
  draft: TestDraft;
  pendingFiles: File[];
  saving: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (patch: Partial<TestDraft>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onFiles: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemovePending: (index: number) => void;
  onProceed: () => void;
  onSelectAnswer: (number: number, answer: Answer) => void;
  onRemoveQuestion: (number: number) => void;
  questionErrors: number[];
  onBack: () => void;
  onSubmit: () => void;
}): React.JSX.Element {
  const {
    draft,
    pendingFiles,
    saving,
    inputRef,
    onChange,
    onDrop,
    onFiles,
    onRemovePending,
    onProceed,
    onSelectAnswer,
    onRemoveQuestion,
    questionErrors,
    onBack,
    onSubmit,
  } = props;
  return (
    <section>
      <div className="mb-7 flex items-center gap-4">
        <button
          onClick={onBack}
          className="button button-secondary size-11 p-0"
          aria-label="Back to test list"
        >
          <ArrowLeft size={19} />
        </button>
        <div>
          <p className="text-sm font-semibold text-indigo-600">
            {draft.id ? 'EDIT TEST' : 'NEW TEST'}
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            {draft.id ? draft.name : 'Build a test'}
          </h1>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-6">
          <section className="card p-5 sm:p-7">
            <h2 className="text-lg font-bold">1. Test details</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="field sm:col-span-2">
                Course
                <select
                  value={draft.course}
                  onChange={(e) => onChange({ course: e.target.value as TestDraft['course'] })}
                  className="input"
                >
                  <option value="">Choose a course</option>
                  {courses.map((course) => (
                    <option key={course}>{course}</option>
                  ))}
                </select>
              </label>
              <label className="field sm:col-span-2">
                Test name
                <input
                  value={draft.name}
                  onChange={(e) => onChange({ name: e.target.value })}
                  className="input"
                  placeholder="e.g. Indian Polity Mock 01"
                />
              </label>
              <fieldset className="field sm:col-span-2">
                <legend>Options shown in question images</legend>
                <p className="-mt-1 text-xs font-normal text-slate-500">
                  Select the label style already printed in your uploaded images.
                </p>
                <div className="mt-1 flex flex-wrap gap-4">
                  {optionFormats.map((format) => (
                    <label key={format} className="flex items-center gap-2 font-normal">
                      <input
                        type="radio"
                        name="optionFormat"
                        checked={draft.optionFormat === format}
                        onChange={() => onChange({ optionFormat: format })}
                      />
                      {format} ({optionLabels[format].join(', ')})
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="field">
                Duration (minutes)
                <input
                  type="number"
                  min="1"
                  value={draft.durationMinutes}
                  onChange={(e) => onChange({ durationMinutes: e.target.value })}
                  className="input"
                  placeholder="60"
                />
              </label>
              <label className="field">
                Marks per question
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  value={draft.marksPerQuestion}
                  onChange={(e) => onChange({ marksPerQuestion: e.target.value })}
                  className="input"
                  placeholder="2"
                />
              </label>
              <label className="field">
                Available from
                <input
                  type="datetime-local"
                  value={draft.availableFrom}
                  onChange={(e) => onChange({ availableFrom: e.target.value })}
                  className="input"
                />
              </label>
              <label className="field">
                Available to
                <input
                  type="datetime-local"
                  value={draft.availableTo}
                  onChange={(e) => onChange({ availableTo: e.target.value })}
                  className="input"
                />
              </label>
              <fieldset className="field">
                <legend>Negative marking</legend>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={!draft.hasNegativeMarking}
                      onChange={() =>
                        onChange({ hasNegativeMarking: false, negativeMarksPerQuestion: '' })
                      }
                    />
                    No
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={draft.hasNegativeMarking}
                      onChange={() => onChange({ hasNegativeMarking: true })}
                    />
                    Yes
                  </label>
                </div>
              </fieldset>
              {draft.hasNegativeMarking && (
                <label className="field">
                  Negative marks per question
                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    value={draft.negativeMarksPerQuestion}
                    onChange={(e) => onChange({ negativeMarksPerQuestion: e.target.value })}
                    className="input"
                    placeholder="0.66"
                  />
                </label>
              )}
            </div>
          </section>
          <section className="card p-5 sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">2. Question images</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Use names such as <code>crop-1.png</code>. Numbers determine question order.
                </p>
              </div>
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                {draft.questions.length} ready
              </span>
            </div>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className="mt-5 grid min-h-44 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-6 text-center transition hover:border-indigo-400 hover:bg-indigo-50"
            >
              <div>
                <UploadCloud className="mx-auto mb-3 text-indigo-600" size={30} />
                <p className="font-semibold">Drop question images here</p>
                <p className="mt-1 text-sm text-slate-500">
                  or click to browse · PNG, JPG, WEBP · up to 10MB each
                </p>
              </div>
              <input
                ref={inputRef}
                className="sr-only"
                type="file"
                accept="image/*"
                multiple
                onChange={onFiles}
              />
            </div>
            {pendingFiles.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-semibold">
                  Ready to upload ({pendingFiles.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {pendingFiles.map((file, index) => (
                    <span
                      key={`${file.name}-${index}`}
                      className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs"
                    >
                      {file.name}
                      <button
                        aria-label={`Remove ${file.name}`}
                        onClick={() => onRemovePending(index)}
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <button
              onClick={onProceed}
              disabled={saving || (!pendingFiles.length && !draft.questions.length)}
              className="button button-secondary mt-5"
            >
              {saving ? (
                <LoaderCircle className="animate-spin" size={17} />
              ) : (
                <UploadCloud size={17} />
              )}
              {pendingFiles.length ? 'Proceed & generate questions' : 'Questions generated'}
            </button>
          </section>
          {draft.questions.length > 0 && (
            <section className="card p-5 sm:p-7">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">3. Confirm correct answers</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    The answer options are already in your question images. Select one answer for
                    each question.
                  </p>
                </div>
              </div>
              <div className="mt-6 space-y-6">
                {draft.questions.map((question) => (
                  <article
                    key={question.questionNumber}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-bold">Question {question.questionNumber}</h3>
                      <button
                        onClick={() => onRemoveQuestion(question.questionNumber)}
                        className="text-sm font-semibold text-rose-600 hover:text-rose-700"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid gap-5">
                      <img
                        src={question.imagePath}
                        alt={`Question ${question.questionNumber}`}
                        loading="lazy"
                        className="h-auto w-full rounded-lg border border-slate-200"
                      />
                      <fieldset className="field">
                        <legend>
                          Correct answer <span className="text-rose-600">*</span>
                        </legend>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          {answerChoices.map((answer, index) => (
                            <label
                              key={answer}
                              className={`flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition ${question.correctAnswer === answer ? 'border-indigo-600 bg-indigo-50 text-indigo-800' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300'}`}
                            >
                              <input
                                type="radio"
                                name={`correct-answer-${question.questionNumber}`}
                                value={answer}
                                checked={question.correctAnswer === answer}
                                onChange={() => onSelectAnswer(question.questionNumber, answer)}
                              />
                              Option {optionLabels[draft.optionFormat][index]}
                            </label>
                          ))}
                        </div>
                        {questionErrors.includes(question.questionNumber) && (
                          <p role="alert" className="text-sm font-medium text-rose-600">
                            Please select the correct answer for Question {question.questionNumber}.
                          </p>
                        )}
                      </fieldset>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
        <aside className="h-fit card p-5 lg:sticky lg:top-6">
          <p className="text-xs font-bold tracking-widest text-indigo-600">READY TO PUBLISH</p>
          <h2 className="mt-2 text-xl font-bold">Test summary</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Course</dt>
              <dd className="font-semibold">{draft.course || '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Questions</dt>
              <dd className="font-semibold">{draft.questions.length}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Status</dt>
              <dd className="font-semibold text-emerald-700">Published on save</dd>
            </div>
          </dl>
          <button
            onClick={onSubmit}
            disabled={saving}
            className="button button-primary mt-7 w-full"
          >
            {saving && <LoaderCircle className="animate-spin" size={17} />}
            {draft.id ? 'Save changes' : 'Create & publish test'}
          </button>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Saving publishes this test immediately. All question options must be filled.
          </p>
        </aside>
      </div>
    </section>
  );
}
