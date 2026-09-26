import React, { useMemo, useState } from 'react';
import {
  Award,
  BarChart2,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Save,
  Sparkles,
  TrendingUp,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Quiz, QuizQuestion, QuizSubmission, User } from '../../../../types';
import { PaperModeSession } from '../../../../types/paperMode';
import { useApp } from '../../../../context/AppContext';
import { LatexRenderer } from '../../../../utils/latex';
import { PointIcon } from '../../../common/PointIcon';
import { fireCelebrationConfetti } from '../../../../utils/gamification';

interface PaperAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: Quiz;
  classId: string;
  session: PaperModeSession;
}

export const PaperAnalyticsModal: React.FC<PaperAnalyticsModalProps> = ({
  isOpen,
  onClose,
  quiz,
  classId,
  session,
}) => {
  const { users = [], classes = [], submitQuiz, currentUser } = useApp();
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'students'>('overview');
  const [isSavedToGradebook, setIsSavedToGradebook] = useState(false);

  // Active class
  const activeClass = useMemo(() => classes.find((c) => c.id === classId), [classes, classId]);

  // Students in class
  const classStudents = useMemo(() => {
    return users
      .filter((u) => u.role === 'student' && u.classIds?.includes(classId))
      .sort((a, b) => (a.absentNumber ?? 999) - (b.absentNumber ?? 999));
  }, [users, classId]);

  // Calculate stats per student
  const studentResults = useMemo(() => {
    const keyMap: Record<number, 'A' | 'B' | 'C' | 'D'> = { 0: 'A', 1: 'B', 2: 'C', 3: 'D' };

    return classStudents.map((st) => {
      let correctCount = 0;
      let answeredCount = 0;
      const questionAnswers: Record<
        number,
        { selected: string; isCorrect: boolean; key: string }
      > = {};

      quiz.questions.forEach((q, qIdx) => {
        const correctKey =
          q.correctOptionIndex !== undefined ? keyMap[q.correctOptionIndex] : 'A';
        const studentAns = session.answersByQuestion?.[qIdx]?.[st.uid];

        if (studentAns && studentAns.selectedOption) {
          answeredCount++;
          const isCorrect = studentAns.selectedOption === correctKey;
          if (isCorrect) correctCount++;
          questionAnswers[qIdx] = {
            selected: studentAns.selectedOption,
            isCorrect,
            key: correctKey,
          };
        } else {
          questionAnswers[qIdx] = {
            selected: '-',
            isCorrect: false,
            key: correctKey,
          };
        }
      });

      const totalQuestions = quiz.questions.length;
      const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

      return {
        student: st,
        correctCount,
        answeredCount,
        totalQuestions,
        score,
        questionAnswers,
      };
    }).sort((a, b) => b.score - a.score);
  }, [classStudents, quiz.questions, session.answersByQuestion]);

  // Calculate stats per question
  const questionStats = useMemo(() => {
    const keyMap: Record<number, 'A' | 'B' | 'C' | 'D'> = { 0: 'A', 1: 'B', 2: 'C', 3: 'D' };

    return quiz.questions.map((q, qIdx) => {
      const correctKey =
        q.correctOptionIndex !== undefined ? keyMap[q.correctOptionIndex] : 'A';
      const answersMap = session.answersByQuestion?.[qIdx] || {};
      const counts = { A: 0, B: 0, C: 0, D: 0 };
      let correct = 0;
      let totalAns = 0;

      Object.values(answersMap).forEach((ans) => {
        if (ans.selectedOption && counts[ans.selectedOption] !== undefined) {
          counts[ans.selectedOption]++;
          totalAns++;
          if (ans.selectedOption === correctKey) {
            correct++;
          }
        }
      });

      const accuracy = totalAns > 0 ? Math.round((correct / totalAns) * 100) : 0;

      return {
        questionIndex: qIdx,
        question: q,
        correctKey,
        totalAnswers: totalAns,
        correctCount: correct,
        accuracy,
        optionCounts: counts,
      };
    });
  }, [quiz.questions, session.answersByQuestion]);

  // Overall class averages
  const classAvgScore = useMemo(() => {
    if (studentResults.length === 0) return 0;
    const total = studentResults.reduce((sum, s) => sum + s.score, 0);
    return Math.round(total / studentResults.length);
  }, [studentResults]);

  // Save results to GAMI CLASS gradebook & point ledger
  const handleSaveToGradebook = async () => {
    setIsSavedToGradebook(true);
    fireCelebrationConfetti();

    // Create formal quiz submissions
    studentResults.forEach((sr) => {
      if (sr.answeredCount === 0) return;

      const submission: QuizSubmission = {
        id: `${quiz.id}_${sr.student.uid}`,
        quizId: quiz.id,
        userId: sr.student.uid,
        classId,
        answers: {},
        status: 'graded',
        startedAt: session.createdAt,
        submittedAt: new Date().toISOString(),
        totalScore: sr.score,
        maxScore: 100,
        percentageScore: sr.score,
        rewardPointsAwarded: Math.round((sr.score / 100) * quiz.rewardPoints),
        rewardXpAwarded: Math.round(
          (sr.score / 100) * (quiz.rewardXp !== undefined ? quiz.rewardXp : quiz.rewardPoints)
        ),
        isLate: false,
        feedback: `Hasil Kuis Paper Mode: ${sr.correctCount} dari ${sr.totalQuestions} soal benar.`,
        gradedBy: currentUser?.uid,
        gradedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      submitQuiz(submission);
    });
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    const rows = studentResults.map((sr, idx) => ({
      Peringkat: idx + 1,
      'No. Absen': sr.student.absentNumber ?? '-',
      NIS: sr.student.studentNumber ?? '-',
      'Nama Siswa': sr.student.displayName,
      Kelas: activeClass?.name || '-',
      'Jumlah Benar': sr.correctCount,
      'Total Soal': sr.totalQuestions,
      'Nilai Akhir (0-100)': sr.score,
      'Poin Diperoleh': Math.round((sr.score / 100) * quiz.rewardPoints),
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Hasil Paper Mode');

    const cleanTitle = quiz.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    XLSX.writeFile(workbook, `Hasil_PaperMode_${cleanTitle}_${activeClass?.name || 'Kelas'}.xlsx`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-amber-600 via-orange-600 to-indigo-700 text-white flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20">
              <Award className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                Dasbor Analitik: {quiz.title}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-900">
                  Paper Mode
                </span>
              </h2>
              <p className="text-xs text-amber-100">
                Laporan akurasi butir soal dan peringkat performa individual siswa {activeClass?.name}
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

        {/* Top Summary Cards */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-[10px] font-black uppercase text-slate-500 block">RATA-RATA NILAI</span>
            <div className="text-2xl font-black text-indigo-900 mt-0.5">{classAvgScore} / 100</div>
          </div>
          <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-[10px] font-black uppercase text-slate-500 block">SISWA IKUT SERTA</span>
            <div className="text-2xl font-black text-emerald-900 mt-0.5">
              {studentResults.filter((s) => s.answeredCount > 0).length} / {classStudents.length}
            </div>
          </div>
          <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-[10px] font-black uppercase text-slate-500 block">TOTAL SOAL</span>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{quiz.questions.length} Butir</div>
          </div>
          <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-[10px] font-black uppercase text-slate-500 block">POIN LEADERBOARD</span>
            <div className="text-2xl font-black text-amber-900 mt-0.5">+{quiz.rewardPoints} Pts</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-6 pt-2 gap-3 shrink-0 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-2.5 font-black border-b-2 transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Peringkat Siswa ({studentResults.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('questions')}
            className={`py-2.5 font-black border-b-2 transition-all cursor-pointer ${
              activeTab === 'questions'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Analisis Butir Soal ({questionStats.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {/* TAB 1: STUDENT LEADERBOARD & SCORES */}
          {activeTab === 'overview' && (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-black uppercase text-[10px] bg-slate-50/50">
                      <th className="py-2.5 px-3">Peringkat</th>
                      <th className="py-2.5 px-3">No. Absen</th>
                      <th className="py-2.5 px-3">Nama Siswa</th>
                      <th className="py-2.5 px-3 text-center">Benar / Soal</th>
                      <th className="py-2.5 px-3 text-right">Nilai Akhir</th>
                      <th className="py-2.5 px-3 text-right">Poin Gamifikasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {studentResults.map((res, idx) => {
                      const isTop3 = idx < 3;
                      const badgeColors = ['bg-amber-400 text-slate-950', 'bg-slate-300 text-slate-900', 'bg-amber-700 text-white'];

                      return (
                        <tr key={res.student.uid} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3">
                            {isTop3 ? (
                              <span className={`w-6 h-6 rounded-full font-black text-xs flex items-center justify-center ${badgeColors[idx]}`}>
                                {idx + 1}
                              </span>
                            ) : (
                              <span className="font-bold text-slate-500 pl-2">#{idx + 1}</span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-slate-700">
                            {res.student.absentNumber ?? '-'}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-900">{res.student.displayName}</span>
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-slate-700">
                            {res.correctCount} / {res.totalQuestions}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className={`font-black text-sm px-2.5 py-0.5 rounded-lg ${
                              res.score >= 75
                                ? 'bg-emerald-100 text-emerald-800'
                                : res.score >= 50
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {res.score}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-amber-800">
                            +{Math.round((res.score / 100) * quiz.rewardPoints)} Pts
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: QUESTION ANALYSIS */}
          {activeTab === 'questions' && (
            <div className="space-y-4">
              {questionStats.map((qs) => (
                <div
                  key={qs.questionIndex}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 font-extrabold text-[11px] rounded-lg">
                      Soal #{qs.questionIndex + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500">
                        Kunci Jawaban:{' '}
                        <strong className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                          {qs.correctKey}
                        </strong>
                      </span>
                      <span
                        className={`text-xs font-black px-2.5 py-0.5 rounded-lg ${
                          qs.accuracy >= 70
                            ? 'bg-emerald-100 text-emerald-800'
                            : qs.accuracy >= 40
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        Akurasi {qs.accuracy}%
                      </span>
                    </div>
                  </div>

                  {/* Question Prompt */}
                  <div className="text-sm font-bold text-slate-900 leading-relaxed">
                    <LatexRenderer content={qs.question.prompt} />
                  </div>

                  {/* Distribution of choices A, B, C, D */}
                  <div className="grid grid-cols-4 gap-2 pt-2 text-xs">
                    {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                      const count = qs.optionCounts[letter] || 0;
                      const percent = qs.totalAnswers > 0 ? Math.round((count / qs.totalAnswers) * 100) : 0;
                      const isKey = qs.correctKey === letter;

                      return (
                        <div
                          key={letter}
                          className={`p-2 rounded-xl border flex flex-col justify-between ${
                            isKey
                              ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-950'
                              : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-black">{letter} {isKey && '✓'}</span>
                            <span className="text-[11px] font-mono text-slate-500">{count} Siswa</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${isKey ? 'bg-emerald-500' : 'bg-slate-400'}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Unduh Excel (.xlsx)</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Tutup
            </button>

            <button
              type="button"
              disabled={isSavedToGradebook}
              onClick={handleSaveToGradebook}
              className={`px-6 py-2.5 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                isSavedToGradebook
                  ? 'bg-emerald-700 opacity-90'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95'
              }`}
            >
              {isSavedToGradebook ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-amber-300" />
                  <span>Nilai & Poin Tersimpan ke Rapor!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Simpan Nilai & Berikan Poin/XP</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
