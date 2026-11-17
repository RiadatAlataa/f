import React, { useState, useMemo } from "react";
import {
  Building2, Users, Calendar, HeartHandshake, Package, Boxes,
  TrendingUp, RefreshCw, Trophy, Clock, Activity, CheckCircle2,
  ArrowUpRight, ChevronLeft, BarChart3, Filter, User, Mail,
  ShieldCheck, Search, Wallet, Zap, FileText, Layers,
  UserPlus, HandHeart, FileSpreadsheet, FolderPlus
} from "lucide-react";
import charityHandoverHeroImg from "../assets/images/dashboard_charity_handover_hero_1794924254794.jpg";
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
    storeDonations?: any[];
    storeProjects?: any[];
    benefitRequests?: any[];
    requests?: any[];
    volunteerApplications?: any[];
    opportunityRequests?: any[];
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

type DonutMode = 'beneficiaries' | 'requests' | 'initiatives';

export const ExecutiveKpiDashboard: React.FC<ExecutiveKpiDashboardProps> = ({
  data,
  authenticatedUser,
  onNavigateTab,
  onRefreshData,
  lang = 'ar'
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBeneficiaryStatsModalOpen, setIsBeneficiaryStatsModalOpen] = useState(false);
  const [donutMode, setDonutMode] = useState<DonutMode>('beneficiaries');
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [lastRefreshedTime, setLastRefreshedTime] = useState<string>(() => {
    return new Date().toLocaleTimeString('ar-SA-u-nu-latn', { hour: '2-digit', minute: '2-digit', hour12: true });
  });

  // Handle manual refresh
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (onRefreshData) {
        await onRefreshData();
      }
      setLastRefreshedTime(new Date().toLocaleTimeString('ar-SA-u-nu-latn', { hour: '2-digit', minute: '2-digit', hour12: true }));
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

  // 1. Core Signature Metrics (Strictly Real Database Data)
  const totalBeneficiariesCount = scopedBeneficiaries.length;
  const approvedBeneficiariesCount = scopedBeneficiaries.filter(b => b.status === 'approved').length;
  const approvedBeneficiariesPct = totalBeneficiariesCount > 0
    ? Math.round((approvedBeneficiariesCount / totalBeneficiariesCount) * 100)
    : 0;

  // Donors & Donations
  const storeDonations = Array.isArray(data.storeDonations) ? data.storeDonations : [];
  const uniqueDonorsCount = useMemo(() => {
    const keys = new Set<string>();
    storeDonations.forEach((d: any) => {
      const key = (d.donorPhone || d.donorEmail || d.donorName || d.id || "").toString().trim();
      if (key) keys.add(key);
    });
    return keys.size || storeDonations.length;
  }, [storeDonations]);
  const totalDonatedAmount = useMemo(() => {
    return storeDonations.reduce((acc: number, d: any) => acc + (Number(d.amount) || 0), 0);
  }, [storeDonations]);

  // Projects & Initiatives
  const storeProjects = Array.isArray(data.storeProjects) ? data.storeProjects : [];
  const activeStoreProjectsCount = storeProjects.filter((p: any) => !p.status || p.status === 'active' || p.status === 'open').length;

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

  const activeProjectsDisplayCount = activeStoreProjectsCount + initiativesByStatus.open;

  const safeDivTotalInits = totalInitiativesCount > 0 ? totalInitiativesCount : 1;
  const openInitsPct = totalInitiativesCount > 0 ? Math.round((initiativesByStatus.open / safeDivTotalInits) * 100) : 0;
  const closedInitsPct = totalInitiativesCount > 0 ? Math.round((initiativesByStatus.closed / safeDivTotalInits) * 100) : 0;
  const archivedInitsPct = totalInitiativesCount > 0 ? Math.max(0, 100 - openInitsPct - closedInitsPct) : 0;

  // Aid Requests (benefitRequests + requests)
  const allBenefitRequests = Array.isArray(data.benefitRequests) ? data.benefitRequests : [];
  const allServiceRequests = Array.isArray(data.requests) ? data.requests : [];
  const combinedAidRequests = useMemo(() => [...allBenefitRequests, ...allServiceRequests], [allBenefitRequests, allServiceRequests]);
  const totalAidRequestsCount = combinedAidRequests.length;
  const pendingAidRequestsCount = combinedAidRequests.filter((r: any) => {
    const st = (r.status || '').toString().toLowerCase();
    return st === 'pending' || st === 'in_progress' || st === 'new' || st === 'under_review';
  }).length;
  const completedAidRequestsCount = combinedAidRequests.filter((r: any) => {
    const st = (r.status || '').toString().toLowerCase();
    return st === 'completed' || st === 'approved' || st === 'resolved';
  }).length;
  const otherAidRequestsCount = Math.max(0, totalAidRequestsCount - pendingAidRequestsCount - completedAidRequestsCount);

  // Volunteers
  const totalVolunteersCount = scopedVolunteers.length;
  const activeVolunteersCount = scopedVolunteers.filter(v => v.status === 'active').length;
  const activeVolunteersPct = totalVolunteersCount > 0
    ? Math.round((activeVolunteersCount / totalVolunteersCount) * 100)
    : 0;

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

  // 3. Inventory Summary
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

  // 4. Monthly Volunteer Growth (real dates)
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

  // 5. Attendance Breakdown
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

  // 6. Top 3 Knights
  const topKnights = useMemo(() => {
    const list = [...scopedVolunteers];
    return list
      .sort((a, b) => (b.points || 0) - (a.points || 0))
      .slice(0, 3);
  }, [scopedVolunteers]);

  // 7. Recent System Activity & Unified Operational Events
  const recentActivities = useMemo(() => {
    const unified: Array<{ id: string; title: string; actor: string; dateStr: string }> = [];

    [...(data.logs || []), ...(data.accessAuditLogs || [])].forEach((l: any, idx) => {
      const ds = l?.timestamp || l?.date;
      if (l && ds) {
        unified.push({
          id: l.id || `log-${idx}`,
          title: l.action || l.notes || l.resource || "عملية نظام موثقة",
          actor: l.user || l.userName || "الإدارة المركزية",
          dateStr: ds
        });
      }
    });

    storeDonations.slice(0, 3).forEach((d: any, idx) => {
      if (d?.createdAt) {
        unified.push({
          id: `don-act-${d.id || idx}`,
          title: `تم استلام تبرع بمبلغ ${(Number(d.amount) || 0).toLocaleString('en-US')} ريال`,
          actor: d.donorName || "متبرع كريم",
          dateStr: d.createdAt
        });
      }
    });

    combinedAidRequests.slice(0, 3).forEach((r: any, idx) => {
      const ds = r?.date || r?.createdAt;
      if (ds) {
        unified.push({
          id: `req-act-${r.id || idx}`,
          title: r.status === 'completed' || r.status === 'approved'
            ? `تم اعتماد طلب مساعدة (${r.beneficiaryName || 'مستفيد'})`
            : `طلب مساعدة جديد (${r.beneficiaryName || 'مستفيد'})`,
          actor: r.beneficiaryName || "قسم الرعاية",
          dateStr: ds
        });
      }
    });

    return unified
      .sort((a, b) => new Date(b.dateStr).getTime() - new Date(a.dateStr).getTime())
      .slice(0, 5);
  }, [data.logs, data.accessAuditLogs, storeDonations, combinedAidRequests]);

  // 8. Recent Initiatives List
  const recentInitiatives = useMemo(() => {
    const list = [...scopedInitiatives];
    return list
      .filter(i => i && (i.date || (i as any).startDate))
      .sort((a, b) => new Date(b.date || (b as any).startDate).getTime() - new Date(a.date || (a as any).startDate).getTime())
      .slice(0, 5);
  }, [scopedInitiatives]);

  // Primary 3x2 Quick Access Buttons (Directly matching Reference Bento Grid)
  const primaryQuickActions = useMemo(() => {
    const items = [
      { id: 'beneficiaries', label: 'إضافة مستفيد', icon: UserPlus, iconColor: 'text-[#0754C7] dark:text-sky-300', bgTint: 'bg-[#E8F3FF] dark:bg-[#133261]' },
      { id: 'store_finance', label: 'تسجيل تبرع', icon: HandHeart, iconColor: 'text-teal-700 dark:text-teal-300', bgTint: 'bg-[#E4F6F4] dark:bg-[#0D3847]' },
      { id: 'init', label: 'إنشاء مشروع', icon: FolderPlus, iconColor: 'text-amber-700 dark:text-amber-300', bgTint: 'bg-[#FDF2DF] dark:bg-[#2F2A3E]' },
      { id: 'support', label: 'طلب مساعدة', icon: FileText, iconColor: 'text-violet-700 dark:text-violet-300', bgTint: 'bg-[#ECE9FE] dark:bg-[#232252]' },
      { id: 'logs', label: 'إصدار تقرير', icon: FileSpreadsheet, iconColor: 'text-emerald-700 dark:text-emerald-300', bgTint: 'bg-[#E3F5F1] dark:bg-[#0E3645]' },
      { id: 'users_mgmt', label: 'إضافة مستخدم', icon: ShieldCheck, iconColor: 'text-[#071C43] dark:text-blue-300', bgTint: 'bg-slate-100 dark:bg-[#162E57]' }
    ];
    return items.filter(item => isTabAllowed(item.id));
  }, [authenticatedUser]);

  // Extended Shortcuts Strip (Preserving all remaining quick access items)
  const extendedQuickAccessItems = useMemo(() => {
    const items = [
      { id: 'distributions', label: 'تسليم المساعدات', count: totalDistributionsCount, icon: Package },
      { id: 'vols', label: 'سجل المتطوعين', count: totalVolunteersCount, icon: Users },
      { id: 'inventory', label: 'المستودع والمخزون', count: totalInventoryItemsCount, icon: Boxes },
      { id: 'deps', label: 'الإدارات والهيكل', count: totalDepartmentsCount, icon: Building2 },
      { id: 'letters', label: 'الخطابات', count: (data.letters || []).length, icon: Mail },
      { id: 'enterprise_finance', label: 'الإدارة المالية', count: null, icon: Wallet },
      { id: 'globalsearch', label: 'البحث الشامل', count: null, icon: Search }
    ];
    return items.filter(item => isTabAllowed(item.id));
  }, [totalDistributionsCount, totalVolunteersCount, totalInventoryItemsCount, totalDepartmentsCount, data.letters, authenticatedUser]);

  // Donut Dataset Computation
  const donutConfig = useMemo(() => {
    if (donutMode === 'requests') {
      const total = totalAidRequestsCount;
      const segments = [
        { label: 'معتمدة / مكتملة', count: completedAidRequestsCount, color: '#22C55E' },
        { label: 'قيد المراجعة', count: pendingAidRequestsCount, color: '#F59E0B' },
        { label: 'طلبات أخرى', count: otherAidRequestsCount, color: '#0875E1' }
      ];
      return { total, centerUnit: 'طلب', segments };
    }

    if (donutMode === 'initiatives') {
      const total = totalInitiativesCount;
      const segments = [
        { label: 'مفتوحة للتسجيل', count: initiativesByStatus.open, color: '#0875E1' },
        { label: 'مغلقة / تنفيذ', count: initiativesByStatus.closed, color: '#F59E0B' },
        { label: 'مؤرشفة ومكتملة', count: initiativesByStatus.archived, color: '#22C55E' }
      ];
      return { total, centerUnit: 'مبادرة', segments };
    }

    // Default: Beneficiaries breakdown (social status categories when populated, otherwise verified care status & residency breakdown)
    const { married, widows, divorced, orphans, single, citizens, receivedCount, notReceivedCount } = beneficiariesStatsBreakdown;
    const socialSum = married + widows + divorced + orphans + single;
    const segments = socialSum > 0
      ? [
          { label: 'متزوجون', count: married, color: '#0875E1' },
          { label: 'أرامل', count: widows, color: '#7C3AED' },
          { label: 'مطلقون', count: divorced, color: '#F59E0B' },
          { label: 'أيتام', count: orphans, color: '#22C55E' },
          { label: 'عزاب', count: single, color: '#06B6D4' }
        ]
      : [
          { label: 'ملفات معتمدة', count: approvedBeneficiariesCount, color: '#0875E1' },
          { label: 'استلموا مساعدات', count: receivedCount, color: '#22C55E' },
          { label: 'بانتظار الصرف', count: notReceivedCount, color: '#F59E0B' },
          { label: 'مواطنون سعوديون', count: citizens, color: '#7C3AED' }
        ];
    return {
      total: totalBeneficiariesCount,
      sumForPct: socialSum > 0 ? socialSum : totalBeneficiariesCount,
      centerUnit: 'مستفيد',
      segments
    };
  }, [
    donutMode,
    totalAidRequestsCount,
    completedAidRequestsCount,
    pendingAidRequestsCount,
    otherAidRequestsCount,
    totalInitiativesCount,
    initiativesByStatus,
    beneficiariesStatsBreakdown,
    approvedBeneficiariesCount,
    totalBeneficiariesCount
  ]);

  const donutRenderData = useMemo(() => {
    const segs = donutConfig.segments;
    const denom = segs.reduce((acc, s) => acc + s.count, 0);
    const radius = 50;
    const circumference = 2 * Math.PI * radius;

    let cumulativePct = 0;
    const arcs = segs.map((seg) => {
      const pct = denom > 0 ? Math.round((seg.count / denom) * 100) : 0;
      const exactRatio = denom > 0 ? seg.count / denom : 0;
      const dashLength = exactRatio * circumference;
      const dashOffset = -cumulativePct * circumference;
      cumulativePct += exactRatio;
      return {
        ...seg,
        pct,
        dashArray: `${dashLength} ${circumference}`,
        dashOffset
      };
    });

    return { radius, circumference, denom, arcs };
  }, [donutConfig]);

  // Helpers
  const formatDateArabic = (dateStr?: string) => {
    if (!dateStr) return "اليوم";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('ar-SA-u-nu-latn', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatRelativeArabicTime = (dateStr?: string) => {
    if (!dateStr) return "حديثاً";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const diffMs = Date.now() - d.getTime();
      if (diffMs < 0) return formatDateArabic(dateStr);
      const mins = Math.floor(diffMs / 60000);
      if (mins < 2) return "الآن";
      if (mins < 60) return `منذ ${mins} دقيقة`;
      const hours = Math.floor(mins / 60);
      if (hours === 1) return "منذ ساعة";
      if (hours === 2) return "منذ ساعتين";
      if (hours < 24) return `منذ ${hours} ساعات`;
      const days = Math.floor(hours / 24);
      if (days === 1) return "منذ يوم";
      if (days <= 7) return `منذ ${days} أيام`;
      return formatDateArabic(dateStr);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-5 select-text" dir="rtl">

      {/* 1. EXECUTIVE HERO BANNER (Official Seal + License Badge + "معًا .. لنُحدث أثرًا" + Seamless Charity Handover Photo) */}
      <section className="relative rounded-2xl overflow-hidden bg-gradient-to-l from-[#061838] via-[#0B2D6D] to-[#114292] text-white shadow-lg border border-[#1E4380]/60">
        {/* Seamless left-side donation handover visual */}
        {!heroImgFailed && (
          <div
            className="hidden lg:block absolute inset-y-0 left-0 w-[38%] xl:w-[36%] pointer-events-none select-none overflow-hidden"
            style={{
              maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 35%, rgba(0,0,0,0.4) 72%, rgba(0,0,0,0) 100%)',
              WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 35%, rgba(0,0,0,0.4) 72%, rgba(0,0,0,0) 100%)'
            }}
          >
            <img
              src={charityHandoverHeroImg}
              alt=""
              aria-hidden="true"
              referrerPolicy="no-referrer"
              onError={() => setHeroImgFailed(true)}
              className="w-full h-full object-cover object-center opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#061838]/65 via-transparent to-[#061838]/30" />
          </div>
        )}

        <div className="relative z-10 px-5 sm:px-7 py-5 sm:py-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          {/* Right + Center Content Group */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 flex-1 min-w-0">
            {/* Seal + Association Name + Warm Gold License Pill */}
            <div className="flex items-center gap-3.5 shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white p-1.5 shadow-lg ring-2 ring-[#E5C158]/60 flex items-center justify-center shrink-0 overflow-hidden">
                <img
                  src="/logo.png"
                  alt="شعار جمعية ريادة العطاء لخدمة الإنسان بالعسيلة"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="space-y-1.5 min-w-0">
                <h2 className="text-sm sm:text-base lg:text-[17px] font-black text-white leading-snug font-lyon association-brand-text max-w-[235px]">
                  {data.homeSettings?.associationNameAr || "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة"}
                </h2>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#F3D77A] text-[#071C43] text-[11px] sm:text-xs font-black shadow-xs font-sans tabular-nums whitespace-nowrap">
                  <span>رقم الترخيص: {data.homeSettings?.licenseNumber || "1000888600"}</span>
                </div>
              </div>
            </div>

            {/* Subtle vertical rule */}
            <div className="hidden sm:block h-14 w-px bg-white/25 shrink-0" />

            {/* Core Mission Headline */}
            <div className="space-y-1 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-[28px] font-black text-white tracking-tight leading-tight">
                معًا .. لنُحدث أثرًا
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-blue-100/90 leading-relaxed">
                في خدمة الإنسان ودعم المحتاجين
              </p>
              {!isSuperAdmin && (
                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-400/20 text-amber-100 border border-amber-300/30">
                  <Filter className="w-3 h-3" />
                  <span>نطاق الصلاحيات المعتمد</span>
                </span>
              )}
            </div>
          </div>

          {/* Left Refresh Control (Compact Glass Pill over dark/image corner) */}
          <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between w-full lg:w-auto gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/15">
            <button
              type="button"
              id="btn-kpi-refresh"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/95 text-[#071C43] hover:bg-white font-black text-xs transition-all shadow-md cursor-pointer disabled:opacity-60 whitespace-nowrap"
              title="إعادة جلب ومزامنة أحدث الإحصائيات من قاعدة البيانات"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#0754C7] ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'جارٍ التحديث...' : 'تحديث المؤشرات'}</span>
            </button>

            <span className="inline-flex items-center gap-1.5 text-[11px] text-blue-100 bg-[#061838]/75 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-white/15 font-sans tabular-nums whitespace-nowrap">
              <Clock className="w-3 h-3 text-sky-300" />
              <span>آخر مزامنة: {lastRefreshedTime}</span>
            </span>
          </div>
        </div>
      </section>

      {/* 2. THE 5 SIGNATURE PASTEL-TINTED KPI STAT CARDS ROW (Strictly Real Data) */}
      <section aria-label="المؤشرات الإحصائية الرئيسية" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">

        {/* CARD 1: إجمالي المستفيدين (Sky Ice) */}
        <button
          type="button"
          id="kpi-card-beneficiaries"
          onClick={() => onNavigateTab && onNavigateTab('beneficiaries')}
          className="text-right rounded-2xl p-4 sm:p-5 bg-[#E8F3FF] dark:bg-[#0D2854] border border-[#CFE4FC] dark:border-[#1E447E] shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col justify-between min-h-[122px]"
        >
          <div className="flex items-center justify-between gap-2 w-full">
            <span className="text-xs sm:text-[13px] font-extrabold text-[#071C43] dark:text-slate-100">
              إجمالي المستفيدين
            </span>
            <div className="w-10 h-10 rounded-xl bg-white/80 dark:bg-[#14376E] text-[#0754C7] dark:text-sky-300 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3 flex items-baseline justify-between gap-2 w-full">
            <span className="text-2xl sm:text-[30px] font-black text-[#071C43] dark:text-white tracking-tight font-sans tabular-nums leading-none">
              {totalBeneficiariesCount.toLocaleString('en-US')}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-white/85 dark:bg-[#071C43]/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-700/60 tabular-nums whitespace-nowrap">
              {approvedBeneficiariesCount} معتمد ({approvedBeneficiariesPct}%)
            </span>
          </div>
        </button>

        {/* CARD 2: إجمالي المتبرعين (Mint Ice) */}
        <button
          type="button"
          id="kpi-card-donors"
          onClick={() => onNavigateTab && onNavigateTab('store_finance')}
          className="text-right rounded-2xl p-4 sm:p-5 bg-[#E4F6F4] dark:bg-[#0D2E42] border border-[#C7EBE6] dark:border-[#1B4A62] shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col justify-between min-h-[122px]"
        >
          <div className="flex items-center justify-between gap-2 w-full">
            <span className="text-xs sm:text-[13px] font-extrabold text-[#071C43] dark:text-slate-100">
              إجمالي المتبرعين
            </span>
            <div className="w-10 h-10 rounded-xl bg-white/80 dark:bg-[#13425C] text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              <HeartHandshake className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3 flex items-baseline justify-between gap-2 w-full">
            <span className="text-2xl sm:text-[30px] font-black text-[#071C43] dark:text-white tracking-tight font-sans tabular-nums leading-none">
              {uniqueDonorsCount.toLocaleString('en-US')}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-white/85 dark:bg-[#071C43]/70 text-teal-700 dark:text-teal-300 border border-teal-200/80 dark:border-teal-700/60 tabular-nums whitespace-nowrap">
              {totalDonatedAmount > 0 ? `${totalDonatedAmount.toLocaleString('en-US')} ر.س` : `${storeDonations.length} مساهمة`}
            </span>
          </div>
        </button>

        {/* CARD 3: المشاريع النشطة (Warm Cream) */}
        <button
          type="button"
          id="kpi-card-projects"
          onClick={() => onNavigateTab && onNavigateTab('init')}
          className="text-right rounded-2xl p-4 sm:p-5 bg-[#FDF2DF] dark:bg-[#1F2442] border border-[#F5E0BA] dark:border-[#393E6A] shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col justify-between min-h-[122px]"
        >
          <div className="flex items-center justify-between gap-2 w-full">
            <span className="text-xs sm:text-[13px] font-extrabold text-[#071C43] dark:text-slate-100">
              المشاريع النشطة
            </span>
            <div className="w-10 h-10 rounded-xl bg-white/80 dark:bg-[#2C3158] text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3 flex items-baseline justify-between gap-2 w-full">
            <span className="text-2xl sm:text-[30px] font-black text-[#071C43] dark:text-white tracking-tight font-sans tabular-nums leading-none">
              {activeProjectsDisplayCount.toLocaleString('en-US')}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-white/85 dark:bg-[#071C43]/70 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-700/60 tabular-nums whitespace-nowrap">
              {activeStoreProjectsCount} متجر · {totalInitiativesCount} مبادرة
            </span>
          </div>
        </button>

        {/* CARD 4: طلبات المساعدة (Soft Lavender) */}
        <button
          type="button"
          id="kpi-card-requests"
          onClick={() => onNavigateTab && onNavigateTab('beneficiaries')}
          className="text-right rounded-2xl p-4 sm:p-5 bg-[#ECE9FE] dark:bg-[#17214C] border border-[#D8D1FC] dark:border-[#2C3B7A] shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col justify-between min-h-[122px]"
        >
          <div className="flex items-center justify-between gap-2 w-full">
            <span className="text-xs sm:text-[13px] font-extrabold text-[#071C43] dark:text-slate-100">
              طلبات المساعدة
            </span>
            <div className="w-10 h-10 rounded-xl bg-white/80 dark:bg-[#223069] text-violet-700 dark:text-violet-300 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3 flex items-baseline justify-between gap-2 w-full">
            <span className="text-2xl sm:text-[30px] font-black text-[#071C43] dark:text-white tracking-tight font-sans tabular-nums leading-none">
              {totalAidRequestsCount.toLocaleString('en-US')}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-white/85 dark:bg-[#071C43]/70 text-violet-700 dark:text-violet-300 border border-violet-200/80 dark:border-violet-700/60 tabular-nums whitespace-nowrap">
              {pendingAidRequestsCount > 0 ? `${pendingAidRequestsCount} قيد المعالجة` : `${completedAidRequestsCount} منجز`}
            </span>
          </div>
        </button>

        {/* CARD 5: إجمالي المتطوعين (Aqua Mint) */}
        <button
          type="button"
          id="kpi-card-volunteers"
          onClick={() => onNavigateTab && onNavigateTab('vols')}
          className="text-right rounded-2xl p-4 sm:p-5 bg-[#E3F5F1] dark:bg-[#0D2F45] border border-[#C6EAE2] dark:border-[#1C4C69] shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col justify-between min-h-[122px] sm:col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between gap-2 w-full">
            <span className="text-xs sm:text-[13px] font-extrabold text-[#071C43] dark:text-slate-100">
              إجمالي المتطوعين
            </span>
            <div className="w-10 h-10 rounded-xl bg-white/80 dark:bg-[#134361] text-cyan-700 dark:text-cyan-300 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3 flex items-baseline justify-between gap-2 w-full">
            <span className="text-2xl sm:text-[30px] font-black text-[#071C43] dark:text-white tracking-tight font-sans tabular-nums leading-none">
              {totalVolunteersCount.toLocaleString('en-US')}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-white/85 dark:bg-[#071C43]/70 text-cyan-700 dark:text-cyan-300 border border-cyan-200/80 dark:border-cyan-700/60 tabular-nums whitespace-nowrap">
              {activeVolunteersCount} نشط ({activeVolunteersPct}%)
            </span>
          </div>
        </button>
      </section>

      {/* Secondary Slim Operational KPIs Strip (Preserving Departments, Distributions & Inventory counts) */}
      <section aria-label="المؤشرات التشغيلية المساندة" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => onNavigateTab && onNavigateTab('deps')}
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white dark:bg-[#0D1E3E] border border-slate-200/90 dark:border-[#1E3A66] hover:border-[#0754C7] transition-all text-right cursor-pointer group shadow-2xs"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#142D50] text-[#071C43] dark:text-sky-300 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-extrabold text-[#071C43] dark:text-white block truncate">الإدارات التنفيذية</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">فرق تابعة: {scopedTeams.length}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-lg font-black text-[#071C43] dark:text-white font-sans tabular-nums">{totalDepartmentsCount}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0754C7] transition-colors" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab && onNavigateTab('distributions')}
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white dark:bg-[#0D1E3E] border border-slate-200/90 dark:border-[#1E3A66] hover:border-emerald-500 transition-all text-right cursor-pointer group shadow-2xs"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <Package className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-extrabold text-[#071C43] dark:text-white block truncate">المساعدات المصروفة</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">حملات: {totalDistributionsCount} • استلام: {totalHandoversCount}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-lg font-black text-[#071C43] dark:text-white font-sans tabular-nums">{totalAidDispatches}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab && onNavigateTab('inventory')}
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white dark:bg-[#0D1E3E] border border-slate-200/90 dark:border-[#1E3A66] hover:border-amber-500 transition-all text-right cursor-pointer group shadow-2xs"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <Boxes className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-extrabold text-[#071C43] dark:text-white block truncate">الأصناف والمخزون</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">الرصيد: {totalStockUnits.toLocaleString('en-US')} وحدة</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-lg font-black text-[#071C43] dark:text-white font-sans tabular-nums">{totalInventoryItemsCount}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 transition-colors" />
          </div>
        </button>
      </section>

      {/* 3. ASYMMETRIC 3-COLUMN BENTO GRID: وصول سريع | آخر الأنشطة | إحصائيات سريعة */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* COLUMN 1 (Right in RTL): وصول سريع (3x2 Quick Action Grid + Extended Links) */}
        <div className="lg:col-span-4 bg-white dark:bg-[#0D1E3E] rounded-2xl p-5 border border-slate-200/90 dark:border-[#1E3A66] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100 dark:border-[#1A315A]">
              <h2 className="text-sm sm:text-base font-black text-[#071C43] dark:text-white flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#E8F3FF] dark:bg-[#163160] text-[#0754C7] dark:text-sky-300 flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </span>
                <span>وصول سريع</span>
              </h2>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">إجراءات فورية</span>
            </div>

            {primaryQuickActions.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {primaryQuickActions.map(action => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={`${action.id}-${action.label}`}
                      type="button"
                      id={`quick-access-${action.id}`}
                      onClick={() => onNavigateTab && onNavigateTab(action.id)}
                      className="flex flex-col items-center justify-center gap-2.5 p-3.5 rounded-xl bg-slate-50/90 dark:bg-[#11264D] hover:bg-[#EAF3FF] dark:hover:bg-[#183468] border border-slate-200/80 dark:border-[#1E3E75] hover:border-[#0754C7] transition-all cursor-pointer group text-center min-h-[96px]"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${action.bgTint} ${action.iconColor}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-extrabold text-[#071C43] dark:text-white leading-tight">
                        {action.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#11264D] rounded-xl">
                لا توجد اختصارات مخولة لهذا الحساب.
              </div>
            )}
          </div>

          {/* Extended shortcuts strip preserving every remaining shortcut */}
          {extendedQuickAccessItems.length > 0 && (
            <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-[#1A315A]">
              <div className="flex flex-wrap items-center gap-1.5">
                {extendedQuickAccessItems.map(ext => {
                  const Icon = ext.icon;
                  return (
                    <button
                      key={ext.id}
                      type="button"
                      onClick={() => onNavigateTab && onNavigateTab(ext.id)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#11264D] hover:bg-[#EAF3FF] dark:hover:bg-[#173366] text-[#071C43] dark:text-slate-200 border border-slate-200/80 dark:border-[#1E3E75] hover:border-[#0754C7] text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      <Icon className="w-3.5 h-3.5 text-[#0754C7] dark:text-sky-300 shrink-0" />
                      <span className="whitespace-nowrap">{ext.label}</span>
                      {ext.count !== null && (
                        <span className="text-[10px] font-sans text-slate-500 dark:text-slate-400 tabular-nums">({ext.count})</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* COLUMN 2 (Middle): آخر الأنشطة (Live Activity Timeline) */}
        <div className="lg:col-span-4 bg-white dark:bg-[#0D1E3E] rounded-2xl p-5 border border-slate-200/90 dark:border-[#1E3A66] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 pb-3 mb-3.5 border-b border-slate-100 dark:border-[#1A315A]">
              <h2 className="text-sm sm:text-base font-black text-[#071C43] dark:text-white flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#E8F3FF] dark:bg-[#163160] text-[#0754C7] dark:text-sky-300 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </span>
                <span>آخر الأنشطة</span>
              </h2>
              <button
                type="button"
                onClick={() => onNavigateTab && onNavigateTab('logs')}
                className="text-xs font-bold text-[#0754C7] dark:text-sky-300 hover:underline cursor-pointer"
              >
                سجل العمليات
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-[#1A315A]">
              {recentActivities.length > 0 ? recentActivities.map((act, idx) => (
                <div
                  key={act.id || idx}
                  className="py-3 first:pt-1 last:pb-1 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-[13px] font-bold text-[#071C43] dark:text-white truncate">
                        {act.title}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {act.actor}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 shrink-0 whitespace-nowrap tabular-nums">
                    {formatRelativeArabicTime(act.dateStr)}
                  </span>
                </div>
              )) : (
                <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400 flex flex-col items-center gap-2">
                  <Activity className="w-5 h-5 opacity-50" />
                  <span>لا توجد أنشطة مسجلة حديثاً.</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#1A315A] text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>سجل التدقيق موثق ومرتبط آلياً</span>
            <span className="font-sans text-[#0754C7] dark:text-sky-300 font-bold tabular-nums">{recentActivities.length} تحديث</span>
          </div>
        </div>

        {/* COLUMN 3 (Left in RTL): إحصائيات سريعة (Interactive SVG Multi-Segment Donut Chart) */}
        <div className="lg:col-span-4 bg-white dark:bg-[#0D1E3E] rounded-2xl p-5 border border-slate-200/90 dark:border-[#1E3A66] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3.5 border-b border-slate-100 dark:border-[#1A315A]">
              <h2 className="text-sm sm:text-base font-black text-[#071C43] dark:text-white flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#E8F3FF] dark:bg-[#163160] text-[#0754C7] dark:text-sky-300 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4" />
                </span>
                <span>إحصائيات سريعة</span>
              </h2>

              {/* Segmented Dataset Switcher */}
              <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-[#11264D] border border-slate-200 dark:border-[#1E3E75]">
                {([
                  { id: 'beneficiaries', label: 'المستفيدون' },
                  { id: 'requests', label: 'الطلبات' },
                  { id: 'initiatives', label: 'المبادرات' }
                ] as const).map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDonutMode(tab.id)}
                    className={`px-2 py-1 rounded-md text-[10px] font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                      donutMode === tab.id
                        ? 'bg-[#0754C7] text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-[#071C43] dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Donut + Legend Container */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
              {/* Right side: Category Legend */}
              <div className="w-full sm:flex-1 space-y-2.5 min-w-0">
                {donutRenderData.arcs.map((seg, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: seg.color }}
                      />
                      <span className="font-bold text-[#071C43] dark:text-slate-200 truncate">
                        {seg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-sans tabular-nums shrink-0">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        ({seg.count})
                      </span>
                      <span className="font-black text-[#071C43] dark:text-white min-w-[34px] text-left">
                        {seg.pct}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Left side: Crisp Geometric SVG Donut Ring */}
              <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
                  <circle
                    cx="70"
                    cy="70"
                    r={donutRenderData.radius}
                    fill="none"
                    className="stroke-slate-100 dark:stroke-[#16305C]"
                    strokeWidth="22"
                  />
                  {donutRenderData.denom > 0 && donutRenderData.arcs.map((arc, idx) => (
                    arc.count > 0 ? (
                      <circle
                        key={idx}
                        cx="70"
                        cy="70"
                        r={donutRenderData.radius}
                        fill="none"
                        stroke={arc.color}
                        strokeWidth="22"
                        strokeDasharray={arc.dashArray}
                        strokeDashoffset={arc.dashOffset}
                        strokeLinecap="butt"
                        className="transition-all duration-500"
                      />
                    ) : null
                  ))}
                </svg>

                {/* Center Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-2xl font-black text-[#071C43] dark:text-white font-sans tabular-nums leading-none">
                    {donutConfig.total.toLocaleString('en-US')}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-300 mt-1">
                    {donutConfig.centerUnit}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#1A315A] flex items-center justify-between text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">توزيع نسبي حي من قاعدة البيانات</span>
            <button
              type="button"
              onClick={() => setIsBeneficiaryStatsModalOpen(true)}
              className="font-bold text-[#0754C7] dark:text-sky-300 hover:underline cursor-pointer"
            >
              التقرير التفصيلي
            </button>
          </div>
        </div>

      </section>

      {/* 4. BELOW-THE-FOLD CHARTS ROW: VOLUNTEER GROWTH CHART + INITIATIVE STATUS BREAKDOWN (Preserved 100%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* CHART 1: نمو وتسجيل المتطوعين حسب الأشهر (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#0D1E3E] rounded-2xl p-5 sm:p-6 border border-slate-200/90 dark:border-[#1E3A66] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-black text-[#071C43] dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#0754C7] dark:text-sky-300" />
                  <span>حركة ونمو المتطوعين (آخر 7 أشهر)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  تطور تسجيل واعتماد المتطوعين الفعلي من سجلات قاعدة البيانات
                </p>
              </div>
              <span className="text-xs font-bold text-[#0754C7] dark:text-sky-200 bg-[#E8F3FF] dark:bg-[#133261] px-2.5 py-1 rounded-lg border border-blue-200/80 dark:border-blue-800/70 self-start sm:self-auto font-sans tabular-nums">
                إجمالي نشط: {totalVolunteersCount} متطوع
              </span>
            </div>

            {/* Interactive Bar Visualization */}
            <div className="mt-4 pt-2">
              <div className="h-44 sm:h-52 w-full flex items-end gap-2 sm:gap-4 px-2 border-b border-slate-100 dark:border-[#1E3A66]">
                {monthlyVolunteerGrowth.map((item, idx) => {
                  const maxVal = Math.max(...monthlyVolunteerGrowth.map(m => m.cumulative), 1);
                  const barHeight = item.cumulative > 0 ? Math.max(12, Math.round((item.cumulative / maxVal) * 100)) : 6;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                      <div className="text-[11px] font-sans font-bold text-slate-500 dark:text-slate-400 group-hover:text-[#0754C7] dark:group-hover:text-sky-300 transition-colors tabular-nums">
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

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#1E3A66] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-xs bg-[#0754C7]" />
              <span>النمو التراكمي الفعلي للمتطوعين</span>
            </div>
            <span>المصدر: سجل المتطوعين المعتمد</span>
          </div>
        </div>

        {/* CHART 2: توزيع حالات المبادرات والفرص التطوعية (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#0D1E3E] rounded-2xl p-5 sm:p-6 border border-slate-200/90 dark:border-[#1E3A66] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-black text-[#071C43] dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#0754C7] dark:text-sky-300" />
                  <span>المبادرات والفرص التطوعية</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  توزيع {totalInitiativesCount} مبادرة وفق الحالات الفعلية المعتمدة
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab && onNavigateTab('init')}
                className="text-xs font-bold text-[#0754C7] dark:text-sky-300 hover:underline cursor-pointer"
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
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#E8F3FF]/80 dark:bg-[#122D59] border border-blue-100 dark:border-blue-900/50">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-[#0754C7]" />
                    <div>
                      <p className="text-xs font-bold text-[#071C43] dark:text-slate-100">نشطة ومفتوحة للتسجيل</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">جاهزة لاستقبال المتطوعين</p>
                    </div>
                  </div>
                  <div className="text-left font-sans tabular-nums">
                    <span className="text-base font-black text-[#0754C7] dark:text-sky-300">{initiativesByStatus.open}</span>
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
                  <div className="text-left font-sans tabular-nums">
                    <span className="text-base font-black text-slate-700 dark:text-slate-200">{initiativesByStatus.closed}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mr-1.5">({closedInitsPct}%)</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-[#E3F5F1]/80 dark:bg-emerald-950/35 border border-emerald-100 dark:border-emerald-900/40">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <div>
                      <p className="text-xs font-bold text-[#071C43] dark:text-slate-200">مؤرشفة ومكتملة التقييم</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">تم احتساب الساعات والشهادات</p>
                    </div>
                  </div>
                  <div className="text-left font-sans tabular-nums">
                    <span className="text-base font-black text-emerald-700 dark:text-emerald-400">{initiativesByStatus.archived}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mr-1.5">({archivedInitsPct}%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#1E3A66] text-[11px] text-slate-500 dark:text-slate-400 flex justify-between font-sans tabular-nums">
            <span>الإجمالي الكلي: {totalInitiativesCount} مبادرة</span>
            <span>المفتوحة: {initiativesByStatus.open}</span>
          </div>
        </div>

      </div>

      {/* 5. ROW 3: BENEFICIARY SERVICES + INVENTORY & WAREHOUSE STATUS (Preserved 100%) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* SECTION: خدمات المستفيدين ورعاية الأسر */}
        <div className="bg-white dark:bg-[#0D1E3E] rounded-2xl p-5 sm:p-6 border border-slate-200/90 dark:border-[#1E3A66] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-black text-[#071C43] dark:text-white flex items-center gap-2">
                  <HeartHandshake className="w-4 h-4 text-[#0754C7] dark:text-sky-300" />
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
                  className="px-2.5 py-1 bg-[#E8F3FF] dark:bg-[#133261] hover:bg-blue-100 dark:hover:bg-blue-900/60 text-[#0754C7] dark:text-sky-200 rounded-lg text-xs font-bold transition-all border border-blue-200 dark:border-blue-800 cursor-pointer flex items-center gap-1"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>الإحصائيات التفصيلية</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab && onNavigateTab('beneficiaries')}
                  className="text-xs font-bold text-[#0754C7] dark:text-sky-300 hover:underline cursor-pointer"
                >
                  إدارة المستفيدين
                </button>
              </div>
            </div>

            {/* Core Counts Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-2">
              <div className="p-3 bg-slate-50 dark:bg-[#142d50]/60 rounded-xl text-center border border-slate-100 dark:border-[#1e3a66]">
                <span className="text-xl font-black text-[#071C43] dark:text-white block font-sans tabular-nums">{totalBeneficiariesCount}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">إجمالي المستفيدين</span>
              </div>
              <div className="p-3 bg-[#E8F3FF] dark:bg-blue-950/40 rounded-xl text-center border border-blue-100 dark:border-blue-800">
                <span className="text-xl font-black text-[#0754C7] dark:text-sky-300 block font-sans tabular-nums">{approvedBeneficiariesCount}</span>
                <span className="text-[10px] text-slate-600 dark:text-slate-300 font-bold">ملفات معتمدة</span>
              </div>
              <div className="p-3 bg-[#E3F5F1] dark:bg-emerald-950/40 rounded-xl text-center border border-emerald-100 dark:border-emerald-800">
                <span className="text-xl font-black text-emerald-700 dark:text-emerald-400 block font-sans tabular-nums">{beneficiariesStatsBreakdown.receivedCount}</span>
                <span className="text-[10px] text-slate-600 dark:text-slate-300 font-bold">استلموا مساعدات</span>
              </div>
              <div className="p-3 bg-[#FDF2DF] dark:bg-amber-950/40 rounded-xl text-center border border-amber-100 dark:border-amber-800">
                <span className="text-xl font-black text-amber-700 dark:text-amber-400 block font-sans tabular-nums">{beneficiariesStatsBreakdown.notReceivedCount}</span>
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
                  <strong className="font-sans text-[#071C43] dark:text-white tabular-nums">{beneficiariesStatsBreakdown.married}</strong>
                </div>
                <div className="p-1.5 bg-white dark:bg-[#081426] rounded-lg border border-slate-200/60 dark:border-[#1e3a66]">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">عزاب</span>
                  <strong className="font-sans text-[#071C43] dark:text-white tabular-nums">{beneficiariesStatsBreakdown.single}</strong>
                </div>
                <div className="p-1.5 bg-white dark:bg-[#081426] rounded-lg border border-slate-200/60 dark:border-[#1e3a66]">
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 block">أرامل</span>
                  <strong className="font-sans text-purple-800 dark:text-purple-200 tabular-nums">{beneficiariesStatsBreakdown.widows}</strong>
                </div>
                <div className="p-1.5 bg-white dark:bg-[#081426] rounded-lg border border-slate-200/60 dark:border-[#1e3a66]">
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 block">مطلقون</span>
                  <strong className="font-sans text-amber-800 dark:text-amber-200 tabular-nums">{beneficiariesStatsBreakdown.divorced}</strong>
                </div>
                <div className="p-1.5 bg-rose-50 dark:bg-rose-950/50 rounded-lg border border-rose-200 dark:border-rose-900">
                  <span className="text-[10px] text-rose-700 dark:text-rose-400 block font-bold">أيتام</span>
                  <strong className="font-sans text-rose-900 dark:text-rose-200 tabular-nums">{beneficiariesStatsBreakdown.orphans}</strong>
                </div>
                <div className="p-1.5 bg-[#E8F3FF] dark:bg-blue-950/50 rounded-lg border border-blue-200 dark:border-blue-900">
                  <span className="text-[10px] text-[#0754C7] dark:text-sky-300 block font-bold">سعوديون</span>
                  <strong className="font-sans text-[#071C43] dark:text-blue-200 tabular-nums">{beneficiariesStatsBreakdown.citizens}</strong>
                </div>
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
              <span>المقيمون: <strong className="font-sans text-[#071C43] dark:text-slate-200 tabular-nums">{beneficiariesStatsBreakdown.residents}</strong> | أبناء المواطنات: <strong className="font-sans text-[#071C43] dark:text-slate-200 tabular-nums">{beneficiariesStatsBreakdown.childrenOfCitizens}</strong></span>
              <span>حملات مكتملة: <strong className="font-sans text-emerald-600 dark:text-emerald-400 tabular-nums">{beneficiariesStatsBreakdown.completedDists}</strong> | جارية: <strong className="font-sans text-amber-600 dark:text-amber-400 tabular-nums">{beneficiariesStatsBreakdown.pendingDists}</strong></span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#1E3A66] text-xs text-slate-500 dark:text-slate-400 flex justify-between">
            <span>إجمالي الحملات: {totalDistributionsCount}</span>
            <span>نطاق العمل: العسيلة ومكة المكرمة</span>
          </div>
        </div>

        {/* SECTION: حالة المخزون والمستودعات */}
        <div className="bg-white dark:bg-[#0D1E3E] rounded-2xl p-5 sm:p-6 border border-slate-200/90 dark:border-[#1E3A66] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-black text-[#071C43] dark:text-white flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-[#0754C7] dark:text-sky-300" />
                  <span>حالة المخزون والأصناف المستودعية</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  ملخص الأرصدة المتوفرة، حد الطلب، والكميات المصروفة ({warehousesCount} مستودعات)
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab && onNavigateTab('inventory')}
                className="text-xs font-bold text-[#0754C7] dark:text-sky-300 hover:underline cursor-pointer"
              >
                إدارة المخزون
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-2">
              <div className="p-3 bg-slate-50 dark:bg-[#142d50]/60 rounded-xl text-center border border-slate-100 dark:border-[#1e3a66]">
                <span className="text-xl font-black text-[#071C43] dark:text-white block font-sans tabular-nums">{totalInventoryItemsCount}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">إجمالي الأصناف</span>
              </div>
              <div className="p-3 bg-[#E8F3FF] dark:bg-blue-950/40 rounded-xl text-center border border-blue-100 dark:border-blue-800">
                <span className="text-xl font-black text-[#0754C7] dark:text-sky-300 block font-sans tabular-nums">{totalStockUnits.toLocaleString('en-US')}</span>
                <span className="text-[10px] text-slate-600 dark:text-slate-300 font-bold">الرصيد المتاح</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-[#142d50]/60 rounded-xl text-center border border-slate-100 dark:border-[#1e3a66]">
                <span className="text-xl font-black text-slate-700 dark:text-slate-200 block font-sans tabular-nums">{totalIssuedStockUnits.toLocaleString('en-US')}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">المنصرف للمستفيدين</span>
              </div>
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-center border border-rose-100 dark:border-rose-900/50">
                <span className="text-xl font-black text-rose-700 dark:text-rose-400 block font-sans tabular-nums">{lowStockItemsCount}</span>
                <span className="text-[10px] text-rose-600 dark:text-rose-300 font-bold">تنبيه إعادة الطلب</span>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <h4 className="text-xs font-bold text-[#071C43] dark:text-slate-200">أبرز الأصناف المسجلة في المستودع:</h4>
              <div className="space-y-1.5 text-xs">
                {inventoryItems.length > 0 ? inventoryItems.slice(0, 3).map((item, idx) => (
                  <div key={item.id || idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-[#142d50]/50 border border-slate-100 dark:border-[#1e3a66]">
                    <span className="font-bold text-[#071C43] dark:text-slate-200 truncate max-w-[220px]">{item.shortName || item.name}</span>
                    <span className="text-[11px] font-sans text-[#0754C7] dark:text-sky-300 font-bold tabular-nums">{item.currentQty ?? 0} {item.unitOfMeasure || 'وحدة'}</span>
                  </div>
                )) : (
                  <div className="p-4 text-center rounded-xl bg-slate-50 dark:bg-[#142d50]/40 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-[#1e3a66]">
                    لا توجد أصناف مخزنية مسجلة بعد.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#1E3A66] text-xs text-slate-500 dark:text-slate-400 flex justify-between font-sans tabular-nums">
            <span>المستودعات المسجلة: {warehousesCount}</span>
            <span>الجرد المستودعي: معتمد</span>
          </div>
        </div>

      </div>

      {/* 6. ROW 4: VOLUNTEER ATTENDANCE + TOP KNIGHTS (Preserved 100%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* ATTENDANCE METRICS & POINTS BREAKDOWN (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#0D1E3E] rounded-2xl p-5 sm:p-6 border border-slate-200/90 dark:border-[#1E3A66] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-black text-[#071C43] dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0754C7] dark:text-sky-300" />
                  <span>إحصائيات حضور المتطوعين ونقاط التقييم</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  نقاط الحضور الفعلية: حاضر = 3 نقاط، متأخر = 2 نقطة، بعذر = 1 نقطة، غائب = 0
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab && onNavigateTab('vols')}
                className="text-xs font-bold text-[#0754C7] dark:text-sky-300 hover:underline cursor-pointer"
              >
                سجلات الحضور
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-3">
              <div className="p-3 rounded-xl bg-[#E3F5F1] dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800 text-center">
                <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400 block font-sans tabular-nums">{attendanceBreakdown.full.count}</span>
                <span className="text-xs font-bold text-[#071C43] dark:text-slate-200 block mt-0.5">حاضر</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-1">+3 نقاط</span>
              </div>

              <div className="p-3 rounded-xl bg-[#FDF2DF] dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800 text-center">
                <span className="text-2xl font-black text-amber-700 dark:text-amber-400 block font-sans tabular-nums">{attendanceBreakdown.late.count}</span>
                <span className="text-xs font-bold text-[#071C43] dark:text-slate-200 block mt-0.5">متأخر</span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block mt-1">+2 نقطة</span>
              </div>

              <div className="p-3 rounded-xl bg-[#E8F3FF] dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800 text-center">
                <span className="text-2xl font-black text-[#0754C7] dark:text-sky-300 block font-sans tabular-nums">{attendanceBreakdown.excused.count}</span>
                <span className="text-xs font-bold text-[#071C43] dark:text-slate-200 block mt-0.5">بعذر مقبول</span>
                <span className="text-[10px] text-[#0754C7] dark:text-sky-300 font-bold block mt-1">+1 نقطة</span>
              </div>

              <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/70 dark:border-rose-900/50 text-center">
                <span className="text-2xl font-black text-rose-700 dark:text-rose-400 block font-sans tabular-nums">{attendanceBreakdown.absent.count}</span>
                <span className="text-xs font-bold text-[#071C43] dark:text-slate-200 block mt-0.5">غائب</span>
                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block mt-1">0 نقاط</span>
              </div>
            </div>

            {/* Real Attendance Ratio Bar */}
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-700 dark:text-slate-300">نسبة الالتزام والانضباط الميداني الفعلية:</span>
                <span className="text-[#0754C7] dark:text-sky-300 font-sans tabular-nums">
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

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#1E3A66] text-xs text-slate-500 dark:text-slate-400 flex justify-between font-sans tabular-nums">
            <span>إجمالي الجلسات المرصودة: {attendanceBreakdown.total}</span>
            <span>نظام النقاط: معتمد رسمياً</span>
          </div>
        </div>

        {/* AL-FURSAN: TOP 3 VOLUNTEERS (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#0D1E3E] rounded-2xl p-5 sm:p-6 border border-slate-200/90 dark:border-[#1E3A66] shadow-xs flex flex-col justify-between">
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
                className="text-xs font-bold text-[#0754C7] dark:text-sky-300 hover:underline cursor-pointer"
              >
                لوحة الشرف
              </button>
            </div>

            <div className="space-y-3">
              {topKnights.length > 0 ? topKnights.map((vol, idx) => {
                const rankBadges = [
                  { label: "المركز الأول", color: "bg-[#E8F3FF] dark:bg-blue-950/70 text-[#0754C7] dark:text-sky-300 border-blue-200 dark:border-blue-800" },
                  { label: "المركز الثاني", color: "bg-slate-100 dark:bg-[#142d50] text-slate-800 dark:text-slate-200 border-slate-300 dark:border-[#244577]" },
                  { label: "المركز الثالث", color: "bg-[#FDF2DF] dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800" }
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
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-[#0754C7]/30 bg-white"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#E8F3FF] dark:bg-[#19355e] flex items-center justify-center text-[#0754C7] dark:text-sky-300 ring-2 ring-[#0754C7]/25">
                            <User className="w-5 h-5" />
                          </div>
                        )}
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#0754C7] text-white font-sans text-[9px] flex items-center justify-center font-bold">
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
                      <span className="text-xs font-black font-sans text-[#0754C7] dark:text-sky-300 tabular-nums">
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

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#1E3A66] text-xs text-slate-500 dark:text-slate-400 flex justify-between">
            <span>تحديث لوحة الشرف: تلقائي</span>
            <span>الفرسان المتميزون</span>
          </div>
        </div>

      </div>

      {/* 7. ROW 5: RECENT INITIATIVES LIST (Preserved 100%) */}
      <div className="bg-white dark:bg-[#0D1E3E] rounded-2xl p-5 sm:p-6 border border-slate-200/90 dark:border-[#1E3A66] shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm sm:text-base font-black text-[#071C43] dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#0754C7] dark:text-sky-300" />
                <span>آخر المبادرات والفرص التطوعية المعتمدة</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                قائمة بأحدث البرامج الميدانية المسجلة في النظام
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab('init')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E8F3FF] dark:bg-[#133261] text-[#0754C7] dark:text-sky-200 font-bold text-xs hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer border border-blue-200 dark:border-blue-800"
            >
              <span>عرض جميع المبادرات</span>
              <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-0" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {recentInitiatives.length > 0 ? recentInitiatives.map((init, idx) => {
              const st = init.registrationStatus || (init as any).status;
              const statusBadge = st === 'open'
                ? { label: "مفتوحة للتسجيل", color: "bg-[#E8F3FF] text-[#0754C7] border-blue-200 dark:bg-blue-950/60 dark:text-sky-300 dark:border-blue-800" }
                : st === 'closed'
                ? { label: "مغلقة", color: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-[#142d50] dark:text-slate-300 dark:border-[#244577]" }
                : { label: "مؤرشفة", color: "bg-[#E3F5F1] text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800" };
              const acceptedNum = Array.isArray(init.acceptedVolunteerIds) ? init.acceptedVolunteerIds.length : ((init as any).acceptedCount || 0);
              const neededNum = (init as any).neededCount || (init as any).requiredVolunteers || 0;

              return (
                <div
                  key={init.id || idx}
                  className="flex flex-col justify-between gap-2 p-3.5 rounded-xl bg-slate-50 dark:bg-[#142d50]/50 border border-slate-100 dark:border-[#1e3a66] hover:border-[#0754C7]/40 transition-all"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${statusBadge.color}`}>
                        {statusBadge.label}
                      </span>
                      <span className="text-xs font-bold text-[#0754C7] dark:text-sky-300 font-sans tabular-nums shrink-0">
                        {acceptedNum}{neededNum > 0 ? ` / ${neededNum}` : ''} متطوع
                      </span>
                    </div>
                    <h4 className="text-xs font-extrabold text-[#071C43] dark:text-white truncate">
                      {init.name || (init as any).title}
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-[#1E3A66]">
                    <span className="truncate">{init.place || (init as any).location || 'العسيلة - مكة'}</span>
                    <span className="shrink-0 font-sans">{formatDateArabic(init.date || (init as any).startDate)}</span>
                  </p>
                </div>
              );
            }) : (
              <div className="col-span-full p-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#142d50]/40 rounded-xl">
                لا توجد مبادرات مسجلة حالياً.
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#1E3A66] text-xs text-slate-500 dark:text-slate-400 flex justify-between font-sans tabular-nums">
          <span>إجمالي المبادرات: {totalInitiativesCount}</span>
          <span>البرامج الإنسانية والمجتمعية</span>
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
