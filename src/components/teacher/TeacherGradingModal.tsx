import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Image as ImageIcon,
  MessageSquare,
  RefreshCw,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Assignment, Submission, User as UserType } from '../../types';
import { formatDateIndo } from '../../utils/gamification';
import { PointIcon } from '../common/PointIcon';
import { getFileIconBadge, isImageFile, isPdfFile, isWordFile } from '../common/FileUploader';
import { FilePreviewModal } from '../common/FilePreviewModal';

interface TeacherGradingModalProps {
  submissionId?: string | null;
  isOpen?: boolean;
  submission?: Submission;
  assignment?: Assignment;
  studentName?: string;
  onClose: () => void;
  onNavigateNext?: () => void;
  onNavigatePrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export const TeacherGradingModal: React.FC<TeacherGradingModalProps> = ({
  submissionId,
  isOpen,
  submission: propSubmission,
  assignment: propAssignment,
  studentName: propStudentName,
  onClose,
  onNavigateNext,
  onNavigatePrev,
  hasNext = false,
  hasPrev = false,
}) => {
  const {
    submissions,
    assignments,
    users,
    gradeSubmission,
    requestRevision,
  } = useApp();

  if (isOpen !== undefined && !isOpen) return null;
  const submission =
    propSubmission ||
    (submissionId
      ? submissions[submissionId] ||
        Object.values(submissions).find(
          (s: any) => s && (s.id === submissionId || `${s.assignmentId}_${s.userId}` === submissionId)
        )
      : null);
  if (!submission) return null;

  const targetAssignment = propAssignment || assignments.find((a) => a.id === submission.assignmentId);
  const targetStudent = users.find((u) => u.uid === submission.userId) || (propStudentName ? ({ displayName: propStudentName } as any) : undefined);

  const [score, setScore] = useState<number>(submission.score !== undefined ? submission.score : 85);
  const [feedback, setFeedback] = useState<string>(submission.feedback || 'Pekerjaan sangat baik dan rapi!');
  const [rewardPoints, setRewardPoints] = useState<number>(targetAssignment?.rewardPoints || 40);
  const [isRevisionMode, setIsRevisionMode] = useState(false);
  const [revisionFeedback, setRevisionFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [inlinePreviewIdx, setInlinePreviewIdx] = useState<number>(0);

  const handleSaveGrade = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      gradeSubmission(submission.id, Number(score), feedback, Number(rewardPoints));
      setIsSubmitting(false);
      if (hasNext && onNavigateNext) {
        onNavigateNext();
      } else {
        onClose();
      }
    }, 250);
  };

  const handleSaveRevision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionFeedback.trim()) {
      alert('Harap berikan catatan revisi untuk siswa.');
      return;
    }
    requestRevision(submission.id, revisionFeedback);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={targetStudent?.avatarUrl}
              alt={targetStudent?.displayName}
              className="w-11 h-11 rounded-2xl bg-white border border-slate-200 object-cover"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 font-display">
                  Penilaian: {targetStudent?.displayName}
                </h3>
                {submission.isLate && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-100 text-rose-700">
                    Terlambat
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Tugas: <strong>{targetAssignment?.title}</strong> • Terkirim {formatDateIndo(submission.submittedAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasPrev && (
              <button
                type="button"
                onClick={onNavigatePrev}
                className="p-2 rounded-xl border border-slate-200 hover:bg-white text-slate-600 transition-colors"
                title="Siswa Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            {hasNext && (
              <button
                type="button"
                onClick={onNavigateNext}
                className="p-2 rounded-xl border border-slate-200 hover:bg-white text-slate-600 transition-colors"
                title="Siswa Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Main Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* Student Answer Section */}
          <div className="space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Hasil Pengerjaan Siswa
            </h4>

            {submission.answerText ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs sm:text-sm text-slate-800 whitespace-pre-line leading-relaxed">
                <strong className="block text-[11px] text-slate-400 uppercase font-bold mb-1">
                  Jawaban Teks:
                </strong>
                {submission.answerText}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 text-slate-500 text-xs italic">
                Tidak ada teks pengantar tertulis.
              </div>
            )}

            {/* Attached files */}
            {submission.files && submission.files.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 block">
                    Berkas Lampiran Siswa ({submission.files.length}):
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewIndex(inlinePreviewIdx)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Pratinjau Layar Penuh</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {submission.files.map((file, idx) => {
                    const badge = getFileIconBadge(file.name, file.type);
                    const isImg = isImageFile(file.name, file.type);
                    const isPdf = isPdfFile(file.name, file.type);
                    const isWord = isWordFile(file.name, file.type);
                    const isSelected = idx === inlinePreviewIdx;

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-2xl border transition-all ${
                          isSelected
                            ? 'border-indigo-400 bg-indigo-50/40 shadow-xs ring-1 ring-indigo-400/30'
                            : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
                        } flex items-center justify-between gap-3`}
                      >
                        <div
                          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                          onClick={() => {
                            setInlinePreviewIdx(idx);
                            setPreviewIndex(idx);
                          }}
                          title="Klik untuk pratinjau berkas secara langsung"
                        >
                          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200/70">
                            {file.previewUrl ? (
                              <img
                                src={file.previewUrl}
                                alt={file.name}
                                className="w-full h-full object-cover"
                              />
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
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-800 truncate" title={file.name}>
                              {file.name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${badge.color}`}>
                                {badge.label}
                              </span>
                              <span className="text-[11px] text-indigo-600 font-semibold hover:underline">
                                Lihat Pratinjau
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setInlinePreviewIdx(idx);
                              setPreviewIndex(idx);
                            }}
                            className="p-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                            title="Pratinjau Berkas Langsung"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <a
                            href={file.url}
                            download={file.name}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            title="Unduh File"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Inline Quick Preview Box */}
                {submission.files[inlinePreviewIdx] && (
                  <div className="p-3.5 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-md">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          Pratinjau Langsung
                        </span>
                        <span className="text-xs font-bold text-slate-300 truncate max-w-xs">
                          {submission.files[inlinePreviewIdx].name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPreviewIndex(inlinePreviewIdx)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Buka Layar Penuh</span>
                      </button>
                    </div>

                    <div
                      className="w-full max-h-64 sm:max-h-80 rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center p-2 cursor-pointer group relative border border-slate-800"
                      onClick={() => setPreviewIndex(inlinePreviewIdx)}
                      title="Klik untuk memperbesar pratinjau"
                    >
                      {isImageFile(submission.files[inlinePreviewIdx].name, submission.files[inlinePreviewIdx].type) ? (
                        <img
                          src={submission.files[inlinePreviewIdx].previewUrl || submission.files[inlinePreviewIdx].url}
                          alt={submission.files[inlinePreviewIdx].name}
                          className="max-h-60 sm:max-h-76 object-contain rounded-lg group-hover:scale-[1.02] transition-transform duration-200"
                        />
                      ) : isPdfFile(submission.files[inlinePreviewIdx].name, submission.files[inlinePreviewIdx].type) ? (
                        <div className="p-6 text-center">
                          <FileText className="w-12 h-12 text-rose-400 mx-auto mb-2" />
                          <p className="text-xs font-bold text-white mb-1">
                            {submission.files[inlinePreviewIdx].name}
                          </p>
                          <p className="text-[11px] text-slate-400 mb-3">Dokumen PDF Terverifikasi</p>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs">
                            <Eye className="w-3.5 h-3.5" />
                            <span>Buka Pratinjau Dokumen</span>
                          </span>
                        </div>
                      ) : (
                        <div className="p-6 text-center">
                          <FileText className="w-12 h-12 text-blue-400 mx-auto mb-2" />
                          <p className="text-xs font-bold text-white mb-1">
                            {submission.files[inlinePreviewIdx].name}
                          </p>
                          <p className="text-[11px] text-slate-400 mb-3">Dokumen Lembar Kerja Siswa</p>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs">
                            <Eye className="w-3.5 h-3.5" />
                            <span>Buka Pratinjau Dokumen</span>
                          </span>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="px-3 py-1.5 rounded-xl bg-slate-900/90 text-white text-xs font-bold border border-slate-700 flex items-center gap-1.5 shadow-lg">
                          <Eye className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Klik untuk Memperbesar</span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200" />

          {/* Form Switcher: Nilai vs Minta Revisi */}
          {!isRevisionMode ? (
            <form onSubmit={handleSaveGrade} className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>Formulir Penilaian & Reward Poin</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsRevisionMode(true)}
                  className="text-xs font-bold text-amber-600 hover:text-amber-700 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Minta Revisi Siswa</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Score Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nilai Siswa (Maks: {targetAssignment?.maxScore || 100})
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={0}
                      max={targetAssignment?.maxScore || 100}
                      value={score}
                      onChange={(e) => setScore(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-extrabold text-slate-800 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                    />
                  </div>
                </div>

                {/* Point Reward Allocation */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <PointIcon className="w-3.5 h-3.5" />
                    <span>Reward Poin Nilai</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={0}
                      max={200}
                      value={rewardPoints}
                      onChange={(e) => setRewardPoints(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-extrabold text-amber-700 text-base focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/40"
                    />
                  </div>
                </div>
              </div>

              {/* Feedback TextArea */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ulasan & Catatan Positif Guru
                </label>
                <textarea
                  rows={3}
                  required
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Berikan catatan positif, apresiasi ketelitian, atau koreksi yang membangun..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 leading-relaxed"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs sm:text-sm font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-200 transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Nilai & Beri Poin'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* Revision Form */
            <form onSubmit={handleSaveRevision} className="space-y-4 p-4 rounded-2xl bg-amber-50 border border-amber-200">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Minta Siswa Mengirimkan Revisi</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsRevisionMode(false)}
                  className="text-xs font-bold text-slate-600 hover:underline"
                >
                  Kembali ke Nilai
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-900 mb-1">
                  Catatan Bagian yang Perlu Diperbaiki
                </label>
                <textarea
                  rows={3}
                  required
                  value={revisionFeedback}
                  onChange={(e) => setRevisionFeedback(e.target.value)}
                  placeholder="Jelaskan bagian mana yang perlu diperbaiki oleh siswa (misal: foto kurang jelas, nomor 4 belum selesai)..."
                  className="w-full p-3 rounded-xl border border-amber-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRevisionMode(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold shadow-sm flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Kirim Permintaan Revisi</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Direct In-App File Preview Modal */}
      {previewIndex !== null && submission.files && (
        <FilePreviewModal
          isOpen={previewIndex !== null}
          onClose={() => setPreviewIndex(null)}
          files={submission.files}
          initialIndex={previewIndex}
          title={`Lampiran Siswa: ${targetStudent?.displayName || 'Siswa'}`}
          subtitle={targetAssignment?.title}
        />
      )}
    </div>
  );
};
