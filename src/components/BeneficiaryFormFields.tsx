import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  MapPin, 
  Globe, 
  UserCheck, 
  Heart, 
  HelpCircle, 
  Search, 
  Lock, 
  AlertCircle,
  Sparkles,
  Info
} from 'lucide-react';
import { 
  MAKKAH_REGION_CITIES, 
  NATIONALITIES_LIST, 
  RESIDENCY_STATUS_OPTIONS, 
  MARITAL_STATUS_OPTIONS, 
  ORPHAN_STATUS_OPTIONS,
  HIJRI_MONTHS,
  OTHER_DISTRICT_OPTION,
  ResidencyStatus,
  MaritalStatus,
  OrphanStatus,
  hijriToGregorian,
  gregorianToHijri,
  calculateAge
} from '../data/beneficiaryRegistryData';

export interface BeneficiaryFormData {
  birthCalendarType: 'hijri' | 'gregorian';
  birthDate: string; // ISO standard YYYY-MM-DD
  birthDateHijri: string; // YYYY/MM/DD
  age: number;
  residencyStatus: ResidencyStatus;
  nationality: string;
  nationalityProofDoc?: string;
  city: string;
  district: string;
  customDistrict?: string;
  maritalStatus: string;
  orphanStatus: string;
}

interface BeneficiaryFormFieldsProps {
  values: BeneficiaryFormData;
  onChange: (updatedValues: Partial<BeneficiaryFormData>) => void;
  disabled?: boolean;
  isCompact?: boolean;
}

