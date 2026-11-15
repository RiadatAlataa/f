import React, { useState, useMemo } from "react";
import {
  Building2, Users, Calendar, HeartHandshake, Package, Boxes,
  TrendingUp, RefreshCw, Trophy, Clock, Activity, CheckCircle2,
  ArrowUpRight, ChevronLeft, BarChart3, Filter, User, Mail,
  ShieldCheck, Search, Sparkles, Wallet, Zap, FileText
} from "lucide-react";
import {
  Department, VolunteerTeam, Volunteer, Initiative, Beneficiary,
  AidDistribution, DistributionHandoverRecord, AttendanceRecord,
  OperationLog
} from "../types";
import { BeneficiariesStatisticsModal } from "./BeneficiariesStatisticsModal";

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
    letters?: any[];
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
  lang = 'ar'
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBeneficiaryStatsModalOpen, setIsBeneficiaryStatsModalOpen] = useState(false);
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
      setTimeout(() => setIsRefreshing(false), 450);
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

  const isTabAllowed = (tabId: string) => {
    if (isSuperAdmin) return true;
    const allowedPages: string[] = Array.isArray(authenticatedUser?.allowedPages) ? authenticatedUser.allowedPages : [];
    if (allowedPages.length === 0) return true;
    return allowedPages.includes(tabId);
  };

  // Scoped Collections based on permissions (real DB rows only)
  const scopedDepartments = useMemo(() => {
    const active = (data.departments || []).filter(d => !d.isArchived);
    if (isSuperAdmin) return active;
    return active.filter(d => userAllowedDeptIds.includes(d.id));
  }, [data.departments, isSuperAdmin, userAllowedDeptIds]);

  const scopedTeams = useMemo(() => {
    if (isSuperAdmin) return data.teams || [];
    return (data.teams || []).filter(t => !t.departmentId || userAllowedDeptIds.includes(t.departmentId));
  }, [data.teams, isSuperAdmin, userAllowedDeptIds]);

  const scopedVolunteers = useMemo(() => {
    const active = (data.volunteers || []).filter(v => !v.isArchived && v.status !== 'archived' && v.status !== 'deactivated');
    if (isSuperAdmin || userAllowedDeptIds.includes('dep-5') || userAllowedDeptIds.includes('dep-1') || userAllowedDeptIds.includes('dep-9')) {
      return active;
    }
    return active.filter(v => v.departmentId && userAllowedDeptIds.includes(v.departmentId));
  }, [data.volunteers, isSuperAdmin, userAllowedDeptIds]);

  const scopedInitiatives = useMemo(() => {
    if (isSuperAdmin) return data.initiatives || [];
    return (data.initiatives || []).filter(i => !i.departmentId || userAllowedDeptIds.includes(i.departmentId));
  }, [data.initiatives, isSuperAdmin, userAllowedDeptIds]);

  const scopedBeneficiaries = useMemo(() => {
    const active = (data.beneficiaries || []).filter(b => !b.isArchived && b.status !== 'archived' && b.status !== 'deactivated');
    if (isSuperAdmin || userAllowedDeptIds.includes('dep-4') || userAllowedDeptIds.includes('dep-1')) {
      return active;
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

  const safeDivTotalInits = totalInitiativesCount > 0 ? totalInitiativesCount : 1;
  const openInitsPct = totalInitiativesCount > 0 ? Math.round((initiativesByStatus.open / safeDivTotalInits) * 100) : 0;
  const closedInitsPct = totalInitiativesCount > 0 ? Math.round((initiativesByStatus.closed / safeDivTotalInits) * 100) : 0;
  const archivedInitsPct = totalInitiativesCount > 0 ? Math.max(0, 100 - openInitsPct - closedInitsPct) : 0;

  const totalDepartmentsCount = scopedDepartments.length;

  // 2. Aid Dispatches & Handovers & Beneficiaries Demographics
  const totalDistributionsCount = (data.distributions || []).length;
  const totalHandoversCount = (data.distributionHandovers || []).length;
  const totalAidDispatches = totalDistributionsCount + totalHandoversCount;

  const beneficiariesStatsBreakdown = useMemo(() => {
    const bens = scopedBeneficiaries;
    const handovers = data.distributionHandovers || [];
    const dists = data.distributions || [];

    let married = 0;
    let single = 0;
    let widows = 0;
    let divorced = 0;
    let orphans = 0;
    let citizens = 0;
    let residents = 0;
    let childrenOfCitizens = 0;

    const receivedSet = new Set<string>();
    handovers.forEach(h => {
      if (h.beneficiaryId) receivedSet.add(h.beneficiaryId);
      if (h.nationalId) receivedSet.add(h.nationalId);
    });

    let receivedCount = 0;

    bens.forEach(b => {
      const ms = (b.maritalStatus || "").trim();
      if (ms === 'متزوج' || ms === 'متزوجة') married++;
      else if (ms === 'أعزب' || ms === 'عزباء') single++;
      else if (ms === 'أرمل' || ms === 'أرملة') widows++;
      else if (ms === 'مطلق' || ms === 'مطلقة') divorced++;

      if (b.orphanStatus === 'يتيم' || b.orphanStatus === 'يتيمة') orphans++;

      const rs = (b.residencyStatus || (b.nationalId?.startsWith('1') ? 'مواطن سعودي' : 'مقيم')).trim();
      if (rs === 'مواطن سعودي') citizens++;
      else if (rs === 'مقيم') residents++;
      else if (rs.includes('مواطنة')) childrenOfCitizens++;

      if (receivedSet.has(b.id) || (b.nationalId && receivedSet.has(b.nationalId))) {
        receivedCount++;
      }
    });

    const notReceivedCount = Math.max(0, bens.length - receivedCount);
    const completedDists = dists.filter(d => d.workflowStatus === 'completed' || d.status === 'completed').length;
    const pendingDists = dists.length - completedDists;

    return {
      married,
      single,
      widows,
      divorced,
      orphans,
      citizens,
      residents,
      childrenOfCitizens,
      receivedCount,
      notReceivedCount,
      completedDists,
      pendingDists
    };
  }, [scopedBeneficiaries, data.distributionHandovers, data.distributions]);

  // 3. Inventory Summary (real data)
  const inventoryItems = data.inventoryItems || [];
  const totalInventoryItemsCount = inventoryItems.length;
  const warehousesCount = Array.isArray(data.warehouses) ? data.warehouses.length : 0;
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

  // 4. Monthly Volunteer Growth (Strictly calculated from actual registration/issue dates — ZERO mock fallback)
  const monthlyVolunteerGrowth = useMemo(() => {
    const arabicMonths = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    const countsByMonth: Record<number, number> = {};
    let datedCount = 0;

    scopedVolunteers.forEach(v => {
      const dateStr = v.issueDate || (v as any).createdAt;
      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          const m = d.getMonth();
          countsByMonth[m] = (countsByMonth[m] || 0) + 1;
          datedCount++;
        }
      }
    });

    const nowMonth = new Date().getMonth();
    const monthIndices: number[] = [];
    for (let offset = 6; offset >= 0; offset--) {
      monthIndices.push((nowMonth - offset + 12) % 12);
    }

    let runningPrior = Math.max(0, scopedVolunteers.length - datedCount);
    // Include dated records that fall outside the 7-month rolling window in the starting cumulative baseline
    Object.entries(countsByMonth).forEach(([mKey, cnt]) => {
      if (!monthIndices.includes(Number(mKey))) {
        runningPrior += cnt;
      }
    });

    return monthIndices.map(mIdx => {
      const count = countsByMonth[mIdx] || 0;
      runningPrior += count;
      return {
        month: arabicMonths[mIdx],
        count,
        cumulative: runningPrior
      };
    });
  }, [scopedVolunteers]);

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
      else if (a.status === 'unexcused' || (a.status as string) === 'absent') absent++;
      else full++;
    });

    const totalRecords = full + late + excused + absent;
    const safeDenom = totalRecords > 0 ? totalRecords : 1;
    const commitmentPercent = totalRecords > 0 ? Math.round(((full + late) / safeDenom) * 100) : 0;

    return {
      total: totalRecords,
      commitmentPercent,
      full: { count: full, pts: 3, label: "حاضر (كامل)", percent: totalRecords > 0 ? Math.round((full / safeDenom) * 100) : 0 },
      late: { count: late, pts: 2, label: "متأخر", percent: totalRecords > 0 ? Math.round((late / safeDenom) * 100) : 0 },
      excused: { count: excused, pts: 1, label: "بعذر مقبول", percent: totalRecords > 0 ? Math.round((excused / safeDenom) * 100) : 0 },
      absent: { count: absent, pts: 0, label: "غائب", percent: totalRecords > 0 ? Math.round((absent / safeDenom) * 100) : 0 }
    };
  }, [data.attendance]);

  // 6. Top 3 Knights (أفضل المتطوعين حسب النقاط الفعلية)
  const topKnights = useMemo(() => {
    const list = [...scopedVolunteers];
    return list
      .sort((a, b) => (b.points || 0) - (a.points || 0))
      .slice(0, 3);
  }, [scopedVolunteers]);

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
      .filter(i => i && (i.date || (i as any).startDate))
      .sort((a, b) => new Date(b.date || (b as any).startDate).getTime() - new Date(a.date || (a as any).startDate).getTime())
      .slice(0, 5);
  }, [scopedInitiatives]);

  // Quick Access Shortcuts (Permission-filtered)
  const quickAccessItems = useMemo(() => {
    const items = [
      { id: 'beneficiaries', label: 'إدارة المستفيدين', sub: `${totalBeneficiariesCount} ملف`, icon: HeartHandshake, accent: 'text-[#0754C7] dark:text-blue-400 bg-[#eaf3ff] dark:bg-blue-950/60 border-blue-200 dark:border-blue-800/70' },
      { id: 'distributions', label: 'تسليم المساعدات', sub: `${totalDistributionsCount} حملة`, icon: Package, accent: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/60' },
      { id: 'vols', label: 'سجل المتطوعين', sub: `${totalVolunteersCount} متطوع`, icon: Users, accent: 'text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800/60' },
      { id: 'init', label: 'المبادرات والفرص', sub: `${totalInitiativesCount} مبادرة`, icon: Calendar, accent: 'text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800/60' },
      { id: 'inventory', label: 'المستودع والمخزون', sub: `${totalInventoryItemsCount} صنف`, icon: Boxes, accent: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/60' },
      { id: 'deps', label: 'الإدارات والهيكل', sub: `${totalDepartmentsCount} إدارة`, icon: Building2, accent: 'text-[#071C43] dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700' },
      { id: 'letters', label: 'الخطابات والمراسلات', sub: `${(data.letters || []).length} خطاب`, icon: Mail, accent: 'text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/50 border-violet-200 dark:border-violet-800/60' },
      { id: 'users_mgmt', label: 'إدارة المستخدمين', sub: 'حسابات وصلاحيات', icon: ShieldCheck, accent: 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800/60' },
      { id: 'enterprise_finance', label: 'الإدارة المالية', sub: 'السندات والمشاريع', icon: Wallet, accent: 'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50 border-teal-200 dark:border-teal-800/60' },
      { id: 'globalsearch', label: 'البحث الشامل', sub: 'استعلام فوري', icon: Search, accent: 'text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/50 border-cyan-200 dark:border-cyan-800/60' }
    ];
    return items.filter(item => isTabAllowed(item.id));
  }, [totalBeneficiariesCount, totalDistributionsCount, totalVolunteersCount, totalInitiativesCount, totalInventoryItemsCount, totalDepartmentsCount, data.letters, authenticatedUser]);

  // Helpers
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

  return (
    <div className="space-y-6 select-text" dir="rtl">

      {/* 1. EXECUTIVE WELCOME HERO BANNER (Official Logo + "معًا… نُحدث أثرًا") */}
      <section className="bg-gradient-to-l from-[#071C43] via-[#0644A3] to-[#0754C7] text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-[#1e40af]/40">
        {/* Subtle luminous ambiance */}
        <div className="absolute -top-24 -right-20 w-80 h-80 bg-sky-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-20 w-80 h-80 bg-blue-300/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Official Association Logo */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white p-2 shadow-lg ring-4 ring-white/20 flex items-center justify-center shrink-0 overflow-hidden">
              <img
                src="/logo.png"
                alt="شعار جمعية ريادة العطاء لخدمة الإنسان بالعسيلة"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-white/15 text-blue-100 border border-white/20 backdrop-blur-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>بيانات حية متصلة بقاعدة البيانات</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-[#081426]/40 text-blue-100 border border-white/15">
                  ترخيص: {data.homeSettings?.licenseNumber || "1000888600"}
                </span>
                {!isSuperAdmin && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-400/20 text-amber-100 border border-amber-300/30">
                    <Filter className="w-3 h-3" />
                    <span>نطاق الصلاحيات المعتمد</span>
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5 leading-tight">
                <span>معًا… نُحدث أثرًا</span>
                <Sparkles className="w-5 h-5 text-amber-300 shrink-0" />
              </h1>

              <p className="text-sm sm:text-base font-bold text-blue-100 font-lyon association-brand-text">
                {data.homeSettings?.associationNameAr || "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة"}
              </p>

              <p className="text-xs sm:text-sm text-blue-100/85 max-w-2xl leading-relaxed">
                {authenticatedUser?.name
                  ? `مرحباً ${authenticatedUser.name} — ملخص تنفيذي مباشر لأداء الإدارات والمستفيدين والمتطوعين والمبادرات والعمليات الميدانية.`
                  : "ملخص تنفيذي مباشر لأداء الجمعية والبرامج والمستفيدين والمتطوعين والعمليات الميدانية."}
              </p>
            </div>
          </div>

          {/* Action Tools & Last Refresh Time */}
          <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-3 shrink-0 border-t lg:border-t-0 border-white/15 pt-4 lg:pt-0">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#071C43] hover:bg-blue-50 active:scale-95 font-black text-xs sm:text-sm transition-all shadow-md cursor-pointer disabled:opacity-60"
              title="إعادة جلب ومزامنة أحدث الإحصائيات من قاعدة البيانات"
            >
              <RefreshCw className={`w-4 h-4 text-[#0754C7] ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'جارٍ التحديث...' : 'تحديث المؤشرات'}</span>
            </button>

            <div className="flex items-center gap-1.5 text-xs text-blue-100 bg-[#081426]/45 px-3 py-1.5 rounded-lg border border-white/15 font-mono">
              <Clock className="w-3.5 h-3.5 text-sky-300" />
              <span>آخر مزامنة: {lastRefreshedTime}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. THE 6 LIVE DATABASE-BACKED GRADIENT KPI CARDS */}
      <section aria-label="المؤشرات الإحصائية الرئيسية" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">

        {/* CARD 1: إجمالي المستفيدين */}
        <button
          type="button"
          onClick={() => onNavigateTab && onNavigateTab('beneficiaries')}
          className="text-right relative overflow-hidden bg-white dark:bg-[#0e213d] rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-[#1e3a66] shadow-xs hover:shadow-lg hover:-translate-y-0.5 hover:border-[#0754C7] transition-all cursor-pointer group flex flex-col justify-between"
        >
          <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-[#071C43] to-[#0754C7]" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0754C7] to-[#0875E1] text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-[#0754C7] dark:text-blue-300 bg-[#eaf3ff] dark:bg-blue-950/70 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800/60">
                الرعاية الاجتماعية
              </span>
            </div>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
              إجمالي المستفيدين
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-[#071C43] dark:text-white tracking-tight font-mono tabular-nums">
                {totalBeneficiariesCount}
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                ملف نشط
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#1e3a66] flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 font-semibold">
            <span className="tabular-nums">معتمدين: {approvedBeneficiariesCount}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0754C7] transition-colors" />
          </div>
        </button>

        {/* CARD 2: إجمالي المتطوعين */}
        <button
          type="button"
          onClick={() => onNavigateTab && onNavigateTab('vols')}
          className="text-right relative overflow-hidden bg-white dark:bg-[#0e213d] rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-[#1e3a66] shadow-xs hover:shadow-lg hover:-translate-y-0.5 hover:border-sky-500 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-[#0754C7] to-sky-500" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0875E1] to-sky-500 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-md border border-sky-200 dark:border-sky-800/60">
                العمل التطوعي
              </span>
            </div>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
              إجمالي المتطوعين
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-[#071C43] dark:text-white tracking-tight font-mono tabular-nums">
                {totalVolunteersCount}
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                متطوع مسجل
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#1e3a66] flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 font-semibold">
            <span className="tabular-nums">نشط: {activeVolunteersCount}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600 transition-colors" />
          </div>
        </button>

        {/* CARD 3: المبادرات والفرص التطوعية */}
        <button
          type="button"
          onClick={() => onNavigateTab && onNavigateTab('init')}
          className="text-right relative overflow-hidden bg-white dark:bg-[#0e213d] rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-[#1e3a66] shadow-xs hover:shadow-lg hover:-translate-y-0.5 hover:border-indigo-500 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-indigo-700 to-blue-500" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-[#0754C7] text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800/60 font-mono tabular-nums">
                {totalInitiativesCount} مسجل
              </span>
            </div>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
              المبادرات والفرص
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-[#071C43] dark:text-white tracking-tight font-mono tabular-nums">
                {totalInitiativesCount}
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                مبادرة وفرصة
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#1e3a66] flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 font-semibold">
            <span className="tabular-nums">مفتوحة: {initiativesByStatus.open}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </div>
        </button>

        {/* CARD 4: الإدارات الفعالة */}
        <button
          type="button"
          onClick={() => onNavigateTab && onNavigateTab('deps')}
          className="text-right relative overflow-hidden bg-white dark:bg-[#0e213d] rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-[#1e3a66] shadow-xs hover:shadow-lg hover:-translate-y-0.5 hover:border-[#071C43] transition-all cursor-pointer group flex flex-col justify-between"
        >
          <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-[#071C43] to-slate-500" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#071C43] to-[#142d50] text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <Building2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-[#142d50] px-2 py-0.5 rounded-md border border-slate-200 dark:border-[#244577]">
                هيكل معتمد
              </span>
            </div>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
              الإدارات التنفيذية
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-[#071C43] dark:text-white tracking-tight font-mono tabular-nums">
                {totalDepartmentsCount}
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                إدارات فعالة
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#1e3a66] flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 font-semibold">
            <span className="tabular-nums">فرق تابعة: {scopedTeams.length}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0754C7] transition-colors" />
          </div>
        </button>

        {/* CARD 5: المساعدات المصروفة */}
        <button
          type="button"
          onClick={() => onNavigateTab && onNavigateTab('distributions')}
          className="text-right relative overflow-hidden bg-white dark:bg-[#0e213d] rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-[#1e3a66] shadow-xs hover:shadow-lg hover:-translate-y-0.5 hover:border-emerald-500 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-emerald-600 to-teal-500" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <Package className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/60">
                توزيعات إنسانية
              </span>
            </div>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
              المساعدات المصروفة
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-[#071C43] dark:text-white tracking-tight font-mono tabular-nums">
                {totalAidDispatches}
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                عملية صرف
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#1e3a66] flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 font-semibold">
            <span className="tabular-nums">حملات: {totalDistributionsCount} • استلام: {totalHandoversCount}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </div>
        </button>

        {/* CARD 6: الأصناف والمخزون */}
        <button
          type="button"
          onClick={() => onNavigateTab && onNavigateTab('inventory')}
          className="text-right relative overflow-hidden bg-white dark:bg-[#0e213d] rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-[#1e3a66] shadow-xs hover:shadow-lg hover:-translate-y-0.5 hover:border-amber-500 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-amber-500 to-orange-500" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <Boxes className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/60 font-mono tabular-nums">
                مستودعات: {warehousesCount}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
              الأصناف والمخزون
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-[#071C43] dark:text-white tracking-tight font-mono tabular-nums">
                {totalInventoryItemsCount}
              </span>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                صنف مسجل
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#1e3a66] flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 font-semibold">
            <span className="tabular-nums">الرصيد: {totalStockUnits.toLocaleString()} وحدة</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 transition-colors" />
          </div>
        </button>

      </section>

      {/* 3. QUICK ACCESS ACTIONS BAR (الوصول السريع حسب صلاحيات المستخدم) */}
      {quickAccessItems.length > 0 && (
        <section className="bg-white dark:bg-[#0e213d] rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-[#1e3a66] shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-3.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#eaf3ff] dark:bg-[#142d50] text-[#0754C7] dark:text-blue-400 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-black text-[#071C43] dark:text-white">الوصول السريع للخدمات والإدارات</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">انتقال مباشر للأقسام المخولة دون مغادرة لوحة التحكم</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-10 gap-2.5">
            {quickAccessItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  id={`quick-access-${item.id}`}
                  onClick={() => onNavigateTab && onNavigateTab(item.id)}
                  className="flex flex-col items-start justify-between gap-2 p-3 rounded-xl bg-slate-50/80 dark:bg-[#142d50]/60 hover:bg-[#eaf3ff] dark:hover:bg-[#162e52] border border-slate-200/80 dark:border-[#1e3a66] hover:border-[#0754C7] transition-all text-right cursor-pointer group"
                >
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${item.accent}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 w-full">
                    <div className="text-xs font-extrabold text-[#071C43] dark:text-white truncate">{item.label}</div>
                    <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate mt-0.5 tabular-nums">{item.sub}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. CHARTS ROW: VOLUNTEER GROWTH CHART + INITIATIVE STATUS BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* CHART 1: نمو وتسجيل المتطوعين حسب الأشهر (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#0e213d] rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-[#1e3a66] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-black text-[#071C43] dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#0754C7] dark:text-blue-400" />
                  <span>حركة ونمو المتطوعين (آخر 7 أشهر)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  تطور تسجيل واعتماد المتطوعين الفعلي من سجلات قاعدة البيانات
                </p>
              </div>
              <span className="text-xs font-bold text-[#0754C7] dark:text-blue-300 bg-[#eaf3ff] dark:bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-200/70 dark:border-blue-800/70 self-start sm:self-auto font-mono tabular-nums">
                إجمالي نشط: {totalVolunteersCount} متطوع
              </span>
            </div>

            {/* Interactive Bar Visualization */}
            <div className="mt-4 pt-2">
              <div className="h-44 sm:h-52 w-full flex items-end gap-2 sm:gap-4 px-2 border-b border-slate-100 dark:border-[#1e3a66]">
                {monthlyVolunteerGrowth.map((item, idx) => {
                  const maxVal = Math.max(...monthlyVolunteerGrowth.map(m => m.cumulative), 1);
                  const barHeight = item.cumulative > 0 ? Math.max(12, Math.round((item.cumulative / maxVal) * 100)) : 6;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                      <div className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 group-hover:text-[#0754C7] dark:group-hover:text-blue-300 transition-colors tabular-nums">
                        {item.cumulative}
                      </div>
                      <div
                        className="w-full max-w-[38px] bg-gradient-to-t from-[#071C43] via-[#0754C7] to-[#0875E1] rounded-t-lg transition-all group-hover:brightness-110 shadow-xs"
                        style={{ height: `${barHeight}%` }}
                        title={`شهر ${item.month}: ${item.count} مسجل جديد (التراكمي: ${item.cumulative})`}
                      />
                      <span className="text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 mt-2 whitespace-nowrap">
                        {item.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#1e3a66] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-xs bg-[#0754C7]" />
              <span>النمو التراكمي الفعلي للمتطوعين</span>
            </div>
            <span>المصدر: سجل المتطوعين المعتمد</span>
          </div>
        </div>

        {/* CHART 2: توزيع حالات المبادرات والفرص التطوعية (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#0e213d] rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-[#1e3a66] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-black text-[#071C43] dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#0754C7] dark:text-blue-400" />
                  <span>المبادرات والفرص التطوعية</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  توزيع {totalInitiativesCount} مبادرة وفق الحالات الفعلية المعتمدة
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab && onNavigateTab('init')}
                className="text-xs font-bold text-[#0754C7] dark:text-blue-400 hover:underline cursor-pointer"
              >
                عرض الكل
              </button>
            </div>

            {/* Visual Multi-Segment Bar */}
            <div className="space-y-4 my-2">
              <div className="w-full bg-slate-100 dark:bg-[#142d50] h-4 rounded-full overflow-hidden flex p-0.5 shadow-inner">
                <div
                  className="bg-[#0754C7] h-full rounded-full transition-all"
                  style={{ width: `${openInitsPct}%` }}
                  title={`مفتوحة للتسجيل: ${initiativesByStatus.open}`}
                />
                <div
                  className="bg-slate-400 dark:bg-slate-500 h-full rounded-full transition-all"
                  style={{ width: `${closedInitsPct}%` }}
                  title={`منتهية / مغلقة: ${initiativesByStatus.closed}`}
                />
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${archivedInitsPct}%` }}
                  title={`مؤرشفة ومكتملة: ${initiativesByStatus.archived}`}
                />
              </div>

              {/* Status Breakdown Detail Cards */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#eaf3ff]/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-[#0754C7]" />
                    <div>
                      <p className="text-xs font-bold text-[#071C43] dark:text-slate-200">نشطة ومفتوحة للتسجيل</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">جاهزة لاستقبال المتطوعين</p>
                    </div>
                  </div>
                  <div className="text-left font-mono tabular-nums">
                    <span className="text-base font-black text-[#0754C7] dark:text-blue-400">{initiativesByStatus.open}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mr-1.5">({openInitsPct}%)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#142d50]/50 border border-slate-100 dark:border-[#1e3a66]">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-slate-400" />
                    <div>
                      <p className="text-xs font-bold text-[#071C43] dark:text-slate-200">مغلقة / قيد التنفيذ الميداني</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">اكتمل النصاب أو انتهى الموعد</p>
                    </div>
                  </div>
                  <div className="text-left font-mono tabular-nums">
                    <span className="text-base font-black text-slate-700 dark:text-slate-200">{initiativesByStatus.closed}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mr-1.5">({closedInitsPct}%)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <div>
                      <p className="text-xs font-bold text-[#071C43] dark:text-slate-200">مؤرشفة ومكتملة التقييم</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">تم احتساب الساعات والشهادات</p>
                    </div>
                  </div>
                  <div className="text-left font-mono tabular-nums">
                    <span className="text-base font-black text-emerald-700 dark:text-emerald-400">{initiativesByStatus.archived}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mr-1.5">({archivedInitsPct}%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#1e3a66] text-[11px] text-slate-500 dark:text-slate-400 flex justify-between font-mono">
            <span>الإجمالي الكلي: {totalInitiativesCount} مبادرة</span>
            <span>المفتوحة: {initiativesByStatus.open}</span>
          </div>
        </div>

      </div>

      {/* 5. ROW 3: BENEFICIARY SERVICES + INVENTORY & WAREHOUSE STATUS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* SECTION: خدمات المستفيدين ورعاية الأسر */}
        <div className="bg-white dark:bg-[#0e213d] rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-[#1e3a66] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-black text-[#071C43] dark:text-white flex items-center gap-2">
                  <HeartHandshake className="w-4 h-4 text-[#0754C7] dark:text-blue-400" />
                  <span>خدمات المستفيدين وتوزيع المساعدات</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  بيانات الرعاية الاجتماعية والحملات الميدانية وسندات الاستلام المباشرة
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBeneficiaryStatsModalOpen(true)}
                  className="px-2.5 py-1 bg-[#eaf3ff] dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-[#0754C7] dark:text-blue-300 rounded-lg text-xs font-bold transition-all border border-blue-200 dark:border-blue-800 cursor-pointer flex items-center gap-1"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>الإحصائيات التفصيلية</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab && onNavigateTab('beneficiaries')}
                  className="text-xs font-bold text-[#0754C7] dark:text-blue-400 hover:underline cursor-pointer"
                >
                  إدارة المستفيدين
                </button>
              </div>
            </div>

            {/* Core Counts Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-2">
              <div className="p-3 bg-slate-50 dark:bg-[#142d50]/60 rounded-xl text-center border border-slate-100 dark:border-[#1e3a66]">
                <span className="text-xl font-black text-[#071C43] dark:text-white block font-mono tabular-nums">{totalBeneficiariesCount}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">إجمالي المستفيدين</span>
              </div>
              <div className="p-3 bg-[#eaf3ff]/70 dark:bg-blue-950/40 rounded-xl text-center border border-blue-100 dark:border-blue-800">
                <span className="text-xl font-black text-[#0754C7] dark:text-blue-300 block font-mono tabular-nums">{approvedBeneficiariesCount}</span>
                <span className="text-[10px] text-slate-600 dark:text-slate-300 font-bold">ملفات معتمدة</span>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-center border border-emerald-100 dark:border-emerald-800">
                <span className="text-xl font-black text-emerald-700 dark:text-emerald-400 block font-mono tabular-nums">{beneficiariesStatsBreakdown.receivedCount}</span>
                <span className="text-[10px] text-slate-600 dark:text-slate-300 font-bold">استلموا مساعدات</span>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-center border border-amber-100 dark:border-amber-800">
                <span className="text-xl font-black text-amber-700 dark:text-amber-400 block font-mono tabular-nums">{beneficiariesStatsBreakdown.notReceivedCount}</span>
                <span className="text-[10px] text-slate-600 dark:text-slate-300 font-bold">بانتظار الصرف</span>
              </div>
            </div>

            {/* Live Social Status & Trait Breakdown Grid */}
            <div className="mt-3 p-3 bg-slate-50 dark:bg-[#142d50]/40 rounded-xl border border-slate-200/70 dark:border-[#1e3a66] space-y-2">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                توزيع المستفيدين حسب الحالة الاجتماعية وصفة المستفيد:
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                <div className="p-1.5 bg-white dark:bg-[#081426] rounded-lg border border-slate-200/60 dark:border-[#1e3a66]">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">متزوجون</span>
                  <strong className="font-mono text-[#071C43] dark:text-white tabular-nums">{beneficiariesStatsBreakdown.married}</strong>
                </div>
                <div className="p-1.5 bg-white dark:bg-[#081426] rounded-lg border border-slate-200/60 dark:border-[#1e3a66]">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">عزاب</span>
                  <strong className="font-mono text-[#071C43] dark:text-white tabular-nums">{beneficiariesStatsBreakdown.single}</strong>
                </div>
                <div className="p-1.5 bg-white dark:bg-[#081426] rounded-lg border border-slate-200/60 dark:border-[#1e3a66]">
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 block">أرامل</span>
                  <strong className="font-mono text-purple-800 dark:text-purple-200 tabular-nums">{beneficiariesStatsBreakdown.widows}</strong>
                </div>
                <div className="p-1.5 bg-white dark:bg-[#081426] rounded-lg border border-slate-200/60 dark:border-[#1e3a66]">
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 block">مطلقون</span>
                  <strong className="font-mono text-amber-800 dark:text-amber-200 tabular-nums">{beneficiariesStatsBreakdown.divorced}</strong>
                </div>
                <div className="p-1.5 bg-rose-50 dark:bg-rose-950/50 rounded-lg border border-rose-200 dark:border-rose-900">
                  <span className="text-[10px] text-rose-700 dark:text-rose-400 block font-bold">أيتام</span>
                  <strong className="font-mono text-rose-900 dark:text-rose-200 tabular-nums">{beneficiariesStatsBreakdown.orphans}</strong>
                </div>
                <div className="p-1.5 bg-[#eaf3ff] dark:bg-blue-950/50 rounded-lg border border-blue-200 dark:border-blue-900">
                  <span className="text-[10px] text-[#0754C7] dark:text-blue-400 block font-bold">سعوديون</span>
                  <strong className="font-mono text-[#071C43] dark:text-blue-200 tabular-nums">{beneficiariesStatsBreakdown.citizens}</strong>
                </div>
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
              <span>المقيمون: <strong className="font-mono text-[#071C43] dark:text-slate-200">{beneficiariesStatsBreakdown.residents}</strong> | أبناء المواطنات: <strong className="font-mono text-[#071C43] dark:text-slate-200">{beneficiariesStatsBreakdown.childrenOfCitizens}</strong></span>
              <span>حملات مكتملة: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{beneficiariesStatsBreakdown.completedDists}</strong> | جارية: <strong className="font-mono text-amber-600 dark:text-amber-400">{beneficiariesStatsBreakdown.pendingDists}</strong></span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#1e3a66] text-xs text-slate-500 dark:text-slate-400 flex justify-between">
            <span>إجمالي الحملات: {totalDistributionsCount}</span>
            <span>نطاق العمل: العسيلة ومكة المكرمة</span>
          </div>
        </div>

        {/* SECTION: حالة المخزون والمستودعات */}
        <div className="bg-white dark:bg-[#0e213d] rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-[#1e3a66] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-black text-[#071C43] dark:text-white flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-[#0754C7] dark:text-blue-400" />
                  <span>حالة المخزون والأصناف المستودعية</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  ملخص الأرصدة المتوفرة، حد الطلب، والكميات المصروفة
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab && onNavigateTab('inventory')}
                className="text-xs font-bold text-[#0754C7] dark:text-blue-400 hover:underline cursor-pointer"
              >
                إدارة المخزون
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-2">
              <div className="p-3 bg-slate-50 dark:bg-[#142d50]/60 rounded-xl text-center border border-slate-100 dark:border-[#1e3a66]">
                <span className="text-xl font-black text-[#071C43] dark:text-white block font-mono tabular-nums">{totalInventoryItemsCount}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">إجمالي الأصناف</span>
              </div>
              <div className="p-3 bg-[#eaf3ff] dark:bg-blue-950/40 rounded-xl text-center border border-blue-100 dark:border-blue-800">
                <span className="text-xl font-black text-[#0754C7] dark:text-blue-300 block font-mono tabular-nums">{totalStockUnits.toLocaleString()}</span>
                <span className="text-[10px] text-slate-600 dark:text-slate-300 font-bold">الرصيد المتاح</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-[#142d50]/60 rounded-xl text-center border border-slate-100 dark:border-[#1e3a66]">
                <span className="text-xl font-black text-slate-700 dark:text-slate-200 block font-mono tabular-nums">{totalIssuedStockUnits.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">المنصرف للمستفيدين</span>
              </div>
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-center border border-rose-100 dark:border-rose-900/50">
                <span className="text-xl font-black text-rose-700 dark:text-rose-400 block font-mono tabular-nums">{lowStockItemsCount}</span>
                <span className="text-[10px] text-rose-600 dark:text-rose-300 font-bold">تنبيه إعادة الطلب</span>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <h4 className="text-xs font-bold text-[#071C43] dark:text-slate-200">أبرز الأصناف المسجلة في المستودع:</h4>
              <div className="space-y-1.5 text-xs">
                {inventoryItems.length > 0 ? inventoryItems.slice(0, 3).map((item, idx) => (
                  <div key={item.id || idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-[#142d50]/50 border border-slate-100 dark:border-[#1e3a66]">
                    <span className="font-bold text-[#071C43] dark:text-slate-200 truncate max-w-[220px]">{item.shortName || item.name}</span>
                    <span className="text-[11px] font-mono text-[#0754C7] dark:text-blue-300 font-bold tabular-nums">{item.currentQty ?? 0} {item.unitOfMeasure || 'وحدة'}</span>
                  </div>
                )) : (
                  <div className="p-4 text-center rounded-xl bg-slate-50 dark:bg-[#142d50]/40 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-[#1e3a66]">
                    لا توجد أصناف مخزنية مسجلة بعد.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#1e3a66] text-xs text-slate-500 dark:text-slate-400 flex justify-between font-mono">
            <span>المستودعات المسجلة: {warehousesCount}</span>
            <span>الجرد المستودعي: معتمد</span>
          </div>
        </div>

      </div>

      {/* 6. ROW 4: VOLUNTEER ATTENDANCE + TOP KNIGHTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ATTENDANCE METRICS & POINTS BREAKDOWN (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#0e213d] rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-[#1e3a66] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-black text-[#071C43] dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0754C7] dark:text-blue-400" />
                  <span>إحصائيات حضور المتطوعين ونقاط التقييم</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  نقاط الحضور الفعلية: حاضر = 3 نقاط، متأخر = 2 نقطة، بعذر = 1 نقطة، غائب = 0
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab && onNavigateTab('vols')}
                className="text-xs font-bold text-[#0754C7] dark:text-blue-400 hover:underline cursor-pointer"
              >
                سجلات الحضور
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-3">
              <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800 text-center">
                <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400 block font-mono tabular-nums">{attendanceBreakdown.full.count}</span>
                <span className="text-xs font-bold text-[#071C43] dark:text-slate-200 block mt-0.5">حاضر</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-1">+3 نقاط</span>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800 text-center">
                <span className="text-2xl font-black text-amber-700 dark:text-amber-400 block font-mono tabular-nums">{attendanceBreakdown.late.count}</span>
                <span className="text-xs font-bold text-[#071C43] dark:text-slate-200 block mt-0.5">متأخر</span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block mt-1">+2 نقطة</span>
              </div>

              <div className="p-3 rounded-xl bg-[#eaf3ff] dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800 text-center">
                <span className="text-2xl font-black text-[#0754C7] dark:text-blue-300 block font-mono tabular-nums">{attendanceBreakdown.excused.count}</span>
                <span className="text-xs font-bold text-[#071C43] dark:text-slate-200 block mt-0.5">بعذر مقبول</span>
                <span className="text-[10px] text-[#0754C7] dark:text-blue-400 font-bold block mt-1">+1 نقطة</span>
              </div>

              <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/70 dark:border-rose-900/50 text-center">
                <span className="text-2xl font-black text-rose-700 dark:text-rose-400 block font-mono tabular-nums">{attendanceBreakdown.absent.count}</span>
                <span className="text-xs font-bold text-[#071C43] dark:text-slate-200 block mt-0.5">غائب</span>
                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block mt-1">0 نقاط</span>
              </div>
            </div>

            {/* Real Attendance Ratio Bar */}
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-700 dark:text-slate-300">نسبة الالتزام والانضباط الميداني الفعلية:</span>
                <span className="text-[#0754C7] dark:text-blue-300 font-mono tabular-nums">
                  {attendanceBreakdown.total > 0 ? `${attendanceBreakdown.commitmentPercent}%` : 'لا توجد جلسات مسجلة'}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-[#142d50] h-2.5 rounded-full overflow-hidden flex">
                {attendanceBreakdown.total > 0 ? (
                  <>
                    <div className="bg-emerald-500 h-full transition-all" style={{ width: `${attendanceBreakdown.full.percent}%` }} />
                    <div className="bg-amber-400 h-full transition-all" style={{ width: `${attendanceBreakdown.late.percent}%` }} />
                    <div className="bg-[#0875E1] h-full transition-all" style={{ width: `${attendanceBreakdown.excused.percent}%` }} />
                    <div className="bg-rose-400 h-full transition-all" style={{ width: `${attendanceBreakdown.absent.percent}%` }} />
                  </>
                ) : (
                  <div className="bg-slate-200 dark:bg-slate-700 h-full w-full" />
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#1e3a66] text-xs text-slate-500 dark:text-slate-400 flex justify-between font-mono">
            <span>إجمالي الجلسات المرصودة: {attendanceBreakdown.total}</span>
            <span>نظام النقاط: معتمد رسمياً</span>
          </div>
        </div>

        {/* AL-FURSAN: TOP 3 VOLUNTEERS (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#0e213d] rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-[#1e3a66] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-black text-[#071C43] dark:text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span>الفرسان (أفضل 3 متطوعين)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  لوحة الصدارة وفق نظام النقاط الفعلي والمبادرات المنجزة
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab && onNavigateTab('leaderboard')}
                className="text-xs font-bold text-[#0754C7] dark:text-blue-400 hover:underline cursor-pointer"
              >
                لوحة الشرف
              </button>
            </div>

            <div className="space-y-3">
              {topKnights.length > 0 ? topKnights.map((vol, idx) => {
                const rankBadges = [
                  { label: "المركز الأول", color: "bg-[#eaf3ff] dark:bg-blue-950/70 text-[#0754C7] dark:text-blue-300 border-blue-200 dark:border-blue-800" },
                  { label: "المركز الثاني", color: "bg-slate-100 dark:bg-[#142d50] text-slate-800 dark:text-slate-200 border-slate-300 dark:border-[#244577]" },
                  { label: "المركز الثالث", color: "bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800" }
                ];
                const badge = rankBadges[idx] || rankBadges[0];
                const volHours = Number((vol as any).hours ?? (vol as any).volunteerHours ?? 0);
                const volInitsCount = scopedInitiatives.filter(i =>
                  Array.isArray(i.acceptedVolunteerIds) && i.acceptedVolunteerIds.includes(vol.id)
                ).length;

                return (
                  <div
                    key={vol.id || idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#142d50]/50 border border-slate-100 dark:border-[#1e3a66] hover:border-[#0754C7]/50 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        {vol.photo && !vol.photo.includes("unsplash.com") && !vol.photo.includes("placeholder") ? (
                          <img
                            src={vol.photo}
                            alt={vol.name}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-[#0754C7]/30 bg-white"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#eaf3ff] dark:bg-[#19355e] flex items-center justify-center text-[#0754C7] dark:text-blue-300 ring-2 ring-[#0754C7]/25">
                            <User className="w-5 h-5" />
                          </div>
                        )}
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#0754C7] text-white font-mono text-[9px] flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-[#071C43] dark:text-white leading-tight truncate">
                          {vol.name}
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                          ساعات: {volHours} س • مبادرات: {volInitsCount}
                        </p>
                      </div>
                    </div>

                    <div className="text-left flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badge.color}`}>
                        {badge.label}
                      </span>
                      <span className="text-xs font-black font-mono text-[#0754C7] dark:text-blue-300 tabular-nums">
                        {vol.points || 0} نقطة
                      </span>
                    </div>
                  </div>
                );
              }) : (
                <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#142d50]/40 rounded-xl">
                  لا يوجد متطوعون مسجلون حالياً.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#1e3a66] text-xs text-slate-500 dark:text-slate-400 flex justify-between">
            <span>تحديث لوحة الشرف: تلقائي</span>
            <span>الفرسان المتميزون</span>
          </div>
        </div>

      </div>

      {/* 7. ROW 5: RECENT INITIATIVES + RECENT SYSTEM ACTIVITY LOGS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* RECENT INITIATIVES (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#0e213d] rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-[#1e3a66] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-black text-[#071C43] dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#0754C7] dark:text-blue-400" />
                  <span>آخر المبادرات والفرص التطوعية المعتمدة</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  قائمة بأحدث البرامج الميدانية المسجلة في النظام
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab && onNavigateTab('init')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#eaf3ff] dark:bg-blue-950/50 text-[#0754C7] dark:text-blue-300 font-bold text-xs hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer border border-blue-200 dark:border-blue-800"
              >
                <span>عرض جميع المبادرات</span>
                <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-0" />
              </button>
            </div>

            <div className="space-y-2.5">
              {recentInitiatives.length > 0 ? recentInitiatives.map((init, idx) => {
                const st = init.registrationStatus || (init as any).status;
                const statusBadge = st === 'open'
                  ? { label: "مفتوحة للتسجيل", color: "bg-[#eaf3ff] text-[#0754C7] border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800" }
                  : st === 'closed'
                  ? { label: "مغلقة", color: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-[#142d50] dark:text-slate-300 dark:border-[#244577]" }
                  : { label: "مؤرشفة", color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800" };
                const acceptedNum = Array.isArray(init.acceptedVolunteerIds) ? init.acceptedVolunteerIds.length : ((init as any).acceptedCount || 0);
                const neededNum = (init as any).neededCount || (init as any).requiredVolunteers || 0;

                return (
                  <div
                    key={init.id || idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-[#142d50]/50 border border-slate-100 dark:border-[#1e3a66] hover:border-[#0754C7]/40 transition-all"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${statusBadge.color}`}>
                          {statusBadge.label}
                        </span>
                        <h4 className="text-xs font-bold text-[#071C43] dark:text-white truncate">
                          {init.name || (init as any).title}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-3">
                        <span>المكان: {init.place || (init as any).location || 'العسيلة - مكة المكرمة'}</span>
                        <span>التاريخ: {formatDateArabic(init.date || (init as any).startDate)}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs shrink-0 font-mono tabular-nums">
                      <span className="text-[#0754C7] dark:text-blue-300 font-bold">
                        {acceptedNum}{neededNum > 0 ? ` / ${neededNum}` : ''}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">متطوع</span>
                    </div>
                  </div>
                );
              }) : (
                <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#142d50]/40 rounded-xl">
                  لا توجد مبادرات مسجلة حالياً.
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#1e3a66] text-xs text-slate-500 dark:text-slate-400 flex justify-between font-mono">
            <span>إجمالي المبادرات: {totalInitiativesCount}</span>
            <span>البرامج الإنسانية والمجتمعية</span>
          </div>
        </div>

        {/* RECENT SYSTEM AUDIT & ACTIVITY LOGS (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#0e213d] rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-[#1e3a66] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-black text-[#071C43] dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#0754C7] dark:text-blue-400" />
                  <span>آخر الأنشطة والعمليات</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  سجل التعديلات والعمليات الإدارية الحديثة
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab && onNavigateTab('logs')}
                className="text-xs font-bold text-[#0754C7] dark:text-blue-400 hover:underline cursor-pointer"
              >
                سجل العمليات
              </button>
            </div>

            <div className="space-y-2.5">
              {recentActivities.length > 0 ? recentActivities.map((act, idx) => (
                <div
                  key={act.id || idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#142d50]/50 border border-slate-100 dark:border-[#1e3a66] text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-[#0754C7] dark:bg-blue-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-[#071C43] dark:text-slate-100 truncate">
                        {act.action || act.notes || act.resource || "عملية نظام"}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        بواسطة: {act.user || act.userName || "الإدارة المركزية"}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 shrink-0 mr-2 tabular-nums">
                    {formatDateArabic(act.timestamp || act.date)}
                  </span>
                </div>
              )) : (
                <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#142d50]/40 rounded-xl flex flex-col items-center gap-2">
                  <FileText className="w-5 h-5 opacity-50" />
                  <span>لا توجد أنشطة مسجلة حديثاً.</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#1e3a66] text-xs text-slate-500 dark:text-slate-400 flex justify-between">
            <span>سجل التدقيق: نشط وموثق</span>
            <span>تتبع إلكتروني فوري</span>
          </div>
        </div>

      </div>

      {/* BENEFICIARIES REAL-TIME STATISTICS MODAL */}
      {isBeneficiaryStatsModalOpen && (
        <BeneficiariesStatisticsModal
          isOpen={isBeneficiaryStatsModalOpen}
          onClose={() => setIsBeneficiaryStatsModalOpen(false)}
          beneficiaries={data.beneficiaries || []}
          distributions={data.distributions || []}
          handoverRecords={data.distributionHandovers || []}
          currentUser={authenticatedUser}
          lang={lang}
        />
      )}

    </div>
  );
};
