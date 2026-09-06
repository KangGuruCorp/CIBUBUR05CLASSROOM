import React, { useState, useMemo } from 'react';
import {
  Award,
  Check,
  CheckCircle2,
  CheckSquare,
  Clock,
  Download,
  Eye,
  FileText,
  Filter,
  Image as ImageIcon,
  MinusSquare,
  RotateCcw,
  Search,
  Sparkles,
  Square,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Mission, MissionProgress, User as UserType } from '../../types';
import { formatShortDate } from '../../utils/gamification';
import { PointIcon } from '../common/PointIcon';
import { FilePreviewModal } from '../common/FilePreviewModal';
import { isImageFile } from '../common/FileUploader';

interface TeacherMissionGradingModalProps {
  mission: Mission | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TeacherMissionGradingModal: React.FC<TeacherMissionGradingModalProps> = ({
  mission,
  isOpen,
  onClose,
}) => {
  const {
    users,
    currentClassId,
    missionProgress,
    gradeAndAwardMission,
    gradeAndAwardMissionBulk,
    verifyManualMission,
  } = useApp();

  // Single grading state
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [score, setScore] = useState<number>(100);
  const [feedback, setFeedback] = useState<string>('Laporan misi sangat baik dan disetujui!');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  // Bulk selection & grading state
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);
  const [bulkScore, setBulkScore] = useState<number>(100);
  const [bulkPoints, setBulkPoints] = useState<number>(mission?.rewardPoints || 30);
  const [bulkFeedback, setBulkFeedback] = useState<string>('Laporan misi sangat baik dan disetujui secara masal oleh guru.');
  const [bulkIsSubmitting, setBulkIsSubmitting] = useState<boolean>(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Search and filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'uncompleted'>('all');

  if (!isOpen || !mission) return null;

  const classStudents = users.filter(
    (u) => u.role === 'student' && (u.classIds || []).includes(currentClassId)
  );

  const getStudentProgress = (userId: string): MissionProgress | null => {
    const periodKey = mission.repeat === 'once' ? 'once' : 'w1';
    const keyWithPeriod = `${mission.id}_${userId}_${periodKey}`;
    const altKey = `${mission.id}_${userId}`;
    return (
      missionProgress[keyWithPeriod] ||
      missionProgress[altKey] ||
      missionProgress[`${mission.id}_${userId}_once`] ||
      missionProgress[`${mission.id}_${userId}_w1`] ||
      null
    );
  };

  // Status counts
  const pendingStudents = classStudents.filter(
    (s) => getStudentProgress(s.uid)?.status === 'pending_verification'
  );
  const completedStudents = classStudents.filter((s) => {
    const st = getStudentProgress(s.uid)?.status;
    return st === 'claimed' || st === 'completed';
  });
  const uncompletedStudents = classStudents.filter((s) => {
    const st = getStudentProgress(s.uid)?.status;
    return !st || st === 'in_progress';
  });

  // Filtered student list
  const filteredStudents = useMemo(() => {
    return classStudents.filter((student) => {
      const prog = getStudentProgress(student.uid);
      const status = prog?.status || 'in_progress';

      // Status filter
      if (statusFilter === 'pending' && status !== 'pending_verification') return false;
      if (statusFilter === 'completed' && status !== 'claimed' && status !== 'completed') return false;
      if (statusFilter === 'uncompleted' && status !== 'in_progress') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (student.displayName || '').toLowerCase().includes(q);
        const matchAbsent = String(student.absentNumber || '').includes(q);
        if (!matchName && !matchAbsent) return false;
      }

      return true;
    });
  }, [classStudents, missionProgress, statusFilter, searchQuery]);

  // Selection handlers
  const allFilteredSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((s) => selectedStudentIds.includes(s.uid));

  const someFilteredSelected =
    filteredStudents.some((s) => selectedStudentIds.includes(s.uid)) && !allFilteredSelected;

