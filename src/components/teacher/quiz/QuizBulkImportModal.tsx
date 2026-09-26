import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  Award,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Code,
  Copy,
  FileCheck,
  FileQuestion,
  FileText,
  HelpCircle,
  Layers,
  ListChecks,
  ListPlus,
  MoveRight,
  PenTool,
  Plus,
  RefreshCw,
  Sparkles,
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

interface QuizBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (
    importedQuestions: QuizQuestion[],
    quizMetadata?: {
      title?: string;
      subject?: string;
      topic?: string;
      durationMinutes?: number;
      rewardPoints?: number;
      rewardXp?: number;
    },
    mode?: 'replace' | 'append'
  ) => void;
}

export const AI_EXTRACTION_PROMPT_TEMPLATE = `Anda adalah asisten ahli kurikulum sekolah dan pembuat soal ujian untuk platform edukasi gamifikasi GAMI CLASS.

TUGAS ANDA:
Ekstrak seluruh butir soal dari dokumen, teks, atau foto soal yang saya lampirkan menjadi format JSON terstruktur yang VALID dan TEPAT sesuai pedoman schema di bawah ini.

FORMAT OUTPUT JSON:
{
  "title": "Judul Kuis / Penilaian Harian",
  "subject": "Nama Mapel (contoh: IPAS, Matematika, B. Indonesia, Pendidikan Pancasila, dll)",
  "topic": "Topik atau Bab Pembahasan",
  "durationMinutes": 30,
  "rewardPoints": 50, // Hadiah Poin Leaderboard & Reward Guru
  "rewardXp": 50, // Hadiah XP Kenaikan Level Siswa
  "questions": [
    // 1. Tipe Pilihan Ganda Biasa (single_choice)
    {
      "type": "single_choice",
      "prompt": "Teks pertanyaan...",
      "points": 10,
      "options": ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"],
      "correctOptionIndex": 0, // Angka 0=A, 1=B, 2=C, 3=D
      "explanation": "Pembahasan kunci jawaban (opsional)"
    },
    // 2. Tipe PG Kompleks Benar / Salah (complex_multiple_choice)
    {
      "type": "complex_multiple_choice",
      "prompt": "Tentukan Benar atau Salah untuk setiap pernyataan berikut:",
      "points": 10,
      "complexMode": "true_false",
      "complexStatements": [
        { "id": "stmt_1", "statement": "Teks pernyataan 1...", "isCorrect": true },
        { "id": "stmt_2", "statement": "Teks pernyataan 2...", "isCorrect": false }
      ],
      "explanation": "Pembahasan (opsional)"
    },
    // 3. Tipe PG Kompleks Multi-Pilihan (complex_multiple_choice)
    {
      "type": "complex_multiple_choice",
      "prompt": "Pilihlah 2 atau lebih jawaban yang benar:",
      "points": 10,
      "complexMode": "multi_select",
      "options": ["Opsi A", "Opsi B", "Opsi C", "Opsi D"],
      "correctOptionIndices": [0, 2], // Indeks opsi benar (misal A dan C)
      "explanation": "Pembahasan (opsional)"
    },
    // 4. Tipe Menjodohkan (matching)
    {
      "type": "matching",
      "prompt": "Jodohkan istilah di sebelah kiri dengan keterangan yang tepat di sebelah kanan:",
      "points": 10,
      "matchingPairs": [
        { "id": "pair_1", "left": "Klorofil", "right": "Zat hijau daun untuk fotosintesis" },
        { "id": "pair_2", "left": "Stomata", "right": "Mulut daun tempat pertukaran gas" }
      ],
      "explanation": "Pembahasan (opsional)"
    },
    // 5. Tipe Isian Singkat (short_answer)
    {
      "type": "short_answer",
      "prompt": "Teks soal isian singkat...",
      "points": 10,
      "acceptedAnswers": ["Fotosintesis", "Fotosintesa"], // Variasi alternatif jawaban yang benar
      "caseSensitive": false,
      "explanation": "Pembahasan (opsional)"
    },
    // 6. Tipe Uraian / Esai (essay)
    {
      "type": "essay",
      "prompt": "Jelaskan proses terjadinya siklus air secara berurutan!",
      "points": 20,
      "essayRubric": "Pedoman penilaian: Evaporasi -> Kondensasi -> Presipitasi -> Infiltrasi",
      "explanation": "Pembahasan (opsional)"
    }
  ]
}

ATURAN WAJIB:
1. Berikan HANYA blok JSON murni tanpa kata pengantar atau penutup apapun di luar JSON.
2. Pastikan nilai "type" salah satu dari: "single_choice", "complex_multiple_choice", "matching", "short_answer", "essay".
3. Indeks opsi (correctOptionIndex) selalu berbasis angka 0 (0 = A, 1 = B, 2 = C, 3 = D, 4 = E).
4. Tentukan bobot poin ("points") secara wajar (misal PG=10, Uraian=20).`;

