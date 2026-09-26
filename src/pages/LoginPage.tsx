import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { HeroSection } from '../components/login/HeroSection';
import { LoginCard } from '../components/login/LoginCard';
import { UserRole } from '../types';

export const LoginPage: React.FC = () => {
  const { switchUser } = useApp();
  const [role, setRole] = useState<UserRole>('student');

  const handleLoginSuccess = (userId: string, role: 'student' | 'teacher') => {
    switchUser(userId);
  };

  return (
    <div className="min-h-screen w-full relative bg-[#101936] text-slate-100 flex flex-col justify-between overflow-x-hidden selection:bg-[#8B20FF] selection:text-white font-sans">
      {/* BACKGROUND AMBIENT GLOWS AND FUTURISTIC LIGHTING */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Deep blue/purple gradient base */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#101936] via-[#141E46] to-[#1C1242]" />

        {/* Large blurred ambient orbs */}
        <div className="absolute -top-32 -left-32 w-[550px] h-[550px] bg-[#364FFF]/25 rounded-full blur-[120px]" />
        <div className="absolute top-1/4 -right-28 w-[600px] h-[600px] bg-[#8B20FF]/25 rounded-full blur-[140px]" />
        <div className="absolute -bottom-36 left-1/3 w-[650px] h-[650px] bg-[#3D50FF]/20 rounded-full blur-[150px]" />
        <div className="absolute top-1/2 left-1/4 w-[350px] h-[350px] bg-[#FFD83D]/10 rounded-full blur-[100px]" />

        {/* Subtle geometric dot grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      {/* MOBILE TOP BRANDING (< lg): Logo GamifiClass & 'Ayo Masuk' ditaruh paling atas */}
      <div className="lg:hidden relative z-20 w-full px-4 pt-6 sm:pt-8 pb-1 flex flex-col items-center text-center select-none">
        <img
          src="https://i.ibb.co.com/XrCv2wfM/Chat-GPT-Image-5-Sep-2026-22-21-34.png"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/gamificlass-logo.png';
          }}
          alt="GamifiClass"
          className="h-14 sm:h-18 w-auto object-contain select-none filter drop-shadow-xl max-w-[280px] sm:max-w-xs mb-2.5"
          loading="eager"
          referrerPolicy="no-referrer"
        />
        <p className="text-xs sm:text-sm text-[#EEF4FF]/90 font-medium leading-relaxed max-w-sm">
          Ayo masuk ke kelas, selesaikan misi, kumpulkan poin, dan jadi versi terbaik dari dirimu!
        </p>
      </div>

      {/* MAIN CONTENT AREA: 2-COLUMN DESKTOP LAYOUT (Left Login Card, Right Gambar/Hero) */}
      <main className="relative z-10 w-full max-w-[1450px] mx-auto px-4 sm:px-6 lg:px-8 my-auto py-4 sm:py-6 lg:py-8 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Login Card */}
          <div className="lg:col-span-5 flex justify-center lg:justify-start w-full order-1 lg:order-1 flex-col items-center lg:items-start gap-4">
            <LoginCard onLoginSuccess={handleLoginSuccess} />
          </div>

          {/* Right Column: Hero / Gambar */}
          <div className="lg:col-span-7 flex flex-col justify-center order-2 lg:order-2">
            <HeroSection />
          </div>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
