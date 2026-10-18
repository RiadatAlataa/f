import React, { useState, useMemo } from 'react';
import { 
  Package, Users, Filter, CheckCircle2, AlertTriangle, 
  Search, X, Calendar, MapPin, Clock, FileText, 
  Layers, ArrowRight, ShieldCheck, CheckSquare, Square,
  Building2, Sparkles, Send, Save
} from 'lucide-react';
import { Beneficiary, AidDistribution, DistributionWorkflowStatus } from '../types';
import { MAKKAH_REGION_CITIES, SAUDI_AND_GLOBAL_NATIONALITIES } from '../data/beneficiaryRegistryData';

interface CreateAidDistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  beneficiaries: Beneficiary[];
  inventoryItems?: any[];
  currentUser?: any;
  onSuccess?: (newDistribution: AidDistribution) => void;
  lang?: 'ar' | 'en';
}

export const CreateAidDistributionModal: React.FC<CreateAidDistributionModalProps> = ({
  isOpen,
  onClose,
  beneficiaries = [],
  inventoryItems = [],
  currentUser = { name: "أ. مريم الغامدي", role: "department_admin" },
  onSuccess,
  lang = 'ar'
}) => {
  // Step 1: Basic Information
  const [title, setTitle] = useState('');
  const [aidType, setAidType] = useState('food_basket');
  const [aidTypeLabel, setAidTypeLabel] = useState('سلال ومساعدات غذائية');
  const [selectedInventoryItemId, setSelectedInventoryItemId] = useState<string>('');
  const [unitQuantityPerBeneficiary, setUnitQuantityPerBeneficiary] = useState<number>(1);
  const [distributionDate, setDistributionDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [pickupLocation, setPickupLocation] = useState('المستودع الرئيسي - مخطط العسيلة');
  const [pickupAppointment, setPickupAppointment] = useState('من الساعة 9:00 صباحاً وحتى 3:00 مساءً');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  // Step 2: Distribution Mode (All Eligible, Category Multi-Filters, or Manual Pick)
  const [distributionMode, setDistributionMode] = useState<'category_match' | 'manual_selection' | 'all_eligible'>('category_match');

  // Multi-Filter Options (Category Match)
  const [filterLogic, setFilterLogic] = useState<'AND' | 'OR'>('AND');
  const [selectedMaritalStatuses, setSelectedMaritalStatuses] = useState<string[]>([]);
  const [selectedOrphanStatuses, setSelectedOrphanStatuses] = useState<string[]>([]);
  const [selectedResidencyStatuses, setSelectedResidencyStatuses] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [selectedNationality, setSelectedNationality] = useState<string>('all');

  // Excluded Beneficiaries (Can uncheck in category match or all eligible)
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

  // Manual Selection Mode
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  const [manuallySelectedIds, setManuallySelectedIds] = useState<Set<string>>(new Set());

  // Submission States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selected inventory item details
  const selectedInventoryItem = useMemo(() => {
    return inventoryItems.find(itm => itm.id === selectedInventoryItemId) || null;
  }, [inventoryItems, selectedInventoryItemId]);

  const availableStock = useMemo(() => {
    if (!selectedInventoryItem) return null;
    const cur = Number(selectedInventoryItem.currentQty) || 0;
    const res = Number(selectedInventoryItem.reservedQty) || 0;
    return Math.max(0, cur - res);
  }, [selectedInventoryItem]);

  // Compute matched beneficiaries for Category Filter mode
  const categoryMatchedBeneficiaries = useMemo(() => {
    return beneficiaries.filter((b) => {
      // Must be approved / active
      if (b.status !== 'approved') return false;

      const hasCriteria = (
        selectedMaritalStatuses.length > 0 ||
        selectedOrphanStatuses.length > 0 ||
        selectedResidencyStatuses.length > 0 ||
        selectedCity !== 'all' ||
        selectedDistrict !== 'all' ||
        selectedNationality !== 'all'
      );

      if (!hasCriteria) return true;

      const conds: boolean[] = [];

      if (selectedMaritalStatuses.length > 0) {
        conds.push(selectedMaritalStatuses.includes(b.maritalStatus || ''));
      }
      if (selectedOrphanStatuses.length > 0) {
        conds.push(selectedOrphanStatuses.includes(b.orphanStatus || ''));
      }
      if (selectedResidencyStatuses.length > 0) {
        const rs = b.residencyStatus || (b.nationalId?.startsWith('1') ? 'مواطن سعودي' : 'مقيم');
        conds.push(selectedResidencyStatuses.includes(rs));
      }
      if (selectedCity !== 'all') {
        conds.push(b.city === selectedCity || (b.address && b.address.includes(selectedCity)));
      }
      if (selectedDistrict !== 'all') {
        const d = b.district === 'أخرى / الحي غير موجود' && b.customDistrict ? b.customDistrict : b.district;
        conds.push(d === selectedDistrict || (b.address && b.address.includes(selectedDistrict)));
      }
      if (selectedNationality !== 'all') {
        conds.push(b.nationality === selectedNationality);
      }

      if (conds.length === 0) return true;

      if (filterLogic === 'OR') {
        return conds.some(Boolean);
      } else {
        return conds.every(Boolean);
      }
    });
  }, [beneficiaries, selectedMaritalStatuses, selectedOrphanStatuses, selectedResidencyStatuses, selectedCity, selectedDistrict, selectedNationality, filterLogic]);

  // Compute final effective beneficiaries based on mode
  const finalTargetedBeneficiaries = useMemo(() => {
    if (distributionMode === 'manual_selection') {
      return beneficiaries.filter(b => manuallySelectedIds.has(b.id));
    }
    if (distributionMode === 'all_eligible') {
      return beneficiaries.filter(b => b.status === 'approved' && !excludedIds.has(b.id));
    }
    // Category match
    return categoryMatchedBeneficiaries.filter(b => !excludedIds.has(b.id));
  }, [distributionMode, beneficiaries, manuallySelectedIds, categoryMatchedBeneficiaries, excludedIds]);

  const targetCount = finalTargetedBeneficiaries.length;
  const totalRequiredQuantity = targetCount * (Number(unitQuantityPerBeneficiary) || 1);

  // Toggle exclusion in list
  const toggleExclusion = (benId: string) => {
    setExcludedIds(prev => {
      const next = new Set(prev);
      if (next.has(benId)) {
        next.delete(benId);
      } else {
        next.add(benId);
      }
      return next;
    });
  };

  // Toggle manual selection
  const toggleManualSelection = (benId: string) => {
    setManuallySelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(benId)) {
        next.delete(benId);
      } else {
        next.add(benId);
      }
      return next;
    });
  };

  // Filter for manual picker
  const manualFilteredList = useMemo(() => {
    if (!manualSearchQuery.trim()) return beneficiaries.filter(b => b.status === 'approved');
    const q = manualSearchQuery.trim().toLowerCase();
    return beneficiaries.filter(b => 
      b.name.toLowerCase().includes(q) ||
      (b.nationalId && b.nationalId.includes(q)) ||
      (b.beneficiaryNumber && b.beneficiaryNumber.toLowerCase().includes(q)) ||
      (b.barcodeId && b.barcodeId.toLowerCase().includes(q))
    );
  }, [beneficiaries, manualSearchQuery]);

  // Available districts for city
  const cityDistricts = useMemo(() => {
    if (selectedCity === 'all') return [];
    const found = MAKKAH_REGION_CITIES.find(c => c.name === selectedCity);
    return found ? found.districts : [];
  }, [selectedCity]);

  // Submit Handler
  const handleSubmit = async (targetWorkflowStatus: DistributionWorkflowStatus) => {
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage("يرجى إدخال اسم المبادرة أو عملية التوزيع.");
      return;
    }

    if (targetCount === 0 && targetWorkflowStatus !== 'draft') {
      setErrorMessage("يجب تحديد مستفيد واحد على الأقل لإرسال طلب التوزيع.");
      return;
    }

    if (availableStock !== null && targetWorkflowStatus !== 'draft') {
      if (totalRequiredQuantity > availableStock) {
        setErrorMessage(`الكمية المطلوبة (${totalRequiredQuantity}) تتجاوز الرصيد المتاح بالمستودع (${availableStock}). يرجى تقليل الكمية أو تعديل المستفيدين.`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const payload = {
        title: title.trim(),
        aidType,
        aidTypeLabel,
        description,
        inventoryItemId: selectedInventoryItemId || undefined,
        unitQuantityPerBeneficiary: Number(unitQuantityPerBeneficiary) || 1,
        distributionDate,
        pickupLocation,
        pickupAppointment,
        notes,
        distributionMode,
        filterLogic,
        criteria: {
          maritalStatuses: selectedMaritalStatuses,
          orphanStatuses: selectedOrphanStatuses,
          residencyStatuses: selectedResidencyStatuses,
          cities: selectedCity !== 'all' ? [selectedCity] : [],
          districts: selectedDistrict !== 'all' ? [selectedDistrict] : [],
          nationalities: selectedNationality !== 'all' ? [selectedNationality] : []
        },
        targetedBeneficiaryIds: finalTargetedBeneficiaries.map(b => b.id),
        excludedBeneficiaryIds: Array.from(excludedIds),
        initialWorkflowStatus: targetWorkflowStatus,
        user: currentUser?.name || "مدير إدارة المستفيدين",
        userRole: currentUser?.role || "department_admin"
      };

      const res = await fetch("/api/db/distributions/create-advanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "فشل إنشاء عملية التوزيع.");
      }

      if (onSuccess) {
        onSuccess(data.distribution);
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "حدث خطأ أثناء حفظ وتوزيع المساعدة.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div 
        dir="rtl"
        className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[94vh]"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              <Package className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black">إنشاء عملية توزيع مساعدات جديدة</h2>
              <p className="text-xs text-emerald-100/80 mt-0.5">
                تخصيص المساعدات، الربط المباشر مع المخزون، وتحديد المستفيدين المستهدفين بدقة
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: BASIC DISTRIBUTION DETAILS */}
          <div className="bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/60 p-4 sm:p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-black text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>1. بيانات المبادرة ونوع المساعدة والمخزون</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Title */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  اسم المبادرة أو عملية التوزيع: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: سلال الخير الغذائية - رمضان 1448 أو كسوة عيد الأيتام"
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Aid Type */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  نوع المساعدة:
                </label>
                <select
                  value={aidType}
                  onChange={(e) => {
                    setAidType(e.target.value);
                    const labels: Record<string, string> = {
                      food_basket: "سلال ومساعدات غذائية",
                      clothing: "كسوة وملابس",
                      meals: "وجبات وإطعام",
                      water: "سقيا ماء",
                      financial: "مساعدة نقدية / كفالة",
                      medical: "أجهزة ومساعدات طبية",
                      school_supplies: "حقائب ومستلزمات دراسية",
                      other: "مساعدات عينية أخرى"
                    };
                    setAidTypeLabel(labels[e.target.value] || "مساعدات عينية");
                  }}
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="food_basket">سلال غذائية</option>
                  <option value="clothing">كسوة وملابس</option>
                  <option value="meals">وجبات غذائية ساخنة</option>
                  <option value="water">سقيا ماء</option>
                  <option value="financial">مساعدة نقدية</option>
                  <option value="medical">مساعدات طبية</option>
                  <option value="school_supplies">حقائب مدرسية</option>
                  <option value="other">أخرى</option>
                </select>
              </div>

              {/* Linked Inventory Item */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  الصنف المطلوب من المستودع (اختياري للربط الفوري):
                </label>
                <select
                  value={selectedInventoryItemId}
                  onChange={(e) => setSelectedInventoryItemId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">-- بدون ربط صنف مستودعي (مساعدة مباشرة) --</option>
                  {inventoryItems.map(itm => (
                    <option key={itm.id} value={itm.id}>
                      {itm.name} (المتاح: {Math.max(0, (Number(itm.currentQty) || 0) - (Number(itm.reservedQty) || 0))} {itm.unitOfMeasure || 'وحدة'})
                    </option>
                  ))}
                </select>
                {selectedInventoryItem && (
                  <div className="mt-1 text-[10.5px] font-bold text-emerald-700 dark:text-emerald-400">
                    الرصيد المتاح للحجز: {availableStock} {selectedInventoryItem.unitOfMeasure || 'وحدة'} | الباركود: {selectedInventoryItem.barcode}
                  </div>
                )}
              </div>

              {/* Quantity Per Beneficiary */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  الكمية المخصصة لكل مستفيد:
                </label>
                <input
                  type="number"
                  min="1"
                  value={unitQuantityPerBeneficiary}
                  onChange={(e) => setUnitQuantityPerBeneficiary(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Distribution Date */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  تاريخ التوزيع المقرر:
                </label>
                <input
                  type="date"
                  value={distributionDate}
                  onChange={(e) => setDistributionDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Pickup Location */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  مقر الاستلام:
                </label>
                <input
                  type="text"
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  placeholder="مثال: المستودع الخيري - العسيلة"
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Pickup Appointment */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  موعد وساعات الاستلام:
                </label>
                <input
                  type="text"
                  value={pickupAppointment}
                  onChange={(e) => setPickupAppointment(e.target.value)}
                  placeholder="مثال: يومياً من الساعة 9 صباحاً إلى 2 ظهراً"
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Notes */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  ملاحظات أو تعليمات خاصة لفرق الصرف والمستودع:
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="تعليمات خاصة لأمين المستودع حول التجهيز والتسليم..."
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>

          {/* STEP 2: TARGETING MODE TABS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>2. تحديد المستفيدين المستهدفين</span>
              </h3>
              <div className="text-[11px] font-bold text-neutral-500">
                المستفيدون المعتمدون المؤهلون: <strong className="text-emerald-700 dark:text-emerald-400">{beneficiaries.filter(b => b.status === 'approved').length}</strong>
              </div>
            </div>

            {/* Mode Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-2xl">
              {/* Option 1: Category Match */}
              <button
                type="button"
                onClick={() => setDistributionMode('category_match')}
                className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  distributionMode === 'category_match'
                    ? 'bg-white dark:bg-neutral-900 text-emerald-800 dark:text-emerald-300 shadow-sm border border-emerald-500/30'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>التوزيع حسب فئات المستفيدين</span>
              </button>

              {/* Option 2: Manual Selection */}
              <button
                type="button"
                onClick={() => setDistributionMode('manual_selection')}
                className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  distributionMode === 'manual_selection'
                    ? 'bg-white dark:bg-neutral-900 text-emerald-800 dark:text-emerald-300 shadow-sm border border-emerald-500/30'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>اختيار مستفيدين محددين (يدوي)</span>
              </button>

              {/* Option 3: All Eligible */}
              <button
                type="button"
                onClick={() => setDistributionMode('all_eligible')}
                className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  distributionMode === 'all_eligible'
                    ? 'bg-white dark:bg-neutral-900 text-emerald-800 dark:text-emerald-300 shadow-sm border border-emerald-500/30'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>التوزيع لجميع المستفيدين المؤهلين</span>
              </button>
            </div>

            {/* TAB CONTENT 1: CATEGORY MULTI-FILTER */}
            {distributionMode === 'category_match' && (
              <div className="p-4 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    حدد الفئات المستهدفة وخاصية المطابقة:
                  </div>

                  {/* AND / OR Switch */}
                  <div className="flex items-center gap-2 p-1 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs">
                    <button
                      type="button"
                      onClick={() => setFilterLogic('AND')}
                      className={`px-3 py-1 rounded-lg font-black transition-all cursor-pointer ${
                        filterLogic === 'AND'
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      مطابقة جميع الشروط (AND)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterLogic('OR')}
                      className={`px-3 py-1 rounded-lg font-black transition-all cursor-pointer ${
                        filterLogic === 'OR'
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      مطابقة أي شرط (OR)
                    </button>
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  {/* Marital Status */}
                  <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-1.5">
                    <span className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">الحالة الاجتماعية:</span>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      {[
                        { id: 'أرمل', label: 'الأرامل' },
                        { id: 'مطلق', label: 'المطلقات والمطلقين' },
                        { id: 'متزوج', label: 'المتزوجون' },
                        { id: 'أعزب', label: 'العزاب والعازبات' }
                      ].map(item => {
                        const checked = selectedMaritalStatuses.includes(item.id);
                        return (
                          <label key={item.id} className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setSelectedMaritalStatuses(prev => 
                                  checked ? prev.filter(x => x !== item.id) : [...prev, item.id]
                                );
                              }}
                              className="w-3.5 h-3.5 text-emerald-600 rounded"
                            />
                            <span>{item.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Orphan Status */}
                  <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-1.5">
                    <span className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">صفة اليتم:</span>
                    <div className="space-y-1 text-[11px]">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedOrphanStatuses.includes('يتيم')}
                          onChange={() => {
                            setSelectedOrphanStatuses(prev => 
                              prev.includes('يتيم') ? [] : ['يتيم', 'يتيمة']
                            );
                          }}
                          className="w-3.5 h-3.5 text-rose-600 rounded"
                        />
                        <span className="font-bold text-rose-800 dark:text-rose-300">الأيتام واليتيمات فقط</span>
                      </label>
                    </div>
                  </div>

                  {/* Residency Status */}
                  <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-1.5">
                    <span className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">صفة المستفيد:</span>
                    <div className="space-y-1 text-[11px]">
                      {[
                        { id: 'مواطن سعودي', label: 'مواطنون سعوديون' },
                        { id: 'مقيم', label: 'مقيمون' },
                        { id: 'ابن أو ابنة مواطنة سعودية', label: 'أبناء وبنات مواطنات' }
                      ].map(item => {
                        const checked = selectedResidencyStatuses.includes(item.id);
                        return (
                          <label key={item.id} className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setSelectedResidencyStatuses(prev => 
                                  checked ? prev.filter(x => x !== item.id) : [...prev, item.id]
                                );
                              }}
                              className="w-3.5 h-3.5 text-emerald-600 rounded"
                            />
                            <span>{item.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Geographic Filters */}
                  <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-2 sm:col-span-2 lg:col-span-3">
                    <span className="font-bold text-neutral-700 dark:text-neutral-300 block">النطاق الجغرافي والجنسية:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] text-neutral-500 mb-0.5">المدينة / المحافظة:</label>
                        <select
                          value={selectedCity}
                          onChange={(e) => {
                            setSelectedCity(e.target.value);
                            setSelectedDistrict('all');
                          }}
                          className="w-full p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-bold"
                        >
                          <option value="all">كافة المدن</option>
                          {MAKKAH_REGION_CITIES.map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-neutral-500 mb-0.5">الحي السكني:</label>
                        <select
                          value={selectedDistrict}
                          onChange={(e) => setSelectedDistrict(e.target.value)}
                          className="w-full p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs"
                        >
                          <option value="all">كافة الأحياء</option>
                          {cityDistricts.map((d, i) => (
                            <option key={i} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-neutral-500 mb-0.5">الجنسية المحددة:</label>
                        <select
                          value={selectedNationality}
                          onChange={(e) => setSelectedNationality(e.target.value)}
                          className="w-full p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs"
                        >
                          <option value="all">كافة الجنسيات</option>
                          <option value="سعودي">سعودي</option>
                          {SAUDI_AND_GLOBAL_NATIONALITIES.filter(n => n !== 'سعودي').map((nat, i) => (
                            <option key={i} value={nat}>{nat}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: MANUAL SEARCH & PICK */}
            {distributionMode === 'manual_selection' && (
              <div className="p-4 bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/60 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    ابحث بالاسم أو رقم الملف / الهوية وحدد المستفيدين المخصصين (مثل أحمد، فاطمة، نورة):
                  </div>
                  <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300">
                    تم تحديد {manuallySelectedIds.size} مستفيد
                  </span>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-3" />
                  <input
                    type="text"
                    value={manualSearchQuery}
                    onChange={(e) => setManualSearchQuery(e.target.value)}
                    placeholder="ابحث بالاسم الكامل، رقم الهوية الوطنية، أو رقم المستفيد..."
                    className="w-full pr-9 pl-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  {manualFilteredList.length === 0 ? (
                    <div className="p-4 text-center text-xs text-neutral-400">
                      لا يوجد مستفيدون يطابقون البحث.
                    </div>
                  ) : (
                    manualFilteredList.map(ben => {
                      const selected = manuallySelectedIds.has(ben.id);
                      return (
                        <div 
                          key={ben.id} 
                          onClick={() => toggleManualSelection(ben.id)}
                          className={`p-2.5 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                            selected ? 'bg-blue-50/70 dark:bg-blue-950/40 font-bold' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {selected ? (
                              <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-neutral-300 shrink-0" />
                            )}
                            <div>
                              <span className="text-neutral-900 dark:text-neutral-100 block">{ben.name}</span>
                              <span className="text-[10px] text-neutral-400 font-mono">
                                {ben.nationalId} | {ben.beneficiaryNumber || 'BEN-0000'} | {ben.city || 'مكة'} - {ben.district || 'العسيلة'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <span className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600">
                              {ben.maritalStatus || 'متزوج'}
                            </span>
                            {ben.orphanStatus === 'يتيم' && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 font-bold">
                                يتيم
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: ALL ELIGIBLE WARNING & CONFIRMATION */}
            {distributionMode === 'all_eligible' && (
              <div className="p-4 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black text-amber-900 dark:text-amber-200">
                      التوزيع الشامل لجميع المستفيدين المؤهلين المعتمدين في النظام
                    </h4>
                    <p className="text-[11.5px] text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                      يشمل هذا النمط إدراج جميع المستفيدين الذين حالتهم «معتمد نشط» في قائمة التوزيع الموحدة.
                      العدد الإجمالي المؤهل: <strong>{beneficiaries.filter(b => b.status === 'approved').length} مستفيد</strong>.
                      إجمالي الكمية المطلوبة: <strong>{beneficiaries.filter(b => b.status === 'approved').length * unitQuantityPerBeneficiary} وحدة</strong>.
                      لن يتم خصم المخزون فوراً بل يمر الطلب بمراحل الاعتماد والصرف للمستودع.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* RECIPIENTS PREVIEW TABLE & MANUAL EXCLUSION */}
            <div className="border border-neutral-200 dark:border-neutral-700 rounded-2xl overflow-hidden bg-white dark:bg-neutral-900">
              <div className="p-3 bg-neutral-100/80 dark:bg-neutral-800 text-xs font-bold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    قائمة المستفيدين المعتمدين للتوزيع ({targetCount} مستفيد)
                  </span>
                </div>
                {excludedIds.size > 0 && (
                  <span className="text-[11px] text-rose-600 font-bold">
                    (تم استبعاد {excludedIds.size} يدويًا)
                  </span>
                )}
              </div>

              <div className="max-h-48 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
                {finalTargetedBeneficiaries.length === 0 ? (
                  <div className="p-6 text-center text-xs text-neutral-400">
                    لا يوجد أي مستفيد مطابق للمعايير المحددة حاليًا.
                  </div>
                ) : (
                  finalTargetedBeneficiaries.map((ben, idx) => (
                    <div key={ben.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-neutral-400 w-6 text-center text-[10px]">{idx + 1}</span>
                        <div>
                          <strong className="text-neutral-900 dark:text-neutral-100 block">{ben.name}</strong>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            {ben.nationalId} | {ben.city || 'مكة'} - {ben.district || 'العسيلة'} | {ben.residencyStatus || 'مواطن'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-neutral-500 font-bold">
                          {unitQuantityPerBeneficiary} {selectedInventoryItem?.unitOfMeasure || 'طرد'}
                        </span>
                        {distributionMode !== 'manual_selection' && (
                          <button
                            type="button"
                            onClick={() => toggleExclusion(ben.id)}
                            className="px-2 py-1 rounded-md text-[10px] text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer"
                            title="استبعاد هذا المستفيد من هذه التوزيعة"
                          >
                            استبعاد
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer with Action Buttons */}
        <div className="p-4 sm:p-5 bg-neutral-50 dark:bg-neutral-800/80 border-t border-neutral-200 dark:border-neutral-700 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-neutral-600 dark:text-neutral-300">
            إجمالي المستفيدين: <strong className="font-mono text-emerald-700 dark:text-emerald-400">{targetCount}</strong> | 
            إجمالي الكميات: <strong className="font-mono text-emerald-700 dark:text-emerald-400">{totalRequiredQuantity}</strong>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-700 transition-all cursor-pointer"
            >
              إلغاء
            </button>

            {/* Save as Draft */}
            <button
              type="button"
              disabled={isSubmitting || !title.trim()}
              onClick={() => handleSubmit('draft')}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100 hover:bg-neutral-300 transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>حفظ كمسودة</span>
            </button>

            {/* Submit Pending Approval */}
            <button
              type="button"
              disabled={isSubmitting || targetCount === 0 || !title.trim()}
              onClick={() => handleSubmit('pending_approval')}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>إرسال للاعتماد</span>
            </button>

            {/* Approve and Dispatch Directly to Warehouse */}
            <button
              type="button"
              disabled={isSubmitting || targetCount === 0 || !title.trim()}
              onClick={() => handleSubmit('dispatched_to_warehouse')}
              className="px-5 py-2.5 rounded-xl text-xs font-black bg-emerald-700 hover:bg-emerald-800 text-white shadow-md transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>اعتماد وإحالة إلى المستودع</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
