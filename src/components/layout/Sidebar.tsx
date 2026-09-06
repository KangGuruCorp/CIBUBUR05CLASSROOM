import React from 'react';
import {
  Award,
  BookOpen,
  CheckSquare,
  Compass,
  FileSpreadsheet,
  Flame,
  Home,
  LayoutGrid,
  Megaphone,
  ShieldCheck,
  Sparkles,
  Trophy,
  User,
  Users,
  Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface SidebarProps {
  onOpenProfile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = () => {
  const {
    currentRole,
    activeTab,
    setActiveTab,
    submissions = {},
    assignments = [],
    missions = [],
    missionProgress = {},
    currentUser,
  } = useApp();

  if (!currentUser) return null;

  const safeAssignments = assignments || [];
  const safeSubmissions = submissions || {};
  const safeMissionProgress = missionProgress || {};

  // Student pending tasks count
  const pendingTasksCount =
    currentRole === 'student' && currentUser
      ? safeAssignments.filter((a) => {
          const sub = safeSubmissions[`${a.id}_${currentUser.uid}`];
          return !sub || sub.status === 'draft' || sub.status === 'revision_requested';
        }).length
      : 0;

  // Teacher pending grading count
  const pendingGradingCount =
    currentRole === 'teacher'
      ? Object.values(safeSubmissions).filter(
          (s: any) => s && (s.status === 'submitted' || s.status === 'resubmitted')
        ).length
      : 0;

  // Student claimable missions
  const claimableMissionsCount =
    currentRole === 'student' && currentUser
      ? Object.values(safeMissionProgress).filter(
          (m: any) => m && m.userId === currentUser.uid && m.status === 'completed'
        ).length
      : 0;

  const studentNavItems = [
    { id: 'beranda', label: 'Beranda', icon: Home },
    {
      id: 'tugas',
      label: 'Tugas Kelas',
      icon: CheckSquare,
      badge: pendingTasksCount > 0 ? pendingTasksCount : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'papan-ide',
      label: 'Papan Ide',
      icon: LayoutGrid,
      badge: 'Baru',
      badgeColor: 'bg-indigo-600 text-white',
    },
    {
      id: 'misi',
      label: 'Misi & Tantangan',
      icon: Zap,
      hasRedDot: claimableMissionsCount > 0,
    },
    { id: 'leaderboard', label: 'Papan Peringkat', icon: Trophy },
    { id: 'profil', label: 'Profil & Lencana', icon: User },
  ];

  const teacherNavItems = [
    { id: 'beranda', label: 'Dashboard Utama', icon: Home },
    {
      id: 'tugas',
      label: 'Tugas Kelas',
      icon: CheckSquare,
      badge: pendingGradingCount > 0 ? `${pendingGradingCount} Perlu Dinilai` : undefined,
      badgeColor: 'bg-amber-500 text-white',
    },
    {
      id: 'papan-ide',
      label: 'Papan Ide',
      icon: LayoutGrid,
      badge: 'Kolaborasi',
      badgeColor: 'bg-indigo-600 text-white',
    },
    { id: 'misi', label: 'Misi & Poin', icon: Sparkles },
    { id: 'siswa', label: 'Data Siswa', icon: Users },
    { id: 'pengumuman', label: 'Pengumuman', icon: Megaphone },
    { id: 'laporan', label: 'Laporan & Ekspor', icon: FileSpreadsheet },
    { id: 'audit', label: 'Audit Log', icon: ShieldCheck },
  ];

  const items = currentRole === 'student' ? studentNavItems : teacherNavItems;

  return (
    <aside className="w-64 shrink-0 hidden lg:block border-r border-[#BFDBFE]/40 bg-white/95 min-h-[calc(100vh-4.5rem)] p-4">
      <div className="mb-4 px-3 py-2">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#364FFF]/80">
          {currentRole === 'teacher' ? 'Menu Guru / Pengajar' : 'Menu Belajar Siswa'}
        </span>
      </div>

      <nav className="space-y-1.5">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeTab === item.id || (item.id === 'tugas' && (activeTab === 'materi' || activeTab === 'tugas-kelas'));

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-bold text-sm transition-all text-left cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-[#364FFF] via-[#6339FF] to-[#8B20FF] text-white shadow-lg shadow-indigo-600/25 scale-[1.02]'
                  : 'text-slate-600 hover:bg-[#EEF4FF] hover:text-[#364FFF]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>

              {item.hasRedDot ? (
                <span className="relative flex h-2.5 w-2.5" title="Ada misi yang siap diklaim">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFD83D] opacity-75"></span>
                  <span
                    className={`relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FFD83D] ${
                      isActive ? 'ring-2 ring-white/80' : 'ring-2 ring-amber-300'
                    }`}
                  ></span>
                </span>
              ) : item.badge ? (
                <span
                  className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold shadow-xs ${
                    isActive ? 'bg-white/20 text-white' : item.badgeColor
                  }`}
                >
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* Gamification tip card */}
      {currentRole === 'student' && (
        <div className="mt-6 p-4 rounded-3xl bg-gradient-to-br from-[#101936] to-[#1C1242] border border-[#A66CFF]/30 text-white text-xs shadow-md">
          <div className="flex items-center gap-2 text-[#FFD83D] font-extrabold mb-1.5">
            <Flame className="w-4 h-4 fill-[#FFD83D]" />
            <span className="text-[12px]">Tips Raih Poin Maksimal</span>
          </div>
          <p className="text-slate-300 leading-relaxed text-[11px]">
            Kumpulkan tugas sebelum jam 18:00 dan selesaikan tantangan untuk raih bonus poin & badge keren!
          </p>
        </div>
      )}
    </aside>
  );
};
