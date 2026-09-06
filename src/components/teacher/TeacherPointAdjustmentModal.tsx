import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  MinusCircle,
  PlusCircle,
  ShieldAlert,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { User as UserType } from '../../types';
import { PointIcon } from '../common/PointIcon';

interface TeacherPointAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetStudent?: UserType | null;
  initialMode?: 'add' | 'deduct';
}

export const TeacherPointAdjustmentModal: React.FC<TeacherPointAdjustmentModalProps> = ({
  isOpen,
  onClose,
  targetStudent,
  initialMode = 'add',
}) => {
  const { users, userStats, currentClassId, adjustStudentPoints } = useApp();

  const classStudents = useMemo(() => {
    return users.filter(
      (u) => u.role === 'student' && u.classIds.includes(currentClassId)
    );
  }, [users, currentClassId]);

  const [mode, setMode] = useState<'add' | 'deduct'>(initialMode);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    targetStudent?.uid || classStudents[0]?.uid || ''
  );
  const [amount, setAmount] = useState<number>(15);
  const [category, setCategory] = useState<'participation' | 'academic' | 'adjustment'>('participation');
  const [reason, setReason] = useState<string>('Aktif bertanya dan membantu teman saat diskusi kelas');
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setSelectedPresetIndex('');
      if (initialMode === 'deduct') {
        setAmount(10);
        setCategory('adjustment');
        setReason('Menggunakan ponsel/gadget saat kegiatan belajar mengajar tanpa izin');
      } else {
        setAmount(15);
        setCategory('participation');
        setReason('Aktif bertanya dan membantu teman saat diskusi kelas');
      }
    }
  }, [isOpen, initialMode]);

  const targetUid = targetStudent?.uid;
  const firstUid = classStudents[0]?.uid || '';

  useEffect(() => {
    if (targetUid) {
      setSelectedStudentId(targetUid);
    } else if (firstUid) {
      setSelectedStudentId((prev) => (!prev ? firstUid : prev));
    }
  }, [targetUid, firstUid]);

  if (!isOpen) return null;

  const rewardPresets = [
    { label: '🌟 Keaktifan Bertanya (+15)', amount: 15, cat: 'participation' as const, reason: 'Aktif bertanya dan menjawab pertanyaan di kelas' },
    { label: '🤝 Gotong Royong / Piket (+20)', amount: 20, cat: 'participation' as const, reason: 'Rajin membantu kebersihan kelas dan kerja sama kelompok' },
    { label: '💡 Solusi & Ide Kreatif (+25)', amount: 25, cat: 'academic' as const, reason: 'Memberikan ide dan penyelesaian masalah yang kreatif' },
    { label: '⏱️ Tepat Waktu & Disiplin (+10)', amount: 10, cat: 'participation' as const, reason: 'Disiplin dan siap sebelum pembelajaran dimulai' },
    { label: '🏆 Juara Kuis / Presentasi (+30)', amount: 30, cat: 'academic' as const, reason: 'Pencapaian luar biasa dalam kuis atau presentasi materi' },
    { label: '📚 Inisiatif Belajar Mandiri (+15)', amount: 15, cat: 'participation' as const, reason: 'Membaca dan menuntaskan materi pelajaran lebih awal' },
  ];

  const violationPresets = [
    { label: '📵 Main HP / Gadget (-10)', amount: 10, cat: 'adjustment' as const, reason: 'Bermain ponsel/gadget saat pembelajaran berlangsung tanpa izin guru' },
    { label: '🗣️ Gaduh & Mengganggu Teman (-10)', amount: 10, cat: 'adjustment' as const, reason: 'Membuat keributan dan mengganggu konsentrasi teman sekelas' },
    { label: '🚯 Buang Sampah / Kotori Kelas (-15)', amount: 15, cat: 'adjustment' as const, reason: 'Membuang sampah sembarangan atau tidak menjaga kebersihan kelas' },
    { label: '⏳ Terlambat Masuk Kelas (-10)', amount: 10, cat: 'adjustment' as const, reason: 'Terlambat masuk kelas tanpa surat izin atau alasan yang sah' },
    { label: '❌ Tidak Mengerjakan Tugas/PR (-15)', amount: 15, cat: 'academic' as const, reason: 'Tidak mengumpulkan tugas mandiri/PR sesuai batas waktu yang ditentukan' },
    { label: '⚠️ Sikap Tidak Sopan / Kasar (-20)', amount: 20, cat: 'adjustment' as const, reason: 'Berkata kasar atau tidak sopan kepada guru/teman' },
    { label: '🚫 Keluar Kelas Tanpa Izin (-15)', amount: 15, cat: 'adjustment' as const, reason: 'Meninggalkan ruang kelas saat jam pelajaran tanpa izin guru' },
    { label: '😴 Tidur saat Jam Pelajaran (-10)', amount: 10, cat: 'participation' as const, reason: 'Tidur dan tidak memperhatikan saat materi sedang diterangkan' },
  ];

  const handleSwitchMode = (newMode: 'add' | 'deduct') => {
    setMode(newMode);
    setErrorMsg(null);
    setSelectedPresetIndex('');
    if (newMode === 'deduct') {
      setAmount(10);
      setCategory('adjustment');
      setReason('Bermain ponsel/gadget saat pembelajaran berlangsung tanpa izin guru');
    } else {
      setAmount(15);
      setCategory('participation');
      setReason('Aktif bertanya dan menjawab pertanyaan di kelas');
    }
  };

  const selectedStudent = users.find((u) => u.uid === selectedStudentId);
  const currentTotal = userStats[selectedStudentId]?.totalPoints || 0;
  const projectedTotal = mode === 'add' ? currentTotal + Math.abs(amount || 0) : Math.max(0, currentTotal - Math.abs(amount || 0));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedStudentId) {
      setErrorMsg('Pilih siswa terlebih dahulu.');
      return;
    }

    const numericAmount = Math.abs(Number(amount));
    if (!numericAmount || numericAmount <= 0) {
      setErrorMsg('Jumlah poin harus lebih dari 0.');
      return;
    }

    if (!reason.trim()) {
      setErrorMsg('Harap berikan keterangan alasan yang jelas.');
      return;
    }

    const finalAmount = mode === 'add' ? numericAmount : -numericAmount;
    adjustStudentPoints(selectedStudentId, finalAmount, category, reason.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                mode === 'add' ? 'bg-purple-100 text-purple-700' : 'bg-rose-100 text-rose-700'
              }`}
            >
              {mode === 'add' ? <PointIcon className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {mode === 'add' ? 'Beri Poin Apresiasi' : 'Kurangi Poin Siswa'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {mode === 'add'
                  ? 'Reward keaktifan & perilaku terpuji'
                  : 'Catat pelanggaran tata tertib kelas'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="px-5 pt-3 bg-white">
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => handleSwitchMode('add')}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'add'
                  ? 'bg-white text-purple-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5 text-purple-600" />
              <span>+ Tambah Poin</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchMode('deduct')}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'deduct'
                  ? 'bg-white text-rose-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <MinusCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>- Kurangi Poin</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-3.5">
          {/* 1. Student Selector & Point Status */}
          {targetStudent ? (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={targetStudent.avatarUrl}
                  alt={targetStudent.displayName}
                  className="w-7 h-7 rounded-lg object-cover shrink-0 border border-white"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{targetStudent.displayName}</p>
                  <p className="text-[10px] text-slate-500">Absen #{targetStudent.absentNumber || 1}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[11px] text-slate-400">Poin: </span>
                <span className="text-xs font-semibold text-slate-600">{currentTotal}</span>
                <span className="text-slate-400 mx-1">→</span>
                <span className={`text-xs font-bold ${mode === 'add' ? 'text-purple-600' : 'text-rose-600'}`}>
                  {projectedTotal} Poin
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">Pilih Siswa</label>
                {selectedStudent && (
                  <span className="text-[11px] text-slate-500">
                    Poin: <strong className="text-slate-700 font-semibold">{currentTotal}</strong>
                    <span className="mx-1 text-slate-400">→</span>
                    <strong className={mode === 'add' ? 'text-purple-600' : 'text-rose-600'}>
                      {projectedTotal} Poin
                    </strong>
                  </span>
                )}
              </div>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-slate-50"
              >
                {classStudents.map((s) => {
                  const pts = userStats[s.uid]?.totalPoints || 0;
                  return (
                    <option key={s.uid} value={s.uid}>
                      {s.displayName} (Absen #{s.absentNumber || 1} • {pts} Poin)
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* 2. Quick Presets Pills */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">Template Cepat</label>
              <span className="text-[10px] text-slate-400">Pilih untuk isi otomatis</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(mode === 'add' ? rewardPresets : violationPresets).map((preset, idx) => {
                const isSelected = selectedPresetIndex === String(idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedPresetIndex(String(idx));
                      setAmount(preset.amount);
                      setCategory(preset.cat);
                      setReason(preset.reason);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer border ${
                      isSelected
                        ? mode === 'add'
                          ? 'bg-purple-50 text-purple-700 border-purple-300 font-bold shadow-2xs'
                          : 'bg-rose-50 text-rose-700 border-rose-300 font-bold shadow-2xs'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Point Amount & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {mode === 'add' ? 'Jumlah Poin' : 'Poin Dikurangi'}
              </label>
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1 min-w-0">
                  <span
                    className={`absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none font-black text-sm ${
                      mode === 'add' ? 'text-purple-600' : 'text-rose-600'
                    }`}
                  >
                    {mode === 'add' ? '+' : '-'}
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    required
                    value={amount}
                    onChange={(e) => {
                      setAmount(Math.max(1, Number(e.target.value)));
                      setSelectedPresetIndex('');
                    }}
                    className={`w-full pl-6 pr-2 py-1.5 rounded-lg border text-sm font-bold focus:outline-none focus:ring-2 ${
                      mode === 'add'
                        ? 'border-purple-200 text-purple-900 bg-purple-50/30 focus:ring-purple-500'
                        : 'border-rose-200 text-rose-900 bg-rose-50/30 focus:ring-rose-500'
                    }`}
                  />
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {[10, 15, 20].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        setAmount(val);
                        setSelectedPresetIndex('');
                      }}
                      className={`px-2 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                        amount === val
                          ? mode === 'add'
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-rose-600 text-white border-rose-600'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      }`}
                    >
                      {mode === 'add' ? `+${val}` : `-${val}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-slate-50"
              >
                {mode === 'add' ? (
                  <>
                    <option value="participation">Partisipasi & Keaktifan</option>
                    <option value="academic">Prestasi Akademik</option>
                    <option value="adjustment">Bonus Khusus</option>
                  </>
                ) : (
                  <>
                    <option value="adjustment">Tata Tertib & Disiplin</option>
                    <option value="participation">Sikap & Partisipasi</option>
                    <option value="academic">Tugas & Akademik</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* 4. Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Alasan / Keterangan
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setSelectedPresetIndex('');
              }}
              placeholder={
                mode === 'add'
                  ? 'Misal: Aktif bertanya dan membantu teman...'
                  : 'Misal: Terlambat masuk kelas...'
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-slate-50"
            />
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className={`px-4 py-2 rounded-xl text-white text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer ${
                mode === 'add'
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {mode === 'add' ? (
                <>
                  <PointIcon className="w-3.5 h-3.5" />
                  <span>Kirim +{amount || 0} Poin</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Kurangi -{amount || 0} Poin</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
