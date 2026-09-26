import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FileQuestion,
  Play,
  Search,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { Quiz } from '../../../types';
import { useApp } from '../../../context/AppContext';
import {
  STANDARD_SUBJECTS,
  matchSubjectToStandard,
} from '../../../utils/materialTemplates';
import { formatDayAndDateIndo, getDateKey } from '../../../utils/gamification';
import { QuizPlayerModal } from './QuizPlayerModal';

export const StudentQuizPage: React.FC = () => {
  const {
    quizzes = [],
    quizSubmissions = {},
    currentUser,
    currentClassId,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'unanswered' | 'completed'>('all');

  const [activeQuizForRunner, setActiveQuizForRunner] = useState<Quiz | null>(null);

  if (!currentUser) return null;

  // Filter published & opened quizzes for student's class
  const studentQuizzes = quizzes.filter((q) => {
    // Draft quizzes never shown to students
    if (q.status === 'draft') return false;

    // Check scheduled publish time: if openAt is in the future, don't show to students yet
    if (q.openAt && new Date(q.openAt).getTime() > Date.now()) {
      return false;
    }
    if (q.status === 'scheduled' && (!q.openAt || new Date(q.openAt).getTime() > Date.now())) {
      return false;
    }
    if (q.status !== 'published' && q.status !== 'scheduled') {
      return false;
    }

    if (q.classIds && q.classIds.length > 0) {
      if (!q.classIds.some((cid) => (currentUser.classIds || []).includes(cid))) {
        if (!q.classIds.includes(currentClassId)) return false;
      }
    }
    if (q.assignedUserIds && q.assignedUserIds.length > 0) {
      return q.assignedUserIds.includes(currentUser.uid);
    }
    return true;
  });

  const filteredQuizzes = studentQuizzes.filter((q) => {
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

    const sub = quizSubmissions[`${q.id}_${currentUser.uid}`];
    const isCompleted = sub && sub.status !== 'in_progress';

    if (selectedStatus === 'unanswered' && isCompleted) return false;
    if (selectedStatus === 'completed' && !isCompleted) return false;

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

  // Calculate student statistics
  const completedCount = studentQuizzes.filter((q) => {
    const sub = quizSubmissions[`${q.id}_${currentUser.uid}`];
    return sub && sub.status !== 'in_progress';
  }).length;

  const totalEarnedQuizXp = Object.values(quizSubmissions)
    .filter((s) => s.userId === currentUser.uid && s.status === 'graded')
    .reduce((sum, s) => sum + (s.rewardPointsAwarded || 0), 0);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#101936] via-[#1C1242] to-[#364FFF] p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-xs border border-white/20 text-[#FFD83D] text-xs font-black tracking-wide uppercase mb-3 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 fill-[#FFD83D]" />
              Kuis & Tantangan Belajar
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Pusat Kuis Siswa
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-xl mt-1.5 leading-relaxed">
              Uji kemampuanmu, kumpulkan nilai terbaik, dan raih bonus poin XP untuk naik level!
            </p>
          </div>

          {/* Quick Stat Pill */}
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/20 shrink-0">
            <div className="text-center px-2">
              <span className="text-[10px] font-bold text-slate-300 uppercase block">Kuis Selesai</span>
              <span className="text-lg font-black text-white">
                {completedCount} / {studentQuizzes.length}
              </span>
            </div>
            <div className="text-center px-2 border-l border-white/20">
              <span className="text-[10px] font-bold text-[#FFD83D] uppercase block">Total XP Kuis</span>
              <span className="text-lg font-black text-[#FFD83D]">
                +{totalEarnedQuizXp} XP
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white p-4 rounded-3xl border border-[#BFDBFE]/50 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kuis, materi, atau mata pelajaran..."
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
            <option value="unanswered">⏳ Belum Dikerjakan</option>
            <option value="completed">✅ Sudah Selesai</option>
          </select>
        </div>
      </div>

      {/* Quizzes List Cards */}
      {filteredQuizzes.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-[#364FFF] flex items-center justify-center mx-auto shadow-xs">
            <FileQuestion className="w-8 h-8" />
          </div>
          <h3 className="text-base font-black text-slate-900">Belum Ada Kuis Tersedia</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Kuis yang diterbitkan oleh Bapak/Ibu Guru akan muncul di sini.
          </p>
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
                  const sub = quizSubmissions[`${quiz.id}_${currentUser.uid}`];
                  const isCompleted = sub && sub.status !== 'in_progress';
                  const isGraded = sub && sub.status === 'graded';
                  const isWaitingGrade = sub && sub.status === 'submitted';

                  return (
                    <div
                      key={quiz.id}
                      className="bg-white rounded-3xl border border-[#BFDBFE]/60 p-5 shadow-xs hover:shadow-lg hover:border-[#364FFF]/40 transition-all flex flex-col justify-between space-y-4 group"
                    >
                      <div>
                        {/* Top Subject & Status Badges */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="px-3 py-1 rounded-xl bg-blue-50 text-[#364FFF] font-extrabold text-[11px] border border-blue-100 truncate max-w-[170px]">
                            {quiz.subject}
                          </span>

                          {isGraded ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black tracking-wide flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Skor: {sub.percentageScore}%
                            </span>
                          ) : isWaitingGrade ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold">
                              Menunggu Guru
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-extrabold animate-pulse">
                              Belum Dikerjakan
                            </span>
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

                        {/* Specs Pill */}
                        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 font-semibold">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[#364FFF]" />
                            <span>{quiz.durationMinutes > 0 ? `${quiz.durationMinutes}m` : 'Bebas'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <FileQuestion className="w-3.5 h-3.5 text-purple-600" />
                            <span>{quiz.questions.length} Soal</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span className="font-bold text-amber-900">+{quiz.rewardPoints} Pts • +{quiz.rewardXp ?? quiz.rewardPoints} XP</span>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Action Button */}
                      <div className="pt-3 border-t border-slate-100">
                        {isCompleted ? (
                          <button
                            type="button"
                            onClick={() => setActiveQuizForRunner(quiz)}
                            className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Eye className="w-4 h-4 text-slate-600" />
                            <span>Lihat Pembahasan & Nilai</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActiveQuizForRunner(quiz)}
                            className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-[#364FFF] via-[#6339FF] to-[#8B20FF] text-white font-black text-xs shadow-lg shadow-indigo-600/25 hover:opacity-95 transition-all flex items-center justify-center gap-2 cursor-pointer transform hover:scale-[1.01]"
                          >
                            <Play className="w-4 h-4 fill-white" />
                            <span>Kerjakan Kuis Sekarang</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Interactive Quiz Player Modal */}
      {activeQuizForRunner && (
        <QuizPlayerModal
          isOpen={Boolean(activeQuizForRunner)}
          onClose={() => setActiveQuizForRunner(null)}
          quiz={activeQuizForRunner}
          existingSubmission={quizSubmissions[`${activeQuizForRunner.id}_${currentUser.uid}`]}
        />
      )}

    </div>
  );
};
