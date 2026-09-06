import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertCircle,
  Award,
  Calendar,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Filter,
  Image as ImageIcon,
  Search,
  Sparkles,
  Upload,
  X,
  Youtube,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Assignment, Submission } from '../../types';
import { formatDateIndo, isDeadlineNear } from '../../utils/gamification';
import { EmptyState } from '../common/EmptyState';
import { PointIcon } from '../common/PointIcon';
import { StatusPill } from '../common/StatusPill';
import { YouTubeEmbed } from '../common/YouTubeEmbed';
import { StudentAssignmentDetailModal } from './StudentAssignmentDetailModal';
import { FilePreviewModal } from '../common/FilePreviewModal';

interface StudentClassworkProps {
  selectedItemId?: string | null;
  onClearSelected?: () => void;
}

export const StudentClasswork: React.FC<StudentClassworkProps> = ({
  selectedItemId = null,
  onClearSelected,
}) => {
  const { assignments, submissions, currentUser, currentClassId, classes } = useApp();

  // Active assignment modal for submitting
  const [activeModalAssignment, setActiveModalAssignment] = useState<Assignment | null>(null);

  // File preview modal
  const [previewFiles, setPreviewFiles] = useState<any[] | null>(null);
  const [previewIdx, setPreviewIdx] = useState<number>(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'done'>('all');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');

  // Expanded accordion items
  const [expandedItemIds, setExpandedItemIds] = useState<Record<string, boolean>>({});

  const currentClass = classes.find((c) => c.id === currentClassId);

  // Handle deep-linked selected item
  useEffect(() => {
    if (selectedItemId) {
      setExpandedItemIds((prev) => ({ ...prev, [selectedItemId]: true }));
      const asg = assignments.find((a) => a.id === selectedItemId);
      if (asg) {
        setActiveModalAssignment(asg);
      }
    }
  }, [selectedItemId, assignments]);

  // Tasks assigned to this class and this student
  const studentTasks = useMemo(() => {
    if (!currentUser) return [];
    return assignments.filter((asg) => {
      // Must be in current class
      const inClass = (asg.classIds || []).includes(currentClassId);
      if (!inClass) return false;

      // Must not be draft
      if (asg.status === 'draft') return false;

      // If specific assignedUserIds defined, current user must be in the list
      if (asg.assignedUserIds && asg.assignedUserIds.length > 0) {
        return asg.assignedUserIds.includes(currentUser.uid);
      }
      return true;
    });
  }, [assignments, currentUser, currentClassId]);

  // Unique topics
  const topics = useMemo(() => {
    const set = new Set<string>();
    studentTasks.forEach((a) => {
      if (a.topic && a.topic.trim()) set.add(a.topic.trim());
    });
    return Array.from(set).sort();
  }, [studentTasks]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    if (!currentUser) return [];

    return studentTasks.filter((task) => {
      const sub = submissions[`${task.id}_${currentUser.uid}`];
      const isDone = sub && (sub.status === 'submitted' || sub.status === 'resubmitted' || sub.status === 'graded');

      // Status filter
      if (statusFilter === 'todo' && isDone) return false;
      if (statusFilter === 'done' && !isDone) return false;

      // Topic filter
      if (selectedTopic !== 'all' && (task.topic || '') !== selectedTopic) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesInstr = (task.instructions || '').toLowerCase().includes(q);
        const matchesSubject = (task.subject || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesInstr && !matchesSubject) return false;
      }

      return true;
    });
  }, [studentTasks, submissions, currentUser, statusFilter, selectedTopic, searchQuery]);

  const toggleAccordion = (id: string) => {
    setExpandedItemIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleOpenTeacherPreview = (name: string, url: string, type?: string) => {
    setPreviewFiles([
      {
        name,
        url,
        type: type || 'pdf',
        size: 0,
      },
    ]);
    setPreviewIdx(0);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {currentClass?.name || 'Kelas Aktif'}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-500">
              {studentTasks.length} Tugas Tersedia
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
            Tugas Kelas
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">
            Kerjakan tugas sesuai instruksi guru, baca lampiran referensi, dan lampirkan hasil pekerjaanmu untuk mendapatkan nilai dan XP!
          </p>
        </div>

        {/* Quick summary badges */}
        {currentUser && (
          <div className="flex items-center gap-2 text-xs">
            <div className="px-4 py-2 rounded-2xl bg-amber-50 text-amber-900 border border-amber-200 font-bold flex flex-col items-center">
              <span className="text-[10px] text-amber-700 uppercase font-semibold">Perlu Dikerjakan</span>
              <span className="text-lg font-black">
                {
                  studentTasks.filter((t) => {
                    const sub = submissions[`${t.id}_${currentUser.uid}`];
                    return !sub || sub.status === 'draft' || sub.status === 'revision_requested';
                  }).length
                }
              </span>
            </div>

            <div className="px-4 py-2 rounded-2xl bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold flex flex-col items-center">
              <span className="text-[10px] text-emerald-700 uppercase font-semibold">Sudah Selesai</span>
              <span className="text-lg font-black">
                {
                  studentTasks.filter((t) => {
                    const sub = submissions[`${t.id}_${currentUser.uid}`];
                    return sub && (sub.status === 'submitted' || sub.status === 'resubmitted' || sub.status === 'graded');
                  }).length
                }
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        {/* Search input */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul tugas, instruksi, atau mata pelajaran..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100/70 p-1 rounded-xl overflow-x-auto">
          {[
            { id: 'all', label: 'Semua Tugas' },
            { id: 'todo', label: 'Perlu Dikerjakan' },
            { id: 'done', label: 'Sudah Selesai / Dinilai' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Topic Filter */}
        {topics.length > 0 && (
          <div className="shrink-0">
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Topik / Bab</option>
              {topics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Task Cards List */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title={searchQuery ? 'Tugas Tidak Ditemukan' : 'Tidak Ada Tugas Saat Ini'}
          description={
            searchQuery
              ? 'Coba ganti kata kunci pencarian atau sesuaikan filter status.'
              : 'Semua tugas kelas telah selesai kamu kerjakan atau belum ada tugas baru dari gurumu.'
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => {
            const isExpanded = Boolean(expandedItemIds[task.id]);
            const sub = currentUser ? submissions[`${task.id}_${currentUser.uid}`] : undefined;
            const isSubmitted = sub && (sub.status === 'submitted' || sub.status === 'resubmitted');
            const isGraded = sub && sub.status === 'graded';
            const isRevision = sub && sub.status === 'revision_requested';
            const hasAttachments = (task.attachments && task.attachments.length > 0) || Boolean(task.youtubeUrl);
            const { isUrgent, isPast } = isDeadlineNear(task.dueAt);

            return (
              <div
                key={task.id}
                className={`bg-white rounded-3xl border transition-all duration-200 overflow-hidden ${
                  isExpanded
                    ? 'border-indigo-300 shadow-md ring-1 ring-indigo-500/10'
                    : 'border-slate-200/90 shadow-2xs hover:border-slate-300'
                }`}
              >
                {/* Header (Click to expand) */}
                <div
                  onClick={() => toggleAccordion(task.id)}
                  className="p-5 sm:p-6 cursor-pointer select-none flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                        isGraded
                          ? 'bg-emerald-600 text-white shadow-emerald-200'
                          : isSubmitted
                          ? 'bg-blue-600 text-white shadow-blue-200'
                          : isRevision
                          ? 'bg-amber-500 text-white shadow-amber-200'
                          : 'bg-indigo-600 text-white shadow-indigo-200'
                      }`}
                    >
                      <CheckSquare className="w-6 h-6" />
                    </div>

                    <div className="min-w-0 space-y-1.5 flex-1">
                      {/* Badges */}
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {task.subject}
                        </span>

                        {task.topic && (
                          <span className="font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {task.topic}
                          </span>
                        )}

                        {/* Submission status tag */}
                        {isGraded ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Nilai: {sub?.score}/{task.maxScore}</span>
                          </span>
                        ) : isSubmitted ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                            Diserahkan
                          </span>
                        ) : isRevision ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
                            Perlu Revisi
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                            Ditugaskan
                          </span>
                        )}

                        {hasAttachments && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            <span>
                              {(task.attachments?.length || 0) + (task.youtubeUrl ? 1 : 0)} Lampiran Guru
                            </span>
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug font-display">
                        {task.title}
                      </h3>

                      {/* Metadata */}
                      <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                        {task.dueAt ? (
                          <span className={`flex items-center gap-1.5 font-medium ${isPast && !sub ? 'text-rose-600 font-bold' : isUrgent && !sub ? 'text-orange-600 font-bold' : 'text-slate-600'}`}>
                            <Clock className="w-3.5 h-3.5" />
                            <span>Tenggat: {formatDateIndo(task.dueAt)}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Tanpa batas waktu</span>
                        )}

                        <span className="text-slate-300">•</span>

                        <span className="font-medium text-slate-700">
                          Maks: {task.maxScore > 0 ? `${task.maxScore} Poin` : 'Tidak Dinilai'}
                        </span>

                        <span className="text-slate-300">•</span>

                        <span className="flex items-center gap-1 font-bold text-amber-700">
                          <PointIcon className="w-3 h-3" />
                          <span>+{task.rewardPoints} XP</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right side CTA Button */}
                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveModalAssignment(task);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer ${
                        isGraded
                          ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                          : isSubmitted
                          ? 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
                          : isRevision
                          ? 'bg-amber-600 hover:bg-amber-700 text-white'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                      }`}
                    >
                      {isGraded ? (
                        <>
                          <Award className="w-4 h-4" />
                          <span>Lihat Nilai & Kiriman</span>
                        </>
                      ) : isSubmitted ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Lihat Kiriman Tugas</span>
                        </>
                      ) : isRevision ? (
                        <>
                          <Upload className="w-4 h-4" />
                          <span>Kirim Ulang Revisi</span>
                        </>
                      ) : (
                        <>
                          <CheckSquare className="w-4 h-4" />
                          <span>Kerjakan Tugas</span>
                        </>
                      )}
                    </button>

                    <div className="p-2 text-slate-400">
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-indigo-600" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-5 sm:p-6 space-y-5">
                    {/* Teacher's Instructions */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                        Petunjuk Pengerjaan dari Guru
                      </h4>
                      <div className="text-xs sm:text-sm text-slate-800 whitespace-pre-line leading-relaxed font-sans">
                        {task.instructions || 'Tidak ada petunjuk khusus tertulis dari guru.'}
                      </div>
                    </div>

                    {/* Lampiran Guru (Files, YouTube, Links) */}
                    {hasAttachments && (
                      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-indigo-600" />
                          <span>Lampiran Referensi Guru</span>
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {/* YouTube Video */}
                          {task.youtubeUrl && (
                            <div className="rounded-2xl overflow-hidden border border-rose-200 bg-rose-50/30 p-2 space-y-2">
                              <YouTubeEmbed url={task.youtubeUrl} title="Video YouTube Referensi" />
                              <p className="text-[11px] font-bold text-rose-950 px-1 truncate flex items-center gap-1">
                                <Youtube className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span>Video Pembelajaran</span>
                              </p>
                            </div>
                          )}

                          {/* Files and Links */}
                          {task.attachments?.map((att, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 transition-colors flex items-center justify-between gap-3 shadow-2xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                  {att.type === 'link' ? (
                                    <ExternalLink className="w-4 h-4" />
                                  ) : att.type === 'image' ? (
                                    <ImageIcon className="w-4 h-4" />
                                  ) : (
                                    <FileText className="w-4 h-4" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-900 truncate">{att.name}</p>
                                  <p className="text-[10px] text-slate-400 uppercase font-semibold">
                                    {att.type} {att.sizeMB ? `• ${att.sizeMB} MB` : ''}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                {att.type === 'link' ? (
                                  <a
                                    href={att.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-2 rounded-xl text-indigo-600 hover:bg-indigo-50 transition-colors"
                                    title="Buka Tautan"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenTeacherPreview(att.name, att.url || '', att.type)}
                                      className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                                      title="Pratinjau Berkas"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    {att.url && (
                                      <a
                                        href={att.url}
                                        download={att.name}
                                        className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                        title="Unduh Berkas"
                                      >
                                        <Download className="w-4 h-4" />
                                      </a>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Student's Submission Status or Action CTA */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                      <div>
                        {isGraded ? (
                          <div className="space-y-0.5">
                            <span className="text-xs font-black text-emerald-800 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Tugas telah dinilai dengan skor {sub?.score}/{task.maxScore}</span>
                            </span>
                            {sub?.feedback && (
                              <p className="text-xs text-slate-600 italic">"{sub.feedback}"</p>
                            )}
                          </div>
                        ) : isSubmitted ? (
                          <span className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-blue-600" />
                            <span>Tugas sudah dikumpulkan pada {formatDateIndo(sub?.submittedAt)}</span>
                          </span>
                        ) : isRevision ? (
                          <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 text-amber-600" />
                            <span>Guru meminta perbaikan: "{sub?.feedback}"</span>
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-slate-600">
                            Tugas ini belum kamu kumpulkan. Kerjakan sesuai petunjuk dan lampirkan berkas jika ada.
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveModalAssignment(task)}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        <span>{isSubmitted ? 'Buka Kiriman Tugas' : 'Buka & Kerjakan Tugas'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Student Assignment Detail & Submission Modal */}
      {activeModalAssignment && (
        <StudentAssignmentDetailModal
          assignment={activeModalAssignment}
          onClose={() => {
            setActiveModalAssignment(null);
            if (onClearSelected) onClearSelected();
          }}
        />
      )}

      {/* File Preview Modal */}
      {previewFiles && (
        <FilePreviewModal
          isOpen={Boolean(previewFiles)}
          onClose={() => setPreviewFiles(null)}
          files={previewFiles}
          initialIndex={previewIdx}
          title="Pratinjau Lampiran Guru"
          subtitle="Berkas Referensi"
        />
      )}
    </div>
  );
};
