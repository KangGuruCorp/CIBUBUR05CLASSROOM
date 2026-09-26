import React, { useState } from 'react';
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  HelpCircle,
  Send,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Mission, MissionProgress } from '../../types';
import { formatDateIndo } from '../../utils/gamification';
import { BadgeIcon } from '../common/BadgeIcon';
import { EmptyState } from '../common/EmptyState';
import { PointIcon } from '../common/PointIcon';
import { StudentMissionSubmitModal } from './StudentMissionSubmitModal';

export const StudentMissions: React.FC = () => {
  const { missions, missionProgress, badges, currentUser, claimMissionReward, setActiveTab } = useApp();
  const [activeTabFilter, setActiveTabFilter] = useState<'active' | 'completed'>('active');
  const [submitModalMission, setSubmitModalMission] = useState<Mission | null>(null);

  if (!currentUser) return null;

  const activeMissions = missions
    .filter((m) => {
      if (m.status === 'archived') return false;
      if (m.status !== 'active' && m.status !== 'scheduled') return false;
      return true;
    })
    .sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;
      return b.id.localeCompare(a.id);
    });

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-orange-100 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-black mb-2">
            <Zap className="w-3.5 h-3.5 fill-current text-amber-200" />
            <span>Misi & Tantangan Pembelajaran</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display">
            Pusat Misi Pembelajaran
          </h1>
          <p className="text-xs sm:text-sm text-orange-100 mt-2 leading-relaxed">
            Selesaikan misi harian dan mingguan untuk melipatgandakan poinmu, menaikkan level, serta membuka lencana eksklusif!
          </p>
        </div>

        {/* Tab switch */}
        <div className="mt-6 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTabFilter('active')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTabFilter === 'active'
                ? 'bg-white text-orange-600 shadow-md scale-105'
                : 'bg-black/20 text-white hover:bg-black/30'
            }`}
          >
            Misi Berlangsung ({activeMissions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTabFilter('completed')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTabFilter === 'completed'
                ? 'bg-white text-orange-600 shadow-md scale-105'
                : 'bg-black/20 text-white hover:bg-black/30'
            }`}
          >
            Riwayat Selesai
          </button>
        </div>
      </div>

      {/* Mission Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {activeMissions.map((mis) => {
          const periodKey = mis.repeat === 'once' ? 'once' : 'w1';
          const prog: Partial<MissionProgress> = missionProgress[`${mis.id}_${currentUser.uid}_${periodKey}`] ||
            missionProgress[`${mis.id}_${currentUser.uid}_w1`] ||
            missionProgress[`${mis.id}_${currentUser.uid}_once`] ||
            missionProgress[`${mis.id}_${currentUser.uid}`] ||
            { progress: 0, status: 'in_progress' };

          const isPending = prog.status === 'pending_verification';
          const isDone = prog.status === 'completed';
          const isClaimed = prog.status === 'claimed';
          const progressPct = Math.min(100, Math.round(((prog.progress || 0) / mis.target) * 100));

          const linkedBadge = badges.find((b) => b.id === mis.badgeId);

          if (activeTabFilter === 'completed' && !isClaimed) return null;
          if (activeTabFilter === 'active' && isClaimed) return null;

          return (
            <div
              key={mis.id}
              className={`rounded-3xl border p-6 flex flex-col justify-between transition-all duration-300 ${
                isDone && mis.rewardMode !== 'manual_verification'
                  ? 'bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-amber-50 border-amber-300 shadow-[0_0_24px_rgba(245,158,11,0.35)] ring-2 ring-amber-400/60'
                  : isClaimed
                  ? 'bg-slate-50/80 border-slate-200 grayscale contrast-90 opacity-65 hover:opacity-100 hover:grayscale-0 shadow-xs'
                  : (isDone || isPending) && mis.rewardMode === 'manual_verification'
                  ? 'bg-amber-50/50 border-amber-200 shadow-xs'
                  : 'bg-white border-orange-100/90 hover:border-orange-300 shadow-[0_0_20px_-3px_rgba(249,115,22,0.18)] hover:shadow-[0_0_28px_rgba(249,115,22,0.3)] ring-1 ring-orange-400/20'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-orange-100 text-orange-800">
                      {mis.repeat === 'daily'
                        ? 'Tantangan Harian'
                        : mis.repeat === 'weekly'
                        ? 'Tantangan Mingguan'
                        : 'Misi Khusus'}
                    </span>
                    {mis.status === 'scheduled' && new Date(mis.startAt || '') > new Date() && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-xs">
                        <Clock className="w-3 h-3 text-amber-700" />
                        <span>Segera Hadir</span>
                      </span>
                    )}
                    {mis.type === 'material' && (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                        Membaca Materi
                      </span>
                    )}
                    {mis.type === 'assignment' && (
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                        Pengumpulan Tugas
                      </span>
                    )}
                    {mis.type === 'custom' && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                        Misi Mandiri
                      </span>
                    )}
                    {mis.rewardMode === 'manual_verification' ? (
                      <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                        <Award className="w-3 h-3 text-amber-700" />
                        <span>Poin Diberikan Guru</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                        <Zap className="w-3 h-3 text-emerald-600" />
                        <span>Klaim Otomatis</span>
                      </span>
                    )}
                  </div>

                  {/* Points & XP indicator positioned in top right corner */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-black text-amber-800 bg-amber-50 px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-xs border border-amber-200">
                      <PointIcon className="w-3.5 h-3.5" />
                      <span>+{mis.rewardPoints} Pts</span>
                    </span>
                    <span className="text-xs font-black text-purple-800 bg-purple-50 px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-xs border border-purple-200">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>+{mis.rewardXp ?? mis.rewardPoints} XP</span>
                    </span>
                  </div>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                  {mis.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                  {mis.description}
                </p>

                {/* Posting / Scheduled Date */}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1.5 text-slate-700 font-semibold bg-amber-50/80 px-2.5 py-1 rounded-xl border border-amber-100/80">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    <span>{mis.status === 'scheduled' && new Date(mis.startAt || '') > new Date() ? 'Jadwal Mulai: ' : 'Diposting: '}{formatDateIndo(mis.startAt || mis.createdAt)}</span>
                  </span>
                  {mis.endAt && (
                    <span className="flex items-center gap-1.5 text-slate-700 font-semibold bg-rose-50/80 px-2.5 py-1 rounded-xl border border-rose-100/80">
                      <Clock className="w-3.5 h-3.5 text-rose-500" />
                      <span>Berakhir: {formatDateIndo(mis.endAt)}</span>
                    </span>
                  )}
                </div>

                {/* Feedback or score if evaluated by teacher */}
                {prog?.feedback && (
                  <div className="mt-3 p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span>Ulasan Guru {prog.score !== undefined ? `(Nilai: ${prog.score}/100)` : ''}</span>
                    </div>
                    <p className="text-slate-700 italic">"{prog.feedback}"</p>
                  </div>
                )}

                {/* Linked Badge Preview */}
                {linkedBadge && (
                  <div className="mt-4 p-3 rounded-2xl bg-amber-50/60 border border-amber-200/60 flex items-center gap-3">
                    <BadgeIcon iconName={linkedBadge.iconName} rarity={linkedBadge.rarity} size="sm" />
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                        Hadiah Lencana Spesial
                      </span>
                      <p className="text-xs font-bold text-slate-800">{linkedBadge.name}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Progress & Action */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-500">Progres Misi</span>
                  <span className={isDone || isClaimed ? 'text-emerald-600' : 'text-slate-700'}>
                    {prog.progress || 0} / {mis.target} ({progressPct}%)
                  </span>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isDone || isClaimed
                        ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                        : 'bg-gradient-to-r from-amber-400 to-orange-500'
                    }`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                {/* Teacher Feedback / Note if present */}
                {prog?.feedback && (
                  <div className="mt-3 p-3 rounded-2xl bg-amber-50/70 border border-amber-200/70 text-xs">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 block mb-0.5">
                      Catatan & Penilaian Guru {prog.score !== undefined ? `(Nilai: ${prog.score}/100)` : ''}:
                    </span>
                    <p className="text-slate-700 italic">"{prog.feedback}"</p>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-end gap-2.5">
                  {isClaimed ? (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-4 py-2 rounded-xl flex items-center gap-1.5 border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>
                        {mis.rewardMode === 'manual_verification'
                          ? `✓ Poin Diberikan oleh Guru (+${mis.rewardPoints} Poin${prog?.score !== undefined ? ` • Nilai: ${prog.score}/100` : ''})`
                          : `Reward Sudah Diklaim (+${mis.rewardPoints} Poin)`}
                      </span>
                    </span>
                  ) : mis.rewardMode === 'manual_verification' ? (
                    isDone || isPending ? (
                      <span className="text-xs font-bold text-amber-900 bg-amber-50 px-3.5 py-2 rounded-xl flex items-center gap-1.5 border border-amber-300 shadow-xs">
                        <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                        <span>Menunggu Verifikasi & Nilai Guru (Poin Diberikan oleh Guru)</span>
                      </span>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        {mis.type === 'assignment' && (
                          <button
                            type="button"
                            onClick={() => setActiveTab('tugas')}
                            className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition-all cursor-pointer"
                          >
                            Kerjakan Tugas
                          </button>
                        )}
                        {mis.type === 'material' && (
                          <button
                            type="button"
                            onClick={() => setActiveTab('materi')}
                            className="px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 transition-all cursor-pointer"
                          >
                            Buka Materi
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSubmitModalMission(mis)}
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Kirim Laporan / Bukti</span>
                        </button>
                      </div>
                    )
                  ) : isDone ? (
                    <button
                      type="button"
                      onClick={() => claimMissionReward(mis.id)}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs sm:text-sm shadow-md shadow-orange-200 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white" />
                      </span>
                      <PointIcon className="w-4 h-4" />
                      <span>Klaim Hadiah (+{mis.rewardPoints} Poin)!</span>
                    </button>
                  ) : isPending ? (
                    <span className="text-xs font-bold text-amber-900 bg-amber-50 px-3.5 py-2 rounded-xl flex items-center gap-1.5 border border-amber-300 shadow-xs">
                      <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                      <span>Laporan Terkirim • Menunggu Verifikasi Guru (Poin Belum Bertambah)</span>
                    </span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      {mis.type === 'assignment' && (
                        <button
                          type="button"
                          onClick={() => setActiveTab('tugas')}
                          className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition-all cursor-pointer"
                        >
                          Kerjakan Tugas
                        </button>
                      )}
                      {mis.type === 'material' && (
                        <button
                          type="button"
                          onClick={() => setActiveTab('materi')}
                          className="px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 transition-all cursor-pointer"
                        >
                          Buka Materi
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSubmitModalMission(mis)}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Kirim Laporan / Bukti</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit Mission Report Modal */}
      {submitModalMission && (
        <StudentMissionSubmitModal
          mission={submitModalMission}
          isOpen={!!submitModalMission}
          onClose={() => setSubmitModalMission(null)}
        />
      )}
    </div>
  );
};
