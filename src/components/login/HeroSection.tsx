import React from 'react';
import { Trophy, CheckCircle2, TrendingUp, Sparkles, Star } from 'lucide-react';

export const HeroSection: React.FC = () => {
  return (
    <div className="w-full flex flex-col justify-center py-4 lg:py-6 lg:pl-6 lg:pr-2 z-10 select-none">
      {/* Headings (Desktop only - on mobile view, this is placed at the very top of LoginPage) */}
      <div className="hidden lg:block space-y-3 sm:space-y-4 max-w-xl">
        {/* Main Brand Logo Heading */}
        <div className="pt-1 pb-2">
          <img
            src="https://i.ibb.co.com/XrCv2wfM/Chat-GPT-Image-5-Sep-2026-22-21-34.png"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/gamificlass-logo.png';
            }}
            alt="GamifiClass"
            className="h-16 sm:h-20 md:h-24 lg:h-28 w-auto object-contain select-none filter drop-shadow-xl max-w-full"
            loading="eager"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Subheading */}
        <p className="text-sm sm:text-base md:text-lg text-[#EEF4FF]/90 font-medium leading-relaxed max-w-lg pt-1 sm:pt-2">
          Ayo masuk ke kelas, selesaikan misi, kumpulkan poin, dan jadi versi terbaik dari dirimu!
        </p>
      </div>

      {/* Illustration Area with Floating Gamification Cards */}
      <div className="relative mt-2 sm:mt-6 lg:mt-8 max-w-lg mx-auto lg:mx-0 w-full flex items-center justify-center">
        {/* Ambient Glow behind image */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#364FFF]/30 to-[#8B20FF]/30 rounded-full blur-3xl pointer-events-none transform -translate-y-4" />

        {/* Decorative Floating Stars */}
        <div className="absolute -top-4 left-10 text-[#FFD83D] animate-float-1 pointer-events-none">
          <Star className="w-5 h-5 fill-[#FFD83D]" />
        </div>
        <div className="absolute top-1/3 -left-3 text-[#FFD83D]/90 animate-float-3 pointer-events-none">
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="absolute top-1/4 right-4 text-[#FFD83D] animate-float-2 pointer-events-none">
          <Star className="w-4 h-4 fill-[#FFD83D]" />
        </div>

        {/* Central Illustration Container */}
        <div className="relative z-10 w-full max-w-[340px] sm:max-w-[400px] md:max-w-[440px] rounded-3xl overflow-hidden shadow-2xl shadow-[#101936]/60 border border-white/20 bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-xs group">
          <img
            src="/students-learning.png"
            alt="Siswa SD Indonesia Belajar Bersama"
            className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-[1.02]"
            onError={(e) => {
              // Fallback to placeholder if asset is missing
              const target = e.currentTarget;
              target.onerror = null;
              target.src = '/image.png';
            }}
          />
          {/* Subtle bottom gradient overlay */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#101936]/60 to-transparent pointer-events-none" />
        </div>

        {/* FLOATING CARD 1: 🏆 +100 Poin Hari Ini! (Top-Left) */}
        <div className="absolute -top-4 sm:-top-6 -left-3 sm:-left-6 z-20 animate-float-1 rotate-[-3deg]">
          <div className="flex items-center gap-2.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 shadow-xl shadow-black/25 text-white">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#FFD83D] to-amber-500 flex items-center justify-center text-[#101936] shadow-md shrink-0">
              <Trophy className="w-5 h-5 text-[#101936] fill-[#101936]" />
            </div>
            <div>
              <span className="block text-xs sm:text-sm font-extrabold text-[#FFD83D] tracking-tight">
                +100
              </span>
              <span className="block text-[10px] sm:text-xs text-white/90 font-medium">
                Poin Hari Ini!
              </span>
            </div>
          </div>
        </div>

        {/* FLOATING CARD 2: ✓ Tugas Selesai 3/3 (Top-Right) */}
        <div className="absolute top-6 sm:top-4 -right-2 sm:-right-6 z-20 animate-float-2 rotate-[3deg]">
          <div className="flex items-center gap-2.5 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 shadow-xl shadow-black/25 text-white">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#2ECC8A]/90 flex items-center justify-center text-white shadow-md shrink-0">
              <CheckCircle2 className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div>
              <span className="block text-[10px] sm:text-xs font-semibold text-white/90">
                Tugas Selesai
              </span>
              <span className="block text-xs sm:text-sm font-black text-[#2ECC8A]">
                3/3
              </span>
            </div>
          </div>
        </div>

        {/* FLOATING CARD 3: Ayo Semangat! 💜 (Bottom-Left) */}
        <div className="hidden sm:block absolute bottom-8 -left-4 sm:-left-8 z-20 animate-float-3 rotate-[2deg]">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 shadow-xl shadow-black/25 text-white">
            <span className="text-xs sm:text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>Ayo Semangat!</span>
              <span className="text-base">💜</span>
            </span>
          </div>
        </div>

        {/* FLOATING CARD 4: Grafik progress (Bottom-Right) */}
        <div className="hidden sm:block absolute -bottom-3 sm:-bottom-5 -right-3 sm:-right-8 z-20 animate-float-4 rotate-[-2deg]">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 shadow-xl shadow-black/25 text-white">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#8B20FF] to-[#A66CFF] flex items-center justify-center text-white shadow-md shrink-0">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <div className="w-12 h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div className="w-4/5 h-full bg-[#2ECC8A] rounded-full" />
                </div>
                <span className="text-[10px] font-bold text-[#2ECC8A]">+85%</span>
              </div>
              <span className="block text-[10px] sm:text-xs text-white/90 font-medium">
                Terus Jadi Lebih Baik!
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
