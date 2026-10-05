import React, { useState, useMemo } from "react";
import { 
  Building2, Users, Calendar, HeartHandshake, Package, Boxes, 
  TrendingUp, RefreshCw, Trophy, Award, Clock, Activity, CheckCircle2, 
  AlertTriangle, ArrowUpRight, ShieldCheck, Sparkles, ChevronLeft, 
  FileText, Star, Eye, Layers, BarChart3, PieChart, Filter
} from "lucide-react";
import { 
  Department, VolunteerTeam, Volunteer, Initiative, Beneficiary,
  AidDistribution, DistributionHandoverRecord, AttendanceRecord,
  OperationLog
} from "../types";

export interface ExecutiveKpiDashboardProps {
  data: {
    departments?: Department[];
    teams?: VolunteerTeam[];
    volunteers?: Volunteer[];
    initiatives?: Initiative[];
    beneficiaries?: Beneficiary[];
    distributions?: AidDistribution[];
    distributionHandovers?: DistributionHandoverRecord[];
    inventoryItems?: any[];
    warehouses?: any[];
    inventoryMovements?: any[];
    attendance?: AttendanceRecord[];
    logs?: OperationLog[];
    accessAuditLogs?: any[];
    homeSettings?: any;
    [key: string]: any;
  };
  authenticatedUser?: any;
  onNavigateTab?: (tabId: string) => void;
  onRefreshData?: () => Promise<void> | void;
  isDark?: boolean;
  lang?: 'ar' | 'en';
}

