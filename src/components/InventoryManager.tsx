import React, { useState, useEffect, useMemo } from "react";
import { 
  Package, Boxes, Barcode, QrCode, AlertTriangle, Plus, Search, Filter, 
  ArrowDownLeft, ArrowUpRight, RefreshCw, Printer, Download, Eye, Edit3, 
  Trash2, Building, Truck, CheckCircle2, XCircle, FileText, Calendar, 
  DollarSign, Shield, Layers, Camera, AlertCircle, Sparkles, X, ChevronRight,
  TrendingDown, Check, FileCheck, Share2, Calculator, User, Phone, Image as ImageIcon, Clock
} from "lucide-react";
import * as XLSX from "xlsx";
import { 
  InventoryItem, Warehouse, InventoryVendor, InventoryMovement, InventoryAudit, Initiative, InventoryItemComponent,
  AidDistribution, DistributionHandoverRecord, Beneficiary 
} from "../types";
import { ImageUploadField } from "./ImageUploadField";
import { AidHandoverScannerModal } from "./AidHandoverScannerModal";
import { BeneficiaryHistoryModal } from "./BeneficiaryHistoryModal";

interface InventoryManagerProps {
  initiatives?: Initiative[];
  onRefreshGlobalData?: () => void;
  currentUser?: any;
  storekeeperMode?: boolean;
  onLogout?: () => void;
  beneficiaries?: Beneficiary[];
  distributions?: AidDistribution[];
  distributionHandovers?: DistributionHandoverRecord[];
  onHandoverSubmit?: (data: any) => Promise<any>;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  initiatives = [],
  onRefreshGlobalData,
  currentUser,
  storekeeperMode = false,
  onLogout,
  beneficiaries = [],
  distributions = [],
  distributionHandovers = [],
  onHandoverSubmit
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'items' | 'movements' | 'audits' | 'warehouses' | 'reports' | 'storekeepers' | 'archive' | 'aid_handovers'>(() => {
    try {
      const saved = localStorage.getItem('reyadat_inventory_tab');
      if (saved) return saved as any;
    } catch {}
    return 'dashboard';
  });

  useEffect(() => {
    try {
      localStorage.setItem('reyadat_inventory_tab', activeTab);
    } catch {}
  }, [activeTab]);

  // Aid Handover States (تسليم المساعدات للمستفيدين)
  const [selectedAidDistId, setSelectedAidDistId] = useState<string>(() => distributions[0]?.id || '');
  const [isAidScannerOpen, setIsAidScannerOpen] = useState(false);
  const [historyBeneficiary, setHistoryBeneficiary] = useState<Beneficiary | null>(null);
  const [selectedProofPhoto, setSelectedProofPhoto] = useState<{ url: string; title: string; record: DistributionHandoverRecord } | null>(null);
  const [aidSearchQuery, setAidSearchQuery] = useState('');
  const [aidStatusFilter, setAidStatusFilter] = useState<'all' | 'delivered' | 'pending'>('all');

  useEffect(() => {
    if (distributions.length > 0 && (!selectedAidDistId || !distributions.some(d => d.id === selectedAidDistId))) {
      setSelectedAidDistId(distributions[0].id);
    }
  }, [distributions]);

  // State
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [vendors, setVendors] = useState<InventoryVendor[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [audits, setAudits] = useState<InventoryAudit[]>([]);
  const [storekeepers, setStorekeepers] = useState<any[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [selectedAlertFilter, setSelectedAlertFilter] = useState("all");

  // Filters for Archive & Storekeepers
  const [archiveSearch, setArchiveSearch] = useState("");
  const [selectedActionFilter, setSelectedActionFilter] = useState("all");
  const [selectedStorekeeperFilter, setSelectedStorekeeperFilter] = useState("all");
  const [storekeeperSearch, setStorekeeperSearch] = useState("");

  // Storekeeper Modal
  const [showStorekeeperModal, setShowStorekeeperModal] = useState(false);
  const [editingStorekeeper, setEditingStorekeeper] = useState<any>({
    name: "",
    nationalId: "",
    phone: "",
    email: "",
    password: "123",
    assignedWarehouseId: "all",
    assignedWarehouseName: "جميع المستودعات",
    status: "active",
    permissions: ["inbound", "outbound", "transfer", "write_off", "audit", "items"],
    notes: ""
  });

  // Modals state
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<InventoryItem> | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailItem, setDetailItem] = useState<InventoryItem | null>(null);

  // Helper to calculate kit preparation capacity based on linked inventory items
  const calculateKitCapacity = (components: InventoryItemComponent[] = [], allItems: InventoryItem[] = []) => {
    if (!components || components.length === 0) return null;
    
    let minKits = Infinity;
    let bottleneck: { name: string; needed: number; stock: number; kits: number; unit: string } | null = null;
    let hasLinkedItems = false;

    const rows = components.map(comp => {
      const qty = Number(comp.quantity) || 0;
      const linked = comp.linkedItemId ? allItems.find(i => i.id === comp.linkedItemId) : null;
      const stock = linked ? (linked.currentQty ?? 0) : 0;
      const kits = (linked && qty > 0) ? Math.floor(stock / qty) : null;

      if (linked) {
        hasLinkedItems = true;
        if (kits !== null && kits < minKits) {
          minKits = kits;
          bottleneck = {
            name: comp.name || linked.name,
            needed: qty,
            stock,
            kits,
            unit: comp.unit || 'حبة'
          };
        }
      }

      return {
        ...comp,
        linkedItemName: linked ? linked.name : null,
        stock,
        kits
      };
    });

    return {
      hasLinkedItems,
      maxKits: minKits === Infinity ? 0 : minKits,
      bottleneck,
      rows
    };
  };

  const [showInboundModal, setShowInboundModal] = useState(false);
  const [inboundItemId, setInboundItemId] = useState("");
  const [inboundQty, setInboundQty] = useState(10);
  const [inboundReason, setInboundReason] = useState("");
  const [inboundVendor, setInboundVendor] = useState("");
  const [inboundInvoice, setInboundInvoice] = useState("");

  const [showOutboundModal, setShowOutboundModal] = useState(false);
  const [outboundItemId, setOutboundItemId] = useState("");
  const [outboundQty, setOutboundQty] = useState(5);
  const [outboundReason, setOutboundReason] = useState("");
  const [outboundRecipient, setOutboundRecipient] = useState("");
  const [outboundInitiativeId, setOutboundInitiativeId] = useState("");

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferItemId, setTransferItemId] = useState("");
  const [transferQty, setTransferQty] = useState(5);
  const [transferTargetWh, setTransferTargetWh] = useState("");
  const [transferReason, setTransferReason] = useState("");

