import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  FileQuestion,
  Flag,
  HelpCircle,
  MessageSquare,
  MoveRight,
  Send,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import {
  Quiz,
  QuizQuestion,
  QuizStudentAnswer,
  QuizSubmission,
} from '../../../types';
import { useApp } from '../../../context/AppContext';
import { RichQuestionPrompt } from '../../common/RichQuestionPrompt';

interface QuizPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: Quiz;
  existingSubmission?: QuizSubmission | null;
}

export const QuizPlayerModal: React.FC<QuizPlayerModalProps> = ({
  isOpen,
  onClose,
  quiz,
  existingSubmission,
}) => {
  const { submitQuizAnswers, currentUser } = useApp();

  const isReviewMode = Boolean(
    existingSubmission && existingSubmission.status !== 'in_progress'
  );

  // Active question index (0-indexed)
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);

  // Question flagged as uncertain ("Ragu-ragu")
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});

  // Student Answers State: questionId -> QuizStudentAnswer
  const [answers, setAnswers] = useState<Record<string, QuizStudentAnswer>>(() => {
    if (existingSubmission?.answers) {
      return existingSubmission.answers;
    }
    const initial: Record<string, QuizStudentAnswer> = {};
    quiz.questions.forEach((q) => {
      initial[q.id] = {
        questionId: q.id,
        type: q.type,
      };
    });
    return initial;
  });

  // Countdown timer in seconds
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(() => {
    if (isReviewMode) return null;
    if (quiz.durationMinutes && quiz.durationMinutes > 0) {
      return quiz.durationMinutes * 60;
    }
    return null;
  });

  // Finish confirmation & thank you modal
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<QuizSubmission | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  // Timer tick
  useEffect(() => {
    if (isReviewMode || secondsRemaining === null || secondsRemaining <= 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isReviewMode, secondsRemaining]);

  if (!isOpen) return null;

  const currentQ: QuizQuestion = quiz.questions[currentQuestionIdx];
  const currentAns = answers[currentQ.id] || { questionId: currentQ.id, type: currentQ.type };

  // Calculate answered count
  const isQuestionAnswered = (q: QuizQuestion) => {
    const ans = answers[q.id];
    if (!ans) return false;
    if (q.type === 'single_choice') {
      return ans.selectedOptionIndex !== undefined;
    }
    if (q.type === 'complex_multiple_choice') {
      if (q.complexMode === 'true_false') {
        return (
          ans.statementAnswers &&
          Object.keys(ans.statementAnswers).length === (q.complexStatements?.length || 0)
        );
      }
      return (ans.selectedOptionIndices || []).length > 0;
    }
    if (q.type === 'matching') {
      return (
        ans.matchingPairsAnswer &&
        Object.keys(ans.matchingPairsAnswer).length === (q.matchingPairs?.length || 0)
      );
    }
    if (q.type === 'short_answer') {
      return Boolean(ans.shortAnswerText && ans.shortAnswerText.trim());
    }
    if (q.type === 'essay') {
      return Boolean(ans.essayText && ans.essayText.trim());
    }
    return false;
  };

  const answeredQuestionsCount = quiz.questions.filter(isQuestionAnswered).length;
  const totalQuestionsCount = quiz.questions.length;

  const handleUpdateAnswer = (updatedAnswer: Partial<QuizStudentAnswer>) => {
    if (isReviewMode) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: {
        ...(prev[currentQ.id] || { questionId: currentQ.id, type: currentQ.type }),
        ...updatedAnswer,
      },
    }));
  };

  const handleToggleFlag = (qId: string) => {
    setFlaggedQuestions((prev) => ({
      ...prev,
      [qId]: !prev[qId],
    }));
  };

  const handleAutoSubmit = () => {
    const res = submitQuizAnswers(quiz.id, answers);
    setSubmittedResult(res.submission);
  };

  const handleConfirmSubmit = () => {
    const res = submitQuizAnswers(quiz.id, answers);
    setShowConfirmSubmit(false);
    setSubmittedResult(res.submission);
  };

  // Format timer
  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainderSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainderSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-700/80 w-full max-w-5xl my-auto flex flex-col h-[94vh] max-h-[94vh] overflow-hidden text-white animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Navbar Runner */}
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#364FFF] to-[#6339FF] flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <FileQuestion className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white truncate max-w-xs sm:max-w-md">
                {quiz.title}
              </h2>
              <p className="text-[11px] text-slate-400 font-semibold">
                {quiz.subject} • {isReviewMode ? 'Mode Ulasan Jawaban' : 'Pengerjaan Kuis'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Countdown Timer */}
            {!isReviewMode && secondsRemaining !== null && (
              <div
                className={`px-3.5 py-1.5 rounded-2xl border flex items-center gap-2 font-black text-xs sm:text-sm tracking-wide shadow-xs ${
                  secondsRemaining < 300
                    ? 'bg-rose-950/60 border-rose-600 text-rose-300 animate-pulse'
                    : 'bg-slate-800/80 border-slate-700 text-amber-300'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>{formatTimer(secondsRemaining)}</span>
              </div>
            )}

            {/* Close / Exit Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left / Center: Question Canvas */}
          <div className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-8 space-y-6">
            
            {/* Question Info Bar */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#364FFF] to-[#6339FF] text-white font-black text-sm flex items-center justify-center shadow-md">
                  {currentQuestionIdx + 1}
                </span>
                <div>
                  <span className="text-xs font-bold text-slate-400">
                    Soal {currentQuestionIdx + 1} dari {totalQuestionsCount}
                  </span>
                  <div className="text-[11px] font-extrabold text-[#FFD83D]">
                    Bobot: {currentQ.points} Poin
                  </div>
                </div>
              </div>

              {isReviewMode ? (
                <div className="flex items-center gap-2">
                  {currentAns?.isManualOverride && (
                    <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1">
                      ✏️ Koreksi Guru
                    </span>
                  )}
                  <span
                    className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 border ${
                      currentAns?.isCorrect
                        ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                        : (currentAns?.earnedScore && currentAns.earnedScore > 0)
                        ? 'bg-amber-950/60 border-amber-500/60 text-amber-300'
                        : 'bg-rose-950/60 border-rose-500/60 text-rose-300'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5" />
                    Nilai: {currentAns?.earnedScore ?? 0} / {currentQ.points} Poin
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleToggleFlag(currentQ.id)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    flaggedQuestions[currentQ.id]
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <Flag className={`w-3.5 h-3.5 ${flaggedQuestions[currentQ.id] ? 'fill-amber-400' : ''}`} />
                  <span>{flaggedQuestions[currentQ.id] ? 'Ragu-ragu' : 'Tandai Ragu'}</span>
                </button>
              )}
            </div>

            {/* Question Prompt with inline image & text support */}
            <div className="text-base sm:text-lg font-bold leading-relaxed">
              <RichQuestionPrompt
                text={currentQ.prompt}
                fallbackImageUrl={currentQ.imageUrl}
                theme="dark"
                onImageClick={(src) => setZoomImage(src)}
              />
            </div>

            {/* Question Interactive Options */}
            <div className="flex-1 pt-2 space-y-4">
              
              {/* 1. Format: Pilihan Ganda Biasa */}
              {currentQ.type === 'single_choice' && (
                <div className="space-y-2.5">
                  {(currentQ.options || []).map((opt, optIdx) => {
                    const isSelected = currentAns.selectedOptionIndex === optIdx;
                    const optLabel = String.fromCharCode(65 + optIdx);

                    const isCorrectReview = isReviewMode && currentQ.correctOptionIndex === optIdx;
                    const isWrongReview = isReviewMode && isSelected && currentQ.correctOptionIndex !== optIdx;

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        disabled={isReviewMode}
                        onClick={() => handleUpdateAnswer({ selectedOptionIndex: optIdx })}
                        className={`w-full p-4 rounded-2xl border text-left flex items-center gap-3.5 transition-all cursor-pointer ${
                          isCorrectReview
                            ? 'bg-emerald-950/40 border-emerald-500 text-emerald-100 ring-1 ring-emerald-500'
                            : isWrongReview
                            ? 'bg-rose-950/40 border-rose-500 text-rose-100 ring-1 ring-rose-500'
                            : isSelected
                            ? 'bg-gradient-to-r from-[#364FFF]/30 to-[#6339FF]/30 border-[#364FFF] text-white ring-2 ring-[#364FFF]/50'
                            : 'bg-slate-800/60 border-slate-700/80 text-slate-200 hover:bg-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                            isCorrectReview
                              ? 'bg-emerald-600 text-white'
                              : isWrongReview
                              ? 'bg-rose-600 text-white'
                              : isSelected
                              ? 'bg-[#364FFF] text-white'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {isSelected ? <Check className="w-4 h-4" /> : optLabel}
                        </div>
                        <span className="text-sm font-semibold">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 2. Format: Pilihan Ganda Kompleks */}
              {currentQ.type === 'complex_multiple_choice' && (
                <div>
                  {currentQ.complexMode === 'multi_select' ? (
                    <div className="space-y-2.5">
                      <p className="text-xs font-bold text-slate-400 mb-2">
                        💡 Centang semua jawaban yang kamu anggap benar:
                      </p>
                      {(currentQ.options || []).map((opt, optIdx) => {
                        const selectedIndices = currentAns.selectedOptionIndices || [];
                        const isChecked = selectedIndices.includes(optIdx);
                        const optLabel = String.fromCharCode(65 + optIdx);

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            disabled={isReviewMode}
                            onClick={() => {
                              const newArr = isChecked
                                ? selectedIndices.filter((i) => i !== optIdx)
                                : [...selectedIndices, optIdx];
                              handleUpdateAnswer({ selectedOptionIndices: newArr });
                            }}
                            className={`w-full p-4 rounded-2xl border text-left flex items-center gap-3.5 transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border-purple-500 text-white ring-2 ring-purple-500/50'
                                : 'bg-slate-800/60 border-slate-700/80 text-slate-200 hover:bg-slate-800'
                            }`}
                          >
                            <div
                              className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                                isChecked ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'
                              }`}
                            >
                              {isChecked ? <Check className="w-4 h-4" /> : optLabel}
                            </div>
                            <span className="text-sm font-semibold">{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    /* True / False Matrix Table */
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-slate-400 mb-2">
                        💡 Tentukan apakah setiap pernyataan di bawah ini Benar atau Salah:
                      </p>
                      <div className="space-y-2.5">
                        {(currentQ.complexStatements || []).map((stmt, sIdx) => {
                          const userVal = currentAns.statementAnswers?.[stmt.id];

                          return (
                            <div
                              key={stmt.id || sIdx}
                              className="p-3.5 sm:p-4 rounded-2xl bg-slate-800/70 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              <div className="flex items-start gap-2.5 flex-1 mr-2">
                                <span className="text-xs font-black text-slate-400 mt-0.5">
                                  {sIdx + 1}.
                                </span>
                                <span className="text-xs sm:text-sm font-semibold text-slate-100 leading-relaxed">
                                  {stmt.statement}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                <button
                                  type="button"
                                  disabled={isReviewMode}
                                  onClick={() => {
                                    handleUpdateAnswer({
                                      statementAnswers: {
                                        ...(currentAns.statementAnswers || {}),
                                        [stmt.id]: true,
                                      },
                                    });
                                  }}
                                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                                    userVal === true
                                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                                      : 'bg-slate-700/80 text-slate-300 hover:bg-slate-700'
                                  }`}
                                >
                                  Benar
                                </button>
                                <button
                                  type="button"
                                  disabled={isReviewMode}
                                  onClick={() => {
                                    handleUpdateAnswer({
                                      statementAnswers: {
                                        ...(currentAns.statementAnswers || {}),
                                        [stmt.id]: false,
                                      },
                                    });
                                  }}
                                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                                    userVal === false
                                      ? 'bg-rose-600 text-white ring-2 ring-rose-400'
                                      : 'bg-slate-700/80 text-slate-300 hover:bg-slate-700'
                                  }`}
                                >
                                  Salah
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 3. Format: Menjodohkan (Matching) */}
              {currentQ.type === 'matching' && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-400 mb-2">
                    💡 Jodohkan setiap item di sebelah kiri dengan pilihan pasangan yang tepat di sebelah kanan:
                  </p>
                  <div className="space-y-3">
                    {(currentQ.matchingPairs || []).map((pair, pIdx) => {
                      const selectedRight = currentAns.matchingPairsAnswer?.[pair.id] || '';
                      const rightOptions = (currentQ.matchingPairs || []).map((p) => p.right);

                      return (
                        <div
                          key={pair.id || pIdx}
                          className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5 flex-1">
                            <span className="w-6 h-6 rounded-lg bg-emerald-600/30 text-emerald-300 font-black text-xs flex items-center justify-center">
                              {pIdx + 1}
                            </span>
                            <span className="text-sm font-bold text-slate-100">{pair.left}</span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <MoveRight className="w-4 h-4 text-emerald-500 shrink-0 hidden sm:inline" />
                            <select
                              disabled={isReviewMode}
                              value={selectedRight}
                              onChange={(e) => {
                                handleUpdateAnswer({
                                  matchingPairsAnswer: {
                                    ...(currentAns.matchingPairsAnswer || {}),
                                    [pair.id]: e.target.value,
                                  },
                                });
                              }}
                              className="w-full sm:w-56 px-3.5 py-2.5 rounded-xl border border-slate-600 bg-slate-900 text-xs font-bold text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                            >
                              <option value="">-- Pilih Pasangan --</option>
                              {rightOptions.map((opt, oIdx) => (
                                <option key={oIdx} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 4. Format: Isian Singkat */}
              {currentQ.type === 'short_answer' && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-400">
                    💡 Ketikkan jawaban singkatmu pada kolom di bawah ini:
                  </p>
                  <input
                    type="text"
                    disabled={isReviewMode}
                    value={currentAns.shortAnswerText || ''}
                    onChange={(e) => handleUpdateAnswer({ shortAnswerText: e.target.value })}
                    placeholder="Ketik jawaban singkat di sini..."
                    className="w-full px-5 py-4 rounded-2xl border-2 border-slate-700 bg-slate-800 text-sm font-bold text-white focus:outline-none focus:border-[#364FFF] focus:ring-4 focus:ring-[#364FFF]/20 placeholder:text-slate-500"
                  />
                </div>
              )}

              {/* 5. Format: Uraian / Esai */}
              {currentQ.type === 'essay' && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-400">
                    💡 Tuliskan jawaban uraian secara lengkap dan jelas:
                  </p>
                  <textarea
                    rows={6}
                    disabled={isReviewMode}
                    value={currentAns.essayText || ''}
                    onChange={(e) => handleUpdateAnswer({ essayText: e.target.value })}
                    placeholder="Tuliskan jawaban uraianmu di sini..."
                    className="w-full px-5 py-4 rounded-2xl border-2 border-slate-700 bg-slate-800 text-sm font-medium text-white focus:outline-none focus:border-[#364FFF] focus:ring-4 focus:ring-[#364FFF]/20 placeholder:text-slate-500 leading-relaxed"
                  />
                </div>
              )}

              {/* Review Explanation */}
              {isReviewMode && currentQ.explanation && (
                <div className="mt-4 p-4 rounded-2xl bg-indigo-950/40 border border-indigo-700/60 text-indigo-200 text-xs leading-relaxed flex items-start gap-2.5">
                  <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block mb-0.5">Pembahasan Soal:</span>
                    <span>{currentQ.explanation}</span>
                  </div>
                </div>
              )}

              {/* Teacher Feedback on this specific question */}
              {isReviewMode && currentAns?.teacherFeedback && (
                <div className="mt-4 p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs leading-relaxed flex items-start gap-2.5">
                  <MessageSquare className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-300 block mb-0.5">Catatan Guru untuk Soal Ini:</span>
                    <span>{currentAns.teacherFeedback}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Navigation Buttons inside Canvas */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={currentQuestionIdx === 0}
                onClick={() => setCurrentQuestionIdx((prev) => Math.max(0, prev - 1))}
                className="px-4 py-2.5 rounded-2xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-700 disabled:opacity-40 flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Sebelumnya</span>
              </button>

              {currentQuestionIdx < totalQuestionsCount - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentQuestionIdx((prev) => Math.min(totalQuestionsCount - 1, prev + 1))}
                  className="px-5 py-2.5 rounded-2xl bg-[#364FFF] text-white text-xs font-bold hover:bg-indigo-600 flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <span>Selanjutnya</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : !isReviewMode ? (
                <button
                  type="button"
                  onClick={() => setShowConfirmSubmit(true)}
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-black shadow-lg shadow-emerald-600/30 hover:opacity-95 flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Selesai & Kumpulkan</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-2xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-700 cursor-pointer"
                >
                  Tutup Ulasan
                </button>
              )}
            </div>

          </div>

          {/* Right Sidebar: Number Grid Palette */}
          <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-slate-800 bg-slate-950 p-5 flex flex-col justify-between shrink-0">
            <div className="space-y-4">
              {isReviewMode && existingSubmission && (
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400">Skor Kuis</span>
                    <span className="text-base font-black text-[#364FFF]">
                      {existingSubmission.percentageScore ?? 0} / 100
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Perolehan XP</span>
                    <span className="font-black text-[#FFD83D]">+{existingSubmission.rewardPointsAwarded ?? 0} XP</span>
                  </div>
                  {existingSubmission.feedback && (
                    <div className="pt-2 border-t border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">Catatan Guru:</span>
                      <p className="text-xs text-slate-200 italic bg-slate-800/60 p-2 rounded-xl border border-slate-700/50">
                        "{existingSubmission.feedback}"
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Navigasi Soal
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[11px] font-extrabold text-indigo-300">
                  {answeredQuestionsCount}/{totalQuestionsCount} Terjawab
                </span>
              </div>

              {/* Number Buttons Palette */}
              <div className="grid grid-cols-5 gap-2">
                {quiz.questions.map((q, idx) => {
                  const isCurrent = currentQuestionIdx === idx;
                  const isAnswered = isQuestionAnswered(q);
                  const isFlagged = flaggedQuestions[q.id];
                  const qAns = answers[q.id];
                  const isManual = qAns?.isManualOverride;
                  const isCorrect = qAns?.isCorrect;

                  let btnBg = 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white';
                  if (isReviewMode) {
                    if (isManual) {
                      btnBg = 'bg-amber-500 text-slate-950 font-black shadow-xs';
                    } else if (isCorrect) {
                      btnBg = 'bg-emerald-600 text-white shadow-xs';
                    } else if (qAns?.earnedScore && qAns.earnedScore > 0) {
                      btnBg = 'bg-teal-600 text-white shadow-xs';
                    } else {
                      btnBg = 'bg-rose-600 text-white shadow-xs';
                    }
                  } else if (isFlagged) {
                    btnBg = 'bg-amber-500 text-slate-950 shadow-xs';
                  } else if (isAnswered) {
                    btnBg = 'bg-[#364FFF] text-white shadow-xs';
                  }

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setCurrentQuestionIdx(idx)}
                      className={`h-10 rounded-xl font-black text-xs flex items-center justify-center relative transition-all cursor-pointer ${
                        isCurrent
                          ? 'ring-2 ring-white scale-105 z-10'
                          : ''
                      } ${btnBg}`}
                    >
                      {idx + 1}
                      {!isReviewMode && isFlagged && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-300 rounded-full ring-2 ring-slate-950" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="pt-4 border-t border-slate-800 space-y-1.5 text-[11px] font-semibold text-slate-400">
                {isReviewMode ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-md bg-emerald-600" />
                      <span>Jawaban Benar</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-md bg-rose-600" />
                      <span>Jawaban Salah</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-md bg-amber-500" />
                      <span>Koreksi Guru</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-md bg-[#364FFF]" />
                      <span>Sudah Terjawab</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-md bg-amber-500" />
                      <span>Ragu-ragu</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-md bg-slate-800" />
                      <span>Belum Terjawab</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Bottom Submit Button on Palette */}
            {!isReviewMode && (
              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => setShowConfirmSubmit(true)}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs shadow-lg shadow-emerald-600/25 hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Kumpulkan Jawaban</span>
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Confirmation Modal */}
        {showConfirmSubmit && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <Send className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-white">Kumpulkan Jawaban Kuis?</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Kamu telah menjawab <strong className="text-emerald-400">{answeredQuestionsCount}</strong> dari{' '}
                <strong>{totalQuestionsCount}</strong> soal.
                {answeredQuestionsCount < totalQuestionsCount && (
                  <span className="block text-amber-400 mt-1 font-bold">
                    ⚠️ Perhatian: Masih ada {totalQuestionsCount - answeredQuestionsCount} soal yang belum dijawab.
                  </span>
                )}
              </p>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmSubmit(false)}
                  className="flex-1 py-2.5 rounded-2xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 cursor-pointer"
                >
                  Periksa Kembali
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  className="flex-1 py-2.5 rounded-2xl bg-emerald-500 text-white font-black text-xs hover:bg-emerald-600 shadow-md cursor-pointer"
                >
                  Ya, Kumpulkan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Thank You & Result Popup ("Kerja Bagus!") */}
        {submittedResult && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-indigo-500/50 rounded-3xl p-7 max-w-lg w-full text-center space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[#364FFF] to-[#6339FF] text-[#FFD83D] flex items-center justify-center mx-auto shadow-xl shadow-indigo-600/30">
                <Trophy className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-black text-white">Kerja Bagus! 🌟</h3>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  Terimakasih sudah menyelesaikan kuis tepat waktu. Jawabanmu telah berhasil disimpan dengan aman di server!
                </p>
              </div>

              {/* Score / Points / XP Result Card */}
              {quiz.showScoreImmediately && submittedResult.status === 'graded' ? (
                <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400">Skor Kuis</span>
                    <div className="text-xl font-black text-[#364FFF]">
                      {submittedResult.percentageScore} <span className="text-[10px] font-normal text-slate-400">/ 100</span>
                    </div>
                  </div>
                  <div className="border-l border-slate-700">
                    <span className="text-[10px] font-bold text-slate-400">Poin Leaderboard</span>
                    <div className="text-xl font-black text-amber-400">
                      +{submittedResult.rewardPointsAwarded} <span className="text-[10px] font-normal text-slate-400">Pts</span>
                    </div>
                  </div>
                  <div className="border-l border-slate-700">
                    <span className="text-[10px] font-bold text-slate-400">XP Level</span>
                    <div className="text-xl font-black text-purple-400">
                      +{submittedResult.rewardXpAwarded ?? submittedResult.rewardPointsAwarded} <span className="text-[10px] font-normal text-slate-400">XP</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-indigo-950/50 border border-indigo-800/60 text-xs text-indigo-200">
                  Kuis ini memiliki soal uraian yang akan diperiksa oleh guru sebelum skor akhir, Poin, & XP diterbitkan.
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#364FFF] via-[#6339FF] to-[#8B20FF] text-white font-black text-xs sm:text-sm shadow-xl shadow-indigo-600/30 hover:opacity-95 cursor-pointer"
              >
                Kembali ke Halaman Kuis
              </button>
            </div>
          </div>
        )}

        {/* Image Zoom Lightbox Modal */}
        {zoomImage && (
          <div
            className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
            onClick={() => setZoomImage(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
              <button
                type="button"
                onClick={() => setZoomImage(null)}
                className="absolute -top-12 right-0 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={zoomImage}
                alt="Enlarged Question Diagram"
                className="max-h-[85vh] max-w-full object-contain rounded-2xl shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
