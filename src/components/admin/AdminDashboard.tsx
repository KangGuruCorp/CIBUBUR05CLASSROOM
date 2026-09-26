import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User, ClassRoom } from '../../types';
import { ShieldCheck, Plus, UserCheck, KeyRound, Pencil, Trash2, X, Check, Search } from 'lucide-react';
import { syncDocToFirestore } from '../../lib/firestoreSync';
import { COLLECTIONS } from '../../lib/firestoreSync';

export const AdminDashboard: React.FC = () => {
  const { users, classes, school } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    displayName: '',
    username: '',
    password: '',
    classIds: [] as string[]
  });

  const teachers = users.filter((u) => u.role === 'teacher');
  const filteredTeachers = teachers.filter(t => 
    t.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (t.username || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({ displayName: '', username: '', password: '', classIds: [] });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (teacher: User) => {
    setEditingUser(teacher);
    setFormData({
      displayName: teacher.displayName,
      username: teacher.username || '',
      password: teacher.password || '',
      classIds: teacher.classIds || []
    });
    setIsModalOpen(true);
  };

  const handleToggleClass = (classId: string) => {
    setFormData(prev => ({
      ...prev,
      classIds: prev.classIds.includes(classId)
        ? prev.classIds.filter(id => id !== classId)
        : [...prev.classIds, classId]
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.displayName.trim() || !formData.username.trim()) return;

    const timestamp = new Date().toISOString();
    let userToSave: User;

    if (editingUser) {
      userToSave = {
        ...editingUser,
        displayName: formData.displayName,
        username: formData.username,
        password: formData.password || editingUser.password,
        classIds: formData.classIds,
        searchName: formData.displayName.toLowerCase()
      };
    } else {
      userToSave = {
        uid: `usr_guru_${Date.now()}`,
        role: 'teacher',
        status: 'active',
        displayName: formData.displayName,
        searchName: formData.displayName.toLowerCase(),
        username: formData.username,
        password: formData.password || 'guru123',
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.username}`,
        schoolId: school?.id || 'sch_gami',
        classIds: formData.classIds,
      };
    }

    await syncDocToFirestore(COLLECTIONS.USERS, userToSave.uid, userToSave);
    setIsModalOpen(false);
  };

  const handleDelete = async (uid: string) => {
    if (window.confirm('Yakin ingin menghapus guru ini? Data tidak dapat dikembalikan.')) {
      // In a real app we'd delete from Auth too, but here we just soft-delete or remove from collection cache
      const userToSave = users.find(u => u.uid === uid);
      if (userToSave) {
        await syncDocToFirestore(COLLECTIONS.USERS, uid, { ...userToSave, status: 'inactive' });
      }
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-gradient-to-r from-emerald-900 to-teal-800 rounded-3xl p-5 sm:p-7 text-white shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-display flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            Panel Admin Sekolah
          </h2>
          <p className="text-emerald-200 mt-1 text-sm">
            Kelola data guru, pemetaan kelas, dan kredensial login
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="bg-white text-emerald-900 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-50 transition-colors shadow-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Guru Baru</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-600" />
            Daftar Guru ({teachers.length})
          </h3>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari guru..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-500">
              <tr>
                <th className="px-5 py-4">Guru</th>
                <th className="px-5 py-4">Username</th>
                <th className="px-5 py-4">Kelas Diampu</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTeachers.map(teacher => (
                <tr key={teacher.uid} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <img src={teacher.avatarUrl} alt="" className="w-10 h-10 rounded-full bg-slate-100" />
                      <div className="font-bold text-slate-900">{teacher.displayName}</div>
                    </div>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-indigo-600 font-medium">
                    @{teacher.username}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {teacher.classIds.map(cId => {
                        const cls = classes.find(c => c.id === cId);
                        return cls ? (
                          <span key={cId} className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100">
                            {cls.name}
                          </span>
                        ) : null;
                      })}
                      {(!teacher.classIds || teacher.classIds.length === 0) && (
                        <span className="text-slate-400 italic text-xs">Belum dipetakan</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      teacher.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {teacher.status === 'active' ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(teacher)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit Guru"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(teacher.uid)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus / Nonaktifkan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTeachers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                    Tidak ada data guru ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL TAMBAH/EDIT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900">
                {editingUser ? 'Edit Data Guru' : 'Tambah Guru Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="overflow-y-auto p-5 space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Nama Lengkap (Gelar)</label>
                  <input
                    required
                    type="text"
                    value={formData.displayName}
                    onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm"
                    placeholder="Contoh: Budi Santoso, S.Pd"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Username Login</label>
                    <input
                      required
                      type="text"
                      value={formData.username}
                      onChange={e => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm font-mono"
                      placeholder="guru.budi"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Password {editingUser && '(Kosongkan jika tidak diubah)'}
                    </label>
                    <input
                      type="text"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 text-sm font-mono"
                      placeholder={editingUser ? '********' : 'guru123'}
                      required={!editingUser}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Pemetaan Kelas Diampu</label>
                  <div className="grid grid-cols-2 gap-2">
                    {classes.map(cls => {
                      const isSelected = formData.classIds.includes(cls.id);
                      return (
                        <div
                          key={cls.id}
                          onClick={() => handleToggleClass(cls.id)}
                          className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                            isSelected 
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-800' 
                              : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${
                            isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </div>
                          <span className="text-sm font-bold truncate">{cls.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors"
                >
                  Simpan Data Guru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
