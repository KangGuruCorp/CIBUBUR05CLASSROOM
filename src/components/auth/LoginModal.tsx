import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  Eye,
  EyeOff,
  GraduationCap,
  Info,
  KeyRound,
  Lock,
  Search,
  ShieldAlert,
  Sparkles,
  User,
  UserCheck,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { users, classes, currentClassId, switchUser, loginUser } = useApp();
  const [roleTab, setRoleTab] = useState<UserRole>('student');

  // Student Form State
  const [selectedStudentUid, setSelectedStudentUid] = useState<string>('');
  const [identifier, setIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [searchStudentText, setSearchStudentText] = useState<string>('');

  // Filter students and teachers
  const allStudents = useMemo(() => {
    return users
      .filter((u) => u.role === 'student')
      .sort((a, b) => (a.absentNumber || 99) - (b.absentNumber || 99));
  }, [users]);

  const teachers = useMemo(() => {
    return users.filter((u) => u.role === 'teacher' || u.role === 'admin');
  }, [users]);

  const selectedStudent = useMemo(() => {
    if (!selectedStudentUid) return allStudents[0] || null;
    return allStudents.find((s) => s.uid === selectedStudentUid) || allStudents[0] || null;
  }, [selectedStudentUid, allStudents]);

  const filteredStudentsForDropdown = useMemo(() => {
    if (!searchStudentText.trim()) return allStudents;
    const q = searchStudentText.toLowerCase();
    return allStudents.filter(
      (s) =>
        s.displayName.toLowerCase().includes(q) ||
        (s.username && s.username.toLowerCase().includes(q)) ||
        (s.studentNumber && s.studentNumber.includes(q))
    );
  }, [allStudents, searchStudentText]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const loginId =
      roleTab === 'student'
        ? selectedStudent?.username || selectedStudent?.uid || ''
        : identifier.trim();

    setTimeout(() => {
      const res = loginUser(loginId, password, roleTab);
      setIsSubmitting(false);
      if (res.success) {
        onClose?.();
      } else {
        setErrorMessage(res.message || 'Gagal masuk. Silakan periksa kredensial Anda.');
      }
    }, 350);
  };

  const handleSelectStudentChange = (uid: string) => {
    setSelectedStudentUid(uid);
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
        {/* Header Visual */}
        <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 px-5 py-4 text-white text-center relative">
          <h2 className="text-xl font-extrabold tracking-tight font-display">Portal Belajar Kelas 6E</h2>
          <p className="text-xs text-indigo-100 mt-1">SD Negeri Harapan Bangsa</p>

          {/* Tab Switcher */}
          <div className="mt-3.5 grid grid-cols-2 p-1 bg-black/25 rounded-xl backdrop-blur-sm">
            <button
              type="button"
              onClick={() => {
                setRoleTab('student');
                setErrorMessage(null);
                setPassword('');
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                roleTab === 'student'
                  ? 'bg-white text-indigo-700 shadow-md scale-[1.02]'
                  : 'text-indigo-100 hover:text-white'
              }`}
            >
              Siswa
            </button>
            <button
              type="button"
              onClick={() => {
                setRoleTab('teacher');
                setErrorMessage(null);
                setPassword('');
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                roleTab === 'teacher'
                  ? 'bg-white text-indigo-700 shadow-md scale-[1.02]'
                  : 'text-indigo-100 hover:text-white'
              }`}
            >
              Guru
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="space-y-4">
            {roleTab === 'student' ? (
              /* ================== SISWA: LOGIN WITH DROPDOWN USERNAME ================== */
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Pilih Namamu
                  </label>

                  <div className="space-y-2">
                    <div className="relative">
                      <select
                        value={selectedStudentUid || (allStudents[0]?.uid || '')}
                        onChange={(e) => handleSelectStudentChange(e.target.value)}
                        className="w-full px-3.5 py-3 rounded-2xl border border-slate-300 bg-slate-50/70 text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all appearance-none cursor-pointer pr-10"
                      >
                        {allStudents.map((std) => (
                          <option key={std.uid} value={std.uid}>
                            {std.displayName}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Kata Sandi Siswa</span>
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Diatur guru (default: 123456)
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan kata sandi murid"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-2 text-amber-900 text-xs">
                  <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <p className="leading-relaxed text-[11px]">
                    Siswa cukup memilih nama/username dari dropdown dan memasukkan kata sandi yang telah diatur oleh guru.
                  </p>
                </div>
              </div>
            ) : (
              /* ================== GURU / ADMIN LOGIN ================== */
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Email / Username Guru
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Ketik email atau username guru (contoh: guru.rahma)"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Kata Sandi Guru
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan kata sandi guru"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Kata sandi akun demo guru: <code>guru123</code></p>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'Memverifikasi...' : 'Masuk'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
