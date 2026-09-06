import React from 'react';
import {
  Award,
  BookMarked,
  BookOpen,
  CheckCircle,
  Clock,
  Compass,
  Crown,
  Flame,
  Heart,
  Medal,
  Sparkles,
  Star,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { Badge as BadgeType } from '../../types';

interface BadgeIconProps {
  iconName: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isUnlocked?: boolean;
}

export const BadgeIcon: React.FC<BadgeIconProps> = ({
  iconName,
  rarity = 'common',
  size = 'md',
  isUnlocked = true,
}) => {
  const getIcon = () => {
    switch (iconName) {
      case 'Sparkles':
        return <Sparkles className="w-full h-full" />;
      case 'Clock':
        return <Clock className="w-full h-full" />;
      case 'BookMarked':
        return <BookMarked className="w-full h-full" />;
      case 'Award':
        return <Award className="w-full h-full" />;
      case 'Star':
        return <Star className="w-full h-full" />;
      case 'Crown':
        return <Crown className="w-full h-full" />;
      case 'Compass':
        return <Compass className="w-full h-full" />;
      case 'BookOpen':
        return <BookOpen className="w-full h-full" />;
      case 'Zap':
        return <Zap className="w-full h-full" />;
      case 'Trophy':
        return <Trophy className="w-full h-full" />;
      case 'Flame':
        return <Flame className="w-full h-full" />;
      case 'Heart':
        return <Heart className="w-full h-full" />;
      case 'Medal':
        return <Medal className="w-full h-full" />;
      case 'Target':
        return <Target className="w-full h-full" />;
      default:
        return <Award className="w-full h-full" />;
    }
  };

  const sizeClasses = {
    sm: 'w-8 h-8 p-1.5 text-xs',
    md: 'w-12 h-12 p-2.5 text-sm',
    lg: 'w-16 h-16 p-3 text-base',
    xl: 'w-20 h-20 p-4 text-lg',
  }[size];

  const rarityClasses = {
    common: 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-emerald-100',
    rare: 'bg-blue-50 text-blue-600 border-blue-200 shadow-blue-100',
    epic: 'bg-purple-50 text-purple-600 border-purple-200 shadow-purple-100',
    legendary: 'bg-amber-50 text-amber-600 border-amber-300 shadow-amber-200 shadow-md',
  }[rarity];

  if (!isUnlocked) {
    return (
      <div
        className={`${sizeClasses} rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center grayscale opacity-60`}
      >
        {getIcon()}
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses} rounded-2xl border-2 flex items-center justify-center shadow-sm transition-transform hover:scale-105 ${rarityClasses}`}
    >
      {getIcon()}
    </div>
  );
};
