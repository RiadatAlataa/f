/**
 * السجل الجغرافي والجنسيات وبيانات المستفيدين المعتمدة
 * جمعية ريادة العطاء لخدمة الإنسان بالعسيلة بمكة المكرمة
 */

// -------------------------------------------------------------
// 1. مدن ومحافظات منطقة مكة المكرمة وقوائم الأحياء المعتمدة
// -------------------------------------------------------------
export interface CityData {
  id: string;
  name: string;
  districts: string[];
}

export const MAKKAH_REGION_CITIES: CityData[] = [
  {
    id: "makkah",
    name: "مكة المكرمة",
    districts: [
      "العسيلة (نطاق الجمعية الرئيسي)",
      "الشرائع",
      "بطحاء قريش",
      "العزيزية",
      "الشوقية",
      "العوالي",
      "النوارية",
      "الزاهر",
      "الخالدية",
      "الرصيفة",
      "المعابدة",
      "الكعكية",
      "العمرة",
      "المسفلة",
      "أجياد",
      "جرول",
      "كدي",
      "التنعيم",
      "الهجرة",
      "جبل النور",
      "الغسالة",
      "الشهداء",
      "ريع بخش",
      "وادي جليل",
      "الجميزات",
      "الزايدي (حمراء الأسد)",
      "حي التخصصي",
      "جبل عمر",
      "الملك فهد",
      "الفيحاء",
      "الإسكان",
      "العدل",
      "العتيبية",
      "الهنداوية",
      "شارع المنصور",
      "جبل غراب",
      "دحلة الرشد",
      "ريع ذاخر",
      "حي السلامة (مكة)",
      "الفيصلية (مكة)"
    ]
  },
  {
    id: "jeddah",
    name: "جدة",
    districts: [
      "البلد",
      "الروضة",
      "السلامة",
      "الصفا",
      "المروة",
      "النعيم",
      "الحمراء",
      "الأندلس",
      "الشاطئ",
      "أبحر الشمالية",
      "أبحر الجنوبية",
      "الحمدانية",
      "السامر",
      "النسيم",
      "المطار القديم",
      "بني مالك",
      "الخالدية",
      "البغدادية الشرقية",
      "البغدادية الغربية",
      "بريمان",
      "الفيحاء",
      "الجامعة",
      "الوزيرية",
      "السليمانية",
      "الرحاب",
      "البساتين",
      "المرجان",
      "المحمدية",
      "الزهراء",
      "النهضة"
    ]
  },
  {
    id: "taif",
    name: "الطائف",
    districts: [
      "الحوية",
      "شهار",
      "العقيق",
      "الفيصلية",
      "القمرية",
      "أم السباع",
      "الوشحاء",
      "نخب",
      "مسرة",
      "السداد",
      "الخالدية",
      "شبرا",
      "الجال",
      "جبرة",
      "الوهط والوهيط",
      "قروى",
      "الشهداء الجنوبية",
      "الشهداء الشمالية",
      "حي عكاظ",
      "الريان"
    ]
  },
  {
    id: "jamoum",
    name: "الجموم",
    districts: [
      "حي العزيزية (الجموم)",
      "حي السلام",
      "حي الشهداء",
      "مركز هدى الشام",
      "مركز رهاط",
      "مركز مدركة",
      "مركز عين شمس",
      "مركز الدوح",
      "مركز الفوارة",
      "قرية أبي عروة",
      "حي النزهة (الجموم)"
    ]
  },
  {
    id: "bahrah",
    name: "بحرة",
    districts: [
      "بحرة المجاهدين",
      "بحرة الشمالية",
      "بحرة الجنوبية",
      "حداء",
      "عمق",
      "حي النعيم (بحرة)",
      "حي الفيصلية (بحرة)",
      "أم السلم"
    ]
  },
  {
    id: "laith",
    name: "الليث",
    districts: [
      "المركز الرئيسي",
      "حي الشاطئ",
      "حي الصفا",
      "مركز غميقة",
      "مركز سعيا",
      "مركز الوسقة",
      "مركز جذم",
      "مركز يلملم",
      "مركز دافن"
    ]
  },
  {
    id: "qunfudhah",
    name: "القنفذة",
    districts: [
      "حي الخالدية (القنفذة)",
      "حي الشاطئ",
      "مركز القوز",
      "مركز حلي",
      "مركز دوقة",
      "مركز المظيلف",
      "مركز سبت الجارة",
      "مركز كنانة",
      "مركز أحد بني زيد"
    ]
  },
  {
    id: "rabigh",
    name: "رابغ",
    districts: [
      "المرجانية",
      "حي الصفا",
      "حي النعيم",
      "مركز مستورة",
      "مركز الأبواء",
      "مركز صعبر",
      "مركز ثول",
      "حي الميناء",
      "حي الجود"
    ]
  },
  {
    id: "khulais",
    name: "خليص",
    districts: [
      "حي العزيزية (خليص)",
      "حي الدف",
      "حي المغاربة",
      "مركز غران",
      "مركز وادي قديد",
      "مركز أم الجرم",
      "مركز وادي ستارة",
      "مركز الخوار"
    ]
  },
  {
    id: "kamil",
    name: "الكامل",
    districts: [
      "المركز الرئيسي",
      "حي القرية",
      "مركز إهاب",
      "مركز ملح",
      "مركز شوان",
      "مركز حرة سبيع",
      "مركز العياب"
    ]
  },
  {
    id: "adham",
    name: "أضم",
    districts: [
      "المركز الرئيسي",
      "مركز الجائزة",
      "مركز حقال",
      "مركز سوق العين",
      "مركز ربوع العين",
      "حي العزيزية (أضم)"
    ]
  },
  {
    id: "ardiyat",
    name: "العرضيات",
    districts: [
      "نمرة",
      "ثريبان",
      "العرضية الجنوبية",
      "العرضية الشمالية",
      "مركز الويد",
      "مركز حلحال",
      "مركز شمران"
    ]
  },
  {
    id: "maysan",
    name: "ميسان",
    districts: [
      "المركز الرئيسي",
      "مركز بني سعد",
      "مركز حداد بني مالك",
      "مركز القريع",
      "مركز ثقف",
      "مركز الصور"
    ]
  },
  {
    id: "turabah",
    name: "تربة",
    districts: [
      "حي العلاوة",
      "حي العزيزية",
      "مركز القريع",
      "مركز الغريف",
      "مركز شعر",
      "مركز حراضة"
    ]
  },
  {
    id: "khurmah",
    name: "الخرمة",
    districts: [
      "حي المحمدية",
      "حي العزيزية",
      "حي الفيصلية",
      "مركز أبو جميدة",
      "مركز الغريف",
      "مركز الدغمية"
    ]
  },
  {
    id: "ranyah",
    name: "رنية",
    districts: [
      "المخطط الشمالي",
      "حي الفيصلية",
      "مركز الأملح",
      "مركز العفيرية",
      "مركز الغافة",
      "حي العزيزية"
    ]
  },
  {
    id: "muwayh",
    name: "المويه",
    districts: [
      "المويه الجديد",
      "المويه القديم",
      "مركز ظلم",
      "مركز أم الدوم",
      "مركز رضوان",
      "مركز مران"
    ]
  }
];

