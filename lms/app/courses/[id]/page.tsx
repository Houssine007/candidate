'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { captureSsoToken, redirectToLogin, RH_BASE_URL } from '@/lib/sso-client';

interface Answer { _id: string; answer: string }
interface Question { _id: string; question: string; type: string; points: number; answers: Answer[] }
interface FinalExam { _id: string; title: string; description?: string; passingScore: number; questions: Question[] }
interface Section { _id: string; title: string; description?: string; type: 'file' | 'youtube'; fileUrl?: string; fileName?: string; youtubeUrl?: string }
interface Module { _id: string; title: string; description?: string; sections: Section[] }
interface Course { _id: string; title: string; description: string; skillLevel?: number; modules: Module[]; finalExam: FinalExam | null }

interface ExamResult { score: number; passed: boolean; passingScore: number; totalQuestions: number; correctCount: number; skillValidated: boolean; skillLevel?: number }

function youtubeEmbed(url?: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

export default function CoursePlayerPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [token, setToken] = useState<string | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<'content' | 'exam' | 'result'>('content');
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);

  useEffect(() => {
    const t = captureSsoToken();
    if (!t) { redirectToLogin(); return; }
    setToken(t);

    (async () => {
      try {
        const [cRes, eRes] = await Promise.all([
          fetch(`/api/courses/${courseId}`, { headers: { Authorization: `Bearer ${t}` } }),
          fetch(`/api/enrollments/me`, { headers: { Authorization: `Bearer ${t}` } }),
        ]);
        if (!cRes.ok) { setError('Cours introuvable ou accès refusé'); setLoading(false); return; }
        const cData = await cRes.json();
        setCourse(cData.course);
        if (eRes.ok) {
          const enrolls = await eRes.json();
          const mine = (Array.isArray(enrolls) ? enrolls : []).find((e: any) => (e.courseId?._id || e.courseId) === courseId);
          if (mine) setEnrollmentId(mine._id);
        }
      } catch {
        setError('Erreur de chargement');
      } finally {
        setLoading(false);
      }
    })();
  }, [courseId]);

  const toggleAnswer = (q: Question, answerId: string) => {
    setAnswers((prev) => {
      const cur = prev[q._id] || [];
      if (q.type === 'multiple_correct') {
        return { ...prev, [q._id]: cur.includes(answerId) ? cur.filter((a) => a !== answerId) : [...cur, answerId] };
      }
      return { ...prev, [q._id]: [answerId] };
    });
  };

  const submitExam = async () => {
    if (!enrollmentId || !token) { setError("Inscription introuvable : ce cours doit vous être assigné."); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/enrollments/${enrollmentId}/submit-exam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Erreur lors de la soumission'); return; }
      setResult(data);
      setMode('result');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-zinc-500">Chargement…</div>;
  if (error && !course) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-red-500 font-semibold">{error}</p>
      <a href={`${RH_BASE_URL}/dashboard/employee`} className="text-yellow-600 underline">Retour à l'espace RH</a>
    </div>
  );
  if (!course) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-black dark:text-zinc-50">
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-zinc-400 font-bold">RecruitPRO Academy</p>
            <h1 className="text-xl font-black">{course.title}</h1>
          </div>
          <a href={`${RH_BASE_URL}/dashboard/employee`} className="text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">← Mes formations</a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {error && <div className="mb-6 p-3 rounded-lg bg-red-500/10 text-red-600 text-sm font-semibold">{error}</div>}

        {/* ─── CONTENU ─── */}
        {mode === 'content' && (
          <div className="space-y-6">
            <p className="text-zinc-600 dark:text-zinc-400">{course.description}</p>

            {course.modules.length === 0 && (
              <p className="text-sm text-zinc-400">Ce cours n'a pas encore de contenu.</p>
            )}

            {course.modules.map((m, mi) => (
              <section key={m._id} className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6">
                <h2 className="font-black text-lg mb-1">Module {mi + 1} · {m.title}</h2>
                {m.description && <p className="text-sm text-zinc-500 mb-4">{m.description}</p>}
                <div className="space-y-4">
                  {m.sections.map((s) => {
                    const embed = youtubeEmbed(s.youtubeUrl);
                    return (
                      <div key={s._id} className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
                        <h3 className="font-bold mb-2">{s.title}</h3>
                        {s.type === 'youtube' && embed && (
                          <div className="aspect-video rounded-xl overflow-hidden">
                            <iframe src={embed} className="w-full h-full" allowFullScreen title={s.title} />
                          </div>
                        )}
                        {s.type === 'file' && s.fileUrl && (
                          <a href={s.fileUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-2 text-sm font-bold text-yellow-600 hover:underline">
                            📄 {s.fileName || 'Télécharger le document'}
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}

            {course.finalExam ? (
              <div className="rounded-2xl bg-yellow-500/10 border border-yellow-500/30 p-6 flex items-center justify-between">
                <div>
                  <h2 className="font-black">Examen final</h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {course.finalExam.questions.length} question(s) · réussite à {course.finalExam.passingScore}%
                    {course.skillLevel && ` · valide la compétence au niveau ${course.skillLevel}`}
                  </p>
                </div>
                <button onClick={() => setMode('exam')} className="px-5 py-2.5 rounded-xl bg-yellow-500 text-white font-black hover:bg-yellow-600">
                  Passer l'examen →
                </button>
              </div>
            ) : (
              <p className="text-sm text-zinc-400">Ce cours n'a pas d'examen final.</p>
            )}
          </div>
        )}

        {/* ─── EXAMEN ─── */}
        {mode === 'exam' && course.finalExam && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black">{course.finalExam.title}</h2>
              <p className="text-sm text-zinc-500">Réussite à {course.finalExam.passingScore}%. Sélectionnez vos réponses.</p>
            </div>

            {course.finalExam.questions.map((q, qi) => (
              <div key={q._id} className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6">
                <p className="font-bold mb-4">{qi + 1}. {q.question}
                  {q.type === 'multiple_correct' && <span className="ml-2 text-[11px] font-semibold text-zinc-400">(plusieurs réponses)</span>}
                </p>
                <div className="space-y-2">
                  {q.answers.map((a) => {
                    const selected = (answers[q._id] || []).includes(a._id);
                    return (
                      <button
                        key={a._id}
                        onClick={() => toggleAnswer(q, a._id)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                          selected
                            ? 'border-yellow-500 bg-yellow-500/10 font-bold'
                            : 'border-zinc-200 dark:border-zinc-700 hover:border-yellow-400'
                        }`}
                      >
                        {a.answer}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between">
              <button onClick={() => setMode('content')} className="text-sm font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">← Retour au contenu</button>
              <button
                onClick={submitExam}
                disabled={submitting || Object.keys(answers).length < course.finalExam.questions.length}
                className="px-6 py-3 rounded-xl bg-yellow-500 text-white font-black hover:bg-yellow-600 disabled:opacity-40"
              >
                {submitting ? 'Correction…' : "Valider l'examen"}
              </button>
            </div>
          </div>
        )}

        {/* ─── RÉSULTAT ─── */}
        {mode === 'result' && result && (
          <div className="max-w-lg mx-auto text-center py-10">
            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full text-3xl font-black mb-6 ${
              result.passed ? 'bg-green-500/15 text-green-600' : 'bg-red-500/15 text-red-600'
            }`}>
              {result.score}%
            </div>
            <h2 className="text-2xl font-black mb-2">{result.passed ? 'Examen réussi 🎉' : 'Examen non réussi'}</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-2">
              {result.correctCount}/{result.totalQuestions} bonnes réponses · seuil {result.passingScore}%
            </p>
            {result.passed && result.skillValidated && (
              <p className="text-green-600 font-bold mb-6">✓ Compétence validée au niveau {result.skillLevel} — votre profil RH a été mis à jour.</p>
            )}
            {!result.passed && (
              <p className="text-zinc-500 mb-6">Revoyez le contenu et retentez l'examen.</p>
            )}
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => { setMode('content'); setResult(null); setAnswers({}); }} className="px-5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 font-bold">
                Revoir le cours
              </button>
              <a href={`${RH_BASE_URL}/dashboard/employee`} className="px-5 py-2.5 rounded-xl bg-yellow-500 text-white font-black hover:bg-yellow-600">
                Mes formations
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
