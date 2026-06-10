import { useState } from 'react';
import api from '../api/client.js';

const DEFAULT_QUESTIONS = [
  {
    word: '학교',
    romanization: 'hakgyo',
    options: ['School', 'Hospital', 'Market', 'Library'],
    answer: 'School',
  },
  {
    word: '물',
    romanization: 'mul',
    options: ['Fire', 'Water', 'Rice', 'Tea'],
    answer: 'Water',
  },
  {
    word: '친구',
    romanization: 'chingu',
    options: ['Teacher', 'Family', 'Friend', 'Neighbor'],
    answer: 'Friend',
  },
  {
    word: '책',
    romanization: 'chaek',
    options: ['Pen', 'Desk', 'Bag', 'Book'],
    answer: 'Book',
  },
  {
    word: '사랑',
    romanization: 'sarang',
    options: ['Anger', 'Love', 'Hope', 'Fear'],
    answer: 'Love',
  },
];

const LEVELS = ['TOPIK I', 'TOPIK II', 'Beginner', 'Intermediate', 'Advanced'];

export default function VocabularyQuiz() {
  const [questions, setQuestions] = useState(DEFAULT_QUESTIONS);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [finished, setFinished] = useState(false);

  // AI generation controls.
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('TOPIK I');
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [source, setSource] = useState('default'); // 'default' | 'ai'

  const question = questions[current];
  const score = answers.filter((a) => a.correct).length;
  const progress = Math.round(
    ((current + (finished ? 1 : 0)) / questions.length) * 100
  );

  function restart(newQuestions, newSource) {
    setQuestions(newQuestions);
    setSource(newSource);
    setCurrent(0);
    setSelected(null);
    setAnswers([]);
    setFinished(false);
  }

  async function generate() {
    setAiError('');
    setGenerating(true);
    try {
      const { questions: q } = await api.post('/api/ai/quiz', {
        topic: topic.trim() || undefined,
        level,
      });
      restart(q, 'ai');
    } catch (err) {
      setAiError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  function handleSelect(option) {
    if (selected) return;
    setSelected(option);
  }

  function handleNext() {
    const isCorrect = selected === question.answer;
    const updated = [
      ...answers,
      {
        word: question.word,
        romanization: question.romanization,
        picked: selected,
        answer: question.answer,
        correct: isCorrect,
        explanation: question.explanation,
      },
    ];
    setAnswers(updated);

    if (current + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrent(current + 1);
      setSelected(null);
    }
  }

  function reset() {
    restart(questions, source);
  }

  function optionClasses(option) {
    if (!selected) {
      return 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50';
    }
    if (option === question.answer) {
      return 'border-green-500 bg-green-50 text-green-800';
    }
    if (option === selected) {
      return 'border-red-500 bg-red-50 text-red-800';
    }
    return 'border-slate-200 bg-white opacity-60';
  }

  const generator = (
    <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-500">
        ✨ Generate a new quiz with AI
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Topic (e.g. food, travel)"
          className="min-w-[140px] flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        >
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <button
          onClick={generate}
          disabled={generating}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {generating ? 'Generating…' : 'Generate'}
        </button>
      </div>
      {aiError && <p className="mt-2 text-xs text-red-600">{aiError}</p>}
    </div>
  );

  if (finished) {
    const finalScore = answers.filter((a) => a.correct).length;
    const pct = Math.round((finalScore / questions.length) * 100);
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {generator}
        <div className="text-center">
          <div className="text-4xl">{pct >= 60 ? '🎉' : '📚'}</div>
          <h3 className="mt-2 text-xl font-bold text-slate-800">Quiz complete!</h3>
          <p className="mt-1 text-slate-500">
            You scored{' '}
            <span className="font-bold text-indigo-600">
              {finalScore} / {questions.length}
            </span>{' '}
            ({pct}%)
          </p>
        </div>

        <ul className="mt-5 space-y-2">
          {answers.map((a, i) => (
            <li
              key={i}
              className={`rounded-lg border px-3 py-2 text-sm ${
                a.correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">
                  {a.word}{' '}
                  <span className="font-normal text-slate-400">({a.romanization})</span>
                </span>
                <span className="text-right text-slate-600">
                  {a.correct ? (
                    <span className="text-green-700">✓ {a.answer}</span>
                  ) : (
                    <span>
                      <span className="text-red-700 line-through">{a.picked}</span>{' '}
                      <span className="text-green-700">→ {a.answer}</span>
                    </span>
                  )}
                </span>
              </div>
              {a.explanation && (
                <p className="mt-1 text-xs text-slate-500">{a.explanation}</p>
              )}
            </li>
          ))}
        </ul>

        <button
          onClick={reset}
          className="mt-5 w-full rounded-lg bg-indigo-600 py-2.5 font-semibold text-white transition hover:bg-indigo-700"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {generator}

      <div className="mb-4 flex items-center justify-between text-sm text-slate-500">
        <span>
          Question {current + 1} of {questions.length}
          {source === 'ai' && (
            <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-600">
              AI
            </span>
          )}
        </span>
        <span>Score: {score}</span>
      </div>

      <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full bg-indigo-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mb-6 text-center">
        <div className="text-5xl font-extrabold text-slate-800">{question.word}</div>
        <div className="mt-1 text-slate-400">[{question.romanization}]</div>
        <p className="mt-3 text-sm text-slate-500">What does this word mean?</p>
      </div>

      <div className="grid gap-3">
        {question.options.map((option) => (
          <button
            key={option}
            onClick={() => handleSelect(option)}
            disabled={!!selected}
            className={`rounded-lg border px-4 py-3 text-left font-medium text-slate-700 transition ${optionClasses(
              option
            )}`}
          >
            {option}
          </button>
        ))}
      </div>

      {selected && (
        <button
          onClick={handleNext}
          className="mt-5 w-full rounded-lg bg-indigo-600 py-2.5 font-semibold text-white transition hover:bg-indigo-700"
        >
          {current + 1 >= questions.length ? 'See results' : 'Next question'}
        </button>
      )}
    </div>
  );
}
