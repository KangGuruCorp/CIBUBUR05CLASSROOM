import confetti from 'canvas-confetti';
import { LevelConfig, PointLedger, UserStats } from '../types';

export const DEFAULT_LEVELS: LevelConfig[] = [
  {
    level: 1,
    minPoints: 0,
    maxPoints: 99,
    minXp: 0,
    maxXp: 99,
    name: 'Penjelajah',
    badgeIcon: 'Compass',
    color: 'from-amber-400 to-orange-500',
  },
  {
    level: 2,
    minPoints: 100,
    maxPoints: 249,
    minXp: 100,
    maxXp: 249,
    name: 'Pembelajar Aktif',
    badgeIcon: 'BookOpen',
    color: 'from-emerald-400 to-teal-600',
  },
  {
    level: 3,
    minPoints: 250,
    maxPoints: 449,
    minXp: 250,
    maxXp: 449,
    name: 'Pemecah Masalah',
    badgeIcon: 'Zap',
    color: 'from-sky-400 to-blue-600',
  },
  {
    level: 4,
    minPoints: 450,
    maxPoints: 699,
    minXp: 450,
    maxXp: 699,
    name: 'Bintang Kelas',
    badgeIcon: 'Star',
    color: 'from-indigo-500 to-purple-600',
  },
  {
    level: 5,
    minPoints: 700,
    maxPoints: 1500,
    minXp: 700,
    maxXp: 1500,
    name: 'Inspirator',
    badgeIcon: 'Crown',
    color: 'from-rose-500 to-amber-500',
  },
];

export function getLevelInfo(xpOrPoints: number, levels: LevelConfig[] = DEFAULT_LEVELS): {
  currentLevel: LevelConfig;
  nextLevel: LevelConfig | null;
  progressPercent: number;
  pointsToNext: number;
  xpToNext: number;
} {
  const currentVal = Math.max(0, xpOrPoints || 0);

  const getMin = (lvl: LevelConfig) => (lvl.minXp !== undefined ? lvl.minXp : lvl.minPoints);

  const currentLevel =
    [...levels]
      .reverse()
      .find((lvl) => currentVal >= getMin(lvl)) || levels[0];

  const nextLevel = levels.find((lvl) => lvl.level === currentLevel.level + 1) || null;

  if (!nextLevel) {
    return {
      currentLevel,
      nextLevel: null,
      progressPercent: 100,
      pointsToNext: 0,
      xpToNext: 0,
    };
  }

  const curMin = getMin(currentLevel);
  const nextMin = getMin(nextLevel);
  const range = nextMin - curMin;
  const currentInRange = currentVal - curMin;
  const progressPercent = range > 0 ? Math.min(100, Math.max(0, Math.round((currentInRange / range) * 100))) : 100;
  const toNext = Math.max(0, nextMin - currentVal);

  return {
    currentLevel,
    nextLevel,
    progressPercent,
    pointsToNext: toNext,
    xpToNext: toNext,
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

/**
 * Formats a date string into "Hari, Tanggal Bulan Tahun" in Indonesian.
 * E.g.: "Senin, 7 September 2026", "Selasa, 8 September 2026"
 */
export function formatDayAndDateIndo(dateStr: string | Date | undefined): string {
  if (!dateStr) return 'Tanggal Lainnya';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Tanggal Lainnya';

    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const dayName = dayNames[d.getDay()];
    const date = d.getDate();
    const monthName = monthNames[d.getMonth()];
    const year = d.getFullYear();

    const today = new Date();
    const isToday =
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();

    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();

    if (isToday) {
      return `Hari Ini • ${dayName}, ${date} ${monthName} ${year}`;
    }
    if (isYesterday) {
      return `Kemarin • ${dayName}, ${date} ${monthName} ${year}`;
    }

    return `${dayName}, ${date} ${monthName} ${year}`;
  } catch {
    return 'Tanggal Lainnya';
  }
}

/**
 * Returns a sortable date key 'YYYY-MM-DD' from a date string.
 */
export function getDateKey(dateStr: string | Date | undefined): string {
  if (!dateStr) return '9999-99-99';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '9999-99-99';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return '9999-99-99';
  }
}

/**
 * Computes the real-time effective status of a task/material/quiz.
 * If status is 'scheduled' but the scheduled open time has passed (<= Date.now()),
 * it automatically resolves to 'published' (Aktif).
 */
export function getEffectiveTaskStatus(
  status: 'draft' | 'scheduled' | 'published' | 'closed' | 'archived' | string | undefined,
  openAt?: string | Date
): 'draft' | 'scheduled' | 'published' | 'closed' | 'archived' | string {
  if (!status) return 'published';
  if (status === 'scheduled') {
    if (!openAt) return 'published';
    const openTime = new Date(openAt).getTime();
    if (!isNaN(openTime) && openTime <= Date.now()) {
      return 'published';
    }
    return 'scheduled';
  }
  return status;
}

