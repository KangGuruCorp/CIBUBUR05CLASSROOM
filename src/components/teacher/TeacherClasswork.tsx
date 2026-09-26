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
  Edit2,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Filter,
  Image as ImageIcon,
  MoreVertical,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Users,
  X,
  Youtube,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Assignment, Submission } from '../../types';
import { formatDateIndo, formatDayAndDateIndo, getDateKey, getEffectiveTaskStatus } from '../../utils/gamification';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EmptyState } from '../common/EmptyState';
import { PointIcon } from '../common/PointIcon';
import { StatusPill } from '../common/StatusPill';
import { YouTubeEmbed } from '../common/YouTubeEmbed';
import { ClassworkEditorModal } from '../classroom/ClassworkEditorModal';
import { TeacherGradingModal } from './TeacherGradingModal';
import { FilePreviewModal } from '../common/FilePreviewModal';

interface TeacherClassworkProps {
  isCreateOpenInitially?: boolean;
  initialCreateType?: any;
  onCloseInitialCreate?: () => void;
  selectedItemId?: string | null;
}

export const TeacherClasswork: React.FC<TeacherClassworkProps> = ({
  isCreateOpenInitially = false,
  onCloseInitialCreate,
  selectedItemId = null,
}) => {
  const {
    assignments,
    submissions,
    users,
    currentClassId,
    classes,
    deleteAssignment,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'published' | 'scheduled' | 'draft'>('all');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(selectedItemId);

  // Modals state
  const [isEditorOpen, setIsEditorOpen] = useState(isCreateOpenInitially);
  const [editingTask, setEditingTask] = useState<Assignment | null>(null);
  const editingItemProp = useMemo(() => {
    return editingTask ? { id: editingTask.id, data: editingTask } : null;
  }, [editingTask]);

  const [taskToDelete, setTaskToDelete] = useState<Assignment | null>(null);
  const [gradingSubmission, setGradingSubmission] = useState<{
    submission: Submission;
    assignment: Assignment;
    studentName: string;
  } | null>(null);

  // File Preview modal
  const [previewFile, setPreviewFile] = useState<{
    name: string;
    url: string;
    type?: string;
  } | null>(null);

  // Keep track of active submission sub-tab inside expanded card: 'all' | 'needs_grading' | 'graded' | 'not_submitted'
  const [submissionFilter, setSubmissionFilter] = useState<'all' | 'needs_grading' | 'graded' | 'not_submitted'>('all');

  const currentClass = classes.find((c) => c.id === currentClassId);
  const classStudents = useMemo(() => {
    return users.filter(
      (u) => u.role === 'student' && (u.classIds || []).includes(currentClassId)
    );
  }, [users, currentClassId]);

  // Handle external trigger for initial open
  useEffect(() => {
    if (isCreateOpenInitially) {
      setEditingTask(null);
      setIsEditorOpen(true);
    }
  }, [isCreateOpenInitially]);

  useEffect(() => {
    if (selectedItemId) {
      setExpandedTaskId(selectedItemId);
    }
  }, [selectedItemId]);

  // Extract unique topics for filter
  const topics = useMemo(() => {
    const set = new Set<string>();
    assignments.forEach((a) => {
      if (a.topic && a.topic.trim()) set.add(a.topic.trim());
    });
    return Array.from(set).sort();
  }, [assignments]);

  // Filter tasks belonging to current class
  const classTasks = useMemo(() => {
    return assignments.filter((a) => (a.classIds || []).includes(currentClassId));
  }, [assignments, currentClassId]);

  // Filtered list
  const filteredTasks = useMemo(() => {
    return classTasks.filter((task) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesInstr = (task.instructions || '').toLowerCase().includes(q);
        const matchesSubject = (task.subject || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesInstr && !matchesSubject) return false;
      }

      // Topic
      if (selectedTopic !== 'all') {
        if ((task.topic || '') !== selectedTopic) return false;
      }

      // Status
      if (selectedStatus !== 'all') {
        const effective = getEffectiveTaskStatus(task.status, task.openAt);
        if (effective !== selectedStatus) return false;
      }

      return true;
    });
  }, [classTasks, searchQuery, selectedTopic, selectedStatus]);

  // Group tasks by publish / open date (kapan tugas terbit)
  const groupedTasks = useMemo(() => {
    const map = new Map<string, { dateLabel: string; tasks: Assignment[] }>();

    // Sort newest publish date first
    const sorted = [...filteredTasks].sort((a, b) => {
      const dateA = new Date(a.openAt || a.createdAt || a.dueAt || 0).getTime();
      const dateB = new Date(b.openAt || b.createdAt || b.dueAt || 0).getTime();
      return dateB - dateA;
    });

    sorted.forEach((task) => {
      const dateStr = task.openAt || task.createdAt || task.dueAt;
      const key = getDateKey(dateStr);
      const label = formatDayAndDateIndo(dateStr);

      if (!map.has(key)) {
        map.set(key, { dateLabel: label, tasks: [] });
      }
      map.get(key)!.tasks.push(task);
    });

    const list: { dateKey: string; dateLabel: string; tasks: Assignment[] }[] = [];
    map.forEach((val, key) => {
      list.push({ dateKey: key, dateLabel: val.dateLabel, tasks: val.tasks });
    });

    return list;
  }, [filteredTasks]);

  // Calculate stats for a given task
  const getTaskStats = (task: Assignment) => {
    const assignedStudents =
      task.assignedUserIds && task.assignedUserIds.length > 0
        ? classStudents.filter((s) => task.assignedUserIds!.includes(s.uid))
        : classStudents;

    const totalTarget = assignedStudents.length;
    let submittedCount = 0;
    let gradedCount = 0;
    let revisionCount = 0;

    assignedStudents.forEach((st) => {
      const sub = submissions[`${task.id}_${st.uid}`];
      if (sub) {
        if (sub.status === 'submitted' || sub.status === 'resubmitted') {
          submittedCount++;
        } else if (sub.status === 'graded') {
          gradedCount++;
        } else if (sub.status === 'revision_requested') {
          revisionCount++;
        }
      }
    });

    const notSubmittedCount = Math.max(0, totalTarget - (submittedCount + gradedCount + revisionCount));

    return {
      totalTarget,
      submittedCount,
      gradedCount,
      revisionCount,
      notSubmittedCount,
      assignedStudents,
    };
  };

  const handleOpenCreateModal = () => {
    setEditingTask(null);
    setIsEditorOpen(true);
  };

  const handleOpenEditModal = (task: Assignment, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTask(task);
    setIsEditorOpen(true);
  };

  const handleDeleteTask = (task: Assignment, e: React.MouseEvent) => {
    e.stopPropagation();
    setTaskToDelete(task);
  };

  const confirmDelete = () => {
    if (!taskToDelete) return;
    deleteAssignment(taskToDelete.id);
    if (expandedTaskId === taskToDelete.id) {
      setExpandedTaskId(null);
    }
    setTaskToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {currentClass?.name || 'Kelas Aktif'}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-500">
              {classTasks.length} Tugas Dibuat
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
            Tugas Kelas
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">
            Posting tugas dengan judul, petunjuk instruksi, dan lampiran referensi. Pantau dan periksa kiriman murid dengan mudah.
          </p>
        </div>

        {/* Primary Action Button: Posting Tugas Baru */}
        <div>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-sm shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>Posting Tugas Baru</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        {/* Search input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul tugas, petunjuk, atau subjek..."
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
        <div className="flex items-center gap-1 overflow-x-auto p-1 bg-slate-100/70 rounded-xl">
          {[
            { id: 'all', label: 'Semua Tugas' },
            { id: 'published', label: 'Diterbitkan' },
            { id: 'scheduled', label: 'Terjadwal' },
            { id: 'draft', label: 'Draf' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setSelectedStatus(st.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedStatus === st.id
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Topic Filter Dropdown */}
        {topics.length > 0 && (
          <div className="shrink-0">
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Semua Topik / Bab</option>
              {topics.map((top) => (
                <option key={top} value={top}>
                  {top}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title={searchQuery ? 'Tugas Tidak Ditemukan' : 'Belum Ada Tugas di Kelas Ini'}
          description={
            searchQuery
              ? 'Coba ganti kata kunci pencarian atau sesuaikan filter status di atas.'
              : 'Guru belum memposting tugas untuk murid di kelas ini. Klik tombol di bawah untuk membuat tugas baru.'
          }
          action={
            !searchQuery
              ? {
                  label: 'Posting Tugas Pertama',
                  onClick: handleOpenCreateModal,
                }
              : undefined
          }
        />
      ) : (
        <div className="space-y-6">
          {groupedTasks.map((group, groupIdx) => (
            <div key={group.dateKey} className="space-y-3">
              {/* Thin Date Separator with Day & Date */}
              <div className={`flex items-center gap-3 ${groupIdx > 0 ? 'pt-4' : 'pt-1'} pb-1`}>
                <div className="h-[1px] flex-1 bg-slate-200/90" />
                <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-slate-100/90 text-slate-500 text-[11px] font-semibold border border-slate-200/70 shadow-2xs shrink-0 select-none">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>{group.dateLabel}</span>
                </div>
                <div className="h-[1px] flex-1 bg-slate-200/90" />
              </div>

              {/* Tasks List for this date */}
              <div className="space-y-4">
                {group.tasks.map((task) => {
                  const isExpanded = expandedTaskId === task.id;
                  const stats = getTaskStats(task);
                  const hasAttachments = (task.attachments && task.attachments.length > 0) || task.youtubeUrl;
                  const effectiveStatus = getEffectiveTaskStatus(task.status, task.openAt);

            return (
              <div
                key={task.id}
                className={`bg-white rounded-3xl border transition-all duration-200 overflow-hidden ${
                  isExpanded
                    ? 'border-indigo-200 shadow-md ring-1 ring-indigo-500/10'
                    : 'border-slate-200/90 shadow-2xs hover:border-slate-300'
                }`}
              >
                {/* Task Card Header (Click to expand/collapse) */}
                <div
                  onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                  className="p-5 sm:p-6 cursor-pointer select-none flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                        effectiveStatus === 'published'
                          ? 'bg-indigo-600 text-white shadow-indigo-200'
                          : effectiveStatus === 'scheduled'
                          ? 'bg-amber-500 text-white shadow-amber-200'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      <CheckSquare className="w-6 h-6" />
                    </div>

                    <div className="min-w-0 space-y-1.5 flex-1">
                      {/* Pills */}
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                           {task.subject}
                        </span>

                        {task.topic && (
                          <span className="font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {task.topic}
                          </span>
                        )}

                        <StatusPill status={effectiveStatus as any} />

                        {hasAttachments && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            <span>
                              {(task.attachments?.length || 0) + (task.youtubeUrl ? 1 : 0)} Lampiran
                            </span>
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug font-display">
                        {task.title}
                      </h3>

                      {/* Metadata Row */}
                      <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                        {task.dueAt ? (
                          <span className="flex items-center gap-1.5 font-medium">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Tenggat: {formatDateIndo(task.dueAt)}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Tanpa tenggat waktu</span>
                        )}

                        <span className="text-slate-300">•</span>

                        <span className="font-medium text-slate-700">
                          Maks: {task.maxScore > 0 ? `${task.maxScore} Poin` : 'Tidak Dinilai'}
                        </span>

                        <span className="text-slate-300">•</span>

                        <span className="flex items-center gap-1 font-bold text-amber-700" title="Hadiah Poin Leaderboard">
                          <PointIcon className="w-3 h-3" />
                          <span>+{task.rewardPoints} Pts</span>
                        </span>

                        <span className="text-slate-300">•</span>

                        <span className="flex items-center gap-1 font-bold text-indigo-700" title="Hadiah XP Leveling">
                          <Sparkles className="w-3 h-3 text-indigo-600" />
                          <span>+{task.rewardXp !== undefined ? task.rewardXp : task.rewardPoints} XP</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Quick Stats & Controls */}
                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                    {/* Submission Badges */}
                    <div className="flex items-center gap-2 text-xs">
                      <div className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200/70 font-bold flex flex-col items-center">
                        <span className="text-[10px] text-amber-700 uppercase font-semibold">Perlu Dinilai</span>
                        <span className="text-sm font-black">{stats.submittedCount}</span>
                      </div>

                      <div className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200/70 font-bold flex flex-col items-center">
                        <span className="text-[10px] text-emerald-700 uppercase font-semibold">Dinilai</span>
                        <span className="text-sm font-black">{stats.gradedCount}</span>
                      </div>

                      <div className="px-3 py-1.5 rounded-xl bg-slate-50 text-slate-700 border border-slate-200/70 font-bold flex flex-col items-center">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Belum</span>
                        <span className="text-sm font-black">{stats.notSubmittedCount}</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 pl-2">
                      <button
                        type="button"
                        onClick={(e) => handleOpenEditModal(task, e)}
                        className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                        title="Edit Tugas"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteTask(task, e)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Hapus Tugas"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="p-2 text-slate-400">
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-indigo-600" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/40 p-5 sm:p-6 space-y-6">
                    {/* Petunjuk Tugas Section */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                        Petunjuk Pengerjaan Tugas
                      </h4>
                      {task.instructions ? (
                        <div className="text-sm text-slate-800 whitespace-pre-line leading-relaxed font-sans">
                          {task.instructions}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Tidak ada petunjuk khusus tertulis.</p>
                      )}
                    </div>

                    {/* Lampiran Guru (Teacher's Attachments) */}
                    {hasAttachments && (
                      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-indigo-600" />
                          <span>Lampiran Referensi dari Guru</span>
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

                          {/* Files & Links */}
                          {task.attachments?.map((att, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 transition-colors flex items-center justify-between gap-3 shadow-2xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                  {att.type === 'link' ? (
                                    <ExternalLink className="w-5 h-5" />
                                  ) : att.type === 'image' ? (
                                    <ImageIcon className="w-5 h-5" />
                                  ) : (
                                    <FileText className="w-5 h-5" />
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
                                      onClick={() =>
                                        setPreviewFile({
                                          name: att.name,
                                          url: att.url || '',
                                          type: att.type,
                                        })
                                      }
                                      className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
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

                    {/* Daftar Pengumpulan Murid (Submissions Section) */}
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-black text-slate-900 font-display flex items-center gap-2">
                            <FileCheck className="w-4 h-4 text-indigo-600" />
                            <span>Pengumpulan Tugas Siswa ({stats.totalTarget} Siswa)</span>
                          </h4>
                          <p className="text-xs text-slate-500">
                            Periksa jawaban teks dan berkas lampiran yang dikumpulkan oleh murid
                          </p>
                        </div>

                        {/* Filter Submissions */}
                        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200/80">
                          {[
                            { id: 'all', label: `Semua (${stats.totalTarget})` },
                            { id: 'needs_grading', label: `Perlu Nilai (${stats.submittedCount})` },
                            { id: 'graded', label: `Dinilai (${stats.gradedCount})` },
                            { id: 'not_submitted', label: `Belum (${stats.notSubmittedCount})` },
                          ].map((tab) => (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setSubmissionFilter(tab.id as any)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                submissionFilter === tab.id
                                  ? 'bg-indigo-600 text-white'
                                  : 'text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Students Submissions Table / Cards */}
                      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden divide-y divide-slate-100 shadow-2xs">
                        {stats.assignedStudents.filter((st) => {
                          const sub = submissions[`${task.id}_${st.uid}`];
                          if (submissionFilter === 'needs_grading') {
                            return sub && (sub.status === 'submitted' || sub.status === 'resubmitted');
                          }
                          if (submissionFilter === 'graded') {
                            return sub && sub.status === 'graded';
                          }
                          if (submissionFilter === 'not_submitted') {
                            return !sub || sub.status === 'draft';
                          }
                          return true;
                        }).length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-400">
                            Tidak ada siswa dalam kategori filter ini.
                          </div>
                        ) : (
                          stats.assignedStudents
                            .filter((st) => {
                              const sub = submissions[`${task.id}_${st.uid}`];
                              if (submissionFilter === 'needs_grading') {
                                return sub && (sub.status === 'submitted' || sub.status === 'resubmitted');
                              }
                              if (submissionFilter === 'graded') {
                                return sub && sub.status === 'graded';
                              }
                              if (submissionFilter === 'not_submitted') {
                                return !sub || sub.status === 'draft';
                              }
                              return true;
                            })
                            .map((student) => {
                              const sub = submissions[`${task.id}_${student.uid}`];
                              const isSubmitted = sub && (sub.status === 'submitted' || sub.status === 'resubmitted');
                              const isGraded = sub && sub.status === 'graded';
                              const isRevision = sub && sub.status === 'revision_requested';

                              return (
                                <div
                                  key={student.uid}
                                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                                >
                                  {/* Student Info */}
                                  <div className="flex items-center gap-3 min-w-0">
                                    <img
                                      src={student.avatarUrl}
                                      alt={student.displayName}
                                      className="w-10 h-10 rounded-full bg-slate-100 object-cover shrink-0 border border-slate-200"
                                    />
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <h5 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                          {student.displayName}
                                        </h5>
                                        {student.studentNumber && (
                                          <span className="text-[10px] text-slate-400 font-semibold">
                                            NIS: {student.studentNumber}
                                          </span>
                                        )}
                                      </div>

                                      {/* Submission timestamp & file count */}
                                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                                        {sub?.submittedAt ? (
                                          <span>Dikirim: {formatDateIndo(sub.submittedAt)}</span>
                                        ) : (
                                          <span className="italic text-slate-400">Belum menyerahkan tugas</span>
                                        )}

                                        {sub?.isLate && (
                                          <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-extrabold text-[10px]">
                                            Terlambat
                                          </span>
                                        )}

                                        {sub?.files && sub.files.length > 0 && (
                                          <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-extrabold text-[10px] flex items-center gap-1">
                                            <FileText className="w-3 h-3" />
                                            <span>{sub.files.length} Berkas Lampiran</span>
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Middle / Right: Student answer preview & Grade button */}
                                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                                    {/* Status Badge & Score */}
                                    <div className="text-right">
                                      {isGraded ? (
                                        <div className="flex flex-col items-end">
                                          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            <span>Nilai: {sub?.score}/{task.maxScore}</span>
                                          </span>
                                          {sub?.feedback && (
                                            <span className="text-[10px] text-slate-400 max-w-[150px] truncate mt-0.5">
                                              "{sub.feedback}"
                                            </span>
                                          )}
                                        </div>
                                      ) : isSubmitted ? (
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                                          Menunggu Penilaian
                                        </span>
                                      ) : isRevision ? (
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                                          Perlu Revisi
                                        </span>
                                      ) : (
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
                                          Belum Mengumpulkan
                                        </span>
                                      )}
                                    </div>

                                    {/* Grade / View Action */}
                                    <div>
                                      {sub && sub.status !== 'draft' ? (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setGradingSubmission({
                                              submission: sub,
                                              assignment: task,
                                              studentName: student.displayName,
                                            })
                                          }
                                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                            isSubmitted
                                              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                          }`}
                                        >
                                          <Award className="w-3.5 h-3.5" />
                                          <span>{isGraded ? 'Ubah Nilai' : 'Beri Nilai'}</span>
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          disabled
                                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-400 cursor-not-allowed"
                                        >
                                          Belum Ada Berkas
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    ))}
  </div>
)}

      {/* Editor Modal for Posting / Editing Tasks */}
      <ClassworkEditorModal
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingTask(null);
          if (onCloseInitialCreate) onCloseInitialCreate();
        }}
        editingItem={editingItemProp}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(taskToDelete)}
        title="Hapus Tugas Kelas?"
        message={`Apakah Anda yakin ingin menghapus tugas "${taskToDelete?.title}"? Seluruh data pengumpulan siswa pada tugas ini juga akan terhapus.`}
        confirmLabel="Hapus Tugas"
        cancelLabel="Batal"
        isDanger={true}
        onConfirm={confirmDelete}
        onCancel={() => setTaskToDelete(null)}
      />

      {/* Teacher Grading & Review Modal */}
      {gradingSubmission && (
        <TeacherGradingModal
          isOpen={Boolean(gradingSubmission)}
          onClose={() => setGradingSubmission(null)}
          submission={gradingSubmission.submission}
          assignment={gradingSubmission.assignment}
          studentName={gradingSubmission.studentName}
        />
      )}

      {/* Full File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          isOpen={Boolean(previewFile)}
          onClose={() => setPreviewFile(null)}
          fileUrl={previewFile.url}
          fileName={previewFile.name}
          fileType={previewFile.type || 'pdf'}
          files={[
            {
              name: previewFile.name,
              url: previewFile.url,
              previewUrl: previewFile.url,
              type: previewFile.type || 'pdf',
            },
          ]}
        />
      )}
    </div>
  );
};
