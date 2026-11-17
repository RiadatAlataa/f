import React, { useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PinCodeInputProps {
  value: string;
  onChange: (nextVal: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  label?: string;
  idPrefix?: string;
  onComplete?: (pin: string) => void;
}

export const PinCodeInput: React.FC<PinCodeInputProps> = ({
  value,
  onChange,
  disabled = false,
  autoFocus = false,
  label,
  idPrefix = "pin",
  onComplete,
}) => {
  const [revealDigits, setRevealDigits] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || "");

  const updateDigit = (index: number, char: string) => {
    const clean = char.replace(/\D/g, "");
    if (!clean) {
      const nextArr = [...digits];
      nextArr[index] = "";
      onChange(nextArr.join(""));
      return;
    }

    // Handle multi-digit paste or fast entry
    const chars = clean.slice(0, 6 - index).split("");
    const nextArr = [...digits];
    chars.forEach((c, offset) => {
      if (index + offset < 6) {
        nextArr[index + offset] = c;
      }
    });
    const joined = nextArr.join("").slice(0, 6);
    onChange(joined);

    const focusTarget = Math.min(5, index + chars.length);
    if (index + chars.length < 6) {
      inputRefs.current[focusTarget]?.focus();
    } else if (joined.length === 6) {
      inputRefs.current[5]?.focus();
      onComplete?.(joined);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[index]) {
        const nextArr = [...digits];
        nextArr[index] = "";
        onChange(nextArr.join(""));
      } else if (index > 0) {
        const nextArr = [...digits];
        nextArr[index - 1] = "";
        onChange(nextArr.join(""));
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted) {
      e.preventDefault();
      onChange(pasted);
      const lastIdx = Math.min(5, pasted.length - 1);
      if (lastIdx >= 0) inputRefs.current[lastIdx]?.focus();
      if (pasted.length === 6) onComplete?.(pasted);
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between gap-2">
          <label className="block text-xs font-black text-[#071C43] dark:text-slate-200">
            {label}
          </label>
          <button
            type="button"
            onClick={() => setRevealDigits((prev) => !prev)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0754C7] dark:text-blue-300 hover:underline cursor-pointer"
            tabIndex={-1}
          >
            {revealDigits ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{revealDigits ? "إخفاء الأرقام" : "إظهار الأرقام"}</span>
          </button>
        </div>
      )}
      <div
        dir="ltr"
        className="grid grid-cols-6 gap-2 sm:gap-2.5 max-w-[330px] mx-auto"
      >
        {digits.map((digit, idx) => (
          <input
            key={idx}
            id={`${idPrefix}-digit-${idx}`}
            ref={(el) => {
              inputRefs.current[idx] = el;
            }}
            type={revealDigits ? "text" : "password"}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            autoComplete={idx === 0 ? "one-time-code" : "off"}
            autoFocus={autoFocus && idx === 0}
            disabled={disabled}
            value={digit}
            aria-label={`الرقم ${idx + 1} من رمز الدخول`}
            onChange={(e) => updateDigit(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full h-12 sm:h-13 text-center text-lg sm:text-xl font-mono font-black rounded-xl border-2 border-slate-200 dark:border-[#244577] bg-slate-50 dark:bg-[#081426] text-[#071C43] dark:text-white focus:border-[#0754C7] dark:focus:border-[#0875E1] focus:bg-white dark:focus:bg-[#0b1b34] focus:outline-none focus:ring-2 focus:ring-[#0754C7]/20 transition-all disabled:opacity-50"
          />
        ))}
      </div>
      {!label && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setRevealDigits((prev) => !prev)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0754C7] dark:text-blue-300 hover:underline cursor-pointer"
            tabIndex={-1}
          >
            {revealDigits ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{revealDigits ? "إخفاء الأرقام" : "إظهار الأرقام"}</span>
          </button>
        </div>
      )}
    </div>
  );
};
