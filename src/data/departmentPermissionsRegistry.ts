/**
 * Department Permissions & Granular RBAC Registry
 * مصفوفة الصلاحيات المنظمة ديناميكياً حسب الإدارة ونوع العملية
 */

export type OperationType = 
  | 'view' 
  | 'create' 
  | 'edit' 
  | 'delete' 
  | 'approve' 
  | 'disburse' 
  | 'receive' 
  | 'print' 
  | 'export' 
  | 'reports' 
  | 'manage';

export interface PermissionDefinition {
  id: string;
  label: string;
  description?: string;
  operationType: OperationType;
  departmentId: string;
  legacyKeys: string[];
}

export interface DepartmentPermissionGroup {
  departmentId: string;
  departmentNameAr: string;
  departmentNameEn?: string;
  iconName?: string;
  description: string;
  permissions: PermissionDefinition[];
}

export const OPERATION_TYPE_CONFIG: Record<OperationType, { label: string; badgeClass: string; icon: string }> = {
  view: { label: 'عرض', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200', icon: 'Eye' },
  create: { label: 'إضافة', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: 'Plus' },
  edit: { label: 'تعديل', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200', icon: 'Edit' },
  delete: { label: 'حذف', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200', icon: 'Trash2' },
  approve: { label: 'اعتماد', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200', icon: 'CheckCircle' },
  disburse: { label: 'صرف', badgeClass: 'bg-orange-50 text-orange-700 border-orange-200', icon: 'ArrowUpRight' },
  receive: { label: 'استلام', badgeClass: 'bg-teal-50 text-teal-700 border-teal-200', icon: 'ArrowDownLeft' },
  print: { label: 'طباعة', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: 'Printer' },
  export: { label: 'تصدير', badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200', icon: 'Download' },
  reports: { label: 'تقارير', badgeClass: 'bg-sky-50 text-sky-700 border-sky-200', icon: 'BarChart3' },
  manage: { label: 'إدارة وتنسيق', badgeClass: 'bg-slate-50 text-slate-700 border-slate-200', icon: 'Settings' }
};

// Base registry mapped to actual departments
const BASE_DEPARTMENT_PERMISSIONS: DepartmentPermissionGroup[] = [
  // 1. إدارة المخزن (dep-8 / المستودع والمخزن والخدمات المساندة)
  {
    departmentId: 'dep-8',
    departmentNameAr: 'إدارة المخزن والمستودع',
    departmentNameEn: 'Warehouse & Inventory Management',
    iconName: 'Boxes',
    description: 'التحكم في حركة الأصناف، المخزون، التوريد، الصرف، الجرد، والباركود.',
    permissions: [
      { id: 'warehouse_view_stock', label: 'عرض المخزون', operationType: 'view', departmentId: 'dep-8', legacyKeys: ['view_department'] },
      { id: 'warehouse_add_item', label: 'إضافة صنف', operationType: 'create', departmentId: 'dep-8', legacyKeys: ['create_data', 'items'] },
      { id: 'warehouse_edit_item', label: 'تعديل صنف', operationType: 'edit', departmentId: 'dep-8', legacyKeys: ['edit_data'] },
      { id: 'warehouse_delete_item', label: 'حذف صنف', operationType: 'delete', departmentId: 'dep-8', legacyKeys: ['delete_data'] },
      { id: 'warehouse_receive', label: 'استلام أصناف', operationType: 'receive', departmentId: 'dep-8', legacyKeys: ['receive_data', 'inbound'] },
      { id: 'warehouse_disburse', label: 'صرف أصناف', operationType: 'disburse', departmentId: 'dep-8', legacyKeys: ['disburse_data', 'outbound'] },
      { id: 'warehouse_manage_quantities', label: 'إدارة الكميات', operationType: 'manage', departmentId: 'dep-8', legacyKeys: ['edit_data', 'transfer'] },
      { id: 'warehouse_manage_components', label: 'إدارة مكونات الأصناف', operationType: 'manage', departmentId: 'dep-8', legacyKeys: ['create_data', 'edit_data'] },
      { id: 'warehouse_manage_barcodes', label: 'إدارة الباركود', operationType: 'manage', departmentId: 'dep-8', legacyKeys: ['print_data'] },
      { id: 'warehouse_audit_logs', label: 'مشاهدة حركات المخزن', operationType: 'view', departmentId: 'dep-8', legacyKeys: ['audit', 'view_reports'] },
      { id: 'warehouse_reports', label: 'التقارير', operationType: 'reports', departmentId: 'dep-8', legacyKeys: ['view_reports'] },
      { id: 'warehouse_print', label: 'الطباعة', operationType: 'print', departmentId: 'dep-8', legacyKeys: ['print_data'] },
      { id: 'warehouse_export', label: 'التصدير', operationType: 'export', departmentId: 'dep-8', legacyKeys: ['export_excel', 'export_pdf'] }
    ]
  },

  // 2. إدارة الموارد البشرية (dep-9)
  {
    departmentId: 'dep-9',
    departmentNameAr: 'إدارة الموارد البشرية',
    departmentNameEn: 'Human Resources Management',
    iconName: 'UserCheck',
    description: 'إدارة شؤون الموظفين، الحضور والانصراف، الإجازات، والملفات الوظيفية.',
    permissions: [
      { id: 'hr_view_staff', label: 'عرض الموظفين', operationType: 'view', departmentId: 'dep-9', legacyKeys: ['view_department'] },
      { id: 'hr_add_staff', label: 'إضافة موظف', operationType: 'create', departmentId: 'dep-9', legacyKeys: ['create_data', 'manage_staff'] },
      { id: 'hr_edit_staff', label: 'تعديل بيانات الموظف', operationType: 'edit', departmentId: 'dep-9', legacyKeys: ['edit_data'] },
      { id: 'hr_delete_staff', label: 'حذف موظف', operationType: 'delete', departmentId: 'dep-9', legacyKeys: ['delete_data'] },
      { id: 'hr_manage_files', label: 'إدارة ملفات الموظفين', operationType: 'manage', departmentId: 'dep-9', legacyKeys: ['manage_staff', 'edit_data'] },
      { id: 'hr_attendance', label: 'الحضور والانصراف', operationType: 'manage', departmentId: 'dep-9', legacyKeys: ['confirm_attendance', 'manage_tasks'] },
      { id: 'hr_leaves', label: 'الإجازات', operationType: 'approve', departmentId: 'dep-9', legacyKeys: ['approve_data', 'edit_data'] },
      { id: 'hr_payroll', label: 'مسيرات الرواتب والبدلات', operationType: 'disburse', departmentId: 'dep-9', legacyKeys: ['approve_data', 'disburse_data'] },
      { id: 'hr_reports', label: 'التقارير', operationType: 'reports', departmentId: 'dep-9', legacyKeys: ['view_reports'] },
      { id: 'hr_print', label: 'الطباعة', operationType: 'print', departmentId: 'dep-9', legacyKeys: ['print_data'] },
      { id: 'hr_export', label: 'التصدير', operationType: 'export', departmentId: 'dep-9', legacyKeys: ['export_excel', 'export_pdf'] }
    ]
  },

  // 3. إدارة التطوع (dep-5)
  {
    departmentId: 'dep-5',
    departmentNameAr: 'إدارة التطوع',
    departmentNameEn: 'Volunteer Management',
    iconName: 'HeartHandshake',
    description: 'إدارة المتطوعين، الفرص التطوعية، الساعات، الاعتماد والتقييمات.',
    permissions: [
      { id: 'vol_view_volunteers', label: 'عرض المتطوعين', operationType: 'view', departmentId: 'dep-5', legacyKeys: ['view_department'] },
      { id: 'vol_add_volunteer', label: 'إضافة متطوع', operationType: 'create', departmentId: 'dep-5', legacyKeys: ['create_data'] },
      { id: 'vol_edit_volunteer', label: 'تعديل المتطوع', operationType: 'edit', departmentId: 'dep-5', legacyKeys: ['edit_data'] },
      { id: 'vol_delete_volunteer', label: 'حذف متطوع', operationType: 'delete', departmentId: 'dep-5', legacyKeys: ['delete_data'] },
      { id: 'vol_manage_opportunities', label: 'إدارة الفرص التطوعية', operationType: 'manage', departmentId: 'dep-5', legacyKeys: ['create_initiatives', 'create_data', 'edit_data'] },
      { id: 'vol_approve_opportunities', label: 'اعتماد الفرص', operationType: 'approve', departmentId: 'dep-5', legacyKeys: ['approve_data'] },
      { id: 'vol_manage_registrations', label: 'إدارة التسجيلات', operationType: 'manage', departmentId: 'dep-5', legacyKeys: ['approve_data', 'manage_tasks'] },
      { id: 'vol_attendance', label: 'الحضور', operationType: 'manage', departmentId: 'dep-5', legacyKeys: ['confirm_attendance'] },
      { id: 'vol_points', label: 'النقاط', operationType: 'edit', departmentId: 'dep-5', legacyKeys: ['edit_data'] },
      { id: 'vol_evaluations', label: 'التقييمات', operationType: 'approve', departmentId: 'dep-5', legacyKeys: ['approve_data', 'edit_data'] },
      { id: 'vol_reports', label: 'التقارير', operationType: 'reports', departmentId: 'dep-5', legacyKeys: ['view_reports'] },
      { id: 'vol_print', label: 'الطباعة', operationType: 'print', departmentId: 'dep-5', legacyKeys: ['print_data'] },
      { id: 'vol_export', label: 'التصدير', operationType: 'export', departmentId: 'dep-5', legacyKeys: ['export_excel', 'export_pdf'] }
    ]
  },

  // 4. إدارة المستفيدين (dep-4)
  {
    departmentId: 'dep-4',
    departmentNameAr: 'إدارة المستفيدين',
    departmentNameEn: 'Beneficiaries Management',
    iconName: 'Users',
    description: 'تسجيل المستفيدين، دراسة الحالات، طلبات المساعدة، وتسليم التوزيعات.',
    permissions: [
      { id: 'ben_view_beneficiaries', label: 'عرض المستفيدين', operationType: 'view', departmentId: 'dep-4', legacyKeys: ['view_department'] },
      { id: 'ben_add_beneficiary', label: 'إضافة مستفيد', operationType: 'create', departmentId: 'dep-4', legacyKeys: ['create_data'] },
      { id: 'ben_edit_beneficiary', label: 'تعديل بيانات المستفيد', operationType: 'edit', departmentId: 'dep-4', legacyKeys: ['edit_data'] },
      { id: 'ben_delete_beneficiary', label: 'حذف مستفيد', operationType: 'delete', departmentId: 'dep-4', legacyKeys: ['delete_data'] },
      { id: 'ben_assistance_requests', label: 'طلبات المساعدة', operationType: 'view', departmentId: 'dep-4', legacyKeys: ['view_department', 'approve_data'] },
      { id: 'ben_manage_assistance', label: 'إدارة المساعدات', operationType: 'manage', departmentId: 'dep-4', legacyKeys: ['create_data', 'edit_data'] },
      { id: 'ben_record_receipt', label: 'تسجيل الاستلام', operationType: 'disburse', departmentId: 'dep-4', legacyKeys: ['disburse_data', 'receive_data'] },
      { id: 'ben_barcode', label: 'الباركود', operationType: 'manage', departmentId: 'dep-4', legacyKeys: ['print_data'] },
      { id: 'ben_evaluations', label: 'دراسة الحالات والتقييم', operationType: 'approve', departmentId: 'dep-4', legacyKeys: ['approve_data'] },
      { id: 'ben_reports', label: 'التقارير', operationType: 'reports', departmentId: 'dep-4', legacyKeys: ['view_reports'] },
      { id: 'ben_print', label: 'الطباعة', operationType: 'print', departmentId: 'dep-4', legacyKeys: ['print_data'] },
      { id: 'ben_export', label: 'التصدير', operationType: 'export', departmentId: 'dep-4', legacyKeys: ['export_excel', 'export_pdf'] }
    ]
  },

  // 5. الإدارة المالية (dep-2)
  {
    departmentId: 'dep-2',
    departmentNameAr: 'الإدارة المالية',
    departmentNameEn: 'Financial Management',
    iconName: 'Wallet',
    description: 'إدارة الحسابات، السندات، المصروفات، الإيرادات، والعهد والميزانيات.',
    permissions: [
      { id: 'fin_view_records', label: 'عرض السجلات المالية والميزانية', operationType: 'view', departmentId: 'dep-2', legacyKeys: ['view_department'] },
      { id: 'fin_add_voucher', label: 'إضافة سند مالي / قيد', operationType: 'create', departmentId: 'dep-2', legacyKeys: ['create_data'] },
      { id: 'fin_edit_records', label: 'تعديل السجلات المالية', operationType: 'edit', departmentId: 'dep-2', legacyKeys: ['edit_data'] },
      { id: 'fin_delete_voucher', label: 'حذف سند / قيد', operationType: 'delete', departmentId: 'dep-2', legacyKeys: ['delete_data'] },
      { id: 'fin_approve_expenses', label: 'اعتماد القيود والمصروفات', operationType: 'approve', departmentId: 'dep-2', legacyKeys: ['approve_data'] },
      { id: 'fin_disburse_funds', label: 'صرف المبالغ والعهد', operationType: 'disburse', departmentId: 'dep-2', legacyKeys: ['disburse_data'] },
      { id: 'fin_receive_revenues', label: 'استلام الإيرادات والتبرعات', operationType: 'receive', departmentId: 'dep-2', legacyKeys: ['receive_data'] },
      { id: 'fin_manage_salaries', label: 'إدارة الرواتب والعهد', operationType: 'manage', departmentId: 'dep-2', legacyKeys: ['manage_tasks', 'disburse_data'] },
      { id: 'fin_reports', label: 'التقارير المالية', operationType: 'reports', departmentId: 'dep-2', legacyKeys: ['view_reports'] },
      { id: 'fin_print', label: 'الطباعة', operationType: 'print', departmentId: 'dep-2', legacyKeys: ['print_data'] },
      { id: 'fin_export', label: 'التصدير', operationType: 'export', departmentId: 'dep-2', legacyKeys: ['export_excel', 'export_pdf'] }
    ]
  },

  // 6. إدارة البرامج والمشاريع (dep-3)
  {
    departmentId: 'dep-3',
    departmentNameAr: 'إدارة البرامج والمشاريع',
    departmentNameEn: 'Programs & Projects Management',
    iconName: 'FolderKanban',
    description: 'تخطيط وتنفيذ المشاريع التنموية، خطط الإنجاز، ومؤشرات الأداء.',
    permissions: [
      { id: 'proj_view_projects', label: 'عرض البرامج والمشاريع', operationType: 'view', departmentId: 'dep-3', legacyKeys: ['view_department'] },
      { id: 'proj_add_project', label: 'إضافة مشروع أو مبادرة', operationType: 'create', departmentId: 'dep-3', legacyKeys: ['create_data'] },
      { id: 'proj_edit_project', label: 'تعديل بيانات المشروع', operationType: 'edit', departmentId: 'dep-3', legacyKeys: ['edit_data'] },
      { id: 'proj_delete_project', label: 'حذف مشروع', operationType: 'delete', departmentId: 'dep-3', legacyKeys: ['delete_data'] },
      { id: 'proj_approve_milestones', label: 'اعتماد خطط الإنجاز', operationType: 'approve', departmentId: 'dep-3', legacyKeys: ['approve_data'] },
      { id: 'proj_track_kpis', label: 'متابعة مؤشرات الأداء والأنشطة', operationType: 'manage', departmentId: 'dep-3', legacyKeys: ['manage_tasks'] },
      { id: 'proj_reports', label: 'التقارير', operationType: 'reports', departmentId: 'dep-3', legacyKeys: ['view_reports'] },
      { id: 'proj_print', label: 'الطباعة', operationType: 'print', departmentId: 'dep-3', legacyKeys: ['print_data'] },
      { id: 'proj_export', label: 'التصدير', operationType: 'export', departmentId: 'dep-3', legacyKeys: ['export_excel', 'export_pdf'] }
    ]
  },

  // 7. إدارة العلاقات العامة والإعلام (dep-6)
  {
    departmentId: 'dep-6',
    departmentNameAr: 'إدارة العلاقات العامة والإعلام',
    departmentNameEn: 'Public Relations & Media Management',
    iconName: 'Megaphone',
    description: 'المركز الإعلامي، الأخبار، ألبومات التوثيق، والتواصل المؤسسي.',
    permissions: [
      { id: 'media_view_content', label: 'عرض المحتوى والأخبار', operationType: 'view', departmentId: 'dep-6', legacyKeys: ['view_department'] },
      { id: 'media_add_news', label: 'إضافة خبر أو بيان صحفي', operationType: 'create', departmentId: 'dep-6', legacyKeys: ['create_data'] },
      { id: 'media_edit_news', label: 'تعديل المحتوى الإعلامي', operationType: 'edit', departmentId: 'dep-6', legacyKeys: ['edit_data'] },
      { id: 'media_delete_news', label: 'حذف خبر أو ألبوم', operationType: 'delete', departmentId: 'dep-6', legacyKeys: ['delete_data'] },
      { id: 'media_approve_posts', label: 'اعتماد المنشورات الرسمية', operationType: 'approve', departmentId: 'dep-6', legacyKeys: ['approve_data'] },
      { id: 'media_manage_gallery', label: 'إدارة الألبومات والتغطيات', operationType: 'manage', departmentId: 'dep-6', legacyKeys: ['manage_tasks'] },
      { id: 'media_reports', label: 'التقارير', operationType: 'reports', departmentId: 'dep-6', legacyKeys: ['view_reports'] },
      { id: 'media_print', label: 'الطباعة', operationType: 'print', departmentId: 'dep-6', legacyKeys: ['print_data'] },
      { id: 'media_export', label: 'التصدير', operationType: 'export', departmentId: 'dep-6', legacyKeys: ['export_excel', 'export_pdf'] }
    ]
  },

  // 8. إدارة تنمية الموارد المالية والشراكات (dep-7)
  {
    departmentId: 'dep-7',
    departmentNameAr: 'إدارة تنمية الموارد المالية والشراكات',
    departmentNameEn: 'Fundraising & Partnerships Management',
    iconName: 'HandCoins',
    description: 'إدارة الشراكات الاستراتيجية، المانحين، الرعايات، وتنمية الموارد.',
    permissions: [
      { id: 'partners_view_partners', label: 'عرض الشراكات والجهات المانحة', operationType: 'view', departmentId: 'dep-7', legacyKeys: ['view_department'] },
      { id: 'partners_add_partner', label: 'إضافة شريك أو اتفاقية جديدة', operationType: 'create', departmentId: 'dep-7', legacyKeys: ['create_data'] },
      { id: 'partners_edit_partner', label: 'تعديل بيانات الشراكات', operationType: 'edit', departmentId: 'dep-7', legacyKeys: ['edit_data'] },
      { id: 'partners_delete_partner', label: 'حذف شراكة / رعاية', operationType: 'delete', departmentId: 'dep-7', legacyKeys: ['delete_data'] },
      { id: 'partners_approve_agreements', label: 'اعتماد الاتفاقيات ومذكرات التفاهم', operationType: 'approve', departmentId: 'dep-7', legacyKeys: ['approve_data'] },
      { id: 'partners_receive_grants', label: 'استلام المنح ومتابعة التبرعات', operationType: 'receive', departmentId: 'dep-7', legacyKeys: ['receive_data'] },
      { id: 'partners_manage_campaigns', label: 'إدارة الحملات والمبادرات الداعمة', operationType: 'manage', departmentId: 'dep-7', legacyKeys: ['manage_tasks'] },
      { id: 'partners_reports', label: 'التقارير', operationType: 'reports', departmentId: 'dep-7', legacyKeys: ['view_reports'] },
      { id: 'partners_print', label: 'الطباعة', operationType: 'print', departmentId: 'dep-7', legacyKeys: ['print_data'] },
      { id: 'partners_export', label: 'التصدير', operationType: 'export', departmentId: 'dep-7', legacyKeys: ['export_excel', 'export_pdf'] }
    ]
  },

  // 9. الإدارة التنفيذية (dep-1)
  {
    departmentId: 'dep-1',
    departmentNameAr: 'الإدارة التنفيذية',
    departmentNameEn: 'Executive Management',
    iconName: 'ShieldAlert',
    description: 'قرارات وتوجيهات مجلس الإدارة، الإشراف التنفيذي، والخطابات الرسمية.',
    permissions: [
      { id: 'exec_view_directives', label: 'عرض القرارات والخطط العامة', operationType: 'view', departmentId: 'dep-1', legacyKeys: ['view_department'] },
      { id: 'exec_add_directive', label: 'إضافة تكليف أو قرار إداري', operationType: 'create', departmentId: 'dep-1', legacyKeys: ['create_data'] },
      { id: 'exec_edit_directive', label: 'تعديل التوجيهات والخطط', operationType: 'edit', departmentId: 'dep-1', legacyKeys: ['edit_data'] },
      { id: 'exec_delete_directive', label: 'حذف قرار إداري', operationType: 'delete', departmentId: 'dep-1', legacyKeys: ['delete_data'] },
      { id: 'exec_approve_directives', label: 'اعتماد التوجيهات الرسمية', operationType: 'approve', departmentId: 'dep-1', legacyKeys: ['approve_data'] },
      { id: 'exec_manage_letters', label: 'إدارة الخطابات والمراسلات', operationType: 'manage', departmentId: 'dep-1', legacyKeys: ['manage_tasks'] },
      { id: 'exec_reports', label: 'التقارير التنفيذية الشاملة', operationType: 'reports', departmentId: 'dep-1', legacyKeys: ['view_reports'] },
      { id: 'exec_print', label: 'الطباعة', operationType: 'print', departmentId: 'dep-1', legacyKeys: ['print_data'] },
      { id: 'exec_export', label: 'التصدير', operationType: 'export', departmentId: 'dep-1', legacyKeys: ['export_excel', 'export_pdf'] }
    ]
  }
];

// In-memory extension registry for dynamic expansion without hardcoding
let dynamicPermissions: DepartmentPermissionGroup[] = [...BASE_DEPARTMENT_PERMISSIONS];

/**
 * Get all configured department permissions, dynamically merged with any custom departments.
 */
export function getAllDepartmentPermissions(customDepartments?: Array<{ id: string; nameAr: string; nameEn?: string; descriptionAr?: string }>): DepartmentPermissionGroup[] {
  if (!customDepartments || customDepartments.length === 0) {
    return dynamicPermissions;
  }

  const result: DepartmentPermissionGroup[] = [...dynamicPermissions];

  customDepartments.forEach(dept => {
    const existing = result.find(d => d.departmentId === dept.id);
    if (!existing) {
      result.push({
        departmentId: dept.id,
        departmentNameAr: dept.nameAr,
        departmentNameEn: dept.nameEn,
        description: dept.descriptionAr || `إدارة ${dept.nameAr}`,
        permissions: [
          { id: `${dept.id}_view`, label: 'عرض البيانات والملفات', operationType: 'view', departmentId: dept.id, legacyKeys: ['view_department'] },
          { id: `${dept.id}_create`, label: 'إضافة سجلات جديدة', operationType: 'create', departmentId: dept.id, legacyKeys: ['create_data'] },
          { id: `${dept.id}_edit`, label: 'تعديل وتحديث البيانات', operationType: 'edit', departmentId: dept.id, legacyKeys: ['edit_data'] },
          { id: `${dept.id}_delete`, label: 'حذف السجلات', operationType: 'delete', departmentId: dept.id, legacyKeys: ['delete_data'] },
          { id: `${dept.id}_approve`, label: 'اعتماد وتوثيق القرارات', operationType: 'approve', departmentId: dept.id, legacyKeys: ['approve_data'] },
          { id: `${dept.id}_reports`, label: 'التقارير الإحصائية', operationType: 'reports', departmentId: dept.id, legacyKeys: ['view_reports'] },
          { id: `${dept.id}_print`, label: 'الطباعة', operationType: 'print', departmentId: dept.id, legacyKeys: ['print_data'] },
          { id: `${dept.id}_export`, label: 'التصدير', operationType: 'export', departmentId: dept.id, legacyKeys: ['export_excel', 'export_pdf'] }
        ]
      });
    }
  });

  return result;
}

/**
 * Get permissions group for a specific department
 */
export function getDepartmentPermissions(departmentId: string, customDepartments?: any[]): DepartmentPermissionGroup | undefined {
  const all = getAllDepartmentPermissions(customDepartments);
  return all.find(d => d.departmentId === departmentId);
}

/**
 * Get all permission IDs for a department
 */
export function getDepartmentPermissionIds(departmentId: string, customDepartments?: any[]): string[] {
  const group = getDepartmentPermissions(departmentId, customDepartments);
  if (!group) return [];
  return group.permissions.map(p => p.id);
}

/**
 * Returns all legacy keys satisfied by the given department-specific permission IDs
 */
export function expandPermissionsWithLegacyKeys(permIds: string[], customDepartments?: any[]): string[] {
  const allGroups = getAllDepartmentPermissions(customDepartments);
  const set = new Set<string>(permIds);

  allGroups.forEach(group => {
    group.permissions.forEach(p => {
      if (set.has(p.id)) {
        (p.legacyKeys || []).forEach(k => set.add(k));
      }
    });
  });

  return Array.from(set);
}

/**
 * Register a dynamic permission into a department (Dynamic runtime extensibility)
 */
export function registerDynamicPermission(departmentId: string, permission: Omit<PermissionDefinition, 'departmentId'>): boolean {
  const group = dynamicPermissions.find(d => d.departmentId === departmentId);
  if (group) {
    if (!group.permissions.some(p => p.id === permission.id)) {
      group.permissions.push({
        ...permission,
        departmentId
      });
      return true;
    }
  }
  return false;
}
