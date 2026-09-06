import React, { useState } from 'react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  CheckSquare,
  Clock,
  Filter,
  History,
  Key,
  Lock,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDateIndo } from '../../utils/gamification';
import { PointIcon } from '../common/PointIcon';

export const TeacherAuditLogs: React.FC = () => {
  const { auditLogs } = useApp();
  const [filterAction, setFilterAction] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const actionTypes = [
    { id: 'all', label: 'Semua Aktivitas' },
    { id: 'grade_submission', label: 'Penilaian Tugas' },
    { id: 'adjust_points', label: 'Penyesuaian Poin' },
    { id: 'claim_mission_reward', label: 'Klaim Misi' },
    { id: 'create_assignment', label: 'Pembuatan Tugas' },
    { id: 'create_material', label: 'Publikasi Materi' },
  ];

  const filteredLogs = auditLogs.filter((log) => {
    if (filterAction !== 'all' && log.action !== filterAction) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.actorName.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        (log.details && JSON.stringify(log.details).toLowerCase().includes(q))
      );
    }
    return true;
  });

  const getActionBadge = (log: any) => {
    switch (log.action) {
      case 'grade_submission':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center gap-1 border border-emerald-200">
            <Award className="w-3.5 h-3.5" />
            <span>Penilaian Tugas</span>
          </span>
        );
      case 'adjust_points': {
        const metadata = (log as any).metadata || (log as any).details || {};
        const isNegative = (metadata.amount || 0) < 0;
        return isNegative ? (
          <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-bold text-xs flex items-center gap-1 border border-rose-200">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Pengurangan Poin</span>
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 font-bold text-xs flex items-center gap-1 border border-purple-200">
            <PointIcon className="w-3.5 h-3.5" />
            <span>Poin Apresiasi</span>
          </span>
        );
      }
      case 'claim_mission_reward':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-bold text-xs flex items-center gap-1 border border-amber-200">
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Klaim Misi Siswa</span>
          </span>
        );
      case 'create_assignment':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center gap-1 border border-indigo-200">
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Tugas Baru</span>
          </span>
        );
      case 'create_material':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs flex items-center gap-1 border border-blue-200">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Materi Baru</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs">
            {log.action}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Keamanan & Transparansi Aktivitas</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
            Audit Log & Jejak Perubahan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Catatan log otomatis setiap aksi penilaian, penyesuaian poin, dan pembuatan modul pembelajaran
          </p>
        </div>

        <div className="w-full sm:w-72 relative">
          <Search className="w-4 h-4 text-slate-400 absolute inset-y-0 left-3 my-auto pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari aktor atau aksi..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Filter Action Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {actionTypes.map((act) => (
          <button
            key={act.id}
            type="button"
            onClick={() => setFilterAction(act.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              filterAction === act.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {act.label}
          </button>
        ))}
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs">
        <div className="divide-y divide-slate-100">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              Tidak ada riwayat audit log yang cocok.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="mt-0.5">{getActionBadge(log)}</div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-extrabold text-slate-900">
                        {log.actorName}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        ({log.actorRole})
                      </span>
                    </div>

                    {(() => {
                      const info = (log as any).metadata || (log as any).details;
                      if (!info) return null;
                      return (
                        <div className="text-xs text-slate-600 mt-1 leading-relaxed">
                          {info.studentName && (
                            <p>
                              Siswa: <strong>{info.studentName}</strong>
                            </p>
                          )}
                          {info.amount !== undefined && (
                            <p className="flex items-center gap-1">
                              <span>Perubahan Poin:</span>{' '}
                              <strong className={`inline-flex items-center gap-1 ${info.amount > 0 ? 'text-purple-700' : 'text-rose-600'}`}>
                                <PointIcon className="w-3 h-3" />
                                <span>{info.amount > 0 ? `+${info.amount}` : info.amount} Poin</span>
                              </strong>
                            </p>
                          )}
                          {info.reason && (
                            <p>
                              Keterangan: <strong>{info.reason}</strong>
                            </p>
                          )}
                          {info.score !== undefined && (
                            <p className="flex items-center gap-1">
                              <span>Nilai: <strong>{info.score}</strong> | Poin Reward:</span>
                              <strong className="inline-flex items-center gap-0.5 text-amber-700">
                                <PointIcon className="w-3 h-3" />
                                <span>+{info.pointsAwarded}</span>
                              </strong>
                            </p>
                          )}
                          {info.title && (
                            <p>
                              Judul: <strong>{info.title}</strong>
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="text-right shrink-0 text-[11px] text-slate-400 flex items-center gap-1.5 sm:self-center">
                  <Clock className="w-3.5 h-3.5 text-slate-300" />
                  <span>{formatDateIndo((log as any).createdAt || log.timestamp)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
