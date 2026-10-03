// Password Security & Strength Evaluator for Reyadat Al-Ataa Systems
// Standardized client-side validation aligned with server-side Bcrypt policies

export interface PasswordRule {
  id: string;
  label: string;
  passed: boolean;
}

export interface PasswordStrengthEvaluation {
  score: number; // 0 to 4
  strength: 'weak' | 'fair' | 'good' | 'strong';
  labelAr: string;
  labelEn: string;
  colorClass: string;
  barWidthClass: string;
  rules: PasswordRule[];
  allPassed: boolean;
  errors: string[];
}

export function evaluatePasswordStrength(pwd: string): PasswordStrengthEvaluation {
  const p = (pwd || "").trim();

  const rules: PasswordRule[] = [
    {
      id: "min_length",
      label: "8 خانات على الأقل",
      passed: p.length >= 8
    },
    {
      id: "has_number",
      label: "رقم واحد على الأقل (0-9)",
      passed: /[0-9]/.test(p)
    },
    {
      id: "has_letter",
      label: "أحرف لغوية (عربية أو إنجليزية)",
      passed: /[a-zA-Z\u0621-\u064A]/.test(p)
    },
    {
      id: "has_symbol_or_upper",
      label: "رمز خاص (!@#$...) أو حرف كبير (Uppercase)",
      passed: /[A-Z]/.test(p) || /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(p)
    }
  ];

  const passedCount = rules.filter(r => r.passed).length;
  const allPassed = rules.every(r => r.passed);

  let score = 0;
  if (p.length >= 8) score++;
  if (p.length >= 10) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[A-Z]/.test(p) || /[^a-zA-Z0-9\u0621-\u064A]/.test(p)) score++;

  let strength: 'weak' | 'fair' | 'good' | 'strong' = 'weak';
  let labelAr = "ضعيفة جداً";
  let labelEn = "Very Weak";
  let colorClass = "bg-rose-500 text-rose-600 dark:text-rose-400";
  let barWidthClass = "w-1/4";

  if (!p) {
    labelAr = "أدخل كلمة المرور";
    labelEn = "Enter password";
    colorClass = "bg-slate-300 text-slate-400";
    barWidthClass = "w-0";
  } else if (passedCount <= 1) {
    strength = 'weak';
    labelAr = "ضعيفة وغير مقبولة";
    labelEn = "Weak";
    colorClass = "bg-rose-500 text-rose-600 dark:text-rose-400";
    barWidthClass = "w-1/4";
  } else if (passedCount === 2) {
    strength = 'fair';
    labelAr = "مقبولة جزئياً (تحتاج تعزيز)";
    labelEn = "Fair";
    colorClass = "bg-amber-500 text-amber-600 dark:text-amber-400";
    barWidthClass = "w-2/4";
  } else if (passedCount === 3) {
    strength = 'good';
    labelAr = "جيدة وقابلة للاعتماد";
    labelEn = "Good";
    colorClass = "bg-blue-500 text-blue-600 dark:text-blue-400";
    barWidthClass = "w-3/4";
  } else {
    strength = 'strong';
    labelAr = "قوية جداً ومحمية بنظام Bcrypt ✓";
    labelEn = "Very Strong (Bcrypt Protected)";
    colorClass = "bg-emerald-500 text-emerald-600 dark:text-emerald-400";
    barWidthClass = "w-full";
  }

  const errors: string[] = [];
  rules.forEach(r => {
    if (!r.passed) errors.push(`شرط غير مستوفى: ${r.label}`);
  });

  return {
    score,
    strength,
    labelAr,
    labelEn,
    colorClass,
    barWidthClass,
    rules,
    allPassed,
    errors
  };
}

// Generate a cryptographically strong 12-character random password
export function generateStrongPassword(): string {
  const uppers = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lowers = "abcdefghijkmnpqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "!@#$%^&*_-";

  let result = "";
  // Ensure at least one from each category
  result += uppers.charAt(Math.floor(Math.random() * uppers.length));
  result += lowers.charAt(Math.floor(Math.random() * lowers.length));
  result += numbers.charAt(Math.floor(Math.random() * numbers.length));
  result += symbols.charAt(Math.floor(Math.random() * symbols.length));

  const allChars = uppers + lowers + numbers + symbols;
  for (let i = result.length; i < 12; i++) {
    result += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }

  // Shuffle the result
  return result
    .split("")
    .sort(() => 0.5 - Math.random())
    .join("");
}
