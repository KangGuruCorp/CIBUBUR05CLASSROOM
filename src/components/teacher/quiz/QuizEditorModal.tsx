import React, { useState, useRef } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Award,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Eye,
  FileQuestion,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  Link2,
  ListChecks,
  ListPlus,
  Loader2,
  MoveRight,
  PenTool,
  Plus,
  RefreshCw,
  Shuffle,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  ComplexStatement,
  MatchingPair,
  Quiz,
  QuizQuestion,
  QuizQuestionType,
} from '../../../types';
import { useApp } from '../../../context/AppContext';
import {
  STANDARD_SUBJECTS,
  StandardSubject,
  SUBJECT_CONFIGS,
  matchSubjectToStandard,
} from '../../../utils/materialTemplates';
import { uploadFileToServer } from '../../../lib/fileUploadService';
import { PointIcon } from '../../common/PointIcon';
import { RichQuestionPrompt } from '../../common/RichQuestionPrompt';
import { RichQuestionEditor } from '../../common/RichQuestionEditor';
import { QuizBulkImportModal } from './QuizBulkImportModal';

interface QuizEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuiz?: Quiz | null;
}

const QUESTION_TYPE_CONFIG: Record<
  QuizQuestionType,
  { label: string; badge: string; color: string; desc: string }
> = {
  single_choice: {
    label: 'Pilihan Ganda (PG)',
    badge: 'PG Biasa',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    desc: '1 Jawaban Benar dari beberapa pilihan',
  },
  complex_multiple_choice: {
    label: 'Pilihan Ganda Kompleks',
    badge: 'PG Kompleks',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    desc: 'Centang banyak jawaban benar / Tabel Benar-Salah',
  },
  matching: {
    label: 'Menjodohkan',
    badge: 'Menjodohkan',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    desc: 'Pasangkan premis di kiri dengan jawaban di kanan',
  },
  short_answer: {
    label: 'Isian Singkat',
    badge: 'Isian Singkat',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    desc: 'Jawaban berupa kata/frasa singkat dengan auto-scoring',
  },
  essay: {
    label: 'Uraian / Esai',
    badge: 'Uraian',
    color: 'bg-rose-100 text-rose-700 border-rose-200',
    desc: 'Jawaban panjang dengan rubrik pemeriksaan guru',
  },
};

