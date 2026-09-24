import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { 
  Menu, X, Pin, PinOff, Search, ChevronLeft, ChevronDown, 
  Sparkles, ShieldCheck, ExternalLink, Headphones, ShoppingBag, 
  Settings, CheckCircle2, ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  description?: string;
}

export interface NavGroup {
  category: string;
  items: NavItem[];
}

interface ModernAppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
  activeSubTab: string;
  onSelectTab: (tabId: string) => void;
  navGroups: NavGroup[];
  totalVolunteersCount?: number;
  pendingRequestsCount?: number;
  pendingOpportunitiesCount?: number;
  onOpenQuickSupport?: () => void;
  onOpenQuickSettings?: () => void;
}

export const ModernAppSidebar: React.FC<ModernAppSidebarProps> = ({
  isOpen,
  onClose,
  activeSubTab,
  onSelectTab,
  navGroups,
  totalVolunteersCount = 0,
  pendingRequestsCount = 0,
  pendingOpportunitiesCount = 0,
  onOpenQuickSupport,
  onOpenQuickSettings
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const sidebarRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Lock body scroll when off-canvas sidebar is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Focus search when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Toggle category collapse
  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  // Filter items by search query
  const filteredGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return navGroups;

    return navGroups
      .map(group => {
        const matchedItems = group.items.filter(item => 
          item.label.toLowerCase().includes(query) ||
          item.id.toLowerCase().includes(query)
        );
        return {
          ...group,
          items: matchedItems
        };
      })
      .filter(group => group.items.length > 0);
  }, [navGroups, searchQuery]);

  // Handle item click
  const handleItemClick = (id: string) => {
    onSelectTab(id);
    onClose();
  };

  // Content of the sidebar
  const sidebarContent = (
    <div 
      ref={sidebarRef}
      className="flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200/80 dark:border-slate-800 text-right select-none overflow-hidden"
      dir="rtl"
    >
      {/* 1. Header Section */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/95 shrink-0">
        <div className="flex items-center justify-between gap-2">
          {/* Logo & System Brand */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-sm shrink-0">
              <Sparkles className="w-5 h-5 text-emerald-100" />
            </div>
            <div className="min-w-0 truncate">
              <div className="flex items-center gap-1.5">
                <h2 className="text-xs font-bold text-slate-900 dark:text-white truncate font-lyon association-brand-text">جمعية ريادة العطاء لخدمة الإنسان بالعسيلة</h2>
                <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md shrink-0">
                  5081
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">لوحة الإدارة والتحكم الشاملة</p>
            </div>
          </div>

          {/* Controls: Clear Close Button */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              id="sidebar-close-btn"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/50 text-slate-700 hover:text-rose-600 dark:text-slate-200 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 transition-all font-bold text-xs cursor-pointer shadow-xs"
              title="إغلاق القائمة (Esc)"
              aria-label="إغلاق الشريط الجانبي"
            >
              <X className="w-4 h-4 text-rose-500" />
              <span>إغلاق</span>
            </button>
          </div>
        </div>

        {/* 2. Instant Search Bar */}
        <div className="mt-3 relative">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث في الأقسام والقوائم..."
            className="w-full bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pr-8 pl-8 text-xs font-semibold text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all shadow-xs"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              title="مسح البحث"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Navigation List (Scrollable) */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
        {filteredGroups.length === 0 ? (
          <div className="py-12 text-center text-slate-400 dark:text-slate-500 space-y-2">
            <Search className="w-8 h-8 mx-auto opacity-40 animate-pulse" />
            <p className="text-xs font-bold">لم يتم العثور على نتائج لـ "{searchQuery}"</p>
            <button
              onClick={() => setSearchQuery("")}
              className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
            >
              عرض جميع الأقسام
            </button>
          </div>
        ) : (
          filteredGroups.map((group, groupIdx) => {
            const isCategoryCollapsed = !searchQuery && collapsedCategories[group.category];
            return (
              <div key={groupIdx} className="space-y-1">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(group.category)}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-[11px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer group"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 shrink-0"></span>
                    <span className="truncate">{group.category}</span>
                  </span>
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 shrink-0 ${isCategoryCollapsed ? '-rotate-90 text-slate-400' : 'rotate-0 text-slate-400'}`} />
                </button>

                {/* Items in Category */}
                {!isCategoryCollapsed && (
                  <div className="space-y-1 pt-0.5">
                    {group.items.map((item) => {
                      const IconComponent = item.icon;
                      const isActive = activeSubTab === item.id;
                      return (
                        <button
                          key={item.id}
                          id={`sidebar-item-${item.id}`}
                          onClick={() => handleItemClick(item.id)}
                          className={`w-full group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
                            isActive
                              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-black"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white"
                          }`}
                        >
                          {/* Active Indicator Bar on right in RTL */}
                          {isActive && (
                            <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-l-full"></span>
                          )}

                          <div className="flex items-center gap-2.5 min-w-0 pr-1">
                            <IconComponent 
                              className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                                isActive ? "text-white" : "text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400"
                              }`} 
                            />
                            <span className="truncate">{item.label}</span>
                          </div>

                          {/* Badge / Counter */}
                          {item.badge !== undefined && (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold shrink-0 transition-colors ${
                                isActive
                                  ? "bg-white/20 text-white"
                                  : typeof item.badge === "number" && item.badge > 0
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 4. Footer & Quick Action Bar */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/80 shrink-0 space-y-2">
        {/* Quick Help & Shortcuts */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              if (onOpenQuickSupport) onOpenQuickSupport();
              else handleItemClick('support');
            }}
            className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/50 transition-all cursor-pointer"
          >
            <Headphones className="w-3.5 h-3.5 text-rose-600" />
            <span>الدعم الفني</span>
          </button>

          <button
            onClick={() => {
              if (onOpenQuickSettings) onOpenQuickSettings();
              else handleItemClick('system_settings');
            }}
            className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-bold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/50 transition-all cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-amber-600" />
            <span>إعدادات النظام</span>
          </button>
        </div>
      </div>
    </div>
  );

  // Pure Off-Canvas Floating Right-Side Drawer (Mobile, Tablet, and Desktop)
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div 
          key="modern-sidebar-portal-root" 
          className="fixed inset-0 z-[99999] overflow-hidden no-print select-none" 
          dir="rtl"
        >
          {/* Backdrop Blur Overlay - Click to close */}
          <motion.div
            key="modern-sidebar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/65 dark:bg-black/80 backdrop-blur-xs transition-opacity cursor-pointer z-0"
            aria-hidden="true"
          />

          {/* Off-Canvas Sliding Container from Right Edge (RTL) */}
          <motion.aside
            key="modern-sidebar-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-10 w-80 sm:w-96 max-w-[85vw] h-full shadow-2xl flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800"
            role="dialog"
            aria-modal="true"
            aria-label="القائمة الجانبية للنظام"
          >
            {sidebarContent}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
