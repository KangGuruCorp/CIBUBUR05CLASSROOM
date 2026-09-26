import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  Image as ImageIcon,
  X,
  AlertCircle,
  CheckCircle2,
  User,
  GraduationCap,
  UserCheck,
  PenLine,
  AtSign,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  Crop,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ImageCropModal } from '../common/ImageCropModal';
import { uploadDataUrlToServer } from '../../lib/fileUploadService';

interface AvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateUserProfile } = useApp();

  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [teacherName, setTeacherName] = useState<string>('');
  const [teacherUsername, setTeacherUsername] = useState<string>('');
  const [teacherPassword, setTeacherPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [selectedTab, setSelectedTab] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isCropModalOpen, setIsCropModalOpen] = useState<boolean>(false);
  const [cropSourceImage, setCropSourceImage] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentUser && isOpen) {
      setPreviewUrl(currentUser.avatarUrl || '');
      setTeacherName(currentUser.displayName || '');
      setTeacherUsername(currentUser.username || '');
      setTeacherPassword(currentUser.password || 'guru123');
      setShowPassword(false);
      setErrorMessage('');
      setSuccessMessage('');
      setUrlInput('');
      setSelectedTab('upload');
    }
  }, [currentUser, isOpen]);

  if (!isOpen || !currentUser) return null;

  const isTeacher = currentUser.role === 'teacher';

  const handleFileSelect = async (file: File) => {
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('Format berkas harus berupa foto (JPG, PNG, atau WEBP).');
      }

      if (file.size > 8 * 1024 * 1024) {
        throw new Error('Ukuran foto terlalu besar (maksimal 8MB).');
      }

      // Read file and open crop & resize modal immediately
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
      console.error('Gagal memproses foto:', err);
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
    if (!urlInput.trim()) {
      setErrorMessage('Masukkan tautan URL foto yang valid.');
      return;
    }
    setPreviewUrl(urlInput.trim());
    setErrorMessage('');
  };

  const handleSave = async () => {
    if (isTeacher) {
      if (!teacherName.trim()) {
        setErrorMessage('Nama guru tidak boleh kosong.');
        return;
      }
      if (teacherName.trim().length < 3) {
        setErrorMessage('Nama guru minimal harus terdiri dari 3 karakter.');
        return;
      }

      const cleanUsername = teacherUsername.trim().toLowerCase();
      if (!cleanUsername) {
        setErrorMessage('Username login guru tidak boleh kosong.');
        return;
      }
      if (!/^[a-z0-9._-]{3,30}$/.test(cleanUsername)) {
        setErrorMessage(
          'Username hanya boleh terdiri dari huruf kecil, angka, titik, strip, atau garis bawah (3-30 karakter tanpa spasi).'
        );
        return;
      }

      if (!teacherPassword.trim()) {
        setErrorMessage('Kata sandi guru tidak boleh kosong.');
        return;
      }
      if (teacherPassword.trim().length < 4) {
        setErrorMessage('Kata sandi guru minimal harus terdiri dari 4 karakter.');
        return;
      }
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      let finalAvatarUrl = previewUrl || currentUser.avatarUrl;

      if (previewUrl && previewUrl.startsWith('data:')) {
        const fileName = `${currentUser.username || currentUser.uid}_avatar.jpg`;
        finalAvatarUrl = await uploadDataUrlToServer(previewUrl, fileName, 'avatars');
      }

      const result = updateUserProfile({
        displayName: isTeacher ? teacherName.trim() : undefined,
        username: isTeacher ? teacherUsername.trim().toLowerCase() : undefined,
        password: isTeacher ? teacherPassword.trim() : undefined,
        avatarUrl: finalAvatarUrl,
      });

      if (result && !result.success) {
        setErrorMessage(result.message || 'Gagal menyimpan profil guru.');
        setIsProcessing(false);
        return;
      }

      setSuccessMessage(
        isTeacher
          ? 'Profil guru, username, dan kata sandi berhasil disimpan!'
          : 'Foto profil berhasil diperbarui!'
      );

      setTimeout(() => {
        setIsProcessing(false);
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Error saving avatar:', err);
      setErrorMessage(err?.message || 'Gagal menyimpan foto profil.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 to-purple-50/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              {isTeacher ? <GraduationCap className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display">
                {isTeacher ? 'Edit Profil Guru' : 'Ganti Foto Profil'}
              </h3>
              <p className="text-xs text-slate-500">
                {isTeacher
                  ? 'Perbarui nama lengkap, gelar, dan foto profil Anda'
                  : 'Pilih foto profil resmi Anda untuk akun Kelas 6E'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Real-time Preview */}
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="relative shrink-0">
              <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-3xl bg-white p-1 border-2 border-indigo-200 shadow-sm overflow-hidden flex items-center justify-center">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={isTeacher ? (teacherName.trim() || currentUser.displayName) : currentUser.displayName}
                    className="w-full h-full rounded-2xl object-cover"
                  />
                ) : (
                  <User className="w-10 h-10 text-slate-300" />
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 p-1 bg-indigo-600 text-white rounded-full shadow-xs">
                <Camera className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="space-y-1 text-center sm:text-left flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 inline-block">
                {isTeacher ? 'Pratinjau Profil Guru' : 'Pratinjau Foto'}
              </span>
              <h4 className="text-sm font-bold text-slate-900 truncate">
                {isTeacher ? (teacherName.trim() || 'Nama Guru') : currentUser.displayName}
              </h4>
              {isTeacher && (
                <p className="text-xs font-mono font-bold text-indigo-600 truncate">
                  @{teacherUsername.trim() || 'username'}
                </p>
              )}
              <p className="text-[11px] font-semibold text-slate-500">
                {isTeacher ? 'Guru Kelas & Pengajar' : 'Siswa Kelas 6E'}
              </p>

              {previewUrl && (
                <div className="pt-1.5 flex justify-center sm:justify-start">
                  <button
                    type="button"
                    onClick={() => {
                      setCropSourceImage(previewUrl);
                      setIsCropModalOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white border border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/70 text-indigo-700 text-[11px] font-bold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Sesuaikan perbesaran, geser posisi, atau putar foto"
                  >
                    <Crop className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Sesuaikan Ukuran & Crop</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Teacher Credentials & Profile Inputs */}
          {isTeacher && (
            <div className="space-y-3">
              {/* Teacher Full Name */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2">
                <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-indigo-950">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    <span>Nama Lengkap Guru (dengan Gelar)</span>
                  </span>
                  <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-100/70 px-2 py-0.5 rounded-full">
                    Wajib Diisi
                  </span>
                </label>

                <div className="relative">
                  <input
                    type="text"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    placeholder="Contoh: Teguh Firmansyah Apriliana, M.Pd"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs transition-all placeholder:font-normal placeholder:text-slate-400"
                    maxLength={60}
                  />
                  <PenLine className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <p className="text-[11px] text-slate-500 leading-snug">
                  Nama ini otomatis disinkronkan ke seluruh materi pelajaran, tugas, rekap nilai, dan pengumuman kelas.
                </p>
              </div>

              {/* Teacher Username & Password Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-200/70 pb-2.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-indigo-600" />
                    <span>Kredensial Masuk Guru (Username & Password)</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>Privasi Terjaga</span>
                  </span>
                </div>

                {/* Username Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <AtSign className="w-3.5 h-3.5 text-slate-500" />
                      <span>Username Login Guru</span>
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      3-30 karakter (tanpa spasi)
                    </span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-xs font-mono font-bold">
                      @
                    </div>
                    <input
                      type="text"
                      value={teacherUsername}
                      onChange={(e) => setTeacherUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                      placeholder="guru.rahma"
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs transition-all"
                      maxLength={30}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Digunakan bersama kata sandi saat masuk ke portal login guru.
                  </p>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Kata Sandi (Password) Guru</span>
                    </span>
                    <span className="text-[10px] font-semibold text-indigo-600">
                      Minimal 4 karakter
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={teacherPassword}
                      onChange={(e) => setTeacherPassword(e.target.value)}
                      placeholder="Ketik kata sandi baru guru"
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      title={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Pastikan mengingat kata sandi ini untuk masuk ke portal guru berikutnya.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section: Upload Photo */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-indigo-600" />
                <span>Foto Profil</span>
              </span>
              <span className="text-[11px] text-slate-400">JPG, PNG, WEBP</span>
            </div>

            {/* Mode Tabs */}
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200/60">
              <button
                type="button"
                onClick={() => setSelectedTab('upload')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
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
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
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
              <div className="space-y-3 pt-1">
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
                  className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                    isDragging
                      ? 'border-indigo-500 bg-indigo-50/60 scale-[1.01]'
                      : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
                  }`}
                >
                  <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Klik untuk memilih foto dari galeri / kamera
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Maksimal ukuran foto 8MB
                    </p>
                  </div>
                  <span className="mt-1 px-3.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
                    Pilih Berkas Foto
                  </span>
                </div>
              </div>
            )}

            {/* Tab 2: URL Input */}
            {selectedTab === 'url' && (
              <div className="space-y-3 pt-1">
                <label className="block text-xs font-bold text-slate-700">
                  Tempel Tautan URL Foto
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://contoh.com/foto-guru.jpg"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                  />
                  <button
                    type="button"
                    onClick={handleApplyUrl}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold cursor-pointer"
                  >
                    Terapkan
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Feedback messages */}
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

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {isProcessing
                ? 'Memproses...'
                : isTeacher
                ? 'Simpan Profil Guru'
                : 'Simpan Foto Profil'}
            </span>
          </button>
        </div>
      </div>

      {/* Image Crop & Resize Modal */}
      <ImageCropModal
        isOpen={isCropModalOpen}
        imageSrc={cropSourceImage}
        title="Sesuaikan Ukuran & Crop Foto Profil"
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

