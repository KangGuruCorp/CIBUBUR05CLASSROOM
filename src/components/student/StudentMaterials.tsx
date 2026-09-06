import React, { useState } from 'react';
import {
  BookMarked,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Image as ImageIcon,
  Search,
  Sparkles,
  Video,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Material } from '../../types';
import { formatDateIndo } from '../../utils/gamification';
import {
  STANDARD_SUBJECTS,
  matchSubjectToStandard,
  getSubjectTemplateImage,
  getSubjectTheme,
} from '../../utils/materialTemplates';
import { EmptyState } from '../common/EmptyState';
import { PointIcon } from '../common/PointIcon';
import { YouTubeEmbed } from '../common/YouTubeEmbed';
import { FilePreviewModal } from '../common/FilePreviewModal';

interface StudentMaterialsProps {
  selectedMaterialId?: string | null;
  onClearSelected?: () => void;
}

export const StudentMaterials: React.FC<StudentMaterialsProps> = ({
  selectedMaterialId,
  onClearSelected,
}) => {
  const { materials, materialProgress, currentUser, markMaterialCompleted } = useApp();
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeModalMaterial, setActiveModalMaterial] = useState<Material | null>(null);
  const [previewMaterialFileIdx, setPreviewMaterialFileIdx] = useState<number | null>(null);

  // If a selectedMaterialId prop was passed, open it
  React.useEffect(() => {
    if (selectedMaterialId) {
      const found = materials.find((m) => m.id === selectedMaterialId);
      if (found) setActiveModalMaterial(found);
    }
  }, [selectedMaterialId, materials]);

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

  const filteredMaterials = materials
    .filter((mat) => {
      if (mat.status === 'draft') return false;
      if (mat.status !== 'published' && mat.status !== 'scheduled') return false;
      if (selectedSubject !== 'all') {
        const isStd = STANDARD_SUBJECTS.includes(selectedSubject as any);
        if (isStd) {
          if (mat.subject !== selectedSubject && matchSubjectToStandard(mat.subject) !== selectedSubject) {
            return false;
          }
        } else if (mat.subject !== selectedSubject) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          mat.title.toLowerCase().includes(q) ||
          mat.description.toLowerCase().includes(q) ||
          mat.subject.toLowerCase().includes(q) ||
          (mat.topic && mat.topic.toLowerCase().includes(q))
        );
      }
      return true;
    })
    .sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;
      return b.id.localeCompare(a.id);
    });

  const handleOpenMaterial = (mat: Material) => {
    setActiveModalMaterial(mat);
  };

  const handleMarkDone = (matId: string) => {
    markMaterialCompleted(matId);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-2">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Modul & Bahan Ajar Digital</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
              Materi Belajar Interaktif
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Pelajari rangkuman, tonton video YouTube edukasi, dan unduh lembar kerja dari gurumu.
            </p>
          </div>

          {/* Search bar */}
          <div className="w-full sm:w-72 relative">
            <Search className="w-4 h-4 text-slate-400 absolute inset-y-0 left-3 my-auto pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari materi atau topik..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Subject Filter Pills */}
        <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {subjects.map((sub) => (
            <button
              key={sub}
              type="button"
              onClick={() => setSelectedSubject(sub)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedSubject === sub
                  ? 'bg-indigo-600 text-white shadow-sm scale-105'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {sub === 'all' ? 'Semua Mata Pelajaran' : sub}
            </button>
          ))}
        </div>
      </div>

      {/* Materials Grid */}
      {filteredMaterials.length === 0 ? (
        <EmptyState
          title="Materi Tidak Ditemukan"
          description="Belum ada modul yang cocok dengan pencarian atau filter yang kamu pilih."
          actionLabel="Tampilkan Semua Materi"
          onAction={() => {
            setSelectedSubject('all');
            setSearchQuery('');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map((mat) => {
            const prog = materialProgress[`${mat.id}_${currentUser.uid}`];
            const isCompleted = prog?.status === 'completed';
            const theme = getSubjectTheme(mat.subject);

            return (
              <div
                key={mat.id}
                onClick={() => handleOpenMaterial(mat)}
                className={`group rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col justify-between cursor-pointer ${
                  isCompleted
                    ? 'bg-slate-50/80 border-slate-200 grayscale contrast-90 opacity-65 hover:opacity-100 hover:grayscale-0 shadow-xs'
                    : 'bg-white border-indigo-100/90 hover:border-indigo-300 shadow-[0_0_20px_-3px_rgba(99,102,241,0.2)] hover:shadow-[0_0_28px_rgba(99,102,241,0.32)] ring-1 ring-indigo-400/20'
                }`}
              >
                <div>
                  {/* Cover image or colored header */}
                  <div className="h-44 relative bg-slate-100 overflow-hidden">
                    <img
                      src={getSubjectTemplateImage(mat.subject, mat.coverUrl)}
                      alt={mat.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = getSubjectTemplateImage(mat.subject);
                      }}
                    />

                    <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2.5 py-1 rounded-lg ${theme.badgeBg} ${theme.text} backdrop-blur-md text-[11px] font-black shadow-xs`}>
                        {mat.subject}
                      </span>
                      {mat.status === 'scheduled' && new Date(mat.publishAt || '') > new Date() && (
                        <span className="px-2 py-1 rounded-lg bg-amber-100/95 text-amber-900 border border-amber-300 backdrop-blur-md text-[10px] font-black shadow-xs flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-700" />
                          <span>Segera Hadir</span>
                        </span>
                      )}
                    </div>

                    {/* Point indicator solely positioned in the top-right corner */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-lg bg-amber-400 text-amber-950 font-black text-[11px] shadow-xs flex items-center gap-1.5">
                        <PointIcon className="w-3.5 h-3.5" />
                        <span>+{mat.rewardPoints || 20} Poin</span>
                      </span>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-5">
                    {mat.topic && (
                      <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider mb-1 truncate">
                        Topik: {mat.topic}
                      </p>
                    )}
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors font-display line-clamp-2 leading-snug">
                      {mat.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                      {mat.description}
                    </p>

                    {/* Posting Date */}
                    <div className="mt-3.5 flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-50 p-2 rounded-xl border border-slate-100/80">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span>
                        {mat.status === 'scheduled' && new Date(mat.publishAt || '') > new Date() ? 'Jadwal Tayang: ' : 'Diposting: '}
                        <strong className="text-slate-700">{formatDateIndo(mat.publishAt || mat.createdAt)}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer stats */}
                <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-3 text-slate-400 font-medium">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span>{mat.attachments?.length || 0} Berkas</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isCompleted && (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200 flex items-center gap-1 shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Selesai</span>
                      </span>
                    )}
                    <button
                      type="button"
                      className="font-bold text-indigo-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-1"
                    >
                      <span>{isCompleted ? 'Buka Kembali' : 'Pelajari Modul'}</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Material Reader Modal */}
      {activeModalMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-700">
                    {activeModalMaterial.subject}
                  </span>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1.5">
                    <PointIcon className="w-3.5 h-3.5" />
                    <span>+{activeModalMaterial.rewardPoints || 20} Poin</span>
                  </span>
                  {activeModalMaterial.topic && (
                    <span className="text-xs font-semibold text-slate-500">
                      • {activeModalMaterial.topic}
                    </span>
                  )}
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 font-display">
                  {activeModalMaterial.title}
                </h2>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  <span>
                    Diposting:{' '}
                    <strong className="text-slate-700">{formatDateIndo(activeModalMaterial.publishAt || activeModalMaterial.createdAt)}</strong>
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveModalMaterial(null);
                  onClearSelected?.();
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
              {/* Embedded YouTube Player (Prominent at top so student can play immediately) */}
              {activeModalMaterial.youtubeUrl ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Video className="w-4 h-4 text-red-600" />
                      <span>Video Pembelajaran YouTube</span>
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Putar langsung di sini
                    </span>
                  </div>

                  <YouTubeEmbed
                    url={activeModalMaterial.youtubeUrl}
                    title={activeModalMaterial.youtubeTitle || activeModalMaterial.title}
                  />
                </div>
              ) : (
                /* Cover Banner if no video */
                <div className="rounded-2xl overflow-hidden h-48 sm:h-56 bg-slate-100 relative">
                  <img
                    src={getSubjectTemplateImage(activeModalMaterial.subject, activeModalMaterial.coverUrl)}
                    alt={activeModalMaterial.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = getSubjectTemplateImage(activeModalMaterial.subject);
                    }}
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-3 py-1 rounded-xl bg-white/95 backdrop-blur-xs text-xs font-black text-indigo-700 shadow-xs">
                      {activeModalMaterial.subject}
                    </span>
                  </div>
                </div>
              )}

              {/* Gamification Points Highlight Card */}
              {(() => {
                const isCompleted = materialProgress[`${activeModalMaterial.id}_${currentUser.uid}`]?.status === 'completed';
                const points = activeModalMaterial.rewardPoints || 20;
                return (
                  <div
                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isCompleted
                        ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                        : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 text-amber-950'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <PointIcon className="w-6 h-6" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold font-display">
                          {isCompleted ? 'Poin Materi Berhasil Diperoleh!' : 'Poin yang Akan Diperoleh'}
                        </p>
                        <p className="text-[11px] opacity-80 mt-0.5">
                          {isCompleted
                            ? `Selamat! Kamu telah menuntaskan modul ini dan mendapatkan +${points} Poin partisipasi.`
                            : `Selesaikan mempelajari modul ini lalu klik tombol "Tandai Selesai" di bawah untuk mengklaim +${points} Poin!`}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2 sm:justify-end">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black shadow-xs ${
                          isCompleted ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-amber-950'
                        }`}
                      >
                        <PointIcon className="w-4 h-4" />
                        <span>+{points} Poin</span>
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Description & Main body */}
              <div className="prose prose-slate max-w-none text-slate-700 text-sm sm:text-base leading-relaxed space-y-4">
                <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-slate-800 text-xs sm:text-sm">
                  <strong className="font-bold text-indigo-900">Ringkasan Materi: </strong>
                  {activeModalMaterial.description}
                </div>

                {activeModalMaterial.contentBody ? (
                  <div className="whitespace-pre-line font-normal text-slate-800 leading-relaxed bg-white p-2">
                    {activeModalMaterial.contentBody}
                  </div>
                ) : (
                  <p>Materi ini menyertakan lampiran berkas dokumen pembelajaran di bawah ini.</p>
                )}
              </div>

              {/* Attachments Section */}
              {activeModalMaterial.attachments && activeModalMaterial.attachments.length > 0 && (
                <div className="pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span>Lampiran Berkas Materi ({activeModalMaterial.attachments.length})</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setPreviewMaterialFileIdx(0)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Pratinjau Semua</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeModalMaterial.attachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-indigo-300 transition-all"
                      >
                        <div
                          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                          onClick={() => setPreviewMaterialFileIdx(idx)}
                          title="Klik untuk pratinjau langsung berkas materi"
                        >
                          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                            {att.type === 'pdf' ? (
                              <FileText className="w-5 h-5 text-rose-500" />
                            ) : (
                              <ImageIcon className="w-5 h-5 text-indigo-500" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-800 truncate">{att.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-slate-400">{att.sizeMB} MB</span>
                              <span className="text-[11px] text-indigo-600 font-semibold hover:underline">
                                Buka Pratinjau
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setPreviewMaterialFileIdx(idx)}
                            className="p-2 rounded-xl text-indigo-600 hover:bg-indigo-100 transition-colors"
                            title="Pratinjau Berkas"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {att.url && (
                            <a
                              href={att.url}
                              download={att.name}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
                              title="Unduh File"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500 hidden sm:inline">
                Diterbitkan pada {formatDateIndo(activeModalMaterial.publishAt)}
              </span>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                {materialProgress[`${activeModalMaterial.id}_${currentUser.uid}`]?.status === 'completed' ? (
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-100 px-4 py-2.5 rounded-xl border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="flex items-center gap-1">
                      <span>Sudah Selesai (+{activeModalMaterial.rewardPoints || 20}</span>
                      <PointIcon className="w-3.5 h-3.5" />
                      <span>Poin Diperoleh)</span>
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleMarkDone(activeModalMaterial.id)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="flex items-center gap-1">
                      <span>Tandai Selesai Membaca (+{activeModalMaterial.rewardPoints || 20}</span>
                      <PointIcon className="w-3.5 h-3.5" />
                      <span>Poin)</span>
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Material File Preview Modal */}
      {previewMaterialFileIdx !== null && activeModalMaterial?.attachments && (
        <FilePreviewModal
          isOpen={previewMaterialFileIdx !== null}
          onClose={() => setPreviewMaterialFileIdx(null)}
          files={activeModalMaterial.attachments.map((att) => ({
            name: att.name,
            url: att.url,
            previewUrl: (att as any).previewUrl || att.url,
            type: att.type === 'pdf' ? 'application/pdf' : 'image/jpeg',
            sizeMB: att.sizeMB,
          }))}
          initialIndex={previewMaterialFileIdx}
          title={activeModalMaterial.title}
          subtitle="Bahan Ajar & Materi Belajar"
        />
      )}
    </div>
  );
};

