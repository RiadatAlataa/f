import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, UserCheck, Heart, UserX, Shield, Award, MapPin, 
  RefreshCw, Filter, CheckCircle2, AlertCircle, Clock, 
  Package, TrendingUp, X, Sparkles, Building2
} from 'lucide-react';
import { Beneficiary, AidDistribution, DistributionHandoverRecord } from '../types';
import { MAKKAH_REGION_CITIES, SAUDI_AND_GLOBAL_NATIONALITIES } from '../data/beneficiaryRegistryData';

interface BeneficiariesStatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  beneficiaries: Beneficiary[];
  distributions: AidDistribution[];
  handoverRecords: DistributionHandoverRecord[];
  currentUser?: any;
  lang?: 'ar' | 'en';
}

export const BeneficiariesStatisticsModal: React.FC<BeneficiariesStatisticsModalProps> = ({
  isOpen,
  onClose,
  beneficiaries = [],
  distributions = [],
  handoverRecords = [],
  currentUser,
  lang = 'ar'
}) => {
  // Filter States
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [selectedNationality, setSelectedNationality] = useState<string>('all');
  const [selectedMaritalStatus, setSelectedMaritalStatus] = useState<string>('all');
  const [selectedOrphanStatus, setSelectedOrphanStatus] = useState<string>('all');

  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const [apiStats, setApiStats] = useState<any>(null);

  // Fetch real statistics from Backend PostgreSQL / API
  const fetchStatistics = async () => {
    setIsLoadingApi(true);
    try {
      const queryParams = new URLSearchParams();
      if (selectedCity !== 'all') queryParams.append('city', selectedCity);
      if (selectedDistrict !== 'all') queryParams.append('district', selectedDistrict);
      if (selectedNationality !== 'all') queryParams.append('nationality', selectedNationality);
      if (selectedMaritalStatus !== 'all') queryParams.append('maritalStatus', selectedMaritalStatus);
      if (selectedOrphanStatus !== 'all') queryParams.append('orphanStatus', selectedOrphanStatus);

      const res = await fetch(`/api/db/beneficiaries/statistics?${queryParams.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setApiStats(json.summary);
        }
      }
    } catch (e) {
      console.warn("Failed fetching live stats from API, using client DB fallback", e);
    } finally {
      setIsLoadingApi(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatistics();
    }
  }, [isOpen, selectedCity, selectedDistrict, selectedNationality, selectedMaritalStatus, selectedOrphanStatus]);

  // Compute live from props if API response not loaded yet
  const computedStats = useMemo(() => {
    if (apiStats) return apiStats;

    const filtered = beneficiaries.filter((b) => {
      if (selectedCity !== 'all') {
        const bCity = (b.city || "").toLowerCase();
        if (!bCity.includes(selectedCity.toLowerCase()) && !b.address?.includes(selectedCity)) return false;
      }
      if (selectedDistrict !== 'all') {
        const bDist = (b.district || b.customDistrict || "").toLowerCase();
        if (!bDist.includes(selectedDistrict.toLowerCase()) && !b.address?.includes(selectedDistrict)) return false;
      }
      if (selectedNationality !== 'all') {
        if ((b.nationality || "").trim() !== selectedNationality.trim()) return false;
      }
      if (selectedMaritalStatus !== 'all') {
        if ((b.maritalStatus || "").trim() !== selectedMaritalStatus.trim()) return false;
      }
      if (selectedOrphanStatus !== 'all') {
        if ((b.orphanStatus || "").trim() !== selectedOrphanStatus.trim()) return false;
      }
      return true;
    });

    const totalBeneficiaries = filtered.length;

    let marriedCount = 0;
    let singleCount = 0;
    let widowsCount = 0;
    let divorcedCount = 0;
    let orphansCount = 0;
    let citizensCount = 0;
    let residentsCount = 0;
    let childrenOfCitizensCount = 0;
    let activeCount = 0;
    let pendingCount = 0;

    const receivedSet = new Set<string>();
    handoverRecords.forEach(h => {
      if (h.beneficiaryId) receivedSet.add(h.beneficiaryId);
      if (h.nationalId) receivedSet.add(h.nationalId);
    });

    let receivedAidCount = 0;
    let notReceivedAidCount = 0;

    filtered.forEach(b => {
      const ms = (b.maritalStatus || "").trim();
      if (ms === 'متزوج' || ms === 'متزوجة') marriedCount++;
      else if (ms === 'أعزب' || ms === 'عزباء') singleCount++;
      else if (ms === 'أرمل' || ms === 'أرملة') widowsCount++;
      else if (ms === 'مطلق' || ms === 'مطلقة') divorcedCount++;
      else marriedCount++;

      if (b.orphanStatus === 'يتيم' || b.orphanStatus === 'يتيمة') orphansCount++;

      const rs = (b.residencyStatus || (b.nationalId?.startsWith('1') ? 'مواطن سعودي' : 'مقيم')).trim();
      if (rs === 'مواطن سعودي') citizensCount++;
      else if (rs === 'مقيم') residentsCount++;
      else if (rs.includes('مواطنة')) childrenOfCitizensCount++;
      else if (b.nationalId?.startsWith('1')) citizensCount++;
      else residentsCount++;

      if (b.status === 'approved') activeCount++;
      else if (b.status === 'pending') pendingCount++;

      const hasReceived = receivedSet.has(b.id) || (b.nationalId && receivedSet.has(b.nationalId));
      if (hasReceived) receivedAidCount++;
      else notReceivedAidCount++;
    });

    const totalDistributions = distributions.length;
    const completedDistributions = distributions.filter(d => d.workflowStatus === 'completed' || d.status === 'completed').length;
    const pendingDistributions = totalDistributions - completedDistributions;

    return {
      totalBeneficiaries,
      socialStatus: {
        total: totalBeneficiaries,
        married: marriedCount,
        single: singleCount,
        widows: widowsCount,
        divorced: divorcedCount,
        orphans: orphansCount
      },
      residencyStatus: {
        citizens: citizensCount,
        residents: residentsCount,
        childrenOfCitizens: childrenOfCitizensCount
      },
      additionalStats: {
        active: activeCount,
        pending: pendingCount,
        receivedAid: receivedAidCount,
        notReceivedAid: notReceivedAidCount,
        totalDistributions,
        completedDistributions,
        pendingDistributions
      }
    };
  }, [apiStats, beneficiaries, distributions, handoverRecords, selectedCity, selectedDistrict, selectedNationality, selectedMaritalStatus, selectedOrphanStatus]);

  // Available districts based on selected city
  const availableDistricts = useMemo(() => {
    if (selectedCity === 'all') {
      const allD = new Set<string>();
      MAKKAH_REGION_CITIES.forEach(c => c.districts.forEach(d => allD.add(d)));
      return Array.from(allD);
    }
    const found = MAKKAH_REGION_CITIES.find(c => c.name === selectedCity);
    return found ? found.districts : [];
  }, [selectedCity]);

  const resetFilters = () => {
    setSelectedCity('all');
    setSelectedDistrict('all');
    setSelectedNationality('all');
    setSelectedMaritalStatus('all');
    setSelectedOrphanStatus('all');
  };

  const isFiltered = (
    selectedCity !== 'all' ||
    selectedDistrict !== 'all' ||
    selectedNationality !== 'all' ||
    selectedMaritalStatus !== 'all' ||
    selectedOrphanStatus !== 'all'
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div 
        dir="rtl"
        className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              <TrendingUp className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black">إحصائيات وتقارير المستفيدين المباشرة</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 border border-white/25">
                  PostgreSQL Live
                </span>
              </div>
              <p className="text-xs text-emerald-100/80 mt-0.5 font-medium">
                مستخرجة مباشرة من قاعدة البيانات مع الفرز المتقاطع، وتحديث فوري للرعاية والتوزيعات
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchStatistics}
              disabled={isLoadingApi}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
              title="تحديث البيانات الآن"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingApi ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
              title="إغلاق النافذة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="p-4 bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-700/60 shrink-0">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-700 dark:text-neutral-300">
              <Filter className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>تصفية الإحصائيات حسب المعايير المعتمدة:</span>
            </div>
            {isFiltered && (
              <button
                onClick={resetFilters}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 cursor-pointer underline"
              >
                إلغاء جميع الفلاتر
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs">
            {/* City Filter */}
            <div>
              <label className="block text-[10.5px] font-bold text-neutral-500 mb-1">المدينة / المحافظة:</label>
              <select
                value={selectedCity}
                onChange={(e) => {
                  setSelectedCity(e.target.value);
                  setSelectedDistrict('all');
                }}
                className="w-full p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="all">كافة المدن والمحافظات</option>
                {MAKKAH_REGION_CITIES.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* District Filter */}
            <div>
              <label className="block text-[10.5px] font-bold text-neutral-500 mb-1">الحي السكني:</label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="all">كافة الأحياء</option>
                {availableDistricts.map((d, idx) => (
                  <option key={idx} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Nationality Filter */}
            <div>
              <label className="block text-[10.5px] font-bold text-neutral-500 mb-1">الجنسية:</label>
              <select
                value={selectedNationality}
                onChange={(e) => setSelectedNationality(e.target.value)}
                className="w-full p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="all">كافة الجنسيات</option>
                <option value="سعودي">سعودي</option>
                {SAUDI_AND_GLOBAL_NATIONALITIES.filter(n => n !== 'سعودي').map((nat, i) => (
                  <option key={i} value={nat}>{nat}</option>
                ))}
              </select>
            </div>

            {/* Marital Status Filter */}
            <div>
              <label className="block text-[10.5px] font-bold text-neutral-500 mb-1">الحالة الاجتماعية:</label>
              <select
                value={selectedMaritalStatus}
                onChange={(e) => setSelectedMaritalStatus(e.target.value)}
                className="w-full p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="all">كافة الحالات</option>
                <option value="متزوج">متزوج / متزوجة</option>
                <option value="أعزب">أعزب / عزباء</option>
                <option value="أرمل">أرمل / أرملة</option>
                <option value="مطلق">مطلق / مطلقة</option>
              </select>
            </div>

            {/* Orphan Status Filter */}
            <div>
              <label className="block text-[10.5px] font-bold text-neutral-500 mb-1">صفة اليتم:</label>
              <select
                value={selectedOrphanStatus}
                onChange={(e) => setSelectedOrphanStatus(e.target.value)}
                className="w-full p-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="all">الكل (يتيم وغير يتيم)</option>
                <option value="يتيم">يتيم / يتيمة فقط</option>
                <option value="غير ذلك / لا ينطبق">غير يتيم (لا ينطبق)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto">
          {/* SECTION 1: SOCIAL STATUS BREAKDOWN */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-black text-neutral-900 dark:text-white">
                  أولاً: توزيع المستفيدين حسب الحالة الاجتماعية وصفة اليتم
                </h3>
              </div>
              <span className="text-[11px] text-neutral-500 font-medium">
                (اليتم صفة مستقلة عن الحالة الاجتماعية)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Total */}
              <div className="p-4 rounded-2xl bg-neutral-900 text-white shadow-xs">
                <span className="text-[11px] text-neutral-400 block font-medium">إجمالي المستفيدين</span>
                <span className="text-2xl font-black font-mono mt-1 block">
                  {computedStats.socialStatus?.total || 0}
                </span>
                <span className="text-[10px] text-emerald-400 mt-1 block font-bold">100% من النطاق</span>
              </div>

              {/* Married */}
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 shadow-xs">
                <span className="text-[11px] text-blue-700 dark:text-blue-300 block font-medium">المتزوجون والمتزوجات</span>
                <span className="text-2xl font-black font-mono text-blue-900 dark:text-blue-200 mt-1 block">
                  {computedStats.socialStatus?.married || 0}
                </span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 block">
                  {computedStats.socialStatus?.total ? Math.round(((computedStats.socialStatus.married || 0) / computedStats.socialStatus.total) * 100) : 0}%
                </span>
              </div>

              {/* Singles */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 shadow-xs">
                <span className="text-[11px] text-slate-700 dark:text-slate-300 block font-medium">العزاب والعازبات</span>
                <span className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100 mt-1 block">
                  {computedStats.socialStatus?.single || 0}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                  {computedStats.socialStatus?.total ? Math.round(((computedStats.socialStatus.single || 0) / computedStats.socialStatus.total) * 100) : 0}%
                </span>
              </div>

              {/* Widows */}
              <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 shadow-xs">
                <span className="text-[11px] text-purple-700 dark:text-purple-300 block font-medium">الأرامل</span>
                <span className="text-2xl font-black font-mono text-purple-900 dark:text-purple-200 mt-1 block">
                  {computedStats.socialStatus?.widows || 0}
                </span>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 mt-1 block">
                  {computedStats.socialStatus?.total ? Math.round(((computedStats.socialStatus.widows || 0) / computedStats.socialStatus.total) * 100) : 0}%
                </span>
              </div>

              {/* Divorced */}
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 shadow-xs">
                <span className="text-[11px] text-amber-700 dark:text-amber-300 block font-medium">المطلقون والمطلقات</span>
                <span className="text-2xl font-black font-mono text-amber-900 dark:text-amber-200 mt-1 block">
                  {computedStats.socialStatus?.divorced || 0}
                </span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 block">
                  {computedStats.socialStatus?.total ? Math.round(((computedStats.socialStatus.divorced || 0) / computedStats.socialStatus.total) * 100) : 0}%
                </span>
              </div>

              {/* Orphans (Independent Card) */}
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800 shadow-xs relative">
                <div className="absolute top-2.5 left-2.5">
                  <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                </div>
                <span className="text-[11px] text-rose-800 dark:text-rose-300 block font-bold">الأيتام واليتيمات</span>
                <span className="text-2xl font-black font-mono text-rose-900 dark:text-rose-100 mt-1 block">
                  {computedStats.socialStatus?.orphans || 0}
                </span>
                <span className="text-[10px] text-rose-700 dark:text-rose-400 mt-1 block font-bold">
                  صفة مستقلة
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2: BENEFICIARY RESIDENCY STATUS */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <h3 className="text-sm font-black text-neutral-900 dark:text-white">
                ثانياً: توزيع المستفيدين حسب صفة المستفيد
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Saudi Citizens */}
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 block">
                    مواطنون سعوديون
                  </span>
                  <span className="text-2xl font-black font-mono text-emerald-950 dark:text-emerald-100 mt-0.5 block">
                    {computedStats.residencyStatus?.citizens || 0}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                  {computedStats.socialStatus?.total ? Math.round(((computedStats.residencyStatus?.citizens || 0) / computedStats.socialStatus.total) * 100) : 0}%
                </div>
              </div>

              {/* Residents */}
              <div className="p-4 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/60 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-cyan-800 dark:text-cyan-300 block">
                    مقيمون نظاميون
                  </span>
                  <span className="text-2xl font-black font-mono text-cyan-950 dark:text-cyan-100 mt-0.5 block">
                    {computedStats.residencyStatus?.residents || 0}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-cyan-100 dark:bg-cyan-900/60 flex items-center justify-center text-cyan-700 dark:text-cyan-300 font-bold text-xs">
                  {computedStats.socialStatus?.total ? Math.round(((computedStats.residencyStatus?.residents || 0) / computedStats.socialStatus.total) * 100) : 0}%
                </div>
              </div>

              {/* Children of Saudi Citizens */}
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 block">
                    أبناء وبنات مواطنات سعوديات
                  </span>
                  <span className="text-2xl font-black font-mono text-indigo-950 dark:text-indigo-100 mt-0.5 block">
                    {computedStats.residencyStatus?.childrenOfCitizens || 0}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                  {computedStats.socialStatus?.total ? Math.round(((computedStats.residencyStatus?.childrenOfCitizens || 0) / computedStats.socialStatus.total) * 100) : 0}%
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: ADDITIONAL STATS (AID HANDOVERS & DISTRIBUTIONS) */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-black text-neutral-900 dark:text-white">
                ثالثاً: حالة الملفات ومؤشرات استلام المساعدات وعمليات التوزيع
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Active */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
                <span className="text-[10.5px] text-emerald-700 dark:text-emerald-400 block font-medium">مستفيدون نشطون (معتمد)</span>
                <span className="text-xl font-black font-mono text-emerald-900 dark:text-emerald-200 mt-1 block">
                  {computedStats.additionalStats?.active || 0}
                </span>
              </div>

              {/* Pending */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
                <span className="text-[10.5px] text-amber-700 dark:text-amber-400 block font-medium">قيد البحث والمراجعة</span>
                <span className="text-xl font-black font-mono text-amber-900 dark:text-amber-200 mt-1 block">
                  {computedStats.additionalStats?.pending || 0}
                </span>
              </div>

              {/* Received Aid */}
              <div className="p-3.5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/50">
                <span className="text-[10.5px] text-teal-700 dark:text-teal-400 block font-medium">استلموا مساعدات</span>
                <span className="text-xl font-black font-mono text-teal-900 dark:text-teal-200 mt-1 block">
                  {computedStats.additionalStats?.receivedAid || 0}
                </span>
              </div>

              {/* Not Received Aid */}
              <div className="p-3.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50">
                <span className="text-[10.5px] text-rose-700 dark:text-rose-400 block font-medium">لم يستلموا بعد</span>
                <span className="text-xl font-black font-mono text-rose-900 dark:text-rose-200 mt-1 block">
                  {computedStats.additionalStats?.notReceivedAid || 0}
                </span>
              </div>

              {/* Total Distributions */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[10.5px] text-slate-700 dark:text-slate-300 block font-medium">إجمالي التوزيعات</span>
                <span className="text-xl font-black font-mono text-slate-900 dark:text-slate-100 mt-1 block">
                  {computedStats.additionalStats?.totalDistributions || 0}
                </span>
              </div>

              {/* Completed Distributions */}
              <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50">
                <span className="text-[10.5px] text-blue-700 dark:text-blue-400 block font-medium">توزيعات مكتملة</span>
                <span className="text-xl font-black font-mono text-blue-900 dark:text-blue-200 mt-1 block">
                  {computedStats.additionalStats?.completedDistributions || 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-neutral-50 dark:bg-neutral-800/80 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-neutral-500">
            مصدر البيانات: <strong className="text-neutral-700 dark:text-neutral-300">نظام إدارة المستفيدين والمخزون الموحد</strong> (خالٍ من التكرار)
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-neutral-900 hover:bg-black text-white transition-all cursor-pointer shadow-xs"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