export const QuizBulkImportModal: React.FC<QuizBulkImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [activeTab, setActiveTab] = useState<'prompt' | 'paste'>('prompt');
  const [jsonText, setJsonText] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');

  // Parse & Validate JSON
  const parseResult = useMemo(() => {
    if (!jsonText.trim()) return null;

    try {
      // Clean possible markdown code fences
      let cleaned = jsonText.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
      }

      const parsed = JSON.parse(cleaned);
      let rawQuestions: any[] = [];
      let metadata: any = {};

      if (Array.isArray(parsed)) {
        rawQuestions = parsed;
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.questions)) {
          rawQuestions = parsed.questions;
          metadata = {
            title: parsed.title,
            subject: parsed.subject,
            topic: parsed.topic,
            durationMinutes: parsed.durationMinutes,
            rewardPoints: parsed.rewardPoints,
          };
        } else {
          return { error: 'Format JSON harus berisi array "questions" atau array daftar soal.' };
        }
      } else {
        return { error: 'Format JSON tidak valid.' };
      }

      if (rawQuestions.length === 0) {
        return { error: 'Array "questions" kosong, tidak ada butir soal yang ditemukan.' };
      }

      // Normalize and sanitize questions
      const normalizedQuestions: QuizQuestion[] = rawQuestions.map((q: any, idx: number) => {
        const id = q.id || `q_bulk_${Date.now()}_${idx + 1}_${Math.random().toString(36).substring(2, 6)}`;
        const validTypes: QuizQuestionType[] = [
          'single_choice',
          'complex_multiple_choice',
          'matching',
          'short_answer',
          'essay',
        ];

        let type: QuizQuestionType = validTypes.includes(q.type) ? q.type : 'single_choice';

        const base: QuizQuestion = {
          id,
          type,
          prompt: q.prompt || `Soal Nomor ${idx + 1}`,
          points: Number(q.points) > 0 ? Number(q.points) : 10,
          explanation: q.explanation || '',
          imageUrl: q.imageUrl || undefined,
        };

        if (type === 'single_choice') {
          base.options = Array.isArray(q.options) && q.options.length > 0 ? q.options : ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D'];
          base.correctOptionIndex = typeof q.correctOptionIndex === 'number' ? q.correctOptionIndex : 0;
        } else if (type === 'complex_multiple_choice') {
          base.complexMode = q.complexMode === 'multi_select' ? 'multi_select' : 'true_false';
          if (base.complexMode === 'multi_select') {
            base.options = Array.isArray(q.options) ? q.options : ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D'];
            base.correctOptionIndices = Array.isArray(q.correctOptionIndices) ? q.correctOptionIndices : [0];
          } else {
            base.complexStatements = Array.isArray(q.complexStatements)
              ? q.complexStatements.map((s: any, sIdx: number) => ({
                  id: s.id || `stmt_${Date.now()}_${sIdx}`,
                  statement: s.statement || `Pernyataan ${sIdx + 1}`,
                  isCorrect: Boolean(s.isCorrect),
                }))
              : [
                  { id: `stmt_${Date.now()}_1`, statement: 'Pernyataan 1', isCorrect: true },
                  { id: `stmt_${Date.now()}_2`, statement: 'Pernyataan 2', isCorrect: false },
                ];
          }
        } else if (type === 'matching') {
          base.matchingPairs = Array.isArray(q.matchingPairs)
            ? q.matchingPairs.map((p: any, pIdx: number) => ({
                id: p.id || `pair_${Date.now()}_${pIdx}`,
                left: p.left || `Item Kiri ${pIdx + 1}`,
                right: p.right || `Pasangan Kanan ${pIdx + 1}`,
              }))
            : [
                { id: `pair_${Date.now()}_1`, left: 'Premis A', right: 'Jawaban A' },
                { id: `pair_${Date.now()}_2`, left: 'Premis B', right: 'Jawaban B' },
              ];
        } else if (type === 'short_answer') {
          base.acceptedAnswers = Array.isArray(q.acceptedAnswers) && q.acceptedAnswers.length > 0 ? q.acceptedAnswers : [q.prompt || ''];
          base.caseSensitive = Boolean(q.caseSensitive);
        } else if (type === 'essay') {
          base.essayRubric = q.essayRubric || '';
          base.minWords = Number(q.minWords) || 10;
        }

        return base;
      });

      // Stats breakdown
      const typeCounts: Record<QuizQuestionType, number> = {
        single_choice: 0,
        complex_multiple_choice: 0,
        matching: 0,
        short_answer: 0,
        essay: 0,
      };

      normalizedQuestions.forEach((q) => {
        typeCounts[q.type] = (typeCounts[q.type] || 0) + 1;
      });

      return {
        success: true,
        questions: normalizedQuestions,
        metadata,
        typeCounts,
        totalPoints: normalizedQuestions.reduce((acc, q) => acc + q.points, 0),
      };
    } catch (err: any) {
      return { error: `JSON Error: ${err.message || 'Format JSON tidak valid'}` };
    }
  }, [jsonText]);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(AI_EXTRACTION_PROMPT_TEMPLATE);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 3000);
  };

  const handleApplyImport = () => {
    if (!parseResult || !parseResult.questions || parseResult.questions.length === 0) return;
    onImport(parseResult.questions, parseResult.metadata, importMode);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#101936] via-[#1C1242] to-[#364FFF] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-md">
              <Bot className="w-5 h-5 text-[#FFD83D]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black font-display text-white">
                  Impor Soal Kuis Massal (Bulk JSON / AI)
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#FFD83D]/20 border border-[#FFD83D]/40 text-[#FFD83D] text-[10px] font-black uppercase tracking-wider">
                  AI Generator
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                Ekstrak dokumen ujian secara instan dari ChatGPT, Gemini, atau Claude
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-indigo-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('prompt')}
            className={`px-4 py-2.5 rounded-t-2xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer border-t border-x ${
              activeTab === 'prompt'
                ? 'bg-white text-[#364FFF] border-slate-200 shadow-2xs -mb-[1px]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>1. Salin Prompt AI Ekstraksi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`px-4 py-2.5 rounded-t-2xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer border-t border-x ${
              activeTab === 'paste'
                ? 'bg-white text-[#364FFF] border-slate-200 shadow-2xs -mb-[1px]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Code className="w-4 h-4 text-indigo-600" />
            <span>2. Tempel & Impor JSON</span>
            {parseResult?.success && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'prompt' ? (
            <div className="space-y-5">
              {/* How it works banner */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <span className="font-black text-indigo-950 flex items-center gap-1.5 text-sm">
                    <Sparkles className="w-4 h-4 text-[#364FFF]" />
                    Cara Ekstrak Dokumen Soal Menggunakan AI:
                  </span>
                  <ol className="list-decimal list-inside text-indigo-900 space-y-0.5 pt-1">
                    <li>Klik tombol <b>"Salin Prompt AI"</b> di bawah ini.</li>
                    <li>Buka <b>Gemini, ChatGPT, atau Claude</b>, lalu tempelkan prompt tersebut.</li>
                    <li>Lampirkan berkas (Word / PDF / Foto Soal) atau salin teks soal Anda ke AI.</li>
                    <li>Salin hasil JSON dari AI dan tempelkan pada tab <b>"2. Tempel & Impor JSON"</b>.</li>
                  </ol>
                </div>

                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shrink-0 transition-all cursor-pointer shadow-md ${
                    copiedPrompt
                      ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                      : 'bg-[#364FFF] hover:bg-[#2539cc] text-white shadow-indigo-600/20'
                  }`}
                >
                  {copiedPrompt ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Prompt Tersalin! ✓</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Salin Prompt AI</span>
                    </>
                  )}
                </button>
              </div>

              {/* Prompt Box */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    Template Prompt Khusus AI (Siap Digunakan):
                  </label>
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className="text-xs font-bold text-[#364FFF] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Salin Teks</span>
                  </button>
                </div>

                <pre className="p-4 rounded-2xl bg-slate-900 text-slate-200 text-xs font-mono leading-relaxed overflow-x-auto max-h-96 border border-slate-800 selection:bg-indigo-500 selection:text-white whitespace-pre-wrap">
                  {AI_EXTRACTION_PROMPT_TEMPLATE}
                </pre>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#364FFF] to-[#6339FF] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/20 hover:opacity-95 cursor-pointer"
                >
                  <span>Lanjut ke Tempel JSON</span>
                  <MoveRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* JSON Input Area */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5 text-indigo-600" />
                    Tempelkan Kode JSON dari AI di Sini:
                  </label>

                  {jsonText && (
                    <button
                      type="button"
                      onClick={() => setJsonText('')}
                      className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      Bersihkan
                    </button>
                  )}
                </div>

                <textarea
                  rows={8}
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  placeholder={`Contoh format:\n{\n  "title": "Kuis IPAS Bab 1",\n  "questions": [\n    {\n      "type": "single_choice",\n      "prompt": "Contoh pertanyaan...",\n      "options": ["A", "B", "C", "D"],\n      "correctOptionIndex": 0\n    }\n  ]\n}`}
                  className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-900 text-emerald-400 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#364FFF] leading-relaxed shadow-inner"
                />
              </div>

              {/* Parsing Status & Error Message */}
              {parseResult && (
                <div>
                  {parseResult.error ? (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2.5">
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      <div>
                        <span className="font-bold block">Gagal Membaca JSON:</span>
                        <span>{parseResult.error}</span>
                      </div>
                    </div>
                  ) : parseResult.success && parseResult.questions ? (
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-xs sm:text-sm">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          <span>
                            Berhasil Mendeteksi {parseResult.questions.length} Butir Soal ({parseResult.totalPoints} Total Poin)
                          </span>
                        </div>
                        {parseResult.metadata?.title && (
                          <span className="text-[11px] font-bold text-emerald-700 bg-white px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                            {parseResult.metadata.title}
                          </span>
                        )}
                      </div>

                      {/* Type Badge Breakdown */}
                      <div className="flex flex-wrap gap-2 text-[11px] font-bold">
                        {parseResult.typeCounts.single_choice > 0 && (
                          <span className="px-2.5 py-0.5 rounded-lg bg-blue-100 text-blue-800 border border-blue-200">
                            {parseResult.typeCounts.single_choice} PG Biasa
                          </span>
                        )}
                        {parseResult.typeCounts.complex_multiple_choice > 0 && (
                          <span className="px-2.5 py-0.5 rounded-lg bg-purple-100 text-purple-800 border border-purple-200">
                            {parseResult.typeCounts.complex_multiple_choice} PG Kompleks
                          </span>
                        )}
                        {parseResult.typeCounts.matching > 0 && (
                          <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {parseResult.typeCounts.matching} Menjodohkan
                          </span>
                        )}
                        {parseResult.typeCounts.short_answer > 0 && (
                          <span className="px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-200">
                            {parseResult.typeCounts.short_answer} Isian Singkat
                          </span>
                        )}
                        {parseResult.typeCounts.essay > 0 && (
                          <span className="px-2.5 py-0.5 rounded-lg bg-rose-100 text-rose-800 border border-rose-200">
                            {parseResult.typeCounts.essay} Uraian / Esai
                          </span>
                        )}
                      </div>

                      {/* Questions Preview List */}
                      <div className="max-h-56 overflow-y-auto space-y-2 pr-1 pt-1">
                        {parseResult.questions.map((q, qIdx) => (
                          <div
                            key={q.id || qIdx}
                            className="p-3 bg-white rounded-xl border border-emerald-100 text-xs flex items-start justify-between gap-3 shadow-2xs"
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-800 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                {qIdx + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 line-clamp-1">
                                  {q.prompt}
                                </p>
                                <span className="text-[10px] text-slate-400 capitalize">
                                  Format: {q.type.replace(/_/g, ' ')}
                                </span>
                              </div>
                            </div>
                            <span className="text-[11px] font-extrabold text-emerald-700 shrink-0">
                              +{q.points} pt
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Import Mode Options */}
              {parseResult?.success && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">
                    Mode Penggabungan Soal:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label
                      className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                        importMode === 'replace'
                          ? 'bg-white border-[#364FFF] ring-2 ring-[#364FFF]/20 shadow-xs'
                          : 'bg-white/50 border-slate-200 hover:bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                        className="w-4 h-4 text-[#364FFF]"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">
                          Ganti Semua Soal (Replace)
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Menimpa seluruh daftar soal saat ini dengan {parseResult.questions?.length} soal baru
                        </span>
                      </div>
                    </label>

                    <label
                      className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                        importMode === 'append'
                          ? 'bg-white border-[#364FFF] ring-2 ring-[#364FFF]/20 shadow-xs'
                          : 'bg-white/50 border-slate-200 hover:bg-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'append'}
                        onChange={() => setImportMode('append')}
                        className="w-4 h-4 text-[#364FFF]"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">
                          Tambahkan ke Soal Saat Ini (Append)
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Menyisipkan {parseResult.questions?.length} soal ini ke akhir daftar soal yang sudah ada
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
          >
            Tutup
          </button>

          {activeTab === 'paste' && parseResult?.success && (
            <button
              type="button"
              onClick={handleApplyImport}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
            >
              <FileCheck className="w-4 h-4" />
              <span>
                Impor {parseResult.questions?.length} Soal ke Kuis Sekarang
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
