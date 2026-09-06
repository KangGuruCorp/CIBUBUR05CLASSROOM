import React, { useState } from 'react';
import { KeyRound, Lock, Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps {
  id?: string;
  label?: string;
  badgeText?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  id = 'password-input',
  label = 'Kata Sandi',
  badgeText,
  value,
  onChange,
  placeholder = 'Masukkan kata sandi',
  required = true,
}) => {
  const [showPassword, setShowPassword] = useState<boolean>(false);

  return (
    <div className="space-y-2">
      {/* Label and Badge Row */}
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="text-xs sm:text-sm font-bold text-[#101936] tracking-wide flex items-center gap-1.5 cursor-pointer"
        >
          <Lock className="w-4 h-4 text-[#8B20FF]" />
          <span>{label}</span>
        </label>
        {badgeText && (
          <span className="text-[11px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#A66CFF]/15 text-[#8B20FF] border border-[#A66CFF]/30">
            {badgeText}
          </span>
        )}
      </div>

      {/* Input with Key & Eye Toggle */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <KeyRound className="w-4 h-4 text-[#8B20FF]" />
        </div>
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-[52px] sm:h-[56px] pl-10 pr-11 rounded-[14px] border border-slate-200 bg-[#EEF4FF]/50 hover:bg-[#EEF4FF]/80 text-[#101936] text-sm sm:text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#8B20FF] focus:border-[#8B20FF] focus:bg-white transition-all shadow-xs"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-[#8B20FF] transition-colors cursor-pointer"
        >
          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};

export default PasswordInput;
