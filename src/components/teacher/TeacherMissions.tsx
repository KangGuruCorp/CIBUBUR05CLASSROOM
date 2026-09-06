import React, { useState } from 'react';
import {
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  Flame,
  Plus,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Users,
  Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Mission, MissionProgress, MissionStatus, MissionType } from '../../types';
import { formatDateIndo } from '../../utils/gamification';
import { BadgeIcon } from '../common/BadgeIcon';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { PointIcon } from '../common/PointIcon';
import { TeacherMissionGradingModal } from './TeacherMissionGradingModal';
import { TeacherPointAdjustmentModal } from './TeacherPointAdjustmentModal';

export const TeacherMissions: React.FC = () => {
  const { missions, missionProgress, badges, users, currentClassId, saveMission } = useApp();
  const [showPointModal, setShowPointModal] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [gradingMission, setGradingMission] = useState<Mission | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<MissionType>('assignment');
  const [target, setTarget] = useState(2);
  const [rewardPoints, setRewardPoints] = useState(30);
  const [repeat, setRepeat] = useState<'daily' | 'weekly' | 'once'>('weekly');
  const [badgeId, setBadgeId] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [status, setStatus] = useState<MissionStatus>('active');

  const classStudents = users.filter(
    (u) => u.role === 'student' && (u.classIds || []).includes(currentClassId)
  );

  // Sort missions newest first
  const sortedMissions = [...missions].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (timeA !== timeB) return timeB - timeA;
    return b.id.localeCompare(a.id);
  });

  const handleOpenCreate = () => {
    setEditingMission(null);
    setTitle('');
    setDescription('');
    setType('assignment');
    setTarget(2);
    setRewardPoints(30);
    setRepeat('weekly');
    setBadgeId('');
    const nowStr = new Date().toISOString().slice(0, 16);
    setStartAt(nowStr);
    setEndAt('');
    setStatus('active');
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (m: Mission) => {
    setEditingMission(m);
    setTitle(m.title);
    setDescription(m.description);
    setType(m.type);
    setTarget(m.target);
    setRewardPoints(m.rewardPoints);
    setRepeat(m.repeat);
    setBadgeId(m.badgeId || '');
    setStartAt(m.startAt ? new Date(m.startAt).toISOString().slice(0, 16) : '');
    setEndAt(m.endAt ? new Date(m.endAt).toISOString().slice(0, 16) : '');
    setStatus(m.status);
    setIsEditorOpen(true);
  };

  const handleToggleStatus = (m: Mission) => {
    const updated: Partial<Mission> = {
      ...m,
      status: m.status === 'active' ? 'archived' : 'active',
    };
    saveMission(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert('Judul dan deskripsi misi wajib diisi.');
      return;
    }

    const payload: Partial<Mission> = {
      id: editingMission?.id,
      classIds: [currentClassId],
      title,
      description,
      type,
      target: Number(target),
      rewardPoints: Number(rewardPoints),
      repeat,
      startAt: startAt ? new Date(startAt).toISOString() : new Date().toISOString(),
      endAt: endAt ? new Date(endAt).toISOString() : undefined,
      badgeId: badgeId || undefined,
      status,
    };

    saveMission(payload);
    setIsEditorOpen(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold mb-2">
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Tantangan & Misi Belajar</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
            Misi & Poin Prestasi
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Atur tantangan berkala untuk mendorong kebiasaan belajar positif, periksa laporan siswa, dan berikan penilaian
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowPointModal(true)}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-purple-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <PointIcon className="w-4 h-4" />
            <span>Beri Poin Manual</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs sm:text-sm shadow-md shadow-amber-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Misi Baru</span>
          </button>
        </div>
      </div>

      {/* Missions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sortedMissions.map((mis) => {
          const linkedBadge = badges.find((b) => b.id === mis.badgeId);

          // Calculate student states for this mission
          const periodKey = mis.repeat === 'once' ? 'once' : 'w1';
          let completedCount = 0;
          let pendingCount = 0;

          classStudents.forEach((student) => {
            const prog = missionProgress[`${mis.id}_${student.uid}_${periodKey}`] ||
              missionProgress[`${mis.id}_${student.uid}`] ||
              missionProgress[`${mis.id}_${student.uid}_once`] ||
              missionProgress[`${mis.id}_${student.uid}_w1`];

            if (prog?.status === 'pending_verification') {
              pendingCount++;
            } else if (prog?.status === 'completed' || prog?.status === 'claimed') {
              completedCount++;
            }
          });

          return (
            <div
              key={mis.id}
              className={`bg-white rounded-3xl border p-6 flex flex-col justify-between shadow-xs transition-all ${
                mis.status === 'active' ? 'border-slate-200/80 hover:border-amber-300' : 'border-slate-200 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800">
                      {mis.repeat === 'daily'
                        ? 'Harian'
                        : mis.repeat === 'weekly'
                        ? 'Mingguan'
                        : 'Sekali'}
                    </span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 ${
                        mis.status === 'scheduled'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : mis.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {mis.status === 'scheduled' ? (
                        <>
                          <Clock className="w-3 h-3 text-amber-700" />
                          <span>Dijadwalkan</span>
                        </>
                      ) : mis.status === 'active' ? (
                        'Aktif Berjalan'
                      ) : (
                        'Dinonaktifkan'
                      )}
                    </span>
                  </div>

                  {/* Points label strictly in top right */}
                  <span className="text-xs font-black text-amber-800 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200 flex items-center gap-1">
                    <PointIcon className="w-3.5 h-3.5" />
                    <span>+{mis.rewardPoints} Poin</span>
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                  {mis.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                  {mis.description}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1.5 text-slate-700 font-semibold bg-amber-50/80 px-2.5 py-1 rounded-xl border border-amber-100/80">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    <span>{mis.status === 'scheduled' ? 'Jadwal Mulai: ' : 'Diposting: '}{formatDateIndo(mis.startAt || mis.createdAt)}</span>
                  </span>
                  {mis.endAt && (
                    <span className="flex items-center gap-1.5 text-slate-700 font-semibold bg-rose-50/80 px-2.5 py-1 rounded-xl border border-rose-100/80">
                      <Clock className="w-3.5 h-3.5 text-rose-500" />
                      <span>Berakhir: {formatDateIndo(mis.endAt)}</span>
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600 font-semibold bg-slate-50 p-2.5 rounded-xl">
                  <span>Target: <strong>{mis.target} kali</strong></span>
                  <span>•</span>
                  <span>Tipe: <strong className="capitalize">{mis.type}</strong></span>
                  <span>•</span>
                  <span>Selesai: <strong className="text-emerald-600">{completedCount}/{classStudents.length}</strong></span>
                  {pendingCount > 0 && (
                    <span className="text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {pendingCount} Perlu Dinilai
                    </span>
                  )}
                </div>

                {linkedBadge && (
                  <div className="mt-3 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60 flex items-center gap-2.5">
                    <BadgeIcon iconName={linkedBadge.iconName} rarity={linkedBadge.rarity} size="sm" />
                    <span className="text-xs font-bold text-amber-900">
                      Hadiah Badge: {linkedBadge.name}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleStatus(mis)}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
                >
                  {mis.status === 'active' ? (
                    <ToggleRight className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-slate-400" />
                  )}
                  <span>{mis.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setGradingMission(mis)}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Periksa & Nilai ({pendingCount || completedCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(mis)}
                    className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
                    title="Edit Misi"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mission Grading & Inspection Modal */}
      {gradingMission && (
        <TeacherMissionGradingModal
          mission={gradingMission}
          isOpen={!!gradingMission}
          onClose={() => setGradingMission(null)}
        />
      )}

      {/* Point Adjustment Modal */}
      {showPointModal && (
        <TeacherPointAdjustmentModal
          isOpen={showPointModal}
          onClose={() => setShowPointModal(false)}
        />
      )}

      {/* Editor Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 font-display">
                {editingMission ? 'Edit Misi Belajar' : 'Buat Misi Belajar Baru'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Judul Misi *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Sang Pembaca Rajin"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi & Syarat Misi *</label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contoh: Baca dan pelajari 2 materi modul minggu ini."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tipe Aksi</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50"
                  >
                    <option value="assignment">Kirim Tugas</option>
                    <option value="material">Baca Materi</option>
                    <option value="streak">Keaktifan / Streak</option>
                    <option value="custom">Kustom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Jumlah</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={target}
                    onChange={(e) => setTarget(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <PointIcon className="w-3.5 h-3.5" />
                    <span>Reward Poin</span>
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={rewardPoints}
                    onChange={(e) => setRewardPoints(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-amber-50 font-extrabold text-amber-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Frekuensi Pengulangan</label>
                  <select
                    value={repeat}
                    onChange={(e) => setRepeat(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50"
                  >
                    <option value="daily">Harian</option>
                    <option value="weekly">Mingguan</option>
                    <option value="once">Sekali Saja</option>
                  </select>
                </div>
              </div>

              {/* Dates & Scheduling */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    <span>Waktu Mulai Diposting *</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">Waktu misi mulai aktif bagi siswa</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-rose-500" />
                    <span>Batas Waktu Berakhir (Opsional)</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-2xs"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">Kosongkan jika berlaku tanpa batas</p>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Status Misi & Penjadwalan
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                      status === 'active'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60'
                    }`}
                  >
                    <input
                      type="radio"
                      name="mission_status"
                      value="active"
                      checked={status === 'active'}
                      onChange={() => setStatus('active')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="min-w-0">
                      <span>Aktif Sekarang</span>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                      status === 'scheduled'
                        ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60'
                    }`}
                  >
                    <input
                      type="radio"
                      name="mission_status"
                      value="scheduled"
                      checked={status === 'scheduled'}
                      onChange={() => setStatus('scheduled')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <div className="min-w-0">
                      <span>Jadwalkan</span>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                      status === 'archived'
                        ? 'bg-slate-200/80 border-slate-300 text-slate-800 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/60'
                    }`}
                  >
                    <input
                      type="radio"
                      name="mission_status"
                      value="archived"
                      checked={status === 'archived'}
                      onChange={() => setStatus('archived')}
                      className="text-slate-600 focus:ring-slate-500"
                    />
                    <div className="min-w-0">
                      <span>Nonaktif</span>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hadiah Lencana / Badge (Opsional)</label>
                <select
                  value={badgeId}
                  onChange={(e) => setBadgeId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50"
                >
                  <option value="">-- Tanpa Badge --</option>
                  {badges.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.rarity})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-200"
                >
                  Simpan Misi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Point Adjustment Modal */}
      <TeacherPointAdjustmentModal
        isOpen={showPointModal}
        onClose={() => setShowPointModal(false)}
      />
    </div>
  );
};