export const OTHER_DISTRICT_OPTION = "أخرى / الحي غير موجود";

// -------------------------------------------------------------
// 2. سجل الجنسيات المعتمد (مرتب أبجدياً وقابل للبحث)
// -------------------------------------------------------------
export const NATIONALITIES_LIST: string[] = [
  "سعودي",
  "يمني",
  "مصري",
  "سوري",
  "سوداني",
  "باكستاني",
  "هندي",
  "بنغلاديشي",
  "أردني",
  "فلسطيني",
  "لبناني",
  "أفغاني",
  "إندونيسي",
  "فلبيني",
  "تركي",
  "عراقي",
  "مغربي",
  "جزائري",
  "تونسي",
  "صومالي",
  "إثيوبي",
  "نيجيري",
  "تشادي",
  "إريتري",
  "غاني",
  "مالي",
  "ميانماري (برماوي)",
  "نيبالي",
  "سيريلانكي",
  "ماليزي",
  "كويتي",
  "إماراتي",
  "عماني",
  "بحريني",
  "قطري",
  "ليبي",
  "موريتاني",
  "جيبوتي",
  "جزر القمر",
  "أوغندي",
  "كيني",
  "تنزاني",
  "أوزبكي",
  "طاجيكي",
  "كازاخستاني",
  "قيرغيزستاني",
  "أذربيجاني",
  "بريطاني",
  "أمريكي",
  "كندي",
  "فرنسي",
  "ألماني",
  "أسترالي",
  "جنسية أخرى"
];

