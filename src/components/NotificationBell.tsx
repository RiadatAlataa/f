import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  Volume2, 
  VolumeX, 
  Search, 
  ExternalLink, 
  AlertTriangle, 
  Info, 
  Flame, 
  Headphones, 
  Award, 
  Star, 
  Clock, 
  X,
  Filter,
  Sliders,
  BellRing
} from 'lucide-react';
import { Notification } from '../types';
import { useApplicationAudio } from '../utils/audioNotification';

interface NotificationBellProps {
  notifications: Notification[];
  currentUserId?: string;
  currentUserRole?: string;
  onMarkRead?: (notificationId?: string, markAll?: boolean) => void;
  onDelete?: (notificationId?: string, clearAll?: boolean) => void;
  onNavigate?: (linkUrl: string) => void;
  onOpenUserSettings?: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  notifications = [],
  currentUserId = 'all',
  currentUserRole = 'volunteer',
  onMarkRead,
  onDelete,
  onNavigate,
  onOpenUserSettings
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'urgent' | 'important' | 'support'>('all');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('notif_sound_enabled') !== 'false';
  });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevUnreadCountRef = useRef<number>(0);

  // Application audio alert hook
  const { isAudioEnabled: isAppAudioEnabled, toggleAudio: toggleAppAudio, testSound: testAppSound } = useApplicationAudio();

  // Filter notifications relevant to current user
  const userNotifications = notifications.filter(n => {
    if (!n) return false;
    if (n.userId === 'all' || n.userId === currentUserId) return true;
    if (n.recipientIds && n.recipientIds.includes(currentUserId)) return true;
    if (n.targetRole && (currentUserId.includes(n.targetRole) || currentUserRole === n.targetRole)) return true;
    if (currentUserRole === 'admin' || currentUserRole === 'board_member') return true;
    return false;
  });

  // Calculate unread items count
  const unreadCount = userNotifications.filter(n => {
    if (n.read) return false;
    if (currentUserId && n.readByUsers && n.readByUsers[currentUserId]) return false;
    return true;
  }).length;

  const hasUrgentUnread = userNotifications.some(n => (!n.read && n.type === 'urgent'));

  // Sound generator using Web Audio API
  const playAlertChime = (type: 'normal' | 'important' | 'urgent' = 'normal') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'urgent') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now); // A5
        osc.frequency.setValueAtTime(1174.66, now + 0.12); // D6
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'important') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880, now + 0.1); // A5
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch (e) {
      console.warn("Audio chime play error:", e);
    }
  };

  // Play chime when new unread notifications arrive
  useEffect(() => {
    if (unreadCount > prevUnreadCountRef.current && prevUnreadCountRef.current !== 0) {
      playAlertChime(hasUrgentUnread ? 'urgent' : 'normal');
    }
    prevUnreadCountRef.current = unreadCount;
  }, [unreadCount, hasUrgentUnread]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    localStorage.setItem('notif_sound_enabled', String(nextState));
    if (nextState) playAlertChime('normal');
  };

  // Filtered notifications list
  const filteredNotifications = userNotifications.filter(n => {
    const textMatch = 
      (n.titleAr || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.bodyAr || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!textMatch) return false;

    if (activeFilter === 'unread') return !n.read;
    if (activeFilter === 'urgent') return n.type === 'urgent';
    if (activeFilter === 'important') return n.type === 'important' || n.type === 'urgent';
    if (activeFilter === 'support') return n.category === 'support' || n.linkUrl?.includes('support');

    return true;
  });

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'support': return <Headphones className="w-4 h-4 text-indigo-600" />;
      case 'certificate': return <Award className="w-4 h-4 text-amber-600" />;
      case 'points': return <Star className="w-4 h-4 text-emerald-600" />;
      case 'attendance': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'initiative': return <Flame className="w-4 h-4 text-rose-600" />;
      default: return <Info className="w-4 h-4 text-slate-500" />;
    }
  };

  const getPriorityBadge = (type?: 'normal' | 'important' | 'urgent') => {
    if (type === 'urgent') {
      return (
        <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 border border-rose-200 animate-pulse">
          <Flame className="w-3 h-3 text-rose-600" />
          <span>عاجل</span>
        </span>
      );
    }
    if (type === 'important') {
      return (
        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-200">
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          <span>مهم</span>
        </span>
      );
    }
    return (
      <span className="bg-emerald-50 text-emerald-700 text-[10px] font-medium px-2 py-0.5 rounded-full border border-emerald-200/60">
        عادي
      </span>
    );
  };

  return (
    <div className={`relative inline-block text-right ${isOpen ? 'z-50' : 'z-10'}`} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        id="btn-notification-bell"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && unreadCount > 0) {
            playAlertChime(hasUrgentUnread ? 'urgent' : 'normal');
          }
        }}
        className={`relative p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
          isOpen 
            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-200 dark:ring-emerald-800' 
            : unreadCount > 0
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
        }`}
        title="جرس الإشعارات والتنبيهات"
      >
        <Bell className={`w-5 h-5 ${unreadCount > 0 && !isOpen ? 'animate-bounce text-emerald-700 dark:text-emerald-400' : ''}`} />

        {/* Unread Red Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[11px] font-black min-w-[20px] h-[20px] px-1 rounded-full flex items-center justify-center shadow-md border-2 border-white dark:border-slate-900 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* Urgent Glow Indicator */}
        {hasUrgentUnread && (
          <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping opacity-75" />
        )}
      </button>

      {/* Notifications Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 mt-3 w-80 sm:w-96 md:w-[420px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden text-slate-800 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150">
          
          {/* Panel Header */}
          <div className="p-4 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white flex items-center justify-between border-b border-emerald-800/40">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-400/30 text-emerald-300">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-white">مركز الإشعارات والتنبيهات</h3>
                  {unreadCount > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                      {unreadCount} جديد
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-emerald-200/80">التحديثات الفورية للأنشطة والطلبات</p>
              </div>
            </div>

            {/* Quick Actions Header */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleSound}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-emerald-100 transition-all cursor-pointer"
                title={soundEnabled ? "كتم الصوت" : "تفعيل تنبيه الصوت"}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-300" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 transition-all cursor-pointer"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder="البحث في الإشعارات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-9 pl-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] font-bold scrollbar-none">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  activeFilter === 'all' 
                    ? 'bg-slate-800 dark:bg-emerald-600 text-white shadow-sm' 
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                الكل ({userNotifications.length})
              </button>

              <button
                onClick={() => setActiveFilter('unread')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  activeFilter === 'unread' 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>غير المقروءة</span>
                {unreadCount > 0 && <span className="bg-rose-500 text-white px-1.5 py-0.2 rounded-full text-[9px]">{unreadCount}</span>}
              </button>

              <button
                onClick={() => setActiveFilter('urgent')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  activeFilter === 'urgent' 
                    ? 'bg-rose-600 text-white shadow-sm' 
                    : 'bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <Flame className="w-3 h-3 text-rose-500" />
                <span>عاجل</span>
              </button>

              <button
                onClick={() => setActiveFilter('support')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  activeFilter === 'support' 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <Headphones className="w-3 h-3 text-indigo-500" />
                <span>الدعم الفني</span>
              </button>
            </div>
          </div>

          {/* Action Toolbar: Mark all read & Clear all */}
          <div className="px-4 py-2 bg-slate-100/70 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs font-bold">
            <button
              onClick={() => {
                if (onMarkRead) onMarkRead(undefined, true);
              }}
              className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>تحديد الكل كمقروء</span>
            </button>

            <button
              onClick={() => {
                if (window.confirm("هل أنت تأكد من مسح جميع الإشعارات؟")) {
                  if (onDelete) onDelete(undefined, true);
                }
              }}
              className="text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>حذف الكل</span>
            </button>
          </div>

          {/* Notifications Scrollable List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <Bell className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 animate-pulse" />
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">لا توجد إشعارات للعرض حالياً</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">ستظهر هنا الإشعارات الجديدة فور إرسالها من إدارة الجمعية</p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const isRead = notif.read || (currentUserId && notif.readByUsers && notif.readByUsers[currentUserId]);

                return (
                  <div
                    key={notif.id}
                    className={`p-3.5 transition-all flex items-start gap-3 group relative ${
                      !isRead 
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-r-4 border-emerald-500' 
                        : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    {/* Category Icon / Thumbnail */}
                    <div className="shrink-0 mt-0.5">
                      {notif.imageUrl ? (
                        <img 
                          src={notif.imageUrl} 
                          alt="إشعار" 
                          className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm" 
                        />
                      ) : (
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                          {getCategoryIcon(notif.category)}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className={`text-xs ${!isRead ? 'font-black text-slate-900 dark:text-white' : 'font-bold text-slate-700 dark:text-slate-200'}`}>
                            {notif.titleAr}
                          </h4>
                          {getPriorityBadge(notif.type)}
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium shrink-0">
                          {notif.date || 'اليوم'}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2 mb-1.5">
                        {notif.bodyAr}
                      </p>

                      {/* Footer Link & Actions */}
                      <div className="flex items-center justify-between text-[11px] pt-1">
                        {notif.linkUrl ? (
                          <button
                            onClick={() => {
                              if (onMarkRead) onMarkRead(notif.id);
                              if (onNavigate) onNavigate(notif.linkUrl!);
                              setIsOpen(false);
                            }}
                            className="text-emerald-700 dark:text-emerald-400 font-bold hover:text-emerald-900 dark:hover:text-emerald-300 flex items-center gap-1 hover:underline cursor-pointer"
                          >
                            <span>الانتقال للصفحة المرتبطة</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                            {notif.senderName ? `من: ${notif.senderName}` : 'إشعار من النظام'}
                          </span>
                        )}

                        <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition-all">
                          {!isRead && (
                            <button
                              onClick={() => {
                                if (onMarkRead) onMarkRead(notif.id);
                              }}
                              className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 text-[10px] font-bold cursor-pointer"
                              title="تحديد كمقروء"
                            >
                              تم القراءة
                            </button>
                          )}

                          <button
                            onClick={() => {
                              if (onDelete) onDelete(notif.id);
                            }}
                            className="text-slate-400 hover:text-rose-600 transition-all p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                            title="حذف الإشعار"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* User Settings: Application Audio Notification Switch */}
          <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 border-t border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${isAppAudioEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                {isAppAudioEnabled ? <BellRing className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </div>
              <div>
                <strong className="text-[11px] font-bold text-slate-800 dark:text-slate-100 block">
                  صوت طلبات الانضمام (متطوعين وفرق)
                </strong>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {isAppAudioEnabled ? 'نغمة هادئة مفعّلة فور الإرسال ✓' : 'النغمة معطّلة'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  testAppSound();
                }}
                className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/60 transition-all cursor-pointer"
                title="تجربة صوت النغمة"
              >
                تجربة 🔔
              </button>

              {/* Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={isAppAudioEnabled}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleAppAudio();
                }}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isAppAudioEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
                }`}
                title="تشغيل أو إيقاف صوت طلبات الانضمام"
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    isAppAudioEnabled ? '-translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>

              {onOpenUserSettings && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                    onOpenUserSettings();
                  }}
                  className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 transition-colors"
                  title="فتح إعدادات المستخدم الشاملة"
                >
                  <Sliders className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Panel Footer */}
          <div className="p-2.5 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 text-center text-[11px] text-slate-500 dark:text-slate-400 font-bold">
            <span>نظام إشعارات جمعية ريادة العطاء لخدمة الإنسان بالعسيلة الموحد</span>
          </div>

        </div>
      )}
    </div>
  );
};
