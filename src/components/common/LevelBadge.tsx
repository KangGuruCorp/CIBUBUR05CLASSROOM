import React from 'react';
import { BookOpen, Compass, Crown, Star, Zap } from 'lucide-react';
import { LevelConfig } from '../../types';
import { PointIcon } from './PointIcon';

interface LevelBadgeProps {
  level: LevelConfig;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  progressPercent?: number;
  pointsToNext?: number;
  totalPoints?: number;
}

export const LevelBadge: React.FC<LevelBadgeProps> = ({
  level,
  size = 'md',
  showProgress = false,
  progressPercent = 0,
  pointsToNext = 0,
  totalPoints,
}) => {
  const getIcon = () => {
    switch (level.badgeIcon) {
      case 'Compass':
        return <Compass className="w-full h-full" />;
      case 'BookOpen':
        return <BookOpen className="w-full h-full" />;
      case 'Zap':
        return <Zap className="w-full h-full" />;
      case 'Star':
        return <Star className="w-full h-full" />;
      case 'Crown':
        return <Crown className="w-full h-full" />;
      default:
        return <Star className="w-full h-full" />;
    }
  };

  if (size === 'sm') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
        <span className="w-3.5 h-3.5">{getIcon()}</span>
        <span>Lvl {level.level} • {level.name}</span>
      </span>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
      <div className="flex items-center gap-3.5">
        <div
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${level.color} text-white p-2.5 flex items-center justify-center shadow-sm shrink-0`}
        >
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Level {level.level}
            </span>
            {totalPoints !== undefined && (
              <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/80 flex items-center gap-1">
                <PointIcon className="w-3.5 h-3.5" />
                <span>{totalPoints} Poin</span>
              </span>
            )}
          </div>
          <h4 className="text-base font-bold text-slate-800 truncate font-display">
            {level.name}
          </h4>
        </div>
      </div>

      {showProgress && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span>Kemajuan Level</span>
            <span className="font-medium text-slate-700">
              {pointsToNext > 0 ? `${pointsToNext} poin lagi ke Lvl ${level.level + 1}` : 'Level Maksimal!'}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${level.color} transition-all duration-500 ease-out`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
