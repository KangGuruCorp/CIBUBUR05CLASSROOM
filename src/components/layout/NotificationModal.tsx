import React from 'react';
import { Award, Bell, BookOpen, Check, CheckCircle2, CheckSquare, Clock, Sparkles, X, Zap } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDateIndo } from '../../utils/gamification';
import { PointIcon } from '../common/PointIcon';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, notifications = [], markNotificationRead, markAllNotificationsRead, setActiveTab } =
    useApp();

  if (!isOpen || !currentUser) return null;

  const userNotifs = (notifications || []).filter((n) => n && n.userId === currentUser.uid);

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'assignment':
        return <CheckSquare className="w-5 h-5 text-indigo-600" />;
      case 'material':
        return <BookOpen className="w-5 h-5 text-blue-600" />;
      case 'grade':
        return <Award className="w-5 h-5 text-emerald-600" />;
      case 'mission':
        return <Zap className="w-5 h-5 text-amber-600" />;
      case 'point':
        return <PointIcon className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5 text-slate-600" />;
    }
  };

  const handleNotifClick = (notif: any) => {
    markNotificationRead(notif.id);
    if (notif.targetTab) {
      setActiveTab(notif.targetTab);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display">Pusat Notifikasi</h3>
              <p className="text-xs text-slate-500">Update tugas, materi, poin, dan nilai terbaru</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {userNotifs.some((n) => !n.isRead) && (
              <button
                type="button"
                onClick={markAllNotificationsRead}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 px-2.5 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                Tandai semua dibaca
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
          {userNotifs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Belum ada notifikasi baru untukmu.
            </div>
          ) : (
            userNotifs.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotifClick(notif)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                  notif.isRead
                    ? 'bg-slate-50/70 border-slate-200/70 text-slate-700'
                    : 'bg-indigo-50/40 border-indigo-200/90 shadow-xs'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-xs">
                  {getNotifIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`text-xs ${notif.isRead ? 'font-semibold text-slate-800' : 'font-bold text-indigo-950'}`}>
                      {notif.title}
                    </h4>
                    {!notif.isRead && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{notif.message}</p>
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    {formatDateIndo(notif.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
