import React, { useState } from 'react';
import {
  AlertCircle,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  FileQuestion,
  HelpCircle,
  MessageSquare,
  MoveRight,
  PenTool,
  RotateCcw,
  Search,
  Sparkles,
  User,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { Quiz, QuizQuestion, QuizSubmission, User as UserType } from '../../../types';
import { useApp } from '../../../context/AppContext';
import { RichQuestionPrompt } from '../../common/RichQuestionPrompt';

interface QuizGradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: Quiz;
}

export const QuizGradingModal: React.FC<QuizGradingModalProps> = ({
  isOpen,
  onClose,
  quiz,
}) => {
  const {
    users = [],
    quizSubmissions = {},
    gradeQuizSubmission,
    currentClassId,
  } = useApp();

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'need_grading' | 'graded' | 'not_submitted'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Per-question manual correction state: questionId -> { earnedScore, feedback, isCorrect, isManualOverride, originalAutoScore, originalIsCorrect }
  const [questionGrades, setQuestionGrades] = useState<
    Record<string, {
      earnedScore: number;
      feedback: string;
      isCorrect: boolean;
      isManualOverride: boolean;
      originalAutoScore: number;
      originalIsCorrect: boolean;
    }>
  >({});
  const [overallFeedback, setOverallFeedback] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  if (!isOpen) return null;

  // Filter students in the assigned classes
  const classStudents = users.filter((u: UserType) => {
    if (u.role !== 'student') return false;
    if (quiz.classIds && quiz.classIds.length > 0) {
      if (!quiz.classIds.some((cid) => (u.classIds || []).includes(cid))) return false;
    }
    if (quiz.assignedUserIds && quiz.assignedUserIds.length > 0) {
      return quiz.assignedUserIds.includes(u.uid);
    }
    return true;
  });

  // Collect all submissions for this quiz
  const submissionsList = classStudents.map((student) => {
    const subKey = `${quiz.id}_${student.uid}`;
    const sub = quizSubmissions[subKey] || Object.values(quizSubmissions).find(
      (s: any) => s && s.quizId === quiz.id && s.userId === student.uid
    );
    return {
      student,
      submission: sub as QuizSubmission | undefined,
    };
  });

  // Filter list
  const filteredList = submissionsList.filter(({ student, submission }) => {
    // Search filter
    const matchesSearch =
      student.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (student.studentNumber && student.studentNumber.includes(searchQuery));
    if (!matchesSearch) return false;

    if (filterStatus === 'need_grading') {
      return submission && submission.status === 'submitted';
    }
    if (filterStatus === 'graded') {
      return submission && submission.status === 'graded';
    }
    if (filterStatus === 'not_submitted') {
      return !submission || submission.status === 'in_progress';
    }
    return true;
  });

  // Selected student submission
  const activeStudentEntry = selectedStudentId
    ? submissionsList.find((s) => s.student.uid === selectedStudentId)
    : null;
  const activeSub = activeStudentEntry?.submission;

  // Select student to grade
  const handleSelectStudent = (studentId: string) => {
    setSelectedStudentId(studentId);
    setSaveSuccessMsg(false);
    const target = submissionsList.find((s) => s.student.uid === studentId);
    if (target?.submission) {
      const initial: Record<string, {
        earnedScore: number;
        feedback: string;
        isCorrect: boolean;
        isManualOverride: boolean;
        originalAutoScore: number;
        originalIsCorrect: boolean;
      }> = {};

      quiz.questions.forEach((q) => {
        const ans = target.submission?.answers?.[q.id];
        const isEssay = q.type === 'essay';

        const autoScore = ans?.originalAutoScore !== undefined
          ? ans.originalAutoScore
          : (ans?.earnedScore !== undefined ? ans.earnedScore : 0);
        const autoCorrect = ans?.originalIsCorrect !== undefined
          ? ans.originalIsCorrect
          : (ans?.isCorrect !== undefined ? ans.isCorrect : (autoScore > 0));

        const currentScore = ans?.earnedScore !== undefined
          ? ans.earnedScore
          : (isEssay ? q.points : autoScore);
        const currentCorrect = ans?.isCorrect !== undefined
          ? ans.isCorrect
          : (currentScore > 0);
        const isManual = Boolean(ans?.isManualOverride || (isEssay && ans?.earnedScore !== undefined));

        initial[q.id] = {
          earnedScore: currentScore,
          feedback: ans?.teacherFeedback || '',
          isCorrect: currentCorrect,
          isManualOverride: isManual,
          originalAutoScore: autoScore,
          originalIsCorrect: autoCorrect,
        };
      });

      setQuestionGrades(initial);
      setOverallFeedback(target.submission.feedback || '');
    } else {
      setQuestionGrades({});
      setOverallFeedback('');
    }
  };

  // Handlers for manual scoring per question
  const handleMarkCorrect = (q: QuizQuestion) => {
    setQuestionGrades((prev) => ({
      ...prev,
      [q.id]: {
        ...prev[q.id],
        earnedScore: q.points,
        isCorrect: true,
        isManualOverride: true,
      },
    }));
  };

  const handleMarkWrong = (q: QuizQuestion) => {
    setQuestionGrades((prev) => ({
      ...prev,
      [q.id]: {
        ...prev[q.id],
        earnedScore: 0,
        isCorrect: false,
        isManualOverride: true,
      },
    }));
  };

  const handleSetScore = (q: QuizQuestion, val: number) => {
    const clamped = Math.min(q.points, Math.max(0, val));
    setQuestionGrades((prev) => ({
      ...prev,
      [q.id]: {
        ...prev[q.id],
        earnedScore: clamped,
        isCorrect: clamped > 0,
        isManualOverride: true,
      },
    }));
  };

  const handleSetFeedback = (qId: string, feedback: string) => {
    setQuestionGrades((prev) => ({
      ...prev,
      [qId]: {
        ...prev[qId],
        feedback,
      },
    }));
  };

  const handleResetToAuto = (q: QuizQuestion) => {
    setQuestionGrades((prev) => {
      const current = prev[q.id];
      if (!current) return prev;
      return {
        ...prev,
        [q.id]: {
          ...current,
          earnedScore: current.originalAutoScore,
          isCorrect: current.originalIsCorrect,
          isManualOverride: false,
        },
      };
    });
  };

  const handleSaveGrading = () => {
    if (!activeSub) return;
    gradeQuizSubmission(activeSub.id, questionGrades, overallFeedback);
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 3000);
  };

  // Live recalculated score for currently inspected student
  const liveTotalEarned = quiz.questions.reduce((sum, q) => {
    return sum + (questionGrades[q.id]?.earnedScore ?? 0);
  }, 0);
  const liveTotalMax = quiz.questions.reduce((sum, q) => sum + (q.points || 10), 0);
  const livePercentageScore = liveTotalMax > 0
    ? Math.min(100, Math.max(0, Math.round((liveTotalEarned / liveTotalMax) * 100)))
    : 0;
  const manualOverridesCount = quiz.questions.filter((q) => questionGrades[q.id]?.isManualOverride).length;

  // Metrics
  const totalSubmissionsCount = submissionsList.filter((s) => s.submission && s.submission.status !== 'in_progress').length;
  const needGradingCount = submissionsList.filter((s) => s.submission && s.submission.status === 'submitted').length;
  const gradedList = submissionsList.filter((s) => s.submission && s.submission.status === 'graded');
  const avgScore = gradedList.length > 0
    ? Math.round(gradedList.reduce((sum, s) => sum + (s.submission?.percentageScore || 0), 0) / gradedList.length)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl my-auto flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 via-indigo-50/40 to-purple-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#364FFF] to-[#6339FF] flex items-center justify-center text-white shadow-md shadow-indigo-600/25">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">
                  Hasil & Penilaian Kuis: {quiz.title}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                  {quiz.subject}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Pemeriksaan jawaban siswa, penilaian soal uraian, dan rincian perolehan skor
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Row */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500">Terkumpul / Total Siswa</span>
            <div className="text-base font-black text-slate-900 mt-0.5">
              {totalSubmissionsCount} <span className="text-xs font-medium text-slate-400">/ {classStudents.length} Siswa</span>
            </div>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500">Perlu Diperiksa (Uraian)</span>
            <div className="text-base font-black text-amber-600 mt-0.5">
              {needGradingCount} Siswa
            </div>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500">Rata-rata Skor</span>
            <div className="text-base font-black text-emerald-600 mt-0.5">
              {avgScore} <span className="text-xs font-medium text-slate-400">/ 100</span>
            </div>
          </div>
          <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500">Total Soal & Bobot</span>
            <div className="text-base font-black text-indigo-600 mt-0.5">
              {quiz.questions.length} Soal <span className="text-xs font-medium text-slate-400">({quiz.maxScore} Poin)</span>
            </div>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Column: Student List */}
          <div className="w-full sm:w-80 border-r border-slate-200 flex flex-col bg-slate-50/50 shrink-0">
            {/* Search & Filter */}
            <div className="p-3.5 border-b border-slate-200 space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama atau nomor absen..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#364FFF]"
                />
              </div>

              {/* Status Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setFilterStatus('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer ${
                    filterStatus === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Semua ({submissionsList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('need_grading')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer ${
                    filterStatus === 'need_grading'
                      ? 'bg-amber-600 text-white'
                      : 'bg-white border border-slate-200 text-amber-700 hover:bg-amber-50'
                  }`}
                >
                  Perlu Diperiksa ({needGradingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('graded')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer ${
                    filterStatus === 'graded'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Sudah Dinilai ({gradedList.length})
                </button>
              </div>
            </div>

            {/* Students Scroll List */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
              {filteredList.length === 0 ? (
                <div className="text-center py-8 text-xs font-bold text-slate-400">
                  Tidak ada data siswa
                </div>
              ) : (
                filteredList.map(({ student, submission }) => {
                  const isSelected = selectedStudentId === student.uid;
                  const isSubmitted = submission && submission.status !== 'in_progress';
                  const needsGrade = submission?.status === 'submitted';

                  return (
                    <button
                      key={student.uid}
                      type="button"
                      onClick={() => handleSelectStudent(student.uid)}
                      className={`w-full p-3 rounded-2xl text-left transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-[#364FFF] to-[#6339FF] text-white shadow-md shadow-indigo-600/20'
                          : 'bg-white hover:bg-slate-100 border border-slate-200/80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={
                            student.avatarUrl ||
                            `https://api.dicebear.com/7.x/bottts/svg?seed=${student.uid}`
                          }
                          alt={student.displayName}
                          className="w-8 h-8 rounded-full bg-white/20 shrink-0 border border-slate-200"
                        />
                        <div className="min-w-0">
                          <p className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                            {student.absentNumber ? `${student.absentNumber}. ` : ''}
                            {student.displayName}
                          </p>
                          <p className={`text-[11px] ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                            {isSubmitted
                              ? `${isSelected ? livePercentageScore : (submission.percentageScore ?? 0)} Poin • +${isSelected ? (livePercentageScore >= (quiz.passingScore ?? 70) ? (quiz.rewardPoints || 50) : Math.round(((quiz.rewardPoints || 50) * livePercentageScore) / 100)) : (submission.rewardPointsAwarded ?? 0)} XP`
                              : 'Belum Mengerjakan'}
                          </p>
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div className="shrink-0 ml-2">
                        {needsGrade ? (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${isSelected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>
                            Periksa
                          </span>
                        ) : isSubmitted ? (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${isSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                            {isSelected ? livePercentageScore : submission?.percentageScore}%
                          </span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                            -
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Detailed Review & Essay Grading */}
          <div className="flex-1 overflow-y-auto p-6">
            {!activeStudentEntry ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <Users className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-sm font-bold text-slate-600">Pilih Siswa dari Daftar di Sebelah Kiri</p>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  Klik nama siswa untuk memeriksa lembar pengerjaan kuis, menilai soal uraian, dan memberikan catatan motivasi.
                </p>
              </div>
            ) : !activeSub ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <Clock className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-sm font-bold text-slate-600">
                  {activeStudentEntry.student.displayName} Belum Mengumpulkan Kuis
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Siswa ini belum mulai mengerjakan atau kuis masih dalam proses pengerjaan.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Student Submission Overview Header */}
                <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <img
                      src={
                        activeStudentEntry.student.avatarUrl ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${activeStudentEntry.student.uid}`
                      }
                      alt={activeStudentEntry.student.displayName}
                      className="w-12 h-12 rounded-2xl border-2 border-white shadow-xs"
                    />
                    <div>
                      <h3 className="text-base font-black text-slate-900">
                        {activeStudentEntry.student.displayName}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        NIS: {activeStudentEntry.student.studentNumber || '-'} • Dikumpulkan pada:{' '}
                        {activeSub.submittedAt
                          ? new Date(activeSub.submittedAt).toLocaleString('id-ID')
                          : '-'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[11px] font-bold text-slate-400 uppercase">Skor Akhir</span>
                      <div className="text-xl font-black text-[#364FFF]">
                        {livePercentageScore} <span className="text-xs font-bold text-slate-400">/ 100</span>
                      </div>
                      {manualOverridesCount > 0 && (
                        <div className="text-[10px] font-bold text-amber-600">
                          ✏️ {manualOverridesCount} koreksi manual
                        </div>
                      )}
                    </div>
                    <div className="text-right pl-3 border-l border-slate-200">
                      <span className="text-[11px] font-bold text-slate-400 uppercase">Reward XP</span>
                      <div className="text-xl font-black text-[#FFD83D]">
                        +{livePercentageScore >= (quiz.passingScore ?? 70) ? (quiz.rewardPoints || 50) : Math.round(((quiz.rewardPoints || 50) * livePercentageScore) / 100)} <span className="text-xs font-bold text-slate-400">XP</span>
                      </div>
                    </div>
                  </div>
                </div>

                {saveSuccessMsg && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Penilaian dan feedback berhasil disimpan & disinkronkan ke siswa!</span>
                  </div>
                )}

                {/* Question Answers Review List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <FileQuestion className="w-4 h-4 text-[#364FFF]" />
                      Rincian Jawaban Siswa ({quiz.questions.length} Soal)
                    </h4>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Total Poin: {liveTotalEarned} / {liveTotalMax} Poin
                    </span>
                  </div>

                  {quiz.questions.map((q, qIdx) => {
                    const ans = activeSub.answers?.[q.id];
                    const grade = questionGrades[q.id] || {
                      earnedScore: ans?.earnedScore ?? (q.type === 'essay' ? q.points : (ans?.isCorrect ? q.points : 0)),
                      feedback: ans?.teacherFeedback || '',
                      isCorrect: ans?.isCorrect ?? false,
                      isManualOverride: ans?.isManualOverride ?? false,
                      originalAutoScore: ans?.originalAutoScore ?? ans?.earnedScore ?? 0,
                      originalIsCorrect: ans?.originalIsCorrect ?? ans?.isCorrect ?? false,
                    };
                    const isEssay = q.type === 'essay';
                    const isManual = grade.isManualOverride;

                    return (
                      <div
                        key={q.id}
                        className={`p-5 rounded-3xl border transition-all ${
                          isManual
                            ? 'bg-amber-50/20 border-amber-300 shadow-xs'
                            : isEssay
                            ? 'bg-indigo-50/20 border-indigo-200'
                            : grade.isCorrect
                            ? 'bg-emerald-50/20 border-emerald-200'
                            : 'bg-rose-50/20 border-rose-200'
                        }`}
                      >
                        {/* Top row */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center">
                              {qIdx + 1}
                            </span>
                            <span className="text-xs font-bold text-slate-500">
                              Bobot Soal: {q.points} Poin
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {isManual ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-extrabold flex items-center gap-1.5 shadow-2xs">
                                <span>✏️ Koreksi Guru</span>
                                <span>•</span>
                                <span>{grade.earnedScore} / {q.points} Poin</span>
                                {grade.originalAutoScore !== undefined && (
                                  <span className="text-amber-700 font-normal line-through ml-1 text-[10px]">
                                    (Otomatis: {grade.originalAutoScore} pt)
                                  </span>
                                )}
                              </span>
                            ) : isEssay ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-xs font-extrabold flex items-center gap-1">
                                <PenTool className="w-3.5 h-3.5" /> Uraian ({grade.earnedScore} / {q.points} pt)
                              </span>
                            ) : grade.isCorrect ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Otomatis: Benar (+{grade.earnedScore} pt)
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-xs font-extrabold flex items-center gap-1">
                                <XCircle className="w-3.5 h-3.5" /> Otomatis: Salah (0 pt)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Question Prompt with inline image & text support */}
                        <div className="text-sm font-bold text-slate-900 mb-3">
                          <RichQuestionPrompt text={q.prompt} fallbackImageUrl={q.imageUrl} theme="light" />
                        </div>

                        {/* 1. Single Choice Review */}
                        {q.type === 'single_choice' && (
                          <div className="space-y-1.5 text-xs">
                            {(q.options || []).map((opt, optIdx) => {
                              const isStudentSelected = ans?.selectedOptionIndex === optIdx;
                              const isCorrectOption = q.correctOptionIndex === optIdx;

                              return (
                                <div
                                  key={optIdx}
                                  className={`p-2.5 rounded-xl flex items-center justify-between border ${
                                    isStudentSelected && isCorrectOption
                                      ? 'bg-emerald-100/60 border-emerald-300 font-bold text-emerald-950'
                                      : isStudentSelected && !isCorrectOption
                                      ? 'bg-rose-100/60 border-rose-300 font-bold text-rose-950'
                                      : isCorrectOption
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                                      : 'bg-white border-slate-200 text-slate-600'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-md bg-white border border-slate-300 font-bold text-[10px] flex items-center justify-center">
                                      {String.fromCharCode(65 + optIdx)}
                                    </span>
                                    <span>{opt}</span>
                                  </div>
                                  <div className="text-[10px] font-extrabold">
                                    {isStudentSelected && <span className="mr-2">👈 Pilihan Siswa</span>}
                                    {isCorrectOption && <span className="text-emerald-700">✓ Kunci Benar</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* 2. Complex Review */}
                        {q.type === 'complex_multiple_choice' && q.complexMode === 'true_false' && (
                          <div className="space-y-1.5 text-xs">
                            {(q.complexStatements || []).map((stmt, sIdx) => {
                              const studentVal = ans?.statementAnswers?.[stmt.id];
                              const isMatch = studentVal === stmt.isCorrect;

                              return (
                                <div
                                  key={stmt.id || sIdx}
                                  className={`p-2.5 rounded-xl flex items-center justify-between border ${
                                    isMatch
                                      ? 'bg-emerald-50/70 border-emerald-200 text-slate-800'
                                      : 'bg-rose-50/70 border-rose-200 text-slate-800'
                                  }`}
                                >
                                  <span className="font-semibold mr-2">{stmt.statement}</span>
                                  <div className="flex items-center gap-2 text-[11px] shrink-0">
                                    <span className="font-bold">
                                      Siswa: {studentVal === true ? 'Benar' : studentVal === false ? 'Salah' : '-'}
                                    </span>
                                    <span className="text-slate-400">|</span>
                                    <span className="font-bold text-emerald-700">
                                      Kunci: {stmt.isCorrect ? 'Benar' : 'Salah'}
                                    </span>
                                    {isMatch ? (
                                      <Check className="w-4 h-4 text-emerald-600" />
                                    ) : (
                                      <X className="w-4 h-4 text-rose-600" />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* 3. Matching Review */}
                        {q.type === 'matching' && (
                          <div className="space-y-1.5 text-xs">
                            {(q.matchingPairs || []).map((pair, pIdx) => {
                              const studentMatched = ans?.matchingPairsAnswer?.[pair.id];
                              const isMatch = studentMatched === pair.right;

                              return (
                                <div
                                  key={pair.id || pIdx}
                                  className={`p-2.5 rounded-xl flex items-center justify-between border ${
                                    isMatch
                                      ? 'bg-emerald-50/70 border-emerald-200'
                                      : 'bg-rose-50/70 border-rose-200'
                                  }`}
                                >
                                  <span className="font-semibold text-slate-800">{pair.left}</span>
                                  <div className="flex items-center gap-2 shrink-0 text-[11px]">
                                    <MoveRight className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="font-bold text-slate-900">
                                      {studentMatched || '(Tidak dijodohkan)'}
                                    </span>
                                    <span className="text-slate-400">|</span>
                                    <span className="font-bold text-emerald-700">Kunci: {pair.right}</span>
                                    {isMatch ? (
                                      <Check className="w-4 h-4 text-emerald-600" />
                                    ) : (
                                      <X className="w-4 h-4 text-rose-600" />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* 4. Short Answer Review */}
                        {q.type === 'short_answer' && (
                          <div className="space-y-2 text-xs">
                            <div className="p-3 rounded-xl bg-white border border-slate-200">
                              <span className="text-[11px] font-bold text-slate-400 block mb-1">
                                Jawaban Siswa:
                              </span>
                              <p className="text-xs font-bold text-slate-900">
                                {ans?.shortAnswerText || '(Siswa tidak mengisi jawaban)'}
                              </p>
                            </div>
                            <div className="text-[11px] text-emerald-700 font-bold">
                              Kunci Jawaban yang Diterima: {(q.acceptedAnswers || []).join(' / ')}
                            </div>
                          </div>
                        )}

                        {/* 5. Essay Grading Review */}
                        {q.type === 'essay' && (
                          <div className="space-y-3 pt-2">
                            <div className="p-3.5 rounded-2xl bg-white border border-indigo-200">
                              <span className="text-[11px] font-bold text-indigo-700 block mb-1">
                                Lembar Jawaban Uraian Siswa:
                              </span>
                              <p className="text-xs font-medium text-slate-900 whitespace-pre-wrap leading-relaxed">
                                {ans?.essayText || '(Siswa tidak mengisi jawaban)'}
                              </p>
                            </div>

                            {q.essayRubric && (
                              <div className="p-3 rounded-xl bg-indigo-50/80 border border-indigo-200 text-indigo-900 text-xs">
                                <span className="font-bold block mb-0.5">Pedoman / Rubrik Penilaian Guru:</span>
                                <span>{q.essayRubric}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Unified Manual Correction & Feedback Panel for ALL Question Types */}
                        <div className="mt-4 pt-3.5 border-t border-slate-200/80 bg-white/80 p-3.5 rounded-2xl space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                                <PenTool className="w-3.5 h-3.5 text-[#364FFF]" />
                                Koreksi & Nilai Soal:
                              </span>
                              {isManual && (
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                  Manual
                                </span>
                              )}
                            </div>

                            {/* Reset to auto if manual override is active */}
                            {isManual && !isEssay && (
                              <button
                                type="button"
                                onClick={() => handleResetToAuto(q)}
                                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
                                title="Kembalikan nilai ke koreksi otomatis sistem"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Kembalikan ke Otomatis
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                            {/* Quick action buttons & score input */}
                            <div className="sm:col-span-6 flex items-center flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => handleMarkCorrect(q)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                                  grade.earnedScore === q.points && grade.isCorrect
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                <Check className="w-3.5 h-3.5" />
                                Benar ({q.points} pt)
                              </button>

                              <button
                                type="button"
                                onClick={() => handleMarkWrong(q)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                                  grade.earnedScore === 0 && !grade.isCorrect
                                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                                }`}
                              >
                                <X className="w-3.5 h-3.5" />
                                Salah (0 pt)
                              </button>

                              <div className="flex items-center gap-1.5 ml-auto sm:ml-2">
                                <span className="text-xs font-bold text-slate-500">Nilai:</span>
                                <input
                                  type="number"
                                  min="0"
                                  max={q.points}
                                  value={grade.earnedScore}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    handleSetScore(q, isNaN(val) ? 0 : val);
                                  }}
                                  className="w-16 px-2 py-1 rounded-xl border border-slate-300 text-xs font-black text-center text-slate-900 bg-white focus:ring-2 focus:ring-[#364FFF] focus:outline-none"
                                />
                                <span className="text-xs font-bold text-slate-400">/ {q.points}</span>
                              </div>
                            </div>

                            {/* Question Feedback input */}
                            <div className="sm:col-span-6">
                              <input
                                type="text"
                                value={grade.feedback}
                                onChange={(e) => handleSetFeedback(q.id, e.target.value)}
                                placeholder="Catatan guru untuk soal ini (opsional)..."
                                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-[#364FFF] focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Optional Explanation */}
                        {q.explanation && (
                          <div className="mt-2 text-[11px] text-slate-500 italic bg-white/70 p-2 rounded-xl">
                            💡 Pembahasan: {q.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Overall Teacher Feedback & Submit */}
                <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-3">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-[#364FFF]" />
                    Catatan / Pesan Motivasi Guru untuk Siswa:
                  </label>
                  <textarea
                    rows={2}
                    value={overallFeedback}
                    onChange={(e) => setOverallFeedback(e.target.value)}
                    placeholder="Contoh: Kerja bagus! Pemahaman materi sudah sangat mantap."
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#364FFF]"
                  />

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleSaveGrading}
                      className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-[#364FFF] to-[#6339FF] text-white font-black text-xs shadow-lg shadow-indigo-600/25 hover:opacity-95 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-[#FFD83D]" />
                      Simpan & Publikasikan Nilai
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
