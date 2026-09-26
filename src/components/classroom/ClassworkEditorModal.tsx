import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  AlertCircle,
  Bold,
  Calendar,
  Check,
  CheckSquare,
  ChevronDown,
  Clock,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Users,
  X,
  Youtube,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Assignment, MaterialAttachment } from '../../types';
import { STANDARD_SUBJECTS } from '../../utils/materialTemplates';
import { PointIcon } from '../common/PointIcon';
import { YouTubeEmbed } from '../common/YouTubeEmbed';
import { getYouTubeVideoId } from '../../utils/youtube';
import { uploadFileToServer } from '../../lib/fileUploadService';

interface ClassworkEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem?: {
    id: string;
    data: Assignment;
  } | null;
}

export const ClassworkEditorModal: React.FC<ClassworkEditorModalProps> = ({
  isOpen,
  onClose,
  editingItem = null,
}) => {
  const { currentClassId, classes, users, saveAssignment, assignments, quizzes = [] } = useApp();

  // Core content fields
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [subject, setSubject] = useState('Matematika');
  const [topic, setTopic] = useState('');
  const [linkedQuizId, setLinkedQuizId] = useState('');
  const [isCreatingNewTopic, setIsCreatingNewTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');

  // Guru attachments
  const [attachments, setAttachments] = useState<MaterialAttachment[]>([]);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [showYoutubeInput, setShowYoutubeInput] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkInputUrl, setLinkInputUrl] = useState('');
  const [linkInputTitle, setLinkInputTitle] = useState('');
  const [editingLinkIdx, setEditingLinkIdx] = useState<number | null>(null);
  const [linkEditTitle, setLinkEditTitle] = useState('');
  const [linkEditUrl, setLinkEditUrl] = useState('');

  // Settings
  const [maxScore, setMaxScore] = useState<number | 'ungraded'>(100);
  const [rewardPoints, setRewardPoints] = useState(50);
  const [rewardXp, setRewardXp] = useState(50);
  const [hasDueDate, setHasDueDate] = useState(true);
  const [dueAt, setDueAt] = useState('');
  const [openAt, setOpenAt] = useState('');
  const [allowLate, setAllowLate] = useState(true);
  const [allowRevision, setAllowRevision] = useState(true);
  const [status, setStatus] = useState<'published' | 'scheduled' | 'draft'>('published');

  // Student targeting ("Tugaskan ke")
  const [isAllStudentsSelected, setIsAllStudentsSelected] = useState(true);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const instructionsTextareaRef = useRef<HTMLTextAreaElement>(null);
  const studentDropdownRef = useRef<HTMLDivElement>(null);
  const prevOpenRef = useRef(false);
  const prevEditingIdRef = useRef<string | null>(null);

  const currentClass = classes.find((c) => c.id === currentClassId);
  const classStudents = useMemo(() => {
    return users.filter(
      (u) => u.role === 'student' && (u.classIds || []).includes(currentClassId)
    );
  }, [users, currentClassId]);
  const studentCount = classStudents.length;

  const filteredClassStudents = useMemo(() => {
    if (!studentSearchQuery.trim()) return classStudents;
    const q = studentSearchQuery.toLowerCase();
    return classStudents.filter(
      (s) =>
        s.displayName.toLowerCase().includes(q) ||
        (s.studentNumber && s.studentNumber.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q))
    );
  }, [classStudents, studentSearchQuery]);

  // Existing topics for suggestions
  const existingTopics = useMemo(() => {
    const topicsSet = new Set<string>();
    assignments.forEach((a) => {
      if (a.topic && a.topic.trim()) topicsSet.add(a.topic.trim());
    });
    return Array.from(topicsSet).sort();
  }, [assignments]);

  // Close student dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (studentDropdownRef.current && !studentDropdownRef.current.contains(e.target as Node)) {
        setIsStudentDropdownOpen(false);
      }
    };
    if (isStudentDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isStudentDropdownOpen]);

  // Initialize or reset form ONLY when modal opens or target assignment changes
  useEffect(() => {
    if (!isOpen) {
      prevOpenRef.current = false;
      prevEditingIdRef.current = null;
      return;
    }

    const currentId = editingItem?.id || null;
    const isFirstOpen = !prevOpenRef.current;
    const isIdChanged = currentId !== prevEditingIdRef.current;

    // Prevent resetting form state if modal is already open and item has not changed
    if (!isFirstOpen && !isIdChanged) {
      return;
    }

    prevOpenRef.current = true;
    prevEditingIdRef.current = currentId;

    if (editingItem && editingItem.data) {
      const data = editingItem.data;
      setTitle(data.title || '');
      setInstructions(data.instructions || '');
      setSubject(data.subject || 'Matematika');
      setTopic(data.topic || '');
      setIsCreatingNewTopic(false);
      setNewTopicName('');
      setAttachments(data.attachments || []);
      setYoutubeUrl(data.youtubeUrl || '');
      setRewardPoints(data.rewardPoints ?? 50);
      setRewardXp(data.rewardXp ?? (data.rewardPoints ?? 50));
      setStatus(data.status === 'closed' || data.status === 'archived' ? 'published' : data.status);
      setMaxScore(data.maxScore ?? 100);
      setHasDueDate(Boolean(data.dueAt));
      setAllowLate(data.allowLate ?? true);
      setAllowRevision(data.allowRevision ?? true);
      setLinkedQuizId(data.linkedQuizId || '');

      if (data.dueAt) {
        try {
          const d = new Date(data.dueAt);
          setDueAt(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
        } catch {
          setDueAt('');
        }
      } else {
        setDueAt('');
      }

      if (data.openAt) {
        try {
          const d = new Date(data.openAt);
          setOpenAt(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
        } catch {
          setOpenAt('');
        }
      } else {
        setOpenAt('');
      }

      if (data.assignedUserIds && Array.isArray(data.assignedUserIds) && data.assignedUserIds.length > 0) {
        setIsAllStudentsSelected(false);
        setSelectedStudentIds(data.assignedUserIds);
      } else {
        setIsAllStudentsSelected(true);
        setSelectedStudentIds(classStudents.map((s) => s.uid));
      }
    } else {
      // Create new Task defaults
      setTitle('');
      setInstructions('');
      setSubject('Matematika');
      setTopic('');
      setIsCreatingNewTopic(false);
      setNewTopicName('');
      setAttachments([]);
      setYoutubeUrl('');
      setMaxScore(100);
      setRewardPoints(50);
      setRewardXp(50);
      setHasDueDate(true);
      setAllowLate(true);
      setAllowRevision(true);
      setLinkedQuizId('');
      setStatus('published');

      // Default due date: tomorrow 23:59
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 0, 0);
      setDueAt(new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16));

      // Default open date: right now
      const now = new Date();
      setOpenAt(new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16));

      setIsAllStudentsSelected(true);
      setSelectedStudentIds(classStudents.map((s) => s.uid));
    }

    setShowYoutubeInput(false);
    setShowLinkInput(false);
    setLinkInputUrl('');
    setLinkInputTitle('');
    setIsStudentDropdownOpen(false);
    setStudentSearchQuery('');
  }, [isOpen, editingItem?.id]);

  if (!isOpen) return null;

  // Insert markdown or text helper in instructions textarea
  const insertFormatting = (prefix: string, suffix: string = '') => {
    const el = instructionsTextareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const selectedText = text.substring(start, end) || 'teks';
    const newText = text.substring(0, start) + prefix + selectedText + suffix + text.substring(end);
    setInstructions(newText);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 0);
  };

  // Handle local file uploads (PDF, docs, images)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      let fileType: 'pdf' | 'doc' | 'image' | 'video' = 'pdf';
      if (file.type.startsWith('image/')) fileType = 'image';
      else if (file.type.includes('pdf')) fileType = 'pdf';
      else if (file.type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) fileType = 'doc';

      const fileUrl = await uploadFileToServer(file, 'attachments');

      const newAtt: MaterialAttachment = {
        name: file.name,
        type: fileType,
        url: fileUrl,
        sizeMB: Number((file.size / (1024 * 1024)).toFixed(2)),
      };
      setAttachments((prev) => [...prev, newAtt]);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Add External Link
  const handleAddLink = () => {
    if (!linkInputUrl.trim()) return;
    let url = linkInputUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    const newAtt: MaterialAttachment = {
      name: linkInputTitle.trim() || url,
      type: 'link',
      url: url,
    };
    setAttachments((prev) => [...prev, newAtt]);
    setLinkInputUrl('');
    setLinkInputTitle('');
    setShowLinkInput(false);
  };

  // Student selection helpers
  const handleToggleSelectAll = () => {
    if (isAllStudentsSelected) {
      setIsAllStudentsSelected(false);
      setSelectedStudentIds([]);
    } else {
      setIsAllStudentsSelected(true);
      setSelectedStudentIds(classStudents.map((s) => s.uid));
    }
  };

  const handleToggleStudent = (uid: string) => {
    if (isAllStudentsSelected) {
      setIsAllStudentsSelected(false);
      setSelectedStudentIds(classStudents.map((s) => s.uid).filter((id) => id !== uid));
      return;
    }

    if (selectedStudentIds.includes(uid)) {
      const next = selectedStudentIds.filter((id) => id !== uid);
      setSelectedStudentIds(next);
      if (next.length === classStudents.length) {
        setIsAllStudentsSelected(true);
      }
    } else {
      const next = [...selectedStudentIds, uid];
      setSelectedStudentIds(next);
      if (next.length === classStudents.length) {
        setIsAllStudentsSelected(true);
      }
    }
  };

  const getSuggestedScheduleDate = () => {
    const d = new Date();
    if (d.getHours() >= 17) {
      d.setDate(d.getDate() + 1);
      d.setHours(7, 0, 0, 0);
    } else {
      d.setHours(d.getHours() + 1, 0, 0, 0);
    }
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('Harap isi judul tugas terlebih dahulu.');
      return;
    }

    if (status === 'scheduled') {
      if (!openAt) {
        alert('Harap tentukan tanggal dan jam jadwal terbit tugas.');
        return;
      }
      if (hasDueDate && dueAt && new Date(openAt) >= new Date(dueAt)) {
        alert('Waktu jadwal terbit tidak boleh melebihi atau sama dengan batas waktu pengumpulan (tenggat).');
        return;
      }
    }

    const resolvedTopic = isCreatingNewTopic
      ? newTopicName.trim() || undefined
      : topic.trim() || undefined;

    const assignedIds = isAllStudentsSelected ? [] : selectedStudentIds;

    const payload: Partial<Assignment> = {
      title: title.trim(),
      instructions: instructions.trim(),
      subject: subject.trim(),
      topic: resolvedTopic,
      classIds: [currentClassId],
      assignedUserIds: assignedIds,
      attachments: attachments,
      youtubeUrl: youtubeUrl.trim() || undefined,
      maxScore: maxScore === 'ungraded' ? 0 : Number(maxScore),
      rewardPoints: Number(rewardPoints),
      rewardXp: Number(rewardXp),
      dueAt: hasDueDate && dueAt ? new Date(dueAt).toISOString() : '',
      openAt: openAt ? new Date(openAt).toISOString() : new Date().toISOString(),
      allowLate: allowLate,
      allowRevision: allowRevision,
      linkedQuizId: linkedQuizId.trim() || undefined,
      status: status,
      attachmentRules: {
        allowedTypes: [
          'image/jpeg',
          'image/png',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
        ],
        maxFiles: 5,
        maxSizeMB: 20,
      },
    };

    if (editingItem && editingItem.id) {
      payload.id = editingItem.id;
    }

    saveAssignment(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] animate-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 font-display">
                  {editingItem ? 'Edit Tugas' : 'Posting Tugas Baru'}
                </h2>
                <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {currentClass?.name || 'Kelas Aktif'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Isi judul, petunjuk pengerjaan, lampiran berkas, dan pengaturan tugas untuk murid
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Container (Scrollable) */}
        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {/* Title & Instructions */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                  Judul Tugas <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Latihan Soal Cerita Operasi Hitung Pecahan Bab 2"
                  className="w-full px-4 py-3 text-sm font-medium rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50/50"
                />
              </div>

              {/* Instructions Editor with Formatting Tools */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Petunjuk Pengerjaan Tugas
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Format teks pengerjaan yang jelas bagi murid
                  </span>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent bg-white">
                  {/* Text Formatting Toolbar */}
                  <div className="flex items-center gap-1 p-2 border-b border-slate-100 bg-slate-50/80 text-slate-600 flex-wrap">
                    <button
                      type="button"
                      onClick={() => insertFormatting('**', '**')}
                      className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors"
                      title="Tebal (Bold)"
                    >
                      <Bold className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('*', '*')}
                      className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors"
                      title="Miring (Italic)"
                    >
                      <Italic className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-slate-300 mx-1" />
                    <button
                      type="button"
                      onClick={() => insertFormatting('\n- ')}
                      className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors"
                      title="Daftar Poin"
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertFormatting('\n1. ')}
                      className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors"
                      title="Daftar Bernomor"
                    >
                      <ListOrdered className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-slate-300 mx-1" />
                    <button
                      type="button"
                      onClick={() => insertFormatting('[', '](https://)')}
                      className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors"
                      title="Sisipkan Tautan (Link)"
                    >
                      <LinkIcon className="w-4 h-4" />
                    </button>
                  </div>

                  <textarea
                    ref={instructionsTextareaRef}
                    rows={6}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Tuliskan petunjuk pengerjaan tugas secara rinci dan jelas untuk murid. Contoh:&#10;1. Bacalah materi pada lembar kerja terlampir&#10;2. Kerjakan soal latihan 1-5 di buku tugasmu&#10;3. Foto hasil pengerjaan tulisan tanganmu dan lampirkan di sini..."
                    className="w-full p-4 text-xs sm:text-sm border-0 focus:outline-none focus:ring-0 leading-relaxed bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Lampiran Guru (Attachments from Teacher) */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Paperclip className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-xs font-bold text-slate-800">Lampiran Materi & Tugas</h3>
                      <span className="text-[11px] text-slate-400 font-normal">(Opsional)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      Tambahkan berkas pendukung, video YouTube, atau tautan web untuk siswa
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Upload File button */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                    title="Unggah Berkas (PDF, Dokumen, Gambar)"
                  >
                    <Upload className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Berkas</span>
                  </button>

                  {/* Add YouTube */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowYoutubeInput((prev) => !prev);
                      setShowLinkInput(false);
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer shadow-2xs ${
                      showYoutubeInput || youtubeUrl
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                    title="Tambahkan Tautan Video YouTube"
                  >
                    <Youtube className="w-3.5 h-3.5 text-rose-600" />
                    <span>YouTube</span>
                  </button>

                  {/* Add Link */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowLinkInput((prev) => !prev);
                      setShowYoutubeInput(false);
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer shadow-2xs ${
                      showLinkInput
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                    title="Tambahkan Tautan Website"
                  >
                    <LinkIcon className="w-3.5 h-3.5 text-blue-600" />
                    <span>Tautan</span>
                  </button>
                </div>
              </div>

              {/* YouTube Input Box */}
              {showYoutubeInput && (
                <div className="p-3 bg-white border border-rose-200 rounded-xl space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Youtube className="w-3.5 h-3.5 text-rose-600" />
                      <span>URL Video YouTube</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowYoutubeInput(false)}
                      className="text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                        }
                      }}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                      autoFocus
                    />
                    {youtubeUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setYoutubeUrl('');
                          setShowYoutubeInput(false);
                        }}
                        className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                  {youtubeUrl && getYouTubeVideoId(youtubeUrl) && (
                    <div className="mt-2 max-w-sm rounded-lg overflow-hidden border border-slate-200">
                      <YouTubeEmbed url={youtubeUrl} title="Pratinjau YouTube" />
                    </div>
                  )}
                </div>
              )}

              {/* External Link Input Box */}
              {showLinkInput && (
                <div className="p-3 bg-white border border-blue-200 rounded-xl space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <LinkIcon className="w-3.5 h-3.5 text-blue-600" />
                      <span>Tautan Web Referensi</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowLinkInput(false)}
                      className="text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={linkInputTitle}
                      onChange={(e) => setLinkInputTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (linkInputUrl.trim()) handleAddLink();
                        }
                      }}
                      placeholder="Judul Tautan (Opsional)"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={linkInputUrl}
                      onChange={(e) => setLinkInputUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (linkInputUrl.trim()) handleAddLink();
                        }
                      }}
                      placeholder="https://..."
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setShowLinkInput(false)}
                      className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleAddLink}
                      disabled={!linkInputUrl.trim()}
                      className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Tambahkan
                    </button>
                  </div>
                </div>
              )}

              {/* YouTube attached card (when input box is closed) */}
              {youtubeUrl && !showYoutubeInput && (
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-rose-200/70 shadow-2xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                      <Youtube className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">Video YouTube</p>
                      <p className="text-[10px] text-slate-400 truncate">{youtubeUrl}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowYoutubeInput(true)}
                      className="px-2 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    >
                      Ubah
                    </button>
                    <button
                      type="button"
                      onClick={() => setYoutubeUrl('')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Hapus Video YouTube"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Attachments List */}
              {attachments.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                  {attachments.map((att, idx) => (
                    <div key={idx}>
                      {/* Inline edit form for link */}
                      {att.type === 'link' && editingLinkIdx === idx ? (
                        <div className="p-3 bg-white border border-blue-200 rounded-xl space-y-2 shadow-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800">Edit Tautan</span>
                            <button
                              type="button"
                              onClick={() => setEditingLinkIdx(null)}
                              className="text-slate-400 hover:text-slate-600 p-0.5"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={linkEditTitle}
                              onChange={(e) => setLinkEditTitle(e.target.value)}
                              placeholder="Judul Tautan (Opsional)"
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                              type="text"
                              value={linkEditUrl}
                              onChange={(e) => setLinkEditUrl(e.target.value)}
                              placeholder="https://..."
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingLinkIdx(null)}
                              className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                            >
                              Batal
                            </button>
                            <button
                              type="button"
                              disabled={!linkEditUrl.trim()}
                              onClick={() => {
                                if (!linkEditUrl.trim()) return;
                                let url = linkEditUrl.trim();
                                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                                  url = 'https://' + url;
                                }
                                setAttachments((prev) =>
                                  prev.map((a, i) =>
                                    i === idx
                                      ? { ...a, name: linkEditTitle.trim() || url, url }
                                      : a
                                  )
                                );
                                setEditingLinkIdx(null);
                              }}
                              className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Simpan
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                              {att.type === 'link' ? (
                                <ExternalLink className="w-3.5 h-3.5" />
                              ) : att.type === 'image' ? (
                                <ImageIcon className="w-3.5 h-3.5" />
                              ) : (
                                <FileText className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              {att.type === 'link' && att.url ? (
                                <a
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-bold text-blue-600 hover:underline truncate block"
                                  title={att.url}
                                >
                                  {att.name}
                                </a>
                              ) : (
                                <p className="text-xs font-bold text-slate-800 truncate">{att.name}</p>
                              )}
                              <p className="text-[10px] text-slate-400 uppercase">
                                {att.type} {att.sizeMB ? `• ${att.sizeMB} MB` : ''}
                                {att.type === 'link' && att.url && (
                                  <span className="normal-case ml-1 text-slate-300">— {att.url.length > 30 ? att.url.substring(0, 30) + '…' : att.url}</span>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {att.type === 'link' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingLinkIdx(idx);
                                  setLinkEditTitle(att.name === att.url ? '' : att.name);
                                  setLinkEditUrl(att.url || '');
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                title="Edit Tautan"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Hapus Lampiran"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state prompt */}
              {attachments.length === 0 && !youtubeUrl && !showYoutubeInput && !showLinkInput && (
                <div className="py-2.5 px-3 rounded-xl border border-dashed border-slate-200/90 bg-white/40 text-center text-xs text-slate-400">
                  Belum ada lampiran. Klik <span className="font-semibold text-slate-600">Berkas</span>, <span className="font-semibold text-slate-600">YouTube</span>, atau <span className="font-semibold text-slate-600">Tautan</span> di atas jika ingin menyematkan bahan.
                </div>
              )}
            </div>

            {/* Setingan Lainnya (Other Settings) */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                Pengaturan Tugas & Target Siswa
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tugaskan Ke (Target Siswa) */}
                <div className="relative" ref={studentDropdownRef}>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>Tugaskan Ke (Target Siswa)</span>
                    <span className="text-[11px] text-indigo-600 font-semibold">
                      {isAllStudentsSelected
                        ? `Semua Siswa (${studentCount})`
                        : `${selectedStudentIds.length} Siswa Terpilih`}
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setIsStudentDropdownOpen((prev) => !prev)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white text-left text-xs font-medium flex items-center justify-between hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Users className="w-4 h-4 text-slate-500 shrink-0" />
                      <span className="truncate">
                        {isAllStudentsSelected
                          ? `Semua Siswa (${studentCount} siswa)`
                          : `${selectedStudentIds.length} dari ${studentCount} siswa`}
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                  </button>

                  {/* Student Picker Dropdown */}
                  {isStudentDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 space-y-2.5 max-h-72 flex flex-col">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={studentSearchQuery}
                          onChange={(e) => setStudentSearchQuery(e.target.value)}
                          placeholder="Cari nama atau NIS..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="flex items-center justify-between px-1 py-1 border-b border-slate-100 text-xs">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 select-none">
                          <input
                            type="checkbox"
                            checked={isAllStudentsSelected}
                            onChange={handleToggleSelectAll}
                            className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                          />
                          <span>Pilih Semua Siswa</span>
                        </label>
                        <span className="text-[11px] text-slate-400">{filteredClassStudents.length} siswa</span>
                      </div>

                      <div className="overflow-y-auto space-y-1 flex-1 pr-1">
                        {filteredClassStudents.map((s) => {
                          const isChecked = isAllStudentsSelected || selectedStudentIds.includes(s.uid);
                          return (
                            <label
                              key={s.uid}
                              className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 text-xs cursor-pointer select-none transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleStudent(s.uid)}
                                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                />
                                <img
                                  src={s.avatarUrl}
                                  alt={s.displayName}
                                  className="w-6 h-6 rounded-full bg-slate-100 object-cover shrink-0"
                                />
                                <span className="font-semibold text-slate-800 truncate">{s.displayName}</span>
                              </div>
                              {s.studentNumber && (
                                <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                                  NIS: {s.studentNumber}
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Mata Pelajaran */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Mata Pelajaran</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {STANDARD_SUBJECTS.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                {/* Topik / Bab */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">Topik / Bab</label>
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewTopic((prev) => !prev)}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    >
                      {isCreatingNewTopic ? 'Pilih Topik yang Ada' : '+ Buat Topik Baru'}
                    </button>
                  </div>

                  {isCreatingNewTopic ? (
                    <input
                      type="text"
                      value={newTopicName}
                      onChange={(e) => setNewTopicName(e.target.value)}
                      placeholder="Ketik nama topik baru..."
                      className="w-full px-3.5 py-2.5 rounded-2xl border border-indigo-300 bg-indigo-50/30 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <select
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Tanpa Topik (Umum)</option>
                      {existingTopics.map((top) => (
                        <option key={top} value={top}>
                          {top}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Tenggat Waktu (Due Date) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">Tenggat Waktu Pengumpulan</label>
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!hasDueDate}
                        onChange={(e) => setHasDueDate(!e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                      />
                      <span>Tanpa Tenggat</span>
                    </label>
                  </div>

                  {hasDueDate ? (
                    <div className="relative">
                      <input
                        type="datetime-local"
                        value={dueAt}
                        onChange={(e) => setDueAt(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  ) : (
                    <div className="px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs text-slate-400 italic">
                      Murid dapat mengumpulkan tugas kapan saja tanpa batasan waktu.
                    </div>
                  )}
                </div>

                {/* Poin Nilai Maksimal */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Poin Nilai Maksimal</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={1000}
                      disabled={maxScore === 'ungraded'}
                      value={maxScore === 'ungraded' ? '' : maxScore}
                      onChange={(e) => setMaxScore(Number(e.target.value))}
                      placeholder="100"
                      className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setMaxScore(maxScore === 'ungraded' ? 100 : 'ungraded')}
                      className={`px-3 py-2.5 rounded-2xl text-xs font-bold border transition-colors whitespace-nowrap cursor-pointer ${
                        maxScore === 'ungraded'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {maxScore === 'ungraded' ? 'Tidak Dinilai ✓' : 'Tidak Dinilai'}
                    </button>
                  </div>
                </div>

                {/* Hadiah Poin & XP Gamifikasi */}
                <div className="space-y-3">
                  {/* Hadiah Poin (Leaderboard & Reward Guru) */}
                  <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80">
                    <label className="block text-xs font-bold text-amber-950 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <PointIcon className="w-3.5 h-3.5" />
                        <span>Hadiah Poin (Leaderboard)</span>
                      </span>
                      <span className="text-[11px] text-amber-800 font-extrabold">
                        +{rewardPoints} Pts
                      </span>
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[15, 25, 50, 100].map((pts) => (
                        <button
                          key={pts}
                          type="button"
                          onClick={() => setRewardPoints(pts)}
                          className={`py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            rewardPoints === pts
                              ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-2xs font-black'
                              : 'bg-white border-amber-200/70 text-slate-700 hover:bg-amber-100/50'
                          }`}
                        >
                          +{pts}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-amber-800/80 mt-1.5">
                      Poin dikumpulkan untuk juara peringkat kelas & reward guru.
                    </p>
                  </div>

                  {/* Hadiah XP (Kenaikan Level) */}
                  <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-200/80">
                    <label className="block text-xs font-bold text-indigo-950 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Hadiah XP (Naik Level)</span>
                      </span>
                      <span className="text-[11px] text-indigo-800 font-extrabold">
                        +{rewardXp} XP
                      </span>
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[25, 50, 75, 100].map((xpVal) => (
                        <button
                          key={xpVal}
                          type="button"
                          onClick={() => setRewardXp(xpVal)}
                          className={`py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            rewardXp === xpVal
                              ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs font-black'
                              : 'bg-white border-indigo-200/70 text-slate-700 hover:bg-indigo-100/50'
                          }`}
                        >
                          +{xpVal}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-indigo-800/80 mt-1.5">
                      XP digunakan siswa untuk meningkatkan level prestasi (Lvl 1 - 5).
                    </p>
                  </div>
                </div>
              </div>

              {/* Hubungkan dengan Kuis (Linked Quiz) */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/90 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-indigo-600" />
                    <span>Hubungkan dengan Kuis (Opsional)</span>
                  </label>
                  {linkedQuizId && (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                      🔗 Kuis Terhubung
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Setelah murid selesai mengirimkan tugas ini, mereka akan langsung diarahkan untuk mengerjakan kuis yang dipilih.
                </p>
                <div className="pt-1">
                  <select
                    value={linkedQuizId}
                    onChange={(e) => setLinkedQuizId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-white text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
                  >
                    <option value="">-- Tidak Dihubungkan / Tugas Mandiri --</option>
                    {quizzes
                      .filter(
                        (q) =>
                          q.status !== 'archived' &&
                          (q.classIds?.length ? q.classIds.includes(currentClassId) : true)
                      )
                      .map((q) => (
                        <option key={q.id} value={q.id}>
                          [{q.subject}] {q.title} ({q.questions.length} Soal)
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Toggles: Allow Late Submission & Allow Revision */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={allowLate}
                    onChange={(e) => setAllowLate(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span>Perbolehkan Pengumpulan Terlambat (Ditandai 'Terlambat')</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={allowRevision}
                    onChange={(e) => setAllowRevision(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span>Izinkan Murid Mengirim Revisi Bila Diminta Guru</span>
                </label>
              </div>
            </div>
          </div>

          {/* Modal Footer Buttons */}
          <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Status Posting:</span>
                <select
                  value={status}
                  onChange={(e) => {
                    const nextStatus = e.target.value as any;
                    setStatus(nextStatus);
                    if (nextStatus === 'scheduled') {
                      if (!openAt || new Date(openAt) <= new Date()) {
                        setOpenAt(getSuggestedScheduleDate());
                      }
                    }
                  }}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors focus:outline-none focus:ring-2 ${
                    status === 'scheduled'
                      ? 'border-amber-400 bg-amber-50 text-amber-950 focus:ring-amber-500'
                      : status === 'draft'
                      ? 'border-slate-300 bg-slate-100 text-slate-700 focus:ring-slate-400'
                      : 'border-slate-200 bg-white text-slate-700 focus:ring-indigo-500'
                  }`}
                >
                  <option value="published">Langsung Terbitkan (Aktif)</option>
                  <option value="scheduled">Jadwalkan Terbit</option>
                  <option value="draft">Simpan sebagai Draf</option>
                </select>
              </div>

              {/* Kalender dan Jam Langsung Muncul Saat 'Jadwalkan Terbit' Dipilih */}
              {status === 'scheduled' && (
                <div className="flex items-center gap-2 p-1.5 px-3 rounded-xl bg-amber-100/90 border border-amber-300 text-amber-950 shadow-2xs animate-in fade-in slide-in-from-left-2 duration-200">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 shrink-0">
                    <Calendar className="w-3.5 h-3.5 text-amber-700" />
                    <span>Waktu Terbit:</span>
                  </div>
                  <input
                    type="datetime-local"
                    required
                    value={openAt}
                    onChange={(e) => setOpenAt(e.target.value)}
                    className="text-xs font-bold px-2.5 py-1 rounded-lg border border-amber-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs cursor-pointer"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>

              <button
                type="submit"
                className={`px-6 py-2.5 rounded-xl text-white text-xs sm:text-sm font-bold shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer ${
                  status === 'scheduled'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
                    : status === 'draft'
                    ? 'bg-slate-700 hover:bg-slate-800 shadow-slate-200'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                }`}
              >
                {status === 'scheduled' ? (
                  <>
                    <Clock className="w-4 h-4" />
                    <span>{editingItem ? 'Simpan Jadwal Tugas' : 'Jadwalkan Tugas'}</span>
                  </>
                ) : status === 'draft' ? (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Simpan sebagai Draf</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-4 h-4" />
                    <span>{editingItem ? 'Simpan Perubahan Tugas' : 'Posting Tugas Sekarang'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