export const BeneficiaryFormFields: React.FC<BeneficiaryFormFieldsProps> = ({
  values,
  onChange,
  disabled = false,
  isCompact = false
}) => {
  // تتبع عناصر التاريخ الهجري المنفصلة (يوم، شهر، سنة)
  const initialHijri = useMemo(() => {
    if (values.birthDateHijri) {
      const parts = values.birthDateHijri.split(/[/ -]/);
      if (parts.length === 3) {
        return {
          year: parseInt(parts[0], 10) || 1420,
          month: parseInt(parts[1], 10) || 1,
          day: parseInt(parts[2], 10) || 1
        };
      }
    }
    return { year: 1420, month: 1, day: 1 };
  }, [values.birthDateHijri]);

  const [hijriDay, setHijriDay] = useState<number>(initialHijri.day);
  const [hijriMonth, setHijriMonth] = useState<number>(initialHijri.month);
  const [hijriYear, setHijriYear] = useState<number>(initialHijri.year);

  // البحث في الجنسيات
  const [nationalitySearch, setNationalitySearch] = useState("");
  // البحث في المدن
  const [citySearch, setCitySearch] = useState("");

  // مصفوفة السنوات الهجرية المسموح بها (من 1350 هـ إلى السنة الحالية 1447 هـ)
  const hijriYearsList = useMemo(() => {
    const list: number[] = [];
    for (let y = 1447; y >= 1350; y--) {
      list.push(y);
    }
    return list;
  }, []);

  // قائمة الأيام الهجرية (1 - 30)
  const hijriDaysList = useMemo(() => {
    const list: number[] = [];
    for (let d = 1; d <= 30; d++) {
      list.push(d);
    }
    return list;
  }, []);

  // تحديث الحسابات عند تغيير التاريخ الهجري
  const handleHijriChange = (newDay: number, newMonth: number, newYear: number) => {
    setHijriDay(newDay);
    setHijriMonth(newMonth);
    setHijriYear(newYear);

    const converted = hijriToGregorian(newYear, newMonth, newDay);
    const mm = String(newMonth).padStart(2, '0');
    const dd = String(newDay).padStart(2, '0');
    const hijriDateStr = `${newYear}/${mm}/${dd}`;

    const calculatedAge = calculateAge(converted.isoDate, 'hijri', newYear);

    onChange({
      birthCalendarType: 'hijri',
      birthDate: converted.isoDate,
      birthDateHijri: hijriDateStr,
      age: calculatedAge
    });
  };

  // معالجة تغيير التاريخ الميلادي
  const handleGregorianChange = (gregorianDateStr: string) => {
    if (!gregorianDateStr) {
      onChange({
        birthCalendarType: 'gregorian',
        birthDate: "",
        birthDateHijri: "",
        age: 0
      });
      return;
    }

    const parts = gregorianDateStr.split('-');
    if (parts.length === 3) {
      const gYear = parseInt(parts[0], 10);
      const gMonth = parseInt(parts[1], 10);
      const gDay = parseInt(parts[2], 10);
      const hConverted = gregorianToHijri(gYear, gMonth, gDay);
      const calculatedAge = calculateAge(gregorianDateStr, 'gregorian');

      setHijriDay(hConverted.hDay);
      setHijriMonth(hConverted.hMonth);
      setHijriYear(hConverted.hYear);

      onChange({
        birthCalendarType: 'gregorian',
        birthDate: gregorianDateStr,
        birthDateHijri: hConverted.hijriDateStr,
        age: calculatedAge
      });
    }
  };

  // قائمة الأحياء للمدينة المختارة
  const selectedCityData = useMemo(() => {
    return MAKKAH_REGION_CITIES.find(c => c.name === values.city) || MAKKAH_REGION_CITIES[0];
  }, [values.city]);

  // قائمة الجنسيات المفلترة
  const filteredNationalities = useMemo(() => {
    if (!nationalitySearch.trim()) return NATIONALITIES_LIST;
    return NATIONALITIES_LIST.filter(n => n.includes(nationalitySearch.trim()));
  }, [nationalitySearch]);

  // اليوم الميلادي الأقصى المسموح به لمنع اختيار تواريخ مستقبلية
  const maxGregorianDate = useMemo(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }, []);

  return (
    <div className="space-y-4 text-right" dir="rtl">
      
      {/* ---------------------------------------------------------------------- */}
      {/* 1. تاريخ الميلاد ونوع التقويم (هجري أو ميلادي) */}
      {/* ---------------------------------------------------------------------- */}
      <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2.5">
          <label className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <CalendarIcon className="w-4 h-4 text-emerald-600" />
            <span>1. تاريخ الميلاد ونوع التقويم <span className="text-rose-500">*</span></span>
          </label>

          {/* محدد نوع التقويم: هجري أو ميلادي */}
          <div className="inline-flex p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl text-xs font-bold">
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                if (values.birthCalendarType !== 'hijri') {
                  const converted = hijriToGregorian(hijriYear, hijriMonth, hijriDay);
                  const mm = String(hijriMonth).padStart(2, '0');
                  const dd = String(hijriDay).padStart(2, '0');
                  onChange({
                    birthCalendarType: 'hijri',
                    birthDate: converted.isoDate,
                    birthDateHijri: `${hijriYear}/${mm}/${dd}`,
                    age: calculateAge(converted.isoDate, 'hijri', hijriYear)
                  });
                }
              }}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                values.birthCalendarType === 'hijri'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              🌙 تقويم هجري
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                if (values.birthCalendarType !== 'gregorian') {
                  const defaultIso = values.birthDate || "2000-01-01";
                  onChange({
                    birthCalendarType: 'gregorian',
                    birthDate: defaultIso,
                    age: calculateAge(defaultIso, 'gregorian')
                  });
                }
              }}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                values.birthCalendarType === 'gregorian'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              ☀️ تقويم ميلادي
            </button>
          </div>
        </div>

        {/* منتقي التاريخ بناءً على نوع التقويم */}
        {values.birthCalendarType === 'hijri' ? (
          <div className="space-y-2">
            <span className="text-[11px] text-slate-500 block">اختر اليوم والشهر والسنة الهجرية:</span>
            <div className="grid grid-cols-3 gap-2">
              {/* اليوم */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">اليوم</label>
                <select
                  disabled={disabled}
                  value={hijriDay}
                  onChange={(e) => handleHijriChange(parseInt(e.target.value, 10), hijriMonth, hijriYear)}
                  className="w-full px-2.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {hijriDaysList.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* الشهر */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">الشهر الهجري</label>
                <select
                  disabled={disabled}
                  value={hijriMonth}
                  onChange={(e) => handleHijriChange(hijriDay, parseInt(e.target.value, 10), hijriYear)}
                  className="w-full px-2 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {HIJRI_MONTHS.map(m => (
                    <option key={m.id} value={m.id}>{m.id}. {m.name}</option>
                  ))}
                </select>
              </div>

              {/* السنة */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">السنة الهجرية</label>
                <select
                  disabled={disabled}
                  value={hijriYear}
                  onChange={(e) => handleHijriChange(hijriDay, hijriMonth, parseInt(e.target.value, 10))}
                  className="w-full px-2 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {hijriYearsList.map(y => (
                    <option key={y} value={y}>{y} هـ</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
              اختر تاريخ الميلاد الميلادي (يُمنع اختيار تاريخ مستقبلي):
            </label>
            <input
              type="date"
              disabled={disabled}
              max={maxGregorianDate}
              value={values.birthDate || ""}
              onChange={(e) => handleGregorianChange(e.target.value)}
              className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>
        )}

        {/* عرض العمر وتاريخ الميلاد المحول */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-slate-600 dark:text-slate-300">
              التاريخ المعتمد: <strong>{values.birthCalendarType === 'hijri' ? (values.birthDateHijri || `${hijriYear}/${hijriMonth}/${hijriDay} هـ`) : values.birthDate}</strong>
              {values.birthCalendarType === 'hijri' && values.birthDate && (
                <span className="text-slate-400 text-[11px] mr-1.5">(الموافق: {values.birthDate} م)</span>
              )}
            </span>
          </div>

          <div className="font-bold text-emerald-800 dark:text-emerald-300 bg-white dark:bg-slate-800 px-3 py-1 rounded-lg border border-emerald-200 dark:border-emerald-700 shadow-xs">
            العمر المحسوب: <span className="font-mono text-sm text-emerald-600 dark:text-emerald-400">{values.age || 0}</span> سنة
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* 2. صفة المستفيد & 3. الجنسية */}
      {/* ---------------------------------------------------------------------- */}
      <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        <label className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5 border-b border-slate-200/80 dark:border-slate-800 pb-2.5">
          <UserCheck className="w-4 h-4 text-emerald-600" />
          <span>2. صفة المستفيد وحالة الجنسية والإقامة <span className="text-rose-500">*</span></span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* حقل صفة المستفيد */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              صفة المستفيد <span className="text-rose-500">*</span>
            </label>
            <select
              disabled={disabled}
              value={values.residencyStatus}
              onChange={(e) => {
                const newStatus = e.target.value as ResidencyStatus;
                const newNat = newStatus === 'مواطن سعودي' ? 'سعودي' : (values.nationality === 'سعودي' ? 'يمني' : values.nationality);
                onChange({
                  residencyStatus: newStatus,
                  nationality: newNat
                });
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500"
              required
            >
              {RESIDENCY_STATUS_OPTIONS.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {RESIDENCY_STATUS_OPTIONS.find(o => o.id === values.residencyStatus)?.desc}
            </span>
          </div>

          {/* حقل الجنسية التفاعلي */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              الجنسية <span className="text-rose-500">*</span>
            </label>

            {values.residencyStatus === 'مواطن سعودي' ? (
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <span className="flex items-center gap-1.5">
                  <span>🇸🇦</span>
                  <span>سعودي</span>
                </span>
                <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md">
                  <Lock className="w-3 h-3" />
                  <span>محدد تلقائياً</span>
                </span>
              </div>
            ) : (
              <div className="space-y-1.5">
                <select
                  disabled={disabled}
                  value={values.nationality}
                  onChange={(e) => onChange({ nationality: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="">-- اختر الجنسية من القائمة المعتمدة --</option>
                  {filteredNationalities.map((nat) => (
                    <option key={nat} value={nat}>{nat}</option>
                  ))}
                </select>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="بحث سريع في قائمة الجنسيات..."
                    value={nationalitySearch}
                    onChange={(e) => setNationalitySearch(e.target.value)}
                    className="w-full pr-8 pl-3 py-1.5 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* تنبيه خاص بـ ابن/ابنة مواطنة سعودية */}
        {values.residencyStatus === 'ابن أو ابنة مواطنة سعودية' && (
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900 text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>ملاحظة إدارية:</strong> يلزم إرفاق صورة شهادة الميلاد وهوية الأم السعودية عند مراجعة الباحث الاجتماعي الميداني لإثبات الصفة نظامياً.
            </span>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* 4. المدينة والمحافظة & 5. الحي السكني */}
      {/* ---------------------------------------------------------------------- */}
      <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        <label className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5 border-b border-slate-200/80 dark:border-slate-800 pb-2.5">
          <MapPin className="w-4 h-4 text-emerald-600" />
          <span>3. الموقع الجغرافي (منطقة مكة المكرمة) <span className="text-rose-500">*</span></span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* المدينة / المحافظة */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              المدينة / المحافظة <span className="text-rose-500">*</span>
            </label>
            <select
              disabled={disabled}
              value={values.city}
              onChange={(e) => {
                const newCityName = e.target.value;
                const newCityObj = MAKKAH_REGION_CITIES.find(c => c.name === newCityName);
                // إعادة تعيين الحي تلقائياً عند تغيير المدينة لمنع تناقض البيانات
                const defaultDistrict = newCityObj?.districts[0] || OTHER_DISTRICT_OPTION;
                onChange({
                  city: newCityName,
                  district: defaultDistrict,
                  customDistrict: ""
                });
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500"
              required
            >
              {MAKKAH_REGION_CITIES.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
            <span className="text-[10px] text-slate-400 mt-1 block">محافظات ومراكز منطقة مكة المكرمة المعتمدة</span>
          </div>

          {/* الحي السكني التابع للمدينة */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              الحي السكني <span className="text-rose-500">*</span>
            </label>
            <select
              disabled={disabled}
              value={values.district}
              onChange={(e) => {
                const newDistrict = e.target.value;
                onChange({
                  district: newDistrict,
                  customDistrict: newDistrict === OTHER_DISTRICT_OPTION ? (values.customDistrict || "") : ""
                });
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500"
              required
            >
              {selectedCityData.districts.map((dist) => (
                <option key={dist} value={dist}>{dist}</option>
              ))}
              <option value={OTHER_DISTRICT_OPTION}>-- {OTHER_DISTRICT_OPTION} --</option>
            </select>
            <span className="text-[10px] text-slate-400 mt-1 block">الأحياء المعتمدة رسمياً لـ ({values.city})</span>
          </div>
        </div>

        {/* حقل إدخال اسم الحي المخصص في حال اختيار "أخرى / الحي غير موجود" */}
        {values.district === OTHER_DISTRICT_OPTION && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 space-y-1.5 animate-fade-in">
            <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-200">
              يرجى كتابة اسم الحي أو المخطط السكني (يُحفظ للمراجعة الإدارية): <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              disabled={disabled}
              required
              value={values.customDistrict || ""}
              onChange={(e) => onChange({ customDistrict: e.target.value })}
              placeholder="مثال: مخطط ولي العهد، وادي عمير، العسيلة مخطط 5..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-amber-500"
            />
            <span className="text-[10px] text-amber-700 dark:text-amber-300 block">
              سيتم حفظ هذا الحي لتدقيق الباحث الاجتماعي دون إضافته التلقائية للقوائم العامة.
            </span>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* 6. الحالة الاجتماعية & 7. صفة اليتم (حقلان مستقلان تماماً) */}
      {/* ---------------------------------------------------------------------- */}
      <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        <label className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5 border-b border-slate-200/80 dark:border-slate-800 pb-2.5">
          <Heart className="w-4 h-4 text-emerald-600" />
          <span>4. الحالة الاجتماعية وصفة اليتم <span className="text-rose-500">*</span></span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* الحالة الاجتماعية */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              الحالة الاجتماعية <span className="text-rose-500">*</span>
            </label>
            <select
              disabled={disabled}
              value={values.maritalStatus}
              onChange={(e) => onChange({ maritalStatus: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500"
              required
            >
              {MARITAL_STATUS_OPTIONS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
            <span className="text-[10px] text-slate-400 mt-1 block">تحديد الحالة الاجتماعية للمستفيد أو رب الأسرة</span>
          </div>

          {/* صفة اليتم (حقل منفصل تماماً) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              صفة اليتم (مستقل عن الحالة الاجتماعية) <span className="text-rose-500">*</span>
            </label>
            <select
              disabled={disabled}
              value={values.orphanStatus}
              onChange={(e) => onChange({ orphanStatus: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500"
              required
            >
              {ORPHAN_STATUS_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
            <span className="text-[10px] text-slate-400 mt-1 block">حقل مستقل لدقة التقارير والإحصائيات الإنسانية</span>
          </div>
        </div>
      </div>

    </div>
  );
};
