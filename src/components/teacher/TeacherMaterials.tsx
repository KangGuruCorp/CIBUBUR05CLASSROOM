import React, { useState, useRef } from 'react';
import {
  AlertCircle,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Edit2,
  ExternalLink,
  FileText,
  Filter,
  Image as ImageIcon,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Material, MaterialAttachment } from '../../types';
import { formatDateIndo, formatShortDate } from '../../utils/gamification';
import {
  STANDARD_SUBJECTS,
  StandardSubject,
  SUBJECT_CONFIGS,
  matchSubjectToStandard,
  getSubjectTemplateImage,
} from '../../utils/materialTemplates';
import {
  getYouTubeThumbnailUrl,
  getYouTubeVideoId,
  SAMPLE_EDUCATIONAL_VIDEOS,
} from '../../utils/youtube';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EmptyState } from '../common/EmptyState';
import { PointIcon } from '../common/PointIcon';
import { YouTubeEmbed } from '../common/YouTubeEmbed';
import { ImageCropModal } from '../common/ImageCropModal';

interface TeacherMaterialsProps {
  isCreateOpenInitially?: boolean;
  onCloseInitialCreate?: () => void;
}

export const TeacherMaterials: React.FC<TeacherMaterialsProps> = ({
  isCreateOpenInitially = false,
  onCloseInitialCreate,
}) => {
  const { materials, currentClassId, saveMaterial, deleteMaterial } = useApp();

  const [isEditorOpen, setIsEditorOpen] = useState(isCreateOpenInitially);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');

  // Form State
  const [title, setTitle] = useState('');
  const [selectedStandardSubject, setSelectedStandardSubject] = useState<StandardSubject>('Matematika');
  const [customSubject, setCustomSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [contentBody, setContentBody] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [isCustomCover, setIsCustomCover] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeTitle, setYoutubeTitle] = useState('');
  const [rewardPoints, setRewardPoints] = useState<number>(20);
  const [status, setStatus] = useState<'published' | 'scheduled' | 'draft'>('published');
  const [publishAt, setPublishAt] = useState('');
  const [attachments, setAttachments] = useState<MaterialAttachment[]>([]);

  // Custom cover upload & crop
  const [cropSourceImage, setCropSourceImage] = useState('');
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  // Temporary attachment inputs
  const [newAttName, setNewAttName] = useState('');
  const [newAttType, setNewAttType] = useState<'pdf' | 'image' | 'link'>('pdf');

  React.useEffect(() => {
    if (isCreateOpenInitially) {
      handleOpenCreate();
      onCloseInitialCreate?.();
    }
  }, [isCreateOpenInitially]);

  const handleSubjectChange = (newSub: StandardSubject) => {
    setSelectedStandardSubject(newSub);
    // Automatically switch cover image to the template image of the chosen subject if not custom
    if (!isCustomCover) {
      setCoverUrl(SUBJECT_CONFIGS[newSub]?.defaultImage || SUBJECT_CONFIGS.Lainnya.defaultImage);
    }
  };

  const handleOpenCreate = () => {
    setEditingMaterial(null);
    setTitle('');
    setSelectedStandardSubject('Matematika');
    setCustomSubject('');
    setTopic('');
    setDescription('');
    setContentBody('');
    setCoverUrl(SUBJECT_CONFIGS['Matematika'].defaultImage);
    setIsCustomCover(false);
    setYoutubeUrl('');
    setYoutubeTitle('');
    setRewardPoints(20);
    setStatus('published');
    setPublishAt(new Date().toISOString().slice(0, 16));
    setAttachments([]);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (mat: Material) => {
    setEditingMaterial(mat);
    setTitle(mat.title);
    const matched = matchSubjectToStandard(mat.subject);
    setSelectedStandardSubject(matched);
    if (matched === 'Lainnya' && mat.subject !== 'Lainnya') {
      setCustomSubject(mat.subject);
    } else {
      setCustomSubject('');
    }
    setTopic(mat.topic || '');
    setDescription(mat.description);
    setContentBody(mat.contentBody || '');

    const defaultImg = SUBJECT_CONFIGS[matched]?.defaultImage || SUBJECT_CONFIGS.Lainnya.defaultImage;
    const isKnownTemplate =
      SUBJECT_CONFIGS[matched]?.presetImages.some((p) => p.url === mat.coverUrl) ||
      mat.coverUrl === defaultImg;

    setCoverUrl(mat.coverUrl || defaultImg);
    setIsCustomCover(Boolean(mat.coverUrl && !isKnownTemplate));

    setYoutubeUrl(mat.youtubeUrl || '');
    setYoutubeTitle(mat.youtubeTitle || '');
    setRewardPoints(mat.rewardPoints || 20);
    setStatus(mat.status as 'published' | 'scheduled' | 'draft');
    setPublishAt(mat.publishAt ? new Date(mat.publishAt).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16));
    setAttachments(mat.attachments || []);
    setIsEditorOpen(true);
  };

  const handleAddAttachment = () => {
    if (!newAttName.trim()) return;
    const newAtt: MaterialAttachment = {
      name: newAttName,
      type: newAttType,
      url: '#',
      sizeMB: 1.5,
    };
    setAttachments([...attachments, newAtt]);
    setNewAttName('');
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert('Judul dan ringkasan materi wajib diisi.');
      return;
    }

    const finalSubject =
      selectedStandardSubject === 'Lainnya' && customSubject.trim()
        ? customSubject.trim()
        : selectedStandardSubject;

    const finalCover = coverUrl || getSubjectTemplateImage(finalSubject);
    const finalPublishAt = publishAt ? new Date(publishAt).toISOString() : new Date().toISOString();

    const materialData: Partial<Material> = {
      id: editingMaterial?.id,
      classIds: [currentClassId],
      title: title.trim(),
      subject: finalSubject,
      topic: topic.trim(),
      description: description.trim(),
      contentBody: contentBody.trim(),
      coverUrl: finalCover,
      youtubeUrl: youtubeUrl.trim() || undefined,
      youtubeTitle: youtubeTitle.trim() || undefined,
      rewardPoints: Number(rewardPoints) || 20,
      status,
      publishAt: finalPublishAt,
      attachments,
    };

    saveMaterial(materialData);
    setIsEditorOpen(false);
  };

  const filteredMaterials = materials
    .filter((m) => {
      if (subjectFilter !== 'all') {
        const isStd = STANDARD_SUBJECTS.includes(subjectFilter as any);
        if (isStd) {
          if (m.subject !== subjectFilter && matchSubjectToStandard(m.subject) !== subjectFilter) {
            return false;
          }
        } else if (m.subject !== subjectFilter) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          m.title.toLowerCase().includes(q) ||
          m.subject.toLowerCase().includes(q) ||
          (m.topic && m.topic.toLowerCase().includes(q))
        );
      }
      return true;
    })
    .sort((a, b) => {
      const tB = new Date(b.createdAt || b.publishAt || 0).getTime();
      const tA = new Date(a.createdAt || a.publishAt || 0).getTime();
      if (tB !== tA) return tB - tA;
      return String(b.id || '').localeCompare(String(a.id || ''));
    });

  const subjects = [
    'all',
    ...STANDARD_SUBJECTS.filter((s) =>
      materials.some((m) => m.subject === s || matchSubjectToStandard(m.subject) === s)
    ),
    ...Array.from(
      new Set(
        materials
          .map((m) => m.subject)
          .filter(
            (s) => !STANDARD_SUBJECTS.includes(s as any) && matchSubjectToStandard(s) === 'Lainnya'
          )
      )
    ),
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-2">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Manajemen Bahan Ajar & Modul</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
              Kelola Materi Belajar
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Buat materi interaktif lengkap dengan rangkuman dan lampiran berkas bahan ajar
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Unggah Materi Baru</span>
          </button>
        </div>

        {/* Filters */}
        <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {subjects.map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => setSubjectFilter(sub)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  subjectFilter === sub
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {sub === 'all' ? 'Semua Mapel' : sub}
              </button>
            ))}
          </div>

          <div className="w-full sm:w-64 relative">
            <Search className="w-4 h-4 text-slate-400 absolute inset-y-0 left-3 my-auto pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari materi..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Materials Table/Cards */}
      {filteredMaterials.length === 0 ? (
        <EmptyState
          title="Belum Ada Materi"
          description="Tambahkan modul materi pertama agar siswa dapat mulai membaca dan belajar."
          actionLabel="Buat Materi Baru"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map((mat) => (
            <div
              key={mat.id}
              className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Cover Banner */}
                <div className="h-36 relative bg-slate-100 overflow-hidden">
                  <img
                    src={getSubjectTemplateImage(mat.subject, mat.coverUrl)}
                    alt={mat.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = getSubjectTemplateImage(mat.subject);
                    }}
                  />

                  <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                    <span className="px-2.5 py-1 rounded-lg bg-white/95 backdrop-blur-xs text-[11px] font-black text-indigo-700 shadow-xs">
                      {mat.subject}
                    </span>
                    {mat.status === 'scheduled' ? (
                      <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-xs flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-700" />
                        <span>Dijadwalkan</span>
                      </span>
                    ) : mat.status === 'draft' ? (
                      <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-slate-200 text-slate-700 shadow-xs">
                        Draf
                      </span>
                    ) : null}
                    <span className="px-2.5 py-1 rounded-lg bg-amber-400 text-amber-950 text-[11px] font-black shadow-xs flex items-center gap-1.5">
                      <PointIcon className="w-3.5 h-3.5" />
                      <span>+{mat.rewardPoints || 20} Poin</span>
                    </span>
                  </div>
                </div>

                <div className="p-5">
                  {mat.topic && (
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1 truncate">
                      {mat.topic}
                    </p>
                  )}
                  <h3 className="text-base font-bold text-slate-900 font-display line-clamp-2 leading-snug">
                    {mat.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    {mat.description}
                  </p>

                  {/* Posting Date */}
                  <div className="mt-3.5 flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>
                      {mat.status === 'scheduled' ? 'Jadwal Tayang: ' : 'Diposting: '}
                      <strong className="text-slate-700">{formatDateIndo(mat.publishAt || mat.createdAt)}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>{mat.attachments?.length || 0} Berkas</span>
                  {mat.youtubeUrl && (
                    <span className="text-red-600 font-bold flex items-center gap-1">
                      • <Video className="w-3 h-3" /> Ada Video
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(mat)}
                    className="p-2 rounded-xl text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition-colors"
                    title="Edit Materi"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTargetId(mat.id)}
                    className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors"
                    title="Hapus Materi"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
            <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                {editingMaterial ? 'Edit Materi Pembelajaran' : 'Unggah Materi Pembelajaran Baru'}
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
                  Judul Materi Modul *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Bab 2 - Perkembangbiakan Tumbuhan dan Hewan"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
                />
              </div>

              {/* Mapel & Topik */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Mata Pelajaran (Mapel) *</span>
                    <span className="text-[11px] text-indigo-600 font-semibold">11 Pilihan Mapel</span>
                  </label>
                  <select
                    required
                    value={selectedStandardSubject}
                    onChange={(e) => handleSubjectChange(e.target.value as StandardSubject)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-2xs cursor-pointer"
                  >
                    {STANDARD_SUBJECTS.map((sub, idx) => (
                      <option key={sub} value={sub}>
                        {idx + 1}. {sub} {SUBJECT_CONFIGS[sub]?.fullName && SUBJECT_CONFIGS[sub]?.fullName !== sub ? `(${SUBJECT_CONFIGS[sub]?.fullName})` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                    {SUBJECT_CONFIGS[selectedStandardSubject]?.description}
                  </p>

                  {selectedStandardSubject === 'Lainnya' && (
                    <div className="mt-2.5">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Nama Mapel Khusus / Muatan Lokal:
                      </label>
                      <input
                        type="text"
                        value={customSubject}
                        onChange={(e) => setCustomSubject(e.target.value)}
                        placeholder="Contoh: Bahasa Sunda, Pramuka, dsb."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Topik / Bab Pokok
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Contoh: Bilangan Pecahan, Tata Surya, Cerpen..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
                  />
                </div>
              </div>

              {/* Pratinjau Gambar Cover Materi Sesuai Mapel */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 via-indigo-50/20 to-purple-50/20 border border-slate-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-800">
                      Pratinjau Gambar Sampul (Cover) Materi
                    </span>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-700">
                    Template: {selectedStandardSubject}
                  </span>
                </div>

                {/* Live Banner Preview */}
                <div className="relative rounded-2xl overflow-hidden h-36 sm:h-44 border border-slate-200/80 shadow-xs bg-slate-100 group">
                  <img
                    src={coverUrl || SUBJECT_CONFIGS[selectedStandardSubject]?.defaultImage}
                    alt="Pratinjau Cover"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        SUBJECT_CONFIGS[selectedStandardSubject]?.defaultImage ||
                        SUBJECT_CONFIGS.Lainnya.defaultImage;
                    }}
                  />

                  {/* Overlay Gradient & Badges */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />

                  <div className="absolute top-3 left-3 flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-lg bg-white/95 backdrop-blur-xs text-[11px] font-black text-indigo-700 shadow-xs">
                      {selectedStandardSubject === 'Lainnya' && customSubject.trim()
                        ? customSubject
                        : selectedStandardSubject}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-400 text-amber-950 text-[11px] font-black shadow-xs flex items-center gap-1.5">
                      <PointIcon className="w-3.5 h-3.5" />
                      <span>+{rewardPoints || 20} Poin</span>
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 text-white pointer-events-none">
                    <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider truncate">
                      {topic || SUBJECT_CONFIGS[selectedStandardSubject]?.fullName}
                    </p>
                    <h4 className="text-sm font-extrabold line-clamp-1 text-white drop-shadow-xs font-display">
                      {title || 'Judul Materi Pembelajaran'}
                    </h4>
                  </div>
                </div>

                {/* Pilihan 3 Template Gambar Presets Sesuai Mapel */}
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5 font-semibold">
                    <span>Template Gambar Terkait Mapel {selectedStandardSubject}:</span>
                    {isCustomCover && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomCover(false);
                          setCoverUrl(SUBJECT_CONFIGS[selectedStandardSubject]?.defaultImage || '');
                        }}
                        className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Kembalikan ke Template Mapel</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {SUBJECT_CONFIGS[selectedStandardSubject]?.presetImages.map((preset, idx) => {
                      const isSelected = coverUrl === preset.url;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setCoverUrl(preset.url);
                            setIsCustomCover(false);
                          }}
                          className={`relative rounded-xl overflow-hidden border-2 transition-all p-0.5 text-left group cursor-pointer ${
                            isSelected
                              ? 'border-indigo-600 ring-2 ring-indigo-400/30 scale-[1.02]'
                              : 'border-slate-200 hover:border-indigo-300 opacity-80 hover:opacity-100'
                          }`}
                        >
                          <div className="h-14 sm:h-16 w-full rounded-lg overflow-hidden relative">
                            <img
                              src={preset.url}
                              alt={preset.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {isSelected && (
                              <div className="absolute top-1 right-1 bg-indigo-600 text-white p-0.5 rounded-full shadow-xs">
                                <Check className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                          <p className="text-[10px] font-semibold text-slate-700 truncate px-1 py-1">
                            {preset.title}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Opsi Upload Cover Sendiri */}
                <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-200/60">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => coverFileInputRef.current?.click()}
                      className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-[11px] flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Upload className="w-3 h-3 text-indigo-600" />
                      <span>Unggah Gambar Kustom</span>
                    </button>
                    <input
                      ref={coverFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const src = ev.target?.result as string;
                            setCropSourceImage(src);
                            setIsCropModalOpen(true);
                          };
                          reader.readAsDataURL(file);
                        }
                        e.target.value = '';
                      }}
                    />
                  </div>

                  <span className="text-[10px] text-slate-400 italic">
                    *Gambar otomatis menyesuaikan saat mapel dipilih
                  </span>
                </div>
              </div>

              {/* YouTube Video Section */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-red-50/50 via-slate-50 to-orange-50/30 border border-red-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-red-950 flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-red-600" />
                    <span>Sematan Video YouTube (Dapat Diputar Langsung oleh Murid)</span>
                  </label>
                  {youtubeUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setYoutubeUrl('');
                        setYoutubeTitle('');
                      }}
                      className="text-[11px] text-rose-600 hover:text-rose-800 font-bold"
                    >
                      Hapus Video
                    </button>
                  )}
                </div>

                <div>
                  <input
                    type="text"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="Tempel tautan YouTube, misal: https://www.youtube.com/watch?v=libKVRa01L8"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-red-200 bg-white text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Mendukung link standar YouTube, youtu.be, link embed, maupun shorts.
                  </p>
                </div>

                {youtubeUrl && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Judul / Keterangan Singkat Video
                    </label>
                    <input
                      type="text"
                      value={youtubeTitle}
                      onChange={(e) => setYoutubeTitle(e.target.value)}
                      placeholder="Contoh: Video Penjelasan Animasi Tata Surya"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                )}

                {/* Quick Presets for Teacher */}
                <div className="pt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Contoh Video Edukasi Cepat:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {SAMPLE_EDUCATIONAL_VIDEOS.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setYoutubeUrl(item.url);
                          setYoutubeTitle(item.title);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-red-300 hover:bg-red-50 text-[11px] text-slate-700 font-semibold transition-colors text-left truncate max-w-xs"
                      >
                        🎥 {item.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Preview if valid URL */}
                {youtubeUrl && getYouTubeVideoId(youtubeUrl) && (
                  <div className="pt-2">
                    <span className="text-[11px] font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Pratinjau Pemutar Video yang Akan Dilihat Siswa:</span>
                    </span>
                    <YouTubeEmbed
                      url={youtubeUrl}
                      title={youtubeTitle || title}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ringkasan Singkat (Muncul di kartu materi) *
                </label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tuliskan rangkuman 1-2 kalimat mengenai materi ini..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Isi Teks Lengkap Bahan Ajar
                </label>
                <textarea
                  rows={5}
                  value={contentBody}
                  onChange={(e) => setContentBody(e.target.value)}
                  placeholder="Tuliskan rangkuman materi lengkap, poin-poin penjelasan penting, atau petunjuk belajar..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 leading-relaxed"
                />
              </div>

              {/* Attachments */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lampiran Berkas PDF / Gambar Modul
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={newAttName}
                    onChange={(e) => setNewAttName(e.target.value)}
                    placeholder="Nama dokumen, misal: Modul_IPAS_Bab2.pdf"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <select
                    value={newAttType}
                    onChange={(e) => setNewAttType(e.target.value as any)}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  >
                    <option value="pdf">PDF</option>
                    <option value="image">Gambar</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddAttachment}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold"
                  >
                    Tambah
                  </button>
                </div>

                {attachments.length > 0 && (
                  <div className="space-y-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                    {attachments.map((att, idx) => (
                      <div
                        key={`${att.name}_${idx}`}
                        className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs"
                      >
                        <span className="font-semibold text-slate-700 truncate">{att.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(idx)}
                          className="text-rose-600 hover:text-rose-800 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Gamification Reward Points */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <PointIcon className="w-4 h-4" />
                    <span>Poin Reward Siswa Mempelajari Materi *</span>
                  </label>
                  <span className="text-xs font-black text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <PointIcon className="w-3 h-3" />
                    <span>+{rewardPoints} Poin</span>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={5}
                    max={100}
                    step={5}
                    required
                    value={rewardPoints}
                    onChange={(e) => setRewardPoints(Math.max(5, Math.min(100, Number(e.target.value) || 20)))}
                    className="w-28 px-3 py-2 rounded-xl border border-amber-200 text-xs sm:text-sm font-bold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <p className="text-[11px] text-amber-800/80 leading-relaxed">
                    Siswa akan otomatis memperoleh poin ini setelah membuka modul dan mengklik <strong>"Tandai Selesai Membaca"</strong>.
                  </p>
                </div>
              </div>

              {/* Status & Scheduling */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <label className="block text-xs font-bold text-slate-800">
                  Status Publikasi & Jadwal Tayang
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
                      name="material_status"
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
                      <p className="text-[10px] font-normal text-emerald-700/80 mt-0.5">Tampil langsung ke siswa</p>
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
                      name="material_status"
                      value="scheduled"
                      checked={status === 'scheduled'}
                      onChange={() => setStatus('scheduled')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Jadwalkan Publikasi</span>
                      </div>
                      <p className="text-[10px] font-normal text-amber-800/80 mt-0.5">Tayang pada waktu tertentu</p>
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
                      name="material_status"
                      value="draft"
                      checked={status === 'draft'}
                      onChange={() => setStatus('draft')}
                      className="text-slate-600 focus:ring-slate-500"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span>Simpan Draf</span>
                      </div>
                      <p className="text-[10px] font-normal text-slate-500 mt-0.5">Disembunyikan dari siswa</p>
                    </div>
                  </label>
                </div>

                {/* Date & Time Picker */}
                {status !== 'draft' && (
                  <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-slate-700 font-semibold">
                      <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>{status === 'scheduled' ? 'Jadwalkan Tayang Pada *' : 'Tanggal & Waktu Diposting'}</span>
                    </div>
                    <input
                      type="datetime-local"
                      required={status === 'scheduled'}
                      value={publishAt}
                      onChange={(e) => setPublishAt(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                    />
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
                  <span>Simpan Materi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Crop Modal for Custom Cover */}
      <ImageCropModal
        isOpen={isCropModalOpen}
        imageSrc={cropSourceImage}
        aspectRatio={16 / 9}
        title="Sesuaikan Sampul Materi Belajar"
        onCropComplete={(croppedDataUrl) => {
          setCoverUrl(croppedDataUrl);
          setIsCustomCover(true);
          setIsCropModalOpen(false);
        }}
        onCancel={() => {
          setIsCropModalOpen(false);
          setCropSourceImage('');
        }}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTargetId}
        title="Hapus Materi Belajar Ini?"
        message="Materi ini tidak akan dapat diakses lagi oleh siswa setelah dihapus."
        confirmLabel="Ya, Hapus Materi"
        isDanger={true}
        onConfirm={() => {
          if (deleteTargetId) {
            deleteMaterial(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};