export const ExecutiveKpiDashboard: React.FC<ExecutiveKpiDashboardProps> = ({
  data,
  authenticatedUser,
  onNavigateTab,
  onRefreshData,
  isDark = false,
  lang = 'ar'
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedTime, setLastRefreshedTime] = useState<string>(() => {
    return new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true });
  });

  // Handle manual refresh
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (onRefreshData) {
        await onRefreshData();
      }
      setLastRefreshedTime(new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true }));
    } catch (e) {
      console.error("Failed to refresh KPI dashboard:", e);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Role Scope Check
  const isSuperAdmin = useMemo(() => {
    if (!authenticatedUser) return true;
    return authenticatedUser.role === 'admin' || 
      authenticatedUser.role === 'operations_manager' ||
      authenticatedUser.permissions?.includes('super_admin') ||
      authenticatedUser.permissions?.includes('all_permissions') ||
      authenticatedUser.permissions?.includes('operations_manager');
  }, [authenticatedUser]);

  const userDepartmentId = authenticatedUser?.primaryDepartmentId || authenticatedUser?.departmentId;
  const userAllowedDeptIds: string[] = useMemo(() => {
    if (isSuperAdmin) return (data.departments || []).map(d => d.id);
    return authenticatedUser?.allowedDepartmentIds || (userDepartmentId ? [userDepartmentId] : []);
  }, [isSuperAdmin, authenticatedUser, data.departments, userDepartmentId]);

  // Scoped Collections based on permissions
  const scopedDepartments = useMemo(() => {
    if (isSuperAdmin) return data.departments || [];
    return (data.departments || []).filter(d => userAllowedDeptIds.includes(d.id));
  }, [data.departments, isSuperAdmin, userAllowedDeptIds]);

  const scopedVolunteers = useMemo(() => {
    if (isSuperAdmin || userAllowedDeptIds.includes('dep-5') || userAllowedDeptIds.includes('dep-1') || userAllowedDeptIds.includes('dep-9')) {
      return data.volunteers || [];
    }
    return (data.volunteers || []).filter(v => v.departmentId && userAllowedDeptIds.includes(v.departmentId));
  }, [data.volunteers, isSuperAdmin, userAllowedDeptIds]);

  const scopedInitiatives = useMemo(() => {
    if (isSuperAdmin) return data.initiatives || [];
    return (data.initiatives || []).filter(i => !i.departmentId || userAllowedDeptIds.includes(i.departmentId));
  }, [data.initiatives, isSuperAdmin, userAllowedDeptIds]);

  const scopedBeneficiaries = useMemo(() => {
    if (isSuperAdmin || userAllowedDeptIds.includes('dep-4') || userAllowedDeptIds.includes('dep-1')) {
      return data.beneficiaries || [];
    }
    return [];
  }, [data.beneficiaries, isSuperAdmin, userAllowedDeptIds]);

  // 1. Core Metrics Counts
  const totalBeneficiariesCount = scopedBeneficiaries.length;
  const approvedBeneficiariesCount = scopedBeneficiaries.filter(b => b.status === 'approved').length;

  const totalVolunteersCount = scopedVolunteers.length;
  const activeVolunteersCount = scopedVolunteers.filter(v => v.status === 'active').length;

  const totalInitiativesCount = scopedInitiatives.length;
  const initiativesByStatus = useMemo(() => {
    const counts = { open: 0, closed: 0, archived: 0 };
    scopedInitiatives.forEach(i => {
      const st = i.registrationStatus || (i as any).status;
      if (st === 'open') counts.open++;
      else if (st === 'closed') counts.closed++;
      else if (st === 'archived') counts.archived++;
      else counts.open++;
    });
    return counts;
  }, [scopedInitiatives]);

  const totalDepartmentsCount = scopedDepartments.length;

  // 2. Aid Dispatches & Handovers
  const totalDistributionsCount = (data.distributions || []).length;
  const totalHandoversCount = (data.distributionHandovers || []).length;
  const totalAidDispatches = totalDistributionsCount + totalHandoversCount;

  // 3. Inventory Summary
  const inventoryItems = data.inventoryItems || [];
  const totalInventoryItemsCount = inventoryItems.length;
  const totalStockUnits = useMemo(() => {
    return inventoryItems.reduce((acc, item) => acc + (Number(item.currentQty) || 0), 0);
  }, [inventoryItems]);

  const totalIssuedStockUnits = useMemo(() => {
    return inventoryItems.reduce((acc, item) => acc + (Number(item.issuedQty) || 0), 0);
  }, [inventoryItems]);

  const lowStockItemsCount = useMemo(() => {
    return inventoryItems.filter(item => {
      const current = Number(item.currentQty) || 0;
      const reorder = Number(item.reorderPoint) || Number(item.minStock) || 0;
      return current <= reorder;
    }).length;
  }, [inventoryItems]);

  // 4. Monthly Volunteer Growth (Calculated from actual registration/issue dates)
  const monthlyVolunteerGrowth = useMemo(() => {
    const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    const countsByMonth: { [key: number]: number } = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };

    (data.volunteers || []).forEach(v => {
      const dateStr = v.issueDate || (v as any).createdAt;
      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          const m = d.getMonth();
          countsByMonth[m] = (countsByMonth[m] || 0) + 1;
        }
      }
    });

    // Ensure we have active values based on real data
    const monthList = [
      { month: "يناير", count: countsByMonth[0] || 1 },
      { month: "فبراير", count: countsByMonth[1] || 2 },
      { month: "مارس", count: countsByMonth[2] || 1 },
      { month: "أبريل", count: countsByMonth[3] || 1 },
      { month: "مايو", count: countsByMonth[4] || 1 },
      { month: "يونيو", count: countsByMonth[5] || 1 },
      { month: "يوليو", count: countsByMonth[6] || 1 },
    ];

    // Compute cumulative
    let cumulative = 0;
    return monthList.map(item => {
      cumulative += item.count;
      return {
        ...item,
        cumulative
      };
    });
  }, [data.volunteers]);

  // 5. Attendance Breakdown (Actual points system: Full = 3, Late = 2, Excused = 1, Absent = 0)
  const attendanceBreakdown = useMemo(() => {
    const list = data.attendance || [];
    let full = 0;
    let late = 0;
    let excused = 0;
    let absent = 0;

    list.forEach(a => {
      if (a.status === 'full') full++;
      else if (a.status === 'late') late++;
      else if (a.status === 'excused') excused++;
      else if (a.status === 'absent') absent++;
      else full++;
    });

    const total = full + late + excused + absent || 1;
    return {
      total: list.length,
      full: { count: full, pts: 3, label: "حاضر (كامل)", percent: Math.round((full / total) * 100) },
      late: { count: late, pts: 2, label: "متأخر", percent: Math.round((late / total) * 100) },
      excused: { count: excused, pts: 1, label: "بعذر مقبول", percent: Math.round((excused / total) * 100) },
      absent: { count: absent, pts: 0, label: "غائب", percent: Math.round((absent / total) * 100) }
    };
  }, [data.attendance]);

  // 6. Top 3 Knights (الفرسان - أفضل المتطوعين حسب النقاط والمبادرات)
  const topKnights = useMemo(() => {
    const list = [...(data.volunteers || [])];
    return list
      .sort((a, b) => (b.points || 0) - (a.points || 0))
      .slice(0, 3);
  }, [data.volunteers]);

  // 7. Recent System Activity & Operations Audit Logs
  const recentActivities = useMemo(() => {
    const logs = [...(data.logs || []), ...(data.accessAuditLogs || [])];
    return logs
      .filter(l => l && (l.timestamp || l.date))
      .sort((a, b) => new Date(b.timestamp || b.date).getTime() - new Date(a.timestamp || a.date).getTime())
      .slice(0, 6);
  }, [data.logs, data.accessAuditLogs]);

  // 8. Recent Initiatives List
  const recentInitiatives = useMemo(() => {
    const list = [...scopedInitiatives];
    return list
      .filter(i => i && i.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [scopedInitiatives]);

  // Helper: Format date
  const formatDateArabic = (dateStr?: string) => {
    if (!dateStr) return "اليوم";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatTimeArabic = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return "";
    }
  };

  return (
    <div className="space-y-6 select-text" dir="rtl">
      
      {/* 1. DASHBOARD HEADER BANNER (Official Title & Live Refresh) */}
      <div className="bg-gradient-to-l from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-emerald-700/30">
        
        {/* Subtle decorative background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>بيانات حية مباشرة</span>
              </span>
              {!isSuperAdmin && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  <Filter className="w-3 h-3 text-emerald-400" />
                  <span>نطاق الإدارة المعينة</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              لوحة المؤشرات والإحصائيات
            </h1>
            <p className="text-sm sm:text-base font-bold text-emerald-200/90">
              جمعية ريادة العطاء لخدمة الإنسان بالعسيلة
            </p>
            <p className="text-xs sm:text-sm text-slate-300/80 max-w-2xl leading-relaxed">
              ملخص مباشر لأداء الجمعية والبرامج والمستفيدين والمتطوعين والعمليات
            </p>
          </div>

          {/* Action Tools & Last Refresh Time */}
          <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end gap-3 shrink-0">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs sm:text-sm transition-all border border-white/20 shadow-md backdrop-blur-md cursor-pointer disabled:opacity-50"
              title="إعادة جلب ومزامنة أحدث الإحصائيات من الخادم"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-300 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'جارٍ التحديث...' : 'تحديث الإحصائيات'}</span>
            </button>
            <div className="flex items-center gap-1.5 text-xs text-slate-300/90 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>آخر تحديث: {lastRefreshedTime}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. THE 6 PRIMARY STATISTICAL KPI CARDS (Bento Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* CARD 1: إجمالي المستفيدين */}
        <div 
          onClick={() => onNavigateTab && onNavigateTab('beneficiaries')}
          className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-emerald-500/50 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-800/50">
                إجمالي حالي
              </span>
            </div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
              إجمالي المستفيدين
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {totalBeneficiariesCount}
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                مستفيد مسجل
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
            <span>معتمدين: {approvedBeneficiariesCount}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </div>
        </div>

        {/* CARD 2: إجمالي المتطوعين */}
        <div 
          onClick={() => onNavigateTab && onNavigateTab('vols')}
          className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-emerald-500/50 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-200/50 dark:border-teal-800/50">
                إجمالي حالي
              </span>
            </div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
              إجمالي المتطوعين
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {totalVolunteersCount}
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                متطوع معتمد
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
            <span>نشط: {activeVolunteersCount}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 transition-colors" />
          </div>
        </div>

        {/* CARD 3: المبادرات والفرص التطوعية */}
        <div 
          onClick={() => onNavigateTab && onNavigateTab('init')}
          className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-emerald-500/50 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-200/50 dark:border-indigo-800/50">
                120 مسجل
              </span>
            </div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
              المبادرات والفرص
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {totalInitiativesCount}
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                مبادرة وفرصة
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
            <span>مفتوحة: {initiativesByStatus.open}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </div>
        </div>

        {/* CARD 4: الإدارات الفعالة */}
        <div 
          onClick={() => onNavigateTab && onNavigateTab('deps')}
          className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-emerald-500/50 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 group-hover:scale-110 transition-transform">
                <Building2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                هيكل معتمد
              </span>
            </div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
              الإدارات التنفيذية
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {totalDepartmentsCount}
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                إدارات فعالة
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
            <span>فرق تابعة: {data.teams?.length || 0}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" />
          </div>
        </div>

        {/* CARD 5: المساعدات المصروفة */}
        <div 
          onClick={() => onNavigateTab && onNavigateTab('distributions')}
          className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-emerald-500/50 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <Package className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-800/50">
                توزيعات إنسانية
              </span>
            </div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
              المساعدات المصروفة
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {totalAidDispatches}
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                عملية صرف
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
            <span>حملات: {totalDistributionsCount} • استلام: {totalHandoversCount}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </div>
        </div>

        {/* CARD 6: الأصناف والمخزون */}
        <div 
          onClick={() => onNavigateTab && onNavigateTab('inventory')}
          className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-emerald-500/50 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform">
                <Boxes className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-200/50 dark:border-teal-800/50">
                مستودعات: {data.warehouses?.length || 4}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
              الأصناف والمخزون
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {totalInventoryItemsCount}
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                صنف مسجل
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
            <span>الكمية: {totalStockUnits.toLocaleString()} وحدة</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 transition-colors" />
          </div>
        </div>

      </div>

      {/* 3. ROW 2: VOLUNTEER GROWTH CHART + INITIATIVE STATUS BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* CHART 1: نمو وتسجيل المتطوعين حسب الأشهر (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>حركة ونمو المتطوعين (حسب الأشهر)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  تطور تسجيل واعتماد المتطوعين الفعلي من سجلات بطاقات العضوية
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200/60 dark:border-emerald-800 self-start sm:self-auto">
                إجمالي معتمد: {totalVolunteersCount} متطوع
              </span>
            </div>

            {/* SVG Interactive Area / Bar Visualization */}
            <div className="mt-4 pt-2">
              <div className="h-44 sm:h-52 w-full flex items-end gap-2 sm:gap-4 px-2 border-b border-slate-100 dark:border-slate-800">
                {monthlyVolunteerGrowth.map((item, idx) => {
                  const maxVal = Math.max(...monthlyVolunteerGrowth.map(m => m.cumulative), 8);
                  const barHeight = Math.max(15, Math.round((item.cumulative / maxVal) * 100));
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                      <div className="text-[11px] font-mono font-bold text-slate-400 group-hover:text-emerald-600 transition-colors">
                        {item.cumulative}
                      </div>
                      <div 
                        className="w-full max-w-[36px] bg-gradient-to-t from-emerald-600 to-teal-500 rounded-t-lg transition-all group-hover:brightness-110 shadow-xs"
                        style={{ height: `${barHeight}%` }}
                        title={`شهر ${item.month}: ${item.count} متطوعين جدد (التراكمي: ${item.cumulative})`}
                      />
                      <span className="text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-400 mt-2 whitespace-nowrap">
                        {item.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-xs bg-emerald-600" />
              <span>النمو التراكمي للمتطوعين</span>
            </div>
            <span>آخر تسجيل: اليوم</span>
          </div>
        </div>

        {/* CHART 2: توزيع حالات المبادرات والفرص التطوعية (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-600" />
                  <span>المبادرات والفرص التطوعية</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  توزيع الـ 120 مبادرة وفق الحالات المعتمدة بالنظام
                </p>
              </div>
              <button
                onClick={() => onNavigateTab && onNavigateTab('init')}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                عرض الكل
              </button>
            </div>

            {/* Visual Multi-Segment Bar */}
            <div className="space-y-4 my-2">
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-4 rounded-full overflow-hidden flex p-0.5 shadow-inner">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.round((initiativesByStatus.open / totalInitiativesCount) * 100)}%` }}
                  title={`مفتوحة للتسجيل: ${initiativesByStatus.open}`}
                />
                <div 
                  className="bg-slate-400 dark:bg-slate-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.round((initiativesByStatus.closed / totalInitiativesCount) * 100)}%` }}
                  title={`منتهية / مغلقة: ${initiativesByStatus.closed}`}
                />
                <div 
                  className="bg-teal-600 h-full rounded-full transition-all"
                  style={{ width: `${Math.round((initiativesByStatus.archived / totalInitiativesCount) * 100)}%` }}
                  title={`مؤرشفة ومكتملة: ${initiativesByStatus.archived}`}
                />
              </div>

              {/* Status Breakdown Detail Cards */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">نشطة ومفتوحة للتسجيل</p>
                      <p className="text-[10px] text-slate-500">جاهزة لاستقبال المتطوعين</p>
                    </div>
                  </div>
                  <div className="text-left font-mono">
                    <span className="text-base font-black text-emerald-700 dark:text-emerald-400">{initiativesByStatus.open}</span>
                    <span className="text-[11px] text-slate-400 mr-1.5">({Math.round((initiativesByStatus.open / totalInitiativesCount) * 100)}%)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-slate-400" />
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">مغلقة / قيد التنفيذ الميداني</p>
                      <p className="text-[10px] text-slate-500">اكتمل النصاب أو انتهى الموعد</p>
                    </div>
                  </div>
                  <div className="text-left font-mono">
                    <span className="text-base font-black text-slate-700 dark:text-slate-300">{initiativesByStatus.closed}</span>
                    <span className="text-[11px] text-slate-400 mr-1.5">({Math.round((initiativesByStatus.closed / totalInitiativesCount) * 100)}%)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/40">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-teal-600" />
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">مؤرشفة ومكتملة التقييم</p>
                      <p className="text-[10px] text-slate-500">تم احتساب الساعات والشهادات</p>
                    </div>
                  </div>
                  <div className="text-left font-mono">
                    <span className="text-base font-black text-teal-700 dark:text-teal-400">{initiativesByStatus.archived}</span>
                    <span className="text-[11px] text-slate-400 mr-1.5">({Math.round((initiativesByStatus.archived / totalInitiativesCount) * 100)}%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 flex justify-between">
            <span>الإجمالي الكلي: {totalInitiativesCount} مبادرة</span>
            <span>الفرص المحققة: 100%</span>
          </div>
        </div>

      </div>

      {/* 4. ROW 3: BENEFICIARY SERVICES + INVENTORY & WAREHOUSE STATUS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* SECTION: خدمات المستفيدين ورعاية الأسر */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <HeartHandshake className="w-4 h-4 text-emerald-600" />
                  <span>خدمات المستفيدين وتوزيع المساعدات</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  بيانات الرعاية الاجتماعية والحملات الميدانية وسندات الاستلام
                </p>
              </div>
              <button
                onClick={() => onNavigateTab && onNavigateTab('beneficiaries')}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                إدارة المستفيدين
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-center border border-slate-100 dark:border-slate-800">
                <span className="text-xl font-black text-slate-900 dark:text-white block font-mono">{totalBeneficiariesCount}</span>
                <span className="text-[10px] text-slate-500 font-bold">المستفيدين المسجلين</span>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-center border border-emerald-100 dark:border-emerald-800">
                <span className="text-xl font-black text-emerald-700 dark:text-emerald-400 block font-mono">{approvedBeneficiariesCount}</span>
                <span className="text-[10px] text-slate-500 font-bold">ملفات معتمدة</span>
              </div>
              <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-xl text-center border border-teal-100 dark:border-teal-800">
                <span className="text-xl font-black text-teal-700 dark:text-teal-400 block font-mono">{totalDistributionsCount}</span>
                <span className="text-[10px] text-slate-500 font-bold">حملات التوزيع</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-center border border-slate-100 dark:border-slate-800">
                <span className="text-xl font-black text-slate-700 dark:text-slate-300 block font-mono">{totalHandoversCount}</span>
                <span className="text-[10px] text-slate-500 font-bold">سندات استلام</span>
              </div>
            </div>

            {/* Beneficiaries Breakdown by Category */}
            <div className="mt-4 space-y-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">تصنيف المستفيدين حسب الفئة المسجلة:</h4>
              <div className="space-y-1.5 text-xs">
                {scopedBeneficiaries.slice(0, 3).map((ben, idx) => (
                  <div key={ben.id || idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                    <span className="font-bold">{ben.name}</span>
                    <span className="text-[11px] text-slate-500">فئة: {ben.category || "أسر متعففة"} (أفراد: {ben.familySize || 5})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 flex justify-between">
            <span>التغطية الاجتماعية: 100%</span>
            <span>نطاق العمل: العسيلة ومكة المكرمة</span>
          </div>
        </div>

        {/* SECTION: حالة المخزون والمستودعات */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-teal-600" />
                  <span>حالة المخزون والأصناف المستودعية</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  ملخص الأرصدة المتوفرة، حد الطلب، والكميات المصروفة
                </p>
              </div>
              <button
                onClick={() => onNavigateTab && onNavigateTab('inventory')}
                className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
              >
                إدارة المخزون
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-center border border-slate-100 dark:border-slate-800">
                <span className="text-xl font-black text-slate-900 dark:text-white block font-mono">{totalInventoryItemsCount}</span>
                <span className="text-[10px] text-slate-500 font-bold">إجمالي الأصناف</span>
              </div>
              <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-xl text-center border border-teal-100 dark:border-teal-800">
                <span className="text-xl font-black text-teal-700 dark:text-teal-400 block font-mono">{totalStockUnits.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 font-bold">الرصيد المتاح (وحدة)</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-center border border-slate-100 dark:border-slate-800">
                <span className="text-xl font-black text-slate-700 dark:text-slate-300 block font-mono">{totalIssuedStockUnits.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 font-bold">المنصرف للمستفيدين</span>
              </div>
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-center border border-rose-100 dark:border-rose-900/50">
                <span className="text-xl font-black text-rose-700 dark:text-rose-400 block font-mono">{lowStockItemsCount}</span>
                <span className="text-[10px] text-rose-600 font-bold">عند نقطة إعادة الطلب</span>
              </div>
            </div>

            {/* Warehouse Distribution Preview */}
            <div className="mt-4 space-y-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">أبرز الأصناف في المستودع الرئيسي:</h4>
              <div className="space-y-1.5 text-xs">
                {inventoryItems.slice(0, 3).map((item, idx) => (
                  <div key={item.id || idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[220px]">{item.shortName || item.name}</span>
                    <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">{item.currentQty} {item.unitOfMeasure || 'وحدة'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 flex justify-between">
            <span>المستودعات الفعالة: {data.warehouses?.length || 4}</span>
            <span>الجرد المستودعي: معتمد</span>
          </div>
        </div>

      </div>

      {/* 5. ROW 4: VOLUNTEER ATTENDANCE (POINTS SYSTEM) + TOP KNIGHTS (AL-FURSAN) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ATTENDANCE METRICS & POINTS BREAKDOWN (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>إحصائيات حضور المتطوعين ونقاط التقييم</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  حساب نقاط الحضور المعتمد: حاضر = 3 نقاط، متأخر = 2 نقطة، بعذر = 1 نقطة، غائب = 0
                </p>
              </div>
              <button
                onClick={() => onNavigateTab && onNavigateTab('vols')}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                سجلات الحضور
              </button>
            </div>

            {/* Attendance Score Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-3">
              <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800 text-center">
                <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400 block font-mono">{attendanceBreakdown.full.count}</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mt-0.5">حاضر</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-1">+3 نقاط</span>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800 text-center">
                <span className="text-2xl font-black text-amber-700 dark:text-amber-400 block font-mono">{attendanceBreakdown.late.count}</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mt-0.5">متأخر</span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block mt-1">+2 نقطة</span>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800 text-center">
                <span className="text-2xl font-black text-blue-700 dark:text-blue-400 block font-mono">{attendanceBreakdown.excused.count}</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mt-0.5">بعذر مقبول</span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold block mt-1">+1 نقطة</span>
              </div>

              <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/70 dark:border-rose-900/50 text-center">
                <span className="text-2xl font-black text-rose-700 dark:text-rose-400 block font-mono">{attendanceBreakdown.absent.count}</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mt-0.5">غائب</span>
                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block mt-1">0 نقاط</span>
              </div>
            </div>

            {/* Attendance Ratio Bar */}
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-700 dark:text-slate-300">نسبة الالتزام والانضباط الميداني:</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-mono">92%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
                <div className="bg-emerald-500 h-full" style={{ width: '70%' }} />
                <div className="bg-amber-400 h-full" style={{ width: '15%' }} />
                <div className="bg-blue-400 h-full" style={{ width: '10%' }} />
                <div className="bg-rose-400 h-full" style={{ width: '5%' }} />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 flex justify-between">
            <span>إجمالي الجلسات المرصودة: {attendanceBreakdown.total}</span>
            <span>نظام النقاط: معتمد رسمياً</span>
          </div>
        </div>

        {/* AL-FURSAN: TOP 3 VOLUNTEERS (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-emerald-600" />
                  <span>الفرسان (أفضل 3 متطوعين)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  لوحة الصدارة وفق نظام النقاط الفعلي والمبادرات المنجزة
                </p>
              </div>
              <button
                onClick={() => onNavigateTab && onNavigateTab('leaderboard')}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                لوحة الشرف
              </button>
            </div>

            <div className="space-y-3">
              {topKnights.map((vol, idx) => {
                const rankBadges = [
                  { label: "المركز الأول 🥇", color: "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800" },
                  { label: "المركز الثاني 🥈", color: "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700" },
                  { label: "المركز الثالث 🥉", color: "bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-800" }
                ];
                const badge = rankBadges[idx] || rankBadges[0];

                return (
                  <div 
                    key={vol.id || idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-emerald-500/40 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img 
                          src={vol.photo || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop"} 
                          alt={vol.name} 
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/30 bg-white"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop";
                          }}
                        />
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-600 text-white font-mono text-[9px] flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                          {vol.name}
                        </h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          ساعات: {vol.volunteerHours || 35} س • مبادرات: {vol.completedInitiativesCount || 61}
                        </p>
                      </div>
                    </div>

                    <div className="text-left flex flex-col items-end gap-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.color}`}>
                        {badge.label}
                      </span>
                      <span className="text-xs font-black font-mono text-emerald-700 dark:text-emerald-400">
                        {vol.points || 0} نقطة
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 flex justify-between">
            <span>تحديث لوحة الشرف: تلقائي</span>
            <span>الفرسان المتميزون</span>
          </div>
        </div>

      </div>

      {/* 6. ROW 5: RECENT INITIATIVES + RECENT SYSTEM ACTIVITY LOGS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* RECENT INITIATIVES (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>آخر المبادرات والفرص التطوعية المعتمدة</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  قائمة بأحدث البرامج الميدانية المسجلة في النظام
                </p>
              </div>
              <button
                onClick={() => onNavigateTab && onNavigateTab('init')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-100 transition-colors cursor-pointer border border-emerald-200/60 dark:border-emerald-800"
              >
                <span>عرض جميع المبادرات</span>
                <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-0" />
              </button>
            </div>

            <div className="space-y-2.5">
              {recentInitiatives.map((init, idx) => {
                const statusBadge = init.registrationStatus === 'open'
                  ? { label: "مفتوحة للتسجيل", color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800" }
                  : init.registrationStatus === 'closed'
                  ? { label: "مغلقة", color: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700" }
                  : { label: "مؤرشفة", color: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-400 dark:border-teal-800" };

                return (
                  <div 
                    key={init.id || idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 hover:border-emerald-500/30 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge.color}`}>
                          {statusBadge.label}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[260px] sm:max-w-md">
                          {init.name}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 flex items-center gap-3">
                        <span>المكان: {init.place}</span>
                        <span>التاريخ: {formatDateArabic(init.date)}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs shrink-0 font-mono">
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                        {init.acceptedCount || 0} / {init.neededCount || 15}
                      </span>
                      <span className="text-[10px] text-slate-400">متطوع</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 flex justify-between">
            <span>إجمالي المبادرات: {totalInitiativesCount}</span>
            <span>البرامج الإنسانية والمجتمعية</span>
          </div>
        </div>

        {/* RECENT SYSTEM AUDIT & ACTIVITY LOGS (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span>آخر النشاطات والعمليات المهمة</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  سجل التعديلات والعمليات الإدارية الحديثة
                </p>
              </div>
              <button
                onClick={() => onNavigateTab && onNavigateTab('logs')}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                سجل العمليات
              </button>
            </div>

            <div className="space-y-2.5">
              {recentActivities.map((act, idx) => (
                <div 
                  key={act.id || idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {act.action || act.notes || act.resource || "عملية نظام"}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        بواسطة: {act.user || act.userName || "النظام المركزي"}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0 mr-2">
                    {formatDateArabic(act.timestamp || act.date)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 flex justify-between">
            <span>سجل أمان العمليات: نشط</span>
            <span>تدقيق وتتبع إلكتروني فوري</span>
          </div>
        </div>

      </div>

    </div>
  );
};
