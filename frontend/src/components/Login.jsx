import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const DEMO_ACCOUNTS = [
  { label: 'Teacher', email: 'teacher.kim@topik.dev' },
  { label: 'Student', email: 'student.park@topik.dev' },
];

export default function Login() {
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('STUDENT');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function goToDashboard(user) {
    navigate(user.role === 'TEACHER' ? '/teacher' : '/student', { replace: true });
  }

  function validate() {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email)) return 'Please enter a valid email address.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (mode === 'signup' && !fullName.trim()) return 'Please enter your full name.';
    return '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    try {
      let user;
      if (mode === 'signin') {
        user = await login(email.trim(), password);
      } else {
        user = await signup({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          role,
        });
      }
      goToDashboard(user);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function fillDemo(demoEmail) {
    setMode('signin');
    setEmail(demoEmail);
    setPassword('Password123!');
    setError('');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-3xl backdrop-blur">
            🇰🇷
          </div>
          <h1 className="text-3xl font-extrabold text-white">TOPIK Station</h1>
          <p className="mt-1 text-sm text-indigo-100">
            Your hub for learning Korean &amp; acing the TOPIK exam
          </p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          <div className="mb-6 flex rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError('');
              }}
              className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${
                mode === 'signin'
                  ? 'bg-white text-indigo-600 shadow'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError('');
              }}
              className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${
                mode === 'signup'
                  ? 'bg-white text-indigo-600 shadow'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Full name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Hong Gil-dong"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            {mode === 'signup' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  I am a…
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {['STUDENT', 'TEACHER'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                        role === r
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-slate-300 text-slate-600 hover:border-slate-400'
                      }`}
                    >
                      {r === 'STUDENT' ? '🎓 Student' : '👩‍🏫 Teacher'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-indigo-600 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? 'Please wait…'
                : mode === 'signin'
                ? 'Sign In'
                : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-4">
            <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-slate-400">
              Demo accounts · password: Password123!
            </p>
            <div className="grid grid-cols-2 gap-3">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => fillDemo(acc.email)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-left text-xs transition hover:border-indigo-300 hover:bg-indigo-50"
                >
                  <span className="block font-semibold text-slate-700">
                    {acc.label}
                  </span>
                  <span className="block truncate text-slate-400">{acc.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
