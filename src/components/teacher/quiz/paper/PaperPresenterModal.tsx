import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Maximize2,
  Minimize2,
  QrCode,
  Camera,
  ChevronLeft,
  ChevronRight,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  CheckCircle2,
  Award,
  Users,
  X,
  Sparkles,
  BarChart2,
  RefreshCw,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Quiz, QuizQuestion, User } from '../../../../types';
import { PaperModeSession, PaperModeAnswer } from '../../../../types/paperMode';
import { useApp } from '../../../../context/AppContext';
import { LatexRenderer } from '../../../../utils/latex';
import { controlPaperSession } from '../../../../lib/firestoreSync';
import { fireCelebrationConfetti } from '../../../../utils/gamification';

interface PaperPresenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: Quiz;
  classId: string;
  onOpenScannerOnThisDevice: () => void;
  onFinishAndShowAnalytics: (session: PaperModeSession) => void;
}

export const PaperPresenterModal: React.FC<PaperPresenterModalProps> = ({
  isOpen,
  onClose,
  quiz,
  classId,
  onOpenScannerOnThisDevice,
  onFinishAndShowAnalytics,
}) => {
  const { users = [], classes = [] } = useApp();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Active class info
  const activeClass = useMemo(() => classes.find((c) => c.id === classId), [classes, classId]);

  // Students in class (with fallback to all students if classId is empty or 'all')
  const classStudents = useMemo(() => {
    let list = users.filter((u) => u.role === 'student');
    if (classId && classId !== 'all') {
      const classFiltered = list.filter(
        (u) => u.classIds?.includes(classId) || (u as any).classId === classId
      );
      if (classFiltered.length > 0) {
        list = classFiltered;
      }
    }
    return list.sort((a, b) => {
      const numA = a.absentNumber ?? 999;
      const numB = b.absentNumber ?? 999;
      if (numA !== numB) return numA - numB;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [users, classId]);

  // Session State
  const sessionId = useMemo(() => `paper_${quiz.id}_${classId}`, [quiz.id, classId]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [showLiveStats, setShowLiveStats] = useState(false);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [answersByQuestion, setAnswersByQuestion] = useState<
    Record<number, Record<string, PaperModeAnswer>>
  >({});

  const activeQuestion = quiz.questions[currentQuestionIndex] || quiz.questions[0];

  // Current question answers
  const currentAnswers = useMemo(() => {
    return answersByQuestion[currentQuestionIndex] || {};
  }, [answersByQuestion, currentQuestionIndex]);

  // Number of students who answered
  const answeredCount = Object.keys(currentAnswers).length;

  // Poll / fetch session status periodically or sync via SSE
  useEffect(() => {
    if (!isOpen) return;

    // Fetch initial or updated session
    const loadSession = async () => {
      try {
        const res = await fetch(`/api/collections/paperSessions/${encodeURIComponent(sessionId)}`);
        if (res.ok) {
          const session: PaperModeSession = await res.json();
          if (session && session.id) {
            setCurrentQuestionIndex(session.currentQuestionIndex ?? 0);
            setIsLocked(session.status === 'question_closed');
            setShowLiveStats(Boolean(session.showLiveStats));
            setShowCorrectAnswer(Boolean(session.showCorrectAnswer));
            if (session.answersByQuestion) {
              setAnswersByQuestion(session.answersByQuestion);
            }
          }
        }
      } catch (err) {
        console.warn('Error loading paper session:', err);
      }
    };

    loadSession();
    const interval = setInterval(loadSession, 1200);
    return () => clearInterval(interval);
  }, [isOpen, sessionId]);

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Distribution of options A, B, C, D
  const optionStats = useMemo(() => {
    const counts = { A: 0, B: 0, C: 0, D: 0 };
    Object.values(currentAnswers).forEach((ans) => {
      if (ans.selectedOption && counts[ans.selectedOption] !== undefined) {
        counts[ans.selectedOption]++;
      }
    });
    return counts;
  }, [currentAnswers]);

  // Navigate questions
  const handleGoToQuestion = async (idx: number) => {
    if (idx < 0 || idx >= quiz.questions.length) return;
    setCurrentQuestionIndex(idx);
    setShowLiveStats(false);
    setShowCorrectAnswer(false);
    setIsLocked(false);

    await controlPaperSession(sessionId, {
      currentQuestionIndex: idx,
      status: 'active',
      showLiveStats: false,
      showCorrectAnswer: false,
    });
  };

  const handleToggleLock = async () => {
    const nextLocked = !isLocked;
    setIsLocked(nextLocked);
    await controlPaperSession(sessionId, {
      status: nextLocked ? 'question_closed' : 'active',
    });
  };

  const handleToggleReveal = async () => {
    const nextReveal = !showCorrectAnswer;
    setShowCorrectAnswer(nextReveal);
    setShowLiveStats(nextReveal);

    if (nextReveal) {
      fireCelebrationConfetti();
    }

    await controlPaperSession(sessionId, {
      showCorrectAnswer: nextReveal,
      showLiveStats: nextReveal,
    });
  };

  const handleFinish = () => {
    const sessionObj: PaperModeSession = {
      id: sessionId,
      quizId: quiz.id,
      classId,
      teacherId: quiz.createdBy,
      currentQuestionIndex,
      status: 'completed',
      answersByQuestion,
      showLiveStats,
      showCorrectAnswer,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onFinishAndShowAnalytics(sessionObj);
  };

  // URL for mobile phone scanner connection QR code
  const scannerUrl = `${window.location.protocol}//${window.location.hostname}:${window.location.port}/?mode=paper-scanner&sessionId=${encodeURIComponent(sessionId)}&quizId=${encodeURIComponent(quiz.id)}&classId=${encodeURIComponent(classId)}`;

  if (!isOpen || !activeQuestion) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col overflow-hidden select-none font-sans">
      {/* Top Projector Bar */}
      <header className="px-6 py-4 bg-slate-900/80 border-b border-slate-800 backdrop-blur-md flex items-center justify-between shrink-0 shadow-lg">
        {/* Quiz Info */}
        <div className="flex items-center gap-4">
          <div className="px-3.5 py-1.5 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-extrabold text-sm flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>MODUS KERTAS</span>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white leading-tight">
              {quiz.title}
            </h1>
            <p className="text-xs font-semibold text-slate-400">
              {activeClass?.name || 'Kelas'} • Soal{' '}
              <strong className="text-indigo-400 font-bold">
                {currentQuestionIndex + 1}
              </strong>{' '}
              dari {quiz.questions.length}
            </p>
          </div>
        </div>

        {/* Live Answer Status & Controls */}
        <div className="flex items-center gap-3">
          {/* Answered Counter */}
          <div className="px-4 py-2 rounded-2xl bg-slate-800/90 border border-slate-700 flex items-center gap-3">
            <Users className="w-4 h-4 text-emerald-400" />
            <div className="text-right">
              <div className="text-sm font-black text-white leading-none">
                {answeredCount} / {classStudents.length}
              </div>
              <div className="text-[10px] font-bold text-slate-400">Siswa Menjawab</div>
            </div>
            {/* Progress circle or bar */}
            <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                style={{
                  width: `${
                    classStudents.length > 0 ? (answeredCount / classStudents.length) * 100 : 0
                  }%`,
                }}
              />
            </div>
          </div>

          {/* QR Code Connect Mobile Button */}
          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            title="Pindai QR dengan HP Guru untuk membuka kamera pemindai"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-indigo-400" />
            <span>Hubungkan HP</span>
          </button>

          {/* Scanner on this device */}
          <button
            type="button"
            onClick={onOpenScannerOnThisDevice}
            title="Buka Kamera Pemindai di Laptop ini"
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <Camera className="w-4 h-4" />
            <span>Buka Pemindai</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Projector Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left / Center Area: Question & Options (70% width) */}
        <div className="flex-1 flex flex-col p-8 overflow-y-auto space-y-6">
          {/* Question Prompt */}
          <div className="bg-slate-900/90 border border-slate-800 p-8 rounded-3xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-3.5 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 font-black text-sm border border-indigo-500/30">
                Pertanyaan #{currentQuestionIndex + 1}
              </span>
              {isLocked && (
                <span className="px-3 py-1 rounded-xl bg-rose-500/20 text-rose-300 font-bold text-xs flex items-center gap-1.5 border border-rose-500/30">
                  <Lock className="w-3.5 h-3.5" />
                  Jawaban Dikunci
                </span>
              )}
            </div>

            <div className="text-2xl sm:text-3xl font-extrabold text-white leading-relaxed tracking-wide">
              <LatexRenderer content={activeQuestion.prompt} />
            </div>

            {activeQuestion.imageUrl && (
              <div className="mt-4 max-h-72 rounded-2xl overflow-hidden border border-slate-700">
                <img
                  src={activeQuestion.imageUrl}
                  alt="Ilustrasi Soal"
                  className="w-full h-full object-contain bg-black/40"
                />
              </div>
            )}
          </div>

          {/* Options Grid (A, B, C, D) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            {(['A', 'B', 'C', 'D'] as const).map((letter, optIdx) => {
              const optionText = activeQuestion.options?.[optIdx] || '';
              const isCorrectAnswerKey =
                activeQuestion.correctOptionIndex !== undefined &&
                activeQuestion.correctOptionIndex === optIdx;

              // Color themes for options
              const themeStyles = {
                A: {
                  badge: 'bg-rose-500 text-white',
                  border: 'border-rose-500/30 hover:border-rose-500/60',
                  bg: 'bg-rose-950/20',
                },
                B: {
                  badge: 'bg-blue-500 text-white',
                  border: 'border-blue-500/30 hover:border-blue-500/60',
                  bg: 'bg-blue-950/20',
                },
                C: {
                  badge: 'bg-amber-500 text-slate-950',
                  border: 'border-amber-500/30 hover:border-amber-500/60',
                  bg: 'bg-amber-950/20',
                },
                D: {
                  badge: 'bg-emerald-500 text-white',
                  border: 'border-emerald-500/30 hover:border-emerald-500/60',
                  bg: 'bg-emerald-950/20',
                },
              }[letter];

              const count = optionStats[letter] || 0;
              const percent =
                answeredCount > 0 ? Math.round((count / answeredCount) * 100) : 0;

              const isHighlightedCorrect = showCorrectAnswer && isCorrectAnswerKey;
              const isDimmed = showCorrectAnswer && !isCorrectAnswerKey;

              return (
                <div
                  key={letter}
                  className={`p-6 rounded-3xl border-2 transition-all relative flex flex-col justify-between ${
                    isHighlightedCorrect
                      ? 'bg-emerald-950/60 border-emerald-400 ring-4 ring-emerald-400/20 shadow-2xl scale-[1.01]'
                      : isDimmed
                      ? 'bg-slate-900/40 border-slate-800/60 opacity-40'
                      : `${themeStyles.bg} ${themeStyles.border}`
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span
                      className={`w-12 h-12 rounded-2xl font-black text-xl flex items-center justify-center shrink-0 shadow-lg ${
                        isHighlightedCorrect ? 'bg-emerald-400 text-slate-950' : themeStyles.badge
                      }`}
                    >
                      {letter}
                    </span>
                    <div className="flex-1 text-lg sm:text-xl font-bold text-white pt-1 leading-snug">
                      <LatexRenderer content={optionText} />
                    </div>
                  </div>

                  {/* Live Stats bar (if enabled) */}
                  {showLiveStats && (
                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                      <div className="flex-1 mr-4">
                        <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              isHighlightedCorrect ? 'bg-emerald-400' : 'bg-white/40'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                      <span className="font-mono font-black text-sm text-white">
                        {count} Siswa ({percent}%)
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Explanation (Pembahasan) when answer revealed */}
          {showCorrectAnswer && activeQuestion.explanation && (
            <div className="p-6 bg-indigo-950/50 border border-indigo-500/40 rounded-3xl space-y-2">
              <div className="flex items-center gap-2 text-indigo-300 font-extrabold text-sm">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Pembahasan Kunci Jawaban:</span>
              </div>
              <div className="text-base text-indigo-100 leading-relaxed font-medium">
                <LatexRenderer content={activeQuestion.explanation} />
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Live Student Roster Grid (30% width) */}
        <div className="w-96 border-l border-slate-800 bg-slate-900/60 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Daftar Siswa ({classStudents.length})
            </span>
            <span className="text-[11px] font-bold text-emerald-400">
              ● Berkedip Hijau = Jawaban Terekam
            </span>
          </div>

          {/* Student Grid */}
          <div className="flex-1 p-4 overflow-y-auto grid grid-cols-2 gap-2 content-start">
            {classStudents.map((st, index) => {
              const markerId = st.absentNumber && st.absentNumber > 0 ? st.absentNumber : index + 1;
              const hasAnswered = Boolean(currentAnswers[st.uid]);

              return (
                <div
                  key={st.uid}
                  className={`p-3 rounded-2xl border transition-all duration-300 flex items-center gap-2.5 ${
                    hasAnswered
                      ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200 shadow-md ring-2 ring-emerald-400/20'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl font-mono font-black text-xs flex items-center justify-center shrink-0 ${
                      hasAnswered ? 'bg-emerald-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {hasAnswered ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      st.absentNumber ?? index + 1
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate text-white leading-tight">
                      {st.displayName}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {hasAnswered ? (
                        <span className="text-emerald-400 font-extrabold">Terjawab</span>
                      ) : (
                        `#Marker ${markerId}`
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Remote Control Toolbar */}
      <footer className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between shrink-0 shadow-2xl">
        {/* Question Nav */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentQuestionIndex === 0}
            onClick={() => handleGoToQuestion(currentQuestionIndex - 1)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Soal Sebelumnya</span>
          </button>

          <span className="px-3 text-xs font-bold text-slate-400">
            {currentQuestionIndex + 1} / {quiz.questions.length}
          </span>

          <button
            type="button"
            disabled={currentQuestionIndex >= quiz.questions.length - 1}
            onClick={() => handleGoToQuestion(currentQuestionIndex + 1)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Soal Berikutnya</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Central Controls: Lock & Reveal Answer */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggleLock}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              isLocked
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            <span>{isLocked ? 'Buka Kunci Jawaban' : 'Kunci Jawaban'}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleReveal}
            className={`px-5 py-2 rounded-xl font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md ${
              showCorrectAnswer
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {showCorrectAnswer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{showCorrectAnswer ? 'Sembunyikan Kunci' : 'Tampilkan Jawaban & Grafik'}</span>
          </button>
        </div>

        {/* End Quiz & Show Analytics */}
        <div>
          <button
            type="button"
            onClick={handleFinish}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-95 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <BarChart2 className="w-4 h-4" />
            <span>Selesaikan Kuis & Buka Analitik</span>
          </button>
        </div>
      </footer>

      {/* QR Code Modal for Mobile Phone Scanner */}
      {showQrModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-indigo-400" />
                Pindai dengan Ponsel Guru
              </h3>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Buka aplikasi kamera di ponsel guru dan arahkan ke kode QR di bawah untuk membuka
              kamera pemindai jawaban siswa secara langsung:
            </p>

            <div className="p-4 bg-white rounded-2xl inline-block shadow-inner mx-auto">
              <QRCodeSVG value={scannerUrl} size={200} level="M" />
            </div>

            <div className="p-2.5 rounded-xl bg-slate-800 text-[11px] text-slate-400 break-all font-mono">
              {scannerUrl}
            </div>

            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
