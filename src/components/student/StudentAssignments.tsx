import React, { useState } from 'react';
import {
  AlertTriangle,
  Award,
  Calendar,
  CheckCircle2,
  CheckSquare,
  Clock,
  FileCheck,
  FileEdit,
  Filter,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Assignment } from '../../types';
import { formatDateIndo, formatShortDate, isDeadlineNear } from '../../utils/gamification';
import { EmptyState } from '../common/EmptyState';
import { PointIcon } from '../common/PointIcon';
import { StatusPill } from '../common/StatusPill';
import { StudentAssignmentDetailModal } from './StudentAssignmentDetailModal';

interface StudentAssignmentsProps {
  selectedAssignmentId?: string | null;
  onClearSelected?: () => void;
}

export const StudentAssignments: React.FC<StudentAssignmentsProps> = ({
  selectedAssignmentId,
  onClearSelected,
}) => {
  const { assignments, submissions, currentUser } = useApp();
  const [filterTab, setFilterTab] = useState<string>('all'); // all, pending, submitted, graded, revision
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeModalAssignment, setActiveModalAssignment] = useState<Assignment | null>(null);

  React.useEffect(() => {
    if (selectedAssignmentId) {
      const found = assignments.find((a) => a.id === selectedAssignmentId);
      if (found) setActiveModalAssignment(found);
    }
  }, [selectedAssignmentId, assignments]);

  if (!currentUser) return null;

  const filteredAssignments = assignments
    .filter((asg) => {
      if (asg.status === 'draft') return false;
      if (asg.status !== 'published' && asg.status !== 'scheduled') return false;

      const sub = submissions[`${asg.id}_${currentUser.uid}`];
      const status = sub?.status || 'draft';

      if (filterTab === 'pending' && (status === 'submitted' || status === 'graded' || status === 'resubmitted')) {
        return false;
      }
      if (filterTab === 'submitted' && status !== 'submitted' && status !== 'resubmitted') {
        return false;
      }
      if (filterTab === 'graded' && status !== 'graded') {
        return false;
      }
      if (filterTab === 'revision' && status !== 'revision_requested') {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return asg.title.toLowerCase().includes(q) || asg.subject.toLowerCase().includes(q);
      }

      return true;
    })
    .sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;
      return b.id.localeCompare(a.id);
    });

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold mb-2">
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Tugas & Lembar Kerja Siswa</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
              Daftar Tugas Kelas
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Kumpulkan tugas tepat waktu untuk mendapatkan skor terbaik dan reward poin prestasi!
            </p>
          </div>

          {/* Search bar */}
          <div className="w-full sm:w-72 relative">
            <Search className="w-4 h-4 text-slate-400 absolute inset-y-0 left-3 my-auto pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari tugas..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-100">
          {[
            { id: 'all', label: 'Semua Tugas' },
            { id: 'pending', label: 'Belum Selesai' },
            { id: 'submitted', label: 'Terkirim' },
            { id: 'graded', label: 'Dinilai' },
            { id: 'revision', label: 'Perlu Revisi' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id)}
              className={`px-4 py-2 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all ${
                filterTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Assignment Cards List */}
      {filteredAssignments.length === 0 ? (
        <EmptyState
          title="Tidak Ada Tugas"
          description="Tidak ada tugas pada kategori ini yang perlu dikerjakan."
          actionLabel="Tampilkan Semua Tugas"
          onAction={() => {
            setFilterTab('all');
            setSearchQuery('');
          }}
        />
      ) : (
        <div className="space-y-4">
          {filteredAssignments.map((asg) => {
            const sub = submissions[`${asg.id}_${currentUser.uid}`] ||
              Object.values(submissions).find(
                (s: any) => s && s.assignmentId === asg.id && s.userId === currentUser.uid
              );
            const status = sub?.status || 'draft';
            const { isUrgent, isPast } = isDeadlineNear(asg.dueAt);
            const isCompleted = status === 'graded' || status === 'submitted';

            return (
              <div
                key={asg.id}
                onClick={() => setActiveModalAssignment(asg)}
                className={`group rounded-3xl border transition-all duration-300 p-5 sm:p-6 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-5 ${
                  isCompleted
                    ? 'bg-slate-50/80 border-slate-200 grayscale contrast-90 opacity-65 hover:opacity-100 hover:grayscale-0 shadow-xs'
                    : 'bg-white border-indigo-100/90 hover:border-indigo-300 shadow-[0_0_20px_-3px_rgba(99,102,241,0.2)] hover:shadow-[0_0_28px_rgba(99,102,241,0.32)] ring-1 ring-indigo-400/20'
                }`}
              >
                {/* Left side details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                        {asg.subject}
                      </span>
                      {asg.status === 'scheduled' && new Date(asg.openAt || '') > new Date() && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-xs">
                          <Clock className="w-3 h-3 text-amber-700" />
                          <span>Segera Dibuka</span>
                        </span>
                      )}
                      <StatusPill status={status} isLate={sub?.isLate} />
                    </div>

                    {/* Points indicator solely in the top-right corner */}
                    <span className="text-xs font-black text-amber-800 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200 flex items-center gap-1 shrink-0">
                      <PointIcon className="w-3.5 h-3.5" />
                      <span>+{asg.rewardPoints} Poin</span>
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors font-display">
                    {asg.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {asg.instructions}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-2.5 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1.5 text-slate-700 font-semibold bg-indigo-50/70 px-2.5 py-1 rounded-xl border border-indigo-100">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{asg.status === 'scheduled' && new Date(asg.openAt || '') > new Date() ? 'Jadwal Buka: ' : 'Diposting: '}{formatDateIndo(asg.openAt || asg.createdAt)}</span>
                    </span>
                    <span
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border ${
                        isPast
                          ? 'bg-rose-50 text-rose-700 border-rose-200 font-bold'
                          : isUrgent
                          ? 'bg-orange-50 text-orange-700 border-orange-200 font-bold'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Tenggat: {formatDateIndo(asg.dueAt)}</span>
                    </span>
                    <span className="text-slate-400">• Maks Skor: <strong className="text-slate-700">{asg.maxScore}</strong></span>
                  </div>
                </div>

                {/* Right side CTA or Grade pill */}
                <div className="shrink-0 flex items-center justify-end sm:border-l sm:border-slate-100 sm:pl-6">
                  {status === 'graded' ? (
                    <div className="text-right">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Nilai Kamu
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-emerald-600 font-display">
                        {sub?.score} <span className="text-xs text-slate-400 font-normal">/ {asg.maxScore}</span>
                      </span>
                      <span className="block text-[11px] font-bold text-indigo-600 mt-1 hover:underline">
                        Lihat Ulasan Guru →
                      </span>
                    </div>
                  ) : status === 'submitted' || status === 'resubmitted' ? (
                    <div className="text-right">
                      <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3.5 py-1.5 rounded-xl block border border-blue-200">
                        Menunggu Penilaian
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-1">
                        Dikirim {formatShortDate(sub?.submittedAt)}
                      </span>
                    </div>
                  ) : status === 'revision_requested' ? (
                    <button
                      type="button"
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm font-bold shadow-md shadow-amber-200 transition-all flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Perbaiki Tugas</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-200 transition-all flex items-center gap-2 group-hover:scale-105"
                    >
                      <FileEdit className="w-4 h-4" />
                      <span>Kerjakan Tugas</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assignment Modal */}
      {activeModalAssignment && (
        <StudentAssignmentDetailModal
          assignment={activeModalAssignment}
          onClose={() => {
            setActiveModalAssignment(null);
            onClearSelected?.();
          }}
        />
      )}
    </div>
  );
};
