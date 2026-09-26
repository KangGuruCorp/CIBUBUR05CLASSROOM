import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  FileQuestion,
  FileText,
  Image as ImageIcon,
  Link2,
  MessageSquare,
  Play,
  RefreshCw,
  Send,
  Sparkles,
  Upload,
  X,
  Youtube,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Assignment, Quiz, QuizSubmission, Submission, SubmissionFile } from '../../types';
import { formatDateIndo, isDeadlineNear } from '../../utils/gamification';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { FileUploader, getFileIconBadge, isImageFile, isPdfFile, isWordFile } from '../common/FileUploader';
import { FilePreviewModal } from '../common/FilePreviewModal';
import { PointIcon } from '../common/PointIcon';
import { StatusPill } from '../common/StatusPill';
import { YouTubeEmbed } from '../common/YouTubeEmbed';
import { QuizPlayerModal } from './quiz/QuizPlayerModal';

interface StudentAssignmentDetailModalProps {
  assignment: Assignment | null;
  onClose: () => void;
}

export const StudentAssignmentDetailModal: React.FC<StudentAssignmentDetailModalProps> = ({
  assignment,
  onClose,
}) => {
  const { currentUser, submissions, submitAssignment, quizzes = [], quizSubmissions = {} } = useApp();

  if (!assignment || !currentUser) return null;

  const subKey = `${assignment.id}_${currentUser.uid}`;
  const currentSubmission: Submission | undefined = submissions[subKey];

  const [answerText, setAnswerText] = useState(currentSubmission?.answerText || '');
  const [files, setFiles] = useState<SubmissionFile[]>(currentSubmission?.files || []);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // File Preview Modal for student's uploaded files or teacher attachments
  const [previewFilesList, setPreviewFilesList] = useState<any[] | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  const [previewTitle, setPreviewTitle] = useState('');

  // Mode for resubmitting / updating if already submitted
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [activeQuizForRunner, setActiveQuizForRunner] = useState<Quiz | null>(null);

  // Cari kuis yang terhubung dengan tugas ini
  const linkedQuiz = quizzes.find((q) => {
    const isDirectMatch = Boolean(q.linkedAssignmentId && q.linkedAssignmentId === assignment.id);
    const isReverseMatch = Boolean(assignment.linkedQuizId && q.id === assignment.linkedQuizId);
    return (isDirectMatch || isReverseMatch) && q.status !== 'archived';
  });

  const linkedQuizSubmission: QuizSubmission | undefined = linkedQuiz
    ? quizSubmissions[`${linkedQuiz.id}_${currentUser.uid}`]
    : undefined;

  const isLinkedQuizCompleted = Boolean(
    linkedQuizSubmission && linkedQuizSubmission.status !== 'in_progress'
  );

  const status = currentSubmission?.status || 'draft';
  const isSubmitted = status === 'submitted' || status === 'resubmitted';
  const isGraded = status === 'graded';
  const isRevision = status === 'revision_requested';

  const { isUrgent, isPast } = isDeadlineNear(assignment.dueAt);
  const hasTeacherAttachments =
    (assignment.attachments && assignment.attachments.length > 0) || Boolean(assignment.youtubeUrl);

  const handleStartSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!answerText.trim() && files.length === 0) {
      setErrorMsg('Harap ketik jawaban teks instruksi atau lampirkan minimal satu file berkas tugas.');
      return;
    }

    setShowConfirm(true);
  };

  const handleConfirmSubmit = () => {
    setShowConfirm(false);
    submitAssignment(assignment.id, answerText, files);
    setIsEditingExisting(false);
    setShowSuccessModal(true);
  };

  // Otomatis kembali ke halaman tugas kelas setelah pesan sukses muncul jika tidak ada kuis terhubung yang belum dikerjakan
  useEffect(() => {
    let timer: any;
    if (showSuccessModal && (!linkedQuiz || isLinkedQuizCompleted)) {
      timer = setTimeout(() => {
        setShowSuccessModal(false);
        onClose();
      }, 2500);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [showSuccessModal, linkedQuiz, isLinkedQuizCompleted, onClose]);

  const handleCloseSuccess = () => {
    setShowSuccessModal(false);
    onClose();
  };

  const openTeacherFilePreview = (name: string, url: string, type?: string) => {
    setPreviewFilesList([
      {
        name,
        url,
        type: type || 'pdf',
        size: 0,
      },
    ]);
    setPreviewIndex(0);
    setPreviewTitle('Lampiran Referensi Guru');
  };

  const openStudentFilesPreview = (initialIdx: number = 0) => {
    if (!currentSubmission?.files || currentSubmission.files.length === 0) return;
    setPreviewFilesList(currentSubmission.files);
    setPreviewIndex(initialIdx);
    setPreviewTitle('Berkas Tugas Saya');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/70 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700">
                {assignment.subject}
              </span>
              {assignment.topic && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                  {assignment.topic}
                </span>
              )}
              <StatusPill status={status} isLate={currentSubmission?.isLate} />
              <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                <PointIcon className="w-3.5 h-3.5" />
                <span>+{assignment.rewardPoints} Pts</span>
              </span>
              <span className="text-xs font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>+{assignment.rewardXp ?? assignment.rewardPoints} XP</span>
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 font-display">
              {assignment.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* Deadline & Meta Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
            <div className="flex flex-wrap items-center gap-3 text-slate-600">
              <div className="flex items-center gap-1.5 bg-indigo-50/80 px-2.5 py-1 rounded-xl border border-indigo-100/80">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>
                  Diposting:{' '}
                  <strong className="text-slate-800">
                    {formatDateIndo(assignment.openAt || assignment.createdAt)}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className={`w-4 h-4 ${isPast ? 'text-rose-600' : isUrgent ? 'text-orange-500' : 'text-slate-400'}`} />
                <span>
                  Tenggat:{' '}
                  <strong className={isPast ? 'text-rose-600' : isUrgent ? 'text-orange-600' : 'text-slate-800'}>
                    {assignment.dueAt ? formatDateIndo(assignment.dueAt) : 'Tanpa batas waktu'}
                  </strong>
                </span>
              </div>
            </div>
            <div className="text-slate-500 font-medium">
              Maks Nilai: <strong className="text-slate-800">{assignment.maxScore > 0 ? `${assignment.maxScore} Poin` : 'Tidak Dinilai'}</strong>
            </div>
          </div>

          {/* Graded Card (If Teacher already graded) */}
          {isGraded && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 text-slate-800 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
                      Hasil Penilaian Guru
                    </span>
                    <h4 className="text-lg font-black text-emerald-950 font-display">
                      Nilai Kamu: {currentSubmission?.score} / {assignment.maxScore}
                    </h4>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 justify-end">
                  <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-600 text-white shadow-xs inline-flex items-center gap-1.5">
                    <PointIcon className="w-3.5 h-3.5" />
                    <span>+{assignment.rewardPoints} Poin</span>
                  </span>
                  <span className="text-xs font-black px-3 py-1 rounded-full bg-purple-600 text-white shadow-xs inline-flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>+{assignment.rewardXp ?? assignment.rewardPoints} XP</span>
                  </span>
                </div>
              </div>

              {currentSubmission?.feedback && (
                <div className="mt-3 p-3.5 bg-white rounded-xl border border-emerald-100 text-xs sm:text-sm text-slate-700">
                  <strong className="text-emerald-900 font-bold block mb-1">
                    💬 Ulasan & Catatan Guru:
                  </strong>
                  <p className="leading-relaxed">{currentSubmission.feedback}</p>
                </div>
              )}

              <p className="text-[10px] text-emerald-600 mt-2 text-right">
                Dinilai pada {formatDateIndo(currentSubmission?.gradedAt)}
              </p>
            </div>
          )}

          {/* Revision Requested Notice */}
          {isRevision && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-slate-800">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-amber-950">
                    Guru Meminta Revisi Tugas Ini
                  </h4>
                  <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                    Catatan Guru: "<strong>{currentSubmission?.feedback}</strong>"
                  </p>
                  <p className="text-xs text-amber-800 mt-2 font-medium">
                    Silakan perbaiki jawaban atau unggah berkas revisi baru di bawah ini lalu klik <strong>Kirim Ulang Revisi</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Petunjuk Tugas Guru */}
          <div className="space-y-2">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Petunjuk Instruksi Tugas</span>
            </h4>
            <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 text-xs sm:text-sm text-slate-800 whitespace-pre-line leading-relaxed">
              {assignment.instructions || 'Tidak ada petunjuk khusus tertulis dari guru.'}
            </div>
          </div>

          {/* Linked Quiz Card if present */}
          {linkedQuiz && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-blue-50/60 to-purple-50/70 border border-indigo-200/90 space-y-3 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#364FFF] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <FileQuestion className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                        🔗 Kuis Terhubung
                      </span>
                      <span className="text-xs font-bold text-indigo-700 truncate">
                        {linkedQuiz.subject}
                      </span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate mt-0.5">
                      {linkedQuiz.title}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isLinkedQuizCompleted ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-black">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Kuis Selesai • Nilai {linkedQuizSubmission?.percentageScore ?? linkedQuizSubmission?.totalScore ?? 100}</span>
                    </div>
                  ) : isSubmitted ? (
                    <button
                      type="button"
                      onClick={() => setActiveQuizForRunner(linkedQuiz)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#364FFF] to-[#6339FF] hover:from-[#2a3ecc] hover:to-[#502cd8] text-white text-xs font-black shadow-md shadow-indigo-600/25 transition-all cursor-pointer active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Kerjakan Kuis Sekarang</span>
                    </button>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-500 bg-white/80 border border-indigo-100 px-2.5 py-1.5 rounded-xl">
                      Buka setelah tugas dikirim
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-indigo-100 text-slate-600">
                  {linkedQuiz.questions.length} Soal
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-indigo-100 text-slate-600">
                  {linkedQuiz.durationMinutes > 0 ? `${linkedQuiz.durationMinutes} Menit` : 'Tanpa Batas'}
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-1">
                  <PointIcon className="w-3 h-3" />
                  +{linkedQuiz.rewardPoints} Poin
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  +{linkedQuiz.rewardXp || linkedQuiz.rewardPoints} XP
                </span>
              </div>
            </div>
          )}

          {/* Lampiran Referensi dari Guru (Files, YouTube, Links) */}
          {hasTeacherAttachments && (
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-indigo-600" />
                <span>Lampiran Berkas / Materi dari Guru</span>
              </h4>

              {/* YouTube Video if present */}
              {assignment.youtubeUrl && (
                <div className="rounded-2xl overflow-hidden border border-rose-200 bg-white p-2.5 space-y-2">
                  <YouTubeEmbed url={assignment.youtubeUrl} title="Video Pembelajaran Guru" />
                  <p className="text-xs font-bold text-rose-900 flex items-center gap-1.5 px-1">
                    <Youtube className="w-4 h-4 text-rose-600" />
                    <span>Video Referensi Belajar</span>
                  </p>
                </div>
              )}

              {/* Files and Links */}
              {assignment.attachments && assignment.attachments.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {assignment.attachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 transition-colors flex items-center justify-between gap-3 shadow-2xs"
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
                              onClick={() => openTeacherFilePreview(att.name, att.url || '', att.type)}
                              className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
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
              )}
            </div>
          )}

          {/* Submission Form or Submission Receipt */}
          {isSubmitted && !isEditingExisting && !isRevision ? (
            <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-blue-950 font-display">
                      Tugas Telah Dikumpulkan
                    </h4>
                    <p className="text-xs text-blue-700">
                      Waktu kirim: {formatDateIndo(currentSubmission?.submittedAt)} (Percobaan #{currentSubmission?.attempt})
                    </p>
                  </div>
                </div>

                {!isGraded && (
                  <button
                    type="button"
                    onClick={() => {
                      setAnswerText(currentSubmission?.answerText || '');
                      setFiles(currentSubmission?.files || []);
                      setIsEditingExisting(true);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-blue-200 bg-white text-blue-700 hover:bg-blue-50 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Edit / Kirim Ulang
                  </button>
                )}
              </div>

              {/* Teks Box Apresiasi Pengumpulan Tugas */}
              <div className="p-4 sm:p-4.5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-300/80 shadow-2xs flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm sm:text-base font-black text-emerald-950 font-display">
                    Kerja Bagus!
                  </h4>
                  <p className="text-xs sm:text-sm font-semibold text-emerald-800 mt-0.5">
                    terimakasih sudah mengumpulkan tugas tepat waktu
                  </p>
                </div>
              </div>

              {currentSubmission?.answerText && (
                <div className="p-3.5 bg-white rounded-xl border border-blue-100 text-xs text-slate-800">
                  <strong className="text-slate-900 font-bold block mb-1">Jawaban Teks Kamu:</strong>
                  <p className="whitespace-pre-line leading-relaxed">{currentSubmission.answerText}</p>
                </div>
              )}

              {currentSubmission?.files && currentSubmission.files.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-slate-700">
                      Berkas Lampiran yang Kamu Kirim ({currentSubmission.files.length}):
                    </p>
                    <button
                      type="button"
                      onClick={() => openStudentFilesPreview(0)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Pratinjau Semua</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {currentSubmission.files.map((file, idx) => {
                      const badge = getFileIconBadge(file.name, file.type);
                      const isWord = isWordFile(file.name, file.type);
                      const isPdf = isPdfFile(file.name, file.type);

                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-2 p-2.5 bg-white rounded-2xl border border-blue-200/80 hover:border-indigo-300 shadow-2xs transition-all"
                        >
                          <div
                            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                            onClick={() => openStudentFilesPreview(idx)}
                            title="Klik untuk pratinjau berkas"
                          >
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden text-slate-600 border border-slate-200/70">
                              {file.previewUrl ? (
                                <img src={file.previewUrl} alt={file.name} className="w-full h-full object-cover" />
                              ) : isWord ? (
                                <div className="w-full h-full bg-blue-50 text-blue-600 flex flex-col items-center justify-center">
                                  <FileText className="w-4 h-4" />
                                  <span className="text-[7px] font-black">DOCX</span>
                                </div>
                              ) : isPdf ? (
                                <div className="w-full h-full bg-rose-50 text-rose-600 flex flex-col items-center justify-center">
                                  <FileText className="w-4 h-4" />
                                  <span className="text-[7px] font-black">PDF</span>
                                </div>
                              ) : (
                                <div className="w-full h-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                  <ImageIcon className="w-4 h-4" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-bold text-slate-800 truncate block">{file.name}</span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${badge.color}`}>
                                  {badge.label}
                                </span>
                                <span className="text-[10px] text-indigo-600 font-semibold hover:underline">
                                  Lihat
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => openStudentFilesPreview(idx)}
                              className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                              title="Pratinjau Berkas"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <a
                              href={file.url}
                              download={file.name}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                              title="Unduh Berkas"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Submission Editor Form */
            <form onSubmit={handleStartSubmit} className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-indigo-600" />
                  <span>Kirimkan Hasil Tugas Kamu</span>
                </h4>
                <p className="text-xs text-indigo-700">
                  Ketik jawaban atau penjelasanmu, dan lampirkan foto/file jika ada lampiran yang diminta.
                </p>

                {/* Answer Text */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Jawaban Teks / Penjelasan Singkat (Opsional jika mengirim berkas):
                  </label>
                  <textarea
                    rows={4}
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    placeholder="Ketik jawabanmu, langkah-langkah pengerjaan, atau catatan untuk gurumu di sini..."
                    className="w-full p-3.5 rounded-2xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white leading-relaxed"
                  />
                </div>

                {/* File Uploader for student's files */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Lampirkan Berkas (Foto Tulisan Tangan / PDF / Word / Gambar):
                  </label>
                  <FileUploader
                    files={files}
                    onChange={setFiles}
                    maxFiles={assignment.attachmentRules?.maxFiles || 5}
                    maxSizeMB={assignment.attachmentRules?.maxSizeMB || 20}
                    allowedTypes={
                      assignment.attachmentRules?.allowedTypes || [
                        'image/jpeg',
                        'image/png',
                        'application/pdf',
                        'application/msword',
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        'text/plain',
                      ]
                    }
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                {isEditingExisting && (
                  <button
                    type="button"
                    onClick={() => setIsEditingExisting(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs sm:text-sm font-medium cursor-pointer"
                  >
                    Batal Edit
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs sm:text-sm font-medium cursor-pointer"
                >
                  Tutup
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-200 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{isRevision ? 'Kirim Ulang Revisi' : 'Kirim Tugas Sekarang'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirm}
        title="Kirimkan Tugas Sekarang?"
        message="Pastikan jawaban teks dan berkas lampiran sudah benar dan lengkap. Gurumu akan segera menerima kiriman tugas ini."
        confirmLabel="Ya, Kirim Tugas"
        onConfirm={handleConfirmSubmit}
        onCancel={() => setShowConfirm(false)}
      />

      {/* File Preview Modal */}
      {previewFilesList && (
        <FilePreviewModal
          isOpen={Boolean(previewFilesList)}
          onClose={() => setPreviewFilesList(null)}
          files={previewFilesList}
          initialIndex={previewIndex}
          title={assignment.title}
          subtitle={previewTitle}
        />
      )}

      {/* Pop-up Box Apresiasi Pengumpulan Tugas / Arahkan ke Kuis Terhubung */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          {linkedQuiz && !isLinkedQuizCompleted ? (
            <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 text-center shadow-2xl border-2 border-indigo-200 flex flex-col items-center animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 ring-8 ring-emerald-50 shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-emerald-700 bg-emerald-100 px-3.5 py-1 rounded-full mb-2">
                Tugas Berhasil Terkirim
              </span>
              <h3 className="text-2xl font-black text-slate-900 font-display mb-1">
                Kerja Bagus!
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-slate-600 leading-relaxed mb-4">
                Terima kasih sudah mengumpulkan tugas. Ada kuis evaluasi materi yang terhubung dengan tugas ini:
              </p>

              {/* Linked Quiz Highlight Card */}
              <div className="w-full p-4 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-blue-50/50 to-purple-50/60 border border-indigo-200 text-left space-y-2.5 mb-5 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#364FFF] text-white">
                    Kuis Terhubung
                  </span>
                  <span className="text-xs font-bold text-indigo-700">
                    {linkedQuiz.subject}
                  </span>
                </div>
                
                <h4 className="text-sm font-black text-slate-900 line-clamp-1">
                  {linkedQuiz.title}
                </h4>
                
                {linkedQuiz.description && (
                  <p className="text-xs text-slate-600 line-clamp-2 font-medium">
                    {linkedQuiz.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-white/90 border border-indigo-100 text-slate-700 flex items-center gap-1 shadow-2xs">
                    <FileQuestion className="w-3.5 h-3.5 text-indigo-600" />
                    {linkedQuiz.questions.length} Soal
                  </span>
                  <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-white/90 border border-indigo-100 text-slate-700 flex items-center gap-1 shadow-2xs">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    {linkedQuiz.durationMinutes > 0 ? `${linkedQuiz.durationMinutes} Menit` : 'Tanpa Batas'}
                  </span>
                  <span className="text-[11px] font-black px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-1 shadow-2xs">
                    <PointIcon className="w-3.5 h-3.5" />
                    +{linkedQuiz.rewardPoints} Poin
                  </span>
                  <span className="text-[11px] font-black px-2 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 flex items-center gap-1 shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    +{linkedQuiz.rewardXp || linkedQuiz.rewardPoints} XP
                  </span>
                </div>
              </div>

              <div className="w-full flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowSuccessModal(false);
                    setActiveQuizForRunner(linkedQuiz);
                  }}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#364FFF] to-[#6339FF] hover:from-[#2a3ecc] hover:to-[#502cd8] active:scale-98 text-white font-black text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Mulai Kuis Sekarang</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                
                <button
                  type="button"
                  onClick={handleCloseSuccess}
                  className="w-full sm:w-auto px-4 py-3 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
                >
                  Nanti Saja
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 text-center shadow-2xl border-2 border-emerald-200 flex flex-col items-center animate-in zoom-in-95 duration-200">
              <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 ring-8 ring-emerald-50 shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-emerald-700 bg-emerald-100 px-3.5 py-1 rounded-full mb-3">
                Tugas Berhasil Terkirim
              </span>
              <h3 className="text-2xl font-black text-slate-900 font-display mb-2">
                Kerja Bagus!
              </h3>
              <p className="text-sm font-semibold text-slate-600 leading-relaxed mb-6">
                Terima kasih sudah mengumpulkan tugas tepat waktu.
              </p>
              <button
                type="button"
                onClick={handleCloseSuccess}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-sm shadow-lg shadow-emerald-200 transition-all cursor-pointer"
              >
                Kembali ke Tugas Kelas
              </button>
              <p className="text-[11px] text-slate-400 mt-2 font-medium">
                Otomatis menutup dan kembali ke tugas kelas...
              </p>
            </div>
          )}
        </div>
      )}

      {/* Quiz Runner Modal if triggered from Linked Quiz CTA */}
      {activeQuizForRunner && (
        <QuizPlayerModal
          isOpen={Boolean(activeQuizForRunner)}
          onClose={() => {
            setActiveQuizForRunner(null);
            onClose();
          }}
          quiz={activeQuizForRunner}
          existingSubmission={linkedQuizSubmission}
        />
      )}
    </div>
  );
};
