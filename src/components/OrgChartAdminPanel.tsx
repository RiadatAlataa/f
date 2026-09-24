import React, { useState, useMemo } from "react";
import { 
  Network, Users, Plus, Trash2, Edit3, Eye, EyeOff, 
  Save, ArrowUp, ArrowDown, Crown, Shield, Building2, 
  Search, Check, X, AlertCircle, Sparkles, RefreshCw,
  HelpCircle, UserCheck, Briefcase
} from "lucide-react";
import { OrgMember } from "../types";
import { ImageUploadField } from "./ImageUploadField";

interface OrgChartAdminPanelProps {
  members: OrgMember[];
  onAddMember: (member: Partial<OrgMember>) => Promise<boolean>;
  onDeleteMember: (id: string) => Promise<boolean>;
  onToggleMemberActive: (id: string, isActive?: boolean) => Promise<boolean>;
  onBatchUpdateMembers: (members: OrgMember[]) => Promise<boolean>;
  onImportDirectors?: () => Promise<boolean>;
  lang?: "ar" | "en";
}

export const OrgChartAdminPanel: React.FC<OrgChartAdminPanelProps> = ({
  members = [],
  onAddMember,
  onDeleteMember,
  onToggleMemberActive,
  onBatchUpdateMembers,
  onImportDirectors,
  lang = "ar"
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState<number | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<OrgMember | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Form State
  const [formData, setFormData] = useState<{
    id?: string;
    name: string;
    roleTitle: string;
    level: number;
    levelName: string;
    parentId: string;
    parentName: string;
    imageUrl: string;
    description: string;
    order: number;
    isActive: boolean;
    department: string;
    email: string;
    phone: string;
  }>({
    name: "",
    roleTitle: "",
    level: 1,
    levelName: "مجلس الإدارة",
    parentId: "",
    parentName: "",
    imageUrl: "",
    description: "",
    order: 1,
    isActive: true,
    department: "",
    email: "",
    phone: ""
  });

  // Sorted members
  const sortedMembers = useMemo(() => {
    return [...(members || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [members]);

  // Filtered members for table
  const filteredMembers = useMemo(() => {
    return sortedMembers.filter(m => {
      const matchSearch = !searchTerm || 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.roleTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.department && m.department.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchLevel = levelFilter === 'all' || m.level === levelFilter;
      return matchSearch && matchLevel;
    });
  }, [sortedMembers, searchTerm, levelFilter]);

  // Reset and open modal for new member
  const handleOpenAdd = () => {
    setEditingMember(null);
    setFormData({
      name: "",
      roleTitle: "",
      level: 1,
      levelName: "مجلس الإدارة",
      parentId: "",
      parentName: "",
      imageUrl: "",
      description: "",
      order: sortedMembers.length + 1,
      isActive: true,
      department: "",
      email: "",
      phone: ""
    });
    setIsModalOpen(true);
  };

  // Open modal to edit existing member
  const handleOpenEdit = (member: OrgMember) => {
    setEditingMember(member);
    setFormData({
      id: member.id,
      name: member.name || "",
      roleTitle: member.roleTitle || "",
      level: member.level || 1,
      levelName: member.levelName || (member.level === 1 ? "مجلس الإدارة" : member.level === 2 ? "الإدارة التنفيذية" : "الإدارات والأقسام"),
      parentId: member.parentId || "",
      parentName: member.parentName || "",
      imageUrl: member.imageUrl || "",
      description: member.description || "",
      order: member.order || 1,
      isActive: member.isActive !== false,
      department: member.department || "",
      email: member.email || "",
      phone: member.phone || ""
    });
    setIsModalOpen(true);
  };

  // Submit member add/edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.roleTitle.trim()) {
      alert(lang === "ar" ? "يرجى كتابة اسم الشخص والمسمى الوظيفي" : "Please provide name and job title");
      return;
    }

    setIsSaving(true);
    try {
      // Resolve parentName if parentId selected
      let parentName = "";
      if (formData.parentId) {
        const parent = sortedMembers.find(m => m.id === formData.parentId);
        if (parent) parentName = parent.name;
      }

      // Level default title
      let levelName = formData.levelName;
      if (formData.level === 1) levelName = "مجلس الإدارة";
      else if (formData.level === 2) levelName = "الإدارة التنفيذية";
      else if (formData.level === 3) levelName = "الإدارات والأقسام";
      else if (formData.level === 4) levelName = "المسؤولون والكوادر";

      const payload: Partial<OrgMember> = {
        ...(editingMember ? { id: editingMember.id } : {}),
        name: formData.name.trim(),
        roleTitle: formData.roleTitle.trim(),
        level: Number(formData.level),
        levelName,
        parentId: formData.parentId || null,
        parentName,
        imageUrl: formData.imageUrl.trim(),
        description: formData.description.trim(),
        order: Number(formData.order) || 1,
        isActive: formData.isActive,
        department: formData.department.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim()
      };

      const ok = await onAddMember(payload);
      if (ok) {
        setIsModalOpen(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Move member up/down in order
  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sortedMembers.length) return;

    const list = [...sortedMembers];
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    // Re-assign sequence order
    const updated = list.map((item, idx) => ({
      ...item,
      order: idx + 1
    }));

    await onBatchUpdateMembers(updated);
  };

  // Import existing directors
  const handleImport = async () => {
    if (!onImportDirectors) return;
    if (confirm(lang === "ar" ? "هل ترغب في استيراد مدراء الإدارات المسجلين حالياً بالنظام كأعضاء في المستوى الثالث تلقائياً؟" : "Import directors from departments?")) {
      setIsImporting(true);
      try {
        await onImportDirectors();
      } finally {
        setIsImporting(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-emerald-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-emerald-700/50">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">
              <Network className="w-3.5 h-3.5" />
              <span>{lang === "ar" ? "إدارة الهيكل الإداري والتنظيمي" : "Organizational Chart Management"}</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight">
              {lang === "ar" ? "إدارة الهيكل الإداري" : "Administrative Structure"}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100 max-w-2xl font-medium leading-relaxed">
              {lang === "ar"
                ? "التحكم الكامل بأعضاء مجلس الإدارة، الإدارة التنفيذية، مدراء الإدارات والكوادر، وتحديد التسلسل القيادي المباشر وترتيب الظهور في الصفحة الرئيسية."
                : "Manage board members, executives, directors, hierarchical relationships, and homepage display order."}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {onImportDirectors && (
              <button
                type="button"
                onClick={handleImport}
                disabled={isImporting}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 backdrop-blur-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isImporting ? 'animate-spin' : ''}`} />
                <span>{lang === "ar" ? "استيراد مدراء الإدارات" : "Import Directors"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-neutral-950 text-xs font-black shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === "ar" ? "إضافة شخص جديد للهيكل" : "Add New Member"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xs">
          <span className="text-xs text-neutral-500 font-bold block">{lang === "ar" ? "إجمالي الأعضاء" : "Total Members"}</span>
          <span className="text-xl font-black text-neutral-900 dark:text-white mt-1 block">{sortedMembers.length}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xs">
          <span className="text-xs text-amber-600 font-bold block">{lang === "ar" ? "مجلس الإدارة" : "Board"}</span>
          <span className="text-xl font-black text-amber-700 dark:text-amber-400 mt-1 block">
            {sortedMembers.filter(m => m.level === 1).length}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xs">
          <span className="text-xs text-emerald-600 font-bold block">{lang === "ar" ? "الإدارة التنفيذية" : "Executive"}</span>
          <span className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1 block">
            {sortedMembers.filter(m => m.level === 2).length}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xs">
          <span className="text-xs text-blue-600 font-bold block">{lang === "ar" ? "الإدارات والكوادر" : "Departments"}</span>
          <span className="text-xl font-black text-blue-700 dark:text-blue-400 mt-1 block">
            {sortedMembers.filter(m => (m.level || 3) >= 3).length}
          </span>
        </div>
      </div>

      {/* Toolbar & Search */}
      <div className="p-4 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={lang === "ar" ? "بحث بالاسم أو المسمى الوظيفي..." : "Search members..."}
            className="w-full pr-9 pl-4 py-2 text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-neutral-800 dark:text-neutral-200"
          />
        </div>

        {/* Level Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setLevelFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              levelFilter === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-neutral-100 dark:bg-neutral-700/60 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            {lang === "ar" ? `الكل (${sortedMembers.length})` : `All (${sortedMembers.length})`}
          </button>
          <button
            type="button"
            onClick={() => setLevelFilter(1)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              levelFilter === 1
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-neutral-100 dark:bg-neutral-700/60 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            {lang === "ar" ? "مجلس الإدارة" : "Board"}
          </button>
          <button
            type="button"
            onClick={() => setLevelFilter(2)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              levelFilter === 2
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-neutral-100 dark:bg-neutral-700/60 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            {lang === "ar" ? "الإدارة التنفيذية" : "Executive"}
          </button>
          <button
            type="button"
            onClick={() => setLevelFilter(3)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              levelFilter === 3
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-neutral-100 dark:bg-neutral-700/60 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            {lang === "ar" ? "الإدارات والأقسام" : "Departments"}
          </button>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white dark:bg-neutral-800 rounded-3xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden">
        {filteredMembers.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-200 dark:border-emerald-800">
              <Network className="w-8 h-8" />
            </div>
            <h3 className="text-base font-black text-neutral-900 dark:text-white">
              {lang === "ar" ? "لا يوجد أشخاص مسجلين في الهيكل الإداري حالياً" : "No members found"}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-md mx-auto">
              {lang === "ar"
                ? "يمكنك البدء بإضافة رئيس مجلس الإدارة والمدير التنفيذي أو استيراد مدراء الإدارات تلقائياً بضغطة زر."
                : "Add leadership members to display them automatically on the homepage."}
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleOpenAdd}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{lang === "ar" ? "إضافة أول شخص" : "Add First Member"}</span>
              </button>
              {onImportDirectors && (
                <button
                  type="button"
                  onClick={handleImport}
                  className="px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 text-neutral-800 dark:text-neutral-200 text-xs font-bold flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{lang === "ar" ? "استيراد مدراء الإدارات" : "Import Directors"}</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 text-center w-16">{lang === "ar" ? "الترتيب" : "Order"}</th>
                  <th className="px-4 py-3.5">{lang === "ar" ? "الشخص والمنصب" : "Member"}</th>
                  <th className="px-4 py-3.5">{lang === "ar" ? "المستوى الإداري" : "Level"}</th>
                  <th className="px-4 py-3.5">{lang === "ar" ? "الرئيس المباشر" : "Superior"}</th>
                  <th className="px-4 py-3.5">{lang === "ar" ? "الإدارة" : "Department"}</th>
                  <th className="px-4 py-3.5 text-center">{lang === "ar" ? "الحالة بالصفحة" : "Status"}</th>
                  <th className="px-4 py-3.5 text-center">{lang === "ar" ? "إجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700/60 font-medium">
                {filteredMembers.map((member, idx) => {
                  const superior = sortedMembers.find(m => m.id === member.parentId);
                  return (
                    <tr 
                      key={member.id}
                      className={`hover:bg-neutral-50/80 dark:hover:bg-neutral-750 transition-colors ${
                        member.isActive === false ? 'opacity-60 bg-neutral-50/40 dark:bg-neutral-900/30' : ''
                      }`}
                    >
                      {/* Order Controls */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-mono font-bold text-xs text-neutral-700 dark:text-neutral-300 w-5">
                            {member.order || idx + 1}
                          </span>
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleMoveOrder(idx, 'up')}
                              disabled={idx === 0}
                              title={lang === "ar" ? "تقديم لأعلى" : "Move Up"}
                              className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 disabled:opacity-20 cursor-pointer"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveOrder(idx, 'down')}
                              disabled={idx === sortedMembers.length - 1}
                              title={lang === "ar" ? "تأخير لأسفل" : "Move Down"}
                              className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 disabled:opacity-20 cursor-pointer"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Name & Title */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-700 shrink-0 border border-neutral-200 dark:border-neutral-600 flex items-center justify-center">
                            {member.imageUrl ? (
                              <img src={member.imageUrl} alt={member.name} className="w-full h-full object-cover" />
                            ) : (
                              <Users className="w-5 h-5 text-neutral-400" />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-neutral-900 dark:text-white block text-sm">
                              {member.name}
                            </span>
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold block">
                              {member.roleTitle}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Level Badge */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                          member.level === 1
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            : member.level === 2
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                        }`}>
                          {member.level === 1 && <Crown className="w-3 h-3" />}
                          {member.level === 2 && <Shield className="w-3 h-3" />}
                          {member.level >= 3 && <Briefcase className="w-3 h-3" />}
                          <span>{member.levelName || (member.level === 1 ? "مجلس الإدارة" : member.level === 2 ? "الإدارة التنفيذية" : "الإدارات والأقسام")}</span>
                        </span>
                      </td>

                      {/* Superior */}
                      <td className="px-4 py-3">
                        {superior || member.parentName ? (
                          <span className="text-xs text-neutral-700 dark:text-neutral-300 font-bold">
                            {superior?.name || member.parentName}
                          </span>
                        ) : (
                          <span className="text-[11px] text-neutral-400 italic">
                            {lang === "ar" ? "قمة الهيكل / لا يوجد" : "Top of hierarchy"}
                          </span>
                        )}
                      </td>

                      {/* Department */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-neutral-600 dark:text-neutral-400">
                          {member.department || "—"}
                        </span>
                      </td>

                      {/* Active / Hidden Switch */}
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => onToggleMemberActive(member.id, !member.isActive)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                            member.isActive !== false
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200'
                              : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-300'
                          }`}
                        >
                          {member.isActive !== false ? (
                            <>
                              <Eye className="w-3 h-3" />
                              <span>{lang === "ar" ? "مفعّل بالرئيسية" : "Active"}</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3" />
                              <span>{lang === "ar" ? "مخفي" : "Hidden"}</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(member)}
                            className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-700 hover:bg-emerald-50 hover:text-emerald-600 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
                            title={lang === "ar" ? "تعديل البيانات" : "Edit"}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(lang === "ar" ? `هل أنت متأكد من حذف ${member.name} من الهيكل الإداري؟` : `Delete ${member.name}?`)) {
                                onDeleteMember(member.id);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-700 hover:bg-rose-50 hover:text-rose-600 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
                            title={lang === "ar" ? "حذف الشخص" : "Delete"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Network className="w-5 h-5" />
                <h3 className="text-base sm:text-lg font-black">
                  {editingMember 
                    ? (lang === "ar" ? `تعديل بيانات: ${editingMember.name}` : "Edit Member")
                    : (lang === "ar" ? "إضافة شخص جديد في الهيكل الإداري" : "Add New Member")}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Photo Upload with ImageUploadField */}
              <div>
                <ImageUploadField
                  label={lang === "ar" ? "صورة الشخص الرسمية (اختياري)" : "Official Photo"}
                  value={formData.imageUrl}
                  onChange={(val) => setFormData({ ...formData, imageUrl: val })}
                  description={lang === "ar" ? "ارفع صورة شخصية ذات جودة عالية أو رابط صورة" : "Upload member portrait"}
                  previewAspect="square"
                />
              </div>

              {/* Name & Job Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    {lang === "ar" ? "اسم الشخص *" : "Full Name *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={lang === "ar" ? "مثال: د. عبد الله بن عبد العزيز المكي" : "Name"}
                    className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-neutral-900 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    {lang === "ar" ? "المسمى الوظيفي *" : "Role / Title *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.roleTitle}
                    onChange={(e) => setFormData({ ...formData, roleTitle: e.target.value })}
                    placeholder={lang === "ar" ? "مثال: رئيس مجلس الإدارة / المدير التنفيذي" : "Title"}
                    className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-neutral-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              {/* Level & Direct Superior */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    {lang === "ar" ? "المستوى الإداري *" : "Administrative Tier *"}
                  </label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-neutral-900 dark:text-white font-bold"
                  >
                    <option value={1}>{lang === "ar" ? "المستوى 1: مجلس الإدارة" : "Level 1: Board of Directors"}</option>
                    <option value={2}>{lang === "ar" ? "المستوى 2: الإدارة التنفيذية" : "Level 2: Executive Management"}</option>
                    <option value={3}>{lang === "ar" ? "المستوى 3: الإدارات والأقسام" : "Level 3: Departments & Divisions"}</option>
                    <option value={4}>{lang === "ar" ? "المستوى 4: المسؤولون والكوادر" : "Level 4: Staff & Officers"}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    {lang === "ar" ? "الشخص الأعلى / الرئيس المباشر" : "Direct Superior / Manager"}
                  </label>
                  <select
                    value={formData.parentId}
                    onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-neutral-900 dark:text-white font-medium"
                  >
                    <option value="">{lang === "ar" ? "— لا يوجد (قمة الهيكل التنظيمي) —" : "— None (Top of Hierarchy) —"}</option>
                    {sortedMembers
                      .filter(m => !editingMember || m.id !== editingMember.id)
                      .map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.roleTitle})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Department & Order */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    {lang === "ar" ? "اسم الإدارة أو القسم (اختياري)" : "Department"}
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder={lang === "ar" ? "مثال: إدارة التطوع، الشؤون المالية..." : "Department"}
                    className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-neutral-900 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    {lang === "ar" ? "رقم ترتيب الظهور" : "Display Order"}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-neutral-900 dark:text-white font-mono font-bold"
                  />
                </div>
              </div>

              {/* Contact Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    {lang === "ar" ? "البريد الإلكتروني (اختياري)" : "Email"}
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@riadataleata.org.sa"
                    className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-neutral-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    {lang === "ar" ? "رقم الهاتف (اختياري)" : "Phone"}
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="05XXXXXXXX"
                    className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-neutral-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Brief Description */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  {lang === "ar" ? "وصف مختصر أو نبذة (اختياري)" : "Brief Description / Bio"}
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={lang === "ar" ? "نبذة عن المهام أو المؤهلات..." : "Description..."}
                  className="w-full px-3.5 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-neutral-900 dark:text-white font-medium"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700">
                <div>
                  <span className="text-xs font-bold text-neutral-900 dark:text-white block">
                    {lang === "ar" ? "تفعيل الظهور في الصفحة الرئيسية" : "Show on Homepage"}
                  </span>
                  <span className="text-[11px] text-neutral-500 block">
                    {lang === "ar" ? "عند إلغاء التفعيل سيتم إخفاء الشخص دون حذفه من النظام" : "Hide without deleting"}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300 text-xs font-bold cursor-pointer"
                >
                  {lang === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? (lang === "ar" ? "جاري الحفظ..." : "Saving...") : (lang === "ar" ? "حفظ التغييرات" : "Save")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
