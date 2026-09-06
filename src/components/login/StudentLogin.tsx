import React, { useState } from 'react';
import { UserCheck, ArrowRight, Loader2 } from 'lucide-react';
import { StudentSelector } from './StudentSelector';
import { PasswordInput } from './PasswordInput';
import { User } from '../../types';

interface StudentLoginProps {
  students: User[];
  selectedStudent: User | null;
  onSelectStudent: (student: User) => void;
  onSubmit: (student: User, pass: string) => void;
  isLoading: boolean;
}

export const StudentLogin: React.FC<StudentLoginProps> = ({
  students,
  selectedStudent,
  onSelectStudent,
  onSubmit,
  isLoading,
}) => {
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudent) {
      onSubmit(selectedStudent, password);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Student Selector */}
      <StudentSelector
        students={students}
        selectedStudent={selectedStudent}
        onSelectStudent={onSelectStudent}
      />

      {/* Password Input - without default password badge */}
      <PasswordInput
        id="student-password-input"
        label="Kata Sandi"
        placeholder="Masukkan kata sandi"
        value={password}
        onChange={setPassword}
        required
      />

      {/* Login Button */}
      <button
        type="submit"
        disabled={isLoading || !selectedStudent}
        className="w-full h-[50px] sm:h-[52px] rounded-xl bg-gradient-to-r from-[#364FFF] to-[#8B20FF] hover:from-[#2e42db] hover:to-[#781ad8] active:scale-[0.99] text-white text-sm sm:text-base font-bold shadow-md shadow-indigo-600/20 hover:shadow-lg hover:shadow-indigo-600/30 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Memverifikasi...</span>
          </>
        ) : (
          <>
            <UserCheck className="w-5 h-5" />
            <span>Masuk</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
};

export default StudentLogin;
