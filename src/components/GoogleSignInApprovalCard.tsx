import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { buildApiUrl, getAuthHeaders } from '../config/api';

/**
 * Google sign-in approval for privileged (top-management) accounts.
 * The server requires the caller to re-enter their own password; approval is then bound to the
 * Google account's immutable id on the next verified Google sign-in.
 */
export function GoogleSignInApprovalCard({ lang = 'ar' }: { lang?: 'ar' | 'en' }) {
  const [password, setPassword] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (approve: boolean) => {
    if (!password) {
      setMsg({ ok: false, text: 'يرجى إدخال كلمة المرور الحالية للتأكيد.' });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(buildApiUrl('/api/db/auth/google-signin/approval'), {
        method: 'POST',
        credentials: 'include',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ approve, currentPassword: password, targetUserId: targetUserId.trim() || undefined })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ ok: false, text: data?.error || 'تعذر تنفيذ العملية.' });
      } else {
        setMsg({
          ok: true,
          text: approve
            ? 'تم اعتماد الدخول عبر Google. سيُربط الحساب بحساب Google الموثق عند أول دخول.'
            : 'تم إلغاء الدخول عبر Google لهذا الحساب.'
        });
      }
    } catch {
      setMsg({ ok: false, text: 'تعذر الاتصال بالخادم.' });
    } finally {
      setPassword('');
      setBusy(false);
    }
  };

  return (
    <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-950/20 space-y-3" dir="rtl">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-amber-700 dark:text-amber-300" />
        <strong className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
          {lang === 'ar' ? 'الدخول عبر Google لحسابات الإدارة' : 'Google sign-in for admin accounts'}
        </strong>
      </div>
      <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
        لا يُسمح لحسابات الإدارة العليا بالدخول عبر Google إلا بعد اعتماد صريح. اترك حقل المعرّف فارغاً لاعتماد حسابك أنت.
      </p>
      <input
        type="text"
        value={targetUserId}
        onChange={(e) => setTargetUserId(e.target.value)}
        placeholder="معرّف الحساب الإداري (اختياري)"
        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
        autoComplete="off"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="كلمة المرور الحالية للتأكيد"
        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs"
        autoComplete="current-password"
      />
      <div className="flex gap-2">
        <button type="button" disabled={busy} onClick={() => submit(true)}
          className="px-3 py-2 rounded-xl bg-[#0754C7] text-white text-xs font-bold disabled:opacity-60">
          اعتماد الدخول عبر Google
        </button>
        <button type="button" disabled={busy} onClick={() => submit(false)}
          className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-bold disabled:opacity-60">
          إلغاء الاعتماد
        </button>
      </div>
      {msg && (
        <div className={`flex items-start gap-2 text-[11px] ${msg.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
          {msg.ok ? <ShieldCheck className="w-4 h-4 shrink-0" /> : <ShieldAlert className="w-4 h-4 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}
    </div>
  );
}
