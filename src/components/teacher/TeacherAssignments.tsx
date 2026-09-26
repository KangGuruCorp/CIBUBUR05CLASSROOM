import React, { useState } from 'react';
import {
  AlertCircle,
  Award,
  Calendar,
  Check,
  CheckCircle2,
  CheckSquare,
  Clock,
  Edit2,
  Eye,
  FileCheck,
  Filter,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Assignment, Submission } from '../../types';
import { formatDateIndo, formatShortDate, getEffectiveTaskStatus } from '../../utils/gamification';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EmptyState } from '../common/EmptyState';
import { PointIcon } from '../common/PointIcon';
import { StatusPill } from '../common/StatusPill';
import { TeacherGradingModal } from './TeacherGradingModal';

interface TeacherAssignmentsProps {
  isCreateOpenInitially?: boolean;
  onCloseInitialCreate?: () => void;
}

export const TeacherAssignments: React.FC<TeacherAssignmentsProps> = ({
  isCreateOpenInitially = false,
  onCloseInitialCreate,
}) => {
  const {
    assignments,
    submissions,
    users,
    currentClassId,
    saveAssignment,
    deleteAssignment,
  } = useApp();

  const [isEditorOpen, setIsEditorOpen] = useState(isCreateOpenInitially);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [activeSubmissionsAssignment, setActiveSubmissionsAssignment] = useState<Assignment | null>(null);
  const [activeGradingSubId, setActiveGradingSubId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Matematika');
  const [instructions, setInstructions] = useState('');
  const [openAt, setOpenAt] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [maxScore, setMaxScore] = useState(100);
  const [rewardPoints, setRewardPoints] = useState(50);
  const [status, setStatus] = useState<'published' | 'scheduled' | 'draft'>('published');

  React.useEffect(() => {
    if (isCreateOpenInitially) {
      handleOpenCreate();
      onCloseInitialCreate?.();
    }
  }, [isCreateOpenInitially]);

  const classStudents = users.filter(
    (u) => u.role === 'student' && (u.classIds || []).includes(currentClassId)
  );

  // Sort assignments newest first
  const sortedAssignments = [...assignments].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (timeA !== timeB) return timeB - timeA;
    return b.id.localeCompare(a.id);
  });

  // Deduplicate and get latest submission per student for an assignment
  const getAssignmentSubmissions = (assignmentId: string): Submission[] => {
    const map = new Map<string, Submission>();
    Object.values(submissions).forEach((s: any) => {
      if (s && s.assignmentId === assignmentId && s.userId) {
        const existing = map.get(s.userId);
        if (!existing) {
          map.set(s.userId, s);
        } else {
          const eTime = new Date(existing.updatedAt || existing.submittedAt || 0).getTime();
          const sTime = new Date(s.updatedAt || s.submittedAt || 0).getTime();
          if (sTime >= eTime) map.set(s.userId, s);
        }
      }
    });
    return Array.from(map.values());
  };

  const handleOpenCreate = () => {
    setEditingAssignment(null);
    setTitle('');
    setSubject('Matematika');
    setInstructions('');
    const nowStr = new Date().toISOString().slice(0, 16);
    setOpenAt(nowStr);
    // Default deadline: 3 days from now at 23:59
    const d = new Date();
    d.setDate(d.getDate() + 3);
    d.setHours(23, 59, 0, 0);
    setDueAt(d.toISOString().slice(0, 16));
    setMaxScore(100);
    setRewardPoints(50);
    setStatus('published');
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (asg: Assignment) => {
    setEditingAssignment(asg);
    setTitle(asg.title);
    setSubject(asg.subject);
    setInstructions(asg.instructions);
    setOpenAt(asg.openAt ? new Date(asg.openAt).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16));
    setDueAt(new Date(asg.dueAt).toISOString().slice(0, 16));
    setMaxScore(asg.maxScore);
    setRewardPoints(asg.rewardPoints);
    setStatus(asg.status as 'published' | 'scheduled' | 'draft');
    setIsEditorOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !instructions.trim() || !dueAt) {
      alert('Semua field bertanda bintang wajib diisi.');
      return;
    }

    const finalOpenAt = openAt ? new Date(openAt).toISOString() : new Date().toISOString();

    const payload: Partial<Assignment> = {
      id: editingAssignment?.id,
      classIds: [currentClassId],
      title,
      subject,
      instructions,
      openAt: finalOpenAt,
      dueAt: new Date(dueAt).toISOString(),
      maxScore: Number(maxScore),
      rewardPoints: Number(rewardPoints),
      status,
      attachmentRules: {
        maxFiles: 5,
        maxSizeMB: 15,
        allowedTypes: [
          'image/jpeg',
          'image/png',
          'image/webp',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
      },
    };

    saveAssignment(payload);
    setIsEditorOpen(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold mb-2">
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Manajemen Tugas & Penilaian Siswa</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
            Kelola Tugas & Penilaian
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Buat tugas terstruktur dengan poin reward pembelajaran dan periksa kiriman siswa secara real-time
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Tugas Baru</span>
        </button>
      </div>

      {/* Assignment List */}
      {sortedAssignments.length === 0 ? (
        <EmptyState
          title="Belum Ada Tugas Dibuat"
          description="Buat tugas pertama agar siswa dapat mulai mengerjakan dan mengumpulkan tugas."
          actionLabel="Buat Tugas Baru"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="space-y-4">
          {sortedAssignments.map((asg) => {
            // Count unique submission states for this assignment
            const asgSubs = getAssignmentSubmissions(asg.id);
            const submittedCount = asgSubs.filter(
              (s) => s.status === 'submitted' || s.status === 'resubmitted'
            ).length;
            const gradedCount = asgSubs.filter((s) => s.status === 'graded').length;

            return (
              <div
                key={asg.id}
                className="bg-white rounded-3xl border border-slate-200/80 hover:border-indigo-300 hover:shadow-lg transition-all p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative"
              >
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                        {asg.subject}
                      </span>
                      {getEffectiveTaskStatus(asg.status, asg.openAt) === 'scheduled' ? (
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-xs">
                          <Clock className="w-3 h-3 text-amber-700" />
                          <span>Dijadwalkan</span>
                        </span>
                      ) : getEffectiveTaskStatus(asg.status, asg.openAt) === 'published' ? (
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-xs">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Aktif Tayang</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-md bg-slate-200 text-slate-700 shadow-xs">
                          Draft
                        </span>
                      )}
                    </div>

                    {/* Points label strictly positioned in top right */}
                    <span className="text-xs font-black text-amber-800 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200 flex items-center gap-1 shrink-0">
                      <PointIcon className="w-3.5 h-3.5" />
                      <span>+{asg.rewardPoints} Poin Reward</span>
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                    {asg.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {asg.instructions}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-2.5 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1.5 text-slate-700 font-semibold bg-indigo-50/70 px-2.5 py-1 rounded-xl border border-indigo-100">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{asg.status === 'scheduled' ? 'Jadwal Buka: ' : 'Diposting: '}{formatDateIndo(asg.openAt || asg.createdAt)}</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-700 font-semibold bg-rose-50/70 px-2.5 py-1 rounded-xl border border-rose-100">
                      <Clock className="w-3.5 h-3.5 text-rose-500" />
                      <span>Tenggat: {formatDateIndo(asg.dueAt)}</span>
                    </span>
                    <span className="text-slate-400">• Maksimal Nilai: <strong className="text-slate-700">{asg.maxScore}</strong></span>
                  </div>
                </div>

                {/* Submission Progress & Actions */}
                <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col sm:items-center lg:items-end justify-between gap-4 lg:border-l lg:border-slate-100 lg:pl-6">
                  {/* Stats */}
                  <div className="flex items-center gap-3 text-xs">
                    <div className="text-center p-2 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="font-black text-slate-800 block text-sm">
                        {asgSubs.length}/{classStudents.length}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">Mengumpulkan</span>
                    </div>

                    <div className="text-center p-2 rounded-xl bg-amber-50 border border-amber-200">
                      <span className="font-black text-amber-800 block text-sm">
                        {submittedCount}
                      </span>
                      <span className="text-[10px] text-amber-700 font-bold">Perlu Dinilai</span>
                    </div>

                    <div className="text-center p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                      <span className="font-black text-emerald-800 block text-sm">
                        {gradedCount}
                      </span>
                      <span className="text-[10px] text-emerald-700 font-bold">Dinilai</span>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveSubmissionsAssignment(asg)}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>Lihat & Nilai Kiriman ({submittedCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(asg)}
                      className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
                      title="Edit Tugas"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTargetId(asg.id)}
                      className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors"
                      title="Hapus Tugas"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submissions Drawer / List Modal for specific assignment */}
      {activeSubmissionsAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600">
                  Daftar Kiriman Tugas Siswa
                </span>
                <h3 className="text-lg font-bold text-slate-900 font-display">
                  {activeSubmissionsAssignment.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubmissionsAssignment(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Table of students & their status */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden">
                {classStudents.map((student) => {
                  const subKey = `${activeSubmissionsAssignment.id}_${student.uid}`;
                  const sub = submissions[subKey] || Object.values(submissions).find(
                    (s: any) => s && s.assignmentId === activeSubmissionsAssignment.id && s.userId === student.uid
                  );
                  const status = sub?.status || 'draft';
                  const effectiveSubId = sub?.id || subKey;

                  return (
                    <div
                      key={student.uid}
                      className="p-3.5 sm:p-4 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={student.avatarUrl}
                          alt={student.displayName}
                          className="w-10 h-10 rounded-xl bg-slate-100 object-cover border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {student.displayName}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Absen #{student.absentNumber || 1} • {sub ? `Dikirim ${formatShortDate(sub.submittedAt)}` : 'Belum mengumpulkan'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <StatusPill status={status} isLate={sub?.isLate} />

                        {status === 'graded' ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-emerald-600 font-display">
                              {sub?.score} / {activeSubmissionsAssignment.maxScore}
                            </span>
                            <button
                              type="button"
                              onClick={() => setActiveGradingSubId(effectiveSubId)}
                              className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                            >
                              Edit Nilai
                            </button>
                          </div>
                        ) : status === 'submitted' || status === 'resubmitted' ? (
                          <button
                            type="button"
                            onClick={() => setActiveGradingSubId(effectiveSubId)}
                            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>Beri Nilai</span>
                          </button>
                        ) : status === 'revision_requested' ? (
                          <span className="text-xs text-amber-700 font-semibold">Menunggu Revisi Siswa</span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Belum Ada Kiriman</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
            <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                {editingAssignment ? 'Edit Tugas Pembelajaran' : 'Buat Tugas Kelas Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Judul Tugas *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Latihan Soal Bilangan Pecahan dan Desimal"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mata Pelajaran *
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Contoh: Matematika, IPAS, B. Indonesia, dsb"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Skor Maksimal
                  </label>
                  <input
                    type="number"
                    required
                    min={10}
                    max={1000}
                    value={maxScore}
                    onChange={(e) => setMaxScore(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <PointIcon className="w-3.5 h-3.5" />
                    <span>Reward Poin Nilai</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={200}
                    value={rewardPoints}
                    onChange={(e) => setRewardPoints(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-extrabold text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/40"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Petunjuk & Instruksi Pengerjaan *
                </label>
                <textarea
                  rows={4}
                  required
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Tuliskan nomor soal yang harus dikerjakan, format pengumpulan (foto buku tulis/PDF), dsb..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 leading-relaxed"
                />
              </div>

              {/* Dates: Deadline */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-rose-500" />
                    <span>Batas Waktu Pengumpulan (Tenggat) *</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={dueAt}
                    onChange={(e) => setDueAt(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-2xs"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Batas akhir siswa mengumpulkan tugas
                  </p>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Status Tugas & Penjadwalan
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                      status === 'published'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60'
                    }`}
                  >
                    <input
                      type="radio"
                      name="assignment_status"
                      value="published"
                      checked={status === 'published'}
                      onChange={() => setStatus('published')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Terbitkan Langsung</span>
                      </div>
                      <p className="text-[10px] font-normal text-emerald-700/80 mt-0.5">Buka sekarang juga</p>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                      status === 'scheduled'
                        ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60'
                    }`}
                  >
                    <input
                      type="radio"
                      name="assignment_status"
                      value="scheduled"
                      checked={status === 'scheduled'}
                      onChange={() => {
                        setStatus('scheduled');
                        if (!openAt || new Date(openAt) <= new Date()) {
                          const d = new Date();
                          if (d.getHours() >= 17) {
                            d.setDate(d.getDate() + 1);
                            d.setHours(7, 0, 0, 0);
                          } else {
                            d.setHours(d.getHours() + 1, 0, 0, 0);
                          }
                          setOpenAt(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
                        }
                      }}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Jadwalkan Tugas</span>
                      </div>
                      <p className="text-[10px] font-normal text-amber-800/80 mt-0.5">Buka sesuai jam diposting</p>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                      status === 'draft'
                        ? 'bg-slate-200/80 border-slate-300 text-slate-800 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60'
                    }`}
                  >
                    <input
                      type="radio"
                      name="assignment_status"
                      value="draft"
                      checked={status === 'draft'}
                      onChange={() => setStatus('draft')}
                      className="text-slate-600 focus:ring-slate-500"
                    />
                    <div className="min-w-0">
                      <span>Simpan Draft</span>
                      <p className="text-[10px] font-normal text-slate-500 mt-0.5">Disembunyikan dari siswa</p>
                    </div>
                  </label>
                </div>

                {/* Kalender & Jam Terbit saat Jadwalkan dipilih */}
                {status === 'scheduled' && (
                  <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-300 space-y-2 animate-in fade-in duration-200 mt-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-amber-600" />
                        <span>Jadwal Waktu Terbit (Tanggal & Jam Buka) *</span>
                      </label>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        <span>Otomatis</span>
                      </span>
                    </div>
                    <input
                      type="datetime-local"
                      required
                      value={openAt}
                      onChange={(e) => setOpenAt(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                    />
                    <p className="text-[11px] text-amber-800 leading-tight">
                      Tugas akan otomatis terbit & dapat mulai dikerjakan siswa sesuai tanggal dan jam ini.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs sm:text-sm font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-200 transition-all flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Tugas</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTargetId}
        title="Hapus Tugas Ini?"
        message="Menghapus tugas akan menghapus riwayat pengumpulan tugas ini."
        confirmLabel="Ya, Hapus Tugas"
        isDanger={true}
        onConfirm={() => {
          if (deleteTargetId) {
            deleteAssignment(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
        onCancel={() => setDeleteTargetId(null)}
      />

      {/* Direct Grading Modal */}
      {activeGradingSubId && (
        <TeacherGradingModal
          submissionId={activeGradingSubId}
          onClose={() => setActiveGradingSubId(null)}
        />
      )}
    </div>
  );
};