export const QuizEditorModal: React.FC<QuizEditorModalProps> = ({
  isOpen,
  onClose,
  initialQuiz,
}) => {
  const { classes = [], currentClassId, saveQuiz, currentUser, assignments = [] } = useApp();

  const [title, setTitle] = useState(initialQuiz?.title || '');
  const [linkedAssignmentId, setLinkedAssignmentId] = useState<string>(
    initialQuiz?.linkedAssignmentId || ''
  );
  
  const [selectedStandardSubject, setSelectedStandardSubject] = useState<StandardSubject>(() => {
    return initialQuiz?.subject ? matchSubjectToStandard(initialQuiz.subject) : 'IPAS';
  });
  const [customSubject, setCustomSubject] = useState(() => {
    if (!initialQuiz?.subject) return '';
    const matched = matchSubjectToStandard(initialQuiz.subject);
    return matched === 'Lainnya' && initialQuiz.subject !== 'Lainnya' ? initialQuiz.subject : '';
  });

  const [topic, setTopic] = useState(initialQuiz?.topic || '');
  const [description, setDescription] = useState(initialQuiz?.description || '');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(
    initialQuiz?.classIds?.length ? initialQuiz.classIds : [currentClassId || 'cls_6a']
  );
  const [durationMinutes, setDurationMinutes] = useState<number>(
    initialQuiz?.durationMinutes !== undefined ? initialQuiz.durationMinutes : 30
  );
  const [hasDueDate, setHasDueDate] = useState<boolean>(Boolean(initialQuiz?.dueAt));
  const [dueAt, setDueAt] = useState<string>(() => {
    if (initialQuiz?.dueAt) {
      const d = new Date(initialQuiz.dueAt);
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    }
    return '';
  });

  const [isScheduled, setIsScheduled] = useState<boolean>(() => {
    if (initialQuiz?.status === 'scheduled') return true;
    if (initialQuiz?.openAt && new Date(initialQuiz.openAt).getTime() > Date.now()) return true;
    return false;
  });

  const [openAt, setOpenAt] = useState<string>(() => {
    if (initialQuiz?.openAt) {
      const d = new Date(initialQuiz.openAt);
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    }
    return '';
  });

  const getSuggestedScheduleDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(7, 0, 0, 0);
    return new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const [rewardPoints, setRewardPoints] = useState<number>(
    initialQuiz?.rewardPoints !== undefined ? initialQuiz.rewardPoints : 50
  );
  const [rewardXp, setRewardXp] = useState<number>(
    initialQuiz?.rewardXp !== undefined ? initialQuiz.rewardXp : (initialQuiz?.rewardPoints !== undefined ? initialQuiz.rewardPoints : 50)
  );
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(
    initialQuiz?.shuffleQuestions || false
  );
  const [showScoreImmediately, setShowScoreImmediately] = useState<boolean>(
    initialQuiz?.showScoreImmediately !== undefined ? initialQuiz.showScoreImmediately : true
  );

  const [questions, setQuestions] = useState<QuizQuestion[]>(() => {
    if (initialQuiz?.questions && initialQuiz.questions.length > 0) {
      return initialQuiz.questions;
    }
    return [
      {
        id: `q_${Date.now()}_1`,
        type: 'single_choice',
        prompt: '',
        points: 10,
        options: ['', '', '', ''],
        correctOptionIndex: 0,
        explanation: '',
      },
    ];
  });

  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  const handleBulkImport = (
    importedQuestions: QuizQuestion[],
    quizMetadata?: {
      title?: string;
      subject?: string;
      topic?: string;
      durationMinutes?: number;
      rewardPoints?: number;
      rewardXp?: number;
    },
    mode: 'replace' | 'append' = 'replace'
  ) => {
    if (mode === 'replace') {
      setQuestions(importedQuestions);
    } else {
      setQuestions((prev) => [...prev, ...importedQuestions]);
    }

    if (quizMetadata) {
      if (quizMetadata.title && (!title || mode === 'replace')) {
        setTitle(quizMetadata.title);
      }
      if (quizMetadata.subject) {
        const matched = matchSubjectToStandard(quizMetadata.subject);
        setSelectedStandardSubject(matched);
        if (matched === 'Lainnya') {
          setCustomSubject(quizMetadata.subject);
        } else {
          setCustomSubject('');
        }
      }
      if (quizMetadata.topic && (!topic || mode === 'replace')) {
        setTopic(quizMetadata.topic);
      }
      if (typeof quizMetadata.durationMinutes === 'number' && quizMetadata.durationMinutes > 0) {
        setDurationMinutes(quizMetadata.durationMinutes);
      }
      if (typeof quizMetadata.rewardPoints === 'number' && quizMetadata.rewardPoints > 0) {
        setRewardPoints(quizMetadata.rewardPoints);
      }
      if (typeof quizMetadata.rewardXp === 'number' && quizMetadata.rewardXp > 0) {
        setRewardXp(quizMetadata.rewardXp);
      } else if (typeof quizMetadata.rewardPoints === 'number' && quizMetadata.rewardPoints > 0) {
        setRewardXp(quizMetadata.rewardPoints);
      }
    }

    setErrorMsg(null);
    setIsBulkImportOpen(false);
  };

  if (!isOpen) return null;

  const totalPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);

  const handleAddQuestion = (type: QuizQuestionType) => {
    const newId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    let newQ: QuizQuestion;

    switch (type) {
      case 'single_choice':
        newQ = {
          id: newId,
          type: 'single_choice',
          prompt: '',
          points: 10,
          options: ['', '', '', ''],
          correctOptionIndex: 0,
          explanation: '',
        };
        break;
      case 'complex_multiple_choice':
        newQ = {
          id: newId,
          type: 'complex_multiple_choice',
          prompt: '',
          points: 10,
          complexMode: 'true_false',
          complexStatements: [
            { id: `stmt_${Date.now()}_1`, statement: '', isCorrect: true },
            { id: `stmt_${Date.now()}_2`, statement: '', isCorrect: false },
          ],
          explanation: '',
        };
        break;
      case 'matching':
        newQ = {
          id: newId,
          type: 'matching',
          prompt: '',
          points: 10,
          matchingPairs: [
            { id: `pair_${Date.now()}_1`, left: '', right: '' },
            { id: `pair_${Date.now()}_2`, left: '', right: '' },
          ],
          explanation: '',
        };
        break;
      case 'short_answer':
        newQ = {
          id: newId,
          type: 'short_answer',
          prompt: '',
          points: 10,
          acceptedAnswers: [''],
          caseSensitive: false,
          explanation: '',
        };
        break;
      case 'essay':
        newQ = {
          id: newId,
          type: 'essay',
          prompt: '',
          points: 20,
          essayRubric: '',
          minWords: 10,
          explanation: '',
        };
        break;
    }

    setQuestions((prev) => [...prev, newQ]);
  };

  const handleUpdateQuestion = (qIndex: number, updatedProps: Partial<QuizQuestion>) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[qIndex] = { ...copy[qIndex], ...updatedProps };
      return copy;
    });
  };

  const handleDeleteQuestion = (qIndex: number) => {
    if (questions.length <= 1) {
      setErrorMsg('Kuis harus memiliki minimal 1 soal.');
      return;
    }
    setQuestions((prev) => prev.filter((_, idx) => idx !== qIndex));
  };

  const handleDuplicateQuestion = (qIndex: number) => {
    const qToCopy = questions[qIndex];
    const newId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const cloned: QuizQuestion = JSON.parse(JSON.stringify(qToCopy));
    cloned.id = newId;
    setQuestions((prev) => {
      const copy = [...prev];
      copy.splice(qIndex + 1, 0, cloned);
      return copy;
    });
  };

  const handleMoveQuestion = (qIndex: number, direction: 'up' | 'down') => {
    if (direction === 'up' && qIndex === 0) return;
    if (direction === 'down' && qIndex === questions.length - 1) return;
    const targetIdx = direction === 'up' ? qIndex - 1 : qIndex + 1;
    setQuestions((prev) => {
      const copy = [...prev];
      const temp = copy[qIndex];
      copy[qIndex] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  const handleSave = (status: 'draft' | 'published') => {
    if (!title.trim()) {
      setErrorMsg('Judul Kuis wajib diisi.');
      return;
    }
    if (questions.length === 0) {
      setErrorMsg('Tambahkan minimal 1 soal.');
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.prompt.trim()) {
        setErrorMsg(`Pertanyaan pada nomor ${i + 1} belum diisi.`);
        return;
      }
      if (q.type === 'single_choice') {
        if (!q.options || q.options.some((opt) => !opt.trim())) {
          setErrorMsg(`Harap isi semua opsi jawaban pada soal nomor ${i + 1}.`);
          return;
        }
      } else if (q.type === 'complex_multiple_choice') {
        if (q.complexMode === 'true_false') {
          if (!q.complexStatements || q.complexStatements.length < 2 || q.complexStatements.some((s) => !s.statement.trim())) {
            setErrorMsg(`Harap isi semua pernyataan benar/salah pada soal nomor ${i + 1}.`);
            return;
          }
        } else {
          if (!q.options || q.options.some((opt) => !opt.trim())) {
            setErrorMsg(`Harap isi semua pilihan pada soal nomor ${i + 1}.`);
            return;
          }
          if (!q.correctOptionIndices || q.correctOptionIndices.length === 0) {
            setErrorMsg(`Pilih minimal 1 jawaban benar pada soal nomor ${i + 1}.`);
            return;
          }
        }
      } else if (q.type === 'matching') {
        if (!q.matchingPairs || q.matchingPairs.length < 2 || q.matchingPairs.some((p) => !p.left.trim() || !p.right.trim())) {
          setErrorMsg(`Harap lengkapi semua pasangan menjodohkan pada soal nomor ${i + 1}.`);
          return;
        }
      } else if (q.type === 'short_answer') {
        if (!q.acceptedAnswers || q.acceptedAnswers.length === 0 || q.acceptedAnswers.every((a) => !a.trim())) {
          setErrorMsg(`Tentukan minimal 1 kunci jawaban isian pada soal nomor ${i + 1}.`);
          return;
        }
      }
    }

    if (status !== 'draft') {
      if (isScheduled) {
        if (!openAt) {
          setErrorMsg('Harap tentukan tanggal dan jam jadwal terbit kuis.');
          return;
        }
        if (hasDueDate && dueAt && new Date(openAt) >= new Date(dueAt)) {
          setErrorMsg('Waktu jadwal terbit tidak boleh melebihi atau sama dengan batas waktu (tenggat) pengerjaan.');
          return;
        }
      }
    }

    const finalSubject =
      selectedStandardSubject === 'Lainnya' && customSubject.trim()
        ? customSubject.trim()
        : selectedStandardSubject;

    let finalStatus: Quiz['status'] = status;
    if (status !== 'draft') {
      if (isScheduled && openAt && new Date(openAt).getTime() > Date.now()) {
        finalStatus = 'scheduled';
      } else {
        finalStatus = 'published';
      }
    }

    const finalOpenAt = isScheduled && openAt
      ? new Date(openAt).toISOString()
      : (initialQuiz?.openAt || new Date().toISOString());

    const quizData: Partial<Quiz> = {
      ...(initialQuiz?.id ? { id: initialQuiz.id } : {}),
      title: title.trim(),
      subject: finalSubject,
      topic: topic.trim(),
      description: description.trim(),
      classIds: selectedClassIds,
      durationMinutes: Number(durationMinutes) || 0,
      openAt: finalOpenAt,
      dueAt: hasDueDate && dueAt ? new Date(dueAt).toISOString() : undefined,
      rewardPoints: Number(rewardPoints) || 0,
      rewardXp: Number(rewardXp) || 0,
      linkedAssignmentId: linkedAssignmentId.trim() || undefined,
      shuffleQuestions,
      showScoreImmediately,
      maxScore: totalPoints || 100,
      questions,
      status: finalStatus,
    };

    saveQuiz(quizData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl my-auto flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 via-indigo-50/40 to-purple-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#364FFF] to-[#6339FF] flex items-center justify-center text-white shadow-md shadow-indigo-600/25">
              <FileQuestion className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                {initialQuiz ? 'Edit Kuis Pembelajaran' : 'Buat Kuis Baru'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Kuis interaktif dengan 5 format soal & sistem gamifikasi poin
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsBulkImportOpen(true)}
              className="px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xs shadow-xs hover:from-amber-600 hover:to-orange-600 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">Impor Massal (AI / JSON)</span>
              <span className="sm:hidden">Impor AI</span>
            </button>

            {/* View Mode Toggle */}
            <div className="bg-white p-1 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'editor'
                    ? 'bg-[#364FFF] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Editor Soal
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-[#364FFF] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Pratinjau Siswa
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-rose-500 hover:text-rose-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'editor' ? (
            <>
              {/* General Quiz Information */}
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#364FFF]" />
                  Pengaturan & Informasi Umum Kuis
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Judul Kuis <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      placeholder="Contoh: Kuis Evaluasi Bab 1 Tata Surya"
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#364FFF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Mata Pelajaran (Mapel) <span className="text-rose-500">*</span></span>
                      <span className="text-[11px] text-[#364FFF] font-semibold">11 Pilihan Mapel</span>
                    </label>
                    <select
                      value={selectedStandardSubject}
                      onChange={(e) => {
                        const newSub = e.target.value as StandardSubject;
                        setSelectedStandardSubject(newSub);
                        if (newSub !== 'Lainnya') {
                          setCustomSubject('');
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#364FFF] shadow-2xs cursor-pointer"
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
                          placeholder="Contoh: Bahasa Sunda, Pramuka, Robotik, dsb."
                          className="w-full px-3.5 py-2 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#364FFF] bg-slate-50"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Topik / Bab Materi (Opsional)
                    </label>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="Contoh: Benda Langit & Gravitasi"
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#364FFF]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#364FFF]" />
                        <span>Durasi (Menit)</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                        placeholder="0 = Tanpa Batas"
                        className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#364FFF]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-amber-900 mb-1 flex items-center gap-1.5" title="Poin dikumpulkan siswa untuk leaderboard dan hadiah dari guru">
                        <PointIcon className="w-3.5 h-3.5" />
                        <span>Hadiah Poin</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={rewardPoints}
                        onChange={(e) => setRewardPoints(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full px-3 py-2.5 rounded-2xl border border-amber-200 bg-amber-50/40 text-sm font-bold text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        title="Poin untuk peringkat Leaderboard"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-indigo-900 mb-1 flex items-center gap-1.5" title="XP digunakan siswa untuk meningkatkan Level prestasi">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Hadiah XP</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={rewardXp}
                        onChange={(e) => setRewardXp(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full px-3 py-2.5 rounded-2xl border border-indigo-200 bg-indigo-50/40 text-sm font-bold text-indigo-950 focus:outline-none focus:ring-2 focus:ring-[#364FFF]"
                        title="XP untuk Kenaikan Level"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Petunjuk / Deskripsi Kuis
                    </label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Tuliskan petunjuk pengerjaan kuis untuk murid..."
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#364FFF]"
                    />
                  </div>

                  {/* Options */}
                  <div className="md:col-span-2 flex flex-wrap gap-4 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer bg-white px-3.5 py-2 rounded-2xl border border-slate-200 shadow-2xs">
                      <input
                        type="checkbox"
                        checked={shuffleQuestions}
                        onChange={(e) => setShuffleQuestions(e.target.checked)}
                        className="w-4 h-4 rounded text-[#364FFF] focus:ring-[#364FFF]"
                      />
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Shuffle className="w-3.5 h-3.5 text-slate-500" />
                        Acak Urutan Soal untuk Siswa
                      </span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer bg-white px-3.5 py-2 rounded-2xl border border-slate-200 shadow-2xs">
                      <input
                        type="checkbox"
                        checked={showScoreImmediately}
                        onChange={(e) => setShowScoreImmediately(e.target.checked)}
                        className="w-4 h-4 rounded text-[#364FFF] focus:ring-[#364FFF]"
                      />
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Tampilkan Skor Langsung Selesai Mengerjakan
                      </span>
                    </label>
                  </div>

                  {/* Scheduling and Due Date Section */}
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-200/80">
                    {/* Jadwal Terbit (openAt) */}
                    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isScheduled}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setIsScheduled(checked);
                              if (checked && (!openAt || new Date(openAt) <= new Date())) {
                                setOpenAt(getSuggestedScheduleDate());
                              }
                            }}
                            className="w-4 h-4 rounded text-[#364FFF] focus:ring-[#364FFF]"
                          />
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            Jadwalkan Waktu Terbit Kuis
                          </span>
                        </label>
                        {isScheduled && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                            Terjadwal
                          </span>
                        )}
                      </div>

                      {isScheduled && (
                        <div className="space-y-1.5 pt-1">
                          <input
                            type="datetime-local"
                            value={openAt}
                            onChange={(e) => {
                              setOpenAt(e.target.value);
                              if (errorMsg) setErrorMsg(null);
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#364FFF]"
                          />
                          <p className="text-[11px] text-slate-500">
                            Kuis baru akan otomatis terbit dan dapat dikerjakan siswa pada tanggal & jam di atas.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Tenggat Waktu (dueAt) */}
                    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={hasDueDate}
                            onChange={(e) => {
                              setHasDueDate(e.target.checked);
                              if (!e.target.checked) setDueAt('');
                            }}
                            className="w-4 h-4 rounded text-[#364FFF] focus:ring-[#364FFF]"
                          />
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-rose-500" />
                            Tenggat / Batas Waktu Kuis
                          </span>
                        </label>
                        {hasDueDate && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                            Ada Tenggat
                          </span>
                        )}
                      </div>

                      {hasDueDate && (
                        <div className="space-y-1.5 pt-1">
                          <input
                            type="datetime-local"
                            value={dueAt}
                            onChange={(e) => {
                              setDueAt(e.target.value);
                              if (errorMsg) setErrorMsg(null);
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#364FFF]"
                          />
                          <p className="text-[11px] text-slate-500">
                            Siswa tidak dapat mengerjakan kuis setelah batas waktu ini terlewati.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Hubungkan dengan Tugas Kelas (Linked Assignment) */}
                    <div className="md:col-span-2 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/90 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                          <Link2 className="w-4 h-4 text-indigo-600" />
                          <span>Hubungkan dengan Tugas Kelas (Opsional)</span>
                        </label>
                        {linkedAssignmentId && (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                            🔗 Kuis Terhubung
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Ketika murid selesai mengirimkan tugas kelas yang dipilih, mereka akan langsung diarahkan untuk mengerjakan kuis ini.
                      </p>
                      <div className="pt-1">
                        <select
                          value={linkedAssignmentId}
                          onChange={(e) => setLinkedAssignmentId(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-white text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#364FFF] shadow-2xs cursor-pointer"
                        >
                          <option value="">-- Tidak Dihubungkan / Kuis Mandiri --</option>
                          {assignments
                            .filter((asg) =>
                              selectedClassIds.length > 0
                                ? asg.classIds.some((cid) => selectedClassIds.includes(cid))
                                : true
                            )
                            .map((asg) => (
                              <option key={asg.id} value={asg.id}>
                                [{asg.subject}] {asg.title} {asg.dueAt ? `(Tenggat: ${new Date(asg.dueAt).toLocaleDateString('id-ID')})` : ''}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Question List Header Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <span>Daftar Soal</span>
                    <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-white text-xs font-black">
                      {questions.length}
                    </span>
                  </h3>
                  <span
                    className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-bold"
                    title="Nilai akhir kuis otomatis dikonversi ke skala 100"
                  >
                    Total: {totalPoints} Poin • Skala 100
                  </span>
                </div>

                {/* Minimalist Action Controls */}
                <div className="flex items-center gap-2 relative">
                  {/* Impor AI Button */}
                  <button
                    type="button"
                    onClick={() => setIsBulkImportOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold hover:bg-amber-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Bot className="w-3.5 h-3.5 text-amber-600" />
                    <span>Impor AI / JSON</span>
                  </button>

                  {/* Add Question Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsAddMenuOpen((prev) => !prev)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#364FFF] text-white text-xs font-bold hover:bg-indigo-600 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Soal</span>
                      <ChevronDown className="w-3 h-3 ml-0.5 opacity-80" />
                    </button>

                    {isAddMenuOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-20"
                          onClick={() => setIsAddMenuOpen(false)}
                        />
                        <div className="absolute right-0 top-full mt-1.5 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 z-30 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                          <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Pilih Bentuk Soal:
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              handleAddQuestion('single_choice');
                              setIsAddMenuOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-800 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                            <span>Pilihan Ganda (PG)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleAddQuestion('complex_multiple_choice');
                              setIsAddMenuOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-800 hover:bg-purple-50 hover:text-purple-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                            <span>PG Kompleks</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleAddQuestion('matching');
                              setIsAddMenuOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-800 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                            <span>Menjodohkan</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleAddQuestion('short_answer');
                              setIsAddMenuOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-800 hover:bg-amber-50 hover:text-amber-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                            <span>Isian Singkat</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleAddQuestion('essay');
                              setIsAddMenuOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-800 hover:bg-rose-50 hover:text-rose-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                            <span>Uraian / Esai</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Questions Accordion / List */}
              <div className="space-y-5">
                {questions.map((q, qIndex) => {
                  const typeCfg = QUESTION_TYPE_CONFIG[q.type];

                  return (
                    <div
                      key={q.id}
                      className="bg-white border-2 border-slate-200 rounded-3xl p-5 shadow-xs transition-all hover:border-slate-300 relative space-y-4"
                    >
                      {/* Question Card Top Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-xl bg-slate-900 text-white font-black text-sm flex items-center justify-center">
                            {qIndex + 1}
                          </span>
                          <span className={`px-2.5 py-1 rounded-xl text-xs font-extrabold border ${typeCfg.color}`}>
                            {typeCfg.label}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 mr-2">
                            <label className="text-xs font-bold text-slate-500">Bobot:</label>
                            <input
                              type="number"
                              min="1"
                              value={q.points}
                              onChange={(e) =>
                                handleUpdateQuestion(qIndex, {
                                  points: Math.max(1, parseInt(e.target.value) || 1),
                                })
                              }
                              className="w-14 px-2 py-1 rounded-xl border border-slate-200 text-xs font-extrabold text-center text-slate-800"
                            />
                            <span className="text-xs text-slate-400 font-bold">pt</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleMoveQuestion(qIndex, 'up')}
                            disabled={qIndex === 0}
                            title="Pindah ke Atas"
                            className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveQuestion(qIndex, 'down')}
                            disabled={qIndex === questions.length - 1}
                            title="Pindah ke Bawah"
                            className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateQuestion(qIndex)}
                            title="Duplikasi Soal"
                            className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(qIndex)}
                            title="Hapus Soal"
                            className="p-1.5 rounded-xl border border-rose-200 text-rose-500 hover:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Question Prompt WYSIWYG Editor with Free-Transform Image Resize */}
                      <div>
                        <RichQuestionEditor
                          value={q.prompt}
                          onChange={(val) => handleUpdateQuestion(qIndex, { prompt: val })}
                          placeholder="Tuliskan teks pertanyaan di sini... Anda bisa langsung paste (Ctrl+V) gambar di tengah teks dan klik gambar untuk resize (free transform)..."
                        />
                      </div>

                      {/* 1. Format: Pilihan Ganda (PG) */}
                      {q.type === 'single_choice' && (
                        <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-600">
                              Opsi Pilihan (Pilih 1 Jawaban Benar dengan Klik Radio):
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const currentOpts = q.options || [];
                                if (currentOpts.length < 6) {
                                  handleUpdateQuestion(qIndex, { options: [...currentOpts, ''] });
                                }
                              }}
                              className="text-xs font-bold text-[#364FFF] hover:underline cursor-pointer"
                            >
                              + Tambah Opsi
                            </button>
                          </div>

                          <div className="space-y-2">
                            {(q.options || []).map((opt, optIdx) => {
                              const isCorrect = q.correctOptionIndex === optIdx;
                              const optLabel = String.fromCharCode(65 + optIdx); // A, B, C, D...

                              return (
                                <div key={optIdx} className="flex items-center gap-2.5">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateQuestion(qIndex, { correctOptionIndex: optIdx })}
                                    className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center transition-all cursor-pointer ${
                                      isCorrect
                                        ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                                        : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                                    }`}
                                  >
                                    {isCorrect ? <Check className="w-4 h-4" /> : optLabel}
                                  </button>
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => {
                                      const newOpts = [...(q.options || [])];
                                      newOpts[optIdx] = e.target.value;
                                      handleUpdateQuestion(qIndex, { options: newOpts });
                                    }}
                                    placeholder={`Pilihan ${optLabel}`}
                                    className={`flex-1 px-3.5 py-2 rounded-xl text-xs font-semibold border bg-white focus:outline-none focus:ring-2 ${
                                      isCorrect
                                        ? 'border-emerald-300 text-emerald-950 font-bold ring-1 ring-emerald-200'
                                        : 'border-slate-200 text-slate-800'
                                    }`}
                                  />
                                  {(q.options || []).length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newOpts = (q.options || []).filter((_, idx) => idx !== optIdx);
                                        const newCorrect =
                                          q.correctOptionIndex === optIdx
                                            ? 0
                                            : q.correctOptionIndex && q.correctOptionIndex > optIdx
                                            ? q.correctOptionIndex - 1
                                            : q.correctOptionIndex;
                                        handleUpdateQuestion(qIndex, {
                                          options: newOpts,
                                          correctOptionIndex: newCorrect,
                                        });
                                      }}
                                      className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 2. Format: Pilihan Ganda Kompleks */}
                      {q.type === 'complex_multiple_choice' && (
                        <div className="space-y-3 bg-purple-50/50 p-4 rounded-2xl border border-purple-200/70">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-purple-900">
                              Mode Soal Kompleks:
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateQuestion(qIndex, {
                                    complexMode: 'true_false',
                                    complexStatements:
                                      q.complexStatements?.length
                                        ? q.complexStatements
                                        : [
                                            { id: 'stmt_1', statement: '', isCorrect: true },
                                            { id: 'stmt_2', statement: '', isCorrect: false },
                                          ],
                                  })
                                }
                                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                  q.complexMode !== 'multi_select'
                                    ? 'bg-purple-700 text-white shadow-xs'
                                    : 'bg-white border border-purple-200 text-purple-700'
                                }`}
                              >
                                Matriks Benar / Salah
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateQuestion(qIndex, {
                                    complexMode: 'multi_select',
                                    options: q.options?.length ? q.options : ['', '', '', ''],
                                    correctOptionIndices: q.correctOptionIndices?.length ? q.correctOptionIndices : [0, 1],
                                  })
                                }
                                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                  q.complexMode === 'multi_select'
                                    ? 'bg-purple-700 text-white shadow-xs'
                                    : 'bg-white border border-purple-200 text-purple-700'
                                }`}
                              >
                                Multi-Pilihan (Centang Beberapa)
                              </button>
                            </div>
                          </div>

                          {q.complexMode === 'multi_select' ? (
                            /* Multi Select Checkbox Options */
                            <div className="space-y-2 pt-2">
                              <p className="text-[11px] font-bold text-purple-800">
                                Centang semua kotak jawaban yang benar:
                              </p>
                              {(q.options || []).map((opt, optIdx) => {
                                const selectedArr = q.correctOptionIndices || [];
                                const isChecked = selectedArr.includes(optIdx);
                                const optLabel = String.fromCharCode(65 + optIdx);

                                return (
                                  <div key={optIdx} className="flex items-center gap-2.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newSelected = isChecked
                                          ? selectedArr.filter((i) => i !== optIdx)
                                          : [...selectedArr, optIdx];
                                        handleUpdateQuestion(qIndex, {
                                          correctOptionIndices: newSelected,
                                        });
                                      }}
                                      className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center transition-all cursor-pointer ${
                                        isChecked
                                          ? 'bg-purple-700 text-white ring-2 ring-purple-300'
                                          : 'bg-white border border-purple-300 text-purple-800'
                                      }`}
                                    >
                                      {isChecked ? <Check className="w-4 h-4" /> : optLabel}
                                    </button>
                                    <input
                                      type="text"
                                      value={opt}
                                      onChange={(e) => {
                                        const newOpts = [...(q.options || [])];
                                        newOpts[optIdx] = e.target.value;
                                        handleUpdateQuestion(qIndex, { options: newOpts });
                                      }}
                                      placeholder={`Pilihan ${optLabel}`}
                                      className="flex-1 px-3.5 py-2 rounded-xl text-xs font-semibold border border-purple-200 bg-white"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            /* True / False Statement Table */
                            <div className="space-y-2.5 pt-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-purple-800">
                                  Daftar Pernyataan & Kunci Nilai:
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentStmts = q.complexStatements || [];
                                    handleUpdateQuestion(qIndex, {
                                      complexStatements: [
                                        ...currentStmts,
                                        {
                                          id: `stmt_${Date.now()}_${currentStmts.length + 1}`,
                                          statement: '',
                                          isCorrect: true,
                                        },
                                      ],
                                    });
                                  }}
                                  className="text-xs font-bold text-purple-700 hover:underline cursor-pointer"
                                >
                                  + Tambah Baris Pernyataan
                                </button>
                              </div>

                              {(q.complexStatements || []).map((stmt, stmtIdx) => (
                                <div
                                  key={stmt.id || stmtIdx}
                                  className="flex items-center gap-2.5 bg-white p-2.5 rounded-xl border border-purple-200"
                                >
                                  <span className="text-xs font-bold text-purple-900 w-5">
                                    {stmtIdx + 1}.
                                  </span>
                                  <input
                                    type="text"
                                    value={stmt.statement}
                                    onChange={(e) => {
                                      const copy = [...(q.complexStatements || [])];
                                      copy[stmtIdx] = { ...copy[stmtIdx], statement: e.target.value };
                                      handleUpdateQuestion(qIndex, { complexStatements: copy });
                                    }}
                                    placeholder="Tuliskan pernyataan..."
                                    className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200"
                                  />

                                  {/* True / False Toggle */}
                                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const copy = [...(q.complexStatements || [])];
                                        copy[stmtIdx] = { ...copy[stmtIdx], isCorrect: true };
                                        handleUpdateQuestion(qIndex, { complexStatements: copy });
                                      }}
                                      className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold cursor-pointer transition-all ${
                                        stmt.isCorrect
                                          ? 'bg-emerald-600 text-white shadow-2xs'
                                          : 'text-slate-500 hover:text-slate-800'
                                      }`}
                                    >
                                      Benar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const copy = [...(q.complexStatements || [])];
                                        copy[stmtIdx] = { ...copy[stmtIdx], isCorrect: false };
                                        handleUpdateQuestion(qIndex, { complexStatements: copy });
                                      }}
                                      className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold cursor-pointer transition-all ${
                                        !stmt.isCorrect
                                          ? 'bg-rose-600 text-white shadow-2xs'
                                          : 'text-slate-500 hover:text-slate-800'
                                      }`}
                                    >
                                      Salah
                                    </button>
                                  </div>

                                  {(q.complexStatements || []).length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const copy = (q.complexStatements || []).filter((_, idx) => idx !== stmtIdx);
                                        handleUpdateQuestion(qIndex, { complexStatements: copy });
                                      }}
                                      className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 3. Format: Menjodohkan (Matching) */}
                      {q.type === 'matching' && (
                        <div className="space-y-3 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-emerald-900">
                              Pasangan Menjodohkan (Kiri ➔ Kanan):
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const currentPairs = q.matchingPairs || [];
                                handleUpdateQuestion(qIndex, {
                                  matchingPairs: [
                                    ...currentPairs,
                                    {
                                      id: `pair_${Date.now()}_${currentPairs.length + 1}`,
                                      left: '',
                                      right: '',
                                    },
                                  ],
                                });
                              }}
                              className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                            >
                              + Tambah Pasangan
                            </button>
                          </div>

                          <div className="space-y-2.5">
                            {(q.matchingPairs || []).map((pair, pairIdx) => (
                              <div
                                key={pair.id || pairIdx}
                                className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-emerald-200"
                              >
                                <span className="text-xs font-bold text-emerald-800 w-5">
                                  {pairIdx + 1}.
                                </span>
                                <input
                                  type="text"
                                  value={pair.left}
                                  onChange={(e) => {
                                    const copy = [...(q.matchingPairs || [])];
                                    copy[pairIdx] = { ...copy[pairIdx], left: e.target.value };
                                    handleUpdateQuestion(qIndex, { matchingPairs: copy });
                                  }}
                                  placeholder="Premis Kiri (Pertanyaan)"
                                  className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200"
                                />

                                <MoveRight className="w-4 h-4 text-emerald-600 shrink-0" />

                                <input
                                  type="text"
                                  value={pair.right}
                                  onChange={(e) => {
                                    const copy = [...(q.matchingPairs || [])];
                                    copy[pairIdx] = { ...copy[pairIdx], right: e.target.value };
                                    handleUpdateQuestion(qIndex, { matchingPairs: copy });
                                  }}
                                  placeholder="Pasangan Kanan (Jawaban Benar)"
                                  className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-emerald-300 bg-emerald-50/30 text-emerald-950 font-bold"
                                />

                                {(q.matchingPairs || []).length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const copy = (q.matchingPairs || []).filter((_, idx) => idx !== pairIdx);
                                      handleUpdateQuestion(qIndex, { matchingPairs: copy });
                                    }}
                                    className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 4. Format: Isian Singkat */}
                      {q.type === 'short_answer' && (
                        <div className="space-y-3 bg-amber-50/50 p-4 rounded-2xl border border-amber-200">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-amber-900">
                              Kunci Jawaban Isian Singkat:
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const current = q.acceptedAnswers || [];
                                handleUpdateQuestion(qIndex, { acceptedAnswers: [...current, ''] });
                              }}
                              className="text-xs font-bold text-amber-700 hover:underline cursor-pointer"
                            >
                              + Tambah Alternatif Jawaban
                            </button>
                          </div>

                          <div className="space-y-2">
                            {(q.acceptedAnswers || ['']).map((ans, ansIdx) => (
                              <div key={ansIdx} className="flex items-center gap-2">
                                <span className="text-xs font-bold text-amber-800 w-5">
                                  {ansIdx + 1}.
                                </span>
                                <input
                                  type="text"
                                  value={ans}
                                  onChange={(e) => {
                                    const copy = [...(q.acceptedAnswers || [''])];
                                    copy[ansIdx] = e.target.value;
                                    handleUpdateQuestion(qIndex, { acceptedAnswers: copy });
                                  }}
                                  placeholder="Contoh: Fotosintesis / Fotosintesa"
                                  className="flex-1 px-3.5 py-2 rounded-xl text-xs font-bold border border-amber-300 bg-white text-slate-900"
                                />
                                {(q.acceptedAnswers || []).length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const copy = (q.acceptedAnswers || []).filter((_, idx) => idx !== ansIdx);
                                      handleUpdateQuestion(qIndex, { acceptedAnswers: copy });
                                    }}
                                    className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>

                          <label className="flex items-center gap-2 cursor-pointer pt-1">
                            <input
                              type="checkbox"
                              checked={q.caseSensitive || false}
                              onChange={(e) => handleUpdateQuestion(qIndex, { caseSensitive: e.target.checked })}
                              className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500"
                            />
                            <span className="text-[11px] font-bold text-amber-800">
                              Sensitif Huruf Besar / Kecil (Case Sensitive)
                            </span>
                          </label>
                        </div>
                      )}

                      {/* 5. Format: Uraian / Esai */}
                      {q.type === 'essay' && (
                        <div className="space-y-3 bg-rose-50/50 p-4 rounded-2xl border border-rose-200">
                          <span className="text-xs font-black text-rose-900 block">
                            Rubrik / Pedoman Kunci Penilaian Guru:
                          </span>
                          <textarea
                            rows={3}
                            value={q.essayRubric || ''}
                            onChange={(e) => handleUpdateQuestion(qIndex, { essayRubric: e.target.value })}
                            placeholder="Tuliskan poin-poin penting atau kata kunci yang harus ada pada jawaban siswa untuk pedoman penilaian manual guru..."
                            className="w-full px-3.5 py-2.5 rounded-xl border border-rose-200 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-400"
                          />
                        </div>
                      )}

                      {/* Pembahasan / Penjelasan Opsional */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                          <HelpCircle className="w-3 h-3 text-[#364FFF]" />
                          Pembahasan / Penjelasan Jawaban (Akan tampil setelah siswa menyelesaikan kuis):
                        </label>
                        <input
                          type="text"
                          value={q.explanation || ''}
                          onChange={(e) => handleUpdateQuestion(qIndex, { explanation: e.target.value })}
                          placeholder="Contoh: Yupiter adalah planet terbesar di tata surya..."
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700"
                        />
                      </div>
                    </div>
                  );
                })}

                {/* Bottom Add Question Bar */}
                <div className="pt-2 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('single_choice')}
                    className="px-5 py-2.5 rounded-2xl border-2 border-dashed border-slate-300 text-slate-600 hover:border-[#364FFF] hover:text-[#364FFF] hover:bg-blue-50/50 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Tambah Butir Soal Baru</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Student Preview Mode */
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="p-6 rounded-3xl bg-gradient-to-br from-[#101936] to-[#1C1242] text-white shadow-xl">
                <span className="px-3 py-1 rounded-full bg-white/20 text-white font-extrabold text-xs uppercase tracking-wider">
                  Simulasi Tampilan Siswa
                </span>
                <h2 className="text-xl font-black mt-3 text-white">
                  {title || 'Judul Kuis Belum Diisi'}
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  {selectedStandardSubject === 'Lainnya' && customSubject.trim() ? customSubject.trim() : selectedStandardSubject} • {topic || 'Topik Umum'}
                </p>
                <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-white/10 text-xs font-bold text-slate-200">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#FFD83D]" />
                    <span>Durasi: {durationMinutes > 0 ? `${durationMinutes} Menit` : 'Bebas'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileQuestion className="w-4 h-4 text-[#364FFF]" />
                    <span>{questions.length} Butir Soal</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#FFD83D]" />
                    <span>+{rewardPoints} XP Hadiah</span>
                  </div>
                </div>
              </div>

              {/* Questions Preview */}
              <div className="space-y-4">
                {questions.map((q, qIdx) => (
                  <div key={q.id} className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between text-xs font-extrabold">
                      <span className="text-slate-500">Soal Nomor {qIdx + 1}</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {q.points} Poin
                      </span>
                    </div>

                    <div className="text-sm font-bold text-slate-900">
                      <RichQuestionPrompt text={q.prompt} fallbackImageUrl={q.imageUrl} theme="light" />
                    </div>

                    {/* Single choice preview */}
                    {q.type === 'single_choice' && (
                      <div className="space-y-2 pt-1">
                        {(q.options || []).map((opt, optIdx) => (
                          <div
                            key={optIdx}
                            className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 bg-slate-50/60 text-xs font-semibold text-slate-800"
                          >
                            <span className="w-6 h-6 rounded-lg bg-white border border-slate-300 flex items-center justify-center font-bold text-[11px]">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span>{opt || `Pilihan ${String.fromCharCode(65 + optIdx)}`}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Complex true/false preview */}
                    {q.type === 'complex_multiple_choice' && q.complexMode === 'true_false' && (
                      <div className="space-y-2 pt-1">
                        {(q.complexStatements || []).map((stmt, sIdx) => (
                          <div key={stmt.id || sIdx} className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 bg-purple-50/30 text-xs font-semibold">
                            <span className="text-slate-800 flex-1 mr-3">{stmt.statement || `Pernyataan ${sIdx + 1}`}</span>
                            <div className="flex gap-1 shrink-0">
                              <span className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold">Benar</span>
                              <span className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold">Salah</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Matching preview */}
                    {q.type === 'matching' && (
                      <div className="space-y-2 pt-1">
                        {(q.matchingPairs || []).map((pair, pIdx) => (
                          <div key={pair.id || pIdx} className="flex items-center justify-between p-3 rounded-2xl border border-emerald-200 bg-emerald-50/30 text-xs font-semibold">
                            <span className="text-slate-800">{pair.left || `Premis ${pIdx + 1}`}</span>
                            <div className="flex items-center gap-2">
                              <MoveRight className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="px-3 py-1 rounded-xl bg-white border border-emerald-300 text-emerald-900 font-bold">
                                {pair.right || `Jawaban ${pIdx + 1}`}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Short Answer Preview */}
                    {q.type === 'short_answer' && (
                      <div className="pt-1">
                        <input
                          type="text"
                          disabled
                          placeholder="Ketik jawaban singkat di sini..."
                          className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs text-slate-500 italic"
                        />
                      </div>
                    )}

                    {/* Essay Preview */}
                    {q.type === 'essay' && (
                      <div className="pt-1">
                        <textarea
                          rows={3}
                          disabled
                          placeholder="Ketik jawaban uraian lengkap di sini..."
                          className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-xs text-slate-500 italic"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-xs font-bold text-slate-500">
            {questions.length} Butir Soal • Total Bobot {totalPoints} Poin •{' '}
            <span className="text-[#364FFF] font-extrabold">Nilai Otomatis Dikonversi ke Skala 100</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => handleSave('draft')}
              className="px-4 py-2.5 rounded-2xl bg-slate-200 text-slate-800 font-bold text-xs hover:bg-slate-300 transition-colors cursor-pointer"
            >
              Simpan Sebagai Draf
            </button>

            {isScheduled ? (
              <button
                type="button"
                onClick={() => handleSave('published')}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-extrabold text-xs shadow-lg shadow-amber-600/25 hover:opacity-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Clock className="w-4 h-4" />
                <span>{initialQuiz?.id ? 'Simpan Jadwal Kuis' : '⏰ Jadwalkan Kuis'}</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsScheduled(true);
                    if (!openAt || new Date(openAt) <= new Date()) {
                      setOpenAt(getSuggestedScheduleDate());
                    }
                  }}
                  className="px-4 py-2.5 rounded-2xl border border-amber-200 bg-amber-50 text-amber-800 font-bold text-xs hover:bg-amber-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Jadwalkan...</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSave('published')}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#364FFF] to-[#6339FF] text-white font-extrabold text-xs shadow-lg shadow-indigo-600/25 hover:opacity-95 transition-all cursor-pointer"
                >
                  {initialQuiz?.id ? 'Simpan Perubahan Kuis' : '🚀 Publikasikan Kuis'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* AI & JSON Bulk Import Modal */}
      <QuizBulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onImport={handleBulkImport}
      />
    </div>
  );
};