  const [showWriteOffModal, setShowWriteOffModal] = useState(false);
  const [writeOffItemId, setWriteOffItemId] = useState("");
  const [writeOffQty, setWriteOffQty] = useState(1);
  const [writeOffReason, setWriteOffReason] = useState("تلف أثناء النقل والعمل الميداني");

  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditTitle, setAuditTitle] = useState("محضر جرد دوري جديد للمستودع");
  const [auditWarehouseId, setAuditWarehouseId] = useState("wh-1");
  const [auditItemsState, setAuditItemsState] = useState<{ [itemId: string]: { actualQty: number; reason: string } }>({});
  const [applyAuditToDb, setApplyAuditToDb] = useState(true);

  // Barcode / Scanner simulator
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scannedCodeInput, setScannedCodeInput] = useState("");
  const [scannedResultItem, setScannedResultItem] = useState<InventoryItem | null>(null);
  const [isSimulatingCamera, setIsSimulatingCamera] = useState(true);

  // Print Label Modal
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [labelItem, setLabelItem] = useState<InventoryItem | null>(null);

  // Warehouse Modal
  const [showWhModal, setShowWhModal] = useState(false);
  const [editingWh, setEditingWh] = useState<Partial<Warehouse> | null>(null);

  // Vendor Modal
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Partial<InventoryVendor> | null>(null);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch data on mount
  const fetchInventoryData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/db/inventory");
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setWarehouses(data.warehouses || []);
        setVendors(data.vendors || []);
        setMovements(data.movements || []);
        setAudits(data.audits || []);
        setStorekeepers(data.storekeepers || []);
        setInventoryLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to load inventory data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  // Storekeeper CRUD Handlers
  const handleSaveStorekeeper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStorekeeper.name || !editingStorekeeper.nationalId || !editingStorekeeper.phone) {
      alert("يرجى تعبئة الحقول الأساسية: الاسم، رقم الهوية/الإقامة، ورقم الجوال.");
      return;
    }

    try {
      const res = await fetch("/api/db/inventory/storekeepers/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editingStorekeeper,
          createdByName: currentUser?.name || "الإدارة العامة"
        })
      });

      if (res.ok) {
        showToast("تم حفظ حساب أمين المستودع وتحديث الصلاحيات بنجاح 👤🔑");
        setShowStorekeeperModal(false);
        fetchInventoryData();
      } else {
        const err = await res.json();
        alert(err.error || "حدث خطأ أثناء إضافة حساب أمين المستودع.");
      }
    } catch (err) {
      alert("فشل الاتصال بالخادم.");
    }
  };

  const handleDeleteStorekeeper = async (id: string) => {
    if (!confirm("هل أنت تأكد من إلغاء وحذف حساب أمين المستودع هذا؟")) return;
    try {
      const res = await fetch("/api/db/inventory/storekeepers/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, deletedBy: currentUser?.name || "الإدارة العامة" })
      });
      if (res.ok) {
        showToast("تم حذف حساب أمين المستودع وأرشفة بياناته بنجاح 🗑️");
        fetchInventoryData();
      } else {
        alert("فشل الحذف.");
      }
    } catch (err) {
      alert("تعذر الحذف.");
    }
  };

  // Stats Calculations
  const totalItemsCount = items.length;
  const totalQuantitySum = items.reduce((acc, curr) => acc + (curr.currentQty || 0), 0);
  const lowStockItems = items.filter(i => i.currentQty <= i.minStock);
  const expiredOrExpiringItems = items.filter(i => {
    if (!i.expiryDate) return false;
    const exp = new Date(i.expiryDate).getTime();
    const now = new Date().getTime();
    const diffDays = (exp - now) / (1000 * 3600 * 24);
    return diffDays <= (i.expWarningDaysThreshold || 30);
  });
  const pendingAuditItems = items.filter(i => !i.isAudited);
  const auditedItems = items.filter(i => i.isAudited);
  const totalFinancialValue = items.reduce((acc, curr) => acc + ((curr.currentQty || 0) * (curr.purchasePrice || curr.unitPrice || 0)), 0);

  // Filtered items
  const filteredItems = items.filter(item => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      item.name.toLowerCase().includes(query) ||
      (item.barcode && item.barcode.includes(query)) ||
      (item.serialNumber && item.serialNumber.toLowerCase().includes(query)) ||
      (item.internalCode && item.internalCode.toLowerCase().includes(query)) ||
      (item.shortName && item.shortName.toLowerCase().includes(query));

    const matchesCategory = selectedCategory === "all" || item.type === selectedCategory || item.category === selectedCategory;
    const matchesWarehouse = selectedWarehouse === "all" || item.warehouseId === selectedWarehouse;

    let matchesAlert = true;
    if (selectedAlertFilter === "low_stock") {
      matchesAlert = item.currentQty <= item.minStock;
    } else if (selectedAlertFilter === "expired") {
      if (!item.expiryDate) matchesAlert = false;
      else {
        const exp = new Date(item.expiryDate).getTime();
        const diffDays = (exp - Date.now()) / (1000 * 3600 * 24);
        matchesAlert = diffDays <= (item.expWarningDaysThreshold || 30);
      }
    } else if (selectedAlertFilter === "audited") {
      matchesAlert = item.isAudited;
    } else if (selectedAlertFilter === "pending_audit") {
      matchesAlert = !item.isAudited;
    }

    return matchesSearch && matchesCategory && matchesWarehouse && matchesAlert;
  });

  // Handle Save Item
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.name || !editingItem?.type || !editingItem?.warehouseId) {
      alert("يرجى تعبئة اسم المادة والنوع والمستودع على الأقل.");
      return;
    }

    const wh = warehouses.find(w => w.id === editingItem.warehouseId);
    const vendor = vendors.find(v => v.id === editingItem.vendorId);

    const cleanComponents = Array.isArray(editingItem.components)
      ? editingItem.components.filter(c => c.name && c.name.trim() !== "")
      : [];

    const payload = {
      ...editingItem,
      isCompound: cleanComponents.length > 0 || !!editingItem.isCompound,
      components: cleanComponents,
      warehouseName: wh ? wh.name : (editingItem.warehouseName || "المستودع الرئيسي"),
      vendorName: vendor ? vendor.name : (editingItem.vendorName || ""),
      unitOfMeasure: editingItem.unitOfMeasure || "قطعة",
      minStock: Number(editingItem.minStock || 10),
      maxStock: Number(editingItem.maxStock || 1000),
      reorderPoint: Number(editingItem.reorderPoint || 15),
      currentQty: Number(editingItem.currentQty || 0),
      purchasePrice: Number(editingItem.purchasePrice || 0),
      unitPrice: Number(editingItem.unitPrice || editingItem.purchasePrice || 0),
      expWarningDaysThreshold: Number(editingItem.expWarningDaysThreshold || 30)
    };

    try {
      const res = await fetch("/api/db/inventory/items/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast("تم حفظ الصنف بنجاح في سجلات المخزون والجرد ✅");
        setShowAddItemModal(false);
        setEditingItem(null);
        fetchInventoryData();
        if (onRefreshGlobalData) onRefreshGlobalData();
      }
    } catch (err) {
      alert("تعذر حفظ المادة.");
    }
  };

  // Handle Delete Item
  const handleDeleteItem = async (id: string, name: string) => {
    if (!confirm(`هل أنت تأكد من رغبتك في حذف الصنف المخزني (${name}) تماماً؟`)) return;
    try {
      const res = await fetch("/api/db/inventory/items/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        showToast("تم حذف المادة من قاعدة البيانات بنجاح 🗑️");
        fetchInventoryData();
      }
    } catch (err) {
      alert("تعذر حذف الصنف.");
    }
  };

  // Handle Inbound Addition
  const handleInboundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inboundItemId || inboundQty <= 0) {
      alert("يرجى اختيار الصنف وتحديد الكمية الموردة بشكل صحيح.");
      return;
    }

    try {
      const res = await fetch("/api/db/inventory/movements/add_quantity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: inboundItemId,
          quantity: inboundQty,
          reason: inboundReason || "توريد شحنة تموينية جديدة",
          vendorName: inboundVendor,
          invoiceNumber: inboundInvoice,
          approvedBy: "أ. عبد الله العتيبي (إدارة المخزون)"
        })
      });
      if (res.ok) {
        showToast(`تم توريد وإضافة (+${inboundQty}) إلى رصيد المخزون بنجاح 📦`);
        setShowInboundModal(false);
        setInboundItemId("");
        setInboundReason("");
        setInboundInvoice("");
        fetchInventoryData();
      } else {
        const errData = await res.json();
        alert(errData.error || "خطأ في عملية التوريد.");
      }
    } catch (err) {
      alert("تعذر تنفيذ التوريد.");
    }
  };

  // Handle Outbound Issuance
  const handleOutboundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outboundItemId || outboundQty <= 0) {
      alert("يرجى اختيار الصنف والكمية المصروفة.");
      return;
    }

    const initObj = initiatives.find(i => i.id === outboundInitiativeId);

    try {
      const res = await fetch("/api/db/inventory/movements/issue_quantity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: outboundItemId,
          quantity: outboundQty,
          reason: outboundReason || "صرف ميداني وتنظيمي للمبادرة",
          recipientName: outboundRecipient || "المشرف الميداني",
          initiativeId: outboundInitiativeId,
          initiativeName: initObj ? initObj.name : "مبادرة الجمعية الميدانية",
          approvedBy: "إدارة المستودعات والتطوع"
        })
      });
      if (res.ok) {
        showToast(`تم إذن الصرف وحسم (-${outboundQty}) من المخزون بنجاح 🚚`);
        setShowOutboundModal(false);
        setOutboundItemId("");
        setOutboundReason("");
        setOutboundRecipient("");
        fetchInventoryData();
      } else {
        const errData = await res.json();
        alert(errData.error || "تعذر تنفيذ إذن الصرف.");
      }
    } catch (err) {
      alert("تعذر الصرف.");
    }
  };

  // Handle Warehouse Transfer
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferItemId || !transferTargetWh || transferQty <= 0) {
      alert("يرجى تعبئة جميع بيانات النقل التحويلي.");
      return;
    }

    try {
      const res = await fetch("/api/db/inventory/movements/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: transferItemId,
          quantity: transferQty,
          targetWarehouseId: transferTargetWh,
          reason: transferReason || "نقل بين المستودعات لتقسيم المخزون",
          approvedBy: "إدارة المستودعات المركزية"
        })
      });
      if (res.ok) {
        showToast("تم التحويل والتأكيد بنجاح بين المستودعات 🔄");
        setShowTransferModal(false);
        fetchInventoryData();
      } else {
        const errData = await res.json();
        alert(errData.error || "خطأ في التحويل.");
      }
    } catch (err) {
      alert("تعذر التحويل.");
    }
  };

  // Handle Write Off
  const handleWriteOffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!writeOffItemId || writeOffQty <= 0) {
      alert("يرجى تحديد الصنف والكمية التالفة.");
      return;
    }

    try {
      const res = await fetch("/api/db/inventory/movements/write_off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: writeOffItemId,
          quantity: writeOffQty,
          reason: writeOffReason,
          approvedBy: "لجنة الاتلاف والتدقيق المالي"
        })
      });
      if (res.ok) {
        showToast(`تم إثبات الإتلاف وحسم (-${writeOffQty}) من الرصيد المخزني ⚠️`);
        setShowWriteOffModal(false);
        fetchInventoryData();
      } else {
        const errData = await res.json();
        alert(errData.error || "خطأ في الاتلاف.");
      }
    } catch (err) {
      alert("تعذر الإتلاف.");
    }
  };

  // Handle Start Audit Session
  const handleStartAuditSession = (whId: string) => {
    const wh = warehouses.find(w => w.id === whId);
    setAuditWarehouseId(whId);
    setAuditTitle(`محضر الجرد الدوري الفعلي لـ (${wh ? wh.name : 'المستودع الرئيسي'})`);

    // Prepare audit items state with current system quantities
    const targetItems = items.filter(i => i.warehouseId === whId || whId === "all");
    const initialAuditMap: { [itemId: string]: { actualQty: number; reason: string } } = {};
    targetItems.forEach(i => {
      initialAuditMap[i.id] = { actualQty: i.currentQty, reason: "مطابقة تامة 100%" };
    });
    setAuditItemsState(initialAuditMap);
    setShowAuditModal(true);
  };

  // Handle Save Stock Audit Record
  const handleSaveAuditRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    const wh = warehouses.find(w => w.id === auditWarehouseId);
    const targetItems = items.filter(i => i.warehouseId === auditWarehouseId || auditWarehouseId === "all");

    const auditItemsPayload = targetItems.map(item => {
      const audited = auditItemsState[item.id] || { actualQty: item.currentQty, reason: "مطابقة" };
      return {
        itemId: item.id,
        itemName: item.name,
        barcode: item.barcode,
        systemQty: item.currentQty,
        actualQty: Number(audited.actualQty),
        unitOfMeasure: item.unitOfMeasure,
        reasonForDiscrepancy: audited.reason
      };
    });

    try {
      const res = await fetch("/api/db/inventory/audits/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: auditTitle,
          auditType: auditWarehouseId === "all" ? "full" : "warehouse",
          warehouseId: auditWarehouseId,
          warehouseName: wh ? wh.name : "جميع المستودعات",
          items: auditItemsPayload,
          performedBy: "لجنة الجرد الميداني والتدقيق",
          approvedBy: "أ. عبد الرحمن السليمان (المدير التنفيذي)",
          applyToInventory: applyAuditToDb
        })
      });

      if (res.ok) {
        showToast("تم اعتماد محضر الجرد المخزني وتحديث أرصدة البيانات بنجاح 📋");
        setShowAuditModal(false);
        fetchInventoryData();
      }
    } catch (err) {
      alert("تعذر اعتماد محضر الجرد.");
    }
  };

  // Handle Save Warehouse
  const handleSaveWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWh?.name) return;
    try {
      const res = await fetch("/api/db/inventory/warehouses/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingWh)
      });
      if (res.ok) {
        showToast("تم حفظ بيانات المستودع بنجاح 🏢");
        setShowWhModal(false);
        setEditingWh(null);
        fetchInventoryData();
      }
    } catch (err) {
      alert("خطأ في حفظ المستودع.");
    }
  };

  // Handle Save Vendor
  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVendor?.name || !editingVendor?.phone) return;
    try {
      const res = await fetch("/api/db/inventory/vendors/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingVendor)
      });
      if (res.ok) {
        showToast("تم حفظ بيانات المورد والشركة بنجاح 🚚");
        setShowVendorModal(false);
        setEditingVendor(null);
        fetchInventoryData();
      }
    } catch (err) {
      alert("خطأ في حفظ المورد.");
    }
  };

  // Handle Scanner Simulation Search
  const handleSimulateScan = () => {
    if (!scannedCodeInput.trim()) return;
    const query = scannedCodeInput.trim().toLowerCase();
    const found = items.find(i => 
      i.barcode === query || 
      (i.serialNumber && i.serialNumber.toLowerCase() === query) ||
      (i.qrCode && i.qrCode.toLowerCase() === query) ||
      i.id === query ||
      i.name.toLowerCase().includes(query)
    );

    if (found) {
      setScannedResultItem(found);
    } else {
      setScannedResultItem(null);
      alert("لم يتم العثور على أي صنف مطابق للباركود أو الرقم التسلسلي المدخل.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-5 left-5 z-50 bg-emerald-700 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-6 h-6 text-emerald-200" />
          <span className="font-medium text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-1">
              <Boxes className="w-4 h-4" />
              <span>نظام إدارة التموين والعهاد والجرد الاحترافي</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white">إدارة المخزون والجرد الميداني - جمعية ريادة العطاء لخدمة الإنسان بالعسيلة</h2>
            <p className="text-emerald-100 text-sm mt-1">
              متابعة المستودعات، تتبع السلال التموينية، العهد المستديمة، المستلزمات والكسوة، مع دعم كامل للباركود والجرد الميداني الذكي.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowScannerModal(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 text-sm"
            >
              <Barcode className="w-4 h-4" />
              <span>الماسح الضوئي الذكي</span>
            </button>

            <button
              onClick={() => {
                setEditingItem({
                  type: 'مواد غذائية',
                  warehouseId: warehouses[0]?.id || 'wh-1',
                  currentQty: 50,
                  minStock: 10,
                  maxStock: 500,
                  purchasePrice: 15,
                  unitOfMeasure: 'كرتون',
                  expWarningDaysThreshold: 30
                });
                setShowAddItemModal(true);
              }}
              className="bg-white text-emerald-900 hover:bg-emerald-50 font-bold px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة صنف جديد</span>
            </button>
          </div>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 border-t border-emerald-700/60 pt-4 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-white text-emerald-900 shadow-md'
                : 'bg-emerald-800/60 text-emerald-100 hover:bg-emerald-700/60'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>لوحة المؤشرات والجرد</span>
          </button>

          <button
            onClick={() => setActiveTab('items')}
            className={`px-4 py-2 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'items'
                ? 'bg-white text-emerald-900 shadow-md'
                : 'bg-emerald-800/60 text-emerald-100 hover:bg-emerald-700/60'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>سجل الأصناف ({items.length})</span>
            {lowStockItems.length > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                {lowStockItems.length} تنبيه
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('movements')}
            className={`px-4 py-2 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'movements'
                ? 'bg-white text-emerald-900 shadow-md'
                : 'bg-emerald-800/60 text-emerald-100 hover:bg-emerald-700/60'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-emerald-300" />
            <span>حركات التوريد والصرف ({movements.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('audits')}
            className={`px-4 py-2 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'audits'
                ? 'bg-white text-emerald-900 shadow-md'
                : 'bg-emerald-800/60 text-emerald-100 hover:bg-emerald-700/60'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>محاضر الجرد والتدقيق ({audits.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('warehouses')}
            className={`px-4 py-2 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'warehouses'
                ? 'bg-white text-emerald-900 shadow-md'
                : 'bg-emerald-800/60 text-emerald-100 hover:bg-emerald-700/60'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>المستودعات والموردين ({warehouses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'reports'
                ? 'bg-white text-emerald-900 shadow-md'
                : 'bg-emerald-800/60 text-emerald-100 hover:bg-emerald-700/60'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>التقارير المطبوعة والمالية</span>
          </button>

          <button
            onClick={() => setActiveTab('storekeepers')}
            className={`px-4 py-2 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'storekeepers'
                ? 'bg-white text-emerald-900 shadow-md'
                : 'bg-emerald-800/60 text-emerald-100 hover:bg-emerald-700/60'
            }`}
          >
            <Shield className="w-4 h-4 text-amber-300" />
            <span>إدارة أمناء المستودعات ({storekeepers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('archive')}
            className={`px-4 py-2 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'archive'
                ? 'bg-white text-emerald-900 shadow-md'
                : 'bg-emerald-800/60 text-emerald-100 hover:bg-emerald-700/60'
            }`}
          >
            <FileText className="w-4 h-4 text-sky-300" />
            <span>أرشيف وتتبع العمليات ({inventoryLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('aid_handovers')}
            className={`px-4 py-2 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center gap-2 whitespace-nowrap border-2 border-emerald-400/50 ${
              activeTab === 'aid_handovers'
                ? 'bg-white text-emerald-900 shadow-md'
                : 'bg-emerald-800/80 text-white hover:bg-emerald-700'
            }`}
          >
            <Camera className="w-4 h-4 text-emerald-300" />
            <span>تسليم مساعدات المستفيدين ({distributions.length})</span>
            {distributions.filter(d => d.status === 'active').length > 0 && (
              <span className="bg-emerald-400 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded-full">
                {distributions.filter(d => d.status === 'active').length} دفعات جاهزة
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* TAB 1: DASHBOARD METRICS & QUICK ACTIONS */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Top Quick Actions Bar */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-bold text-sm">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>عمليات السريعة للمخزون والجرد:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  if (items.length === 0) return alert("لا يوجد مواد بالمخزون للتوريد.");
                  setInboundItemId(items[0].id);
                  setShowInboundModal(true);
                }}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all"
              >
                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                <span>+ إذن توريد شحنة</span>
              </button>

              <button
                onClick={() => {
                  if (items.length === 0) return alert("لا يوجد مواد بالمخزون للصرف.");
                  setOutboundItemId(items[0].id);
                  setShowOutboundModal(true);
                }}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all"
              >
                <ArrowUpRight className="w-4 h-4 text-blue-600" />
                <span>- إذن صرف لمبادرة</span>
              </button>

              <button
                onClick={() => {
                  if (items.length === 0) return alert("لا يوجد مواد للتحويل.");
                  setTransferItemId(items[0].id);
                  setTransferTargetWh(warehouses[1]?.id || warehouses[0]?.id || "");
                  setShowTransferModal(true);
                }}
                className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className="w-4 h-4 text-purple-600" />
                <span>نقل بين المستودعات</span>
              </button>

              <button
                onClick={() => {
                  if (items.length === 0) return alert("لا يوجد مواد للإتلاف.");
                  setWriteOffItemId(items[0].id);
                  setShowWriteOffModal(true);
                }}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>إتلاف / حسم فاقد</span>
              </button>

              <button
                onClick={() => handleStartAuditSession("wh-1")}
                className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all"
              >
                <FileCheck className="w-4 h-4 text-amber-600" />
                <span>بدء محضر جرد شامل</span>
              </button>
            </div>
          </div>

          {/* Key Metrics Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total Items */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-bold">إجمالي عدد الأصناف</p>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{totalItemsCount} مادة</h3>
                  <p className="text-xs text-slate-500 mt-1">موزعة على {warehouses.length} مستودع رئيسي</p>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 rounded-xl">
                  <Package className="w-7 h-7" />
                </div>
              </div>
            </div>

            {/* 2. Total Quantity Sum */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-bold">إجمالي كمية المخزون</p>
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{totalQuantitySum.toLocaleString()} وحدة</h3>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">رصيد متاح للاستخدام الميداني</p>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/50 text-blue-600 rounded-xl">
                  <Boxes className="w-7 h-7" />
                </div>
              </div>
            </div>

            {/* 3. Low Stock Alert Items */}
            <div className={`p-5 rounded-2xl border shadow-sm relative overflow-hidden ${
              lowStockItems.length > 0 
                ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800' 
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-800 dark:text-amber-300 text-xs font-bold">منخفضة المخزون (تحت الحد)</p>
                  <h3 className="text-2xl font-black text-amber-900 dark:text-amber-200 mt-1">{lowStockItems.length} مواد</h3>
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mt-1">تتطلب إعادة إعادة إمداد وتوريد</p>
                </div>
                <div className="p-3 bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded-xl">
                  <AlertTriangle className="w-7 h-7" />
                </div>
              </div>
            </div>

            {/* 4. Total Financial Valuation */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-bold">القيمة المالية التقديرية</p>
                  <h3 className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">{totalFinancialValue.toLocaleString()} ر.س</h3>
                  <p className="text-xs text-slate-500 mt-1">تقييم الأصول التموينية والمستلزمات</p>
                </div>
                <div className="p-3 bg-teal-50 dark:bg-teal-950/50 text-teal-600 rounded-xl">
                  <DollarSign className="w-7 h-7" />
                </div>
              </div>
            </div>
          </div>

          {/* Low Stock & Expiry Warning Banner if any */}
          {(lowStockItems.length > 0 || expiredOrExpiringItems.length > 0) && (
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-rose-500/10 border-r-4 border-amber-500 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">تنبيهات الهدر وإعادة التموين للمستودعات!</h4>
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    يوجد {lowStockItems.length} مواد تحت حد الأمان المطلوب، و{expiredOrExpiringItems.length} مواد قريبة من تاريخ انتهاء الصلاحية.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedAlertFilter("low_stock");
                  setActiveTab("items");
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-sm transition-all whitespace-nowrap"
              >
                استعراض التنبيهات
              </button>
            </div>
          )}

          {/* Main Grid: Catalog Summary & Recent Movements */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Catalog Highlights Table (2 Cols) */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                <h3 className="font-bold text-base text-slate-800 dark:text-white flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-600" />
                  <span>ملخص المواد التموينية بالجدول</span>
                </h3>

                <button
                  onClick={() => setActiveTab("items")}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <span>عرض جميع المواد ({items.length})</span>
                  <ChevronRight className="w-4 h-4 rotate-180" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-bold">
                    <tr>
                      <th className="p-2.5 rounded-r-lg">المادة والباركود</th>
                      <th className="p-2.5">المستودع والموقع</th>
                      <th className="p-2.5">الرصيد المتاح</th>
                      <th className="p-2.5">القيمة (ر.س)</th>
                      <th className="p-2.5 rounded-l-lg">الحالة والتنبيه</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {items.slice(0, 5).map(item => {
                      const isLow = item.currentQty <= item.minStock;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-all">
                          <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">
                            <div className="flex items-center gap-2">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover border border-slate-200" />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 flex items-center justify-center font-bold text-xs">
                                  {item.name.substring(0, 1)}
                                </div>
                              )}
                              <div>
                                <p className="font-bold">{item.name}</p>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {item.barcode} | {item.internalCode || 'N/A'}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="p-2.5 text-slate-600 dark:text-slate-300">
                            <p className="font-semibold text-xs">{item.warehouseName}</p>
                            <span className="text-[10px] text-slate-400">رف: {item.shelf || 'عام'}</span>
                          </td>

                          <td className="p-2.5 font-extrabold text-slate-800 dark:text-white">
                            <span className={isLow ? "text-amber-600 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"}>
                              {item.currentQty} {item.unitOfMeasure}
                            </span>
                          </td>

                          <td className="p-2.5 font-bold text-slate-700 dark:text-slate-200">
                            {(item.currentQty * (item.purchasePrice || item.unitPrice || 0)).toLocaleString()} ر.س
                          </td>

                          <td className="p-2.5">
                            {isLow ? (
                              <span className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-extrabold text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                <span>منخفض!</span>
                              </span>
                            ) : item.currentQty === 0 ? (
                              <span className="bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                                نفد الرصيد!
                              </span>
                            ) : (
                              <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-[10px] px-2 py-0.5 rounded-full">
                                متوفر ومطابق
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Movements Widget (1 Col) */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                  <span>سجل الحركات الأخيرة</span>
                </h3>

                <button
                  onClick={() => setActiveTab("movements")}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  الكل
                </button>
              </div>

              <div className="space-y-3">
                {movements.slice(0, 5).map(mov => (
                  <div key={mov.id} className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-100 dark:border-slate-700/50 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-extrabold px-2 py-0.5 rounded-md text-[10px] ${
                        mov.type === 'inbound' ? 'bg-emerald-100 text-emerald-800' :
                        mov.type === 'outbound' ? 'bg-blue-100 text-blue-800' :
                        mov.type === 'transfer' ? 'bg-purple-100 text-purple-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {mov.type === 'inbound' ? '+ توريد' :
                         mov.type === 'outbound' ? '- صرف' :
                         mov.type === 'transfer' ? '🔄 تحويل' : '⚠️ إتلاف'}
                      </span>

                      <span className="text-[10px] text-slate-400">{mov.date}</span>
                    </div>

                    <p className="font-bold text-xs text-slate-800 dark:text-white truncate">{mov.itemName}</p>
                    <div className="flex justify-between items-center text-[11px] text-slate-500">
                      <span>الكمية: <strong className="text-slate-800 dark:text-slate-200">{mov.quantity}</strong></span>
                      <span className="truncate max-w-[120px]">{mov.initiativeName || mov.reason}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TAB 2: ITEM CATALOG & SEARCH */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === 'items' && (
        <div className="space-y-5">
          {/* Search & Filter Bar */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم المادة، الباركود، الرقم التسلسلي، الكود الداخلي..."
                className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-xs font-semibold border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-xs font-semibold border border-slate-200 dark:border-slate-600"
              >
                <option value="all">جميع التصنيفات</option>
                <option value="مواد غذائية">مواد غذائية</option>
                <option value="كسوة وملابس">كسوة وملابس</option>
                <option value="أدوية ومستلزمات طبية">أدوية ومستلزمات طبية</option>
                <option value="أجهزة ومعدات">أجهزة ومعدات</option>
                <option value="عهد مستديمة">عهد مستديمة</option>
                <option value="عام">عام</option>
              </select>

              <select
                value={selectedWarehouse}
                onChange={e => setSelectedWarehouse(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-xs font-semibold border border-slate-200 dark:border-slate-600"
              >
                <option value="all">جميع المستودعات</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>

              <select
                value={selectedAlertFilter}
                onChange={e => setSelectedAlertFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-xs font-semibold border border-slate-200 dark:border-slate-600 text-amber-700 dark:text-amber-300 font-bold"
              >
                <option value="all">جميع الحالات</option>
                <option value="low_stock">منخفض المخزون (تنبيه)</option>
                <option value="expired">منتهي / قريب الانتهاء</option>
                <option value="audited">تم جردها</option>
                <option value="pending_audit">غير مجرودة</option>
              </select>

              <button
                onClick={() => {
                  setEditingItem({
                    type: 'مواد غذائية',
                    warehouseId: warehouses[0]?.id || 'wh-1',
                    currentQty: 50,
                    minStock: 10,
                    maxStock: 500,
                    purchasePrice: 15,
                    unitOfMeasure: 'كرتون',
                    expWarningDaysThreshold: 30
                  });
                  setShowAddItemModal(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة صنف</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold uppercase">
                  <tr>
                    <th className="p-3">اسم المادة والمعرفات</th>
                    <th className="p-3">التصنيف</th>
                    <th className="p-3">المستودع والموقع</th>
                    <th className="p-3">الرصيد المتاح</th>
                    <th className="p-3">السعر والتكلفة</th>
                    <th className="p-3">الصلاحية</th>
                    <th className="p-3">الجرد والتنبيه</th>
                    <th className="p-3 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 font-semibold">
                        لا توجد أي أصناف مخزنية مطابقة لمعايير البحث المدخلة.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map(item => {
                      const isLow = item.currentQty <= item.minStock;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-all">
                          <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                            <div className="flex items-center gap-2.5">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt="" className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-sm" />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-black text-sm">
                                  {item.name.substring(0, 1)}
                                </div>
                              )}
                              <div>
                                <div className="flex items-center gap-2">
                                  <p 
                                    onClick={() => {
                                      setDetailItem(item);
                                      setShowDetailModal(true);
                                    }}
                                    className="font-extrabold text-sm hover:text-emerald-600 cursor-pointer"
                                    title="انقر لعرض التفاصيل والمكونات"
                                  >
                                    {item.name}
                                  </p>
                                  {item.components && item.components.length > 0 && (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                                      <Boxes className="w-3 h-3" />
                                      <span>{item.components.length} مكونات</span>
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-mono">
                                  <span className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{item.barcode}</span>
                                  <span>SN: {item.serialNumber || 'N/A'}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="p-3 text-slate-600 dark:text-slate-300">
                            <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-1 rounded-md">
                              {item.type}
                            </span>
                          </td>

                          <td className="p-3 text-slate-700 dark:text-slate-300 font-medium">
                            <p className="font-bold text-xs">{item.warehouseName}</p>
                            <span className="text-[10px] text-slate-400">رف: {item.shelf || 'عام'}</span>
                          </td>

                          <td className="p-3 font-black text-slate-800 dark:text-white">
                            <span className={isLow ? "text-amber-600 text-sm" : "text-emerald-700 dark:text-emerald-400 text-sm"}>
                              {item.currentQty} {item.unitOfMeasure}
                            </span>
                            <p className="text-[10px] text-slate-400 font-normal">حد أدنى: {item.minStock}</p>
                          </td>

                          <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                            <div>
                              <span>{(item.currentQty * (item.purchasePrice || item.unitPrice || 0)).toLocaleString()} ر.س</span>
                              <p className="text-[10px] text-slate-400">سعر الوحدة: {item.purchasePrice || item.unitPrice || 0} ر.س</p>
                            </div>
                          </td>

                          <td className="p-3 text-slate-600 dark:text-slate-300">
                            {item.expiryDate ? (
                              <div>
                                <p className="font-bold text-xs">{item.expiryDate}</p>
                                <span className="text-[10px] text-slate-400">إنتاج: {item.productionDate || 'N/A'}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">غير محدد</span>
                            )}
                          </td>

                          <td className="p-3">
                            <div className="space-y-1">
                              {isLow && (
                                <span className="bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 font-extrabold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>منخفض المخزون</span>
                                </span>
                              )}

                              {item.isAudited ? (
                                <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>مجرود ({item.lastAuditDate || 'حديثاً'})</span>
                                </span>
                              ) : (
                                <span className="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 font-semibold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                                  <span>لم يُجرد بعد</span>
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  setDetailItem(item);
                                  setShowDetailModal(true);
                                }}
                                title="عرض التفاصيل والمكونات التفصيلية"
                                className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg transition-all flex items-center gap-1 font-bold text-xs"
                              >
                                <Eye className="w-4 h-4" />
                                <span className="text-[11px] hidden sm:inline">تفاصيل</span>
                              </button>

                              <button
                                onClick={() => {
                                  setLabelItem(item);
                                  setShowLabelModal(true);
                                }}
                                title="طباعة ملصق الباركود والـ QR"
                                className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 rounded-lg transition-all"
                              >
                                <Barcode className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => {
                                  setEditingItem(item);
                                  setShowAddItemModal(true);
                                }}
                                title="تعديل المادة"
                                className="p-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 rounded-lg transition-all"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleDeleteItem(item.id, item.name)}
                                title="حذف المادة"
                                className="p-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 rounded-lg transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TAB 3: MOVEMENTS & AUDIT LOG */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === 'movements' && (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
            <div>
              <h3 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                <span>سجل حركة المخزون والعمليات اللوجستية</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">تتبع عمليات التوريد، الصرف للمبادرات، التحويل بين المستودعات، وحسم الإتلاف.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (items.length === 0) return alert("لا يوجد مواد بالمخزون.");
                  setInboundItemId(items[0].id);
                  setShowInboundModal(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-sm transition-all"
              >
                + توريد شحنة
              </button>

              <button
                onClick={() => {
                  if (items.length === 0) return alert("لا يوجد مواد بالمخزون.");
                  setOutboundItemId(items[0].id);
                  setShowOutboundModal(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-sm transition-all"
              >
                - إذن صرف
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-200 font-extrabold">
                <tr>
                  <th className="p-3">نوع الحركة</th>
                  <th className="p-3">الصنف / الباركود</th>
                  <th className="p-3">الكمية</th>
                  <th className="p-3">السبب / المبادرة الميدانية</th>
                  <th className="p-3">المستلم / المورد</th>
                  <th className="p-3">المعتمد</th>
                  <th className="p-3">التاريخ والوقت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-semibold">
                      لا يوجد أي حركات مخزنية مسجلة حالياً.
                    </td>
                  </tr>
                ) : (
                  movements.map(mov => (
                    <tr key={mov.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-all">
                      <td className="p-3">
                        <span className={`font-extrabold px-2.5 py-1 rounded-lg text-xs inline-flex items-center gap-1 ${
                          mov.type === 'inbound' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                          mov.type === 'outbound' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' :
                          mov.type === 'transfer' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' :
                          'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}>
                          {mov.type === 'inbound' ? '+ توريد' :
                           mov.type === 'outbound' ? '- صرف' :
                           mov.type === 'transfer' ? '🔄 تحويل' : '⚠️ إتلاف'}
                        </span>
                      </td>

                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                        <p className="font-extrabold">{mov.itemName}</p>
                        <span className="text-[10px] text-slate-400 font-mono">{mov.barcode}</span>
                      </td>

                      <td className="p-3 font-black text-sm text-slate-800 dark:text-white">
                        {mov.quantity}
                      </td>

                      <td className="p-3 text-slate-700 dark:text-slate-300">
                        <p className="font-bold text-xs">{mov.initiativeName || mov.reason}</p>
                        {mov.invoiceNumber && <span className="text-[10px] text-slate-400">فاتورة: {mov.invoiceNumber}</span>}
                      </td>

                      <td className="p-3 text-slate-600 dark:text-slate-300">
                        {mov.vendorName || mov.recipientName || mov.beneficiaryName || 'عام'}
                      </td>

                      <td className="p-3 text-slate-600 dark:text-slate-300 font-medium">
                        {mov.approvedBy || 'إدارة المخزون'}
                      </td>

                      <td className="p-3 text-slate-500 font-mono text-[11px]">
                        {mov.date}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TAB 4: STOCK AUDITS & VARIANCE TRACKING */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === 'audits' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-600" />
                <span>محاضر الجرد الفعلي وتدقيق الفروقات المخزنية</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">مطابقة الكميات الدفترية بالنظام مع العاد الميداني الفعلي وإثبات الفروقات.</p>
            </div>

            <button
              onClick={() => handleStartAuditSession(warehouses[0]?.id || "wh-1")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>بدء محضر جرد جديد</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {audits.map(aud => (
              <div key={aud.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="font-mono text-xs font-bold bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-emerald-700 dark:text-emerald-400">
                    {aud.auditNumber}
                  </span>

                  <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    نسبة المطابقة: {aud.matchPercentage}%
                  </span>
                </div>

                <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">{aud.title}</h4>
                <p className="text-xs text-slate-500">المستودع: <strong className="text-slate-700 dark:text-slate-300">{aud.warehouseName}</strong> | التاريخ: {aud.auditDate}</p>

                <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-700/40 p-3 rounded-xl text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">الكمية بالنظام</span>
                    <strong className="font-extrabold text-slate-800 dark:text-white">{aud.totalSystemQty}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">الجرد الفعلي</span>
                    <strong className="font-extrabold text-emerald-700 dark:text-emerald-400">{aud.totalActualQty}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">فارق الجرد</span>
                    <strong className={aud.totalVariance === 0 ? "text-emerald-600" : "text-amber-600 font-extrabold"}>
                      {aud.totalVariance}
                    </strong>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 pt-1 flex justify-between items-center">
                  <span>تم بواسطة: {aud.performedBy}</span>
                  <span className="text-slate-400">{aud.approvedBy ? `اعتماد: ${aud.approvedBy}` : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TAB 5: WAREHOUSES & VENDORS */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === 'warehouses' && (
        <div className="space-y-6">
          {/* Warehouses Section */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-emerald-600" />
                <span>دليل المستودعات التابعة للجمعية ({warehouses.length})</span>
              </h3>

              <button
                onClick={() => {
                  setEditingWh({
                    name: "",
                    location: "مكة المكرمة - مخطط العسيلة",
                    capacity: "500 م3",
                    managerName: ""
                  });
                  setShowWhModal(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition-all"
              >
                + إضافة مستودع جديد
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {warehouses.map(wh => (
                <div key={wh.id} className="p-4 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">{wh.name}</h4>
                  <p className="text-xs text-slate-500">{wh.location}</p>
                  <div className="text-xs text-slate-700 dark:text-slate-300 space-y-0.5">
                    <p>المسؤول: <strong>{wh.managerName}</strong></p>
                    <p>الجوال: <span className="font-mono">{wh.managerPhone || 'N/A'}</span></p>
                    <p>السعة التخزينية: <strong className="text-emerald-700">{wh.capacity}</strong></p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Vendors Section */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-600" />
                <span>دليل الشركات والموردين المعتمدين ({vendors.length})</span>
              </h3>

              <button
                onClick={() => {
                  setEditingVendor({
                    name: "",
                    phone: "0550000000",
                    contactPerson: ""
                  });
                  setShowVendorModal(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition-all"
              >
                + إضافة مورد جديد
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {vendors.map(ven => (
                <div key={ven.id} className="p-4 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">{ven.name}</h4>
                  <p className="text-xs text-slate-500">{ven.address || 'مكة المكرمة'}</p>
                  <div className="text-xs text-slate-700 dark:text-slate-300 space-y-0.5">
                    <p>مسؤول الاتصال: <strong>{ven.contactPerson || 'عام'}</strong></p>
                    <p>الجوال: <span className="font-mono">{ven.phone}</span></p>
                    {ven.crNumber && <p className="text-[10px] text-slate-400">السجل التجاري: {ven.crNumber}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TAB 6: PRINTABLE REPORTS & EXPORTS */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === 'reports' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
            <div>
              <h3 className="font-extrabold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-600" />
                <span>التقارير المطبوعة والمستندات الرسمية للمخزون</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">طباعة تقارير التقييم المالي، جرد المواد، وكشوفات التوريد والصرف المعرف بختم الجمعية.</p>
            </div>

            <button
              onClick={() => window.print()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة كشف المخزون المباشر</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <h4 className="font-bold text-sm text-slate-800 dark:text-white">تقرير التقييم المالي للمخزون</h4>
              <p className="text-xs text-slate-500">يتضمن تفاصيل أسعار الشراء، إجمالي القيمة لكل مادة، والرصيد المالي الإجمالي.</p>
              <button
                onClick={() => window.print()}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs py-2 rounded-lg hover:bg-slate-100 transition-all"
              >
                تصدير وطباعة
              </button>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <h4 className="font-bold text-sm text-slate-800 dark:text-white">كشف حركة الصرف للمبادرات</h4>
              <p className="text-xs text-slate-500">تقرير بكافة أذونات الصرف الميداني المعتمدة والمربوطة بمبادرات الجمعية الـ 120.</p>
              <button
                onClick={() => window.print()}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs py-2 rounded-lg hover:bg-slate-100 transition-all"
              >
                تصدير وطباعة
              </button>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <h4 className="font-bold text-sm text-slate-800 dark:text-white">تقرير المواد منخفضة المخزون</h4>
              <p className="text-xs text-slate-500">كشف خاص بالمواد التي وصلت لحد الأمان للتزويد والمشتريات العاجلة.</p>
              <button
                onClick={() => window.print()}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs py-2 rounded-lg hover:bg-slate-100 transition-all"
              >
                تصدير وطباعة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TAB 7: STOREKEEPERS MANAGEMENT (إدارة أمناء المستودعات) */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === 'storekeepers' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
            <div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-500" />
                <h3 className="font-black text-lg text-slate-800 dark:text-white">إدارة حسابات وصلاحيات أمناء المستودعات</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                إضافة وتقييد أكثر من أمين مستودع، وتحديد المستودعات المصرح لهم بإدارتها مع تتبع آلي لجميع تعديلاتهم في الأرشيف.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingStorekeeper({
                  name: "",
                  nationalId: "",
                  phone: "",
                  email: "",
                  password: "123",
                  assignedWarehouseId: "all",
                  assignedWarehouseName: "جميع المستودعات",
                  status: "active",
                  permissions: ["inbound", "outbound", "transfer", "write_off", "audit", "items"],
                  notes: ""
                });
                setShowStorekeeperModal(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة أمين مستودع جديد</span>
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-500 font-bold">إجمالي أمناء المستودعات</span>
              <div className="text-2xl font-black text-slate-800 dark:text-white mt-1">{storekeepers.length}</div>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">الحسابات النشطة والمفعلة</span>
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
                {storekeepers.filter(s => s.status === 'active').length}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800">
              <span className="text-xs text-sky-600 dark:text-sky-400 font-bold">إجمالي العمليات الموثقة بالأرشيف</span>
              <div className="text-2xl font-black text-sky-700 dark:text-sky-300 mt-1">{inventoryLogs.length}</div>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="البحث باسم أمين المستودع، رقم الهوية، الجوال..."
              value={storekeeperSearch}
              onChange={e => setStorekeeperSearch(e.target.value)}
              className="w-full pr-10 pl-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold"
            />
          </div>

          {/* Storekeepers Table / Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {storekeepers
              .filter(s => 
                s.name.toLowerCase().includes(storekeeperSearch.toLowerCase()) ||
                s.nationalId.includes(storekeeperSearch) ||
                s.phone.includes(storekeeperSearch)
              )
              .map(sk => {
                const skLogsCount = inventoryLogs.filter(l => l.storekeeperId === sk.id || l.storekeeperName === sk.name).length;
                return (
                  <div key={sk.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm space-y-3 relative overflow-hidden">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-black text-sm flex items-center justify-center border border-emerald-200">
                          {sk.name.slice(0, 2)}
                        </div>
                        <div>
                          <h4 className="font-black text-sm text-slate-800 dark:text-white">{sk.name}</h4>
                          <span className="text-xs text-slate-500 font-mono">هوية: {sk.nationalId}</span>
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                        sk.status === 'active' 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {sk.status === 'active' ? '● مفعّل' : 'موقوف'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                      <div>
                        <span className="text-slate-400 block text-[10px]">المستودع المخصص:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">{sk.assignedWarehouseName || "جميع المستودعات"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">رقم الجوال:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200 font-mono">{sk.phone}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">اسم المستخدم / الدخول:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200 font-mono">{sk.email || sk.nationalId}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">العمليات المنفذة:</span>
                        <span className="font-extrabold text-emerald-600">{skLogsCount} عملية توثيق</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">الصلاحيات المخولة:</span>
                      <div className="flex flex-wrap gap-1">
                        {(sk.permissions || []).map((perm: string) => (
                          <span key={perm} className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200/60">
                            {perm === 'inbound' && 'التوريد والإنزال'}
                            {perm === 'outbound' && 'الصرف للمبادرات'}
                            {perm === 'transfer' && 'النقل التحويلي'}
                            {perm === 'write_off' && 'محاضر الإتلاف'}
                            {perm === 'audit' && 'الجرد الميداني'}
                            {perm === 'items' && 'إضافة أصناف'}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                      <button
                        onClick={() => {
                          setEditingStorekeeper(sk);
                          setShowStorekeeperModal(true);
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>تعديل</span>
                      </button>
                      <button
                        onClick={() => handleDeleteStorekeeper(sk.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف</span>
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TAB 8: AUDIT ARCHIVE & STOREKEEPER LOGS (أرشيف وتتبع العمليات) */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === 'archive' && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-500" />
                <h3 className="font-black text-lg text-slate-800 dark:text-white">أرشيف وتتبع عمليات أمناء المستودعات</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                سجل رقابي مدقق وغير قابل للتعديل يوثق جميع الأنشطة والتعديلات، أذونات التوريد، أذونات الصرف، والجرود المنفذة بواسطة أمناء المستودعات.
              </p>
            </div>

            <button
              onClick={() => window.print()}
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة تقرير الأرشيف الرقابي</span>
            </button>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">بحث في الأرشيف</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="ابحث باسم أمين المستودع، اسم الصنف، البيان..."
                  value={archiveSearch}
                  onChange={e => setArchiveSearch(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">فلترة حسب نوع العملية</label>
              <select
                value={selectedActionFilter}
                onChange={e => setSelectedActionFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold"
              >
                <option value="all">جميع أنواع العمليات</option>
                <option value="inbound">توريد وتزويد (+كمية)</option>
                <option value="outbound">صرف للمبادرات (-كمية)</option>
                <option value="transfer">تحويل بين المستودعات</option>
                <option value="write_off">إتلاف وحسم موثق</option>
                <option value="audit">محاضر جرد وتدقيق</option>
                <option value="add_item">إضافة أصناف جديدة</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">فلترة حسب أمين المستودع</label>
              <select
                value={selectedStorekeeperFilter}
                onChange={e => setSelectedStorekeeperFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold"
              >
                <option value="all">جميع أمناء المستودعات</option>
                {storekeepers.map(sk => (
                  <option key={sk.id} value={sk.id}>{sk.name} ({sk.assignedWarehouseName})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Audit Logs Timeline Table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-2xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 font-black border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">التاريخ والوقت</th>
                  <th className="p-3">أمين المستودع / المنفذ</th>
                  <th className="p-3">نوع العملية</th>
                  <th className="p-3">بيان الحركة والتفاصيل</th>
                  <th className="p-3">الصنف والتأثير</th>
                  <th className="p-3">المستودع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {inventoryLogs
                  .filter(log => {
                    const matchQuery = 
                      (log.storekeeperName || "").toLowerCase().includes(archiveSearch.toLowerCase()) ||
                      (log.details || "").toLowerCase().includes(archiveSearch.toLowerCase()) ||
                      (log.itemName || "").toLowerCase().includes(archiveSearch.toLowerCase()) ||
                      (log.actionTitle || "").toLowerCase().includes(archiveSearch.toLowerCase());

                    const matchAction = selectedActionFilter === 'all' || log.actionType === selectedActionFilter;
                    const matchSk = selectedStorekeeperFilter === 'all' || log.storekeeperId === selectedStorekeeperFilter;

                    return matchQuery && matchAction && matchSk;
                  })
                  .map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-all">
                      <td className="p-3 font-mono text-[11px] text-slate-500 dir-ltr text-right">
                        {new Date(log.timestamp).toLocaleString("ar-SA")}
                      </td>
                      <td className="p-3 font-bold text-slate-800 dark:text-white">
                        <div className="flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>{log.storekeeperName || "أمين المستودع"}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black inline-block ${
                          log.actionType === 'inbound' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                          log.actionType === 'outbound' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' :
                          log.actionType === 'transfer' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                          log.actionType === 'write_off' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                          log.actionType === 'audit' ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {log.actionTitle || log.actionType}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-300 max-w-xs leading-relaxed">
                        {log.details}
                      </td>
                      <td className="p-3">
                        {log.itemName ? (
                          <div>
                            <span className="font-bold block text-slate-800 dark:text-slate-200">{log.itemName}</span>
                            {log.quantity && (
                              <span className={`text-[10px] font-extrabold dir-ltr inline-block ${
                                log.actionType === 'inbound' ? 'text-emerald-600' :
                                log.actionType === 'outbound' || log.actionType === 'write_off' ? 'text-rose-600' :
                                'text-slate-500'
                              }`}>
                                {log.actionType === 'inbound' ? `+${log.quantity}` : `-${log.quantity}`}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono">-</span>
                        )}
                      </td>
                      <td className="p-3 font-semibold text-slate-600 dark:text-slate-300">
                        {log.warehouseName || "المستودع الرئيسي"}
                      </td>
                    </tr>
                  ))}
                {inventoryLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-slate-400">
                      لا يوجد سجلات في أرشيف أمناء المستودعات حالياً.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* TAB 9: AID HANDOVERS TO BENEFICIARIES (تسليم مساعدات المستفيدين المعتمدة) */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === 'aid_handovers' && (() => {
        const activeAidDist = distributions.find(d => d.id === selectedAidDistId) || distributions[0];
        const linkedInvItem = activeAidDist?.inventoryItemId ? items.find(i => i.id === activeAidDist.inventoryItemId) : null;
        const targetedBenIds = activeAidDist?.targetedBeneficiaryIds || [];
        
        // Filtered beneficiaries for this batch
        const batchBeneficiaries = (targetedBenIds.length > 0 
          ? beneficiaries.filter(b => targetedBenIds.includes(b.id)) 
          : beneficiaries
        ).filter(b => {
          const matchQuery = !aidSearchQuery ||
            b.name.toLowerCase().includes(aidSearchQuery.toLowerCase()) ||
            (b.nationalId && b.nationalId.includes(aidSearchQuery)) ||
            (b.barcodeId && b.barcodeId.toLowerCase().includes(aidSearchQuery.toLowerCase())) ||
            (b.phone && b.phone.includes(aidSearchQuery));

          const isHanded = activeAidDist ? distributionHandovers.some(h => 
            h.distributionId === activeAidDist.id && (h.beneficiaryId === b.id || (h.nationalId && h.nationalId === b.nationalId))
          ) : false;

          if (aidStatusFilter === 'delivered') return matchQuery && isHanded;
          if (aidStatusFilter === 'pending') return matchQuery && !isHanded;
          return matchQuery;
        });

        // Current batch handovers
        const batchHandovers = activeAidDist 
          ? distributionHandovers.filter(h => h.distributionId === activeAidDist.id)
          : distributionHandovers;

        const totalAllocatedAll = distributions.reduce((acc, d) => acc + (Number(d.allocatedQuantity) || (Number(d.unitQuantityPerBeneficiary || 1) * (d.targetedBeneficiaryIds?.length || beneficiaries.length))), 0);
        const totalDeliveredAll = distributionHandovers.length;
        const totalReservedAll = items.reduce((acc, itm) => acc + (Number(itm.reservedQty) || 0), 0);
        const remainingAll = Math.max(0, totalAllocatedAll - totalDeliveredAll);

        // Export active batch to Excel
        const exportBatchToExcel = () => {
          if (!activeAidDist) return alert("يرجى اختيار دفعة مساعدة أولاً");
          const exportRows = batchBeneficiaries.map((b, idx) => {
            const hRecord = distributionHandovers.find(h => h.distributionId === activeAidDist.id && (h.beneficiaryId === b.id || (h.nationalId && h.nationalId === b.nationalId)));
            const allocatedQty = (activeAidDist.beneficiaryAllocations && activeAidDist.beneficiaryAllocations[b.id] !== undefined)
              ? activeAidDist.beneficiaryAllocations[b.id]
              : (activeAidDist.unitQuantityPerBeneficiary || 1);

            return {
              "م": idx + 1,
              "رقم الملف": b.beneficiaryNumber || b.id,
              "اسم المستفيد": b.name,
              "رقم الهوية": b.nationalId || "",
              "الجوال": b.phone || "",
              "فئة الاستحقاق": b.category || "أسر متعففة",
              "الصنف المخصص": activeAidDist.aidTypeLabel || activeAidDist.title,
              "الكمية المعتمدة": `${allocatedQty} ${activeAidDist.unit || 'طرد'}`,
              "حالة الاستلام": hRecord ? "تم التسليم بنجاح ✓" : "بانتظار الاستلام",
              "تاريخ ووقت الاستلام": hRecord ? `${hRecord.date} ${hRecord.time}` : "—",
              "الموظف المسلم": hRecord ? hRecord.handedByUserName : "—",
              "طريقة التحقق": hRecord ? (hRecord.method === 'camera_scanner' ? 'كاميرا الجوال' : hRecord.method === 'hardware_scanner' ? 'قارئ باركود' : 'يدوي') : "—",
              "توثيق الصورة": hRecord ? (hRecord.photoUrl || (hRecord.proofPhotos && hRecord.proofPhotos.length > 0) ? "موثقة بالصورة ✓" : "بدون صورة") : "—"
            };
          });

          const ws = XLSX.utils.json_to_sheet(exportRows);
          ws['!views'] = [{ RTL: true }];
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "كشف التسليم المعتمد");
          XLSX.writeFile(wb, `كشف_تسليم_المساعدات_${activeAidDist.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
        };

        return (
          <div className="space-y-6 animate-fade-in" dir="rtl">
            {/* Top Station Header & Action Banner */}
            <div className="bg-linear-to-l from-emerald-950 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
                    <Shield className="w-3.5 h-3.5" />
                    <span>نظام تسليم المساعدات المعتمدة • إدارة المخزون والمستودعات</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black flex items-center gap-3 text-white">
                    <span>محطة مسح الباركود وتسليم المساعدات للمستحقين</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                    التسليم متاح <span className="text-emerald-400 font-bold">فقط للمستفيدين المعتمدين</span> من قِبل إدارة المستفيدين. يتحقق النظام تلقائياً من الأهلية والباركود ويمنع التكرار تماماً مع التوثيق الإلزامي بالصورة الحية.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => {
                      if (!activeAidDist) return alert("يرجى اختيار حملة توزيع أو إنشاء دفعة مساعدة أولاً.");
                      setIsAidScannerOpen(true);
                    }}
                    className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm flex items-center gap-2 transition-all shadow-lg hover:shadow-emerald-500/20 cursor-pointer active:scale-95"
                  >
                    <Camera className="w-5 h-5 text-slate-950" />
                    <span>فتح محطة المسح والتسليم بالصورة</span>
                  </button>

                  <button
                    onClick={exportBatchToExcel}
                    className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all border border-white/15 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>تصدير الكشف (Excel)</span>
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all border border-white/15 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>طباعة الكشف</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block">إجمالي الكميات المخصصة</span>
                <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block font-mono">
                  {totalAllocatedAll} وحدة
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">في كافة دفعات المستفيدين</span>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block">المسلم فعلياً والموثق بالصور</span>
                <span className="text-2xl font-black text-emerald-600 mt-1 block font-mono">
                  {totalDeliveredAll} عملية
                </span>
                <span className="text-[11px] text-emerald-600 font-bold mt-1 block">خصمت من المستودع تلقائياً</span>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block">المتبقي للتسليم الميداني</span>
                <span className="text-2xl font-black text-amber-600 mt-1 block font-mono">
                  {remainingAll} وحدة
                </span>
                <span className="text-[11px] text-amber-500 font-bold mt-1 block">بانتظار حضور المستحقين</span>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold block">الرصيد المحجوز بالمخزون</span>
                <span className="text-2xl font-black text-purple-600 mt-1 block font-mono">
                  {totalReservedAll} وحدة
                </span>
                <span className="text-[11px] text-purple-600 font-bold mt-1 block">محمي من الصرف لجهات أخرى</span>
              </div>
            </div>

            {/* Distribution Batches Selector & Status Bar */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-emerald-600" />
                    <span>اختر دفعة المساعدات النشطة لتسليمها:</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <select
                      value={selectedAidDistId}
                      onChange={(e) => setSelectedAidDistId(e.target.value)}
                      className="px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-bold text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500 min-w-[280px]"
                    >
                      {distributions.map(dist => (
                        <option key={dist.id} value={dist.id}>
                          {dist.title} — ({dist.aidTypeLabel || dist.quantityPerBeneficiary}) [{dist.status === 'completed' ? 'مكتملة' : 'نشطة'}]
                        </option>
                      ))}
                    </select>

                    {activeAidDist && (
                      <span className={`px-3 py-1 rounded-full text-xs font-black ${
                        activeAidDist.status === 'completed'
                          ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {activeAidDist.status === 'completed' ? 'مكتملة الصرف' : 'دفعة نشطة جاهزة للتسليم'}
                      </span>
                    )}
                  </div>
                </div>

                {activeAidDist && (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {linkedInvItem && (
                      <div className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200">
                        <span className="text-[10px] text-indigo-500 block font-bold">صنف المخزون المرتبط:</span>
                        <span className="font-black">{linkedInvItem.name} (باركود: {linkedInvItem.barcode})</span>
                      </div>
                    )}
                    <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600">
                      <span className="text-[10px] text-slate-400 block font-bold">تاريخ الحملة:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{activeAidDist.distributionDate}</span>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600">
                      <span className="text-[10px] text-slate-400 block font-bold">الموقع:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{activeAidDist.location || "المستودع الرئيسي بالعسيلة"}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Progress Tracker for Active Batch */}
              {activeAidDist && (
                <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-700 dark:text-slate-300">
                      نسبة تسليم الدفعة: {batchHandovers.length} مستفيدين استلموا من أصل {targetedBenIds.length || beneficiaries.length} معتمدين
                    </span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
                      {Math.round((batchHandovers.length / Math.max(1, targetedBenIds.length || beneficiaries.length)) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.round((batchHandovers.length / Math.max(1, targetedBenIds.length || beneficiaries.length)) * 100))}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Approved Beneficiaries Table for Active Batch */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>الكشف المعتمد للمستحقين لهذه الدفعة ({batchBeneficiaries.length} مستفيد)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    الأسماء المعتمدة رسمياً من إدارة المستفيدين فقط — لا يتم الصرف لأي مستفيد غير وارد في هذا الكشف
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                  {/* Search Input */}
                  <div className="relative flex-1 md:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                    <input
                      type="text"
                      value={aidSearchQuery}
                      onChange={(e) => setAidSearchQuery(e.target.value)}
                      placeholder="بحث بالاسم، الهوية، الباركود..."
                      className="w-full pr-9 pl-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Status Filter */}
                  <select
                    value={aidStatusFilter}
                    onChange={(e: any) => setAidStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                  >
                    <option value="all">كافة المستحقين</option>
                    <option value="delivered">تم التسليم فقط</option>
                    <option value="pending">بانتظار الاستلام</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-700">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3 w-10 text-center">م</th>
                      <th className="p-3">اسم المستفيد وبياناته</th>
                      <th className="p-3 font-mono">رقم الهوية الوطنية</th>
                      <th className="p-3 font-mono">رقم الجوال</th>
                      <th className="p-3 text-center">الكمية المعتمدة</th>
                      <th className="p-3">حالة الاستلام</th>
                      <th className="p-3 text-center">توثيق الصورة</th>
                      <th className="p-3 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {batchBeneficiaries.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                          لا توجد أسماء مطابقة لمعايير البحث في هذا الكشف.
                        </td>
                      </tr>
                    ) : (
                      batchBeneficiaries.map((ben, idx) => {
                        const hRecord = activeAidDist ? distributionHandovers.find(h => 
                          h.distributionId === activeAidDist.id && (h.beneficiaryId === ben.id || (h.nationalId && h.nationalId === ben.nationalId))
                        ) : null;

                        const isDelivered = !!hRecord;
                        const allocatedQty = (activeAidDist?.beneficiaryAllocations && activeAidDist.beneficiaryAllocations[ben.id] !== undefined)
                          ? activeAidDist.beneficiaryAllocations[ben.id]
                          : (activeAidDist?.unitQuantityPerBeneficiary || 1);

                        const photoSrc = hRecord?.photoUrl || (hRecord?.proofPhotos && hRecord.proofPhotos[0]) || "";

                        return (
                          <tr key={ben.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                            <td className="p-3 text-center font-mono font-bold text-slate-400">{idx + 1}</td>
                            <td className="p-3">
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-slate-400" />
                                <span>{ben.name}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                                <span>الملف: {ben.beneficiaryNumber || ben.id}</span>
                                <span>•</span>
                                <span>باركود: {ben.barcodeId || "-"}</span>
                              </div>
                            </td>
                            <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">{ben.nationalId || "—"}</td>
                            <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{ben.phone || "—"}</td>
                            <td className="p-3 text-center font-mono font-black text-emerald-700 dark:text-emerald-400">
                              {allocatedQty} {activeAidDist?.unit || 'طرد'}
                            </td>
                            <td className="p-3">
                              {isDelivered ? (
                                <div>
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 inline-flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>تم التسليم بنجاح</span>
                                  </span>
                                  <p className="text-[9.5px] text-slate-400 font-mono mt-0.5">
                                    {hRecord.date} {hRecord.time} • المسلّم: {hRecord.handedByUserName}
                                  </p>
                                </div>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span>بانتظار الاستلام</span>
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {photoSrc ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedProofPhoto({ url: photoSrc, title: activeAidDist?.aidTypeLabel || "صورة استلام المساعدة", record: hRecord! })}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 rounded-lg text-[10.5px] font-bold border border-emerald-200 dark:border-emerald-800 cursor-pointer shadow-2xs"
                                >
                                  <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>عرض الصورة</span>
                                </button>
                              ) : isDelivered ? (
                                <span className="text-[10px] text-slate-400 italic">بدون صورة</span>
                              ) : (
                                <span className="text-[10px] text-slate-300">—</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <div className="inline-flex items-center gap-1.5 justify-center">
                                {!isDelivered && (
                                  <button
                                    onClick={() => {
                                      if (activeAidDist) {
                                        setSelectedAidDistId(activeAidDist.id);
                                        setIsAidScannerOpen(true);
                                      }
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                                  >
                                    <Camera className="w-3 h-3" />
                                    <span>تسليم الآن</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => setHistoryBeneficiary(ben)}
                                  className="px-2 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-700 dark:text-purple-300 text-[10.5px] font-bold border border-purple-200 dark:border-purple-800 transition-all cursor-pointer"
                                  title="عرض السجل التاريخي الكامل لكافة المساعدات المستلمة بالصور"
                                >
                                  <span>سجل المستفيد</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live Delivery Ledger with Photo Proofs */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-600" />
                    <span>سجل عمليات التسليم الفعلي الموثق بالصور للمستودع ({batchHandovers.length} عملية)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    توثيق فوري بالباركود، صورة الكاميرا، ختم التاريخ والوقت، واسم موظف المستودع المسؤول
                  </p>
                </div>

                <button
                  onClick={exportBatchToExcel}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تصدير السجل</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-700">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3 w-10 text-center">م</th>
                      <th className="p-3">المستفيد</th>
                      <th className="p-3">الصنف والتوزيعة</th>
                      <th className="p-3 text-center">الكمية المسلمة</th>
                      <th className="p-3">تاريخ ووقت التسليم</th>
                      <th className="p-3">الموظف المسلّم</th>
                      <th className="p-3">طريقة التحقق</th>
                      <th className="p-3 text-center">صورة الاستلام</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {batchHandovers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                          لم يتم تسجيل أي عمليات تسليم لهذه الدفعة حتى الآن.
                        </td>
                      </tr>
                    ) : (
                      batchHandovers.map((rec, idx) => {
                        const photoSrc = rec.photoUrl || (rec.proofPhotos && rec.proofPhotos[0]) || "";

                        return (
                          <tr key={rec.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                            <td className="p-3 text-center font-mono font-bold text-slate-400">{idx + 1}</td>
                            <td className="p-3">
                              <div className="font-bold text-slate-900 dark:text-white">{rec.beneficiaryName}</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{rec.nationalId || rec.barcodeId}</div>
                            </td>
                            <td className="p-3">
                              <span className="font-bold text-slate-800 dark:text-slate-200 block">{rec.itemName || rec.distributionTitle}</span>
                              <span className="text-[10px] text-slate-400 truncate block">{rec.distributionTitle}</span>
                            </td>
                            <td className="p-3 text-center font-mono font-black text-emerald-700 dark:text-emerald-400">
                              {rec.quantity || 1} {rec.unit || 'طرد'}
                            </td>
                            <td className="p-3">
                              <div className="font-mono font-bold text-slate-800 dark:text-slate-200">{rec.date}</div>
                              <div className="font-mono text-[10px] text-slate-400">{rec.time}</div>
                            </td>
                            <td className="p-3">
                              <div className="font-bold text-slate-800 dark:text-slate-200">{rec.handedByUserName}</div>
                              <div className="text-[10px] text-slate-400">{rec.handedDepartment || 'إدارة المستودع'}</div>
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                                {rec.method === 'camera_scanner' ? 'كاميرا الجوال' : rec.method === 'hardware_scanner' ? 'قارئ باركود' : 'إدخال يدوي'}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              {photoSrc ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedProofPhoto({ url: photoSrc, title: rec.itemName || "صورة الاستلام", record: rec })}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 rounded-lg text-[10.5px] font-bold border border-emerald-200 dark:border-emerald-800 cursor-pointer shadow-2xs"
                                >
                                  <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>عرض الصورة</span>
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">بدون صورة</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ------------------------------------------------------------------- */}
      {/* MODAL 1: ADD / EDIT INVENTORY ITEM */}
      {/* ------------------------------------------------------------------- */}
      {showAddItemModal && editingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-600" />
                <span>{editingItem.id ? 'تعديل الصنف المخزني' : 'إضافة صنف مخزني جديد'}</span>
              </h3>

              <button
                onClick={() => {
                  setShowAddItemModal(false);
                  setEditingItem(null);
                }}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">اسم المادة / الصنف *</label>
                  <input
                    type="text"
                    required
                    value={editingItem.name || ""}
                    onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                    placeholder="مثال: كرتون عبوات مياه الصفا 330 مل"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">الاسم المختصر</label>
                  <input
                    type="text"
                    value={editingItem.shortName || ""}
                    onChange={e => setEditingItem({ ...editingItem, shortName: e.target.value })}
                    placeholder="مثال: مياه الصفا 330مل"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">نوع المادة / التصنيف *</label>
                  <select
                    value={editingItem.type || "مواد غذائية"}
                    onChange={e => setEditingItem({ ...editingItem, type: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-semibold"
                  >
                    <option value="مواد غذائية">مواد غذائية</option>
                    <option value="عهد مستديمة">عهد مستديمة</option>
                    <option value="مستلزمات مكتبية">مستلزمات مكتبية</option>
                    <option value="أجهزة ومعدات">أجهزة ومعدات</option>
                    <option value="أدوية ومستلزمات طبية">أدوية ومستلزمات طبية</option>
                    <option value="كسوة وملابس">كسوة وملابس</option>
                    <option value="عام">عام</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">المستودع الرئيسي *</label>
                  <select
                    value={editingItem.warehouseId || warehouses[0]?.id || "wh-1"}
                    onChange={e => setEditingItem({ ...editingItem, warehouseId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-semibold"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">رمز الباركود (رمز استجابة)</label>
                  <input
                    type="text"
                    value={editingItem.barcode || ""}
                    onChange={e => setEditingItem({ ...editingItem, barcode: e.target.value })}
                    placeholder="تلقائي إن ترك فارغاً"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">الرقم التسلسلي (Serial Number)</label>
                  <input
                    type="text"
                    value={editingItem.serialNumber || ""}
                    onChange={e => setEditingItem({ ...editingItem, serialNumber: e.target.value })}
                    placeholder="مثال: SN-2026-9901"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">الكمية الابتدائية / الرصيد</label>
                  <input
                    type="number"
                    value={editingItem.currentQty ?? 50}
                    onChange={e => setEditingItem({ ...editingItem, currentQty: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">وحدة القياس</label>
                  <select
                    value={editingItem.unitOfMeasure || "كرتون"}
                    onChange={e => setEditingItem({ ...editingItem, unitOfMeasure: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-semibold"
                  >
                    <option value="كرتون">كرتون</option>
                    <option value="صندوق">صندوق</option>
                    <option value="قطعة">قطعة</option>
                    <option value="كيس">كيس</option>
                    <option value="وجبة">وجبة</option>
                    <option value="حبة">حبة</option>
                    <option value="طقم">طقم</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">حد أمان التنبيه (منخفض المخزون)</label>
                  <input
                    type="number"
                    value={editingItem.minStock ?? 10}
                    onChange={e => setEditingItem({ ...editingItem, minStock: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">سعر الشراء للوحدة (ر.س)</label>
                  <input
                    type="number"
                    value={editingItem.purchasePrice ?? 12}
                    onChange={e => setEditingItem({ ...editingItem, purchasePrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">تاريخ الإنتاج</label>
                  <input
                    type="date"
                    value={editingItem.productionDate || ""}
                    onChange={e => setEditingItem({ ...editingItem, productionDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">تاريخ الانتهاء</label>
                  <input
                    type="date"
                    value={editingItem.expiryDate || ""}
                    onChange={e => setEditingItem({ ...editingItem, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                  />
                </div>
              </div>

              <ImageUploadField
                label="صورة المادة أو الصنف (رفع ملف مباشر)"
                description="ارفع صورة المنتج أو الصنف مباشرة من جهازك أو اسحبها هنا"
                value={editingItem.imageUrl || ""}
                onChange={val => setEditingItem({ ...editingItem, imageUrl: val })}
                previewAspect="square"
              />

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1 text-xs">وصف تفصيلي وتعليمات التخزين</label>
                <textarea
                  rows={2}
                  value={editingItem.description || ""}
                  onChange={e => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs"
                ></textarea>
              </div>

              {/* Components Section (للسلال الغذائية والأصناف المركبة) */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                      <Boxes className="w-4 h-4 text-emerald-600" />
                      <span>مكونات الصنف (السلال الغذائية، الكراتين، الحزم المركبة)</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      أضف المكونات التفصيلية واربطها بأصناف المخزون لاحتساب طاقة التجهيز القصوى تلقائياً.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const currentComps = editingItem.components || [];
                      setEditingItem({
                        ...editingItem,
                        isCompound: true,
                        components: [
                          ...currentComps,
                          { id: "comp-" + Date.now(), name: "", quantity: 1, unit: "كجم", linkedItemId: "" }
                        ]
                      });
                    }}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border border-emerald-200 dark:border-emerald-800"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة مكون</span>
                  </button>
                </div>

                {editingItem.components && editingItem.components.length > 0 ? (
                  <div className="space-y-2">
                    <div className="hidden sm:grid grid-cols-12 gap-2 px-2 text-[11px] font-bold text-slate-400">
                      <span className="col-span-1 text-center">#</span>
                      <span className="col-span-3">اسم المكون</span>
                      <span className="col-span-2 text-center">الكمية للسلة</span>
                      <span className="col-span-2">الوحدة</span>
                      <span className="col-span-3">صنف المخزون الفعلي (للربط)</span>
                      <span className="col-span-1 text-center">حذف</span>
                    </div>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {editingItem.components.map((comp, idx) => (
                        <div key={comp.id || idx} className="p-2 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center text-xs">
                          <div className="col-span-1 text-center font-bold text-slate-400">
                            {idx + 1}
                          </div>

                          <div className="col-span-3">
                            <input
                              type="text"
                              placeholder="اسم المكون (أرز، زيت...)"
                              value={comp.name || ""}
                              onChange={e => {
                                const newComps = [...(editingItem.components || [])];
                                newComps[idx] = { ...newComps[idx], name: e.target.value };
                                setEditingItem({ ...editingItem, components: newComps });
                              }}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-bold"
                            />
                          </div>

                          <div className="col-span-2">
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              placeholder="الكمية"
                              value={comp.quantity}
                              onChange={e => {
                                const newComps = [...(editingItem.components || [])];
                                newComps[idx] = { ...newComps[idx], quantity: parseFloat(e.target.value) || 0 };
                                setEditingItem({ ...editingItem, components: newComps });
                              }}
                              className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-black text-center"
                            />
                          </div>

                          <div className="col-span-2">
                            <select
                              value={comp.unit || "كجم"}
                              onChange={e => {
                                const newComps = [...(editingItem.components || [])];
                                newComps[idx] = { ...newComps[idx], unit: e.target.value };
                                setEditingItem({ ...editingItem, components: newComps });
                              }}
                              className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 font-semibold"
                            >
                              <option value="كجم">كجم</option>
                              <option value="جرام">جرام</option>
                              <option value="لتر">لتر</option>
                              <option value="مل">مل</option>
                              <option value="كيس">كيس</option>
                              <option value="أكياس">أكياس</option>
                              <option value="حبة">حبة</option>
                              <option value="عبوة">عبوة</option>
                              <option value="كرتون">كرتون</option>
                              <option value="صندوق">صندوق</option>
                              <option value="أخرى">أخرى</option>
                            </select>
                          </div>

                          <div className="col-span-3">
                            <select
                              value={comp.linkedItemId || ""}
                              onChange={e => {
                                const newComps = [...(editingItem.components || [])];
                                const sel = items.find(i => i.id === e.target.value);
                                newComps[idx] = { 
                                  ...newComps[idx], 
                                  linkedItemId: e.target.value,
                                  name: newComps[idx].name || (sel ? sel.name : "")
                                };
                                setEditingItem({ ...editingItem, components: newComps });
                              }}
                              className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[11px] font-medium"
                            >
                              <option value="">(ربط بصنف متوفر)</option>
                              {items.filter(i => i.id !== editingItem.id).map(i => (
                                <option key={i.id} value={i.id}>
                                  {i.name} (رصيد: {i.currentQty} {i.unitOfMeasure})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="col-span-1 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                const newComps = (editingItem.components || []).filter((_, i) => i !== idx);
                                setEditingItem({ 
                                  ...editingItem, 
                                  components: newComps,
                                  isCompound: newComps.length > 0 
                                });
                              }}
                              className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Real-time Kit Capacity Summary inside Add/Edit Modal */}
                    {(() => {
                      const calc = calculateKitCapacity(editingItem.components, items.filter(i => i.id !== editingItem.id));
                      if (!calc || !calc.hasLinkedItems) return null;
                      return (
                        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Calculator className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            <span>
                              <strong>الحد الأقصى للتجهيز حالياً:</strong> {calc.maxKits} {editingItem.unitOfMeasure || 'سلة'}
                            </span>
                          </div>
                          {calc.bottleneck && (
                            <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium bg-white/70 dark:bg-emerald-900/60 px-2 py-0.5 rounded-lg">
                              المكون الأقل توفراً: <strong>{calc.bottleneck.name}</strong> (رصيد: {calc.bottleneck.stock} {calc.bottleneck.unit})
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400">
                    لا توجد مكونات مضافة لهذا الصنف بعد. اضغط "إضافة مكون" لإدخال مكونات السلة أو الحزمة (مثل الأرز، الزيت، السكر...).
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddItemModal(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all"
                >
                  حفظ الصنف بالمخزون
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODAL 1B: ITEM DETAILS & KIT COMPONENTS BREAKDOWN */}
      {/* ------------------------------------------------------------------- */}
      {showDetailModal && detailItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 my-8">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                {detailItem.imageUrl ? (
                  <img src={detailItem.imageUrl} alt="" className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-sm" />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-black text-xl">
                    {detailItem.name.substring(0, 1)}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-800 dark:text-white">
                      {detailItem.name}
                    </h3>
                    {detailItem.components && detailItem.components.length > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-1">
                        <Boxes className="w-3.5 h-3.5" />
                        <span>صنف مركب ({detailItem.components.length} مكونات)</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {detailItem.category} • {detailItem.warehouseName} • رف: {detailItem.shelf || 'عام'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setDetailItem(null);
                }}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* General Stock Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-200 dark:border-slate-600">
                <span className="text-[11px] text-slate-400 font-bold block mb-1">الرصيد المتوفر</span>
                <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">
                  {detailItem.currentQty} {detailItem.unitOfMeasure}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-200 dark:border-slate-600">
                <span className="text-[11px] text-slate-400 font-bold block mb-1">سعر الوحدة</span>
                <span className="text-lg font-black text-slate-800 dark:text-white">
                  {detailItem.purchasePrice || detailItem.unitPrice || 0} ر.س
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-200 dark:border-slate-600">
                <span className="text-[11px] text-slate-400 font-bold block mb-1">القيمة الإجمالية</span>
                <span className="text-lg font-black text-slate-800 dark:text-white">
                  {((detailItem.currentQty || 0) * (detailItem.purchasePrice || 0)).toLocaleString()} ر.س
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-200 dark:border-slate-600">
                <span className="text-[11px] text-slate-400 font-bold block mb-1">حد الأمان</span>
                <span className="text-lg font-black text-amber-600">
                  {detailItem.minStock || 10} {detailItem.unitOfMeasure}
                </span>
              </div>
            </div>

            {/* Description if any */}
            {detailItem.description && (
              <div className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                <p className="font-bold text-slate-700 dark:text-slate-200 mb-1">الوصف والتعليمات:</p>
                <p>{detailItem.description}</p>
              </div>
            )}

            {/* COMPOUND COMPONENTS BREAKDOWN & CAPACITY */}
            {detailItem.components && detailItem.components.length > 0 ? (
              <div className="space-y-4">
                {/* 1. Component List */}
                <div className="space-y-2">
                  <h4 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-emerald-600" />
                    <span>مكونات الصنف التفصيلية:</span>
                  </h4>

                  <div className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-2xl border border-slate-200 dark:border-slate-600">
                    <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-700 dark:text-slate-200 font-semibold">
                      {detailItem.components.map((comp, idx) => {
                        const linked = comp.linkedItemId ? items.find(i => i.id === comp.linkedItemId) : null;
                        return (
                          <li key={comp.id || idx} className="leading-relaxed">
                            <span className="font-black text-slate-900 dark:text-white">{comp.name}</span>: {comp.quantity} {comp.unit}
                            {linked && (
                              <span className="text-slate-400 font-normal mr-1.5 text-[11px]">
                                (مرتبط بـ: {linked.name})
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                </div>

                {/* 2. Stock Capacity Calculation */}
                {(() => {
                  const calc = calculateKitCapacity(detailItem.components, items.filter(i => i.id !== detailItem.id));
                  if (!calc) return null;
                  return (
                    <div className="space-y-2">
                      <h4 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                        <Calculator className="w-4 h-4 text-emerald-600" />
                        <span>حساب عدد السلال الممكن تجهيزها بناءً على أرصدة المخزون:</span>
                      </h4>

                      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-600">
                        <table className="w-full text-xs text-right">
                          <thead className="bg-slate-100 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-600">
                            <tr>
                              <th className="p-2.5">المكون</th>
                              <th className="p-2.5 text-center">الكمية للسلة</th>
                              <th className="p-2.5 text-center">رصيد المخزون المتوفر</th>
                              <th className="p-2.5 text-center">السلال الممكنة</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {calc.rows.map((row, idx) => {
                              const isBottleneck = calc.bottleneck && calc.bottleneck.name === row.name;
                              return (
                                <tr key={idx} className={isBottleneck ? "bg-amber-50/70 dark:bg-amber-950/30 font-bold" : ""}>
                                  <td className="p-2.5">
                                    <div className="flex items-center gap-1.5">
                                      <span>{row.name}</span>
                                      {isBottleneck && (
                                        <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-bold">
                                          المكون الأقل
                                        </span>
                                      )}
                                    </div>
                                    {row.linkedItemName && (
                                      <span className="text-[10px] text-slate-400 block">
                                        صنف: {row.linkedItemName}
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-2.5 text-center font-bold">
                                    {row.quantity} {row.unit}
                                  </td>
                                  <td className="p-2.5 text-center">
                                    {row.linkedItemId ? (
                                      <span className="font-bold text-slate-800 dark:text-slate-200">
                                        {row.stock} {row.unit}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 text-[10px]">غير مربوط بصنف</span>
                                    )}
                                  </td>
                                  <td className="p-2.5 text-center font-black">
                                    {row.kits !== null ? (
                                      <span className={isBottleneck ? "text-amber-600" : "text-emerald-600"}>
                                        {row.kits} سلة
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">—</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Actual Result Callout */}
                      {calc.hasLinkedItems && (
                        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1">
                          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 font-extrabold text-sm">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                            <span>الحد الفعلي الممكن تجهيزه: {calc.maxKits} {detailItem.unitOfMeasure || 'سلة'}</span>
                          </div>
                          {calc.bottleneck && (
                            <p className="text-xs text-emerald-700 dark:text-emerald-300 mr-7">
                              تم احتساب الحد بناءً على أقل مكون متوفر بالمخزون: <strong>{calc.bottleneck.name}</strong> (يتوفر منه {calc.bottleneck.stock} {calc.bottleneck.unit}، مما يسمح بتجهيز {calc.maxKits} {detailItem.unitOfMeasure || 'سلة'} فقط).
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-700/40 border border-dashed border-slate-200 dark:border-slate-600 text-center text-xs text-slate-400">
                هذا الصنف صنف بسيط مباشر، لا يحتوي على مكونات فرعية.
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setLabelItem(detailItem);
                    setShowLabelModal(true);
                  }}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Barcode className="w-4 h-4" />
                  <span>طباعة الباركود والـ QR</span>
                </button>

                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setEditingItem(detailItem);
                    setShowAddItemModal(true);
                  }}
                  className="px-3.5 py-2 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>تعديل الصنف ومكوناته</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowDetailModal(false);
                  setDetailItem(null);
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODAL 2: INBOUND MOVEMENT (ADD QUANTITY) */}
      {/* ------------------------------------------------------------------- */}
      {showInboundModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                <span>إذن توريد شحنة جديدة (+ كمية)</span>
              </h3>

              <button onClick={() => setShowInboundModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInboundSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">اختر الصنف التمويني *</label>
                <select
                  value={inboundItemId}
                  onChange={e => setInboundItemId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border font-bold"
                >
                  {items.map(i => (
                    <option key={i.id} value={i.id}>{i.name} (المتوفر حالياً: {i.currentQty})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">الكمية الموردة *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={inboundQty}
                  onChange={e => setInboundQty(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border font-extrabold text-emerald-700"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">اسم المورد / الشركة</label>
                <input
                  type="text"
                  value={inboundVendor}
                  onChange={e => setInboundVendor(e.target.value)}
                  placeholder="شركة مياه الصفا / التموين الوطني"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">رقم الفاتورة / أمر الشراء</label>
                <input
                  type="text"
                  value={inboundInvoice}
                  onChange={e => setInboundInvoice(e.target.value)}
                  placeholder="INV-2026-90"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border font-mono"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">سبب التوريد / ملاحظات</label>
                <textarea
                  rows={2}
                  value={inboundReason}
                  onChange={e => setInboundReason(e.target.value)}
                  placeholder="تجهيز شحنة جديدة لمبادرات رمضان وسقيا الحرم"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowInboundModal(false)} className="px-4 py-2 rounded-xl font-bold text-slate-500">إلغاء</button>
                <button type="submit" className="px-5 py-2 rounded-xl font-bold bg-emerald-600 text-white shadow-md">إضافة التوريد</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODAL 3: OUTBOUND ISSUANCE (LINK TO INITIATIVE) */}
      {/* ------------------------------------------------------------------- */}
      {showOutboundModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-blue-600" />
                <span>إذن صرف ميداني لمبادرة (- كمية)</span>
              </h3>

              <button onClick={() => setShowOutboundModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOutboundSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">الصنف المراد صرفه *</label>
                <select
                  value={outboundItemId}
                  onChange={e => setOutboundItemId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border font-bold"
                >
                  {items.map(i => (
                    <option key={i.id} value={i.id}>{i.name} (المتوفر: {i.currentQty} {i.unitOfMeasure})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">الكمية المصروفة *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={outboundQty}
                  onChange={e => setOutboundQty(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border font-extrabold text-blue-700"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">ربط بمبادرة من النظام (خصم تلقائي)</label>
                <select
                  value={outboundInitiativeId}
                  onChange={e => setOutboundInitiativeId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border font-bold text-emerald-700"
                >
                  <option value="">بدون ربط (صرف عام)</option>
                  {initiatives.slice(0, 30).map(init => (
                    <option key={init.id} value={init.id}>{init.name} - ({init.date})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">اسم المستلم / القائد الميداني</label>
                <input
                  type="text"
                  value={outboundRecipient}
                  onChange={e => setOutboundRecipient(e.target.value)}
                  placeholder="سعود الحربي (قائد الفريق التنظيمي)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">سبب الصرف / تفاصيل</label>
                <textarea
                  rows={2}
                  value={outboundReason}
                  onChange={e => setOutboundReason(e.target.value)}
                  placeholder="صرف لسقيا المعتمرين بجامع الرضوان بالعسيلة"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowOutboundModal(false)} className="px-4 py-2 rounded-xl font-bold text-slate-500">إلغاء</button>
                <button type="submit" className="px-5 py-2 rounded-xl font-bold bg-blue-600 text-white shadow-md">تأكيد إذن الصرف</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODAL 4: BARCODE SCANNER SIMULATOR */}
      {/* ------------------------------------------------------------------- */}
      {showScannerModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Barcode className="w-5 h-5 text-emerald-600" />
                <span>الماسح الضوئي الذكي للباركود والـ QR Code</span>
              </h3>

              <button onClick={() => setShowScannerModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Simulated Live Camera Scanner View */}
            <div className="relative bg-slate-900 rounded-2xl h-48 overflow-hidden border-2 border-emerald-500 flex flex-col items-center justify-center text-white text-center p-4">
              <div className="absolute inset-0 bg-emerald-500/10 animate-pulse"></div>
              <div className="w-48 h-24 border-2 border-dashed border-emerald-400 rounded-xl relative flex items-center justify-center">
                <div className="w-full h-0.5 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,1)] animate-bounce"></div>
              </div>
              <p className="text-xs text-emerald-300 font-bold mt-3 relative z-10">
                كاميرا الكشف المباشر مفعّلة: وجه الكاميرا للباركود أو أدخل الرمز أدناه
              </p>
            </div>

            {/* Manual input for scanner testing */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={scannedCodeInput}
                  onChange={e => setScannedCodeInput(e.target.value)}
                  placeholder="أدخل رمز الباركود أو الرقم التسلسلي..."
                  className="flex-1 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 border text-xs font-mono font-bold"
                />
                <button
                  onClick={handleSimulateScan}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
                >
                  فحص الرمز
                </button>
              </div>

              {/* Sample test barcodes button list */}
              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                <span className="text-slate-400 font-semibold">أكواد سريعة للتجربة:</span>
                {items.slice(0, 4).map(i => (
                  <button
                    key={i.id}
                    onClick={() => {
                      setScannedCodeInput(i.barcode);
                      setScannedResultItem(i);
                    }}
                    className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-2 py-1 rounded hover:bg-emerald-100 hover:text-emerald-800 font-mono"
                  >
                    {i.barcode}
                  </button>
                ))}
              </div>
            </div>

            {/* Scanned Result Card */}
            {scannedResultItem && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    تم التطابق بنجاح ✅
                  </span>
                  <span className="text-xs font-mono text-emerald-800 dark:text-emerald-300 font-bold">
                    {scannedResultItem.barcode}
                  </span>
                </div>

                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{scannedResultItem.name}</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <p>الرصيد المتاح: <strong className="text-emerald-700">{scannedResultItem.currentQty} {scannedResultItem.unitOfMeasure}</strong></p>
                  <p>المستودع: <strong>{scannedResultItem.warehouseName}</strong></p>
                  <p>سعر الشراء: <strong>{scannedResultItem.purchasePrice} ر.س</strong></p>
                  <p>الرف: <strong>{scannedResultItem.shelf || 'عام'}</strong></p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-emerald-200/60">
                  <button
                    onClick={() => {
                      setShowScannerModal(false);
                      setInboundItemId(scannedResultItem.id);
                      setShowInboundModal(true);
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-xl transition-all"
                  >
                    + إذن توريد لهذا الصنف
                  </button>

                  <button
                    onClick={() => {
                      setShowScannerModal(false);
                      setOutboundItemId(scannedResultItem.id);
                      setShowOutboundModal(true);
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-xl transition-all"
                  >
                    - إذن صرف لهذا الصنف
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODAL 5: PRINTABLE BARCODE & QR LABEL */}
      {/* ------------------------------------------------------------------- */}
      {showLabelModal && labelItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Barcode className="w-4 h-4 text-emerald-600" />
                <span>ملصق الباركود المعتمد</span>
              </h3>

              <button onClick={() => setShowLabelModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Physical Label Design */}
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 p-4 rounded-2xl bg-white text-slate-900 text-center space-y-2 shadow-inner">
              <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest">جمعية ريادة العطاء لخدمة الإنسان بالعسيلة</p>
              <h4 className="font-extrabold text-xs text-slate-900">{labelItem.name}</h4>
              
              {/* Simulated CSS Barcode Lines */}
              <div className="py-2 flex items-center justify-center gap-1 bg-slate-50 rounded-lg">
                <div className="w-1 h-12 bg-black"></div>
                <div className="w-2 h-12 bg-black"></div>
                <div className="w-0.5 h-12 bg-black"></div>
                <div className="w-1.5 h-12 bg-black"></div>
                <div className="w-1 h-12 bg-black"></div>
                <div className="w-2.5 h-12 bg-black"></div>
                <div className="w-0.5 h-12 bg-black"></div>
                <div className="w-1.5 h-12 bg-black"></div>
                <div className="w-1 h-12 bg-black"></div>
                <div className="w-2 h-12 bg-black"></div>
              </div>

              <p className="font-mono text-xs font-black tracking-widest">{labelItem.barcode}</p>
              <div className="flex justify-between text-[9px] text-slate-500 font-bold border-t pt-1">
                <span>كود: {labelItem.internalCode || 'FOOD'}</span>
                <span>المستودع: {labelItem.warehouseName}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowLabelModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500">إغلاق</button>
              <button onClick={() => window.print()} className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white shadow-md flex items-center gap-1.5">
                <Printer className="w-4 h-4" />
                <span>طباعة الملصق</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODAL 6: STOCK AUDIT SESSION FORM */}
      {/* ------------------------------------------------------------------- */}
      {showAuditModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-600" />
                <span>إعداد محضر جرد وتحقق ميداني من الرصيد</span>
              </h3>

              <button onClick={() => setShowAuditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAuditRecord} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">عنوان محضر الجرد *</label>
                  <input
                    type="text"
                    required
                    value={auditTitle}
                    onChange={e => setAuditTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">تحديد المستودع المجرود *</label>
                  <select
                    value={auditWarehouseId}
                    onChange={e => handleStartAuditSession(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border font-bold"
                  >
                    <option value="all">جميع المستودعات (جرد شامل)</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items Audit Table */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold sticky top-0">
                    <tr>
                      <th className="p-2.5">الصنف</th>
                      <th className="p-2.5">الرصيد بالنظام</th>
                      <th className="p-2.5">الجرد الفعلي *</th>
                      <th className="p-2.5">فارق الجرد</th>
                      <th className="p-2.5">ملاحظات / سبب التفاوت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {items
                      .filter(i => i.warehouseId === auditWarehouseId || auditWarehouseId === "all")
                      .map(item => {
                        const currentAudit = auditItemsState[item.id] || { actualQty: item.currentQty, reason: "مطابقة" };
                        const variance = Number(currentAudit.actualQty) - item.currentQty;

                        return (
                          <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                            <td className="p-2.5 font-bold text-slate-800 dark:text-white">
                              {item.name}
                              <span className="block text-[10px] text-slate-400 font-mono">{item.barcode}</span>
                            </td>

                            <td className="p-2.5 font-black text-slate-700 dark:text-slate-300">
                              {item.currentQty} {item.unitOfMeasure}
                            </td>

                            <td className="p-2.5">
                              <input
                                type="number"
                                min={0}
                                value={currentAudit.actualQty}
                                onChange={e => {
                                  setAuditItemsState({
                                    ...auditItemsState,
                                    [item.id]: {
                                      ...currentAudit,
                                      actualQty: Number(e.target.value)
                                    }
                                  });
                                }}
                                className="w-20 px-2 py-1 rounded-lg border bg-white dark:bg-slate-700 font-extrabold text-emerald-700 text-center"
                              />
                            </td>

                            <td className="p-2.5 font-black">
                              <span className={variance === 0 ? "text-emerald-600" : "text-amber-600"}>
                                {variance > 0 ? `+${variance}` : variance}
                              </span>
                            </td>

                            <td className="p-2.5">
                              <input
                                type="text"
                                value={currentAudit.reason}
                                onChange={e => {
                                  setAuditItemsState({
                                    ...auditItemsState,
                                    [item.id]: {
                                      ...currentAudit,
                                      reason: e.target.value
                                    }
                                  });
                                }}
                                className="w-full px-2 py-1 rounded-lg border bg-white dark:bg-slate-700 text-[11px]"
                              />
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200">
                <input
                  type="checkbox"
                  id="syncDb"
                  checked={applyAuditToDb}
                  onChange={e => setApplyAuditToDb(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="syncDb" className="font-bold text-amber-900 dark:text-amber-200 cursor-pointer">
                  تحديث الأرصدة الحالية في قاعدة البيانات تلقائياً لتطابق كميات الجرد الفعلي فور الاعتماد
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAuditModal(false)} className="px-4 py-2 rounded-xl font-bold text-slate-500">إلغاء</button>
                <button type="submit" className="px-5 py-2 rounded-xl font-bold bg-emerald-600 text-white shadow-md">اعتماد محضر الجرد</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODAL 7: WAREHOUSE ADD/EDIT */}
      {/* ------------------------------------------------------------------- */}
      {showWhModal && editingWh && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-emerald-600" />
                <span>إضافة / تعديل مستودع</span>
              </h3>

              <button onClick={() => setShowWhModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWarehouse} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">اسم المستودع *</label>
                <input
                  type="text"
                  required
                  value={editingWh.name || ""}
                  onChange={e => setEditingWh({ ...editingWh, name: e.target.value })}
                  placeholder="مستودع الكسوة والأجهزة"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">الموقع والتفاصيل</label>
                <input
                  type="text"
                  value={editingWh.location || ""}
                  onChange={e => setEditingWh({ ...editingWh, location: e.target.value })}
                  placeholder="مكة المكرمة - مخطط العسيلة"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">اسم المسؤول المباشر *</label>
                <input
                  type="text"
                  required
                  value={editingWh.managerName || ""}
                  onChange={e => setEditingWh({ ...editingWh, managerName: e.target.value })}
                  placeholder="أ. سليم الحربي"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">رقم جوال المسؤول</label>
                <input
                  type="text"
                  value={editingWh.managerPhone || ""}
                  onChange={e => setEditingWh({ ...editingWh, managerPhone: e.target.value })}
                  placeholder="0550112233"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowWhModal(false)} className="px-4 py-2 rounded-xl font-bold text-slate-500">إلغاء</button>
                <button type="submit" className="px-5 py-2 rounded-xl font-bold bg-emerald-600 text-white shadow-md">حفظ المستودع</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODAL 8: VENDOR ADD/EDIT */}
      {/* ------------------------------------------------------------------- */}
      {showVendorModal && editingVendor && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-600" />
                <span>إضافة / تعديل مورد معتمد</span>
              </h3>

              <button onClick={() => setShowVendorModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVendor} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">اسم المورد / الشركة *</label>
                <input
                  type="text"
                  required
                  value={editingVendor.name || ""}
                  onChange={e => setEditingVendor({ ...editingVendor, name: e.target.value })}
                  placeholder="شركة مياه الصفا والمروة"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">رقم الجوال / الهاتف *</label>
                <input
                  type="text"
                  required
                  value={editingVendor.phone || ""}
                  onChange={e => setEditingVendor({ ...editingVendor, phone: e.target.value })}
                  placeholder="0551122334"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border font-mono"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">مسؤول الاتصال والمبيعات</label>
                <input
                  type="text"
                  value={editingVendor.contactPerson || ""}
                  onChange={e => setEditingVendor({ ...editingVendor, contactPerson: e.target.value })}
                  placeholder="أ. أحمد الصفا"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">رقم السجل التجاري</label>
                <input
                  type="text"
                  value={editingVendor.crNumber || ""}
                  onChange={e => setEditingVendor({ ...editingVendor, crNumber: e.target.value })}
                  placeholder="4030112233"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowVendorModal(false)} className="px-4 py-2 rounded-xl font-bold text-slate-500">إلغاء</button>
                <button type="submit" className="px-5 py-2 rounded-xl font-bold bg-emerald-600 text-white shadow-md">حفظ المورد</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODAL 9: ADD / EDIT STOREKEEPER */}
      {/* ------------------------------------------------------------------- */}
      {showStorekeeperModal && editingStorekeeper && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-500" />
                <span>{editingStorekeeper.id ? 'تعديل حساب أمين مستودع' : 'إضافة حساب أمين مستودع جديد'}</span>
              </h3>

              <button onClick={() => setShowStorekeeperModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStorekeeper} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">الاسم الكامل لأمين المستودع *</label>
                <input
                  type="text"
                  required
                  value={editingStorekeeper.name || ""}
                  onChange={e => setEditingStorekeeper({ ...editingStorekeeper, name: e.target.value })}
                  placeholder="مثال: أ. عبد الرحمن الشهري"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">رقم الهوية / الإقامة *</label>
                  <input
                    type="text"
                    required
                    value={editingStorekeeper.nationalId || ""}
                    onChange={e => setEditingStorekeeper({ ...editingStorekeeper, nationalId: e.target.value })}
                    placeholder="1012345678"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">رقم الجوال *</label>
                  <input
                    type="text"
                    required
                    value={editingStorekeeper.phone || ""}
                    onChange={e => setEditingStorekeeper({ ...editingStorekeeper, phone: e.target.value })}
                    placeholder="0550123456"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">البريد الإلكتروني / اسم الدخول</label>
                  <input
                    type="email"
                    value={editingStorekeeper.email || ""}
                    onChange={e => setEditingStorekeeper({ ...editingStorekeeper, email: e.target.value })}
                    placeholder="storekeeper1@riadataleata.org.sa"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">كلمة المرور *</label>
                  <input
                    type="text"
                    required
                    value={editingStorekeeper.password || "123"}
                    onChange={e => setEditingStorekeeper({ ...editingStorekeeper, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">المستودع المخصص *</label>
                <select
                  value={editingStorekeeper.assignedWarehouseId || "all"}
                  onChange={e => {
                    const selectedWh = warehouses.find(w => w.id === e.target.value);
                    setEditingStorekeeper({
                      ...editingStorekeeper,
                      assignedWarehouseId: e.target.value,
                      assignedWarehouseName: selectedWh ? selectedWh.name : "جميع المستودعات"
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border font-bold"
                >
                  <option value="all">جميع المستودعات والمستودع المركزي</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.location || 'مكة المكرمة'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">الصلاحيات المتاحة لأمين المستودع</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl border border-slate-200/60">
                  {[
                    { id: 'inbound', label: 'التوريد واستلام الشحنات (+كمية)' },
                    { id: 'outbound', label: 'الصرف للمبادرات والفرسان (-كمية)' },
                    { id: 'transfer', label: 'النقل بين المستودعات' },
                    { id: 'write_off', label: 'محاضر الإتلاف والحسم الميداني' },
                    { id: 'audit', label: 'الجرد الميداني والمطابقة' },
                    { id: 'items', label: 'إضافة أصناف مخزنية جديدة' }
                  ].map(p => {
                    const currentPerms: string[] = editingStorekeeper.permissions || [];
                    const isChecked = currentPerms.includes(p.id);
                    return (
                      <label key={p.id} className="flex items-center gap-2 cursor-pointer text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) {
                              setEditingStorekeeper({
                                ...editingStorekeeper,
                                permissions: [...currentPerms, p.id]
                              });
                            } else {
                              setEditingStorekeeper({
                                ...editingStorekeeper,
                                permissions: currentPerms.filter(x => x !== p.id)
                              });
                            }
                          }}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>{p.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">حالة الحساب</label>
                <select
                  value={editingStorekeeper.status || "active"}
                  onChange={e => setEditingStorekeeper({ ...editingStorekeeper, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border font-bold"
                >
                  <option value="active">مفعّل وجاهز للاستخدام</option>
                  <option value="inactive">موقوف مؤقتاً</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button type="button" onClick={() => setShowStorekeeperModal(false)} className="px-4 py-2 rounded-xl font-bold text-slate-500">
                  إلغاء
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl font-bold bg-emerald-600 text-white shadow-md hover:bg-emerald-700 transition-all">
                  حفظ الحساب وتفعيل الصلاحيات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AID HANDOVER SCANNER & PHOTO CAPTURE MODAL */}
      {isAidScannerOpen && onHandoverSubmit && (
        <AidHandoverScannerModal
          isOpen={isAidScannerOpen}
          onClose={() => setIsAidScannerOpen(false)}
          distributions={distributions}
          selectedDistributionId={selectedAidDistId}
          beneficiaries={beneficiaries}
          handoverRecords={distributionHandovers}
          currentUser={currentUser}
          onHandoverSubmit={onHandoverSubmit}
          lang="ar"
        />
      )}

      {/* BENEFICIARY AID HISTORY MODAL */}
      {historyBeneficiary && (
        <BeneficiaryHistoryModal
          beneficiary={historyBeneficiary}
          handoverRecords={distributionHandovers}
          isOpen={!!historyBeneficiary}
          onClose={() => setHistoryBeneficiary(null)}
          lang="ar"
        />
      )}

      {/* PHOTO PREVIEW SUB-MODAL */}
      {selectedProofPhoto && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 p-4" 
          onClick={() => setSelectedProofPhoto(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-5 space-y-4 text-right shadow-2xl border border-slate-200 dark:border-slate-800" 
            onClick={e => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="font-black text-sm text-slate-900 dark:text-white">
                  توثيق استلام المساعدة: {selectedProofPhoto.record.itemName || "مساعدة"}
                </h4>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  المستفيد: {selectedProofPhoto.record.beneficiaryName} • {selectedProofPhoto.record.date} {selectedProofPhoto.record.time}
                </p>
              </div>
              <button onClick={() => setSelectedProofPhoto(null)} className="p-1 text-slate-400 hover:text-slate-200 font-bold">✕</button>
            </div>

            <div className="rounded-2xl overflow-hidden bg-black max-h-[65vh] flex items-center justify-center border border-slate-200 dark:border-slate-800">
              <img src={selectedProofPhoto.url} alt="صورة التسليم" className="w-full h-auto max-h-[60vh] object-contain" />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
              <div>الموظف الذي سلّم: <b>{selectedProofPhoto.record.handedByUserName}</b></div>
              <div>الكمية المسلمة: <b>{selectedProofPhoto.record.quantity} {selectedProofPhoto.record.unit || 'طرد'}</b></div>
              <div>الإدارة: <b>{selectedProofPhoto.record.handedDepartment || 'إدارة المستودع'}</b></div>
              <div>رقم السند: <b className="font-mono text-[10px]">{selectedProofPhoto.record.id}</b></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
