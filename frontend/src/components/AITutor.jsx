import { useState, useRef, useEffect } from 'react';
import api from '../api/client.js';

const GREETING = {
  role: 'assistant',
  content:
    '안녕하세요! 저는 여러분의 한국어 선생님이에요. (Hello! I am your Korean tutor.) 오늘 무엇을 연습하고 싶어요? (What would you like to practice today?)',
};

export default function AITutor() {
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setError('');
    setLoading(true);
    try {
      // Send only the real turns (skip the local greeting) to the API.
      const payload = next.filter((m, i) => !(i === 0 && m === GREETING));
      const { reply } = await api.post('/api/ai/tutor', { messages: payload });
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-2xl">🧑‍🏫</span>
        <div>
          <h3 className="font-bold text-slate-800">AI Korean Tutor</h3>
          <p className="text-xs text-slate-400">
            Chat in Korean — get gentle corrections as you go
          </p>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="mb-3 h-72 space-y-3 overflow-y-auto rounded-xl bg-slate-50 p-3"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                m.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-700'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-400">
              선생님 is typing…
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <form onSubmit={send} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="한국어로 입력하세요… (Type in Korean)"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </div>
  );
}
