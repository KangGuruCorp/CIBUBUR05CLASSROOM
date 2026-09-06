import React, { useState } from 'react';
import {
  FileCheck,
  FileText,
  Send,
  UploadCloud,
  X,
  Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Mission } from '../../types';
import { FileUploader } from '../common/FileUploader';
import { PointIcon } from '../common/PointIcon';

interface StudentMissionSubmitModalProps {
  mission: Mission | null;
  isOpen: boolean;
  onClose: () => void;
}

export const StudentMissionSubmitModal: React.FC<StudentMissionSubmitModalProps> = ({
  mission,
  isOpen,
  onClose,
}) => {
  const { submitMissionForVerification, currentUser } = useApp();
  const [answerText, setAnswerText] = useState('');
  const [files, setFiles] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !mission || !currentUser) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerText.trim() && files.length === 0) {
      alert('Silakan tulis catatan atau unggah berkas bukti penyelesaian misi.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      submitMissionForVerification(mission.id, answerText, files);
      setIsSubmitting(false);
      onClose();
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800">
                Laporan Misi Siswa
              </span>
              <span className="text-xs font-black text-amber-800 flex items-center gap-1 bg-white/80 px-2.5 py-0.5 rounded-md border border-amber-200">
                <PointIcon className="w-3.5 h-3.5" />
                <span>+{mission.rewardPoints} Poin</span>
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display">
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

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Catatan / Laporan Pengerjaan Misi <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="Jelaskan apa yang sudah kamu kerjakan atau ringkasan hasil kegiatanmu..."
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Unggah Foto / Berkas Bukti (Opsional)
            </label>
            <FileUploader
              files={files}
              onChange={setFiles}
              maxFiles={3}
              maxSizeMB={10}
              allowedTypes={['image/jpeg', 'image/png', 'image/webp', 'application/pdf']}
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs shadow-md shadow-amber-200 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Mengirim...' : 'Kirim Bukti ke Guru'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
