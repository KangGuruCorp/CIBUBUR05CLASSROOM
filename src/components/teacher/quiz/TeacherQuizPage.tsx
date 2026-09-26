import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  FileQuestion,
  Filter,
  Layers,
  MoreVertical,
  Plus,
  Printer,
  ScanLine,
  Search,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import { Quiz, QuizQuestion } from '../../../types';
import { PaperModeSession } from '../../../types/paperMode';
import { useApp } from '../../../context/AppContext';
import {
  STANDARD_SUBJECTS,
  matchSubjectToStandard,
} from '../../../utils/materialTemplates';
import { formatDateIndo, formatDayAndDateIndo, getDateKey } from '../../../utils/gamification';
import { QuizEditorModal } from './QuizEditorModal';
import { QuizGradingModal } from './QuizGradingModal';
import { PointIcon } from '../../common/PointIcon';
import { PaperCardGeneratorModal } from './paper/PaperCardGeneratorModal';
import { QuizAiImportModal } from './paper/QuizAiImportModal';
import { PaperPresenterModal } from './paper/PaperPresenterModal';
import { PaperScannerModal } from './paper/PaperScannerModal';
import { PaperAnalyticsModal } from './paper/PaperAnalyticsModal';

export const TeacherQuizPage: React.FC = () => {
  const {
    quizzes = [],
    quizSubmissions = {},
    users = [],
    currentClassId,
    deleteQuiz,
    updateQuiz,
  } = useApp();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [gradingQuiz, setGradingQuiz] = useState<Quiz | null>(null);

  // Paper Mode States
  const [isCardGeneratorOpen, setIsCardGeneratorOpen] = useState(false);
  const [isAiImportOpen, setIsAiImportOpen] = useState(false);
  const [presenterQuiz, setPresenterQuiz] = useState<{ quiz: Quiz; classId: string } | null>(null);
  const [scannerQuiz, setScannerQuiz] = useState<{ quiz: Quiz; classId: string } | null>(null);
  const [analyticsData, setAnalyticsData] = useState<{
    quiz: Quiz;
    classId: string;
    session: PaperModeSession;
  } | null>(null);

  const handleStartPaperMode = (quiz: Quiz) => {
    const targetClassId = currentClassId || quiz.classIds?.[0] || '';
    setPresenterQuiz({ quiz, classId: targetClassId });
  };

  const handleImportAiQuestions = (questions: QuizQuestion[]) => {
    setEditingQuiz({
      id: `quiz_${Date.now()}`,
      schoolId: '',
      classIds: currentClassId ? [currentClassId] : [],
      subject: 'Ilmu Pengetahuan Alam (IPA)',
      title: 'Kuis Ekstraksi AI',
      description: 'Kuis baru hasil ekstraksi cerdas AI Gemini',
      durationMinutes: 30,
      shuffleQuestions: false,
      showScoreImmediately: true,
      maxScore: questions.length * 10,
      rewardPoints: 50,
      rewardXp: 50,
      questions,
      status: 'draft',
      createdBy: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setIsCreateModalOpen(true);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'published' | 'scheduled' | 'draft'>('all');

  // Filter quizzes for the active class or all
  const classQuizzes = quizzes.filter((q) => {
    if (!currentClassId) return true;
    return !q.classIds || q.classIds.length === 0 || q.classIds.includes(currentClassId);
  });

  // Extract unique subjects combined with standard subjects present in quizzes
  const subjectsWithQuizzes = STANDARD_SUBJECTS.filter((sub) =>
    classQuizzes.some((q) => q.subject === sub || matchSubjectToStandard(q.subject) === sub)
  );

  // Filtered list
  const filteredQuizzes = classQuizzes.filter((q) => {
    const matchesSearch =
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.topic && q.topic.toLowerCase().includes(searchQuery.toLowerCase())) ||
      q.subject.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedSubject !== 'all') {
      const isStd = STANDARD_SUBJECTS.includes(selectedSubject as any);
      if (isStd) {
        if (q.subject !== selectedSubject && matchSubjectToStandard(q.subject) !== selectedSubject) {
          return false;
        }
      } else if (q.subject !== selectedSubject) {
        return false;
      }
    }

    if (selectedStatus !== 'all') {
      if (selectedStatus === 'scheduled') {
        const isSched = q.status === 'scheduled' || (q.openAt && new Date(q.openAt).getTime() > Date.now());
        if (!isSched) return false;
      } else if (selectedStatus === 'published') {
        const isPub = q.status === 'published' && (!q.openAt || new Date(q.openAt).getTime() <= Date.now());
        if (!isPub) return false;
      } else if (selectedStatus === 'draft') {
        if (q.status !== 'draft') return false;
      }
    }

    return true;
  });

  // Group quizzes by publish / open date (kapan kuis terbit)
  const groupedQuizzes = useMemo(() => {
    const map = new Map<string, { dateLabel: string; quizzes: Quiz[] }>();

    // Sort newest publish date first
    const sorted = [...filteredQuizzes].sort((a, b) => {
      const dateA = new Date(a.openAt || a.createdAt || a.dueAt || 0).getTime();
      const dateB = new Date(b.openAt || b.createdAt || b.dueAt || 0).getTime();
      return dateB - dateA;
    });

    sorted.forEach((quiz) => {
      const dateStr = quiz.openAt || quiz.createdAt || quiz.dueAt;
      const key = getDateKey(dateStr);
      const label = formatDayAndDateIndo(dateStr);

      if (!map.has(key)) {
        map.set(key, { dateLabel: label, quizzes: [] });
      }
      map.get(key)!.quizzes.push(quiz);
    });

    const list: { dateKey: string; dateLabel: string; quizzes: Quiz[] }[] = [];
    map.forEach((val, key) => {
      list.push({ dateKey: key, dateLabel: val.dateLabel, quizzes: val.quizzes });
    });

    return list;
  }, [filteredQuizzes]);

  // Total students count
  const studentUsers = users.filter((u) => u.role === 'student' && (!currentClassId || (u.classIds || []).includes(currentClassId)));

  const handleOpenEdit = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setIsCreateModalOpen(true);
  };

  const handleOpenGrading = (quiz: Quiz) => {
    setGradingQuiz(quiz);
  };

  const handleDelete = (quizId: string, quizTitle: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus kuis "${quizTitle}"?`)) {
      deleteQuiz(quizId);
    }
  };

  const handleToggleStatus = (quiz: Quiz) => {
    const nextStatus = quiz.status === 'published' ? 'draft' : 'published';
    updateQuiz(quiz.id, { status: nextStatus });
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#101936] via-[#1A2550] to-[#2E1065] p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-xs border border-white/20 text-[#FFD83D] text-xs font-black tracking-wide uppercase mb-3 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 fill-[#FFD83D]" />
              Manajemen Kuis Pembelajaran
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Kuis & Evaluasi Interaktif
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-xl mt-1.5 leading-relaxed">
              Buat soal kuis interaktif (PG, PG Kompleks, Menjodohkan, Isian, Uraian) dengan koreksi nilai otomatis dan hadiah XP gamifikasi.
            </p>
          </div>

          <div className="shrink-0 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAiImportOpen(true)}
              className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-black text-xs backdrop-blur-xs border border-white/20 transition-all flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Impor Soal AI</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCardGeneratorOpen(true)}
              className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-black text-xs backdrop-blur-xs border border-white/20 transition-all flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Printer className="w-4 h-4 text-emerald-300" />
              <span>Cetak Kartu Siswa</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingQuiz(null);
                setIsCreateModalOpen(true);
              }}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#364FFF] via-[#6339FF] to-[#8B20FF] text-white font-black text-xs sm:text-sm shadow-xl shadow-indigo-600/30 hover:opacity-95 transition-all flex items-center gap-2.5 cursor-pointer transform hover:scale-[1.02]"
            >
              <Plus className="w-5 h-5" />
              <span>Buat Kuis Baru</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-[#BFDBFE]/50 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul kuis, topik, atau mata pelajaran..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/50 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#364FFF]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Subject Filter */}
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-3 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#364FFF] cursor-pointer"
          >
            <option value="all">Semua Mata Pelajaran</option>
            {STANDARD_SUBJECTS.map((sbj) => (
              <option key={sbj} value={sbj}>
                {sbj}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="px-3 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#364FFF] cursor-pointer"
          >
            <option value="all">Semua Status</option>
            <option value="published">🚀 Dipublikasikan</option>
            <option value="scheduled">⏰ Terjadwal</option>
            <option value="draft">📝 Draf (Belum Rilis)</option>
          </select>
        </div>
      </div>

      {/* Quizzes List Cards */}
      {filteredQuizzes.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-[#364FFF] flex items-center justify-center mx-auto shadow-xs">
            <FileQuestion className="w-8 h-8" />
          </div>
          <h3 className="text-base font-black text-slate-900">Belum Ada Kuis</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Mulai buat kuis pertama Anda untuk menguji pemahaman siswa dengan 5 jenis tipe soal interaktif.
          </p>
          <button
            type="button"
            onClick={() => {
              setEditingQuiz(null);
              setIsCreateModalOpen(true);
            }}
            className="mt-2 px-5 py-2.5 rounded-2xl bg-[#364FFF] text-white font-bold text-xs shadow-md hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            + Buat Kuis Sekarang
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedQuizzes.map((group, groupIdx) => (
            <div key={group.dateKey} className="space-y-3">
              {/* Thin Date Separator with Day & Date */}
              <div className={`flex items-center gap-3 ${groupIdx > 0 ? 'pt-4' : 'pt-1'} pb-1`}>
                <div className="h-[1px] flex-1 bg-slate-200/90" />
                <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-slate-100/90 text-slate-500 text-[11px] font-semibold border border-slate-200/70 shadow-2xs shrink-0 select-none">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>{group.dateLabel}</span>
                </div>
                <div className="h-[1px] flex-1 bg-slate-200/90" />
              </div>

              {/* Quizzes List for this date */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {group.quizzes.map((quiz) => {
                  // Count submissions for this quiz
                  const submittedCount = Object.values(quizSubmissions).filter(
                    (s) => s && s.quizId === quiz.id && s.status !== 'in_progress'
                  ).length;
                  const needsGradeCount = Object.values(quizSubmissions).filter(
                    (s) => s && s.quizId === quiz.id && s.status === 'submitted'
                  ).length;

                  const isScheduledQuiz = quiz.status === 'scheduled' || Boolean(quiz.openAt && new Date(quiz.openAt).getTime() > Date.now());
                  const isPublishedQuiz = quiz.status === 'published' && (!quiz.openAt || new Date(quiz.openAt).getTime() <= Date.now());

                  return (
                    <div
                      key={quiz.id}
                      className="bg-white rounded-3xl border border-[#BFDBFE]/60 p-5 shadow-xs hover:shadow-lg hover:border-[#364FFF]/40 transition-all flex flex-col justify-between space-y-4 group"
                    >
                      <div>
                        {/* Top Badges */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="px-3 py-1 rounded-xl bg-blue-50 text-[#364FFF] font-extrabold text-[11px] border border-blue-100 truncate max-w-[170px]">
                            {quiz.subject}
                          </span>

                          {isScheduledQuiz ? (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(quiz)}
                              title="Kuis terjadwal. Klik untuk mengubah ke draf"
                              className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase transition-all bg-amber-100 text-amber-800 border border-amber-200 cursor-pointer"
                            >
                              ⏰ Terjadwal
                            </button>
                          ) : isPublishedQuiz ? (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(quiz)}
                              title="Kuis aktif. Klik untuk mengubah ke draf"
                              className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase transition-all bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-pointer"
                            >
                              ● Aktif
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(quiz)}
                              title="Kuis draf. Klik untuk mempublikasikan"
                              className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase transition-all bg-slate-100 text-slate-600 border border-slate-200 cursor-pointer"
                            >
                              ○ Draf
                            </button>
                          )}
                        </div>

                        {/* Title & Topic */}
                        <h3 className="text-base font-black text-slate-900 leading-snug group-hover:text-[#364FFF] transition-colors line-clamp-2">
                          {quiz.title}
                        </h3>
                        {quiz.topic && (
                          <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span className="truncate">{quiz.topic}</span>
                          </p>
                        )}

                        {quiz.description && (
                          <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                            {quiz.description}
                          </p>
                        )}

                        {/* Metadata Specs */}
                        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 font-semibold">
                          {isScheduledQuiz && quiz.openAt && (
                            <div className="col-span-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-200/70">
                              <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>Jadwal Buka: {formatDateIndo(quiz.openAt)}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[#364FFF]" />
                            <span>{quiz.durationMinutes > 0 ? `${quiz.durationMinutes} Menit` : 'Waktu Bebas'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <FileQuestion className="w-3.5 h-3.5 text-purple-600" />
                            <span>{quiz.questions.length} Butir Soal</span>
                          </div>
                          <div className="flex items-center gap-1.5" title="Hadiah Poin Leaderboard">
                            <PointIcon className="w-3.5 h-3.5" />
                            <span className="font-bold text-amber-900">+{quiz.rewardPoints} Pts</span>
                          </div>
                          <div className="flex items-center gap-1.5" title="Hadiah XP Leveling">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                            <span className="font-bold text-indigo-900">+{quiz.rewardXp !== undefined ? quiz.rewardXp : quiz.rewardPoints} XP</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="font-bold text-slate-800">
                              {submittedCount} / {studentUsers.length} Siswa
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Actions */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleStartPaperMode(quiz)}
                          title="Mulai Kuis Modus Kertas (Layar Proyektor & Pemindai Kamera ArUco)"
                          className="py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold text-xs shadow-xs hover:opacity-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <ScanLine className="w-3.5 h-3.5" />
                          <span>Modus Kertas</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenGrading(quiz)}
                          className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-[#364FFF] to-[#6339FF] text-white font-extrabold text-xs shadow-xs hover:opacity-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>Periksa & Nilai</span>
                          {needsGradeCount > 0 && (
                            <span className="ml-1 px-1.5 py-0.2 bg-amber-400 text-slate-900 font-black rounded-full text-[10px]">
                              {needsGradeCount}
                            </span>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(quiz)}
                          title="Edit Kuis & Soal"
                          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(quiz.id, quiz.title)}
                          title="Hapus Kuis"
                          className="p-2 rounded-xl border border-rose-200 text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quiz Editor Modal */}
      {isCreateModalOpen && (
        <QuizEditorModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingQuiz(null);
          }}
          initialQuiz={editingQuiz}
        />
      )}

      {/* Quiz Grading Modal */}
      {gradingQuiz && (
        <QuizGradingModal
          isOpen={Boolean(gradingQuiz)}
          onClose={() => setGradingQuiz(null)}
          quiz={gradingQuiz}
        />
      )}

      {/* Paper Card Generator Modal */}
      {isCardGeneratorOpen && (
        <PaperCardGeneratorModal
          isOpen={isCardGeneratorOpen}
          onClose={() => setIsCardGeneratorOpen(false)}
          defaultClassId={currentClassId}
        />
      )}

      {/* AI Quiz Import Modal */}
      {isAiImportOpen && (
        <QuizAiImportModal
          isOpen={isAiImportOpen}
          onClose={() => setIsAiImportOpen(false)}
          onImportQuestions={handleImportAiQuestions}
        />
      )}

      {/* Paper Mode Presenter View (Projector) */}
      {presenterQuiz && (
        <PaperPresenterModal
          isOpen={Boolean(presenterQuiz)}
          onClose={() => setPresenterQuiz(null)}
          quiz={presenterQuiz.quiz}
          classId={presenterQuiz.classId}
          onOpenScannerOnThisDevice={() =>
            setScannerQuiz({ quiz: presenterQuiz.quiz, classId: presenterQuiz.classId })
          }
          onFinishAndShowAnalytics={(session) => {
            const finishedQuiz = presenterQuiz.quiz;
            const finishedClassId = presenterQuiz.classId;
            setPresenterQuiz(null);
            setAnalyticsData({ quiz: finishedQuiz, classId: finishedClassId, session });
          }}
        />
      )}

      {/* Paper Mode Camera Scanner View */}
      {scannerQuiz && (
        <PaperScannerModal
          isOpen={Boolean(scannerQuiz)}
          onClose={() => setScannerQuiz(null)}
          quiz={scannerQuiz.quiz}
          classId={scannerQuiz.classId}
        />
      )}

      {/* Paper Mode Post-Quiz Analytics Dashboard */}
      {analyticsData && (
        <PaperAnalyticsModal
          isOpen={Boolean(analyticsData)}
          onClose={() => setAnalyticsData(null)}
          quiz={analyticsData.quiz}
          classId={analyticsData.classId}
          session={analyticsData.session}
        />
      )}
    </div>
  );
};
