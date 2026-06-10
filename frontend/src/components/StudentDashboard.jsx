import { useState, useEffect, useCallback } from 'react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import VocabularyQuiz from './VocabularyQuiz.jsx';

function formatDateTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const [classes, setClasses] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [gradesKey, setGradesKey] = useState(0);

  const loadClasses = useCallback(async () => {
    try {
      const { classes: list } = await api.get('/api/classes');
      setClasses(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  // Re-render the grades panel after a new submission is graded/submitted.
  const refreshGrades = useCallback(() => setGradesKey((k) => k + 1), []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🇰🇷</span>
            <div>
              <h1 className="text-lg font-bold text-slate-800">TOPIK Station</h1>
              <p className="text-xs text-slate-400">Student dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:inline">
              {user?.fullName}
            </span>
            <button
              onClick={logout}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-6">
        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Classes */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            My Classes
          </h2>
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : classes.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-400">
              You are not enrolled in any classes yet. Ask your teacher to enroll
              you.
            </p>
          ) : (
            <ul className="space-y-3">
              {classes.map((c) => (
                <ClassCard
                  key={c.id}
                  klass={c}
                  expanded={expanded === c.id}
                  onToggle={() => setExpanded(expanded === c.id ? null : c.id)}
                  onSubmitted={refreshGrades}
                />
              ))}
            </ul>
          )}
        </section>

        {/* Grades */}
        <GradesPanel key={gradesKey} />

        {/* Vocabulary quiz */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            TOPIK Vocabulary Quiz
          </h2>
          <VocabularyQuiz />
        </section>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Class card with schedules + homework                               */
/* ------------------------------------------------------------------ */
function ClassCard({ klass, expanded, onToggle, onSubmitted }) {
  const [schedules, setSchedules] = useState([]);
  const [homework, setHomework] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [sch, hw] = await Promise.all([
        api.get(`/api/classes/${klass.id}/schedules`),
        api.get(`/api/classes/${klass.id}/homework`),
      ]);
      setSchedules(sch.schedules);
      setHomework(hw.homework);
      setLoaded(true);
    } catch (err) {
      setError(err.message);
    }
  }, [klass.id]);

  useEffect(() => {
    if (expanded && !loaded) load();
  }, [expanded, loaded, load]);

  return (
    <li className="rounded-xl border border-slate-200 bg-white">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <p className="font-semibold text-slate-800">{klass.title}</p>
          <p className="text-xs text-slate-400">
            {klass.teacher_name ? `Teacher: ${klass.teacher_name}` : ''}
          </p>
        </div>
        <span className="text-slate-400">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="space-y-5 border-t border-slate-100 px-4 py-4">
          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Live schedule */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Live Sessions
            </h4>
            {schedules.length === 0 ? (
              <p className="text-sm text-slate-400">No sessions scheduled.</p>
            ) : (
              <ul className="space-y-2">
                {schedules.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {s.title}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatDateTime(s.start_time)} –{' '}
                        {formatDateTime(s.end_time)} ·{' '}
                        {s.platform.replace('_', ' ')}
                      </p>
                    </div>
                    <a
                      href={s.live_link}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                    >
                      Join live
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Homework */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Homework
            </h4>
            {homework.length === 0 ? (
              <p className="text-sm text-slate-400">No assignments yet.</p>
            ) : (
              <ul className="space-y-3">
                {homework.map((hw) => (
                  <HomeworkItem
                    key={hw.id}
                    hw={hw}
                    onSubmitted={async () => {
                      await load();
                      if (onSubmitted) onSubmitted();
                    }}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Homework item with submission form                                 */
/* ------------------------------------------------------------------ */
function HomeworkItem({ hw, onSubmitted }) {
  const hasSubmission = !!hw.submission_id;
  const [content, setContent] = useState(hw.submission_content || '');
  const [link, setLink] = useState(hw.submission_link || '');
  const [open, setOpen] = useState(!hasSubmission);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const graded =
    hw.submission_score !== null && hw.submission_score !== undefined;

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!content.trim() && !link.trim()) {
      setError('Enter text and/or a link.');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/api/homework/${hw.id}/submissions`, {
        content: content.trim() || null,
        link: link.trim() || null,
      });
      setOpen(false);
      await onSubmitted();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="rounded-lg border border-slate-200 p-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-slate-800">{hw.title}</p>
          {hw.description && (
            <p className="mt-0.5 text-sm text-slate-500">{hw.description}</p>
          )}
          <p className="mt-1 text-xs text-slate-400">
            Max {hw.max_score}
            {hw.due_date ? ` · Due ${formatDateTime(hw.due_date)}` : ''}
          </p>
        </div>
        {graded ? (
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
            {hw.submission_score}/{hw.max_score}
          </span>
        ) : hasSubmission ? (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
            Submitted
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
            Not submitted
          </span>
        )}
      </div>

      {graded && hw.submission_feedback && (
        <p className="mt-2 rounded bg-green-50 p-2 text-sm text-green-800">
          <span className="font-semibold">Feedback:</span> {hw.submission_feedback}
        </p>
      )}

      {hasSubmission && !open && (
        <button
          onClick={() => setOpen(true)}
          className="mt-2 text-xs font-medium text-indigo-600 hover:underline"
        >
          Resubmit
        </button>
      )}

      {open && (
        <form onSubmit={submit} className="mt-3 space-y-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={2}
            placeholder="Type your answer here…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="…or paste a link (Google Doc, etc.)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? 'Submitting…' : hasSubmission ? 'Resubmit' : 'Submit'}
            </button>
            {hasSubmission && (
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Grades panel                                                       */
/* ------------------------------------------------------------------ */
function GradesPanel() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { submissions: list } = await api.get('/api/submissions/mine');
        if (active) setSubmissions(list);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const graded = submissions.filter(
    (s) => s.score !== null && s.score !== undefined
  );
  const average =
    graded.length === 0
      ? null
      : Math.round(
          (graded.reduce((sum, s) => sum + (s.score / s.max_score) * 100, 0) /
            graded.length) *
            10
        ) / 10;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          My Grades
        </h2>
        {average !== null && (
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700">
            Average: {average}%
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : submissions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-400">
          No submissions yet. Complete some homework to see your grades here.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {submissions.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {s.homework_title}
                </p>
                <p className="text-xs text-slate-400">{s.class_title}</p>
                {s.feedback && (
                  <p className="mt-1 text-xs text-slate-500">“{s.feedback}”</p>
                )}
              </div>
              {s.score !== null && s.score !== undefined ? (
                <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                  {s.score}/{s.max_score}
                </span>
              ) : (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                  Pending
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
