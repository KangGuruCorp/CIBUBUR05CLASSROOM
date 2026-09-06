import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Download,
  Eye,
  File,
  FileText,
  Image as ImageIcon,
  Loader2,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { SubmissionFile } from '../../types';
import { compressGeneralImage } from '../../utils/imageUtils';
import { FilePreviewModal } from './FilePreviewModal';

interface FileUploaderProps {
  files: SubmissionFile[];
  onChange: (files: SubmissionFile[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  allowedTypes?: string[];
  disabled?: boolean;
}

// Default supported formats: Word (.doc, .docx), PDF (.pdf), and Images (.jpg, .jpeg, .png, .webp)
const DEFAULT_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const DEFAULT_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.doc', '.docx'];

export const isImageFile = (name: string, type?: string) => {
  if (type && type.startsWith('image/')) return true;
  const ext = name.toLowerCase();
  return ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.png') || ext.endsWith('.webp') || ext.endsWith('.gif');
};

export const isPdfFile = (name: string, type?: string) => {
  if (type === 'application/pdf') return true;
  return name.toLowerCase().endsWith('.pdf');
};

export const isWordFile = (name: string, type?: string) => {
  if (
    type === 'application/msword' ||
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return true;
  }
  const ext = name.toLowerCase();
  return ext.endsWith('.doc') || ext.endsWith('.docx');
};

export const getFileIconBadge = (name: string, type?: string) => {
  if (isImageFile(name, type)) {
    return {
      label: 'GAMBAR',
      color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      iconColor: 'text-emerald-600',
    };
  }
  if (isPdfFile(name, type)) {
    return {
      label: 'PDF',
      color: 'bg-rose-100 text-rose-700 border-rose-200',
      iconColor: 'text-rose-600',
    };
  }
  if (isWordFile(name, type)) {
    const ext = name.toLowerCase().endsWith('.docx') ? 'DOCX' : 'DOC';
    return {
      label: ext,
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      iconColor: 'text-blue-600',
    };
  }
  return {
    label: 'FILE',
    color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    iconColor: 'text-indigo-600',
  };
};

export const FileUploader: React.FC<FileUploaderProps> = ({
  files,
  onChange,
  maxFiles = 5,
  maxSizeMB = 15,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(URL.createObjectURL(file));
      reader.readAsDataURL(file);
    });
  };

  const handleFileProcess = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    setErrorMsg(null);

    if (files.length + selectedFiles.length > maxFiles) {
      setErrorMsg(`Maksimal ${maxFiles} file dapat diunggah.`);
      return;
    }

    setIsProcessing(true);
    const newFiles: SubmissionFile[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const fileNameLower = file.name.toLowerCase();

      // Check if matches allowed types or allowed extensions
      const isWord = isWordFile(file.name, file.type);
      const isPdf = isPdfFile(file.name, file.type);
      const isImg = isImageFile(file.name, file.type);

      const isValidFormat =
        isWord ||
        isPdf ||
        isImg ||
        allowedTypes.includes(file.type) ||
        DEFAULT_EXTENSIONS.some((ext) => fileNameLower.endsWith(ext));

      if (!isValidFormat) {
        setErrorMsg(
          `Format file "${file.name}" tidak didukung. Harap gunakan file Word (.doc/.docx), PDF (.pdf), atau Gambar (JPG/PNG/WebP).`
        );
        continue;
      }

      // Size check
      if (file.size > maxSizeMB * 1024 * 1024) {
        setErrorMsg(`Ukuran file "${file.name}" melebihi batas maksimal (${maxSizeMB} MB).`);
        continue;
      }

      try {
        let fileDataUrl = '';
        let previewUrl: string | undefined = undefined;

        if (isImg) {
          // Automatic compression for images/photos ensures high visual quality while staying ~100-200KB for Firestore
          fileDataUrl = await compressGeneralImage(file);
          previewUrl = fileDataUrl;
        } else {
          // Document files (PDF, Word): Ensure document fits in Firestore document size
          if (file.size > 800 * 1024) {
            setErrorMsg(
              `Dokumen "${file.name}" berukuran ${(file.size / (1024 * 1024)).toFixed(1)} MB. Agar tersimpan online di database, dokumen Word/PDF maksimal 800 KB (silakan kompres PDF terlebih dahulu). Foto/gambar otomatis dikompresi sistem.`
            );
            continue;
          }
          fileDataUrl = await readFileAsDataUrl(file);
        }

        newFiles.push({
          name: file.name,
          url: fileDataUrl,
          type: file.type || (isWord ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : isPdf ? 'application/pdf' : 'application/octet-stream'),
          size: file.size,
          previewUrl,
        });
      } catch (err) {
        console.error('Error reading file:', err);
      }
    }