  const handleToggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      // Remove currently filtered students from selection
      const filteredIds = new Set(filteredStudents.map((s) => s.uid));
      setSelectedStudentIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      // Add all filtered students to selection
      const newIds = Array.from(
        new Set([...selectedStudentIds, ...filteredStudents.map((s) => s.uid)])
      );
      setSelectedStudentIds(newIds);
    }
  };

  const handleSelectPendingOnly = () => {
    setSelectedStudentIds(pendingStudents.map((s) => s.uid));
    setStatusFilter('pending');
  };

  const handleToggleStudent = (uid: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleClearSelection = () => {
    setSelectedStudentIds([]);
  };

  // Open bulk awarding modal
  const handleOpenBulkAward = () => {
    if (selectedStudentIds.length === 0) return;
    setBulkScore(100);
    setBulkPoints(mission.rewardPoints || 30);
    setBulkFeedback('Laporan misi sangat baik dan disetujui secara masal oleh guru.');
    setShowBulkModal(true);
  };

  // Execute bulk grading & awarding points
  const handleConfirmBulkAward = () => {
    if (selectedStudentIds.length === 0) return;
    setBulkIsSubmitting(true);
    setTimeout(() => {
      gradeAndAwardMissionBulk(
        mission.id,
        selectedStudentIds,
        Number(bulkScore),
        bulkFeedback.trim() || undefined,
        Number(bulkPoints)
      );
      const count = selectedStudentIds.length;
      setBulkIsSubmitting(false);
      setShowBulkModal(false);
      setSelectedStudentIds([]);
      setSuccessBanner(
        `🎉 Berhasil memberikan nilai ${bulkScore} dan +${bulkPoints} Poin secara masal kepada ${count} siswa!`
      );
      setTimeout(() => setSuccessBanner(null), 6000);
    }, 250);
  };

  // Single grading handlers
  const handleStartGrading = (student: UserType) => {
    setActiveStudentId(student.uid);
    const prog = getStudentProgress(student.uid);
    setScore(prog?.score !== undefined ? prog.score : 100);
    setFeedback(prog?.feedback || 'Laporan misi sangat baik dan disetujui!');
  };

  const handleSaveGradeAndAward = (userId: string) => {
    setIsSubmitting(true);
    setTimeout(() => {
      gradeAndAwardMission(mission.id, userId, Number(score), feedback);
      setIsSubmitting(false);
      setActiveStudentId(null);
      setSuccessBanner('Nilai dan poin berhasil diberikan kepada siswa!');
      setTimeout(() => setSuccessBanner(null), 4000);
    }, 200);
  };

  const handleSaveVerifyOnly = (userId: string) => {
    setIsSubmitting(true);
    setTimeout(() => {
      verifyManualMission(mission.id, userId, Number(score), feedback);
      setIsSubmitting(false);
      setActiveStudentId(null);
      setSuccessBanner('Misi berhasil disetujui untuk diklaim siswa!');
      setTimeout(() => setSuccessBanner(null), 4000);
    }, 200);
  };

  const activeStudent = classStudents.find((s) => s.uid === activeStudentId);
  const activeProg = activeStudentId ? getStudentProgress(activeStudentId) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 relative">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50 flex items-center justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800">
                Penilaian & Verifikasi Misi
              </span>
              <span className="text-xs font-black text-amber-800 flex items-center gap-1 bg-white/80 px-2.5 py-0.5 rounded-md border border-amber-200">
                <PointIcon className="w-3.5 h-3.5" />
                <span>+{mission.rewardPoints} Poin per Siswa</span>
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 font-display truncate">
              {mission.title}
            </h3>
            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
              {mission.description}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Toast Banner */}
        {successBanner && (
          <div className="px-5 py-3 bg-emerald-500 text-white font-bold text-xs flex items-center justify-between shadow-inner animate-in slide-in-from-top duration-200 shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-100" />
              <span>{successBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessBanner(null)}
              className="p-1 hover:bg-emerald-600 rounded-lg text-emerald-100 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* Active Single Student Grading Panel */}
          {activeStudent && (
            <div className="p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-400/60 space-y-4 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={activeStudent.avatarUrl}
                    alt={activeStudent.displayName}
                    className="w-10 h-10 rounded-xl bg-white border border-amber-300 object-cover"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Form Penilaian: {activeStudent.displayName}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Misi: {mission.title} • Target: {mission.target} kali
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveStudentId(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 font-bold px-2.5 py-1.5 rounded-lg hover:bg-white/80 border border-transparent hover:border-slate-200 transition-all"
                >
                  Tutup Form
                </button>
              </div>

              {/* Student Submission Text or Proof */}
              {activeProg?.answerText && (
                <div className="p-3 bg-white rounded-xl border border-amber-200 text-xs text-slate-700">
                  <span className="font-bold text-amber-800 block mb-1">
                    Laporan / Catatan Siswa:
                  </span>
                  <p className="whitespace-pre-line">{activeProg.answerText}</p>
                </div>
              )}

              {/* Attached files */}
              {activeProg?.files && activeProg.files.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700">
                      Berkas / Foto Bukti Siswa:
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewIndex(0)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Pratinjau Berkas</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeProg.files.map((f: any, idx: number) => {
                      const isImg = isImageFile(f.name, f.type);
                      return (
                        <div
                          key={idx}
                          className="inline-flex items-center gap-1.5 p-1.5 pl-2.5 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 shadow-2xs hover:border-indigo-300 transition-all"
                        >
                          <div
                            onClick={() => setPreviewIndex(idx)}
                            className="flex items-center gap-1.5 cursor-pointer font-bold hover:text-indigo-600"
                            title="Klik untuk pratinjau langsung"
                          >
                            {isImg ? (
                              <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <FileText className="w-3.5 h-3.5 text-indigo-500" />
                            )}
                            <span className="max-w-[150px] truncate">
                              {f.name || `Bukti ${idx + 1}`}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPreviewIndex(idx)}
                            className="p-1 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Pratinjau Berkas"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {f.url && (
                            <a
                              href={f.url}
                              download={f.name}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                              title="Unduh Berkas"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nilai Siswa (0 - 100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={score}
                    onChange={(e) =>
                      setScore(Math.min(100, Math.max(0, Number(e.target.value))))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-black text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Catatan Guru / Ulasan
                  </label>
                  <input
                    type="text"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Tulis ulasan konstruktif..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSaveVerifyOnly(activeStudent.uid)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
                >
                  Setujui Saja (Siswa Klaim Sendiri)
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSaveGradeAndAward(activeStudent.uid)}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs shadow-md shadow-amber-200 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Nilai & Berikan Hadiah (+{mission.rewardPoints} Poin)</span>
                </button>
              </div>
            </div>
          )}

          {/* Search, Filter Tabs & Bulk Actions Bar */}
          <div className="space-y-3 bg-slate-50/80 p-3.5 sm:p-4 rounded-2xl border border-slate-200">
            {/* Top Row: Search & Status Filter */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari siswa atau no. absen..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center flex-wrap gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    statusFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Semua ({classStudents.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('pending')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                    statusFilter === 'pending'
                      ? 'bg-amber-500 text-white shadow-xs shadow-amber-200'
                      : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-200'
                  }`}
                >
                  <span>Perlu Dinilai ({pendingStudents.length})</span>
                  {pendingStudents.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('completed')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    statusFilter === 'completed'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                  }`}
                >
                  Selesai ({completedStudents.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('uncompleted')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    statusFilter === 'uncompleted'
                      ? 'bg-slate-600 text-white shadow-xs'
                      : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Belum Selesai ({uncompletedStudents.length})
                </button>
              </div>
            </div>

            {/* Bottom Row: Multi-selection and Bulk Action Bar */}
            <div className="pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Select All Checkbox & Quick Filters */}
              <div className="flex items-center flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={handleToggleSelectAllFiltered}
                  className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer select-none px-2 py-1 rounded-lg hover:bg-slate-200/60 transition-colors"
                >
                  {allFilteredSelected ? (
                    <CheckSquare className="w-4 h-4 text-amber-600" />
                  ) : someFilteredSelected ? (
                    <MinusSquare className="w-4 h-4 text-amber-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <span>
                    {selectedStudentIds.length > 0
                      ? `${selectedStudentIds.length} Siswa Terpilih`
                      : 'Pilih Semua (Daftar ini)'}
                  </span>
                </button>

                {/* Quick select pending submissions */}
                {pendingStudents.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectPendingOnly}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Clock className="w-3 h-3 text-amber-600" />
                    <span>Pilih {pendingStudents.length} yang Perlu Dinilai</span>
                  </button>
                )}

                {/* Clear selection */}
                {selectedStudentIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="text-[11px] text-slate-500 hover:text-slate-800 underline font-semibold cursor-pointer"
                  >
                    Batal Pilih
                  </button>
                )}
              </div>

              {/* Main Bulk Points Awarding Button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={selectedStudentIds.length === 0}
                  onClick={handleOpenBulkAward}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-sm ${
                    selectedStudentIds.length > 0
                      ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-300/60 hover:scale-[1.02] active:scale-95'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                  title={
                    selectedStudentIds.length === 0
                      ? 'Centang beberapa siswa terlebih dahulu untuk memberikan poin secara masal'
                      : `Beri nilai dan poin masal ke ${selectedStudentIds.length} siswa terpilih`
                  }
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    Beri Poin Masal{' '}
                    {selectedStudentIds.length > 0 && `(${selectedStudentIds.length} Siswa)`}
                  </span>
                  {selectedStudentIds.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold">
                      +{selectedStudentIds.length * (mission.rewardPoints || 30)} Poin
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Student List Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white">
            {filteredStudents.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <p className="text-xs font-semibold">
                  Tidak ada siswa yang sesuai dengan filter atau pencarian saat ini.
                </p>
                {(searchQuery || statusFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                    }}
                    className="mt-2 text-xs font-bold text-amber-600 hover:underline"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            ) : (
              filteredStudents.map((student) => {
                const prog = getStudentProgress(student.uid);
                const status = prog?.status || 'in_progress';
                const isClaimed = status === 'claimed';
                const isCompleted = status === 'completed';
                const isPending = status === 'pending_verification';
                const isSelected = selectedStudentIds.includes(student.uid);

                const hasFiles = prog?.files && prog.files.length > 0;
                const hasAnswer = !!prog?.answerText?.trim();

                return (
                  <div
                    key={student.uid}
                    className={`p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                      isSelected
                        ? 'bg-amber-50/60 hover:bg-amber-50 border-l-4 border-amber-500'
                        : 'hover:bg-slate-50/80 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleStudent(student.uid)}
                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer shrink-0"
                        title={isSelected ? 'Hapus pilihan' : 'Pilih untuk nilai masal'}
                      />

                      <img
                        src={student.avatarUrl}
                        alt={student.displayName}
                        className="w-10 h-10 rounded-xl bg-slate-100 object-cover border border-slate-200 shrink-0"
                      />

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {student.displayName}
                          </p>

                          {/* Submission attachments indicator badge */}
                          {hasFiles && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold">
                              <ImageIcon className="w-3 h-3" />
                              <span>{prog!.files!.length} Bukti Foto/Berkas</span>
                            </span>
                          )}
                          {hasAnswer && !hasFiles && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold">
                              <FileText className="w-3 h-3" />
                              <span>Ada Laporan</span>
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-400">
                          Absen #{student.absentNumber || 1} • Progres: {prog?.progress || 0} /{' '}
                          {mission.target}
                          {prog?.submittedAt && ` • Dikirim ${formatShortDate(prog.submittedAt)}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 justify-between sm:justify-end pl-7 sm:pl-0">
                      {/* Status Badge */}
                      {isClaimed ? (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Dinilai & Diklaim {prog?.score ? `(${prog.score})` : ''}</span>
                        </span>
                      ) : isCompleted ? (
                        <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Diverifikasi {prog?.score ? `(${prog.score})` : ''}</span>
                        </span>
                      ) : isPending ? (
                        <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-300 flex items-center gap-1 animate-pulse">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Perlu Dinilai Guru</span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Belum Selesai ({prog?.progress || 0}/{mission.target})
                        </span>
                      )}

                      {/* Single Action button */}
                      <button
                        type="button"
                        onClick={() => handleStartGrading(student)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          isPending
                            ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                            : isClaimed || isCompleted
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                        }`}
                        title="Buka form penilaian perorangan"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>{isClaimed || isCompleted ? 'Edit Nilai' : 'Periksa & Nilai'}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Bulk Grading Dialog Modal */}
        {showBulkModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-white/20">
                    <Sparkles className="w-5 h-5 text-amber-200" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold font-display">
                      Beri Poin & Nilai Masal
                    </h3>
                    <p className="text-xs text-amber-100">
                      Misi: {mission.title}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Form Body */}
              <div className="p-5 space-y-4 overflow-y-auto">
                {/* Selected Students Info & List */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-amber-600" />
                      <span>Siswa yang Akan Diberi Poin ({selectedStudentIds.length} Siswa)</span>
                    </label>
                    <span className="text-[11px] text-slate-400">Klik tanda silang untuk mengecualikan</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                    {selectedStudentIds.map((id) => {
                      const st = classStudents.find((s) => s.uid === id);
                      if (!st) return null;
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800 shadow-2xs"
                        >
                          <img
                            src={st.avatarUrl}
                            alt={st.displayName}
                            className="w-4 h-4 rounded-full object-cover"
                          />
                          <span className="max-w-[120px] truncate">{st.displayName}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleStudent(id)}
                            className="text-slate-400 hover:text-rose-500 p-0.5 ml-0.5"
                            title="Keluarkan dari daftar masal"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Score Input & Presets */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Nilai Siswa (0 - 100) *
                    </label>
                    <span className="text-[11px] text-slate-400">Nilai yang tercatat di rapor misi</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={bulkScore}
                      onChange={(e) =>
                        setBulkScore(Math.min(100, Math.max(0, Number(e.target.value))))
                      }
                      className="w-24 px-3 py-2 rounded-xl border border-slate-200 bg-white font-black text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <div className="flex items-center gap-1.5 flex-1">
                      {[100, 95, 90, 85, 80].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setBulkScore(preset)}
                          className={`px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                            bulkScore === preset
                              ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Points Reward per Student & Summary */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Poin Reward per Siswa *
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative w-32">
                      <PointIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={bulkPoints}
                        onChange={(e) =>
                          setBulkPoints(Math.max(1, Number(e.target.value)))
                        }
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white font-black text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <span className="text-xs text-slate-500">Poin / Siswa</span>
                  </div>

                  {/* Calculated Points Overview Card */}
                  <div className="mt-2.5 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-bold text-amber-900">
                        Total Poin yang Akan Dibagikan:
                      </span>
                    </div>
                    <span className="text-sm font-black text-amber-800 flex items-center gap-1">
                      <PointIcon className="w-4 h-4" />
                      <span>+{selectedStudentIds.length * bulkPoints} Poin</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Kalkulasi: {selectedStudentIds.length} siswa × {bulkPoints} poin ={' '}
                    {selectedStudentIds.length * bulkPoints} poin.
                  </p>
                </div>

                {/* Bulk Feedback / Note */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Catatan Guru / Ulasan Masal
                  </label>
                  <textarea
                    rows={2}
                    value={bulkFeedback}
                    onChange={(e) => setBulkFeedback(e.target.value)}
                    placeholder="Tulis ulasan konstruktif..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  />
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={bulkIsSubmitting}
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={bulkIsSubmitting || selectedStudentIds.length === 0}
                  onClick={handleConfirmBulkAward}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs shadow-md shadow-amber-300 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {bulkIsSubmitting
                      ? 'Sedang Memproses...'
                      : `Konfirmasi & Berikan Poin (${selectedStudentIds.length} Siswa)`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Direct In-App File Preview Modal */}
        {previewIndex !== null && activeProg?.files && (
          <FilePreviewModal
            isOpen={previewIndex !== null}
            onClose={() => setPreviewIndex(null)}
            files={activeProg.files}
            initialIndex={previewIndex}
            title={`Bukti Misi: ${activeStudent?.displayName || 'Siswa'}`}
            subtitle={mission.title}
          />
        )}
      </div>
    </div>
  );
};
