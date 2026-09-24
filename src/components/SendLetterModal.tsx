import React, { useState, useEffect, useRef } from "react";
import { 
  X, Send, FileText, Upload, CheckCircle, AlertCircle, 
  Paperclip, Building, User, Phone, Mail, Briefcase, 
  HelpCircle, Trash2, Eye, ShieldCheck, ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { OfficialLetter } from "../types";

export interface SendLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitLetter: (letterData: Partial<OfficialLetter>) => Promise<{ success: boolean; letter?: OfficialLetter; message?: string }>;
  currentUser?: {
    id?: string;
    name?: string;
    role?: string;
    phone?: string;
    email?: string;
    teamId?: string;
    teamName?: string;
    departmentId?: string;
    departmentName?: string;
    jobTitle?: string;
  } | null;
  defaultSenderType?: 'قائد' | 'موظف' | 'زائر' | 'قائد فريق' | string;
}

export const SendLetterModal: React.FC<SendLetterModalProps> = ({
  isOpen,
  onClose,
  onSubmitLetter,
  currentUser,
  defaultSenderType
}) => {
  // Method: "خطاب جاهز" or "خطاب مخصص"
  const [submissionType, setSubmissionType] = useState<'ready_file' | 'custom_letter'>('ready_file');

  // Compute sender type automatically based on login state
  const computeSenderType = (): 'قائد' | 'موظف' | 'زائر' => {
    if (currentUser) {
      const role = (currentUser.role || '').toLowerCase();
      if (role === 'leader' || currentUser.teamId) {
        return 'قائد';
      }
      if (
        role === 'department_admin' || 
        role === 'employee' || 
        role === 'staff' || 
        role === 'storekeeper' || 
        role === 'supervisor' || 
        role === 'admin' || 
        currentUser.departmentId
      ) {
        return 'موظف';
      }
    }
    if (defaultSenderType && defaultSenderType.includes('قائد')) return 'قائد';
    if (defaultSenderType && defaultSenderType.includes('موظف')) return 'موظف';
    return 'زائر';
  };

  // معلومات المرسل - البيانات الأساسية
  const [senderName, setSenderName] = useState("");
  const [senderType, setSenderType] = useState<'قائد' | 'موظف' | 'زائر'>('زائر');
  const [senderPhone, setSenderPhone] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [senderRole, setSenderRole] = useState("");
  const [senderOrganization, setSenderOrganization] = useState("");

  // رفع الخطاب الجاهز
  const [letterFileUrl, setLetterFileUrl] = useState("");
  const [letterFileName, setLetterFileName] = useState("");
  const [letterFileSize, setLetterFileSize] = useState("");

  // تفاصيل الخطاب المخصص
  const [subject, setSubject] = useState("");
  const [messageContent, setMessageContent] = useState("");

  // تفاصيل الشراكة والعطاء - مقترح الشراكة
  const [whatYouOffer, setWhatYouOffer] = useState("");
  const [whatYouWant, setWhatYouWant] = useState("");
  const [ourRole, setOurRole] = useState("");
  const [yourRole, setYourRole] = useState("");

  // الملفات المرفقة
  const [attachmentFileUrl, setAttachmentFileUrl] = useState("");
  const [attachmentFileName, setAttachmentFileName] = useState("");
  const [attachmentFileSize, setAttachmentFileSize] = useState("");

  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedLetter, setSubmittedLetter] = useState<OfficialLetter | null>(null);

  const readyFileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  // Initialize or prefill fields when modal opens or user context changes
  useEffect(() => {
    if (!isOpen) {
      setSubmittedLetter(null);
      setErrorMessage(null);
      return;
    }

    const determinedType = computeSenderType();
    setSenderType(determinedType);

    if (currentUser) {
      if (determinedType === 'قائد') {
        setSenderName(currentUser.name || "");
        setSenderPhone(currentUser.phone || "");
        setSenderEmail(currentUser.email || "");
        setSenderRole(currentUser.jobTitle || "قائد فريق تطوعي");
        setSenderOrganization(currentUser.teamName || "فريق تطوعي");
      } else if (determinedType === 'موظف') {
        setSenderName(currentUser.name || "");
        setSenderPhone(currentUser.phone || "");
        setSenderEmail(currentUser.email || "");
        setSenderRole(currentUser.jobTitle || (currentUser.role === 'storekeeper' ? "أمين المستودع والمخزون" : "موظف إداري"));
        setSenderOrganization(currentUser.departmentName || "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة");
      } else {
        if (currentUser.name) setSenderName(currentUser.name);
        if (currentUser.phone) setSenderPhone(currentUser.phone);
        if (currentUser.email) setSenderEmail(currentUser.email);
        if (currentUser.jobTitle) setSenderRole(currentUser.jobTitle);
        if (currentUser.departmentName || currentUser.teamName) setSenderOrganization(currentUser.departmentName || currentUser.teamName || "");
      }
    } else {
      // Visitor - empty for manual entry
      setSenderName("");
      setSenderPhone("");
      setSenderEmail("");
      setSenderRole("");
      setSenderOrganization("");
    }
  }, [isOpen, currentUser, defaultSenderType]);

  // Handle Ready Letter File Upload
  const handleReadyFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 15MB)
    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage("حجم الملف كبير جداً. الحد الأقصى المسموح به هو 15 ميجابايت.");
      return;
    }

    const sizeStr = file.size > 1024 * 1024 
      ? (file.size / (1024 * 1024)).toFixed(2) + " MB"
      : Math.round(file.size / 1024) + " KB";

    setLetterFileName(file.name);
    setLetterFileSize(sizeStr);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLetterFileUrl(reader.result);
        setErrorMessage(null);
      }
    };
    reader.onerror = () => {
      setErrorMessage("تعذر قراءة الملف المرفوع. يرجى المحاولة مرة أخرى.");
    };
    reader.readAsDataURL(file);
  };

  // Handle Attachment File Upload
  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage("حجم الملف المرفق كبير جداً. الحد الأقصى المسموح به هو 15 ميجابايت.");
      return;
    }

    const sizeStr = file.size > 1024 * 1024 
      ? (file.size / (1024 * 1024)).toFixed(2) + " MB"
      : Math.round(file.size / 1024) + " KB";

    setAttachmentFileName(file.name);
    setAttachmentFileSize(sizeStr);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAttachmentFileUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Basic validation
    if (!senderName.trim()) {
      setErrorMessage("يرجى إدخال الاسم الكامل.");
      return;
    }
    if (!senderPhone.trim()) {
      setErrorMessage("يرجى إدخال رقم الجوال.");
      return;
    }

    if (submissionType === 'ready_file') {
      if (!letterFileUrl) {
        setErrorMessage("يرجى رفع ملف الخطاب (ملف الخطاب إلزامي للخطاب الجاهز).");
        return;
      }
    } else {
      if (!subject.trim()) {
        setErrorMessage("يرجى إدخال عنوان الخطاب / الموضوع.");
        return;
      }
      if (!messageContent.trim()) {
        setErrorMessage("يرجى إدخال نص الخطاب / الرسالة.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const finalSenderType = computeSenderType();
      const payload: Partial<OfficialLetter> = {
        submissionType,
        senderName: senderName.trim(),
        senderType: finalSenderType,
        senderPhone: senderPhone.trim(),
        senderEmail: senderEmail.trim() || undefined,
        senderRole: senderRole.trim() || undefined,
        senderOrganization: senderOrganization.trim() || undefined,
        userId: currentUser?.id,
        userRole: currentUser?.role,
        teamId: currentUser?.teamId,
        departmentId: currentUser?.departmentId,
        senderAccountId: currentUser?.id,
        senderAccountRole: currentUser?.role,
        senderAccountName: currentUser?.teamName || currentUser?.departmentName || senderOrganization.trim(),
        senderAccountPerson: currentUser?.name || senderName.trim(),
        senderAccountDetails: currentUser ? {
          id: currentUser.id || "",
          role: currentUser.role,
          teamName: currentUser.teamName,
          departmentName: currentUser.departmentName,
          jobTitle: senderRole.trim() || currentUser.jobTitle,
          phone: senderPhone.trim(),
          email: senderEmail.trim()
        } : undefined,
        letterFileUrl: submissionType === 'ready_file' ? letterFileUrl : undefined,
        letterFileName: submissionType === 'ready_file' ? letterFileName : undefined,
        letterFileSize: submissionType === 'ready_file' ? letterFileSize : undefined,
        subject: submissionType === 'custom_letter' ? subject.trim() : `خطاب رسمي جاهز مرفق من ${senderName.trim()}`,
        messageContent: submissionType === 'custom_letter' ? messageContent.trim() : undefined,
        partnershipDetails: (whatYouOffer || whatYouWant || ourRole || yourRole) ? {
          whatYouOffer: whatYouOffer.trim() || undefined,
          whatYouWant: whatYouWant.trim() || undefined,
          ourRole: ourRole.trim() || undefined,
          yourRole: yourRole.trim() || undefined,
        } : undefined,
        attachmentFileUrl: attachmentFileUrl || undefined,
        attachmentFileName: attachmentFileName || undefined,
        attachmentFileSize: attachmentFileSize || undefined,
      };

      const res = await onSubmitLetter(payload);
      if (res.success && res.letter) {
        setSubmittedLetter(res.letter);
      } else {
        setErrorMessage(res.message || "حدث خطأ أثناء إرسال الخطاب. يرجى المحاولة لاحقاً.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "تعذر الاتصال بالخادم لإرسال الخطاب.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSubmittedLetter(null);
    setSubject("");
    setMessageContent("");
    setLetterFileUrl("");
    setLetterFileName("");
    setLetterFileSize("");
    setAttachmentFileUrl("");
    setAttachmentFileName("");
    setAttachmentFileSize("");
    setWhatYouOffer("");
    setWhatYouWant("");
    setOurRole("");
    setYourRole("");
    setErrorMessage(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 md:p-6" dir="rtl">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 16 }}
        className="relative bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full shadow-2xl z-10 border border-slate-200 dark:border-slate-800 text-right overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Header Bar */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white border-b border-emerald-600/40 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-100 border border-emerald-400/30 inline-block">
              تواصل معنا
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            إرسال خطاب
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 font-medium">
            اختر طريقة إرسال الخطاب المناسبة لك
          </p>
        </div>

        {/* Scrollable Form Content */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6">
          {submittedLetter ? (
            /* Success State */
            <div className="py-8 text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100">
                  تم إرسال الخطاب بنجاح!
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                  تم استلام خطابكم وقيده في سجل الخطابات والمراسلات الرسمية لجمعية ريادة العطاء لخدمة الإنسان بالعسيلة، وستتم مراجعته من قِبل إدارة الجمعية.
                </p>
              </div>

              <div className="inline-block bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-5 py-3 rounded-2xl">
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-bold mb-1">
                  رقم قيد الخطاب الرسمي:
                </span>
                <span className="text-base font-black font-mono text-emerald-700 dark:text-emerald-300 tracking-wider">
                  {submittedLetter.letterNumber}
                </span>
              </div>

              <div className="pt-3 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md cursor-pointer transition-colors"
                >
                  إغلاق النموذج
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-7">
              {errorMessage && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl flex items-center gap-2.5 text-rose-700 dark:text-rose-300 text-xs font-bold animate-in fade-in">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Two Option Selection: خطاب جاهز vs خطاب مخصص */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                  طريقة تقديم الخطاب
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSubmissionType('ready_file')}
                    className={`p-4 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                      submissionType === 'ready_file'
                        ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-black flex items-center gap-2">
                        <span>📄</span>
                        <span>خطاب جاهز</span>
                      </span>
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        submissionType === 'ready_file' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {submissionType === 'ready_file' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                      ارفع ملف الخطاب مباشرة (PDF, DOC, صورة)
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSubmissionType('custom_letter')}
                    className={`p-4 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                      submissionType === 'custom_letter'
                        ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-black flex items-center gap-2">
                        <span>✍️</span>
                        <span>خطاب مخصص</span>
                      </span>
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        submissionType === 'custom_letter' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {submissionType === 'custom_letter' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                      قم بتعبئة نموذج الخطاب يدوياً
                    </p>
                  </button>
                </div>
              </div>

              {/* SECTION: معلومات المرسل - البيانات الأساسية */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
                <div className="border-b border-slate-200/70 dark:border-slate-700/70 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <User className="w-4 h-4 text-emerald-600" />
                      <span>معلومات المرسل</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      البيانات الأساسية
                    </p>
                  </div>
                  {currentUser && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700">
                      تم التعبئة من الحساب
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* الاسم الكامل * */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      الاسم الكامل <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="أدخل اسمك الكامل"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </div>

                  {/* رقم الجوال * */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      رقم الجوال <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={senderPhone}
                      onChange={(e) => setSenderPhone(e.target.value)}
                      placeholder="05xxxxxxxx"
                      dir="ltr"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono font-bold text-right focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </div>

                  {/* البريد الإلكتروني (اختياري) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      البريد الإلكتروني (اختياري)
                    </label>
                    <input
                      type="email"
                      value={senderEmail}
                      onChange={(e) => setSenderEmail(e.target.value)}
                      placeholder="example@email.com"
                      dir="ltr"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium text-right focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </div>

                  {/* المنصب / الوظيفة (اختياري) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      المنصب / الوظيفة (اختياري)
                    </label>
                    <input
                      type="text"
                      value={senderRole}
                      onChange={(e) => setSenderRole(e.target.value)}
                      placeholder="مثال: قائد فريق، مسؤول علاقات، مدير عام..."
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </div>

                  {/* اسم الجهة / المنظمة (اختياري) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      اسم الجهة / المنظمة (اختياري)
                    </label>
                    <input
                      type="text"
                      value={senderOrganization}
                      onChange={(e) => setSenderOrganization(e.target.value)}
                      placeholder="مثال: فريق ريادة الصحي، شركة الأمل..."
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION: رفع الخطاب الجاهز (if submissionType === 'ready_file') */}
              {submissionType === 'ready_file' && (
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-4 animate-in fade-in">
                  <div className="border-b border-slate-200/70 dark:border-slate-700/70 pb-3">
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span>رفع الخطاب الجاهز</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      ارفع ملفك
                    </p>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    ارفع ملف الخطاب بصيغة PDF، DOC، DOCX، أو صورة (JPG، PNG)
                  </p>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      ملف الخطاب <span className="text-rose-500">*</span>
                    </label>

                    <input
                      ref={readyFileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif"
                      onChange={handleReadyFileUpload}
                      className="hidden"
                    />

                    {letterFileUrl ? (
                      <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 truncate">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block truncate">
                              {letterFileName || "تم اختيار ملف الخطاب"}
                            </span>
                            {letterFileSize && (
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block">
                                {letterFileSize}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => readyFileInputRef.current?.click()}
                            className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
                          >
                            تغيير الملف
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setLetterFileUrl("");
                              setLetterFileName("");
                              setLetterFileSize("");
                            }}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                            title="حذف الملف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => readyFileInputRef.current?.click()}
                        className="p-6 border-2 border-dashed border-slate-300 dark:border-slate-650 rounded-2xl text-center hover:border-emerald-500 dark:hover:border-emerald-400 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all cursor-pointer group"
                      >
                        <Upload className="w-8 h-8 text-slate-400 group-hover:text-emerald-600 mx-auto mb-2 transition-colors" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                          اضغط لاختيار ملف الخطاب أو قم بسحبه إلى هنا
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                          الملفات المدعومة: PDF, DOC, DOCX, XLS, XLSX, TXT, JPG, PNG, GIF
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION: الخطاب المخصص (if submissionType === 'custom_letter') */}
              {submissionType === 'custom_letter' && (
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-4 animate-in fade-in">
                  <div className="border-b border-slate-200/70 dark:border-slate-700/70 pb-3">
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span>تفاصيل الخطاب المخصص</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      املأ النموذج
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      عنوان الخطاب / الموضوع <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required={submissionType === 'custom_letter'}
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="مثال: طلب تعاون مشترك في مبادرة صحية، طلب رعاية، خطاب شكر..."
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      نص الخطاب / الرسالة <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required={submissionType === 'custom_letter'}
                      rows={5}
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      placeholder="السلام عليكم ورحمة الله وبركاته، سعادة إدارة جمعية ريادة العطاء لخدمة الإنسان بالعسيلة..."
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </div>
                </div>
              )}

              {/* SECTION: تفاصيل الشراكة والعطاء */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
                <div className="border-b border-slate-200/70 dark:border-slate-700/70 pb-3">
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Building className="w-4 h-4 text-emerald-600" />
                    <span>تفاصيل الشراكة والعطاء</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    مقترح الشراكة
                  </p>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  في حالة رغبتكم في تقديم عرض شراكة، يرجى تعبئة الحقول التالية
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ماذا تقدمون لنا؟ (ما هي مساهمتكم)
                    </label>
                    <textarea
                      rows={3}
                      value={whatYouOffer}
                      onChange={(e) => setWhatYouOffer(e.target.value)}
                      placeholder="الخدمات أو الموارد أو الرعايات التي تستطيعون تقديمها..."
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ماذا تريدون منا؟ (ما هو طلبكم)
                    </label>
                    <textarea
                      rows={3}
                      value={whatYouWant}
                      onChange={(e) => setWhatYouWant(e.target.value)}
                      placeholder="الدعم المطلوب، التسهيلات، المتطوعين، أو التنسيق الميداني..."
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      دورنا (ريادة العطاء)
                    </label>
                    <input
                      type="text"
                      value={ourRole}
                      onChange={(e) => setOurRole(e.target.value)}
                      placeholder="التنظيم، الإشراف الميداني، التغطية الإعلامية..."
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      دوركم (الجهة المرسلة)
                    </label>
                    <input
                      type="text"
                      value={yourRole}
                      onChange={(e) => setYourRole(e.target.value)}
                      placeholder="التنفيذ، توفير المواد، الإسناد الطبي، الرعاية..."
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION: الملفات المرفقة */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
                <div className="border-b border-slate-200/70 dark:border-slate-700/70 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-emerald-600" />
                      <span>الملفات المرفقة</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      اختياري
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold">
                    مستندات داعمة
                  </span>
                </div>

                <input
                  ref={attachmentInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                  onChange={handleAttachmentUpload}
                  className="hidden"
                />

                {attachmentFileUrl ? (
                  <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Paperclip className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                        {attachmentFileName || "ملف مرفق"}
                      </span>
                      {attachmentFileSize && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({attachmentFileSize})
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachmentFileUrl("");
                        setAttachmentFileName("");
                        setAttachmentFileSize("");
                      }}
                      className="p-1 rounded text-rose-500 hover:bg-rose-50 cursor-pointer"
                      title="حذف المرفق"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={() => attachmentInputRef.current?.click()}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-650 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 flex items-center gap-2 cursor-pointer shadow-2xs"
                    >
                      <Upload className="w-4 h-4 text-emerald-600" />
                      <span>رفع ملف مرفق (خطاب، مستند، صورة)</span>
                    </button>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">
                      الملفات المدعومة: PDF, DOC, DOCX, XLS, XLSX, TXT, JPG, PNG
                    </p>
                  </div>
                )}
              </div>

              {/* SECTION: الخصوصية والإرسال */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs leading-normal">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>جميع البيانات محفوظة بسرية تامة ولن تستخدم إلا لأغراض التواصل والمراجعة</span>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    إلغاء
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-7 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs sm:text-sm font-black shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmitting ? "جاري الإرسال..." : "إرسال خطاب"}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
