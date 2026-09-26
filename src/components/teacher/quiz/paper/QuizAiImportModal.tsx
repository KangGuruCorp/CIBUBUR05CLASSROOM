import React, { useState } from 'react';
import {
  Sparkles,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
  Code,
  ArrowRight,
  RefreshCw,
  Edit2,
  Trash2,
  FileCheck,
} from 'lucide-react';
import { QuizQuestion } from '../../../../types';
import { AiExtractedQuestion } from '../../../../types/paperMode';
import { LatexRenderer } from '../../../../utils/latex';

interface QuizAiImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportQuestions: (questions: QuizQuestion[]) => void;
}

export const QuizAiImportModal: React.FC<QuizAiImportModalProps> = ({
  isOpen,
  onClose,
  onImportQuestions,
}) => {
  const [tab, setTab] = useState<'upload' | 'json'>('upload');
  const [inputText, setInputText] = useState('');
  const [instructions, setInstructions] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [jsonText, setJsonText] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [extractedQuestions, setExtractedQuestions] = useState<AiExtractedQuestion[]>([]);
  const [step, setStep] = useState<'input' | 'preview'>('input');

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setErrorMsg(null);

    // If image, read as base64
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      const reader = new FileReader();
      reader.onload = () => {
        setInputText(reader.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleRunAiExtraction = async () => {
    if (!inputText.trim() && !imageBase64) {
      setErrorMsg('Harap masukkan teks materi/soal atau unggah foto/dokumen soal terlebih dahulu.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/ai/extract-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          imageBase64: imageBase64,
          mimeType: selectedFile?.type || 'image/jpeg',
          instructions: instructions,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.requiresKey) {
          setErrorMsg(
            'Kunci API Gemini (GEMINI_API_KEY) belum aktif di server. Anda dapat menempelkan JSON secara langsung melalui tab "Tempel JSON Standar" di atas.'
          );
        } else {
          setErrorMsg(data.error || 'Gagal mengekstrak soal dari dokumen.');
        }
        setIsLoading(false);
        return;
      }

      if (Array.isArray(data.questions) && data.questions.length > 0) {
        setExtractedQuestions(data.questions);
        setStep('preview');
      } else {
        setErrorMsg('AI tidak mendeteksi butir soal yang valid dari dokumen yang diberikan.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan jaringan.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleParseJsonInput = () => {
    setErrorMsg(null);
    try {
      const parsed = JSON.parse(jsonText);
      const list = Array.isArray(parsed) ? parsed : parsed.questions;
      if (!Array.isArray(list) || list.length === 0) {
        throw new Error('Format JSON harus berupa array berisi objek soal.');
      }

      const formatted: AiExtractedQuestion[] = list.map((item: any, i: number) => ({
        id_soal: item.id_soal || `q_${i + 1}`,
        teks_soal: item.teks_soal || item.prompt || '',
        pilihan: {
          A: item.pilihan?.A || item.options?.[0] || 'Opsi A',
          B: item.pilihan?.B || item.options?.[1] || 'Opsi B',
          C: item.pilihan?.C || item.options?.[2] || 'Opsi C',
          D: item.pilihan?.D || item.options?.[3] || 'Opsi D',
        },
        kunci_jawaban: (item.kunci_jawaban || 'A').toUpperCase() as any,
        pembahasan: item.pembahasan || item.explanation || '',
      }));

      setExtractedQuestions(formatted);
      setStep('preview');
    } catch (err: any) {
      setErrorMsg(`JSON tidak valid: ${err.message}`);
    }
  };

  const handleFinalImport = () => {
    // Convert AiExtractedQuestion[] to GAMI CLASS QuizQuestion[]
    const finalQuestions: QuizQuestion[] = extractedQuestions.map((q, idx) => {
      const options = [q.pilihan.A, q.pilihan.B, q.pilihan.C, q.pilihan.D];
      const keyMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
      const correctIndex = keyMap[q.kunci_jawaban] ?? 0;

      return {
        id: `q_ai_${Date.now()}_${idx}`,
        type: 'single_choice',
        prompt: q.teks_soal,
        points: 10,
        options,
        correctOptionIndex: correctIndex,
        explanation: q.pembahasan,
      };
    });

    onImportQuestions(finalQuestions);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-purple-700 via-indigo-600 to-[#364FFF] text-white flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                Impor & Ekstraksi Soal AI
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-900/60 text-purple-200 border border-purple-400/30">
                  Gemini API & LaTeX
                </span>
              </h2>
              <p className="text-xs text-indigo-100">
                Ekstrak butir soal pilihan ganda lengkap dengan rumus matematika dari dokumen atau foto
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch (only if in input step) */}
        {step === 'input' && (
          <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setTab('upload');
                setErrorMsg(null);
              }}
              className={`px-4 py-2.5 rounded-t-xl font-extrabold text-xs flex items-center gap-2 transition-all ${
                tab === 'upload'
                  ? 'bg-white text-indigo-700 border-t border-x border-slate-200 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Unggah Dokumen / Teks Soal</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('json');
                setErrorMsg(null);
              }}
              className={`px-4 py-2.5 rounded-t-xl font-extrabold text-xs flex items-center gap-2 transition-all ${
                tab === 'json'
                  ? 'bg-white text-indigo-700 border-t border-x border-slate-200 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Code className="w-4 h-4" />
              <span>Tempel JSON Standar PRD</span>
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs text-rose-800 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {step === 'input' && tab === 'upload' && (
            <div className="space-y-4">
              {/* File Drop Area */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Unggah Lembar Soal (PDF, TXT, atau Foto Soal):
                </label>
                <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-5 text-center bg-slate-50/50 transition-colors relative cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,.txt,.doc,.docx,image/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center">
                    <Upload className="w-8 h-8 text-indigo-500 mb-2" />
                    <p className="text-xs font-bold text-slate-800">
                      {selectedFile ? selectedFile.name : 'Klik untuk memilih file atau seret file ke sini'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Mendukung foto soal ujian (JPG, PNG), file teks (TXT), atau naskah soal
                    </p>
                  </div>
                </div>
              </div>

              {/* Text Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Atau Tempel Teks Soal / Materi di Sini:
                </label>
                <textarea
                  rows={6}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Contoh:&#10;1. Berapakah hasil dari 1/2 + 1/4?&#10;A. 1/8&#10;B. 2/4&#10;C. 3/4&#10;D. 1&#10;Kunci: C"
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-800 focus:bg-white focus:outline-indigo-500 transition-all leading-relaxed"
                />
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Instruksi Khusus untuk AI (Opsional):
                </label>
                <input
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Misal: Format notasi matematika pecahan dengan LaTeX $...$, buat 4 opsi A/B/C/D"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-indigo-500 transition-all"
                />
              </div>
            </div>
          )}

          {step === 'input' && tab === 'json' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-slate-700">
                  Tempel JSON Array Soal Sesuai Standar PRD:
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const sample = [
                      {
                        id_soal: 'q_001',
                        teks_soal: 'Berapakah hasil dari $\\frac{1}{2} + \\frac{1}{4}$?',
                        pilihan: {
                          A: '$\\frac{1}{8}$',
                          B: '$\\frac{2}{4}$',
                          C: '$\\frac{3}{4}$',
                          D: '$1$',
                        },
                        kunci_jawaban: 'C',
                      },
                    ];
                    setJsonText(JSON.stringify(sample, null, 2));
                  }}
                  className="text-[11px] font-bold text-indigo-600 hover:underline"
                >
                  Muat Contoh JSON
                </button>
              </div>
              <textarea
                rows={12}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder='[&#10;  {&#10;    "id_soal": "q_001",&#10;    "teks_soal": "Berapakah hasil dari $\\frac{1}{2} + \\frac{1}{4}$?",&#10;    "pilihan": {&#10;      "A": "$\\frac{1}{8}$",&#10;      "B": "$\\frac{2}{4}$",&#10;      "C": "$\\frac{3}{4}$",&#10;      "D": "$1$"&#10;    },&#10;    "kunci_jawaban": "C"&#10;  }&#10;]'
                className="w-full p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-2xl border border-slate-800 focus:outline-indigo-500 leading-relaxed"
              />
            </div>
          )}

          {/* PREVIEW STEP */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    Berhasil mengekstrak <strong>{extractedQuestions.length} butir soal</strong>.
                    Periksa pratinjau rumus matematika di bawah ini sebelum menyimpan.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="px-3 py-1.5 rounded-xl border border-emerald-300 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors"
                >
                  Ulangi Ekstraksi
                </button>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                {extractedQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 font-extrabold text-[11px] rounded-lg">
                        Soal #{idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        Kunci Jawaban:{' '}
                        <strong className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                          {q.kunci_jawaban}
                        </strong>
                      </span>
                    </div>

                    {/* Question text rendered with KaTeX */}
                    <div className="text-sm font-bold text-slate-900 leading-relaxed">
                      <LatexRenderer content={q.teks_soal} />
                    </div>

                    {/* Options A, B, C, D */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                        const isCorrect = q.kunci_jawaban === letter;
                        return (
                          <div
                            key={letter}
                            className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                              isCorrect
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            <span
                              className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center shrink-0 ${
                                isCorrect
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {letter}
                            </span>
                            <span className="flex-1">
                              <LatexRenderer content={q.pilihan[letter] || ''} />
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Batal
          </button>

          {step === 'input' && tab === 'upload' && (
            <button
              type="button"
              disabled={isLoading}
              onClick={handleRunAiExtraction}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white font-black rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sedang Mengekstrak dengan AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Ekstrak Soal dengan Gemini</span>
                </>
              )}
            </button>
          )}

          {step === 'input' && tab === 'json' && (
            <button
              type="button"
              onClick={handleParseJsonInput}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Code className="w-4 h-4" />
              <span>Validasi & Pratinjau Soal</span>
            </button>
          )}

          {step === 'preview' && (
            <button
              type="button"
              onClick={handleFinalImport}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <FileCheck className="w-4 h-4" />
              <span>Simpan & Tambahkan {extractedQuestions.length} Soal ke Kuis</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
