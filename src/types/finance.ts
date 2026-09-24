// Financial Management Types for Charity Association

export type FinancialRole =
  | 'financial_director' // المدير المالي
  | 'accountant'         // المحاسب
  | 'administrator'      // الإداري
  | 'auditor'            // المراجع المالي
  | 'team_leader'        // القائد / المدير
  | 'read_only';         // مستخدم قراءة فقط

export type FinancialApprovalStatus =
  | 'draft'              // مسودة
  | 'under_review'       // قيد المراجعة
  | 'pending_approval'   // بانتظار الاعتماد
  | 'approved'           // معتمد
  | 'rejected'           // مرفوض
  | 'paid'               // مدفوع / مسدد
  | 'completed'          // مكتمل
  | 'cancelled';         // ملغي

export type IncomeType =
  | 'donation'           // تبرع
  | 'grant'              // منحة
  | 'support'            // دعم
  | 'sponsorship'        // رعاية
  | 'subscription'       // اشتراك
  | 'store_income'       // إيراد متجر
  | 'event_income'       // إيراد فعالية
  | 'other';             // إيراد آخر

export type ExpenseType =
  | 'purchases'          // مشتريات
  | 'operations'         // تشغيل
  | 'salaries'           // رواتب
  | 'bonuses'            // مكافآت
  | 'transport'          // نقل
  | 'hospitality'        // ضيافة
  | 'maintenance'        // صيانة
  | 'rent'               // إيجار
  | 'services'           // خدمات
  | 'initiatives'        // مبادرات
  | 'programs'           // برامج
  | 'aid'                // مساعدات
  | 'supplies'           // مستلزمات
  | 'inventory'          // مستودع
  | 'other';             // مصروف آخر

export type AccountType =
  | 'bank'               // حساب بنكي
  | 'cash_box'           // صندوق نقدي
  | 'donations'          // حساب تبرعات
  | 'project'            // حساب مشروع
  | 'other';             // حساب آخر