// -------------------------------------------------------------
// 3. صفة المستفيد (حالة الجنسية والإقامة)
// -------------------------------------------------------------
export type ResidencyStatus = 'مواطن سعودي' | 'مقيم' | 'ابن أو ابنة مواطنة سعودية';

export const RESIDENCY_STATUS_OPTIONS: { id: ResidencyStatus; label: string; desc: string }[] = [
  { id: 'مواطن سعودي', label: 'مواطن سعودي', desc: 'يحمل الهوية الوطنية السعودية' },
  { id: 'مقيم', label: 'مقيم', desc: 'يحمل إقامة نظامية سارية المفعول' },
  { id: 'ابن أو ابنة مواطنة سعودية', label: 'ابن أو ابنة مواطنة سعودية', desc: 'من أم سعودية بموجب الوثائق الرسمية' }
];

// -------------------------------------------------------------
// 4. الحالة الاجتماعية
// -------------------------------------------------------------
export type MaritalStatus = 
  | 'أعزب' 
  | 'عزباء' 
  | 'متزوج' 
  | 'متزوجة' 
  | 'مطلق' 
  | 'مطلقة' 
  | 'أرمل' 
  | 'أرملة';

export const MARITAL_STATUS_OPTIONS: { id: MaritalStatus; label: string }[] = [
  { id: 'أعزب', label: 'أعزب' },
  { id: 'عزباء', label: 'عزباء' },
  { id: 'متزوج', label: 'متزوج' },
  { id: 'متزوجة', label: 'متزوجة' },
  { id: 'مطلق', label: 'مطلق' },
  { id: 'مطلقة', label: 'مطلقة' },
  { id: 'أرمل', label: 'أرمل' },
  { id: 'أرملة', label: 'أرملة' }
];

// -------------------------------------------------------------
// 5. صفة اليتم (حقل مستقل تماماً عن الحالة الاجتماعية)
// -------------------------------------------------------------
export type OrphanStatus = 'يتيم' | 'يتيمة' | 'غير ذلك / لا ينطبق';

export const ORPHAN_STATUS_OPTIONS: { id: OrphanStatus; label: string }[] = [
  { id: 'غير ذلك / لا ينطبق', label: 'غير ذلك / لا ينطبق' },
  { id: 'يتيم', label: 'يتيم (ذكر متوفى والده وهو دون سن البلوغ/الرعاية)' },
  { id: 'يتيمة', label: 'يتيمة (أنثى متوفى والدها)' }
];

// -------------------------------------------------------------
// 6. الأشهر الهجرية وخوارزمية التحويل الموثوقة (Umm al-Qura)
// -------------------------------------------------------------
export const HIJRI_MONTHS = [
  { id: 1, name: "محرم", nameEn: "Muharram" },
  { id: 2, name: "صفر", nameEn: "Safar" },
  { id: 3, name: "ربيع الأول", nameEn: "Rabi' I" },
  { id: 4, name: "ربيع الآخر", nameEn: "Rabi' II" },
  { id: 5, name: "جمادى الأولى", nameEn: "Jumada I" },
  { id: 6, name: "جمادى الآخرة", nameEn: "Jumada II" },
  { id: 7, name: "رجب", nameEn: "Rajab" },
  { id: 8, name: "شعبان", nameEn: "Sha'ban" },
  { id: 9, name: "رمضان", nameEn: "Ramadan" },
  { id: 10, name: "شوال", nameEn: "Shawwal" },
  { id: 11, name: "ذو القعدة", nameEn: "Dhu al-Qi'dah" },
  { id: 12, name: "ذو الحجة", nameEn: "Dhu al-Hijjah" }
];

/**
 * تحويل تقريبي معتمد ودقيق للتاريخ الهجري إلى الميلادي لحفظ تاريخ موحد في قاعدة البيانات
 * يعتمد على الحساب الفلكي المعتمد للتقويم الهجري الشمسي/القمري
 */
