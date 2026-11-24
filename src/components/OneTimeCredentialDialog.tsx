import React, { useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { KeyRound, Copy, Check } from 'lucide-react';

/**
 * Shows a newly issued temporary password ONCE to the staff member who created the account.
 * - Never stored in app state, localStorage or logs; the value lives only in this dialog.
 * - Closing the dialog unmounts it and the value is gone; it cannot be shown again
 *   (a new temporary password must be issued via the reset flow).
 */
function Dialog({ name, temporaryPassword, onClose }: { name: string; temporaryPassword: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4" dir="rtl" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl text-right">
        <div className="flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-emerald-700" />
          <strong className="text-sm font-black text-slate-900 dark:text-white">كلمة المرور المؤقتة للحساب الجديد</strong>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          تظهر هذه الكلمة <strong>مرة واحدة فقط</strong> ولن تُعرض مجدداً. سلّمها لصاحب الحساب بشكل آمن، وسيُطلب منه تغييرها عند أول دخول.
        </p>
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 space-y-2 text-xs">
          {name && (
            <div className="flex justify-between">
              <span className="text-slate-500 font-bold">الاسم:</span>
              <strong className="text-slate-900 dark:text-white">{name}</strong>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-emerald-900 dark:text-emerald-200 font-black">كلمة المرور المؤقتة:</span>
            <strong className="font-mono text-sm bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-emerald-300 select-all" dir="ltr">
              {temporaryPassword}
            </strong>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => { navigator.clipboard?.writeText(temporaryPassword).catch(() => {}); setCopied(true); }}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'تم النسخ' : 'نسخ كلمة المرور'}</span>
          </button>
          <button type="button" onClick={onClose}
            className="px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs py-2.5 rounded-xl">
            تم — إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

export function showOneTimeCredential(name: string, temporaryPassword: string) {
  if (typeof document === 'undefined' || !temporaryPassword) return;
  const host = document.createElement('div');
  document.body.appendChild(host);
  let root: Root | null = createRoot(host);
  const close = () => {
    root?.unmount();
    root = null;
    host.remove();
  };
  root.render(<Dialog name={name} temporaryPassword={temporaryPassword} onClose={close} />);
}
