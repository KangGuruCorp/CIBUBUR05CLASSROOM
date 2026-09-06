import React from 'react';
import { AlertCircle, CheckCircle2, Clock, FileEdit, RefreshCw } from 'lucide-react';
import { SubmissionStatus } from '../../types';

interface StatusPillProps {
  status: SubmissionStatus | 'published' | 'draft' | 'archived' | 'active' | 'ended' | 'completed' | 'in_progress' | 'scheduled' | 'closed';
  isLate?: boolean;
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, isLate }) => {
  switch (status) {
    case 'scheduled':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3.5 h-3.5" />
          <span>Terjadwal</span>
        </span>
      );
    case 'closed':
    case 'ended':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
          <Clock className="w-3.5 h-3.5" />
          <span>Ditutup</span>
        </span>
      );
    case 'graded':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Dinilai</span>
        </span>
      );
    case 'submitted':
    case 'resubmitted':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <Clock className="w-3.5 h-3.5" />
          <span>{status === 'resubmitted' ? 'Revisi Terkirim' : 'Terkirim'}</span>
          {isLate && <span className="text-rose-600 font-bold ml-0.5">(Terlambat)</span>}
        </span>
      );
    case 'revision_requested':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Perlu Revisi</span>
        </span>
      );
    case 'draft':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
          <FileEdit className="w-3.5 h-3.5" />
          <span>Draft</span>
        </span>
      );
    case 'published':
    case 'active':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
          <span>Aktif</span>
        </span>
      );
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Selesai</span>
        </span>
      );
    case 'in_progress':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <Clock className="w-3.5 h-3.5" />
          <span>Berlangsung</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
          <span>{status}</span>
        </span>
      );
  }
};