export interface FinancialAccount {
  id: string;
  accountNumber: string; // رقم الحساب
  name: string;          // اسم الحساب
  type: AccountType;
  bankName?: string;     // اسم البنك
  iban?: string;         // الآيبان
  openingBalance: number;// الرصيد الافتتاحي
  currentBalance: number;// الرصيد الحالي
  currency: string;      // SAR
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialTransfer {
  id: string;
  transferNumber: string; // e.g. TRF-2026-0001
  fromAccountId: string;
  fromAccountName: string;
  toAccountId: string;
  toAccountName: string;
  amount: number;
  date: string;
  referenceNumber?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface FinancialIncome {
  id: string;
  operationNumber: string; // e.g. INC-2026-0001
  type: IncomeType;
  source: string;          // مصدر الإيراد
  donorName: string;       // اسم المتبرع أو الجهة
  donorPhone?: string;
  donorEmail?: string;
  donorId?: string;
  amount: number;
  date: string;
  accountId: string;       // الحساب المستلم
  accountName: string;
  projectId?: string;      // المشروع / المبادرة المرتبطة
  projectName?: string;
  initiativeId?: string;
  initiativeName?: string;
  donationType?: string;   // عام، كفالة، سلة غذائية، إفطار صائم، إلخ
  isRestricted: boolean;   // هل التبرع مخصص؟
  restrictionPurpose?: string; // الغرض من التخصيص
  receiptNumber: string;   // رقم الإيصال
  paymentMethod: 'bank_transfer' | 'card' | 'cash' | 'check' | 'online_gateway';
  notes?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  status: FinancialApprovalStatus;
  createdById: string;
  createdByName: string;
  createdAt: string;
}

export interface ExpenseApprovalStep {
  step: 'created' | 'reviewed' | 'approved' | 'paid' | 'cancelled';
  byUserId: string;
  byUserName: string;
  date: string;
  notes?: string;
}

export interface FinancialExpense {
  id: string;
  expenseNumber: string;   // e.g. EXP-2026-0001
  type: ExpenseType;
  description: string;     // البيان
  beneficiaryName: string; // المستفيد من الصرف / المورد / الموظف
  amount: number;
  date: string;
  accountId?: string;      // الحساب الذي تم الخصم منه
  accountName?: string;
  projectId?: string;
  projectName?: string;
  initiativeId?: string;
  initiativeName?: string;
  departmentId?: string;
  departmentName?: string;
  budgetId?: string;       // الميزانية المرتبطة
  budgetName?: string;
  paymentMethod: 'bank_transfer' | 'card' | 'cash' | 'check';
  invoiceNumber?: string;  // رقم الفاتورة
  supplierId?: string;
  supplierName?: string;
  notes?: string;
  invoiceAttachmentUrl?: string;
  documentAttachmentUrl?: string;
  status: FinancialApprovalStatus;
  
  // مراحل دورة الصرف
  createdById: string;
  createdByName: string;
  createdAt: string;
  
  reviewedById?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNotes?: string;

  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;
  approvalNotes?: string;

  paidById?: string;
  paidByName?: string;
  paidAt?: string;
  paymentReceiptNumber?: string;

  cancellationReason?: string;
  cancelledById?: string;
  cancelledByName?: string;
  cancelledAt?: string;

  approvalHistory: ExpenseApprovalStep[];
}

export interface FinancialBudget {
  id: string;
  budgetCode: string;      // BUD-2026-001
  name: string;            // اسم الميزانية
  year: number;            // 2026
  projectId?: string;
  projectName?: string;
  initiativeId?: string;
  initiativeName?: string;
  departmentId?: string;
  departmentName?: string;
  approvedAmount: number;  // المبلغ المعتمد
  spentAmount: number;     // المصروف الفعلي
  startDate: string;
  endDate: string;
  allowOverdraft: boolean; // السماح بالتجاوز فقط بصلاحية المدير المالي
  status: 'active' | 'closed' | 'exceeded';
  notes?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialDonor {
  id: string;
  name: string;
  type: 'individual' | 'corporate' | 'government' | 'charity';
  phone?: string;
  email?: string;
  organization?: string;
  totalDonated: number;
  donationsCount: number;
  lastDonationDate?: string;
  notes?: string;
  createdAt: string;
}

export interface FinancialSupplier {
  id: string;
  name: string;
  businessType: string;    // نوع النشاط (توريدات غذائية، مواد مكتبية، صيانة، ...)
  phone: string;
  email?: string;
  address?: string;
  bankName?: string;
  iban?: string;
  taxNumber?: string;      // الرقم الضريبي
  totalInvoiced: number;   // إجمالي الفواتير
  totalPaid: number;       // إجمالي المدفوع
  balanceDue: number;      // المتبقي المستحق
  notes?: string;
  createdAt: string;
}

export interface PurchaseItem {
  id: string;
  itemName: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  taxRate: number;         // e.g. 15%
  totalPrice: number;
  inventoryItemId?: string;// في حال الرغبة في ربطه بصنف مستودع
}

export interface FinancialPurchase {
  id: string;
  purchaseNumber: string;  // PO-2026-0001
  requestedById: string;
  requestedByName: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  projectId?: string;
  projectName?: string;
  budgetId?: string;
  budgetName?: string;
  quotationUrl?: string;
  invoiceUrl?: string;
  status: 'quote' | 'under_review' | 'approved' | 'po_issued' | 'received' | 'invoiced' | 'paid' | 'cancelled';
  addToInventoryOnReceive: boolean; // إضافة الأصناف للمستودع تلقائياً بعد استلامها
  isReceivedToInventory?: boolean;
  notes?: string;
  createdAt: string;
  receivedAt?: string;
  paidAt?: string;
}

export interface FinancialPayable {
  id: string;
  payableNumber: string;   // PAY-2026-0001
  beneficiaryName: string; // مورد، موظف، جهة خدمية
  category: 'supplier' | 'employee' | 'service' | 'utility' | 'other';
  amount: number;
  dueDate: string;         // تاريخ الاستحقاق
  reason: string;
  supplierId?: string;
  expenseId?: string;
  isPaid: boolean;
  paidDate?: string;
  paymentOperationNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface PayrollEmployeeRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  jobTitle: string;
  basicSalary: number;
  allowances: number;      // البدلات
  bonuses: number;         // المكافآت
  deductions: number;      // الخصومات
  netSalary: number;       // الصافي
  notes?: string;
}

export interface FinancialPayroll {
  id: string;
  payrollNumber: string;   // PAYROLL-2026-09
  month: string;           // 2026-09
  title: string;           // مسير رواتب سبتمبر 2026
  employees: PayrollEmployeeRecord[];
  totalBasic: number;
  totalAllowances: number;
  totalBonuses: number;
  totalDeductions: number;
  totalNet: number;
  status: 'draft' | 'under_review' | 'approved' | 'paid';
  paidFromAccountId?: string;
  paidDate?: string;
  approvedById?: string;
  approvedByName?: string;
  notes?: string;
  createdAt: string;
}

export interface FinancialReceipt {
  id: string;
  receiptNumber: string;   // REC-2026-0001
  type: 'receipt' | 'payment'; // سند قبض أو سند صرف
  date: string;
  amount: number;
  amountInWords: string;   // المبلغ كتابة
  partyName: string;       // استلمنا من / صرفنا إلى
  reason: string;          // البيان
  accountId: string;
  accountName: string;
  projectId?: string;
  projectName?: string;
  paymentMethod: 'bank_transfer' | 'cash' | 'check' | 'card';
  referenceNumber?: string;
  issuedById: string;
  issuedByName: string;
  notes?: string;
  qrVerificationCode: string;
  attachmentUrl?: string;
  createdAt: string;
}

export interface FinancialDocument {
  id: string;
  title: string;
  type: 'invoice' | 'receipt' | 'contract' | 'quote' | 'bank_statement' | 'other';
  fileUrl: string;
  fileName: string;
  fileSize?: string;
  relatedType?: 'expense' | 'income' | 'purchase' | 'supplier' | 'budget';
  relatedId?: string;
  relatedNumber?: string;
  uploadedById: string;
  uploadedByName: string;
  isLocked: boolean; // مقفل لمنع الحذف إلا بصلاحية
  notes?: string;
  createdAt: string;
}

export interface FinancialAuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole?: string;
  action: 'create' | 'update' | 'delete' | 'review' | 'approve' | 'reject' | 'cancel' | 'pay' | 'transfer' | 'upload_doc' | 'delete_doc' | 'permission_change';
  targetType: 'account' | 'income' | 'expense' | 'budget' | 'purchase' | 'transfer' | 'receipt' | 'supplier' | 'donor' | 'payroll' | 'document' | 'settings';
  targetId: string;
  targetNumber?: string;
  summary: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  timestamp: string;
}

export type FinancialPurchaseOrder = FinancialPurchase;
export type FinancialPayrollMonth = FinancialPayroll;
export type FinancialAccountType = AccountType;
export type BudgetPeriod = 'yearly' | 'quarterly' | 'monthly' | 'project';
export type DonorCategory = 'individual' | 'corporate' | 'government' | 'charity';

export interface FinancialSettings {
  associationName: string;
  licenseNumber: string;
  logoUrl: string;
  officialPhone: string;
  officialEmail: string;
  currency: string;          // 'ريال سعودي / SAR'
  fiscalYear: number;        // 2026
  receiptPrefix: string;     // REC-
  paymentVoucherPrefix: string;// PAY-
  expensePrefix: string;     // EXP-
  incomePrefix: string;      // INC-
  budgetWarningThreshold: number; // 80%
  budgetAlertThreshold: number;   // 90%
  maxExpenseApprovalWithoutAudit: number; // مثلا 5000 ريال
  taxEnabled: boolean;
  defaultTaxRate: number;    // 15%
}
