import React from 'react';
import { LucideIcon, Sparkles } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: { label: string; onClick: () => void };
  variant?: 'student' | 'teacher';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Sparkles,
  title,
  description,
  actionLabel,
  onAction,
  action,
  variant = 'student',
}) => {
  const resolvedLabel = action?.label || actionLabel;
  const resolvedAction = action?.onClick || onAction;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-white rounded-2xl border border-dashed border-slate-200">
      <div
        className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
          variant === 'student' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-700'
        }`}
      >
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-1 font-display">{title}</h3>
      <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">{description}</p>
      {resolvedLabel && resolvedAction && (
        <button
          onClick={resolvedAction}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-all active:scale-95"
        >
          {resolvedLabel}
        </button>
      )}
    </div>
  );
};
