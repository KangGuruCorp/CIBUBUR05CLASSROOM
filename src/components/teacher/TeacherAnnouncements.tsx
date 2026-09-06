import React, { useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  Megaphone,
  Plus,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Announcement } from '../../types';
import { formatDateIndo } from '../../utils/gamification';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EmptyState } from '../common/EmptyState';

interface TeacherAnnouncementsProps {
  isCreateOpenInitially?: boolean;
  onCloseInitialCreate?: () => void;
}

export const TeacherAnnouncements: React.FC<TeacherAnnouncementsProps> = ({
  isCreateOpenInitially = false,
  onCloseInitialCreate,
}) => {
  const { announcements, currentClassId, saveAnnouncement, deleteAnnouncement } = useApp();

  const [isEditorOpen, setIsEditorOpen] = useState(isCreateOpenInitially);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');

  React.useEffect(() => {
    if (isCreateOpenInitially) {
      setIsEditorOpen(true);
      onCloseInitialCreate?.();
    }
  }, [isCreateOpenInitially]);

  const handleOpenCreate = () => {
    setTitle('');
    setContent('');
    setPriority('normal');
    setIsEditorOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert('Judul dan isi pengumuman wajib diisi.');
      return;
    }

    saveAnnouncement({
      title,
      content,
      priority,
      classIds: [currentClassId],
    });

    setIsEditorOpen(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-bold mb-2">
            <Megaphone className="w-3.5 h-3.5" />
            <span>Siaran Informasi & Pemberitahuan Kelas</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
            Pengumuman Kelas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kirimkan informasi penting, agenda ujian, atau pengingat kegiatan ke seluruh siswa
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md shadow-orange-200 transition-all flex items-center justify-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Pengumuman Baru</span>
        </button>
      </div>

      {/* Announcements List */}
      {announcements.length === 0 ? (
        <EmptyState
          title="Belum Ada Pengumuman"
          description="Buat pengumuman pertama agar siswa mendapatkan notifikasi agenda kelas terkini."
          actionLabel="Buat Pengumuman"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="space-y-4">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className={`bg-white rounded-3xl border p-6 shadow-xs flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
                ann.priority === 'urgent'
                  ? 'border-orange-300 ring-2 ring-orange-200'
                  : 'border-slate-200/80'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md ${
                      ann.priority === 'urgent'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-indigo-50 text-indigo-700'
                    }`}
                  >
                    {ann.priority === 'urgent' ? '🔥 Sangat Penting' : 'Pemberitahuan'}
                  </span>
                  <span className="text-xs text-slate-400">
                    Oleh {ann.authorName} • {formatDateIndo(ann.createdAt)}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                  {ann.title}
                </h3>

                <p className="text-xs sm:text-sm text-slate-600 mt-2 whitespace-pre-line leading-relaxed">
                  {ann.content}
                </p>
              </div>

              <div className="shrink-0 flex items-center sm:self-start">
                <button
                  type="button"
                  onClick={() => setDeleteTargetId(ann.id)}
                  className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors"
                  title="Hapus Pengumuman"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 font-display">
                Buat Pengumuman Baru
              </h3>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Judul Pengumuman *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Persiapan Ujian Harian & Membawa Alat Gambar"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Isi Pesan Pengumuman *
                </label>
                <textarea
                  rows={4}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Tuliskan detail pengumuman untuk seluruh siswa kelas..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-slate-50/50 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Prioritas Notifikasi
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      value="normal"
                      checked={priority === 'normal'}
                      onChange={() => setPriority('normal')}
                      className="text-orange-600"
                    />
                    <span>Normal (Biasa)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      value="urgent"
                      checked={priority === 'urgent'}
                      onChange={() => setPriority('urgent')}
                      className="text-orange-600"
                    />
                    <span>🔥 Sangat Penting / Mendesak</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-md shadow-orange-200"
                >
                  Siarkan Pengumuman
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTargetId}
        title="Hapus Pengumuman Ini?"
        message="Pengumuman akan dihapus dari beranda siswa."
        confirmLabel="Ya, Hapus"
        isDanger={true}
        onConfirm={() => {
          if (deleteTargetId) {
            deleteAnnouncement(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};
