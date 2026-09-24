import React, { useState } from 'react';
import { 
  Send, 
  Bell, 
  Users, 
  User, 
  ShieldCheck, 
  Headphones, 
  Flame, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  Trash2, 
  RotateCcw, 
  Search, 
  Filter,
  Check
} from 'lucide-react';
import { Notification, Volunteer, Beneficiary, VolunteerTeam } from '../types';
import { ImageUploadField } from './ImageUploadField';

interface NotificationSendPanelProps {
  notifications: Notification[];
  volunteers: Volunteer[];
  beneficiaries: Beneficiary[];
  teams: VolunteerTeam[];
  currentUserName?: string;
  currentUserRole?: string;
  onSendNotification: (payload: any) => Promise<boolean>;
  onDeleteNotification: (notificationId: string) => Promise<boolean>;
  onResendNotification: (notificationId: string) => Promise<boolean>;
}

export const NotificationSendPanel: React.FC<NotificationSendPanelProps> = ({
  notifications = [],
  volunteers = [],
  beneficiaries = [],
  teams = [],
  currentUserName = "إدارة التطوع والنظام",
  currentUserRole = "admin",
  onSendNotification,
  onDeleteNotification,
  onResendNotification
}) => {
  // Form State
  const [titleAr, setTitleAr] = useState('');
  const [bodyAr, setBodyAr] = useState('');
  const [type, setType] = useState<'normal' | 'important' | 'urgent'>('normal');
  const [category, setCategory] = useState<'system' | 'support' | 'volunteer' | 'beneficiary' | 'initiative' | 'points' | 'attendance' | 'certificate' | 'announcement'>('announcement');
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  
  // Recipient Selector State
  const [recipientType, setRecipientType] = useState<'all' | 'volunteers' | 'beneficiaries' | 'admins' | 'supervisors' | 'support' | 'team_members' | 'custom'>('all');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  
  // Delivery Mode State
  const [deliveryMode, setDeliveryMode] = useState<'instant' | 'scheduled'>('instant');
  const [scheduledAt, setScheduledAt] = useState('');
  
  // Search & Filtering
  const [recipientSearch, setRecipientSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');

  // Combined User List for Individual Target Picker
  const allPossibleUsers = [
    ...volunteers.map(v => ({ id: v.id, name: v.name, role: 'متطوع', roleCode: 'volunteer', extra: v.email || v.phone })),
    ...beneficiaries.map(b => ({ id: b.id, name: b.name, role: 'مستفيد', roleCode: 'beneficiary', extra: b.phone })),
    { id: 'admin-1', name: 'أ. عبد الله العسيري (مدير التطوع)', role: 'مدير نظام', roleCode: 'admin', extra: 'الإدارة' },
    { id: 'sup-1', name: 'أ. محمد العسيري (مشرف الإدارة)', role: 'مشرف عام', roleCode: 'supervisor', extra: 'الإشراف' },
    { id: 'support-1', name: 'فريق الدعم الفني المباشر', role: 'دعم فني', roleCode: 'support', extra: 'الدعم' }
  ];

  const filteredPossibleUsers = allPossibleUsers.filter(u => 
    u.name.toLowerCase().includes(recipientSearch.toLowerCase()) ||
    u.role.toLowerCase().includes(recipientSearch.toLowerCase()) ||
    (u.extra && u.extra.toLowerCase().includes(recipientSearch.toLowerCase()))
  );

  const toggleRecipientSelection = (id: string) => {
    if (selectedRecipientIds.includes(id)) {
      setSelectedRecipientIds(selectedRecipientIds.filter(item => item !== id));
    } else {
      setSelectedRecipientIds([...selectedRecipientIds, id]);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleAr.trim() || !bodyAr.trim()) {
      alert("يرجى كتابة عنوان ونص الإشعار قبل الإرسال.");
      return;
    }

    if (recipientType === 'team_members' && !selectedTeamId) {
      alert("يرجى اختيار الفريق التطوعي المستهدف.");
      return;
    }

    if (recipientType === 'custom' && selectedRecipientIds.length === 0) {
      alert("يرجى اختيار مستلم واحد على الأقل من القائمة.");
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage('');

    const payload = {
      titleAr,
      titleEn: titleAr,
      bodyAr,
      bodyEn: bodyAr,
      type,
      category,
      linkUrl: linkUrl.trim(),
      imageUrl: imageUrl.trim(),
      recipientType,
      recipientIds: recipientType === 'custom' ? selectedRecipientIds : [],
      teamId: recipientType === 'team_members' ? selectedTeamId : undefined,
      scheduledAt: deliveryMode === 'scheduled' ? scheduledAt : undefined,
      senderName: currentUserName,
      senderRole: currentUserRole
    };

    const success = await onSendNotification(payload);
    setIsSubmitting(false);

    if (success) {
      setSuccessMessage("تم بث وإرسال الإشعار بنجاح لجميع المستهدفين! 🚀");
      setTitleAr('');
      setBodyAr('');
      setLinkUrl('');
      setImageUrl('');
      setSelectedRecipientIds([]);
      setTimeout(() => setSuccessMessage(''), 4000);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-5 md:p-8 space-y-6 text-right">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-6 rounded-2xl shadow-lg border border-emerald-800/40">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl text-emerald-300">
            <Bell className="w-8 h-8 animate-bounce" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">نظام إرسال وتوجيه الإشعارات والتنبيهات 📢</h2>
            <p className="text-xs text-emerald-200/80 mt-1">بث التنبيهات الفورية للمتطوعين، المستفيدين، الموظفين، والإدارة في الوقت الحقيقي</p>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700/80 gap-1">
          <button
            onClick={() => setActiveTab('compose')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'compose' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>إنشاء وبث إشعار</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'history' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>سجل الإشعارات المرسلة ({notifications.length})</span>
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-300 text-emerald-800 rounded-2xl flex items-center gap-3 font-bold text-sm shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* TAB 1: COMPOSE NOTIFICATION */}
      {activeTab === 'compose' && (
        <form onSubmit={handleSend} className="space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Form Details */}
            <div className="lg:col-span-2 space-y-5">
              
              {/* Title & Body */}
              <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-600" />
                  <span>تفاصيل ومحتوى الإشعار</span>
                </h3>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">عنوان الإشعار *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: تذكير بموعد المبادرة / اعتماد طلب جديد..."
                    value={titleAr}
                    onChange={(e) => setTitleAr(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نص تفاصيل الإشعار *</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="اكتب تفاصيل الرسالة بوضوح للوصول الفوري للمستهدفين..."
                    value={bodyAr}
                    onChange={(e) => setBodyAr(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Priority & Category Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">درجة الأهمية / الأولوية</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setType('normal')}
                        className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          type === 'normal' 
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span>عادي</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setType('important')}
                        className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          type === 'important' 
                            ? 'bg-amber-600 text-white border-amber-600 shadow-sm' 
                            : 'bg-white text-amber-700 border-slate-200 hover:bg-amber-50'
                        }`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>مهم</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setType('urgent')}
                        className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          type === 'urgent' 
                            ? 'bg-rose-600 text-white border-rose-600 shadow-sm animate-pulse' 
                            : 'bg-white text-rose-700 border-slate-200 hover:bg-rose-50'
                        }`}
                      >
                        <Flame className="w-3.5 h-3.5" />
                        <span>عاجل</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">تصنيف الإشعار</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="announcement">📢 إعلان وتعميم عام</option>
                      <option value="support">🎧 الدعم الفني والاستفسارات</option>
                      <option value="initiative">🔥 مبادرة وفرص تطوعية</option>
                      <option value="points">⭐ النقاط والمكافآت</option>
                      <option value="attendance">⏰ الحضور والانصراف</option>
                      <option value="certificate">📜 الشهادات والتكريم</option>
                      <option value="beneficiary">🤲 الخدمات والمستفيدين</option>
                      <option value="system">⚙️ تنبيه من النظام الإداري</option>
                    </select>
                  </div>
                </div>

                {/* Attachments: Link & Image */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <LinkIcon className="w-3.5 h-3.5 text-slate-500" />
                      <span>رابط أو صفحة مرتبطة (اختياري)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: #support أو #initiatives أو رابط خارجي..."
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <ImageUploadField
                    label="صورة توضيحية مرفقة للإشعار (رفع ملف مباشر)"
                    description="ارفع صورة من جهازك تظهر للمستلمين داخل شاشة تفاصيل التنبيه"
                    value={imageUrl}
                    onChange={(val) => setImageUrl(val)}
                    previewAspect="banner"
                  />
                </div>

              </div>

            </div>

            {/* Right Column: Recipient Selection & Scheduling */}
            <div className="space-y-5">
              
              {/* Recipient Group Selection */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>تحديد فئات المستلمين</span>
                </h3>

                <div className="space-y-2">
                  {[
                    { id: 'all', title: '🌐 جميع حسابات ومستخدمي النظام', desc: 'بث عام لكل المسجلين' },
                    { id: 'volunteers', title: '🙋‍♂️ جميع المتطوعين فقط', desc: `عدد المتطوعين: ${volunteers.length}` },
                    { id: 'beneficiaries', title: '🤲 جميع المستفيدين فقط', desc: `عدد المستفيدين: ${beneficiaries.length}` },
                    { id: 'admins', title: '👑 مجلس الإدارة والمدراء التنفيذيين', desc: 'الإدارة العليا للنظام' },
                    { id: 'supervisors', title: '👔 المشرفين وقادة الفرق التطوعية', desc: 'المستويات الإشرافية' },
                    { id: 'support', title: '🎧 فريق الدعم الفني', desc: 'موظفي الدعم الفني والخدمة' },
                    { id: 'team_members', title: '👥 أعضاء فريق تطوعي محدد', desc: 'اختيار فريق محدد' },
                    { id: 'custom', title: '🎯 مستلمين محددين بالاسم', desc: 'اختيار متعدد بالبحث' },
                  ].map((opt) => (
                    <label
                      key={opt.id}
                      onClick={() => setRecipientType(opt.id as any)}
                      className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                        recipientType === opt.id 
                          ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200' 
                          : 'bg-white border-slate-200 hover:bg-slate-100/80'
                      }`}
                    >
                      <input
                        type="radio"
                        name="recipientType"
                        checked={recipientType === opt.id}
                        onChange={() => setRecipientType(opt.id as any)}
                        className="mt-1 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <div className="text-xs font-black text-slate-800">{opt.title}</div>
                        <div className="text-[10px] text-slate-500">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Team Dropdown if team_members selected */}
                {recipientType === 'team_members' && (
                  <div className="pt-2 animate-in fade-in">
                    <label className="block text-xs font-bold text-slate-700 mb-1">اختر الفريق التطوعي *</label>
                    <select
                      value={selectedTeamId}
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">-- اختر الفريق التطوعي --</option>
                      {teams.map(t => (
                        <option key={t.id} value={t.id}>{t.nameAr} ({t.membersCount || 0} عضو)</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Multi-select Picker if custom selected */}
                {recipientType === 'custom' && (
                  <div className="pt-2 space-y-2 animate-in fade-in">
                    <label className="block text-xs font-bold text-slate-700">اختر المستلمين بالاسم *</label>
                    
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                      <input
                        type="text"
                        placeholder="بحث بالاسم أو الصفة..."
                        value={recipientSearch}
                        onChange={(e) => setRecipientSearch(e.target.value)}
                        className="w-full pr-8 pl-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>

                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 bg-white border border-slate-200 rounded-xl p-1">
                      {filteredPossibleUsers.map(u => {
                        const isSelected = selectedRecipientIds.includes(u.id);
                        return (
                          <div
                            key={u.id}
                            onClick={() => toggleRecipientSelection(u.id)}
                            className={`p-2 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-all ${
                              isSelected ? 'bg-emerald-50 text-emerald-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                                isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300'
                              }`}>
                                {isSelected && <Check className="w-3 h-3" />}
                              </div>
                              <span>{u.name}</span>
                            </div>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{u.role}</span>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="text-[11px] text-emerald-700 font-bold">
                      تم اختيار: {selectedRecipientIds.length} مستلم
                    </div>
                  </div>
                )}

              </div>

              {/* Delivery Timing Options */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>جدولة موعد الإرسال</span>
                </h3>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryMode('instant')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      deliveryMode === 'instant' 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>إرسال فوري الآن</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMode('scheduled')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      deliveryMode === 'scheduled' 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                        : 'bg-white text-indigo-700 border-slate-200 hover:bg-indigo-50'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>جدولة لاحقاً</span>
                  </button>
                </div>

                {deliveryMode === 'scheduled' && (
                  <div className="pt-2 animate-in fade-in">
                    <label className="block text-xs font-bold text-slate-700 mb-1">اختر التاريخ والوقت المستهدف</label>
                    <input
                      type="datetime-local"
                      required
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}
              </div>

              {/* Send Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm rounded-2xl shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جاري بث وتوجيه الإشعار...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>تأكيد الإرسال والبث الفوري 📢</span>
                  </>
                )}
              </button>

            </div>

          </div>

        </form>
      )}

      {/* TAB 2: NOTIFICATION HISTORY LOG */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>سجل جميع الإشعارات والتنبيهات الموجهة بالنظام</span>
            </h3>

            <span className="text-xs text-slate-500 font-bold">إجمالي الإشعارات: {notifications.length}</span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-700 font-black">
                <tr>
                  <th className="p-3">العنوان والمحتوى</th>
                  <th className="p-3">الفئة المستهدفة</th>
                  <th className="p-3">الأولوية والتصنيف</th>
                  <th className="p-3">التاريخ والوقت</th>
                  <th className="p-3">نسبة القراءة</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {notifications.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      لا يوجد أي إشعارات مسجلة في النظام حالياً.
                    </td>
                  </tr>
                ) : (
                  notifications.map((n) => {
                    const readUsersCount = Object.keys(n.readByUsers || {}).length + (n.read ? 1 : 0);

                    return (
                      <tr key={n.id} className="hover:bg-slate-50/80 transition-all">
                        <td className="p-3 max-w-xs">
                          <div className="font-bold text-slate-900 line-clamp-1">{n.titleAr}</div>
                          <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{n.bodyAr}</div>
                        </td>

                        <td className="p-3 font-bold text-slate-700">
                          {n.recipientType === 'all' && <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-full">الجميع</span>}
                          {n.recipientType === 'volunteers' && <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">المتطوعين</span>}
                          {n.recipientType === 'beneficiaries' && <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">المستفيدين</span>}
                          {n.recipientType === 'admins' && <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">الإدارة</span>}
                          {n.recipientType === 'support' && <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">الدعم الفني</span>}
                          {n.recipientType === 'team_members' && <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">فريق تطوعي</span>}
                          {(!n.recipientType || n.recipientType === 'custom') && <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-full">{n.userId}</span>}
                        </td>

                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            {n.type === 'urgent' && <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-full">عاجل</span>}
                            {n.type === 'important' && <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">مهم</span>}
                            {(!n.type || n.type === 'normal') && <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">عادي</span>}
                            
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              {n.category || 'عام'}
                            </span>
                          </div>
                        </td>

                        <td className="p-3 text-slate-500 font-mono text-[11px]">
                          {n.date || 'اليوم'}
                        </td>

                        <td className="p-3">
                          <span className="bg-emerald-50 text-emerald-800 font-bold px-2.5 py-1 rounded-full text-[11px] border border-emerald-200">
                            {readUsersCount} قراءة
                          </span>
                        </td>

                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => onDeleteNotification(n.id)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                              title="حذف الإشعار"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => onResendNotification(n.id)}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                              title="إعادة البث والإرسال"
                            >
                              <RotateCcw className="w-4 h-4" />
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
      )}

    </div>
  );
};