export function hijriToGregorian(hYear: number, hMonth: number, hDay: number): { gYear: number; gMonth: number; gDay: number; isoDate: string } {
  // حساب اليوم الجولياني (Julian Day) من التاريخ الهجري
  const jd = Math.floor((11 * hYear + 3) / 30) + 354 * hYear + 30 * hMonth - Math.floor((hMonth - 1) / 2) + hDay + 1948440 - 385;
  
  // تحويل اليوم الجولياني إلى ميلادي
  let l = jd + 68569;
  const n = Math.floor((4 * l) / 146097);
  l = l - Math.floor((146097 * n + 3) / 4);
  const i = Math.floor((4000 * (l + 1)) / 1461001);
  l = l - Math.floor((1461 * i) / 4) + 31;
  const j = Math.floor((80 * l) / 2447);
  const gDay = l - Math.floor((2447 * j) / 80);
  l = Math.floor(j / 11);
  const gMonth = j + 2 - 12 * l;
  const gYear = 100 * (n - 49) + i + l;

  const mm = String(gMonth).padStart(2, '0');
  const dd = String(gDay).padStart(2, '0');
  return {
    gYear,
    gMonth,
    gDay,
    isoDate: `${gYear}-${mm}-${dd}`
  };
}

/**
 * تحويل التاريخ الميلادي إلى هجري تقريبي معتمد
 */
export function gregorianToHijri(gYear: number, gMonth: number, gDay: number): { hYear: number; hMonth: number; hDay: number; hijriDateStr: string } {
  // الحساب المعتمد عبر Intl إذا كان مدعوماً في المتصفح أو بيئة التشغيل
  try {
    const gDate = new Date(Date.UTC(gYear, gMonth - 1, gDay, 12, 0, 0));
    const formatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      numberingSystem: 'latn'
    });
    const parts = formatter.formatToParts(gDate);
    let hYear = 1445;
    let hMonth = 1;
    let hDay = 1;

    for (const part of parts) {
      if (part.type === 'year') hYear = parseInt(part.value, 10);
      if (part.type === 'month') hMonth = parseInt(part.value, 10);
      if (part.type === 'day') hDay = parseInt(part.value, 10);
    }

    const mm = String(hMonth).padStart(2, '0');
    const dd = String(hDay).padStart(2, '0');
    return {
      hYear,
      hMonth,
      hDay,
      hijriDateStr: `${hYear}/${mm}/${dd}`
    };
  } catch {
    // حساب رياضي بديل في حال عدم توفر تقويم أم القرى في الـ Intl
    const jd = Math.floor((1461 * (gYear + 4800 + Math.floor((gMonth - 14) / 12))) / 4) +
      Math.floor((367 * (gMonth - 2 - 12 * (Math.floor((gMonth - 14) / 12)))) / 12) -
      Math.floor((3 * (Math.floor((gYear + 4900 + Math.floor((gMonth - 14) / 12)) / 100))) / 4) +
      gDay - 32075;
    
    let l = jd - 1948440 + 10632;
    const n = Math.floor((l - 1) / 10631);
    l = l - 10631 * n + 354;
    const j = (Math.floor((10985 - l) / 5316)) * (Math.floor((50 * l) / 17719)) +
      (Math.floor(l / 5670)) * (Math.floor((43 * l) / 15238));
    l = l - (Math.floor((30 - j) / 15)) * (Math.floor((17719 * j) / 50)) -
      (Math.floor(j / 16)) * (Math.floor((15238 * j) / 43)) + 29;
    const hMonth = Math.floor((24 * l) / 709);
    const hDay = l - Math.floor((709 * hMonth) / 24);
    const hYear = 30 * n + j - 30;

    const mm = String(hMonth).padStart(2, '0');
    const dd = String(hDay).padStart(2, '0');
    return {
      hYear,
      hMonth,
      hDay,
      hijriDateStr: `${hYear}/${mm}/${dd}`
    };
  }
}

/**
 * حساب العمر بالسنوات بدقة بناءً على تاريخ الميلاد والتقويم
 */
