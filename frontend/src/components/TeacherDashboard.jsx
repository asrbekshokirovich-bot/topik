import { useState, useEffect, useCallback } from 'react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const PLATFORMS = [
  { value: 'ZOOM', label: 'Zoom' },
  { value: 'GOOGLE_MEET', label: 'Google Meet' },
  { value: 'OTHER', label: 'Other' },
];

function formatDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Convert an ISO string to a value usable by <input type="datetime-local">. */
function toLocalInput(value) {
  const d = value ? new Date(value) : new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const [classes, setClasses] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [tab, setTab] = useState('students');
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadClasses = useCallback(async () => {
    try {
      const { classes: list } = await api.get('/api/classes');
      setClasses(list);
      setSelectedId((prev) => prev ?? (list[0] ? list[0].id : null));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const selectedClass = classes.find((c) => c.id === selectedId) || null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🇰🇷</span>
            <div>
              <h1 className="text-lg font-bold text-slate-800">TOPIK Station</h1>
              <p className="text-xs text-slate-400">Teacher workspace</p>
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

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[280px_1fr]">
        {/* Sidebar: classes */}
        <aside>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              My Classes
            </h2>
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              + New
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : classes.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-400">
              No classes yet. Create your first class.
            </p>
          ) : (
            <ul className="space-y-2">
              {classes.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                      c.id === selectedId
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span className="block font-semibold text-slate-800">
                      {c.title}
                    </span>
                    <span className="block text-xs text-slate-400">
                      {c.student_count ?? 0} student
                      {Number(c.student_count) === 1 ? '' : 's'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Main: selected class detail */}
        <section>
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {!selectedClass ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-400">
              Select or create a class to get started.
            </div>
          ) : (
            <div>
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-slate-800">
                  {selectedClass.title}
                </h2>
                {selectedClass.description && (
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedClass.description}
                  </p>
                )}
              </div>

              <div className="mb-5 flex gap-1 rounded-lg bg-slate-100 p-1">
                {[
                  { key: 'students', label: 'Students' },
                  { key: 'schedule', label: 'Live Schedule' },
                  { key: 'homework', label: 'Homework' },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${
                      tab === t.key
                        ? 'bg-white text-indigo-600 shadow'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {tab === 'students' && (
                <StudentsTab classId={selectedClass.id} onChange={loadClasses} />
              )}
              {tab === 'schedule' && <ScheduleTab classId={selectedClass.id} />}
              {tab === 'homework' && <HomeworkTab classId={selectedClass.id} />}
            </div>
          )}
        </section>
      </main>

      {showCreate && (
        <CreateClassModal
          onClose={() => setShowCreate(false)}
          onCreated={async () => {
            setShowCreate(false);
            await loadClasses();
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Create class modal                                                 */
/* ------------------------------------------------------------------ */
function CreateClassModal({ onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/classes', { title: title.trim(), description });
      await onCreated();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-bold text-slate-800">Create a class</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. TOPIK I — Beginner Korean"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What will students learn?"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Students tab                                                       */
/* ------------------------------------------------------------------ */
function StudentsTab({ classId, onChange }) {
  const [students, setStudents] = useState([]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { students: list } = await api.get(`/api/classes/${classId}/students`);
      setStudents(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    load();
  }, [load]);

  async function enroll(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!email.trim()) {
      setError('Enter a student email.');
      return;
    }
    try {
      const res = await api.post(`/api/classes/${classId}/enrollments`, {
        email: email.trim(),
      });
      setMessage(`Enrolled ${res.student.fullName}.`);
      setEmail('');
      await load();
      if (onChange) await onChange();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={enroll}
        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row"
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="student@example.com"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Enroll student
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-600">{message}</p>}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : students.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-400">
          No students enrolled yet.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {students.map((s) => (
            <li key={s.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium text-slate-800">{s.full_name}</p>
                <p className="text-xs text-slate-400">{s.email}</p>
              </div>
              <span className="text-xs text-slate-400">
                Joined {formatDateTime(s.enrolled_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Schedule tab                                                       */
/* ------------------------------------------------------------------ */
function ScheduleTab({ classId }) {
  const [schedules, setSchedules] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const blank = {
    title: '',
    startTime: toLocalInput(),
    endTime: toLocalInput(new Date(Date.now() + 60 * 60 * 1000)),
    platform: 'ZOOM',
    liveLink: '',
  };
  const [form, setForm] = useState(blank);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { schedules: list } = await api.get(
        `/api/classes/${classId}/schedules`
      );
      setSchedules(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/api/classes/${classId}/schedules`, {
        title: form.title.trim(),
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        platform: form.platform,
        liveLink: form.liveLink.trim(),
      });
      setForm(blank);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    setError('');
    try {
      await api.del(`/api/schedules/${id}`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={create}
        className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
      >
        <h3 className="font-semibold text-slate-700">Schedule a live session</h3>
        <input
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
          placeholder="Session title"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Start
            </label>
            <input
              type="datetime-local"
              value={form.startTime}
              onChange={(e) => update('startTime', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              End
            </label>
            <input
              type="datetime-local"
              value={form.endTime}
              onChange={(e) => update('endTime', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
          <select
            value={form.platform}
            onChange={(e) => update('platform', e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          >
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <input
            value={form.liveLink}
            onChange={(e) => update('liveLink', e.target.value)}
            placeholder="https://zoom.us/j/…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Add session
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : schedules.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-400">
          No live sessions scheduled.
        </p>
      ) : (
        <ul className="space-y-2">
          {schedules.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <div>
                <p className="font-medium text-slate-800">{s.title}</p>
                <p className="text-xs text-slate-400">
                  {formatDateTime(s.start_time)} – {formatDateTime(s.end_time)} ·{' '}
                  {s.platform.replace('_', ' ')}
                </p>
                <a
                  href={s.live_link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-indigo-600 hover:underline"
                >
                  {s.live_link}
                </a>
              </div>
              <button
                onClick={() => remove(s.id)}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Homework tab                                                       */
/* ------------------------------------------------------------------ */
function HomeworkTab({ classId }) {
  const [homework, setHomework] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const blank = { title: '', description: '', dueDate: '', maxScore: 100 };
  const [form, setForm] = useState(blank);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { homework: list } = await api.get(
        `/api/classes/${classId}/homework`
      );
      setHomework(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/api/classes/${classId}/homework`, {
        title: form.title.trim(),
        description: form.description,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        maxScore: Number(form.maxScore),
      });
      setForm(blank);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={create}
        className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
      >
        <h3 className="font-semibold text-slate-700">Create an assignment</h3>
        <input
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
          placeholder="Assignment title"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
        <textarea
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          rows={2}
          placeholder="Instructions"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Due date
            </label>
            <input
              type="datetime-local"
              value={form.dueDate}
              onChange={(e) => update('dueDate', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Max score (1–100)
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={form.maxScore}
              onChange={(e) => update('maxScore', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Create assignment
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : homework.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-400">
          No assignments yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {homework.map((hw) => (
            <li
              key={hw.id}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{hw.title}</p>
                  {hw.description && (
                    <p className="mt-0.5 text-sm text-slate-500">{hw.description}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-400">
                    Max {hw.max_score} ·{' '}
                    {hw.due_date ? `Due ${formatDateTime(hw.due_date)} · ` : ''}
                    {hw.submission_count ?? 0} submitted · {hw.graded_count ?? 0}{' '}
                    graded
                  </p>
                </div>
                <button
                  onClick={() => setExpanded(expanded === hw.id ? null : hw.id)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  {expanded === hw.id ? 'Hide' : 'Submissions'}
                </button>
              </div>

              {expanded === hw.id && (
                <SubmissionsPanel
                  homeworkId={hw.id}
                  maxScore={hw.max_score}
                  onGraded={load}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Submissions + inline grading                                       */
/* ------------------------------------------------------------------ */
function SubmissionsPanel({ homeworkId, maxScore, onGraded }) {
  const [submissions, setSubmissions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { submissions: list } = await api.get(
        `/api/homework/${homeworkId}/submissions`
      );
      setSubmissions(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [homeworkId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <p className="mt-3 text-sm text-slate-400">Loading submissions…</p>;
  }

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      {submissions.length === 0 ? (
        <p className="text-sm text-slate-400">No submissions yet.</p>
      ) : (
        <ul className="space-y-3">
          {submissions.map((s) => (
            <SubmissionRow
              key={s.id}
              submission={s}
              maxScore={maxScore}
              onGraded={async () => {
                await load();
                if (onGraded) await onGraded();
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function SubmissionRow({ submission, maxScore, onGraded }) {
  const [score, setScore] = useState(
    submission.score === null || submission.score === undefined
      ? ''
      : String(submission.score)
  );
  const [feedback, setFeedback] = useState(submission.feedback || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(null);

  async function suggest() {
    setError('');
    setAiLoading(true);
    try {
      const { suggestion: s } = await api.post('/api/ai/grade-suggestion', {
        submissionId: submission.id,
      });
      setSuggestion(s);
      setScore(String(s.score));
      if (s.feedback) setFeedback(s.feedback);
    } catch (err) {
      setError(err.message);
    } finally {
      setAiLoading(false);
    }
  }

  async function grade(e) {
    e.preventDefault();
    setError('');
    const numeric = Number(score);
    if (score === '' || Number.isNaN(numeric) || numeric < 0 || numeric > maxScore) {
      setError(`Score must be between 0 and ${maxScore}.`);
      return;
    }
    setSaving(true);
    try {
      await api.put(`/api/submissions/${submission.id}/grade`, {
        score: numeric,
        feedback,
      });
      await onGraded();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-800">
            {submission.student_name}
          </p>
          <p className="text-xs text-slate-400">{submission.student_email}</p>
        </div>
        {submission.score !== null && submission.score !== undefined ? (
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
            {submission.score}/{maxScore}
          </span>
        ) : (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
            Ungraded
          </span>
        )}
      </div>

      {submission.content && (
        <p className="mt-2 whitespace-pre-wrap rounded bg-white p-2 text-sm text-slate-700">
          {submission.content}
        </p>
      )}
      {submission.link && (
        <a
          href={submission.link}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-xs font-medium text-indigo-600 hover:underline"
        >
          {submission.link}
        </a>
      )}

      <form onSubmit={grade} className="mt-3 flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Score (0–{maxScore})
          </label>
          <input
            type="number"
            min={0}
            max={maxScore}
            value={score}
            onChange={(e) => setScore(e.target.value)}
            className="w-24 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <div className="min-w-[160px] flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Feedback
          </label>
          <input
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Nice work!"
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save grade'}
        </button>
        <button
          type="button"
          onClick={suggest}
          disabled={aiLoading}
          className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
          title="Suggest a grade and feedback with AI"
        >
          {aiLoading ? 'Thinking…' : '✨ AI suggest'}
        </button>
      </form>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {suggestion && (
        <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm">
          <p className="font-semibold text-indigo-800">
            AI suggestion: {suggestion.score}/{suggestion.maxScore}
          </p>
          {suggestion.strengths?.length > 0 && (
            <div className="mt-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-green-600">
                Strengths
              </span>
              <ul className="ml-4 list-disc text-slate-600">
                {suggestion.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {suggestion.improvements?.length > 0 && (
            <div className="mt-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                To improve
              </span>
              <ul className="ml-4 list-disc text-slate-600">
                {suggestion.improvements.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-2 text-xs text-slate-400">
            Review and edit before saving — this is only a suggestion.
          </p>
        </div>
      )}
    </li>
  );
}