    setIsProcessing(false);
    if (newFiles.length > 0) {
      onChange([...files, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    const updated = files.filter((_, idx) => idx !== index);
    onChange(updated);
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      {files.length < maxFiles && !disabled && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFileProcess(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]'
              : 'border-slate-300 hover:border-indigo-400 bg-slate-50/60 hover:bg-indigo-50/20'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".doc,.docx,.pdf,.jpg,.jpeg,.png,.webp,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,image/*"
            className="hidden"
            onChange={(e) => handleFileProcess(e.target.files)}
          />

          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100/70 text-indigo-600 flex items-center justify-center shadow-2xs">
              {isProcessing ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <UploadCloud className="w-6 h-6" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Tarik file ke sini, atau{' '}
                <span className="text-indigo-600 underline font-bold">pilih file dari perangkat</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Format didukung: <strong>Word (.doc, .docx)</strong>, <strong>PDF</strong>, dan <strong>Gambar (JPG/PNG)</strong>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Maksimal {maxSizeMB} MB per file • Hingga {maxFiles} file
              </p>
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 uppercase tracking-wider">
            <span>Berkas Tugas Terlampir ({files.length}/{maxFiles})</span>
            <button
              type="button"
              onClick={() => setPreviewIndex(0)}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer normal-case"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Pratinjau Semua</span>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {files.map((file, idx) => {
              const badge = getFileIconBadge(file.name, file.type);
              const isImg = isImageFile(file.name, file.type);
              const isPdf = isPdfFile(file.name, file.type);
              const isWord = isWordFile(file.name, file.type);

              return (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all group"
                >
                  <div
                    className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden text-slate-600 border border-slate-200/70 cursor-pointer hover:opacity-90"
                    onClick={() => setPreviewIndex(idx)}
                    title="Klik untuk pratinjau berkas ini"
                  >
                    {file.previewUrl ? (
                      <img src={file.previewUrl} alt={file.name} className="w-full h-full object-cover" />
                    ) : isWord ? (
                      <div className="w-full h-full bg-blue-50 text-blue-600 flex flex-col items-center justify-center">
                        <FileText className="w-5 h-5" />
                        <span className="text-[8px] font-black tracking-tighter">DOCX</span>
                      </div>
                    ) : isPdf ? (
                      <div className="w-full h-full bg-rose-50 text-rose-600 flex flex-col items-center justify-center">
                        <FileText className="w-5 h-5" />
                        <span className="text-[8px] font-black tracking-tighter">PDF</span>
                      </div>
                    ) : (
                      <div className="w-full h-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => setPreviewIndex(idx)}
                    title="Klik untuk pratinjau berkas ini"
                  >
                    <span className="text-xs font-bold text-slate-800 hover:text-indigo-600 hover:underline truncate block">
                      {file.name}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${badge.color}`}>
                        {badge.label}
                      </span>
                      <span className="text-[11px] text-slate-400">•</span>
                      <span className="text-[11px] text-slate-500">{formatFileSize(file.size)}</span>
                      <span className="text-[11px] text-indigo-600 font-semibold ml-1">
                        Pratinjau
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewIndex(idx)}
                      className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="Pratinjau Berkas"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {!disabled && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Hapus file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {previewIndex !== null && files.length > 0 && (
        <FilePreviewModal
          isOpen={previewIndex !== null}
          onClose={() => setPreviewIndex(null)}
          files={files}
          initialIndex={previewIndex}
          title="Pratinjau Berkas Terlampir"
          subtitle="Pemeriksaan Sebelum Mengirim"
        />
      )}
    </div>
  );
};