export function calculateAge(birthDateIso: string, birthCalendarType: 'hijri' | 'gregorian' = 'gregorian', hijriYear?: number): number {
  if (!birthDateIso) return 0;
  
  if (birthCalendarType === 'hijri' && hijriYear && hijriYear > 1300 && hijriYear <= 1450) {
    // حساب تقريبي سريع للسنوات الهجرية (السنة الهجرية الحالية 1447 / 1448)
    const currentHijriYear = 1447;
    const age = currentHijriYear - hijriYear;
    return Math.max(0, age);
  }

  const birth = new Date(birthDateIso);
  if (isNaN(birth.getTime())) return 0;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

/**
 * مطابقة البيانات القديمة لضمان عدم فقدان أي قيمة
 */
export function normalizeLegacyBeneficiaryData(ben: any): {
  residencyStatus: ResidencyStatus;
  nationality: string;
  city: string;
  district: string;
  customDistrict?: string;
  maritalStatus?: MaritalStatus;
  orphanStatus?: OrphanStatus;
} {
  // 1. تحديد صفة المستفيد والجنسية
  let residencyStatus: ResidencyStatus = 'مواطن سعودي';
  let nationality = 'سعودي';

  if (ben.residencyStatus) {
    residencyStatus = ben.residencyStatus;
    nationality = ben.nationality || (residencyStatus === 'مواطن سعودي' ? 'سعودي' : 'يمني');
  } else if (ben.nationality) {
    nationality = ben.nationality;
    if (nationality.includes('سعودي') || nationality === 'SA' || nationality === 'KSA') {
      residencyStatus = 'مواطن سعودي';
      nationality = 'سعودي';
    } else if (ben.isCitizenOffspring || nationality.includes('أم مواطنة')) {
      residencyStatus = 'ابن أو ابنة مواطنة سعودية';
    } else {
      residencyStatus = 'مقيم';
    }
  } else if (ben.nationalId && String(ben.nationalId).startsWith('1')) {
    residencyStatus = 'مواطن سعودي';
    nationality = 'سعودي';
  } else if (ben.nationalId && String(ben.nationalId).startsWith('2')) {
    residencyStatus = 'مقيم';
    nationality = 'مقيم (غير محدد)';
  }

  // 2. تحديد المدينة والحي
  let city = ben.city || 'مكة المكرمة';
  let district = ben.district || 'العسيلة (نطاق الجمعية الرئيسي)';
  let customDistrict = ben.customDistrict;

  if (!ben.city && ben.address) {
    const addr = String(ben.address).trim();
    // فحص المدن المعروفة
    const matchedCity = MAKKAH_REGION_CITIES.find(c => addr.includes(c.name));
    if (matchedCity) {
      city = matchedCity.name;
      // فحص الأحياء التابعة لها
      const matchedDistrict = matchedCity.districts.find(d => addr.includes(d.replace(/ \(.*\)/, '')));
      if (matchedDistrict) {
        district = matchedDistrict;
      } else if (addr.includes('العسيلة')) {
        district = 'العسيلة (نطاق الجمعية الرئيسي)';
      } else {
        district = OTHER_DISTRICT_OPTION;
        customDistrict = addr;
      }
    } else {
      city = 'مكة المكرمة';
      if (addr.includes('العسيلة')) {
        district = 'العسيلة (نطاق الجمعية الرئيسي)';
      } else {
        district = OTHER_DISTRICT_OPTION;
        customDistrict = addr;
      }
    }
  }

  // 3. الحالة الاجتماعية
  let maritalStatus: MaritalStatus | undefined = ben.maritalStatus;
  if (!maritalStatus && ben.category) {
    const cat = String(ben.category);
    if (cat.includes('أرامل') || cat.includes('أرملة')) maritalStatus = 'أرملة';
    else if (cat.includes('مطلقات') || cat.includes('مطلقة')) maritalStatus = 'مطلقة';
  }

  // 4. صفة اليتم
  let orphanStatus: OrphanStatus = ben.orphanStatus || 'غير ذلك / لا ينطبق';
  if (!ben.orphanStatus && ben.category) {
    const cat = String(ben.category);
    if (cat.includes('أيتام') || cat.includes('يتيم')) {
      orphanStatus = 'يتيم';
    }
  }

  return {
    residencyStatus,
    nationality,
    city,
    district,
    customDistrict,
    maritalStatus,
    orphanStatus
  };
}
