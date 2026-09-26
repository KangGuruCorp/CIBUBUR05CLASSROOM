import {
  Award,
  BookOpen,
  CheckSquare,
  Compass,
  FileQuestion,
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
    quizzes = [],
    quizSubmissions = {},
    missions = [],
    missionProgress = {},
    currentUser,
  } = useApp();

  if (!currentUser) return null;

  const safeAssignments = assignments || [];
  const safeSubmissions = submissions || {};
  const safeQuizzes = quizzes || [];
  const safeQuizSubmissions = quizSubmissions || {};
  const safeMissionProgress = missionProgress || {};

  // Student pending tasks count
  const pendingTasksCount =
    currentRole === 'student' && currentUser
      ? safeAssignments.filter((a) => {
          const sub = safeSubmissions[`${a.id}_${currentUser.uid}`];
          return !sub || sub.status === 'draft' || sub.status === 'revision_requested';
        }).length
      : 0;

  // Student pending quizzes count
  const pendingQuizzesCount =
    currentRole === 'student' && currentUser
      ? safeQuizzes.filter((q) => {
          if (q.status !== 'published') return false;
          const sub = safeQuizSubmissions[`${q.id}_${currentUser.uid}`];
          return !sub || sub.status === 'in_progress';
        }).length
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
      id: 'quiz',
      label: 'Quiz',
      icon: FileQuestion,
      badge: pendingQuizzesCount > 0 ? `${pendingQuizzesCount} Kuis` : undefined,
      badgeColor: 'bg-amber-500 text-white',
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
    },
    {
      id: 'quiz',
      label: 'Quiz',
      icon: FileQuestion,
    },
    {
      id: 'papan-ide',
      label: 'Ruang Kolaborasi',
      icon: LayoutGrid,
    },
    { id: 'misi', label: 'Misi & Poin', icon: Sparkles },
    { id: 'leaderboard', label: 'Papan Peringkat', icon: Trophy },
    { id: 'siswa', label: 'Data Siswa', icon: Users },
    { id: 'pengumuman', label: 'Pengumuman', icon: Megaphone },
    { id: 'laporan', label: 'Laporan & Ekspor', icon: FileSpreadsheet },
    { id: 'audit', label: 'Audit Log', icon: ShieldCheck },
  ];

  const adminNavItems = [
    { id: 'beranda', label: 'Admin Dashboard', icon: ShieldCheck },
  ];

  const items = currentRole === 'student' ? studentNavItems : currentRole === 'admin' ? adminNavItems : teacherNavItems;

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

          if (item.disabled) {
            return (
              <button
                key={item.id}
                type="button"
                disabled
                title={`${item.label} sedang dinonaktifkan`}
                className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-bold text-sm text-slate-400 bg-slate-50/70 border border-slate-200/60 opacity-60 cursor-not-allowed select-none text-left"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-slate-400" />
                  <span>{item.label}</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-200 text-slate-500">
                  {item.badge || 'Nonaktif'}
                </span>
              </button>
            );
          }

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
    </aside>
  );
};



