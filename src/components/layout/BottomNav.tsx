import React, { useState } from 'react';
import {
  BookOpen,
  CheckSquare,
  FileQuestion,
  FileSpreadsheet,
  Home,
  LayoutGrid,
  Megaphone,
  MoreHorizontal,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  User,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const BottomNav: React.FC = () => {
  const {
    currentRole,
    activeTab,
    setActiveTab,
    submissions = {},
    assignments = [],
    quizzes = [],
    quizSubmissions = {},
    missionProgress = {},
    currentUser,
  } = useApp();

  const [showMoreMenu, setShowMoreMenu] = useState(false);

  if (!currentUser) return null;

  const safeAssignments = assignments || [];
  const safeSubmissions = submissions || {};
  const safeQuizzes = quizzes || [];
  const safeQuizSubmissions = quizSubmissions || {};
  const safeMissionProgress = missionProgress || {};

  const pendingTasksCount =
    currentRole === 'student' && currentUser
      ? safeAssignments.filter((a) => {
          const sub = safeSubmissions[`${a.id}_${currentUser.uid}`];
          return !sub || sub.status === 'draft' || sub.status === 'revision_requested';
        }).length
      : 0;

  const pendingQuizzesCount =
    currentRole === 'student' && currentUser
      ? safeQuizzes.filter((q) => {
          if (q.status !== 'published') return false;
          const sub = safeQuizSubmissions[`${q.id}_${currentUser.uid}`];
          return !sub || sub.status === 'in_progress';
        }).length
      : 0;

  const claimableMissionsCount =
    currentRole === 'student' && currentUser
      ? Object.values(safeMissionProgress).filter(
          (m: any) => m && m.userId === currentUser.uid && m.status === 'completed'
        ).length
      : 0;

  const pendingGradingCount =
    currentRole === 'teacher'
      ? Object.values(safeSubmissions).filter(
          (s: any) => s && (s.status === 'submitted' || s.status === 'resubmitted')
        ).length
      : 0;

  const pendingQuizGradingCount =
    currentRole === 'teacher'
      ? Object.values(safeQuizSubmissions).filter(
          (s: any) => s && s.status === 'submitted'
        ).length
      : 0;

  // Student Mobile Tabs (Misi papan target di tengah dengan gaya seragam)
  const studentTabs = [
    { id: 'beranda', label: 'Beranda', icon: Home },
    {
      id: 'tugas',
      label: 'Tugas',
      icon: CheckSquare,
      badge: pendingTasksCount > 0 ? pendingTasksCount : undefined,
    },
    {
      id: 'misi',
      label: 'Misi',
      icon: Target,
      hasRedDot: claimableMissionsCount > 0,
    },
    {
      id: 'quiz',
      label: 'Quiz',
      icon: FileQuestion,
      badge: pendingQuizzesCount > 0 ? pendingQuizzesCount : undefined,
    },
  ];

  const studentExtraItems = [
    { id: 'leaderboard', label: 'Papan Peringkat', icon: Trophy },
    { id: 'profil', label: 'Profil & Lencana', icon: User },
  ];

  // Teacher Mobile Tabs (Misi papan target di tengah dengan gaya seragam)
  const teacherTabs = [
    { id: 'beranda', label: 'Dashboard', icon: Home },
    {
      id: 'tugas',
      label: 'Tugas',
      icon: CheckSquare,
      badge: pendingGradingCount > 0 ? pendingGradingCount : undefined,
    },
    {
      id: 'misi',
      label: 'Misi',
      icon: Target,
    },
    {
      id: 'quiz',
      label: 'Quiz',
      icon: FileQuestion,
      badge: pendingQuizGradingCount > 0 ? pendingQuizGradingCount : undefined,
    },
  ];

  const teacherExtraItems = [
    { id: 'siswa', label: 'Data Siswa', icon: Users },
    { id: 'papan-ide', label: 'Ruang Kolaborasi', icon: LayoutGrid },
    { id: 'leaderboard', label: 'Papan Peringkat', icon: Trophy },
    { id: 'pengumuman', label: 'Pengumuman', icon: Megaphone },
    { id: 'laporan', label: 'Laporan & Ekspor', icon: FileSpreadsheet },
    { id: 'audit', label: 'Audit Log', icon: ShieldCheck },
  ];

  const tabs = currentRole === 'student' ? studentTabs : teacherTabs;
  const extraItems = currentRole === 'student' ? studentExtraItems : teacherExtraItems;
  const isExtraActive = extraItems.some((item) => item.id === activeTab);

  return (
    <>
      {/* Extra Menu Sheet (Student & Teacher) */}
      {showMoreMenu && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-45 bg-[#101936]/50 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={() => setShowMoreMenu(false)}
          />
          <div className="lg:hidden fixed bottom-16 left-3 right-3 z-50 bg-white rounded-3xl shadow-2xl border border-[#BFDBFE]/50 p-4 animate-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-[#101936]">
                {currentRole === 'teacher' ? 'Menu Pengajar Lainnya' : 'Menu Belajar Lainnya'}
              </span>
              <button
                type="button"
                onClick={() => setShowMoreMenu(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {extraItems.map((item: any) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                if (item.disabled) {
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled
                      title={`${item.label} sedang dinonaktifkan`}
                      className="flex items-center justify-between p-3 rounded-2xl text-left font-bold text-xs bg-slate-50 text-slate-400 border border-slate-200/60 opacity-60 cursor-not-allowed select-none"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className="w-4 h-4 shrink-0 text-slate-400" />
                        <span className="truncate">{item.label}</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold bg-slate-200 text-slate-500 shrink-0">
                        {item.badge || 'Nonaktif'}
                      </span>
                    </button>
                  );
                }

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setShowMoreMenu(false);
                    }}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl text-left font-bold text-xs transition-all cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-[#364FFF] via-[#6339FF] to-[#8B20FF] text-white shadow-md shadow-indigo-600/25'
                        : 'bg-slate-50 hover:bg-[#EEF4FF] text-slate-700 border border-slate-100 hover:text-[#364FFF]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#364FFF]'}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Main Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#BFDBFE]/40 px-2 py-1.5 shadow-lg">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {tabs.map((tab: any) => {
            const Icon = tab.icon;
            const isActive =
              activeTab === tab.id || (tab.id === 'tugas' && (activeTab === 'materi' || activeTab === 'tugas-kelas'));

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-w-[50px] min-h-[44px] cursor-pointer ${
                  isActive ? 'text-[#364FFF] font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'scale-110 transition-transform text-[#364FFF]' : ''}`} />
                  {tab.hasRedDot ? (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFD83D] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FFD83D] ring-2 ring-white"></span>
                    </span>
                  ) : tab.badge ? (
                    <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                      {tab.badge}
                    </span>
                  ) : null}
                </div>
                <span className="text-[11px] mt-0.5 whitespace-nowrap tracking-tight">{tab.label}</span>
                {isActive && <span className="w-1 h-1 rounded-full bg-gradient-to-r from-[#364FFF] to-[#8B20FF] mt-0.5" />}
              </button>
            );
          })}

          {/* Lainnya Button */}
          <button
            type="button"
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-w-[50px] min-h-[44px] cursor-pointer ${
              isExtraActive || showMoreMenu ? 'text-[#364FFF] font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <MoreHorizontal className={`w-5 h-5 ${isExtraActive ? 'scale-110 transition-transform text-[#364FFF]' : ''}`} />
            <span className="text-[11px] mt-0.5 whitespace-nowrap tracking-tight">Lainnya</span>
            {isExtraActive && <span className="w-1 h-1 rounded-full bg-gradient-to-r from-[#364FFF] to-[#8B20FF] mt-0.5" />}
          </button>
        </div>
      </nav>
    </>
  );
};
