import React from 'react';
import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  GraduationCap,
  Megaphone,
  Sparkles,
  Star,
  Target,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDateIndo, formatShortDate, getLevelInfo, isDeadlineNear } from '../../utils/gamification';
import { getSubjectTheme, getSubjectTemplateImage } from '../../utils/materialTemplates';
import { LevelBadge } from '../common/LevelBadge';
import { PointIcon } from '../common/PointIcon';
import { StatusPill } from '../common/StatusPill';

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
    setActiveTab,
    claimMissionReward,
  } = useApp();

  if (!currentUser) return null;

  const stats = userStats[currentUser.uid] || {
    totalPoints: 0,
    academicPoints: 0,
    participationPoints: 0,
    level: 1,
    completedAssignments: 0,
    completedMissions: 0,
  };

  const levelInfo = getLevelInfo(stats.totalPoints, levels);

  // Find urgent pending assignments
  const pendingAssignments = assignments
    .filter((asg) => {
      const sub = submissions[`${asg.id}_${currentUser.uid}`];
      return !sub || sub.status === 'draft' || sub.status === 'revision_requested';
    })
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());

  const mostUrgentAssignment = pendingAssignments[0];

  // Active missions
  const activeMissions = missions.filter((m) => m.status === 'active').slice(0, 2);

  // Recent point entries for this student
  const recentPoints = pointLedger
    .filter((l) => l.userId === currentUser.uid)
    .slice(0, 3);

  // Latest announcements
  const latestAnnouncement = announcements[0];

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome & Gamification Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#101936] via-[#171246] to-[#364FFF] text-white p-6 sm:p-8 shadow-2xl shadow-indigo-950/25 border border-white/10">
        {/* Background ambient lighting and stars */}
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-[#8B20FF]/30 blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-16 w-80 h-80 rounded-full bg-[#364FFF]/25 blur-3xl pointer-events-none" />
        <div className="absolute left-10 top-1/2 w-40 h-40 rounded-full bg-[#A66CFF]/15 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-center gap-6 sm:gap-8">
          {/* Hero Avatar: Larger, crisp, with subtle glow and clean level pill */}
          <div className="relative shrink-0">
            <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-44 md:h-44 rounded-3xl bg-white/15 backdrop-blur-md p-1.5 border-2 border-white/40 shadow-2xl ring-4 ring-white/10">
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

          {/* Profile Details & Streamlined Gamification Metrics */}
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

            {/* Streamlined Points & Progress: Clean, compact, not oversized */}
            <div className="mt-4 p-3.5 sm:p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <PointIcon className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs text-indigo-200 font-semibold">Total Poin:</span>
                  <span className="text-lg sm:text-xl font-black text-amber-300 font-display">
                    {stats.totalPoints}
                  </span>
                  <span className="text-xs text-indigo-200">Poin</span>
                </div>

                <div className="text-xs text-indigo-200 font-medium">
                  {levelInfo.pointsToNext > 0
                    ? `${levelInfo.pointsToNext} Poin lagi ke Lvl ${levelInfo.nextLevel?.level}`
                    : 'Level Maksimal! 🎉'}
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-black/30 rounded-full h-2 overflow-hidden border border-white/10 mt-2.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-purple-400 to-amber-400 shadow-xs transition-all duration-700 ease-out"
                  style={{ width: `${levelInfo.progressPercent}%` }}
                />
              </div>

              {/* Min & Max point indicators */}
              <div className="flex items-center justify-between text-[10px] text-indigo-200/80 font-medium mt-1.5">
                <span>Lvl {levelInfo.currentLevel.level} ({levelInfo.currentLevel.minPoints} P)</span>
                <span className="font-bold text-amber-300">{levelInfo.progressPercent}%</span>
                <span>
                  {levelInfo.nextLevel
                    ? `Lvl ${levelInfo.nextLevel.level} (${levelInfo.nextLevel.minPoints} P)`
                    : 'MAX'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Priority Banner: Tugas Mendesak / Prioritas Hari Ini */}
      {mostUrgentAssignment ? (
        <div className="rounded-3xl border border-[#BFDBFE]/60 bg-white p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
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
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <PointIcon className="w-3.5 h-3.5" />
                  <span>+{mostUrgentAssignment.rewardPoints} Poin</span>
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
              <h4 className="text-xs sm:text-sm font-bold text-[#101936]">Semua Tugas Sudah Selesai</h4>
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

      {/* Main Grid: 2 Columns on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Active Missions & Materials Preview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Missions Card */}
          <div className="bg-white rounded-3xl border border-[#BFDBFE]/50 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#EEF4FF] text-[#364FFF] flex items-center justify-center border border-[#BFDBFE]/40">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#101936] font-display">Misi Pembelajaran</h3>
                  <p className="text-xs text-slate-500">Selesaikan target untuk mendapatkan poin</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('misi')}
                className="text-xs font-bold text-[#364FFF] hover:text-[#8B20FF] flex items-center gap-0.5 cursor-pointer"
              >
                <span>Lihat Semua</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {activeMissions.map((mis) => {
                const misKey = `${mis.id}_${currentUser.uid}_w1`;
                const prog = missionProgress[misKey] || { progress: 0, status: 'in_progress' };
                const isDone = prog.status === 'completed';
                const isClaimed = prog.status === 'claimed';
                const progressPct = Math.min(100, Math.round((prog.progress / mis.target) * 100));

                return (
                  <div
                    key={mis.id}
                    className="p-4 rounded-2xl border border-slate-200/70 bg-[#F8FAFF] hover:bg-[#EEF4FF]/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-white border border-[#BFDBFE]/60 text-[#364FFF] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                        <Target className="w-4.5 h-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-bold text-[#101936] truncate">{mis.title}</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFD83D]/20 text-[#101936] border border-[#FFD83D]/40 shrink-0 flex items-center gap-1">
                            <PointIcon className="w-3 h-3" />
                            <span>+{mis.rewardPoints} Poin</span>
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1">{mis.description}</p>

                        <div className="mt-2.5 flex items-center gap-2.5 max-w-xs">
                          <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#364FFF] to-[#8B20FF] transition-all duration-500"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-slate-600 shrink-0">
                            {prog.progress}/{mis.target}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center justify-end">
                      {isClaimed ? (
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Selesai</span>
                        </span>
                      ) : isDone ? (
                        <button
                          type="button"
                          onClick={() => claimMissionReward(mis.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-[#FFD83D]" />
                          <span>Klaim Hadiah</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveTab(mis.type === 'material' ? 'materi' : 'tugas')}
                          className="px-3.5 py-1.5 rounded-xl border border-[#BFDBFE]/80 bg-white hover:bg-[#EEF4FF] text-[#364FFF] text-xs font-bold transition-colors cursor-pointer"
                        >
                          Mulai
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Newest Tasks Section */}
          <div className="bg-white rounded-3xl border border-[#BFDBFE]/50 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#EEF4FF] text-[#364FFF] flex items-center justify-center border border-[#BFDBFE]/40">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#101936] font-display">Tugas Kelas Terbaru</h3>
                  <p className="text-xs text-slate-500">Kerjakan instruksi guru dan lampirkan hasil belajarmu</p>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {assignments.slice(0, 4).map((task) => {
                const sub = submissions[`${task.id}_${currentUser.uid}`];
                const isCompleted = sub && (sub.status === 'submitted' || sub.status === 'resubmitted' || sub.status === 'graded');
                const isGraded = sub && sub.status === 'graded';

                return (
                  <div
                    key={task.id}
                    onClick={() => onOpenAssignment(task.id)}
                    className="group border border-slate-200/80 rounded-2xl p-4 hover:border-[#364FFF]/50 hover:shadow-md transition-all cursor-pointer bg-white flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                          {task.subject}
                        </span>
                        {task.dueAt && (
                          <span className="text-[10px] text-slate-500 font-medium">
                            {formatShortDate(task.dueAt)}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold text-[#101936] group-hover:text-[#364FFF] transition-colors line-clamp-2">
                        {task.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {task.instructions || 'Kerjakan tugas sesuai petunjuk dari gurumu.'}
                      </p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[11px] font-bold text-amber-800 flex items-center gap-1">
                        <PointIcon className="w-3.5 h-3.5" />
                        <span>+{task.rewardPoints} XP</span>
                      </span>

                      <div className="flex items-center gap-1.5">
                        {isGraded ? (
                          <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Nilai: {sub.score}</span>
                          </span>
                        ) : isCompleted ? (
                          <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Terkirim</span>
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-slate-600 group-hover:text-[#364FFF] flex items-center gap-0.5">
                            <span>Kerjakan</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Announcements & Recent Points Ledger */}
        <div className="space-y-6">
          {/* Announcement Card */}
          {latestAnnouncement && (
            <div className="bg-gradient-to-br from-[#101936] via-[#1C1242] to-[#8B20FF] rounded-3xl p-6 text-white shadow-lg border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <Megaphone className="w-4 h-4 text-[#FFD83D]" />
                </div>
                <span className="text-xs font-black uppercase tracking-wider text-[#FFD83D]">
                  Pengumuman Kelas
                </span>
              </div>
              <h4 className="text-sm sm:text-base font-bold font-display leading-snug">
                {latestAnnouncement.title}
              </h4>
              <p className="text-xs text-indigo-100 mt-2 leading-relaxed">
                {latestAnnouncement.content}
              </p>
              <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-[11px] text-indigo-200">
                <span>{latestAnnouncement.authorName}</span>
                <span>{formatShortDate(latestAnnouncement.createdAt)}</span>
              </div>
            </div>
          )}

          {/* Recent Points Activity Widget */}
          <div className="bg-white rounded-3xl border border-[#BFDBFE]/50 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#EEF4FF] text-[#364FFF] flex items-center justify-center">
                  <PointIcon className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#101936] font-display">Aktivitas Poin Terbaru</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('profil')}
                className="text-xs font-bold text-[#364FFF] hover:text-[#8B20FF] cursor-pointer"
              >
                Riwayat
              </button>
            </div>

            <div className="space-y-3">
              {recentPoints.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Belum ada catatan poin.</p>
              ) : (
                recentPoints.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 rounded-2xl bg-[#F8FAFF] border border-slate-100"
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        item.amount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      <PointIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-[#101936] leading-snug">
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
