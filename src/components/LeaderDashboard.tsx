import React, { useState, useEffect } from "react";
import { 
  Users, Calendar, CheckSquare, Star, MessageSquare, Send, BarChart2, 
  Check, X, RefreshCw, Award, Smile, Info, Compass, ShieldAlert,
  Clock, LogOut, Shield, Search, Filter, FileSpreadsheet, Edit3, User, CheckCircle2, ChevronDown, Plus, FileText, Globe, ExternalLink, Printer, Sparkles, Image as ImageIcon,
  Mail, AlertCircle, CreditCard, Download, Eye, Layers
} from "lucide-react";
import { 
  Volunteer, Initiative, JoinRequest, AttendanceRecord, Evaluation, VolunteerTeam, Department, OpportunityRequest,
  OfficialLetter, Employee, TeamStaffAssignment, VolunteerCardTemplate
} from "../types";
import { AttendanceScanner } from "./AttendanceScanner";
import { SendLetterModal } from "./SendLetterModal";
import { ImageUploadField } from "./ImageUploadField";
import { TeamStaffManager } from "./TeamStaffManager";
import { CardTemplateEditor } from "./CardTemplateEditor";
import { CardRenderer } from "./CardRenderer";
import { VolunteerProfileCardSection } from "./VolunteerProfileCardSection";

interface LeaderDashboardProps {
  currentTeam: VolunteerTeam;
  currentDepartment: Department;
  volunteers: Volunteer[];
  initiatives: Initiative[];
  requests: JoinRequest[];
  attendanceRecords: AttendanceRecord[];
  evaluations: Evaluation[];
  teams: VolunteerTeam[]; // for transfer team capability
  opportunityRequests?: OpportunityRequest[];
  notifications?: any[];
  employees?: Employee[];
  teamStaffAssignments?: TeamStaffAssignment[];
  onAssignTeamStaff?: (data: {
    teamId: string;
    teamName: string;
    employeeId: string;
    teamRole: string;
    assignedByLeaderName: string;
    notes?: string;
  }) => Promise<boolean>;
  onRemoveTeamStaff?: (assignmentId: string) => Promise<boolean>;
  onActionRequest: (id: string, action: 'accepted' | 'rejected' | 'waitlist' | 'transfer', targetTeamId?: string) => void;
  onRecordAttendance: (data: {
    initiativeId: string;
    volunteerId: string;
    status: 'full' | 'late' | 'excused' | 'unexcused';
    wearingVest: boolean;
    recorderBy: string;
  }) => void;
  onSendBroadcast: (teamId: string, message: string) => void;
  onSaveEvaluation: (evaluation: Evaluation) => void;
  onCheckoutInitiative?: (initiativeId: string, volunteerId: string) => void;
  onAddOpportunityRequest?: (opp: Partial<OpportunityRequest>) => void;
  onResubmitOpportunityRequest?: (opp: any) => Promise<any> | void;
  onUpdateOpportunityRequest?: (opp: any) => Promise<any> | void;
  onSubmitOfficialLetter?: (letter: Partial<OfficialLetter>) => Promise<{ success: boolean; letter?: OfficialLetter; message?: string }>;
}

