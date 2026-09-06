import confetti from 'canvas-confetti';
import { LevelConfig, PointLedger, UserStats } from '../types';

export const DEFAULT_LEVELS: LevelConfig[] = [
  {
    level: 1,
    minPoints: 0,
    maxPoints: 99,
    name: 'Penjelajah',
    badgeIcon: 'Compass',
    color: 'from-amber-400 to-orange-500',
  },
  {
    level: 2,
    minPoints: 100,
    maxPoints: 249,
    name: 'Pembelajar Aktif',
    badgeIcon: 'BookOpen',
    color: 'from-emerald-400 to-teal-600',
  },
  {
    level: 3,
    minPoints: 250,
    maxPoints: 449,
    name: 'Pemecah Masalah',
    badgeIcon: 'Zap',
    color: 'from-sky-400 to-blue-600',
  },
  {
    level: 4,
    minPoints: 450,
    maxPoints: 699,
    name: 'Bintang Kelas',
    badgeIcon: 'Star',
    color: 'from-indigo-500 to-purple-600',
  },
  {
    level: 5,
    minPoints: 700,
    maxPoints: 1500,
    name: 'Inspirator',
    badgeIcon: 'Crown',
    color: 'from-rose-500 to-amber-500',
  },
];

export function getLevelInfo(points: number, levels: LevelConfig[] = DEFAULT_LEVELS): {
  currentLevel: LevelConfig;
  nextLevel: LevelConfig | null;
  progressPercent: number;
  pointsToNext: number;
} {
  const currentLevel =
    [...levels]
      .reverse()
      .find((lvl) => points >= lvl.minPoints) || levels[0];

  const nextLevel = levels.find((lvl) => lvl.level === currentLevel.level + 1) || null;

  if (!nextLevel) {
    return {
      currentLevel,
      nextLevel: null,
      progressPercent: 100,
      pointsToNext: 0,
    };
  }

  const range = nextLevel.minPoints - currentLevel.minPoints;
  const currentInRange = points - currentLevel.minPoints;
  const progressPercent = Math.min(100, Math.max(0, Math.round((currentInRange / range) * 100)));
  const pointsToNext = Math.max(0, nextLevel.minPoints - points);

  return {
    currentLevel,
    nextLevel,
    progressPercent,
    pointsToNext,
  };
}

export function fireCelebrationConfetti(type: 'submission' | 'level_up' | 'badge') {
  try {
    if (type === 'level_up') {
      // Big double explosion
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#10b981', '#6366f1', '#ec4899', '#3b82f6'],
      });
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
        });
      }, 250);
    } else if (type === 'badge') {
      confetti({
        particleCount: 60,
        spread: 90,
        origin: { y: 0.65 },
        colors: ['#fbbf24', '#f59e0b', '#d97706'],
      });
    } else {
      // Submission
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.7 },
      });
    }
  } catch (err) {
    console.log('Confetti not available:', err);
  }
}

export function exportToCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [
      headers.join(','),
      ...rows.map((row) =>
        headers
          .map((header) => {
            let val = row[header];
            if (val === null || val === undefined) val = '';
            const strVal = String(val).replace(/"/g, '""');
            return `"${strVal}"`;
          })
          .join(',')
      ),
    ].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function formatDateIndo(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function formatShortDate(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return dateStr;
  }
}

export function isDeadlineNear(dueAtStr: string): { isUrgent: boolean; isPast: boolean; diffHours: number } {
  try {
    const now = new Date().getTime();
    const due = new Date(dueAtStr).getTime();
    const diffMs = due - now;
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    return {
      isPast: diffMs < 0,
      isUrgent: diffMs > 0 && diffHours <= 24,
      diffHours,
    };
  } catch {
    return { isUrgent: false, isPast: false, diffHours: 999 };
  }
}
