import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Clock,
  ExternalLink,
  Flame,
  LayoutGrid,
  Lock,
  Plus,
  Search,
  Share2,
  Sparkles,
  Trash2,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CollabBoard, BoardTemplate } from '../../types/collabBoard';
import {
  createBoard,
  deleteBoard,
  findBoardByCode,
  generateBoardCode,
  subscribeToClassBoards,
} from '../../services/boardService';
import { BOARD_TEMPLATES } from '../../utils/boardTemplates';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EmptyState } from '../common/EmptyState';

interface CollabBoardLobbyProps {
  onSelectBoard: (board: CollabBoard) => void;
  onExit?: () => void;
}

export const CollabBoardLobby: React.FC<CollabBoardLobbyProps> = ({ onSelectBoard, onExit }) => {
  const { currentUser, currentClassId, classes = [] } = useApp();
  const currentClass = classes.find((c) => c.id === currentClassId);
  const isTeacher = currentUser?.role === 'teacher' || currentUser?.role === 'admin';

  const [boards, setBoards] = useState<CollabBoard[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Join by code states
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinError, setJoinError] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // Create board modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newClassId, setNewClassId] = useState(currentClassId || 'all');
  const [selectedTemplate, setSelectedTemplate] = useState<BoardTemplate>('blank');
  const [isCreating, setIsCreating] = useState(false);

  // Delete board state
  const [boardToDelete, setBoardToDelete] = useState<CollabBoard | null>(null);

  // Real-time subscription to class boards
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToClassBoards(currentClassId || 'all', (items) => {
      setBoards(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentClassId]);

  // Handle joining with code
  const handleJoinWithCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!joinCodeInput.trim()) return;

    setJoinError('');
    setIsJoining(true);

    try {
      const found = await findBoardByCode(joinCodeInput);
      if (found) {
        onSelectBoard(found);
      } else {
        setJoinError('Kode sesi tidak ditemukan. Periksa kembali 6 karakter kode papan.');
      }
    } catch (err) {
      setJoinError('Terjadi kesalahan saat mencari papan. Coba lagi.');
    } finally {
      setIsJoining(false);
    }
  };

  // Handle creating a new board
  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !currentUser) return;

    setIsCreating(true);
    const boardId = `board_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const templateDef = BOARD_TEMPLATES[selectedTemplate];
    const initialElements = templateDef.generateElements(
      currentUser.uid,
      currentUser.displayName
    );

    const newBoard: CollabBoard = {
      id: boardId,
      code: generateBoardCode(),
      title: newTitle.trim(),
      schoolId: currentUser.schoolId || 'sch_merdeka_01',
      classId: newClassId,
      createdBy: currentUser.uid,
      creatorName: currentUser.displayName,
      isLocked: false,
      template: selectedTemplate,
      elements: initialElements,
      activeParticipants: {
        [currentUser.uid]: {
          userId: currentUser.uid,
          name: currentUser.displayName,
          avatar: currentUser.avatarUrl,
          role: isTeacher ? 'teacher' : 'student',
          canEdit: true,
          lastActive: new Date().toISOString(),
        },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const created = await createBoard(newBoard);
      setShowCreateModal(false);
      setNewTitle('');
      onSelectBoard(created);
    } catch (err) {
      console.error('Failed to create board:', err);
    } finally {
      setIsCreating(false);
    }
  };

  // Filtered boards
  const filteredBoards = boards.filter((b) => {
    const q = searchQuery.toLowerCase();
    return (
      b.title.toLowerCase().includes(q) ||
      b.code.toLowerCase().includes(q) ||
      b.creatorName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 p-6 sm:p-10 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs sm:text-sm font-semibold text-white">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Ruang Kolaborasi • Kolaborasi Digital Siswa & Guru</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Ruang Curah Gagasan & Visual Bersama
          </h1>
          <p className="text-indigo-100 text-sm sm:text-base leading-relaxed">
            Tempel sticky notes warna-warni, menggambar bebas, diskusikan materi, dan selesaikan diagram kelompok secara real-time tanpa hambatan akun!
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            {isTeacher && (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="px-5 py-3 rounded-2xl bg-white text-indigo-700 hover:bg-indigo-50 font-bold text-sm sm:text-base shadow-lg transition-transform active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span>Buat Papan Baru</span>
              </button>
            )}
          </div>
        </div>

        {/* Decorative canvas watermark */}
        <div className="absolute -right-6 -bottom-10 opacity-15 pointer-events-none">
          <LayoutGrid className="w-80 h-80 text-white" />
        </div>
      </div>

      {/* Quick Join With Session Code Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-xs">
        <div className="max-w-xl">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              #
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Gabung ke Papan dengan Kode
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mb-4">
            Masukkan 6 karakter kode sesi yang dibagikan atau diproyeksikan oleh gurumu (contoh: <span className="font-mono font-bold text-indigo-600">IDE-842</span>).
          </p>

          <form onSubmit={handleJoinWithCode} className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={joinCodeInput}
              onChange={(e) => {
                setJoinCodeInput(e.target.value.toUpperCase());
                setJoinError('');
              }}
              placeholder="Contoh: IDE-123"
              maxLength={8}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-300 font-mono text-base sm:text-lg font-bold tracking-wider uppercase text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={isJoining || !joinCodeInput.trim()}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 text-white font-bold text-sm sm:text-base transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-indigo-500/20"
            >
              {isJoining ? 'Mencari...' : 'Masuk ke Papan'}
            </button>
          </form>

          {joinError && (
            <p className="text-xs font-semibold text-rose-600 mt-2">
              ⚠️ {joinError}
            </p>
          )}
        </div>
      </div>

      {/* Board List Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Ruang Kolaborasi {currentClass?.name || 'Kelas Kita'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Pilih ruang kolaborasi yang sedang aktif untuk mulai berdiskusi.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul papan..."
              className="w-full pl-9.5 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Board Cards Grid */}
        {filteredBoards.length === 0 ? (
          <EmptyState
            title={searchQuery ? 'Papan tidak ditemukan' : 'Belum ada Ruang Kolaborasi'}
            description={
              searchQuery
                ? 'Tidak ada papan yang cocok dengan pencarian kata kunci Anda.'
                : isTeacher
                ? 'Mulai buat ruang kolaborasi pertama untuk kelasmu dengan memilih salah satu template siap pakai!'
                : 'Belum ada sesi ruang kolaborasi aktif. Tunggu gurumu membagikan kode sesi atau membuat papan baru.'
            }
            action={
              isTeacher && !searchQuery
                ? {
                    label: 'Buat Ruang Kolaborasi Baru',
                    onClick: () => setShowCreateModal(true),
                  }
                : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredBoards.map((b) => {
              const tmpl = BOARD_TEMPLATES[b.template] || BOARD_TEMPLATES.blank;
              const elementCount = Object.keys(b.elements || {}).length;
              const isOwner = isTeacher || b.createdBy === currentUser?.uid;

              return (
                <div
                  key={b.id}
                  onClick={() => onSelectBoard(b)}
                  className="group bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between hover:border-indigo-300 relative overflow-hidden"
                >
                  {/* Top pill & code */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {tmpl.badge}
                      </span>
                      {b.isLocked && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          <Lock className="w-3 h-3" />
                          <span>Terkunci</span>
                        </span>
                      )}
                    </div>

                    <span className="font-mono text-xs font-bold tracking-wider px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                      {b.code}
                    </span>
                  </div>

                  {/* Title & info */}
                  <div className="space-y-1.5 mb-6">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                      {b.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {tmpl.description}
                    </p>
                  </div>

                  {/* Footer metadata & Delete */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 font-medium">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>{Object.keys(b.activeParticipants || {}).length || 1} aktif</span>
                      </span>
                      <span>•</span>
                      <span>{elementCount} objek</span>
                    </div>

                    {isOwner && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBoardToDelete(b);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Hapus Papan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Buat Papan Baru (Teacher Only) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Buat Ruang Kolaborasi Baru</h3>
                  <p className="text-xs text-slate-500">Pilih template dan buat sesi kolaborasi kelas</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBoard} className="space-y-4">
              {/* Judul Papan */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Judul Sesi / Topik Papan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Contoh: Curah Gagasan Rantai Makanan & Ekosistem"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Pemilihan Kelas */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Pilihan Kelas</label>
                <select
                  value={newClassId}
                  onChange={(e) => setNewClassId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">Semua Kelas</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pemilihan Template Siap Pakai (F-10 PRD) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">
                  Pilih Format Template Siap Pakai
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                  {Object.values(BOARD_TEMPLATES).map((tmpl) => {
                    const isSelected = selectedTemplate === tmpl.id;
                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => setSelectedTemplate(tmpl.id)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 inline-block mb-1">
                            {tmpl.badge}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900">{tmpl.name}</h4>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                            {tmpl.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newTitle.trim()}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 text-white font-bold text-xs sm:text-sm cursor-pointer shadow-md shadow-indigo-500/20 transition-transform active:scale-95"
                >
                  {isCreating ? 'Membuat Papan...' : 'Buat & Mulai Kolaborasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Board Dialog */}
      {boardToDelete && (
        <ConfirmDialog
          isOpen={!!boardToDelete}
          title={`Hapus Papan "${boardToDelete.title}"?`}
          message="Seluruh catatan dan coretan di papan ini akan dihapus permanen untuk semua siswa."
          confirmText="Ya, Hapus Papan"
          cancelText="Batal"
          isDanger={true}
          onConfirm={() => {
            deleteBoard(boardToDelete.id);
            setBoardToDelete(null);
          }}
          onCancel={() => setBoardToDelete(null)}
        />
      )}
    </div>
  );
};
