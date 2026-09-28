import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../../../context/AppContext';
import { Quiz } from '../../../../types';
import { PaperPresenterModal } from './PaperPresenterModal';
import { PaperScannerModal } from './PaperScannerModal';
import { PaperAnalyticsModal } from './PaperAnalyticsModal';
import { PaperModeSession } from '../../../../types/paperMode';

export const PaperStandaloneView: React.FC = () => {
  const { quizzes = [], classes = [] } = useApp();

  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const mode = urlParams.get('mode'); // 'paper-scanner' | 'paper-presenter'
  const quizId = urlParams.get('quizId');
  const classId = urlParams.get('classId') || '';

  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(mode === 'paper-scanner');
  const [completedSession, setCompletedSession] = useState<PaperModeSession | null>(null);

  useEffect(() => {
    if (!quizId) return;

    // Look up quiz in context
    const found = quizzes.find((q) => q.id === quizId);
    if (found) {
      setActiveQuiz(found);
      return;
    }

    // Fallback: fetch from server
    const fetchQuiz = async () => {
      try {
        const res = await fetch(`/api/collections/quizzes/${encodeURIComponent(quizId)}`);
        if (res.ok) {
          const q = await res.json();
          if (q && q.id) setActiveQuiz(q);
        }
      } catch (err) {
        console.warn('Failed to load quiz for standalone view:', err);
      }
    };

    fetchQuiz();
  }, [quizId, quizzes]);

  if (!activeQuiz) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 flex items-center justify-center mx-auto animate-pulse">
            ●
          </div>
          <h2 className="text-base font-bold text-white">Menghubungkan ke Mode Kertas...</h2>
          <p className="text-xs text-slate-400">
            Sedang memuat data kuis dan daftar siswa kelas.
          </p>
        </div>
      </div>
    );
  }

  // Mobile Scanner View
  if (mode === 'paper-scanner') {
    return (
      <>
        {!completedSession ? (
          <PaperScannerModal
            isOpen={true}
            onClose={() => {
              window.location.href = '/';
            }}
            quiz={activeQuiz}
            classId={classId}
            onFinish={(session) => setCompletedSession(session)}
          />
        ) : (
          <PaperAnalyticsModal
            isOpen={true}
            onClose={() => {
              window.location.href = '/';
            }}
            quiz={activeQuiz}
            classId={classId}
            session={completedSession}
          />
        )}
      </>
    );
  }

  // Projector Presenter View
  return (
    <>
      <PaperPresenterModal
        isOpen={true}
        onClose={() => {
          window.location.href = '/';
        }}
        quiz={activeQuiz}
        classId={classId}
        onOpenScannerOnThisDevice={() => setIsScannerOpen(true)}
        onFinishAndShowAnalytics={(session) => setCompletedSession(session)}
      />

      {isScannerOpen && (
        <PaperScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          quiz={activeQuiz}
          classId={classId}
          onFinish={(session) => {
            setIsScannerOpen(false);
            setCompletedSession(session);
          }}
        />
      )}

      {completedSession && (
        <PaperAnalyticsModal
          isOpen={Boolean(completedSession)}
          onClose={() => setCompletedSession(null)}
          quiz={activeQuiz}
          classId={classId}
          session={completedSession}
        />
      )}
    </>
  );
};