export const LeaderDashboard: React.FC<LeaderDashboardProps> = ({
  currentTeam,
  currentDepartment,
  volunteers,
  initiatives,
  requests,
  attendanceRecords,
  evaluations,
  teams,
  opportunityRequests = [],
  notifications = [],
  employees = [],
  teamStaffAssignments = [],
  onAssignTeamStaff,
  onRemoveTeamStaff,
  onActionRequest,
  onRecordAttendance,
  onSendBroadcast,
  onSaveEvaluation,
  onCheckoutInitiative,
  onAddOpportunityRequest,
  onResubmitOpportunityRequest,
  onUpdateOpportunityRequest,
  onSubmitOfficialLetter
}: LeaderDashboardProps) => {
  // Tabs for Leader
  const [activeTab, setActiveTab] = useState<'home' | 'team' | 'attendance' | 'notifications' | 'profile' | 'opportunities' | 'staff' | 'cards'>('home');
  const [isLetterModalOpen, setIsLetterModalOpen] = useState(false);

  // Team Cards Management States for Leader
  const [teamTemplate, setTeamTemplate] = useState<VolunteerCardTemplate | null>(null);
  const [isLoadingTeamTemplate, setIsLoadingTeamTemplate] = useState(false);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [selectedVolunteerForCard, setSelectedVolunteerForCard] = useState<Volunteer | null>(null);
  const [isBulkIssuing, setIsBulkIssuing] = useState(false);
  const [cardSuccessMessage, setCardSuccessMessage] = useState<string | null>(null);
  const [cardErrorMessage, setCardErrorMessage] = useState<string | null>(null);
  const [memberCardSearch, setMemberCardSearch] = useState("");

  // Fetch Team Template
  const fetchTeamTemplate = async () => {
    setIsLoadingTeamTemplate(true);
    try {
      const res = await fetch(`/api/db/team-card-template/${currentTeam.id}`);
      const data = await res.json();
      if (data?.template) {
        setTeamTemplate(data.template);
      }
    } catch (err) {
      console.error("Failed to load team template:", err);
    } finally {
      setIsLoadingTeamTemplate(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'cards' && !teamTemplate) {
      fetchTeamTemplate();
    }
  }, [activeTab, currentTeam.id]);

  const handleSaveTeamTemplate = async (templateToSave: VolunteerCardTemplate) => {
    setCardErrorMessage(null);
    try {
      const res = await fetch("/api/db/team-card-template/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: currentTeam.id,
          template: templateToSave,
          leaderTeamId: currentTeam.id,
          userRole: "leader",
          performerName: currentTeam.leaderName || "قائد الفريق",
          applyToTeamCards: true
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل حفظ قالب الفريق");
      }
      setTeamTemplate(data.template);
      setIsEditingTemplate(false);
      setCardSuccessMessage("تم حفظ قالب بطاقة الفريق بنجاح وتطبيقه على بطاقات الأعضاء!");
      setTimeout(() => setCardSuccessMessage(null), 4000);
    } catch (err: any) {
      setCardErrorMessage(err.message || "حدث خطأ أثناء حفظ القالب");
    }
  };

  const handleBulkIssueTeamCards = async () => {
    if (!window.confirm(`هل أنت متأكد من رغبتك في إصدار وتحديث بطاقات العضوية تلقائياً لجميع متطوعي فريق (${currentTeam.nameAr}) بعدد (${teamMembers.length}) متطوع؟`)) {
      return;
    }
    setIsBulkIssuing(true);
    setCardErrorMessage(null);
    try {
      const res = await fetch("/api/db/team-cards/bulk-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: currentTeam.id,
          leaderTeamId: currentTeam.id,
          userRole: "leader",
          performerName: currentTeam.leaderName || "قائد الفريق"
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل إصدار البطاقات");
      }
      setCardSuccessMessage(`تم بنجاح إصدار وتحديث ${data.issuedCount || teamMembers.length} بطاقة لمتطوعي الفريق!`);
      setTimeout(() => setCardSuccessMessage(null), 5000);
    } catch (err: any) {
      setCardErrorMessage(err.message || "حدث خطأ أثناء إصدار البطاقات");
    } finally {
      setIsBulkIssuing(false);
    }
  };

  // Opportunity Request states for Leader
  const [showAddOppModal, setShowAddOppModal] = useState(false);
  const [editingOpp, setEditingOpp] = useState<OpportunityRequest | null>(null);
  const [oppModalError, setOppModalError] = useState<string | null>(null);
  const [oppFilterStatus, setOppFilterStatus] = useState<'all' | 'pending' | 'accepted' | 'rejected' | 'returned'>('all');
  const [viewingOppDetail, setViewingOppDetail] = useState<OpportunityRequest | null>(null);

  // Form states for Opportunity Request
  const [oppTitle, setOppTitle] = useState("");
  const [oppType, setOppType] = useState("فرصة عادية");
  const [oppDomain, setOppDomain] = useState("إداري");
  const [oppNeededCount, setOppNeededCount] = useState(5);
  const [oppPlace, setOppPlace] = useState("مكة المكرمة - العسيلة");
  const [oppGoal1, setOppGoal1] = useState("");
  const [oppGoal2, setOppGoal2] = useState("");
  const [oppGoal3, setOppGoal3] = useState("");
  const [oppDescription, setOppDescription] = useState("");
  const [oppImageUrl, setOppImageUrl] = useState("https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&fit=crop");
  const [oppSuccessMsg, setOppSuccessMsg] = useState("");

  const handleOpenCreateOppModal = () => {
    setEditingOpp(null);
    setOppTitle("");
    setOppType("فرصة عادية");
    setOppDomain("إداري");
    setOppNeededCount(5);
    setOppPlace("مكة المكرمة - العسيلة");
    setOppGoal1("");
    setOppGoal2("");
    setOppGoal3("");
    setOppDescription("");
    setOppImageUrl("https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&fit=crop");
    setOppModalError(null);
    setShowAddOppModal(true);
  };

  const handleOpenEditOppModal = (opp: OpportunityRequest) => {
    setEditingOpp(opp);
    setOppTitle(opp.title || "");
    setOppType(opp.opportunityType || "فرصة عادية");
    setOppDomain(opp.domain || "إداري");
    setOppNeededCount(opp.neededCount || 5);
    setOppPlace(opp.place || "مكة المكرمة - العسيلة");
    setOppGoal1(opp.goals?.[0] || "");
    setOppGoal2(opp.goals?.[1] || "");
    setOppGoal3(opp.goals?.[2] || "");
    setOppDescription(opp.description || "");
    setOppImageUrl(opp.imageUrl || "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&fit=crop");
    setOppModalError(null);
    setShowAddOppModal(true);
  };

  // PDF Report modal state
  const [showPdfReportModal, setShowPdfReportModal] = useState(false);
  const [pdfReportInitiativeId, setPdfReportInitiativeId] = useState("all");
  
  // Attendance Sub-Tab ('scanner' | 'archive')
  const [attendanceSubTab, setAttendanceSubTab] = useState<'scanner' | 'archive'>('scanner');

  // Archive filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [initFilter, setInitFilter] = useState("all");
  const [exportSuccess, setExportSuccess] = useState(false);

  // Broadcast message State
  const [broadcastText, setBroadcastText] = useState("");
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  // Transfer volunteer state
  const [selectedReqForTransfer, setSelectedReqForTransfer] = useState<JoinRequest | null>(null);
  const [transferTeamId, setTransferTeamId] = useState("");

  // active initiative for attendance taking
  const [selectedInitForAttendance, setSelectedInitForAttendance] = useState<Initiative | null>(null);

  // Evaluation form state
  const [evaluatingVolunteer, setEvaluatingVolunteer] = useState<Volunteer | null>(null);
  const [selectedInitForEval, setSelectedInitForEval] = useState<Initiative | null>(null);
  const [evalCommitment, setEvalCommitment] = useState(5);
  const [evalEthics, setEvalEthics] = useState(5);
  const [evalCooperation, setEvalCooperation] = useState(5);
  const [evalDiscipline, setEvalDiscipline] = useState(5);
  const [evalInteraction, setEvalInteraction] = useState(5);
  const [evalTaskExecution, setEvalTaskExecution] = useState(5);
  const [evalWearingVest, setEvalWearingVest] = useState(true);
  const [evalComments, setEvalComments] = useState("");
  const [evalSuccess, setEvalSuccess] = useState(false);

  // Manual status edit popup state
  const [editingAttendanceRecord, setEditingAttendanceRecord] = useState<AttendanceRecord | null>(null);
  const [editStatus, setEditStatus] = useState<'full' | 'late' | 'excused' | 'unexcused'>('full');
  const [editWearingVest, setEditWearingVest] = useState(true);
  const [editSuccessMessage, setEditSuccessMessage] = useState("");

  // Get current team members
  const teamMembers = volunteers.filter(v => v.teamId === currentTeam.id);

  // Get initiatives for this team
  const teamInitiatives = initiatives.filter(i => i.teamId === currentTeam.id);

  // Get join requests for this team or this team's initiatives
  const teamRequests = requests.filter(r => r.teamId === currentTeam.id && r.status === "pending");

  // Get active checked-in volunteers in team's initiatives (has checkin record with NO checkoutTimestamp)
  const activeCheckins = attendanceRecords.filter(a => {
    const isMemberOfTeam = teamMembers.some(tm => tm.id === a.volunteerId);
    return isMemberOfTeam && !a.checkoutTimestamp;
  });

  const handleBroadcastSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastText.trim()) return;
    onSendBroadcast(currentTeam.id, broadcastText);
    setBroadcastText("");
    setBroadcastSuccess(true);
    setTimeout(() => setBroadcastSuccess(false), 4000);
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedReqForTransfer && transferTeamId) {
      onActionRequest(selectedReqForTransfer.id, 'transfer', transferTeamId);
      setSelectedReqForTransfer(null);
      setTransferTeamId("");
    }
  };

  const handleCreateOpportunitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOppModalError(null);

    if (!oppTitle.trim()) {
      setOppModalError("يرجى إدخال اسم أو عنوان الفرصة التطوعية.");
      return;
    }
    if (!oppGoal1.trim()) {
      setOppModalError("يرجى إدخال الهدف الأول على الأقل للفرصة التطوعية.");
      return;
    }
    if (!oppNeededCount || Number(oppNeededCount) <= 0) {
      setOppModalError("يرجى تحديد عدد المتطوعين المطلوب (1 على الأقل).");
      return;
    }

    try {
      if (editingOpp) {
        // Resubmission of a returned opportunity
        if (onResubmitOpportunityRequest) {
          await onResubmitOpportunityRequest({
            id: editingOpp.id,
            title: oppTitle.trim(),
            opportunityType: oppType,
            domain: oppDomain,
            neededCount: Number(oppNeededCount),
            place: oppPlace.trim(),
            goals: [oppGoal1, oppGoal2, oppGoal3].map(g => g.trim()).filter(g => g.length > 0),
            description: oppDescription.trim(),
            imageUrl: oppImageUrl,
            leaderName: currentTeam.leaderName,
            teamId: currentTeam.id
          });
        }
        setOppSuccessMsg("تمت إعادة إرسال الفرصة التطوعية بنجاح إلى إدارة التطوع، وحالتها الآن [قيد المراجعة]! ✓");
      } else {
        // New opportunity creation
        if (onAddOpportunityRequest) {
          await onAddOpportunityRequest({
            title: oppTitle.trim(),
            opportunityType: oppType,
            domain: oppDomain,
            neededCount: Number(oppNeededCount),
            place: oppPlace.trim(),
            goals: [oppGoal1, oppGoal2, oppGoal3].map(g => g.trim()).filter(g => g.length > 0),
            description: oppDescription.trim(),
            imageUrl: oppImageUrl,
            teamId: currentTeam.id,
            teamName: currentTeam.nameAr,
            departmentId: currentDepartment.id,
            departmentName: currentDepartment.nameAr,
            leaderId: currentTeam.leaderName,
            leaderName: currentTeam.leaderName,
            status: 'pending'
          });
        }
        setOppSuccessMsg("تم إرسال الفرصة التطوعية بنجاح إلى إدارة التطوع، وحالتها الآن [قيد المراجعة]! ✓");
      }

      setShowAddOppModal(false);
      setEditingOpp(null);
      setOppTitle("");
      setOppGoal1("");
      setOppGoal2("");
      setOppGoal3("");
      setOppDescription("");
      setTimeout(() => setOppSuccessMsg(""), 6000);
    } catch (err) {
      console.error(err);
      setOppModalError("حدث خطأ أثناء حفظ أو إرسال الفرصة التطوعية. يرجى المحاولة لاحقاً.");
    }
  };

  const handleManualCheckout = async (record: AttendanceRecord) => {
    if (!onCheckoutInitiative) return;
    try {
      await onCheckoutInitiative(record.initiativeId, record.volunteerId);
      setEditSuccessMessage("تم تسجيل الانصراف الميداني بنظام التحقق يدوياً بنجاح!");
      setTimeout(() => setEditSuccessMessage(""), 4000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveManualStatusEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAttendanceRecord) return;
    onRecordAttendance({
      initiativeId: editingAttendanceRecord.initiativeId,
      volunteerId: editingAttendanceRecord.volunteerId,
      status: editStatus,
      wearingVest: editWearingVest,
      recorderBy: currentTeam.leaderName
    });
    setEditingAttendanceRecord(null);
    setEditSuccessMessage("تم تعديل حالة الحضور ونقاط التقييم بنجاح! ✓");
    setTimeout(() => setEditSuccessMessage(""), 4000);
  };

  const handleSaveEvalForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evaluatingVolunteer || !selectedInitForEval) return;

    onSaveEvaluation({
      id: "eval-" + Date.now(),
      volunteerId: evaluatingVolunteer.id,
      initiativeId: selectedInitForEval.id,
      commitment: evalCommitment,
      ethics: evalEthics,
      cooperation: evalCooperation,
      discipline: evalDiscipline,
      interaction: evalInteraction,
      wearingVest: evalWearingVest,
      taskExecution: evalTaskExecution,
      comments: evalComments
    });

    setEvalSuccess(true);
    setEvaluatingVolunteer(null);
    setEvalComments("");
    setTimeout(() => setEvalSuccess(false), 4000);
  };

  // Archive filtered list
  const filteredArchive = attendanceRecords.filter(a => {
    const vol = volunteers.find(v => v.id === a.volunteerId);
    if (!vol) return false;

    // Must belong to this team or its initiatives
    const isTeamMember = vol.teamId === currentTeam.id;
    const isTeamInit = teamInitiatives.some(i => i.id === a.initiativeId);
    if (!isTeamMember && !isTeamInit) return false;

    // Search query matches name or national ID (simulated using membership number or identifier)
    const matchesSearch = searchQuery === "" || 
      vol.name.includes(searchQuery) || 
      vol.nationalId?.includes(searchQuery) ||
      vol.membershipNumber.includes(searchQuery);

    // Status filter
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;

    // Initiative filter
    const matchesInit = initFilter === "all" || a.initiativeId === initFilter;

    return matchesSearch && matchesStatus && matchesInit;
  });

  const handleExportExcel = () => {
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner stats of the team */}
      <div className="bg-linear-to-r from-emerald-50 to-emerald-100/50 p-5 rounded-2xl border border-emerald-100 flex flex-col md:flex-row md:items-center justify-between gap-4 text-right" dir="rtl">
        <div>
          <span className="text-[10px] bg-emerald-600 text-white px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">لوحة قيادة الفريق</span>
          <h2 className="text-md font-black text-emerald-950 mt-1.5">{currentTeam.nameAr}</h2>
          <p className="text-xs text-emerald-800/80 mt-0.5">تابع لـ: <strong className="text-emerald-900">{currentDepartment.nameAr}</strong> • القائد: <strong className="text-emerald-950">{currentTeam.leaderName}</strong></p>
        </div>

        <div className="flex gap-4">
          <div className="text-center bg-white px-4 py-2.5 rounded-xl shadow-2xs border border-emerald-100">
            <strong className="text-md font-black text-emerald-800 block">{teamMembers.length}</strong>
            <span className="text-[10px] text-neutral-400 font-bold block">الأعضاء</span>
          </div>
          <div className="text-center bg-white px-4 py-2.5 rounded-xl shadow-2xs border border-emerald-100">
            <strong className="text-md font-black text-emerald-800 block">{teamInitiatives.length}</strong>
            <span className="text-[10px] text-neutral-400 font-bold block">المبادرات</span>
          </div>
          <div className="text-center bg-white px-4 py-2.5 rounded-xl shadow-2xs border border-emerald-100">
            <strong className="text-md font-black text-rose-600 block">{teamRequests.length}</strong>
            <span className="text-[10px] text-neutral-400 font-bold block">طلبات معلقة</span>
          </div>
          <button
            id="leader-send-letter-cta-btn"
            type="button"
            onClick={() => setIsLetterModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer shrink-0"
          >
            <Mail className="w-4 h-4" />
            <span>إرسال خطاب</span>
          </button>
        </div>
      </div>

      {/* Navigation tabs - 6 requested keys */}
      <div className="flex border-b border-neutral-100 gap-1 overflow-x-auto whitespace-nowrap pb-1" dir="rtl">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer border-b-2 ${activeTab === 'home' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>الرئيسية (متابعة الحضور النشط)</span>
        </button>
        <button
          onClick={() => setActiveTab('opportunities')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer border-b-2 ${activeTab === 'opportunities' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}
        >
          <FileText className="w-4 h-4 text-emerald-600" />
          <span>الفرص التطوعية</span>
          {opportunityRequests.filter(r => (r.teamId === currentTeam.id || !r.teamId) && r.status === 'returned').length > 0 && (
            <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
              {opportunityRequests.filter(r => (r.teamId === currentTeam.id || !r.teamId) && r.status === 'returned').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('team')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer border-b-2 ${activeTab === 'team' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}
        >
          <Users className="w-4 h-4" />
          <span>فريقي ({teamMembers.length})</span>
        </button>
        <button
          id="tab-leader-cards"
          onClick={() => setActiveTab('cards')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer border-b-2 ${activeTab === 'cards' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}
        >
          <CreditCard className="w-4 h-4 text-emerald-600" />
          <span>بطاقات الفريق</span>
          {teamMembers.length > 0 && (
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {teamMembers.length}
            </span>
          )}
        </button>
        <button
          id="tab-leader-staff"
          onClick={() => setActiveTab('staff')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer border-b-2 ${activeTab === 'staff' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}
        >
          <Shield className="w-4 h-4 text-emerald-600" />
          <span>كوادر وموظفو الفريق ({teamStaffAssignments.filter(a => a.teamId === currentTeam.id && a.status === 'active').length})</span>
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer border-b-2 ${activeTab === 'attendance' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>الحضور وأرشيف التحضير</span>
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer border-b-2 ${activeTab === 'notifications' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>الإشعارات والتعاميم</span>
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer border-b-2 ${activeTab === 'profile' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}
        >
          <User className="w-4 h-4" />
          <span>حسابي</span>
        </button>
        <button
          id="leader-send-letter-tab-btn"
          type="button"
          onClick={() => setIsLetterModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer border-b-2 border-transparent text-emerald-700 hover:text-emerald-900 bg-emerald-50/70 hover:bg-emerald-100/70 rounded-t-lg"
        >
          <Mail className="w-4 h-4 text-emerald-600" />
          <span>إرسال خطاب</span>
        </button>
      </div>

      {/* Messages / Notifications block inside Leader dashboard */}
      {editSuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2" dir="rtl">
          <Smile className="w-5 h-5 text-emerald-600 animate-bounce" />
          <span>{editSuccessMessage}</span>
        </div>
      )}

      {/* Main Container Content */}
      <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-2xs text-right" dir="rtl">
        
        {/* 1. HOME VIEW: Stats & Active Checked-In Volunteers with checkout and modifications */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-black text-neutral-800 uppercase tracking-wider">الحضور الميداني المباشر حالياً (مسجلو الحضور بالبطاقة)</h3>
              <p className="text-[11px] text-neutral-500">متابعة المتطوعين المتواجدين حالياً في نقاط العمل وإمكانية تسجيل انصرافهم يدوياً أو تعديل تفاصيل حضورهم.</p>
            </div>

            {activeCheckins.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeCheckins.map(rec => {
                  const vol = volunteers.find(v => v.id === rec.volunteerId);
                  const init = initiatives.find(i => i.id === rec.initiativeId);
                  if (!vol) return null;
                  return (
                    <div key={rec.id} className="bg-amber-50/20 border border-amber-200/50 p-4 rounded-2xl flex flex-col justify-between hover:border-amber-500 transition-all">
                      <div className="flex items-start gap-3">
                        <img 
                          src={vol.photo} 
                          alt={vol.name} 
                          className="w-12 h-12 rounded-xl object-cover border-2 border-amber-300"
                          referrerPolicy="no-referrer"
                        />
                        <div className="space-y-1.5">
                          <strong className="text-xs text-neutral-800 block">{vol.name}</strong>
                          <span className="text-[10px] font-mono text-neutral-500 block">عضوية رقم: {vol.membershipNumber}</span>
                          <div className="text-[10.5px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md inline-block">
                            📌 يتواجد حالياً بـ: <b>{init ? init.name : "مبادرة ميدانية"}</b>
                          </div>
                          <span className="text-[10px] text-neutral-400 block font-mono">تاريخ الحضور: {rec.timestamp ? new Date(rec.timestamp).toLocaleTimeString("ar-SA") : "غير مسجل"}</span>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-neutral-100">
                        <button
                          onClick={() => {
                            setEditingAttendanceRecord(rec);
                            setEditStatus(rec.status as any);
                            setEditWearingVest(rec.wearingVest);
                          }}
                          className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>تعديل الحالة</span>
                        </button>
                        <button
                          onClick={() => handleManualCheckout(rec)}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>تسجيل انصراف يدوي</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center text-neutral-400 text-xs border border-dashed border-neutral-200 rounded-2xl">
                ☕ لا يوجد أي متطوع مسجل حضور ميداني حالياً.
              </div>
            )}
          </div>
        )}

        {/* 1.5 OPPORTUNITY REQUESTS TAB FOR LEADER */}
        {activeTab === 'opportunities' && (
          <div className="space-y-6">
            {/* Top Banner Header */}
            <div className="bg-linear-to-r from-emerald-50 to-teal-50 p-5 rounded-2xl border border-emerald-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] bg-emerald-600 text-white px-3 py-1 rounded-full font-bold">بوابة قائد الفريق</span>
                <h3 className="text-md font-black text-emerald-950 mt-1">الفرص التطوعية</h3>
                <p className="text-xs text-emerald-800/80">إنشاء ومتابعة الفرص التطوعية التابعة لفريقك ({currentTeam.nameAr}) ودورة مراجعتها واعتمادها لدى إدارة التطوع</p>
              </div>

              <button
                onClick={handleOpenCreateOppModal}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إنشاء فرصة تطوعية</span>
              </button>
            </div>

            {oppSuccessMsg && (
              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 animate-bounce shrink-0" />
                <span>{oppSuccessMsg}</span>
              </div>
            )}

            {/* Returned opportunities notice banner */}
            {opportunityRequests.some(r => (r.teamId === currentTeam.id || !r.teamId) && r.status === 'returned') && (
              <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-blue-900">
                  <ShieldAlert className="w-5 h-5 text-blue-600 shrink-0" />
                  <h4 className="text-xs font-black">فرص معادة للتصحيح تتطلب تعديلها وإعادة إرسالها:</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {opportunityRequests
                    .filter(r => (r.teamId === currentTeam.id || !r.teamId) && r.status === 'returned')
                    .map(retOpp => (
                      <div key={retOpp.id} className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-2xs flex flex-col justify-between gap-2.5">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <strong className="text-xs text-neutral-800">{retOpp.title}</strong>
                            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-md">معادة للتصحيح</span>
                          </div>
                          <div className="mt-2 text-[11px] bg-blue-50 p-2 rounded-lg text-blue-900 border border-blue-100">
                            <span className="font-bold block mb-0.5">ملاحظات إدارة التطوع:</span>
                            <p className="line-clamp-2">{retOpp.correctionNotes || "يرجى مراجعة وتحديث بيانات الفرصة التطوعية."}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-neutral-100">
                          <button
                            onClick={() => handleOpenEditOppModal(retOpp)}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] py-1.5 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>تعديل الفرصة الآن</span>
                          </button>
                          <button
                            onClick={() => setViewingOppDetail(retOpp)}
                            className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-[11px] py-1.5 px-3 rounded-lg transition-all cursor-pointer"
                          >
                            عرض
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Counter Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-100 text-center space-y-1">
                <strong className="text-lg font-black text-neutral-800 font-mono block">
                  {opportunityRequests.filter(r => r.teamId === currentTeam.id || !r.teamId).length}
                </strong>
                <span className="text-[10.5px] text-neutral-500 font-bold block">إجمالي الفرص</span>
              </div>
              <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-100 text-center space-y-1">
                <strong className="text-lg font-black text-amber-700 font-mono block">
                  {opportunityRequests.filter(r => (r.teamId === currentTeam.id || !r.teamId) && r.status === 'pending').length}
                </strong>
                <span className="text-[10.5px] text-amber-800 font-bold block">قيد المراجعة</span>
              </div>
              <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100 text-center space-y-1">
                <strong className="text-lg font-black text-emerald-700 font-mono block">
                  {opportunityRequests.filter(r => (r.teamId === currentTeam.id || !r.teamId) && r.status === 'accepted').length}
                </strong>
                <span className="text-[10.5px] text-emerald-800 font-bold block">مقبولة</span>
              </div>
              <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100 text-center space-y-1">
                <strong className="text-lg font-black text-blue-700 font-mono block">
                  {opportunityRequests.filter(r => (r.teamId === currentTeam.id || !r.teamId) && r.status === 'returned').length}
                </strong>
                <span className="text-[10.5px] text-blue-800 font-bold block">معادة للتصحيح</span>
              </div>
              <div className="bg-rose-50/50 p-3.5 rounded-xl border border-rose-100 text-center space-y-1 col-span-2 md:col-span-1">
                <strong className="text-lg font-black text-rose-700 font-mono block">
                  {opportunityRequests.filter(r => (r.teamId === currentTeam.id || !r.teamId) && r.status === 'rejected').length}
                </strong>
                <span className="text-[10.5px] text-rose-800 font-bold block">مرفوضة</span>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex border-b border-neutral-100 gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setOppFilterStatus('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${oppFilterStatus === 'all' ? 'bg-emerald-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}
              >
                الكل ({opportunityRequests.filter(r => r.teamId === currentTeam.id || !r.teamId).length})
              </button>
              <button
                onClick={() => setOppFilterStatus('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${oppFilterStatus === 'pending' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'}`}
              >
                قيد المراجعة ({opportunityRequests.filter(r => (r.teamId === currentTeam.id || !r.teamId) && r.status === 'pending').length})
              </button>
              <button
                onClick={() => setOppFilterStatus('accepted')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${oppFilterStatus === 'accepted' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'}`}
              >
                مقبولة ({opportunityRequests.filter(r => (r.teamId === currentTeam.id || !r.teamId) && r.status === 'accepted').length})
              </button>
              <button
                onClick={() => setOppFilterStatus('returned')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${oppFilterStatus === 'returned' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-800 hover:bg-blue-100'}`}
              >
                معادة للتصحيح ({opportunityRequests.filter(r => (r.teamId === currentTeam.id || !r.teamId) && r.status === 'returned').length})
              </button>
              <button
                onClick={() => setOppFilterStatus('rejected')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${oppFilterStatus === 'rejected' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-800 hover:bg-rose-100'}`}
              >
                مرفوضة ({opportunityRequests.filter(r => (r.teamId === currentTeam.id || !r.teamId) && r.status === 'rejected').length})
              </button>
            </div>

            {/* Opportunities Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-neutral-800">قائمة الفرص التطوعية</h4>
                <span className="text-[11px] text-neutral-400 font-mono">
                  {opportunityRequests.filter(r => (r.teamId === currentTeam.id || !r.teamId) && (oppFilterStatus === 'all' || r.status === oppFilterStatus)).length} فرصة
                </span>
              </div>

              <div className="border border-neutral-150 rounded-xl overflow-hidden overflow-x-auto shadow-2xs">
                <table className="w-full text-right text-xs">
                  <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-150 font-bold">
                    <tr>
                      <th className="p-3">معرف الفرصة</th>
                      <th className="p-3">اسم الفرصة</th>
                      <th className="p-3">النوع</th>
                      <th className="p-3">المجال</th>
                      <th className="p-3">المتطوعين</th>
                      <th className="p-3">تاريخ الإنشاء</th>
                      <th className="p-3">الحالة</th>
                      <th className="p-3 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {opportunityRequests
                      .filter(r => (r.teamId === currentTeam.id || !r.teamId) && (oppFilterStatus === 'all' || r.status === oppFilterStatus))
                      .map(r => (
                        <tr key={r.id} className="hover:bg-neutral-50/50 transition-all font-medium">
                          <td className="p-3">
                            {r.opportunityCode ? (
                              <span className="font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px]">
                                #{r.opportunityCode}
                              </span>
                            ) : (
                              <span className="text-[10px] text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-md">
                                قيد التعيين
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-bold text-neutral-800">{r.title}</td>
                          <td className="p-3 text-neutral-600">{r.opportunityType}</td>
                          <td className="p-3 text-neutral-600">{r.domain}</td>
                          <td className="p-3 font-mono text-emerald-700 font-bold">0 / {r.neededCount}</td>
                          <td className="p-3 font-mono text-[10.5px] text-neutral-500">
                            {r.createdAt ? new Date(r.createdAt).toLocaleDateString('ar-SA') : "—"}
                          </td>
                          <td className="p-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                              r.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
                              r.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                              r.status === 'returned' ? 'bg-blue-100 text-blue-800' :
                              r.status === 'draft' ? 'bg-neutral-100 text-neutral-700' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {r.status === 'accepted' ? '✓ مقبولة' :
                               r.status === 'rejected' ? '❌ مرفوضة' :
                               r.status === 'returned' ? '⚠️ معادة للتصحيح' :
                               r.status === 'draft' ? '📝 مسودة' : '⏳ قيد المراجعة'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setViewingOppDetail(r)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                              >
                                <span>عرض</span>
                              </button>
                              {r.status === 'returned' && (
                                <button
                                  onClick={() => handleOpenEditOppModal(r)}
                                  className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>تعديل</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    {opportunityRequests.filter(r => (r.teamId === currentTeam.id || !r.teamId) && (oppFilterStatus === 'all' || r.status === oppFilterStatus)).length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-neutral-400 text-xs">
                          لا توجد فرص تطوعية ضمن هذا التصنيف حالياً.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 2. TEAM MANAGEMENT & ROSTER */}
        {activeTab === 'team' && (
          <div className="space-y-6">
            
            {/* Team Supervisor details */}
            <div className="bg-emerald-50/20 p-4 rounded-xl border border-emerald-100/30 flex items-center justify-between text-xs">
              <div className="space-y-1">
                <span className="text-[9px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">المشرف العام المسؤول</span>
                <h4 className="font-bold text-neutral-800">الأستاذ سعود الحربي</h4>
                <p className="text-[11px] text-neutral-500">يتولى التوجيه، المتابعة الإدارية، وإصدار التعاميم العليا للشراكة الميدانية بالعسيلة.</p>
              </div>
              <Shield className="w-8 h-8 text-emerald-600 shrink-0" />
            </div>

            {/* Roster details */}
            <div className="space-y-3">
              <div>
                <h4 className="text-xs font-black text-neutral-800">جدول أعضاء فريق {currentTeam.nameAr} المعتمدين</h4>
                <p className="text-[10.5px] text-neutral-400">إحصاء كلي للمتطوعين المنتسبين للفريق ونقاط التميز المسجلة</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teamMembers.map(v => {
                  const evals = evaluations.filter(e => e.volunteerId === v.id);
                  const averageRating = evals.length > 0 
                    ? (evals.reduce((acc, c) => acc + c.commitment, 0) / evals.length).toFixed(1)
                    : "5.0";
                  return (
                    <div key={v.id} className="border border-neutral-100 p-4 rounded-xl flex items-center justify-between bg-neutral-50/10 hover:border-emerald-500 transition-all">
                      <div className="flex items-center gap-3">
                        <img src={v.photo} alt={v.name} className="w-10 h-10 rounded-lg object-cover" referrerPolicy="no-referrer" />
                        <div>
                          <strong className="text-xs text-neutral-800 block">{v.name}</strong>
                          <span className="text-[9.5px] text-neutral-400 block font-mono mt-0.5">الهوية: {v.nationalId || "1033481230"}</span>
                        </div>
                      </div>

                      <div className="text-left font-mono space-y-1">
                        <span className="text-[10.5px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full block text-center font-bold">
                          {v.points} نقطة
                        </span>
                        <span className="text-[9.5px] text-emerald-700 block text-center font-bold">★ {averageRating}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Join requests list */}
            <div className="border-t border-neutral-150 pt-6 space-y-4">
              <div>
                <h4 className="text-xs font-black text-neutral-800">طلبات الانضمام وتراخيص المشاركة الميدانية</h4>
                <p className="text-[10.5px] text-neutral-400">اتخاذ إجراء القبول أو نقل العضو إلى فريق آخر</p>
              </div>

              {teamRequests.length > 0 ? (
                <div className="space-y-3">
                  {teamRequests.map(req => (
                    <div key={req.id} className="border border-neutral-100 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-50/20">
                      <div>
                        <strong className="text-xs text-neutral-800 block">{req.volunteerName}</strong>
                        <p className="text-[11px] text-neutral-500 mt-1">يطلب المشاركة بمبادرة: <strong className="text-emerald-700">{req.initiativeName}</strong></p>
                      </div>

                      <div className="flex gap-1.5 flex-wrap">
                        <button
                          onClick={() => onActionRequest(req.id, "accepted")}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                        >
                          قبول
                        </button>
                        <button
                          onClick={() => onActionRequest(req.id, "rejected")}
                          className="bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                        >
                          رفض
                        </button>
                        <button
                          onClick={() => {
                            setSelectedReqForTransfer(req);
                            setTransferTeamId(teams.filter(t => t.id !== currentTeam.id)[0]?.id || "");
                          }}
                          className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                        >
                          نقل لفريق آخر
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-neutral-400 text-xs">لا يوجد أي طلب انضمام معلق حالياً.</div>
              )}
            </div>

          </div>
        )}

        {/* 3. ATTENDANCE SCANNER & DEDICATED ARCHIVE VIEW */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            
            {/* Sub-tab toggles */}
            <div className="flex bg-neutral-100 p-1 rounded-xl max-w-sm gap-1">
              <button
                onClick={() => setAttendanceSubTab('scanner')}
                className={`flex-1 text-center py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${attendanceSubTab === 'scanner' ? 'bg-white text-emerald-700 shadow-xs' : 'text-neutral-500 hover:text-neutral-800'}`}
              >
                تحضير وتأكيد ذكي
              </button>
              <button
                onClick={() => setAttendanceSubTab('archive')}
                className={`flex-1 text-center py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${attendanceSubTab === 'archive' ? 'bg-white text-emerald-700 shadow-xs' : 'text-neutral-500 hover:text-neutral-800'}`}
              >
                أرشيف التحضير الموحد
              </button>
            </div>

            {/* Subtab 1: Smart Scanner */}
            {attendanceSubTab === 'scanner' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-black text-neutral-800">تأكيد وتحضير المتطوعين الميداني بالبطاقة الرقمية</h4>
                    <p className="text-[11px] text-neutral-500">اختر المبادرة من القائمة ووجه الباركود الخاص بالمتطوع لتأكيد حضوره</p>
                  </div>
                  <select
                    value={selectedInitForAttendance?.id || ""}
                    onChange={(e) => {
                      const init = teamInitiatives.find(i => i.id === e.target.value);
                      if (init) setSelectedInitForAttendance(init);
                    }}
                    className="border border-neutral-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {teamInitiatives.map(i => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                  </select>
                </div>

                {selectedInitForAttendance ? (
                  <AttendanceScanner
                    initiative={selectedInitForAttendance}
                    volunteers={volunteers}
                    attendanceRecords={attendanceRecords}
                    onRecordAttendance={onRecordAttendance}
                    currentLeaderName={currentTeam.leaderName}
                  />
                ) : (
                  <div className="p-8 text-center text-neutral-400 text-xs">لا يوجد مبادرات مخصصة لتأكيد حضورها اليوم.</div>
                )}
              </div>
            )}

            {/* Subtab 2: Dedicated Attendance Archive with Filters, Search, and Excel Export simulation */}
            {attendanceSubTab === 'archive' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-black text-neutral-800">أرشيف سجلات الحضور والانصراف الموحد</h4>
                    <p className="text-[11px] text-neutral-500">مراجعة شاملة لتقرير حضور متطوعي فريق {currentTeam.nameAr} بمخطط العسيلة.</p>
                  </div>

                  <button
                    onClick={handleExportExcel}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>تصدير كملف Excel</span>
                  </button>
                </div>

                {exportSuccess && (
                  <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 animate-pulse" />
                    <span>📥 تم تصدير أرشيف التحضير بصيغة Excel (تنسيق XLSX) بنجاح ويشمل ({filteredArchive.length}) سجلاً! ✓</span>
                  </div>
                )}

                {/* Filters grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                  <div className="relative">
                    <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-3" />
                    <input
                      type="text"
                      placeholder="البحث بالاسم أو الهوية أو العضوية..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-3 pr-9 py-2 border border-neutral-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 bg-white outline-none"
                    />
                  </div>

                  <div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full p-2 border border-neutral-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 bg-white outline-none font-bold"
                    >
                      <option value="all">كل حالات الحضور والالتزام</option>
                      <option value="full">حضور كامل (+3 نقاط)</option>
                      <option value="late">حضور متأخر (+2 نقاط)</option>
                      <option value="excused">عذر مقبول (+1 نقطة)</option>
                      <option value="unexcused">غياب بدون عذر (-2 نقاط)</option>
                    </select>
                  </div>

                  <div>
                    <select
                      value={initFilter}
                      onChange={(e) => setInitFilter(e.target.value)}
                      className="w-full p-2 border border-neutral-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 bg-white outline-none font-bold"
                    >
                      <option value="all">كل المبادرات والفعاليات</option>
                      {teamInitiatives.map(i => (
                        <option key={i.id} value={i.id}>{i.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Records Table */}
                <div className="overflow-x-auto border border-neutral-100 rounded-2xl shadow-2xs">
                  <table className="w-full text-right text-xs divide-y divide-neutral-100">
                    <thead className="bg-neutral-50 font-black text-neutral-600">
                      <tr>
                        <th className="p-3">المتطوع (الاسم / الهوية)</th>
                        <th className="p-3">رقم العضوية</th>
                        <th className="p-3">المبادرة</th>
                        <th className="p-3">التاريخ</th>
                        <th className="p-3">الحضور والانصراف</th>
                        <th className="p-3">المدة</th>
                        <th className="p-3">الحالة والالتزام</th>
                        <th className="p-3">الزي والبطاقة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50 font-medium text-neutral-700 bg-white">
                      {filteredArchive.length > 0 ? (
                        filteredArchive.map(a => {
                          const vol = volunteers.find(v => v.id === a.volunteerId);
                          const init = initiatives.find(i => i.id === a.initiativeId);
                          return (
                            <tr key={a.id} className="hover:bg-neutral-50/50">
                              <td className="p-3">
                                <div>
                                  <span className="font-bold text-neutral-900 block">{vol ? vol.name : "متطوع مجهول"}</span>
                                  <span className="text-[9.5px] text-neutral-400 font-mono block mt-0.5">الهوية: {vol?.nationalId || "1033481230"}</span>
                                </div>
                              </td>
                              <td className="p-3 font-mono font-bold text-neutral-600">{vol?.membershipNumber}</td>
                              <td className="p-3 text-neutral-800">{init ? init.name : "مبادرة تطوعية"}</td>
                              <td className="p-3 font-mono text-neutral-500">{a.date}</td>
                              <td className="p-3">
                                <div className="space-y-1 font-mono text-[10px]">
                                  <div className="text-emerald-700">✓ دخول: {a.timestamp ? new Date(a.timestamp).toLocaleTimeString("ar-SA") : "16:00"}</div>
                                  <div className="text-amber-700">
                                    ⏱ انصراف: {a.checkoutTimestamp ? new Date(a.checkoutTimestamp).toLocaleTimeString("ar-SA") : "قيد العمل الميداني"}
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 font-mono text-neutral-600">{a.durationMinutes ? `${Math.round(a.durationMinutes / 60)} ساعة` : "غير محدد"}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                  a.status === 'full' ? 'bg-emerald-100 text-emerald-800' :
                                  a.status === 'late' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {a.status === 'full' ? 'حضور كامل (+3)' :
                                   a.status === 'late' ? 'حضور متأخر (+2)' :
                                   a.status === 'excused' ? 'عذر مقبول (+1)' : 'غياب بدون عذر (-2)'}
                                </span>
                              </td>
                              <td className="p-3 text-[10px] text-neutral-500 space-y-1">
                                <div className={a.wearingVest ? "text-emerald-600" : "text-neutral-400"}>👕 السديري: {a.wearingVest ? "ملتزم ✓" : "غير ملتزم ✗"}</div>
                                <div className={a.badgePresent !== false ? "text-emerald-600" : "text-neutral-400"}>🪪 البطاقة: {a.badgePresent !== false ? "موجودة ✓" : "مفقودة ✗"}</div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={8} className="p-12 text-center text-neutral-400">لا توجد سجلات مطابقة للبحث أو الفلترة.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

        {/* 4. NOTIFICATIONS & CIRCULARS */}
        {activeTab === 'notifications' && (
          <form onSubmit={handleBroadcastSubmit} className="space-y-4">
            <div>
              <h3 className="text-xs font-black text-neutral-800 uppercase tracking-wider">بث وإصدار التعاميم الجماعية العاجلة</h3>
              <p className="text-[11px] text-neutral-500">أرسل رسالة فورية جماعية لكافة الأعضاء المسجلين تحت إدارتك وتوجيههم للمواقع الميدانية.</p>
            </div>

            {broadcastSuccess && (
              <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-600" />
                <strong>تم إرسال ونشر التعميم الجماعي لكافة أعضاء فريقك ({teamMembers.length}) بنجاح! ✓</strong>
              </div>
            )}

            <div className="space-y-1.5 text-xs">
              <label className="text-neutral-500 font-bold block">نص التعميم المراد بثه:</label>
              <textarea
                required
                rows={4}
                value={broadcastText}
                onChange={(e) => setBroadcastText(e.target.value)}
                placeholder="السلام عليكم يا أبطال العطاء، نذكركم غداً بالتواجد بموقع المبادرة في تمام الساعة 16:30 بالتوقيت المحلي مرتديين الزي المعتمد لجمعية ريادة العطاء لخدمة الإنسان بالعسيلة..."
                className="w-full border border-neutral-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-emerald-500/20 resize-none bg-neutral-50/50"
              />
            </div>

            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <Send className="w-4 h-4 rotate-180" />
              <span>بث وإرسال التعميم الآن</span>
            </button>
          </form>
        )}

        {/* 5. LEADER PROFILE */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-black text-neutral-800 uppercase tracking-wider">بيانات قائد الفريق الرسمية</h3>
              <p className="text-[11px] text-neutral-500">تفاصيل الاعتماد الإداري والوظيفي بجمعية ريادة العطاء لخدمة الإنسان بالعسيلة</p>
            </div>

            {/* Leader Official Card (Requirement 18) */}
            <div className="space-y-3">
              <VolunteerProfileCardSection
                volunteer={{
                  id: `leader-${currentTeam.id}`,
                  name: currentTeam.leaderName || "قائد الفريق",
                  email: "leader@riadataleata.org.sa",
                  phone: "0555123456",
                  nationalId: "1098765432",
                  membershipNumber: `LDR-${currentTeam.id.toUpperCase()}`,
                  departmentId: currentDepartment.id,
                  teamId: currentTeam.id,
                  hours: 180,
                  initiativesCount: 15,
                  status: "active",
                  joinDate: "2026-01-10",
                  issueDate: "2026-01-10",
                  expiryDate: "2027-01-10",
                  barcode: `LDR${currentTeam.id}2026`,
                  points: 600,
                  bloodType: "A+",
                  nationality: "سعودي",
                  jobTitle: `قائد فريق ${currentTeam.nameAr}`,
                  titleAr: `قائد فريق ${currentTeam.nameAr}`,
                  photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80"
                }}
                category="leader"
                teams={[currentTeam]}
                departments={[currentDepartment]}
                title={`بطاقة قائد الفريق الرسمية: ${currentTeam.leaderName} (${currentTeam.nameAr})`}
              />
            </div>

            <div className="bg-neutral-50/50 p-5 rounded-2xl border border-neutral-100 space-y-4 max-w-2xl">
              <div className="flex items-center gap-3 pb-3 border-b border-neutral-150">
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white font-black text-lg flex items-center justify-center">
                  س
                </div>
                <div>
                  <h4 className="text-xs font-black text-neutral-800">{currentTeam.leaderName}</h4>
                  <span className="text-[10px] text-emerald-700 font-bold block">قائد فريق: {currentTeam.nameAr}</span>
                </div>
              </div>

              <div className="space-y-2 text-xs font-medium text-neutral-600">
                <div className="flex justify-between">
                  <span>اسم قائد الفريق:</span>
                  <strong className="text-neutral-900">{currentTeam.leaderName}</strong>
                </div>
                <div className="flex justify-between">
                  <span>اسم الفريق:</span>
                  <strong className="text-emerald-800 font-bold">{currentTeam.nameAr}</strong>
                </div>
                <div className="flex justify-between">
                  <span>تاريخ التكليف:</span>
                  <strong className="text-neutral-900 font-mono">2026-01-10</strong>
                </div>
                <div className="flex justify-between">
                  <span>الإدارة التابعة:</span>
                  <strong className="text-neutral-900">{currentDepartment.nameAr}</strong>
                </div>
                <div className="flex justify-between">
                  <span>البريد الإلكتروني للعمل:</span>
                  <strong className="text-neutral-900 font-mono">leader@riadataleata.org.sa</strong>
                </div>
                <div className="flex justify-between">
                  <span>الصفة الإشرافية:</span>
                  <strong className="text-neutral-900">ترخيص إدارة الفرق الميدانية بالعسيلة بمكة</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 6. TEAM STAFF & ROLES ASSIGNMENT */}
        {activeTab === 'staff' && (
          <TeamStaffManager
            currentTeam={currentTeam}
            currentDepartment={currentDepartment}
            employees={employees}
            teamStaffAssignments={teamStaffAssignments}
            currentLeaderName={currentTeam.leaderName || "قائد الفريق"}
            onAssignStaff={onAssignTeamStaff || (async () => false)}
            onRemoveStaff={onRemoveTeamStaff || (async () => false)}
          />
        )}

        {/* 7. TEAM CARDS MANAGEMENT (LEADER RBAC) */}
        {activeTab === 'cards' && (
          <div className="space-y-6">
            {/* If Leader clicked to edit template visually */}
            {isEditingTemplate && teamTemplate ? (
              <CardTemplateEditor
                template={teamTemplate}
                onSave={handleSaveTeamTemplate}
                onCancel={() => setIsEditingTemplate(false)}
                teams={teams}
                isLeaderMode={true}
                leaderTeamId={currentTeam.id}
                performerName={currentTeam.leaderName || "قائد الفريق"}
                titleOverride={`محرر بطاقات فريق ${currentTeam.nameAr}`}
              />
            ) : (
              <div className="space-y-6 animate-fadeIn">
                
                {/* Header & Status Alert */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-neutral-200 shadow-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                        <CreditCard className="w-5 h-5 text-emerald-600" />
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-neutral-900">
                        إدارة بطاقات متطوعي فريق: {currentTeam.nameAr}
                      </h3>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      بصفتك قائداً للفريق، يمكنك تعديل تصميم قالب البطاقة بالسحب والإفلات، وإصدار البطاقات لجميع أعضاء فريقك فورياً.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Visual Editor Button */}
                    <button
                      type="button"
                      onClick={() => setIsEditingTemplate(true)}
                      className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>تعديل تصميم قالب الفريق</span>
                    </button>

                    {/* Bulk Generate Button */}
                    <button
                      type="button"
                      onClick={handleBulkIssueTeamCards}
                      disabled={isBulkIssuing || teamMembers.length === 0}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                    >
                      <RefreshCw className={`w-4 h-4 ${isBulkIssuing ? 'animate-spin' : ''}`} />
                      <span>{isBulkIssuing ? "جارٍ الإصدار..." : "إصدار بطاقات الفريق آلياً"}</span>
                    </button>
                  </div>
                </div>

                {/* Alerts */}
                {cardSuccessMessage && (
                  <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl text-xs text-emerald-900 font-bold flex items-center gap-2 animate-fadeIn">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>{cardSuccessMessage}</span>
                  </div>
                )}
                {cardErrorMessage && (
                  <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl text-xs text-rose-900 font-bold flex items-center gap-2 animate-fadeIn">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>{cardErrorMessage}</span>
                  </div>
                )}

                {/* Template Summary Card */}
                <div className="bg-white rounded-3xl border border-neutral-200 shadow-xs p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {teamTemplate?.backgroundUrl ? (
                      <div className="w-24 h-16 rounded-xl border border-neutral-200 overflow-hidden shadow-xs shrink-0 bg-neutral-100">
                        <img 
                          src={teamTemplate.backgroundUrl} 
                          alt="قالب الفريق" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div className="w-24 h-16 rounded-xl border-2 border-dashed border-neutral-300 flex items-center justify-center text-neutral-400 shrink-0">
                        <CreditCard className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          القالب المعتمد للفريق
                        </span>
                        <h4 className="text-sm font-black text-neutral-900">
                          {teamTemplate?.name || `قالب بطاقات ${currentTeam.nameAr}`}
                        </h4>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        يحتوي على {teamTemplate?.elements?.filter(e => e.visible).length || 8} حقلاً مرئياً (صورة، اسم، هوية، باركود، QR التحقق، وغيرها).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      type="button"
                      onClick={() => setIsEditingTemplate(true)}
                      className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4 text-emerald-600" />
                      <span>تخصيص الحقول بالسحب والإفلات</span>
                    </button>
                  </div>
                </div>

                {/* Team Members Cards Section */}
                <div className="bg-white rounded-3xl border border-neutral-200 shadow-xs p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
                    <div>
                      <h4 className="text-sm font-black text-neutral-800">
                        بطاقات أعضاء الفريق ({teamMembers.length})
                      </h4>
                      <p className="text-xs text-neutral-500">
                        استعراض بطاقات المتطوعين، طباعتها أو تحميلها كصورة عالية الدقة.
                      </p>
                    </div>

                    {/* Search Field */}
                    <div className="relative w-full sm:w-64">
                      <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-2.5" />
                      <input
                        type="text"
                        value={memberCardSearch}
                        onChange={(e) => setMemberCardSearch(e.target.value)}
                        placeholder="ابحث بالاسم أو الهوية..."
                        className="w-full pr-9 pl-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-800 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* Members Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {teamMembers
                      .filter(m => !memberCardSearch || m.name.includes(memberCardSearch) || m.nationalId?.includes(memberCardSearch))
                      .map((member) => {
                        const hasIssuedCard = !!(member.issuedCardId || (member as any).activeCardId);
                        return (
                          <div 
                            key={member.id} 
                            className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50/50 hover:bg-white hover:border-emerald-300 transition-all flex flex-col justify-between space-y-3 shadow-2xs"
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={member.photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop"}
                                alt={member.name}
                                className="w-12 h-12 rounded-full object-cover border border-neutral-200 shrink-0"
                                referrerPolicy="no-referrer"
                              />
                              <div className="min-w-0 flex-1">
                                <h5 className="text-xs font-black text-neutral-900 truncate">{member.name}</h5>
                                <div className="text-[11px] text-neutral-500 flex items-center gap-2 mt-0.5">
                                  <span>الهوية: {member.nationalId || "غير مسجلة"}</span>
                                </div>
                                <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                  hasIssuedCard 
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                                    : "bg-amber-50 text-amber-800 border-amber-200"
                                }`}>
                                  {hasIssuedCard ? "✓ البطاقة جاهزة" : "بانتظار الإصدار"}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
                              <button
                                type="button"
                                onClick={() => setSelectedVolunteerForCard(member)}
                                className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>عرض البطاقة</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {teamMembers.length === 0 && (
                    <div className="text-center py-10 text-neutral-400">
                      <Users className="w-10 h-10 mx-auto mb-2 text-neutral-300" />
                      <p className="font-bold text-xs">لا يوجد متطوعين مسجلين في هذا الفريق حتى الآن</p>
                    </div>
                  )}

                </div>

              </div>
            )}
          </div>
        )}

      </div>

      {/* POPUP MODAL: VIEW VOLUNTEER CARD */}
      {selectedVolunteerForCard && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fadeIn no-print" dir="rtl">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 text-right border border-neutral-200 shadow-2xl space-y-4 animate-scaleUp">
            
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-black text-neutral-900">
                    بطاقة المتطوع: {selectedVolunteerForCard.name}
                  </h3>
                  <span className="text-[11px] text-neutral-500">
                    فريق {currentTeam.nameAr} - جمعية ريادة العطاء
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedVolunteerForCard(null)}
                className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Rendered Card */}
            <div className="flex justify-center py-4 bg-neutral-50 rounded-2xl border border-neutral-200 overflow-hidden">
              <CardRenderer
                volunteer={selectedVolunteerForCard}
                template={teamTemplate || undefined}
                teams={teams}
                departments={[currentDepartment]}
                showControls={true}
                scale={0.85}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setSelectedVolunteerForCard(null)}
                className="px-5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs rounded-xl cursor-pointer"
              >
                إغلاق
              </button>
            </div>

          </div>
        </div>
      )}

      {/* RE-USABLE POPUP TO EDIT ATTENDANCE RECORD (Modify Status & Vest Check) */}
      {editingAttendanceRecord && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in no-print">
          <form 
            onSubmit={handleSaveManualStatusEdit}
            className="bg-white rounded-2xl max-w-md w-full p-6 text-right border border-neutral-100 shadow-xl space-y-4 animate-scale-up" 
            dir="rtl"
          >
            <div className="flex items-center gap-2 text-emerald-600">
              <Edit3 className="w-6 h-6" />
              <h3 className="text-md font-black text-neutral-800">تعديل تفاصيل وحالة حضور المتطوع</h3>
            </div>
            
            <p className="text-xs text-neutral-500 leading-relaxed">
              تقوم الآن بتعديل حالة حضور العضو لتحديث صحيفة نقاطه وسجله الميداني المعتمد.
            </p>

            <div className="space-y-1.5 text-xs">
              <label className="text-neutral-400 font-bold">الحالة وصحيفة النقاط الجديدة:</label>
              <select
                required
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as any)}
                className="w-full border border-neutral-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="full">حضور كامل (+3 نقاط لصحيفة العضوية)</option>
                <option value="late">حضور متأخر (+2 نقاط لصحيفة العضوية)</option>
                <option value="excused">عذر مقبول (+1 نقطة لصحيفة العضوية)</option>
                <option value="unexcused">غياب بدون عذر (-2 نقاط من الرصيد)</option>
              </select>
            </div>

            <div className="bg-emerald-50/40 p-3 rounded-lg flex items-center justify-between text-xs border border-emerald-100/40">
              <strong className="text-neutral-700">التزم بارتداء السديري الرسمي والبطاقة؟</strong>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editWearingVest}
                  onChange={(e) => setEditWearingVest(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 bg-neutral-100 border-neutral-300 rounded-sm focus:ring-emerald-500 cursor-pointer"
                />
                <span>ملتزم بالزي الرسمي</span>
              </label>
            </div>

            <div className="flex gap-2 pt-3">
              <button
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-lg cursor-pointer"
              >
                حفظ التعديلات
              </button>
              <button
                type="button"
                onClick={() => setEditingAttendanceRecord(null)}
                className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs py-2.5 rounded-lg cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TRANSFER TEAM MODAL */}
      {selectedReqForTransfer && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in no-print">
          <form 
            onSubmit={handleTransferSubmit}
            className="bg-white rounded-2xl max-w-md w-full p-6 text-right border border-neutral-100 shadow-xl space-y-4 animate-scale-up" 
            dir="rtl"
          >
            <div className="flex items-center gap-2 text-emerald-600">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-md font-black text-neutral-800">نقل المتطوع لفريق تطوعي آخر</h3>
            </div>
            
            <p className="text-xs text-neutral-500 leading-relaxed">
              تقوم الآن بنقل المتطوع <strong className="text-neutral-800">{selectedReqForTransfer.volunteerName}</strong> إلى فريق تطوعي مختلف وتأكيد قبوله الفوري للمشاركة بالمبادرة.
            </p>

            <div className="space-y-1 text-xs">
              <label className="text-neutral-400 font-bold">الفريق المستهدف لنقله إليه:</label>
              <select
                required
                value={transferTeamId}
                onChange={(e) => setTransferTeamId(e.target.value)}
                className="w-full border border-neutral-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500/20"
              >
                {teams.filter(t => t.id !== currentTeam.id).map(t => (
                  <option key={t.id} value={t.id}>{t.nameAr}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-3">
              <button
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-lg cursor-pointer"
              >
                تأكيد النقل والقبول
              </button>
              <button
                type="button"
                onClick={() => setSelectedReqForTransfer(null)}
                className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs py-2.5 rounded-lg cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE / EDIT OPPORTUNITY MODAL FOR LEADER */}
      {showAddOppModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in no-print overflow-y-auto">
          <form 
            onSubmit={handleCreateOpportunitySubmit}
            className="bg-white rounded-2xl max-w-2xl w-full p-6 text-right border border-neutral-100 shadow-2xl space-y-4 my-8 animate-scale-up" 
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-700">
                <FileText className="w-6 h-6" />
                <div>
                  <h3 className="text-md font-black text-neutral-800">
                    {editingOpp ? "تعديل الفرصة التطوعية وإعادة إرسالها" : "إنشاء فرصة تطوعية"}
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    {editingOpp 
                      ? "قم بتعديل بيانات الفرصة واستيفاء ملاحظات إدارة التطوع ثم أعد إرسالها" 
                      : `أضف فرصة تطوعية جديدة لفريقك (${currentTeam.nameAr}) لتتم مراجعتها من قِبل إدارة التطوع`}
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setShowAddOppModal(false);
                  setEditingOpp(null);
                  setOppModalError(null);
                }}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editingOpp && editingOpp.correctionNotes && (
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-blue-800">
                  <ShieldAlert className="w-4 h-4" />
                  ملاحظات إدارة التطوع المطلوب تعديلها:
                </span>
                <p className="text-[11.5px] leading-relaxed bg-white/70 p-2.5 rounded-lg border border-blue-100">
                  {editingOpp.correctionNotes}
                </p>
              </div>
            )}

            {oppModalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{oppModalError}</span>
              </div>
            )}

            <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">اسم/عنوان الفرصة *</label>
                <input
                  type="text"
                  required
                  placeholder="أدخل اسم الفرصة التطوعية..."
                  value={oppTitle}
                  onChange={(e) => setOppTitle(e.target.value)}
                  className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">نوع الفرصة *</label>
                  <select
                    value={oppType}
                    onChange={(e) => setOppType(e.target.value)}
                    className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold"
                  >
                    <option value="فرصة عادية">فرصة عادية</option>
                    <option value="فعالية تطوعية">فعالية تطوعية</option>
                    <option value="مبادرة مستمرة">مبادرة مستمرة</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">مجال الفرصة *</label>
                  <select
                    value={oppDomain}
                    onChange={(e) => setOppDomain(e.target.value)}
                    className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold"
                  >
                    <option value="إداري">إداري</option>
                    <option value="صحي">صحي</option>
                    <option value="إغاثي">إغاثي</option>
                    <option value="بيئي">بيئي</option>
                    <option value="اجتماعي">اجتماعي</option>
                    <option value="تقني">تقني</option>
                    <option value="تعليمي">تعليمي</option>
                    <option value="ثقافي">ثقافي</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">عدد المتطوعين المطلوب *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={oppNeededCount}
                    onChange={(e) => setOppNeededCount(Number(e.target.value))}
                    className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">مكان الفرصة</label>
                <input
                  type="text"
                  placeholder="مثال: مكتب السنين - الرياض / العسيلة - مكة"
                  value={oppPlace}
                  onChange={(e) => setOppPlace(e.target.value)}
                  className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
              </div>

              <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100 space-y-2">
                <span className="text-xs font-black text-emerald-900 block">أهداف المبادرة</span>
                <div>
                  <label className="text-[11px] font-bold text-neutral-600 block mb-0.5">الهدف الأول *</label>
                  <input
                    type="text"
                    required
                    placeholder="أدخل الهدف الأول..."
                    value={oppGoal1}
                    onChange={(e) => setOppGoal1(e.target.value)}
                    className="w-full border border-neutral-200 bg-white rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-neutral-600 block mb-0.5">الهدف الثاني</label>
                  <input
                    type="text"
                    placeholder="أدخل الهدف الثاني..."
                    value={oppGoal2}
                    onChange={(e) => setOppGoal2(e.target.value)}
                    className="w-full border border-neutral-200 bg-white rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-neutral-600 block mb-0.5">الهدف الثالث</label>
                  <input
                    type="text"
                    placeholder="أدخل الهدف الثالث..."
                    value={oppGoal3}
                    onChange={(e) => setOppGoal3(e.target.value)}
                    className="w-full border border-neutral-200 bg-white rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1">تفاصيل إضافية / الوصف</label>
                <textarea
                  rows={3}
                  placeholder="اكتب وصفاً مفصلاً للفرصة التطوعية والمهام المطلوبة..."
                  value={oppDescription}
                  onChange={(e) => setOppDescription(e.target.value)}
                  className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none"
                />
              </div>

              <ImageUploadField
                label="صورة الفرصة التطوعية (رفع ملف مباشر)"
                description="ارفع صورة معبرة عن المبادرة أو الفرصة من جهازك مباشرة"
                value={oppImageUrl}
                onChange={(val) => setOppImageUrl(val)}
                previewAspect="video"
              />

              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-[11px] text-neutral-600 flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>ملاحظة: "معرف الفرصة" يتم تعيينه واعتماده حصراً من قِبل إدارة التطوع عند المراجعة والاعتماد.</span>
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-neutral-100">
              <button
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer transition-all shadow-xs"
              >
                {editingOpp ? "حفظ التعديلات وإعادة الإرسال للمراجعة ✓" : "إرسال الفرصة للمراجعة والاعتماد ✓"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddOppModal(false);
                  setEditingOpp(null);
                  setOppModalError(null);
                }}
                className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs py-2.5 rounded-xl cursor-pointer transition-all"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW OPPORTUNITY DETAIL MODAL FOR LEADER */}
      {viewingOppDetail && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in no-print overflow-y-auto">
          <div 
            className="bg-white rounded-2xl max-w-xl w-full p-6 text-right border border-neutral-100 shadow-2xl space-y-4 my-8 animate-scale-up" 
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                  viewingOppDetail.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
                  viewingOppDetail.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                  viewingOppDetail.status === 'returned' ? 'bg-blue-100 text-blue-800' :
                  viewingOppDetail.status === 'draft' ? 'bg-neutral-100 text-neutral-700' : 'bg-amber-100 text-amber-800'
                }`}>
                  {viewingOppDetail.status === 'accepted' ? '✓ مقبولة ومعتمدة' :
                   viewingOppDetail.status === 'rejected' ? '❌ مرفوضة' :
                   viewingOppDetail.status === 'returned' ? '⚠️ معادة للتصحيح' :
                   viewingOppDetail.status === 'draft' ? '📝 مسودة' : '⏳ قيد المراجعة'}
                </span>
                <span className="text-xs font-mono text-neutral-400">#{viewingOppDetail.id}</span>
              </div>
              <button 
                onClick={() => setViewingOppDetail(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs max-h-[65vh] overflow-y-auto pr-1">
              {viewingOppDetail.opportunityCode ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-emerald-700 font-bold block">معرف الفرصة المعتمد</span>
                    <span className="font-mono font-black text-emerald-800 text-sm">#{viewingOppDetail.opportunityCode}</span>
                  </div>
                  <span className="text-[10.5px] bg-emerald-200/70 text-emerald-900 font-bold px-2 py-0.5 rounded-md">
                    معتمد من إدارة التطوع ✓
                  </span>
                </div>
              ) : (
                <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center justify-between text-xs text-neutral-500">
                  <span>معرف الفرصة:</span>
                  <span className="font-bold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-md text-[11px]">
                    قيد التعيين من قِبل إدارة التطوع
                  </span>
                </div>
              )}

              {viewingOppDetail.imageUrl && (
                <div className="w-full h-40 rounded-xl overflow-hidden border border-neutral-100 bg-neutral-50">
                  <img 
                    src={viewingOppDetail.imageUrl} 
                    alt={viewingOppDetail.title} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer" 
                  />
                </div>
              )}

              <div>
                <h3 className="text-md font-black text-neutral-800">{viewingOppDetail.title}</h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  الفريق: <b>{viewingOppDetail.teamName}</b> • المجال: <b>{viewingOppDetail.domain}</b> • النوع: <b>{viewingOppDetail.opportunityType}</b>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                <div>👥 العدد المطلوب: <b className="font-mono">{viewingOppDetail.neededCount} متطوع</b></div>
                <div>📍 المكان: <b>{viewingOppDetail.place}</b></div>
                <div>📅 تاريخ البداية: <b className="font-mono">{viewingOppDetail.startDate || "تحددها إدارة التطوع"}</b></div>
                <div>📅 تاريخ الانتهاء: <b className="font-mono">{viewingOppDetail.endDate || "تحددها إدارة التطوع"}</b></div>
              </div>

              {viewingOppDetail.nationalPlatformUrl && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                  <span className="text-[10px] text-emerald-800 font-bold block">رابط المنصة الوطنية المرفوع من إدارة التطوع:</span>
                  <a 
                    href={viewingOppDetail.nationalPlatformUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-emerald-700 underline font-mono break-all flex items-center gap-1"
                  >
                    <span>{viewingOppDetail.nationalPlatformUrl}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                </div>
              )}

              {viewingOppDetail.goals && viewingOppDetail.goals.length > 0 && (
                <div className="space-y-1">
                  <span className="font-bold text-neutral-700 block">أهداف المبادرة:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-neutral-600 text-[11px]">
                    {viewingOppDetail.goals.map((g, idx) => (
                      <li key={idx}>{g}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <span className="font-bold text-neutral-700 block mb-0.5">الوصف والتفاصيل:</span>
                <p className="text-neutral-600 leading-relaxed bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                  {viewingOppDetail.description || "لا يوجد وصف إضافي."}
                </p>
              </div>

              {viewingOppDetail.rejectionReason && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 space-y-1">
                  <strong className="block text-xs font-bold flex items-center gap-1">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    سبب الرفض الصادر من إدارة التطوع:
                  </strong>
                  <p className="text-[11.5px] leading-relaxed bg-white/70 p-2 rounded-lg border border-rose-100">{viewingOppDetail.rejectionReason}</p>
                </div>
              )}

              {viewingOppDetail.correctionNotes && (
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 space-y-1">
                  <strong className="block text-xs font-bold flex items-center gap-1">
                    <ShieldAlert className="w-4 h-4 text-blue-600" />
                    ملاحظات التعديل والتصحيح:
                  </strong>
                  <p className="text-[11.5px] leading-relaxed bg-white/70 p-2 rounded-lg border border-blue-100">{viewingOppDetail.correctionNotes}</p>
                </div>
              )}

              {/* Review History / Audit Trail for Leader */}
              {viewingOppDetail.reviewHistory && viewingOppDetail.reviewHistory.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-neutral-150">
                  <span className="font-bold text-neutral-800 text-xs block">سجل الإجراءات والمراجعة:</span>
                  <div className="border border-neutral-200 rounded-xl overflow-hidden divide-y divide-neutral-100 bg-neutral-50/60">
                    {viewingOppDetail.reviewHistory.map((log) => (
                      <div key={log.id} className="p-2.5 text-[11px] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-neutral-800">
                            {log.action === 'created' ? '📝 إنشاء الفرصة' :
                             log.action === 'resubmitted' ? '🔄 إعادة إرسال بعد التعديل' :
                             log.action === 'accepted' ? '✓ اعتماد وقبول الفرصة' :
                             log.action === 'rejected' ? '❌ رفض الفرصة' :
                             log.action === 'returned' ? '⚠️ إعادة للتصحيح' : log.action}
                          </span>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            {new Date(log.timestamp).toLocaleString('ar-SA')}
                          </span>
                        </div>
                        <div className="text-[10.5px] text-neutral-500">
                          بواسطة: <span className="font-medium text-neutral-700">{log.performedByName}</span> ({log.performedByRole === 'admin' ? 'إدارة التطوع' : 'قائد الفريق'})
                        </div>
                        {log.notes && (
                          <div className="text-[10.5px] text-neutral-600 bg-white p-1.5 rounded border border-neutral-150 mt-1">
                            {log.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
              {viewingOppDetail.status === 'returned' ? (
                <button
                  onClick={() => {
                    const opp = viewingOppDetail;
                    setViewingOppDetail(null);
                    handleOpenEditOppModal(opp);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>تعديل الفرصة الآن</span>
                </button>
              ) : <div />}

              <button
                onClick={() => setViewingOppDetail(null)}
                className="bg-neutral-800 text-white font-bold text-xs px-5 py-2 rounded-xl cursor-pointer hover:bg-neutral-900 transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GENERATE PDF ATTENDANCE & RATINGS REPORT MODAL FOR LEADER */}
      {showPdfReportModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
          <div 
            className="bg-white rounded-2xl max-w-4xl w-full p-6 text-right border border-neutral-100 shadow-2xl space-y-4 my-8 animate-scale-up" 
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3 no-print">
              <div className="flex items-center gap-2 text-emerald-700">
                <Printer className="w-6 h-6" />
                <div>
                  <h3 className="text-md font-black text-neutral-800">تقرير قائمة الحضور والتقييمات الميدانية (PDF)</h3>
                  <p className="text-[11px] text-neutral-500">تقرير رسمي مخصص للإرسال إلى إدارة التطوع بجمعية ريادة العطاء لخدمة الإنسان بالعسيلة</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة / حفظ PDF</span>
                </button>
                <button 
                  onClick={() => setShowPdfReportModal(false)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Sheet */}
            <div className="p-8 border border-neutral-200 rounded-2xl bg-white space-y-6 text-neutral-900 print:border-none print:p-0">
              {/* Header with Association & Team Logo */}
              <div className="flex justify-between items-center border-b-2 border-emerald-600 pb-4">
                <div className="space-y-1">
                  <h2 className="text-base font-black text-emerald-950">جمعية ريادة العطاء لخدمة الإنسان بالعسيلة</h2>
                  <p className="text-xs text-neutral-600">إدارة التطوع • تقرير تقييمات وحضور فريق: <strong className="text-emerald-800">{currentTeam.nameAr}</strong></p>
                  <p className="text-[11px] text-neutral-400">قائد الفريق: {currentTeam.leaderName} • القسم: {currentDepartment.nameAr}</p>
                </div>

                <div className="text-left font-mono text-[11px] text-neutral-500 space-y-1">
                  <div>تاريخ التقرير: <b>{new Date().toLocaleDateString('ar-SA')}</b></div>
                  <div>رمز التقرير: <b>REP-{currentTeam.id}-{Date.now().toString().slice(-4)}</b></div>
                  <div className="text-emerald-700 font-bold">الحالة: معتمد إدارياً ✓</div>
                </div>
              </div>

              {/* Attendance & Evaluations Summary Table */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-neutral-800 uppercase tracking-wider">سجل الحضور والمتوسط العام للتقييمات الميدانية</h3>
                
                <table className="w-full text-right text-xs border border-neutral-200 border-collapse">
                  <thead className="bg-emerald-50 text-emerald-950 font-bold border-b border-neutral-200">
                    <tr>
                      <th className="p-2.5 border border-neutral-200">#</th>
                      <th className="p-2.5 border border-neutral-200">اسم المتطوع</th>
                      <th className="p-2.5 border border-neutral-200">رقم الهوية/العضوية</th>
                      <th className="p-2.5 border border-neutral-200">المبادرة</th>
                      <th className="p-2.5 border border-neutral-200">حالة الحضور والزي</th>
                      <th className="p-2.5 border border-neutral-200 text-center">متوسط التقييم</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {teamMembers.map((vol, idx) => {
                      const att = attendanceRecords.find(a => a.volunteerId === vol.id);
                      const evals = evaluations.filter(e => e.volunteerId === vol.id);
                      const avgRating = evals.length > 0
                        ? (evals.reduce((acc, c) => acc + (c.commitment + c.ethics + c.cooperation + c.discipline + c.interaction + c.taskExecution) / 6, 0) / evals.length).toFixed(1)
                        : "5.0";
                      const init = initiatives.find(i => i.id === att?.initiativeId);

                      return (
                        <tr key={vol.id} className="hover:bg-neutral-50 font-medium">
                          <td className="p-2.5 border border-neutral-200 font-mono text-center">{idx + 1}</td>
                          <td className="p-2.5 border border-neutral-200 font-bold text-neutral-900">{vol.name}</td>
                          <td className="p-2.5 border border-neutral-200 font-mono text-neutral-600">{vol.membershipNumber}</td>
                          <td className="p-2.5 border border-neutral-200 text-neutral-700">{init ? init.name : "مبادرة إدارية ميدانية"}</td>
                          <td className="p-2.5 border border-neutral-200">
                            <span className="text-[11px] text-emerald-800 font-bold">
                              {att?.status === 'full' ? 'حضور كامل ✓' : att?.status === 'late' ? 'متأخر' : 'حاضر'}
                              {att?.wearingVest ? ' (ملتزم بالزي)' : ''}
                            </span>
                          </td>
                          <td className="p-2.5 border border-neutral-200 text-center font-bold text-emerald-800 font-mono">
                            ★ {avgRating} / 5
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Signature footer */}
              <div className="pt-8 flex justify-between items-end text-xs font-bold text-neutral-800">
                <div className="text-center space-y-8">
                  <div>توقيع قائد الفريق:</div>
                  <div className="font-mono text-neutral-400">..............................</div>
                </div>
                <div className="text-center space-y-8">
                  <div>اعتماد إدارة التطوع:</div>
                  <div className="font-mono text-emerald-700 font-black">جمعية ريادة العطاء لخدمة الإنسان بالعسيلة - موثق ✓</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OFFICIAL SEND LETTER MODAL FOR LEADER */}
      <SendLetterModal
        isOpen={isLetterModalOpen}
        onClose={() => setIsLetterModalOpen(false)}
        defaultSenderType="قائد"
        currentUser={{
          id: currentTeam.id,
          name: currentTeam.leaderName,
          role: "leader",
          phone: currentTeam.leaderPhone,
          email: currentTeam.leaderEmail,
          teamId: currentTeam.id,
          teamName: currentTeam.nameAr,
          jobTitle: `قائد ${currentTeam.nameAr}`
        }}
        onSubmitLetter={async (letterData) => {
          if (onSubmitOfficialLetter) {
            return await onSubmitOfficialLetter(letterData);
          }
          return { success: false, message: "تعذر إرسال الخطاب" };
        }}
      />

    </div>
  );
};
