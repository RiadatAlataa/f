import React from 'react';
import { Check, X, Shield, ShieldCheck, Lock } from 'lucide-react';
import { evaluatePasswordStrength } from '../utils/passwordSecurity';

interface PasswordStrengthMeterProps {
  password: string;
  showRules?: boolean;
  className?: string;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  password,
  showRules = true,
  className = ""
}) => {
  const evalResult = evaluatePasswordStrength(password);

  if (!password && !showRules) return null;

  return (
    <div className={`space-y-2 mt-2 ${className}`} dir="rtl">
      {/* Progress Bar & Strength Indicator */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] font-bold">
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <Lock className="w-3 h-3 text-slate-400" />
            <span>مؤشر قوة الحماية:</span>
          </span>
          <span className={`font-black flex items-center gap-1 ${
            evalResult.strength === 'strong' ? 'text-emerald-600 dark:text-emerald-400' :
            evalResult.strength === 'good' ? 'text-blue-600 dark:text-blue-400' :
            evalResult.strength === 'fair' ? 'text-amber-600 dark:text-amber-400' :
            'text-rose-600 dark:text-rose-400'
          }`}>
            {evalResult.labelAr}
          </span>
        </div>

        {/* Progress track */}
        <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              evalResult.strength === 'strong' ? 'bg-emerald-500 w-full' :
              evalResult.strength === 'good' ? 'bg-blue-500 w-3/4' :
              evalResult.strength === 'fair' ? 'bg-amber-500 w-2/4' :
              password ? 'bg-rose-500 w-1/4' : 'w-0'
            }`}
          />
        </div>
      </div>

      {/* Checklist Rules */}
      {showRules && (
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-[11px] space-y-1.5">
          <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-200/50 dark:border-slate-700/50">
            <span className="font-black text-slate-700 dark:text-slate-200 flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>معايير تشفير Bcrypt المطلوبة:</span>
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
              Bcrypt 10-Rounds
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {evalResult.rules.map((rule) => (
              <div 
                key={rule.id} 
                className={`flex items-center gap-1.5 transition-colors ${
                  rule.passed 
                    ? 'text-emerald-600 dark:text-emerald-400 font-bold' 
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${
                  rule.passed 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                }`}>
                  {rule.passed ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
                </div>
                <span className="text-[10px] leading-tight">{rule.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
