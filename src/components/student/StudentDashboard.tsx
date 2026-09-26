import React from 'react';
import {
  AlertCircle,
  ArrowRight,
  Award,
  BookMarked,
  BookOpen,
  Calendar,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileQuestion,
  GraduationCap,
  Megaphone,
  Sparkles,
  Star,
  Target,
  Trophy,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDateIndo, formatShortDate, getLevelInfo } from '../../utils/gamification';
import { PointIcon } from '../common/PointIcon';

interface StudentDashboardProps {
  onOpenAssignment: (id: string) => void;
  onOpenMaterial?: (id: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  onOpenAssignment,
  onOpenMaterial,
}) => {
  const {
    currentUser,
    users = [],
    userStats,
    levels,
    assignments,
    submissions,
    materials,
    materialProgress,
    missions,
    missionProgress,
    announcements,
    pointLedger,
    quizzes = [],
    quizSubmissions = {},
    setActiveTab,
    claimMissionReward,
  } = useApp();

  if (!currentUser) return null;

  const stats = userStats[currentUser.uid] || {
    totalPoints: 0,
    totalXp: 0,
    academicPoints: 0,
    participationPoints: 0,
    level: 1,
    completedAssignments: 0,
    completedMissions: 0,
  };

  const studentXp = stats.totalXp !== undefined ? stats.totalXp : (stats.totalPoints || 0);
  const levelInfo = getLevelInfo(studentXp, levels);

  // Student's active & visible assignments
  const studentAssignments = assignments
    .filter((asg) => {
      if (asg.status === 'draft') return false;
      if (asg.openAt) {
        const openTime = new Date(asg.openAt).getTime();
        if (!isNaN(openTime) && openTime > Date.now()) return false;
      }
      const userClassIds = currentUser.classIds || [data.currentClassId || 'cls_6a'];
      const inClass =
        (asg.classIds || []).some((cid) => userClassIds.includes(cid)) ||
        (!asg.classIds || asg.classIds.length === 0);
      if (!inClass) return false;
      if (asg.assignedUserIds && asg.assignedUserIds.length > 0 && !asg.assignedUserIds.includes(currentUser.uid)) return false;
      return true;
    })
    .sort((a, b) => new Date(a.dueAt || 0).getTime() - new Date(b.dueAt || 0).getTime());

  // Find urgent pending assignments (incomplete)
  const pendingAssignments = studentAssignments.filter((asg) => {
    const sub = submissions[`${asg.id}_${currentUser.uid}`];
    return !sub || sub.status === 'draft' || sub.status === 'revision_requested';
  });

  const mostUrgentAssignment = pendingAssignments[0];

  // Active missions
  const activeMissions = missions.filter((m) => m.status === 'active').slice(0, 2);

  // Recent point entries for this student
  const recentPoints = pointLedger
    .filter((l) => l.userId === currentUser.uid)
    .slice(0, 3);

  // Latest announcements
  const latestAnnouncement = announcements[0];

  // Published & Opened Quizzes
  const publishedQuizzes = quizzes
    .filter((q) => {
      if (q.status === 'draft') return false;
      if (q.openAt && new Date(q.openAt).getTime() > Date.now()) return false;
      if (q.status === 'scheduled' && (!q.openAt || new Date(q.openAt).getTime() > Date.now())) return false;
      if (q.status !== 'published' && q.status !== 'scheduled') return false;
      if (q.classIds && q.classIds.length > 0 && !q.classIds.some((cid) => (currentUser.classIds || []).includes(cid))) return false;
      if (q.assignedUserIds && q.assignedUserIds.length > 0 && !q.assignedUserIds.includes(currentUser.uid)) return false;
      return true;
    })
    .slice(0, 4);

  // Published & Opened Materials
  const studentMaterials = materials
    .filter((mat) => {
      if (mat.status === 'draft') return false;
      if (mat.publishAt && new Date(mat.publishAt).getTime() > Date.now()) return false;
      if (mat.status === 'scheduled' && (!mat.publishAt || new Date(mat.publishAt).getTime() > Date.now())) return false;
      if (mat.classIds && mat.classIds.length > 0 && !mat.classIds.some((cid) => (currentUser.classIds || []).includes(cid))) return false;
      return true;
    })
    .sort((a, b) => new Date(b.publishAt || b.createdAt).getTime() - new Date(a.publishAt || a.createdAt).getTime())
    .slice(0, 3);

  // Calculate Leaderboard Rank & Top 3
  const classStudents = (users || []).filter(
    (u) => u.role === 'student' && (u.classIds || []).some((cid) => (currentUser.classIds || []).includes(cid))
  );
  const sortedLeaderboard = [...classStudents].sort((a, b) => {
    const ptsA = userStats[a.uid]?.totalPoints || 0;
    const ptsB = userStats[b.uid]?.totalPoints || 0;
    return ptsB - ptsA;
  });
  const studentRank = sortedLeaderboard.findIndex((s) => s.uid === currentUser.uid) + 1;
  const topThreeStudents = sortedLeaderboard.slice(0, 3);

  // Stats Counters
  const completedAssignmentsCount = studentAssignments.filter((asg) => {
    const sub = submissions[`${asg.id}_${currentUser.uid}`];
    return sub && (sub.status === 'submitted' || sub.status === 'graded' || sub.status === 'resubmitted');
  }).length;

  const completedQuizzesCount = publishedQuizzes.filter((q) => {
    const sub = quizSubmissions[`${q.id}_${currentUser.uid}`];
    return sub && (sub.status === 'graded' || sub.status === 'submitted');
  }).length;

  const completedMaterialsCount = studentMaterials.filter((m) => {
    return materialProgress[`${m.id}_${currentUser.uid}`]?.status === 'completed';
  }).length;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Welcome & Gamification Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#101936] via-[#171246] to-[#364FFF] text-white p-6 sm:p-8 shadow-2xl shadow-indigo-950/25 border border-white/10">
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-[#8B20FF]/30 blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-16 w-80 h-80 rounded-full bg-[#364FFF]/25 blur-3xl pointer-events-none" />
        <div className="absolute left-10 top-1/2 w-40 h-40 rounded-full bg-[#A66CFF]/15 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-center gap-6 sm:gap-8">
          {/* Hero Avatar */}
          <div className="relative shrink-0">
            <div className="w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-3xl bg-white/15 backdrop-blur-md p-1.5 border-2 border-white/40 shadow-2xl ring-4 ring-white/10">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.displayName}
                className="w-full h-full rounded-[22px] object-cover"
              />
            </div>
            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-xs font-black px-3 py-1 rounded-full shadow-lg border-2 border-white flex items-center gap-1 whitespace-nowrap">
              <Star className="w-3 h-3 fill-current text-slate-950" />
              <span>Lvl {levelInfo.currentLevel.level}</span>
            </div>
          </div>

          {/* Profile Details & Gamification Metrics */}
          <div className="flex-1 w-full min-w-0 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-medium text-amber-300/90 mb-1">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Selamat Belajar & Raih Poin Tertinggi!</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight font-display text-white truncate">
              {currentUser.displayName}
            </h1>

            <div className="mt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-indigo-200">
              <span>Gelar:</span>
              <span className="font-bold text-amber-300 bg-white/10 px-2.5 py-0.5 rounded-lg border border-white/10">
                {levelInfo.currentLevel.name}
              </span>
            </div>

            {/* Points & Progress Bar */}
            <div className="mt-4 p-3.5 sm:p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Leaderboard Points */}
                <div className="flex items-center gap-2">
                  <PointIcon className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs text-indigo-200 font-semibold">Poin Leaderboard:</span>
                  <span className="text-lg sm:text-xl font-black text-amber-300 font-display">
                    {stats.totalPoints || 0}
                  </span>
                  <span className="text-xs text-indigo-200">Poin</span>
                </div>

                {/* Level & XP Progress Text */}
                <div className="text-xs text-indigo-200 font-medium flex items-center gap-1.5">
                  <span className="font-bold text-amber-300">{studentXp} XP</span>
                  <span>•</span>
                  <span>
                    {levelInfo.xpToNext > 0
                      ? `${levelInfo.xpToNext} XP lagi ke Lvl ${levelInfo.nextLevel?.level}`
                      : 'Level Maksimal! 🎉'}
                  </span>
                </div>
              </div>

              {/* Progress bar (XP Leveling) */}
              <div className="w-full bg-black/30 rounded-full h-2.5 overflow-hidden border border-white/10 mt-2.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-purple-400 to-amber-400 shadow-xs transition-all duration-700 ease-out"
                  style={{ width: `${levelInfo.progressPercent}%` }}
                />
              </div>

              {/* Min & Max XP indicators */}
              <div className="flex items-center justify-between text-[10px] text-indigo-200/80 font-medium mt-1.5">
                <span>Lvl {levelInfo.currentLevel.level} ({levelInfo.currentLevel.minXp !== undefined ? levelInfo.currentLevel.minXp : levelInfo.currentLevel.minPoints} XP)</span>
                <span className="font-bold text-amber-300">{levelInfo.progressPercent}%</span>
                <span>
                  {levelInfo.nextLevel
                    ? `Lvl ${levelInfo.nextLevel.level} (${levelInfo.nextLevel.minXp !== undefined ? levelInfo.nextLevel.minXp : levelInfo.nextLevel.minPoints} XP)`
                    : 'Maks'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Quick Overview Stats Grid (4 Balanced Metric Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Stat 1: Tugas Kelas */}
        <div
          onClick={() => setActiveTab('tugas')}
          className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer flex items-center gap-3.5 group"
        >
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100 group-hover:scale-105 transition-transform">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-400 block truncate">Tugas Kelas</span>
            <div className="text-base sm:text-lg font-black text-slate-900 leading-tight">
              {completedAssignmentsCount} <span className="text-xs font-semibold text-slate-400">/ {studentAssignments.length}</span>
            </div>
            <span className="text-[10px] text-indigo-600 font-semibold">
              {studentAssignments.length - completedAssignmentsCount > 0
                ? `${studentAssignments.length - completedAssignmentsCount} belum selesai`
                : 'Semua tuntas ✨'}
            </span>
          </div>
        </div>

        {/* Stat 2: Kuis Interaktif */}
        <div
          onClick={() => setActiveTab('quiz')}
          className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-purple-300 hover:shadow-xs transition-all cursor-pointer flex items-center gap-3.5 group"
        >
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100 group-hover:scale-105 transition-transform">
            <FileQuestion className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-400 block truncate">Kuis & Latihan</span>
            <div className="text-base sm:text-lg font-black text-slate-900 leading-tight">
              {completedQuizzesCount} <span className="text-xs font-semibold text-slate-400">/ {publishedQuizzes.length}</span>
            </div>
            <span className="text-[10px] text-purple-600 font-semibold">
              {publishedQuizzes.length > 0 ? `${publishedQuizzes.length} kuis aktif` : 'Belum ada kuis'}
            </span>
          </div>
        </div>

        {/* Stat 3: Materi Pelajaran */}
        <div
          onClick={() => setActiveTab('materi')}
          className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer flex items-center gap-3.5 group"
        >
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 group-hover:scale-105 transition-transform">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-400 block truncate">Materi Pelajaran</span>
            <div className="text-base sm:text-lg font-black text-slate-900 leading-tight">
              {completedMaterialsCount} <span className="text-xs font-semibold text-slate-400">/ {studentMaterials.length}</span>
            </div>
            <span className="text-[10px] text-blue-600 font-semibold">Telah dipelajari</span>
          </div>
        </div>

        {/* Stat 4: Peringkat Kelas */}
        <div
          onClick={() => setActiveTab('peringkat')}
          className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-amber-300 hover:shadow-xs transition-all cursor-pointer flex items-center gap-3.5 group"
        >
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100 group-hover:scale-105 transition-transform">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-400 block truncate">Peringkat Kelas</span>
            <div className="text-base sm:text-lg font-black text-amber-900 leading-tight">
              #{studentRank > 0 ? studentRank : 1} <span className="text-xs font-semibold text-slate-400">/ {classStudents.length || 1}</span>
            </div>
            <span className="text-[10px] text-amber-700 font-semibold">{stats.totalPoints || 0} Poin diraih</span>
          </div>
        </div>
      </div>

      {/* 3. Priority Banner: Tugas Mendesak */}
      {mostUrgentAssignment ? (
        <div className="rounded-3xl border border-[#BFDBFE]/60 bg-white p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-[#EEF4FF] text-[#364FFF] flex items-center justify-center shrink-0 border border-[#BFDBFE]/50 shadow-2xs">
              <CalendarClock className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className="text-[11px] font-bold text-[#364FFF] bg-[#EEF4FF] px-2.5 py-0.5 rounded-full border border-[#A66CFF]/30">
                  Tugas Prioritas
                </span>
                <span className="text-xs text-slate-500 font-semibold truncate">
                  {mostUrgentAssignment.subject}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-[#101936] truncate">
                {mostUrgentAssignment.title}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1 text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tenggat: {formatDateIndo(mostUrgentAssignment.dueAt)}</span>
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-amber-800 font-bold flex items-center gap-1">
                  <PointIcon className="w-3.5 h-3.5" />
                  <span>+{mostUrgentAssignment.rewardPoints} Pts</span>
                </span>
                <span className="text-purple-700 font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>+{mostUrgentAssignment.rewardXp ?? mostUrgentAssignment.rewardPoints} XP</span>
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenAssignment(mostUrgentAssignment.id)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#364FFF] via-[#6339FF] to-[#8B20FF] hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 active:scale-95 shrink-0 cursor-pointer"
          >
            <span>Kerjakan Sekarang</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="rounded-3xl bg-white border border-[#BFDBFE]/60 p-4.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-[#101936]">Semua Tugas Prioritas Selesai</h4>
              <p className="text-xs text-slate-500">Hebat! Tidak ada tugas mendesak saat ini.</p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('tugas')}
            className="text-xs font-bold text-[#364FFF] hover:text-[#8B20FF] flex items-center gap-1 cursor-pointer"
          >
            <span>Lihat Semua Tugas</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4. Main Balanced Grid (2 Columns: 2/3 Content Left, 1/3 Content Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column (Primary Activities): Kuis, Tugas Kelas, & Materi */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section A: Kuis & Latihan Interaktif */}
          <div className="bg-white rounded-3xl border border-[#BFDBFE]/50 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#EEF4FF] text-[#364FFF] flex items-center justify-center border border-[#BFDBFE]/40 shadow-2xs">
                  <FileQuestion className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#101936] font-display">
                    Kuis & Latihan Interaktif
                  </h3>
                  <p className="text-xs text-slate-500">
                    Uji pemahamanmu dengan berbagai jenis soal interaktif & raih XP!
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('quiz')}
                className="text-xs font-bold text-[#364FFF] hover:text-[#8B20FF] flex items-center gap-0.5 cursor-pointer"
              >
                <span>Lihat Semua</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {publishedQuizzes.length === 0 ? (
              <div className="text-center py-7 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                <FileQuestion className="w-9 h-9 text-slate-300 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-slate-600">Belum ada kuis yang aktif saat ini</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Kuis baru yang dirilis oleh gurumu akan muncul di sini</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {publishedQuizzes.map((quiz) => {
                  const sub = quizSubmissions[`${quiz.id}_${currentUser.uid}`];
                  const isGraded = sub && sub.status === 'graded';
                  const isSubmitted = sub && sub.status === 'submitted';
                  const isInProgress = sub && sub.status === 'in_progress';

                  return (
                    <div
                      key={quiz.id}
                      onClick={() => setActiveTab('quiz')}
                      className="group border border-slate-200/80 rounded-2xl p-4 hover:border-[#364FFF]/50 hover:shadow-md transition-all cursor-pointer bg-white flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {quiz.subject}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{quiz.durationMinutes > 0 ? `${quiz.durationMinutes} mnt` : 'Bebas'}</span>
                          </span>
                        </div>

                        <h4 className="text-xs sm:text-sm font-bold text-[#101936] group-hover:text-[#364FFF] transition-colors line-clamp-2">
                          {quiz.title}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                          {quiz.topic || 'Topik Umum'} • {quiz.questions.length} Butir Soal
                        </p>
                      </div>

                      <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold">
                          <span className="text-amber-800 flex items-center gap-0.5">
                            <PointIcon className="w-3 h-3" />
                            <span>+{quiz.rewardPoints} Pts</span>
                          </span>
                          <span className="text-purple-700 flex items-center gap-0.5">
                            <Sparkles className="w-3 h-3 text-purple-600" />
                            <span>+{quiz.rewardXp ?? quiz.rewardPoints} XP</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isGraded ? (
                            <span className="text-[11px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Skor: {sub.percentageScore}%</span>
                            </span>
                          ) : isSubmitted ? (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                              Menunggu Nilai
                            </span>
                          ) : isInProgress ? (
                            <span className="text-[11px] font-bold text-[#364FFF] group-hover:underline flex items-center gap-0.5">
                              <span>Lanjutkan</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-[#364FFF] group-hover:underline flex items-center gap-0.5">
                              <span>Mulai Kuis</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section B: Tugas & Aktivitas Kelas */}
          <div className="bg-white rounded-3xl border border-[#BFDBFE]/50 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-2xs">
                  <CalendarClock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#101936] font-display">
                    Tugas & Aktivitas Kelas
                  </h3>
                  <p className="text-xs text-slate-500">
                    Daftar tugas yang perlu diselesaikan untuk mengumpulkan poin & XP
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('tugas')}
                className="text-xs font-bold text-[#364FFF] hover:text-[#8B20FF] flex items-center gap-0.5 cursor-pointer"
              >
                <span>Lihat Semua</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {studentAssignments.length === 0 ? (
              <div className="text-center py-7 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                <CalendarClock className="w-9 h-9 text-slate-300 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-slate-600">Belum ada tugas yang diberikan</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Tugas baru dari gurumu akan otomatis muncul di sini</p>
              </div>
            ) : (
              <div className="space-y-3">
                {studentAssignments.slice(0, 3).map((asg) => {
                  const sub = submissions[`${asg.id}_${currentUser.uid}`];
                  const isGraded = sub && sub.status === 'graded';
                  const isSubmitted = sub && (sub.status === 'submitted' || sub.status === 'resubmitted');

                  return (
                    <div
                      key={asg.id}
                      onClick={() => onOpenAssignment(asg.id)}
                      className="p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer bg-[#F8FAFF] hover:bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700">
                            {asg.subject}
                          </span>
                          <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>Tenggat: {formatDateIndo(asg.dueAt)}</span>
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {asg.title}
                        </h4>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <div className="flex items-center gap-1.5 text-xs font-bold">
                          <span className="text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                            <PointIcon className="w-3 h-3" />
                            <span>+{asg.rewardPoints} Pts</span>
                          </span>
                          <span className="text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-purple-600" />
                            <span>+{asg.rewardXp ?? asg.rewardPoints} XP</span>
                          </span>
                        </div>

                        {isGraded ? (
                          <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Nilai: {sub.score}/{asg.maxScore}</span>
                          </span>
                        ) : isSubmitted ? (
                          <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200">
                            Terkirim
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors"
                          >
                            Kerjakan
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section C: Materi Pelajaran Terbaru */}
          <div className="bg-white rounded-3xl border border-[#BFDBFE]/50 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-2xs">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#101936] font-display">
                    Materi Pelajaran Terbaru
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pelajari modul & bacaan mandiri untuk menambah pengetahuan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('materi')}
                className="text-xs font-bold text-[#364FFF] hover:text-[#8B20FF] flex items-center gap-0.5 cursor-pointer"
              >
                <span>Lihat Semua</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {studentMaterials.length === 0 ? (
              <div className="text-center py-7 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                <BookOpen className="w-9 h-9 text-slate-300 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-slate-600">Belum ada materi pelajaran yang dirilis</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Modul pembelajaran baru akan ditampilkan di sini</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {studentMaterials.map((mat) => {
                  const isDone = materialProgress[`${mat.id}_${currentUser.uid}`]?.status === 'completed';

                  return (
                    <div
                      key={mat.id}
                      onClick={() => {
                        if (onOpenMaterial) onOpenMaterial(mat.id);
                        else setActiveTab('materi');
                      }}
                      className="group border border-slate-200/80 rounded-2xl p-3.5 hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer bg-white flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1.5 mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 truncate">
                            {mat.subject}
                          </span>
                          {isDone ? (
                            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5 shrink-0">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Selesai</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded shrink-0">
                              +{mat.rewardPoints || 20} Pts
                            </span>
                          )}
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                          {mat.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {mat.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-medium">
                          {formatShortDate(mat.publishAt || mat.createdAt)}
                        </span>
                        <span className="text-blue-600 font-bold group-hover:underline flex items-center gap-0.5">
                          <span>Baca</span>
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Sidebar): Pengumuman, Misi, Leaderboard & Aktivitas */}
        <div className="space-y-6">
          {/* 1. Pengumuman Kelas (Simpel & Elegan) */}
          <div className="bg-white rounded-3xl border border-[#BFDBFE]/50 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-2xs">
                  <Megaphone className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#101936] font-display">Pengumuman Kelas</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('pengumuman')}
                className="text-xs font-bold text-[#364FFF] hover:text-[#8B20FF] flex items-center gap-0.5 cursor-pointer"
              >
                <span>Lihat Semua</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {latestAnnouncement ? (
              <div
                onClick={() => setActiveTab('pengumuman')}
                className="group p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-white border border-indigo-100/90 hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-md">
                    Terbaru
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {formatShortDate(latestAnnouncement.createdAt)}
                  </span>
                </div>

                <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
                  {latestAnnouncement.title}
                </h4>

                <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">
                  {latestAnnouncement.content}
                </p>

                <div className="mt-3 pt-2.5 border-t border-indigo-100/80 flex items-center justify-between text-xs">
                  <span className="text-[11px] font-semibold text-slate-500 truncate max-w-[130px]">
                    {latestAnnouncement.authorName}
                  </span>
                  <span className="text-[11px] font-bold text-indigo-600 group-hover:underline flex items-center gap-0.5">
                    <span>Baca</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                <p className="text-xs text-slate-500">Belum ada pengumuman baru dari guru.</p>
              </div>
            )}
          </div>

          {/* 2. Misi Pembelajaran */}
          <div className="bg-white rounded-3xl border border-[#BFDBFE]/50 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#EEF4FF] text-[#364FFF] flex items-center justify-center border border-[#BFDBFE]/40">
                  <Target className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#101936] font-display">Misi Pembelajaran</h3>
                  <p className="text-[11px] text-slate-500">Selesaikan target untuk raih poin</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('misi')}
                className="text-xs font-bold text-[#364FFF] hover:text-[#8B20FF] flex items-center gap-0.5 cursor-pointer"
              >
                <span>Lihat Semua</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {activeMissions.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Belum ada misi aktif.</p>
              ) : (
                activeMissions.map((mis) => {
                  const pKey = mis.repeat === 'once' ? 'once' : 'w1';
                  const misKey = `${mis.id}_${currentUser.uid}_${pKey}`;
                  const prog = missionProgress[misKey] ||
                    missionProgress[`${mis.id}_${currentUser.uid}`] ||
                    missionProgress[`${mis.id}_${currentUser.uid}_w1`] ||
                    missionProgress[`${mis.id}_${currentUser.uid}_once`] ||
                    { progress: 0, status: 'in_progress' };
                  const isDone = prog.status === 'completed';
                  const isPending = prog.status === 'pending_verification';
                  const isClaimed = prog.status === 'claimed';
                  const progressPct = Math.min(100, Math.round(((prog.progress || 0) / mis.target) * 100));

                  return (
                    <div
                      key={mis.id}
                      className="p-3.5 rounded-2xl border border-slate-200/70 bg-[#F8FAFF] hover:bg-[#EEF4FF]/50 transition-all flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white border border-[#BFDBFE]/60 text-[#364FFF] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                          <Target className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <h4 className="text-xs font-bold text-[#101936] truncate">{mis.title}</h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFD83D]/20 text-[#101936] border border-[#FFD83D]/40 shrink-0 flex items-center gap-0.5">
                              <PointIcon className="w-2.5 h-2.5" />
                              <span>+{mis.rewardPoints} Pts</span>
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-1">{mis.description}</p>

                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#364FFF] to-[#8B20FF] transition-all duration-500"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-slate-600 shrink-0">
                              {prog.progress || 0}/{mis.target}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end pt-1 border-t border-slate-100">
                        {isClaimed ? (
                          <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{mis.rewardMode === 'manual_verification' ? 'Dinilai Guru' : 'Selesai'}</span>
                          </span>
                        ) : mis.rewardMode === 'manual_verification' ? (
                          isDone || isPending ? (
                            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                              <span>Menunggu Penilaian Guru</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setActiveTab(mis.type === 'material' ? 'materi' : 'misi')}
                              className="px-3 py-1 rounded-xl border border-[#BFDBFE]/80 bg-white hover:bg-[#EEF4FF] text-[#364FFF] text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              Buka Misi
                            </button>
                          )
                        ) : isDone ? (
                          <button
                            type="button"
                            onClick={() => claimMissionReward(mis.id)}
                            className="w-full py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-[#FFD83D]" />
                            <span>Klaim Hadiah</span>
                          </button>
                        ) : isPending ? (
                          <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                            <span>Menunggu Verifikasi</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActiveTab(mis.type === 'material' ? 'materi' : 'misi')}
                            className="px-3 py-1 rounded-xl border border-[#BFDBFE]/80 bg-white hover:bg-[#EEF4FF] text-[#364FFF] text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            Buka Misi
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 3. Top 3 Klasemen Kelas (Leaderboard Snapshot) */}
          <div className="bg-white rounded-3xl border border-[#BFDBFE]/50 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shadow-2xs">
                  <Trophy className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#101936] font-display">Top Papan Peringkat</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('peringkat')}
                className="text-xs font-bold text-[#364FFF] hover:text-[#8B20FF] flex items-center gap-0.5 cursor-pointer"
              >
                <span>Lihat Semua</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {topThreeStudents.map((student, idx) => {
                const sStats = userStats[student.uid] || { totalPoints: 0, level: 1 };
                const isMe = student.uid === currentUser.uid;

                return (
                  <div
                    key={student.uid}
                    className={`p-2.5 rounded-2xl flex items-center justify-between gap-3 border transition-all ${
                      isMe
                        ? 'bg-amber-50/70 border-amber-300 shadow-2xs'
                        : 'bg-slate-50/70 border-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                          idx === 0
                            ? 'bg-amber-400 text-amber-950 shadow-2xs'
                            : idx === 1
                            ? 'bg-slate-300 text-slate-800'
                            : 'bg-amber-700/20 text-amber-900'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <img
                        src={student.avatarUrl}
                        alt={student.displayName}
                        className="w-7 h-7 rounded-xl object-cover border border-slate-200 shrink-0"
                      />
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {student.displayName} {isMe && <strong className="text-amber-700">(Kamu)</strong>}
                      </span>
                    </div>

                    <span className="text-xs font-black text-amber-800 bg-white px-2 py-0.5 rounded-lg border border-amber-200/80 shrink-0 flex items-center gap-1">
                      <PointIcon className="w-3 h-3" />
                      <span>{sStats.totalPoints}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Aktivitas Poin Terbaru */}
          <div className="bg-white rounded-3xl border border-[#BFDBFE]/50 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#EEF4FF] text-[#364FFF] flex items-center justify-center">
                  <PointIcon className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#101936] font-display">Aktivitas Poin</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('profil')}
                className="text-xs font-bold text-[#364FFF] hover:text-[#8B20FF] cursor-pointer"
              >
                Riwayat
              </button>
            </div>

            <div className="space-y-2">
              {recentPoints.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-3">Belum ada catatan poin.</p>
              ) : (
                recentPoints.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#F8FAFF] border border-slate-100"
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        item.amount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      <PointIcon className="w-3 h-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-[#101936] leading-snug line-clamp-1">
                          {item.reason}
                        </p>
                        <span className={`text-xs font-black shrink-0 ${item.amount > 0 ? 'text-amber-700' : 'text-rose-700'}`}>
                          {item.amount > 0 ? `+${item.amount}` : item.amount}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {formatDateIndo(item.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
