import { useState } from 'react';
import api from '../api/client.js';

export default function WritingCorrector() {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function check(e) {
    e.preventDefault();
    if (!text.trim() || loading) return;
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const { correction } = await api.post('/api/ai/correct', { text: text.trim() });
      setResult(correction);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-2xl">✍️</span>
        <div>
          <h3 className="font-bold text-slate-800">AI Writing Corrector</h3>
          <p className="text-xs text-slate-400">
            Write in Korean and get grammar fixes with explanations
          </p>
        </div>
      </div>

      <form onSubmit={check} className="space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="여기에 한국어로 작성하세요… (Write your Korean here)"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {loading ? 'Checking…' : 'Check my writing'}
        </button>
      </form>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-4 space-y-4">
          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Corrected
            </h4>
            <p className="whitespace-pre-wrap rounded-lg bg-green-50 p-3 text-sm text-green-900">
              {result.corrected}
            </p>
          </div>

          {result.errors && result.errors.length > 0 && (
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Corrections ({result.errors.length})
              </h4>
              <ul className="space-y-2">
                {result.errors.map((er, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-slate-200 p-3 text-sm"
                  >
                    <p>
                      <span className="text-red-600 line-through">{er.original}</span>{' '}
                      <span className="text-slate-400">→</span>{' '}
                      <span className="font-medium text-green-700">{er.correction}</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{er.explanation}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.overall && (
            <p className="rounded-lg bg-indigo-50 p-3 text-sm text-indigo-800">
              {result.overall}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
