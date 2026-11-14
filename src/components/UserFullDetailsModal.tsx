import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  Edit,
  History,
  Lock,
  Mail,
  Phone,
  RefreshCw,
  Shield,
  ShieldCheck,
  Sparkles,
  Users,
  X
} from "lucide-react";
import { buildApiUrl, getAuthHeaders } from "../config/api";
import {
  ROLE_LABELS_AR,
  STATUS_LABELS_AR,
  SystemUser,
  UserDependenciesInfo
} from "./userManagementTypes";

interface UserFullDetailsModalProps {
  user: SystemUser;
  canEdit?: boolean;
  onEditClick?: (user: SystemUser) => void;
  onActivityClick?: (user: SystemUser) => void;
  onClose: () => void;
}

export const UserFullDetailsModal: React.FC<UserFullDetailsModalProps> = ({
  user,
  canEdit = true,
  onEditClick,
  onActivityClick,
  onClose
}) => {
  const targetUserId = user.userId || user.id;
  const [liveUser, setLiveUser] = useState<SystemUser>(user);
  const [deps, setDeps] = useState<UserDependenciesInfo | null>(null);
  const [activeSessions, setActiveSessions] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch(buildApiUrl(`/api/db/users/${encodeURIComponent(targetUserId)}`), {
          headers: { Accept: "application/json", ...getAuthHeaders() },
          cache: "no-store"
        });
        const data = await res.json().catch(() => null);
        if (active && res.ok && data?.user) {
          setLiveUser(data.user);
          setDeps(data.dependencies || null);
          setActiveSessions(data.activeSessionCount || 0);
        }
      } catch {
        // fallback to passed user
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [targetUserId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in" dir="rtl">
      <div className="w-full max-w-3xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-l from-slate-900 via-indigo-950 to-slate-900 p-5 sm:p-6 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            {liveUser.avatarUrl ? (
              <img src={liveUser.avatarUrl} alt={liveUser.name} className="w-12 h-12 rounded-2xl object-cover border border-white/20" />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center font-black text-lg border border-white/15">
                {(liveUser.name || "م").trim().charAt(0)}
              </div>
            )}
            <div>
              <h2 className="text-base sm:text-lg font-black">{liveUser.name}</h2>
              <p className="text-xs text-slate-300">
                @{liveUser.username} • {ROLE_LABELS_AR[liveUser.role] || liveUser.role}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
          {loading && (
            <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>جاري تحديث البيانات من الخادم...</span>
            </div>
          )}

          {/* Core Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-[10px] text-slate-400 block">رقم الهوية الوطنية:</span>
              <strong className="font-mono text-slate-800 dark:text-white">{liveUser.nationalId || "غير مسجل"}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">رقم الملف / العضوية:</span>
              <strong className="font-mono text-emerald-700 dark:text-emerald-400">
                {liveUser.beneficiaryNumber || liveUser.membershipNumber || liveUser.employeeNumber || liveUser.fileNumber || liveUser.id}
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">حالة الحساب:</span>
              <strong className="text-slate-900 dark:text-white">{STATUS_LABELS_AR[liveUser.status] || liveUser.status}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">الجلسات النشطة:</span>
              <strong className="font-mono text-indigo-600">{activeSessions}</strong>
            </div>
          </div>

          {/* Contact & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400" />
              <span className="text-slate-500">البريد:</span>
              <strong className="font-mono text-slate-800 dark:text-slate-200">{liveUser.email || "غير مسجل"}</strong>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-400" />
              <span className="text-slate-500">الجوال:</span>
              <strong className="font-mono text-slate-800 dark:text-slate-200">{liveUser.phone || "غير مسجل"}</strong>
            </div>
            <div>
              <span className="text-slate-500">الإدارة التابعة: </span>
              <strong className="text-slate-800 dark:text-slate-200">{liveUser.departmentName}</strong>
            </div>
            <div>
              <span className="text-slate-500">المسمى / المنصب: </span>
              <strong className="text-slate-800 dark:text-slate-200">{liveUser.positionTitle || liveUser.jobTitle || "غير محدد"}</strong>
            </div>
            {(liveUser.city || liveUser.district || liveUser.address) && (
              <div className="sm:col-span-2">
                <span className="text-slate-500">العنوان: </span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {[liveUser.city, liveUser.district, liveUser.address].filter(Boolean).join(" - ")}
                </strong>
              </div>
            )}
          </div>

          {/* Security & Password Policy */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-emerald-600" />
              <div>
                <div className="font-black text-slate-800 dark:text-white">كلمة المرور محمية ومشفرة (Bcrypt)</div>
                <div className="text-[11px] text-slate-500">•••••••••• (غير قابلة للعرض حفاظاً على أمن الحساب)</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                {liveUser.permissions?.length || 0} صلاحية مفعلة
              </span>
            </div>
          </div>

          {/* Role-Specific Overview */}
          {(liveUser.role === "volunteer" || liveUser.role === "leader" || liveUser.membershipNumber) && (
            <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900 space-y-2">
              <div className="font-black text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-teal-600" />
                بيانات العضوية التطوعية
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                <div><span className="text-slate-500 block">الفريق:</span><strong>{liveUser.teamName || "متطوع مستقل"}</strong></div>
                <div><span className="text-slate-500 block">الدور بالفريق:</span><strong>{liveUser.teamRole || "عضو"}</strong></div>
                <div><span className="text-slate-500 block">الساعات المعتمدة:</span><strong className="font-mono">{liveUser.hours ?? 0} ساعة</strong></div>
                <div><span className="text-slate-500 block">النقاط التطوعية:</span><strong className="font-mono">{liveUser.points ?? 0} نقطة</strong></div>
              </div>
            </div>
          )}

          {(liveUser.role === "beneficiary" || liveUser.beneficiaryNumber) && (
            <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 space-y-2">
              <div className="font-black text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-rose-600" />
                بيانات ملف المستفيد
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                <div><span className="text-slate-500 block">صفة الإقامة:</span><strong>{liveUser.residencyStatus || "غير محدد"}</strong></div>
                <div><span className="text-slate-500 block">الحالة الاجتماعية:</span><strong>{liveUser.maritalStatus || "غير محدد"}</strong></div>
                <div><span className="text-slate-500 block">أفراد الأسرة:</span><strong className="font-mono">{liveUser.familySize ?? 1}</strong></div>
                <div><span className="text-slate-500 block">الباركود الدائم:</span><strong className="font-mono">{liveUser.barcodeId || "—"}</strong></div>
              </div>
            </div>
          )}

          {/* Linked Records & Custodies */}
          {deps && (deps.hasLinkedRecords || deps.openCustodiesCount > 0) && (
            <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 space-y-2">
              <div className="font-black text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                السجلات التاريخية والعهد المرتبطة بالحساب
              </div>
              <div className="flex flex-wrap gap-1.5">
                {deps.summaryItems.map((item, idx) => (
                  <span key={idx} className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-blue-800 dark:text-blue-300">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Linked Unified Collections */}
          {liveUser.linkedProfiles && liveUser.linkedProfiles.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-500" />
                مصادر السجل الموحدة ({liveUser.linkedProfiles.length}):
              </div>
              <div className="flex flex-wrap gap-1.5">
                {liveUser.linkedProfiles.map((lp, idx) => (
                  <span key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-xl text-[10px] font-bold">
                    {lp.source} • {lp.id}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2">
            {onActivityClick && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onActivityClick(liveUser);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <History className="w-3.5 h-3.5" />
                <span>سجل النشاط والتدقيق</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
            >
              إغلاق
            </button>
            {canEdit && onEditClick && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditClick(liveUser);
                }}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>فتح شاشة التعديل الشاملة</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
