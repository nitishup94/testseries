import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  ShieldCheck,
  Trophy,
} from 'lucide-react';

export function StudentHomePage({ onAdminLogin }: { onAdminLogin: () => void }): React.JSX.Element {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-indigo-600 text-white">
              <GraduationCap size={23} />
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight">ExamDesk</p>
              <p className="text-xs text-slate-500">Test Series Platform</p>
            </div>
          </div>
          <button onClick={onAdminLogin} className="button button-secondary min-h-10 px-3">
            Admin login
          </button>
        </div>
      </header>
      <section className="overflow-hidden bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-24">
          <div>
            <p className="text-sm font-bold tracking-[0.16em] text-indigo-600">
              PREPARE WITH PURPOSE
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
              Practice smarter. Feel ready on exam day.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Focused test series, realistic timing, and a plan that keeps your preparation moving
              forward—one mock at a time.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#series" className="button button-primary">
                Explore test series
                <ArrowRight size={17} />
              </a>
              <a href="#plan" className="button button-secondary">
                How it works
              </a>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-slate-600">
              <span className="flex items-center gap-2">
                <CheckCircle2 size={17} className="text-emerald-600" />
                Timed practice
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 size={17} className="text-emerald-600" />
                Exam-style questions
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 size={17} className="text-emerald-600" />
                Study with clarity
              </span>
            </div>
          </div>
          <div className="relative rounded-3xl bg-indigo-700 p-6 text-white shadow-xl sm:p-8">
            <p className="text-sm font-bold tracking-wider text-indigo-200">YOUR PREP PLAN</p>
            <h2 className="mt-2 text-2xl font-bold">A simple weekly rhythm</h2>
            <div className="mt-6 space-y-3">
              {[
                ['Monday', 'Topic revision', BookOpen],
                ['Wednesday', 'Practice questions', Clock3],
                ['Sunday', 'Full mock test', Trophy],
              ].map(([day, task, Icon]) => (
                <div
                  key={day as string}
                  className="flex items-center gap-3 rounded-xl bg-white/10 p-3"
                >
                  <div className="grid size-9 place-items-center rounded-lg bg-white/15">
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-indigo-200">{day as string}</p>
                    <p className="font-semibold">{task as string}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section id="series" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-bold tracking-[0.16em] text-indigo-600">CHOOSE YOUR GOAL</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight">
            Test series made for your exam.
          </h2>
          <p className="mt-3 text-slate-600">
            Build a consistent practice routine around the exam you are preparing for.
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {['UPSC', 'UPPCS', 'CGL', 'GATE'].map((course) => (
            <article
              key={course}
              className="card p-5 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
            >
              <div className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                <BookOpen size={20} />
              </div>
              <h3 className="mt-5 text-lg font-bold">{course}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Topic-wise practice and full-length mock tests.
              </p>
              <a
                href="#plan"
                className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-indigo-600"
              >
                View plan <ArrowRight size={15} />
              </a>
            </article>
          ))}
        </div>
      </section>
      <section id="plan" className="border-y border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-bold tracking-[0.16em] text-indigo-600">
                THE STUDENT FLOW
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight">Make every mock count.</h2>
              <p className="mt-3 leading-7 text-slate-600">
                A good test series is not just about marks. It gives you a dependable way to learn,
                practice, and improve.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Step
                icon={<CalendarDays size={21} />}
                number="01"
                title="Plan"
                text="Pick a test that matches your preparation stage."
              />
              <Step
                icon={<Clock3 size={21} />}
                number="02"
                title="Attempt"
                text="Practice in a focused, timed environment."
              />
              <Step
                icon={<ShieldCheck size={21} />}
                number="03"
                title="Improve"
                text="Review your effort and prepare for the next one."
              />
            </div>
          </div>
        </div>
      </section>
      <footer className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:justify-between sm:px-6">
        <p>© 2026 ExamDesk. Built for focused preparation.</p>
        <p>Learn steadily. Test confidently.</p>
      </footer>
    </main>
  );
}

function Step({
  icon,
  number,
  title,
  text,
}: {
  icon: React.ReactNode;
  number: string;
  title: string;
  text: string;
}): React.JSX.Element {
  return (
    <article className="rounded-2xl bg-white p-5">
      <div className="flex items-center justify-between text-indigo-600">
        <span>{icon}</span>
        <span className="text-xs font-bold tracking-widest">{number}</span>
      </div>
      <h3 className="mt-6 text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
    </article>
  );
}
