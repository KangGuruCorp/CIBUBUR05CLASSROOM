import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  User,
  Crop,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { User as UserType } from '../../types';
import { ImageCropModal } from '../common/ImageCropModal';
import { uploadDataUrlToServer } from '../../lib/fileUploadService';

interface TeacherStudentPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: UserType | null;
}

export const TeacherStudentPhotoModal: React.FC<TeacherStudentPhotoModalProps> = ({
  isOpen,
  onClose,
  student,
}) => {
  const { updateStudentPhoto } = useApp();

  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [selectedTab, setSelectedTab] = useState<'upload' | 'url'>('upload');
  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isCropModalOpen, setIsCropModalOpen] = useState<boolean>(false);
  const [cropSourceImage, setCropSourceImage] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync initial photo on open
  React.useEffect(() => {
    if (student) {
      setPreviewUrl(student.avatarUrl || '');
      setErrorMessage('');
      setSuccessMessage('');
      setCustomUrlInput('');
      setSelectedTab('upload');
    }
  }, [student, isOpen]);

  if (!isOpen || !student) return null;

  const handleFileSelect = async (file: File) => {
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('Format berkas harus berupa foto / gambar (JPG, PNG, atau WEBP).');
      }

      if (file.size > 8 * 1024 * 1024) {
        throw new Error('Ukuran foto terlalu besar (maksimal 8MB).');
      }

      const reader = new FileReader();
      reader.onerror = () => {
        setErrorMessage('Gagal membaca berkas gambar.');
      };
      reader.onload = (e) => {
        const rawDataUrl = e.target?.result as string;
        setCropSourceImage(rawDataUrl);
        setIsCropModalOpen(true);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error('Error processing photo:', err);
      setErrorMessage(err.message || 'Gagal memproses file foto.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleApplyUrl = () => {
    if (!customUrlInput.trim()) {
      setErrorMessage('Masukkan tautan foto yang valid.');
      return;
    }
    setPreviewUrl(customUrlInput.trim());
    setErrorMessage('');
  };

  const handleResetToDefault = () => {
    const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(student.displayName)}&backgroundColor=b6e3f4`;
    setPreviewUrl(defaultAvatar);
    setErrorMessage('');
  };

  const handleSave = async () => {
    if (!previewUrl) {
      setErrorMessage('Pilih atau unggah foto profil terlebih dahulu.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      let finalPhotoUrl = previewUrl;
      if (previewUrl.startsWith('data:')) {
        const fileName = `${student.username || student.uid}_photo.jpg`;
        finalPhotoUrl = await uploadDataUrlToServer(previewUrl, fileName, 'avatars');
      }

      updateStudentPhoto(student.uid, finalPhotoUrl);
      setSuccessMessage('Foto profil siswa berhasil disimpan dan diperbarui!');

      setTimeout(() => {
        setIsProcessing(false);
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Error saving student photo:', err);
      setErrorMessage(err?.message || 'Gagal menyimpan foto siswa.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 via-purple-50/50 to-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display">
                Upload Foto Profil Siswa
              </h3>
              <p className="text-xs text-slate-500">
                {student.displayName} • Absen #{student.absentNumber || 1}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Main Photo Preview & Status */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="relative shrink-0 group">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-white p-1 border-2 border-indigo-200 shadow-md overflow-hidden flex items-center justify-center">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={student.displayName}
                    className="w-full h-full rounded-2xl object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-slate-300" />
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 p-1 bg-indigo-600 text-white rounded-full shadow-xs">
                <Camera className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="space-y-1.5 text-center sm:text-left flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700">
                Pratinjau Foto Dashboard Siswa
              </span>
              <h4 className="text-sm font-bold text-slate-900 truncate max-w-[240px]">
                {student.displayName}
              </h4>
              <p className="text-xs text-slate-500">
                Foto ini akan tampil resmi pada Banner Dashboard & Profil Siswa.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-0.5 justify-center sm:justify-start">
                {previewUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setCropSourceImage(previewUrl);
                      setIsCropModalOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-bold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Sesuaikan perbesaran, geser posisi, atau putar foto"
                  >
                    <Crop className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Sesuaikan & Crop</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reset ke avatar awal</span>
                </button>
              </div>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200/60">
            <button
              type="button"
              onClick={() => setSelectedTab('upload')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                selectedTab === 'upload'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Unggah File Foto</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedTab('url')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                selectedTab === 'url'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Tautan URL Foto</span>
            </button>
          </div>

          {/* Tab 1: Upload File */}
          {selectedTab === 'upload' && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50/60 scale-[1.01]'
                    : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Klik untuk memilih foto atau seret foto ke sini
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Mendukung JPG, PNG, WEBP (Otomatis dipotong pas & dioptimalkan)
                  </p>
                </div>
                <button
                  type="button"
                  className="mt-1 px-4 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200 pointer-events-none"
                >
                  Pilih Foto dari Galeri / Laptop
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: URL Input */}
          {selectedTab === 'url' && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Tempel Link URL Foto Siswa
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  placeholder="https://contoh.com/foto-siswa.jpg"
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                />
                <button
                  type="button"
                  onClick={handleApplyUrl}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold"
                >
                  Terapkan
                </button>
              </div>
            </div>
          )}

          {/* Alerts */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isProcessing ? 'Memproses...' : 'Simpan Foto Profil Siswa'}</span>
          </button>
        </div>
      </div>

      {/* Image Crop & Resize Modal */}
      <ImageCropModal
        isOpen={isCropModalOpen}
        imageSrc={cropSourceImage}
        title={`Sesuaikan Foto Siswa: ${student.displayName}`}
        initialShape="circle"
        onClose={() => setIsCropModalOpen(false)}
        onCropComplete={(croppedDataUrl) => {
          setPreviewUrl(croppedDataUrl);
          setSuccessMessage('Foto berhasil disesuaikan dan siap disimpan!');
        }}
      />
    </div>
  );
};
