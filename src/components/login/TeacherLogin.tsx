import React, { useState } from 'react';
import { Mail, LogIn, ArrowRight, Loader2 } from 'lucide-react';
import { PasswordInput } from './PasswordInput';

interface TeacherLoginProps {
  onSubmit: (email: string, pass: string) => void;
  isLoading: boolean;
}

export const TeacherLogin: React.FC<TeacherLoginProps> = ({ onSubmit, isLoading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(email, password);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Email Input */}
      <div className="space-y-1.5">
        <label
          htmlFor="teacher-email"
          className="block text-xs sm:text-sm font-bold text-[#101936] tracking-wide flex items-center gap-1.5"
        >
          <Mail className="w-4 h-4 text-[#364FFF]" />
          <span>Email atau Nama Guru</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Mail className="w-4 h-4 text-[#364FFF]" />
          </div>
          <input
            id="teacher-email"
            type="text"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Masukkan email / nama guru"
            className="w-full h-[50px] sm:h-[52px] pl-10 pr-4 rounded-xl border border-slate-200 bg-[#EEF4FF]/50 hover:bg-[#EEF4FF]/80 text-[#101936] text-sm sm:text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#8B20FF] focus:border-[#8B20FF] focus:bg-white transition-all shadow-xs"
          />
        </div>
      </div>

      {/* Password Input - without default password badge */}
      <PasswordInput
        id="teacher-password"
        label="Kata Sandi"
        placeholder="Masukkan kata sandi"
        value={password}
        onChange={setPassword}
        required
      />

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full h-[50px] sm:h-[52px] rounded-xl bg-gradient-to-r from-[#364FFF] to-[#8B20FF] hover:from-[#2e42db] hover:to-[#781ad8] active:scale-[0.99] text-white text-sm sm:text-base font-bold shadow-md shadow-indigo-600/20 hover:shadow-lg hover:shadow-indigo-600/30 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Memverifikasi...</span>
          </>
        ) : (
          <>
            <LogIn className="w-5 h-5" />
            <span>Masuk</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
};

export default TeacherLogin;
