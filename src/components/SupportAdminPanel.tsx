import React, { useState, useEffect } from "react";
import { 
  Headphones, AlertCircle, CheckCircle, Clock, Search, Filter, MessageSquare, 
  UserCheck, ShieldAlert, Send, RefreshCw, FileText, ChevronLeft, ArrowRight, Tag, Lock,
  Plus, Users, CheckSquare, ListTodo, UserPlus, ArrowUpRight, RotateCcw, AlertTriangle,
  X, Check, Sparkles, Phone, Mail, Shield, User
} from "lucide-react";
import { SupportTicket, SupportTicketMessage, SupportAgent, SupportTask } from "../types";

interface SupportAdminPanelProps {
  currentUserRole?: "admin" | "supervisor" | "support";
  currentAgentName?: string;
}

export const SupportAdminPanel: React.FC<SupportAdminPanelProps> = ({
  currentUserRole = "admin",
  currentAgentName = "مهندس الدعم التقني - عبد الرحمن"
}) => {
  const [activeTab, setActiveTab] = useState<"tickets" | "tasks" | "agents">("tickets");

  // Tickets State
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [replyText, setReplyText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Tasks State
  const [tasks, setTasks] = useState<SupportTask[]>([]);
  const [taskSearchQuery, setTaskSearchQuery] = useState<string>("");
  const [taskFilterStatus, setTaskFilterStatus] = useState<string>("all");
  const [taskFilterPriority, setTaskFilterPriority] = useState<string>("all");
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [showTaskHistoryModal, setShowTaskHistoryModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<SupportTask | null>(null);

  // Agents State
  const [agents, setAgents] = useState<SupportAgent[]>([]);
  const [showAddAgentModal, setShowAddAgentModal] = useState(false);

  // Task Form State
  const [taskFormData, setTaskFormData] = useState({
    title: "",
    description: "",
    requesterName: "",
    requesterContact: "",
    requesterRole: "متطوع",
    assignedAgentId: "",
    priority: "medium" as SupportTask["priority"],
    dueDate: "",
    notes: "",
    ticketId: ""
  });

  // Agent Form State
  const [agentFormData, setAgentFormData] = useState({
    name: "",
    username: "",
    password: "123",
    email: "",
    phone: "",
    permissions: ["view_assigned_tasks", "reply_tickets", "close_tasks"]
  });

  // Reassign Task State
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignAgentId, setReassignAgentId] = useState("");
  const [reassignReason, setReassignReason] = useState("");

  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Fetch Tickets
  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/support/tickets");
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
        if (data.length > 0 && !selectedTicketId) {
          setSelectedTicketId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load support tickets", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Tasks
  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/support/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error("Failed to load support tasks", err);
    }
  };

  // Fetch Agents
  const fetchAgents = async () => {
    try {
      const res = await fetch("/api/support/agents");
      if (res.ok) {
        const data = await res.json();
        setAgents(data);
      }
    } catch (err) {
      console.error("Failed to load support agents", err);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchTasks();
    fetchAgents();
  }, []);

  const selectedTicket = tickets.find(t => t.id === selectedTicketId || t.ticketNumber === selectedTicketId);

  // Send reply from support agent
  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;

    try {
      const res = await fetch("/api/support/tickets/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: selectedTicket.id,
          senderType: "agent",
          senderName: currentAgentName,
          content: replyText.trim()
        })
      });

      if (res.ok) {
        const data = await res.json();
        setTickets(prev => prev.map(t => t.id === data.ticket.id ? data.ticket : t));
        setReplyText("");
      }
    } catch (err) {
      console.error("Failed to send reply", err);
    }
  };

  // Change ticket status
  const handleUpdateTicketStatus = async (status: "new" | "in_progress" | "pending_user" | "closed") => {
    if (!selectedTicket) return;

    try {
      const res = await fetch("/api/support/tickets/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: selectedTicket.id,
          status
        })
      });

      if (res.ok) {
        const data = await res.json();
        setTickets(prev => prev.map(t => t.id === data.ticket.id ? data.ticket : t));
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  // Create Task from scratch or from ticket
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskFormData.title.trim() || !taskFormData.assignedAgentId) {
      alert("يرجى كتابة عنوان المهمة واختيار الموظف المكلف.");
      return;
    }

    try {
      const res = await fetch("/api/support/tasks/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...taskFormData,
          creatorName: currentAgentName
        })
      });

      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
        setShowCreateTaskModal(false);
        setNotificationMsg("تم إنشاء وإسناد مهمة الدعم الفني بنجاح!");
        setTimeout(() => setNotificationMsg(null), 3000);
        fetchAgents();
        if (taskFormData.ticketId) {
          fetchTickets();
        }
        // Reset form
        setTaskFormData({
          title: "",
          description: "",
          requesterName: "",
          requesterContact: "",
          requesterRole: "متطوع",
          assignedAgentId: "",
          priority: "medium",
          dueDate: "",
          notes: "",
          ticketId: ""
        });
      }
    } catch (err) {
      console.error("Failed to create task", err);
    }
  };

  // Update Task Status
  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/support/tasks/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          status: newStatus,
          actorName: currentAgentName
        })
      });

      if (res.ok) {
        const data = await res.json();
        setTasks(prev => prev.map(t => t.id === taskId ? data.task : t));
        fetchAgents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Re-assign Task
  const handleReassignTask = async () => {
    if (!selectedTask || !reassignAgentId) return;

    try {
      const res = await fetch("/api/support/tasks/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: selectedTask.id,
          newAgentId: reassignAgentId,
          reassignerName: currentAgentName,
          reason: reassignReason
        })
      });

      if (res.ok) {
        const data = await res.json();
        setTasks(prev => prev.map(t => t.id === selectedTask.id ? data.task : t));
        setShowReassignModal(false);
        setSelectedTask(null);
        setNotificationMsg("تمت إعادة إسناد المهمة بنجاح!");
        setTimeout(() => setNotificationMsg(null), 3000);
        fetchAgents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add Support Agent
  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentFormData.name.trim() || !agentFormData.username.trim()) {
      alert("يرجى كتابة اسم الموظف واسم المستخدم.");
      return;
    }

    try {
      const res = await fetch("/api/support/agents/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(agentFormData)
      });

      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
        setShowAddAgentModal(false);
        setNotificationMsg("تمت إضافة موظف الدعم الفني بنجاح!");
        setTimeout(() => setNotificationMsg(null), 3000);
        setAgentFormData({
          name: "",
          username: "",
          password: "123",
          email: "",
          phone: "",
          permissions: ["view_assigned_tasks", "reply_tickets", "close_tasks"]
        });
      } else {
        const err = await res.json();
        alert(err.error || "تعذر إضافة الموظف.");
      }
    } catch (err) {
      console.error("Failed to add agent", err);
    }
  };

  // Toggle Agent Status
  const handleToggleAgentStatus = async (agentId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "active" ? "suspended" : "active";
    try {
      const res = await fetch("/api/support/agents/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          status: nextStatus
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAgents(prev => prev.map(a => a.id === agentId ? data.agent : a));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered tickets
  const filteredTickets = tickets.filter(t => {
    const matchesStatus = filterStatus === "all" || t.status === filterStatus;
    const matchesSearch = 
      t.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.requesterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Filtered tasks
  const filteredTasks = tasks.filter(t => {
    const matchesSearch = 
      t.taskNumber.toLowerCase().includes(taskSearchQuery.toLowerCase()) ||
      t.title.toLowerCase().includes(taskSearchQuery.toLowerCase()) ||
      t.requesterName.toLowerCase().includes(taskSearchQuery.toLowerCase()) ||
      t.assignedAgentName.toLowerCase().includes(taskSearchQuery.toLowerCase());
    const matchesStatus = taskFilterStatus === "all" || t.status === taskFilterStatus;
    const matchesPriority = taskFilterPriority === "all" || t.priority === taskFilterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Stats
  const totalTickets = tickets.length;
  const newTickets = tickets.filter(t => t.status === "new").length;
  const inProgressTickets = tickets.filter(t => t.status === "in_progress").length;
  const closedTickets = tickets.filter(t => t.status === "closed").length;

  const totalTasks = tasks.length;
  const pendingTasks = tasks.filter(t => t.status === "new" || t.status === "in_progress").length;
  const completedTasks = tasks.filter(t => t.status === "completed" || t.status === "closed").length;

  return (
    <div id="support-admin-panel" className="space-y-6 text-right font-sans" dir="rtl">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white rounded-3xl p-6 shadow-xl border border-emerald-700/50 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-emerald-700/60 rounded-2xl border border-emerald-500/30">
            <Headphones className="w-8 h-8 text-emerald-200" />
          </div>
          <div>
            <h1 className="text-xl font-bold">مركز الدعم الفني وإدارة المهام وتوزيع العمل</h1>
            <p className="text-xs text-emerald-200 mt-1">
              إدارة تذاكر التصعيد، تكليف موظفي الدعم بالمهام، ومتابعة سرعة الإنجاز ورضا المستفيدين
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchTickets();
              fetchTasks();
              fetchAgents();
            }}
            className="px-4 py-2.5 bg-emerald-700/80 hover:bg-emerald-600 rounded-xl font-bold text-xs flex items-center gap-2 border border-emerald-500/40 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>تحديث البيانات</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {notificationMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-bold animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("tickets")}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "tickets"
              ? "bg-emerald-700 text-white shadow-sm"
              : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>تذاكر الدعم الفني ({totalTickets})</span>
          {newTickets > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold animate-pulse">
              {newTickets} جديدة
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("tasks")}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "tasks"
              ? "bg-emerald-700 text-white shadow-sm"
              : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>مهام الدعم الفني وتوزيع العمل ({totalTasks})</span>
          {pendingTasks > 0 && (
            <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
              {pendingTasks} قيد التنفيذ
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("agents")}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "agents"
              ? "bg-emerald-700 text-white shadow-sm"
              : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>فريق وموظفو الدعم ({agents.length})</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: SUPPORT TICKETS & CHAT                                   */}
      {/* ============================================================== */}
      {activeTab === "tickets" && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500">إجمالي التذاكر</p>
                <p className="text-xl font-black text-gray-900 mt-1 font-mono">{totalTickets}</p>
              </div>
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <FileText className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500">تذاكر جديدة</p>
                <p className="text-xl font-black text-red-600 mt-1 font-mono">{newTickets}</p>
              </div>
              <div className="p-2.5 bg-red-50 text-red-600 rounded-xl">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500">قيد المعالجة</p>
                <p className="text-xl font-black text-amber-600 mt-1 font-mono">{inProgressTickets}</p>
              </div>
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500">تذاكر مغلقة</p>
                <p className="text-xl font-black text-emerald-600 mt-1 font-mono">{closedTickets}</p>
              </div>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Main Tickets Content: List & Details Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tickets List */}
            <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-200 shadow-2xs p-4 flex flex-col h-[650px]">
              <div className="space-y-3 mb-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute right-3 top-3" />
                  <input
                    type="text"
                    placeholder="ابحث برقم التذكرة أو اسم المستفيد..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pr-9 pl-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-800"
                  />
                </div>

                <div className="flex gap-1 overflow-x-auto pb-1 text-[11px]">
                  {["all", "new", "in_progress", "closed"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setFilterStatus(st)}
                      className={`px-3 py-1 rounded-lg font-bold shrink-0 transition-colors cursor-pointer ${
                        filterStatus === st
                          ? "bg-emerald-700 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {st === "all" ? "الكل" :
                       st === "new" ? "جديدة" :
                       st === "in_progress" ? "جارية" : "مغلقة"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tickets Scroll Area */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {filteredTickets.length > 0 ? (
                  filteredTickets.map((t) => {
                    const isSelected = t.id === selectedTicketId;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTicketId(t.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-emerald-50 border-emerald-500 shadow-xs"
                            : "bg-white hover:bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                            {t.ticketNumber}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            t.status === "new" ? "bg-red-100 text-red-700" :
                            t.status === "in_progress" ? "bg-amber-100 text-amber-700" :
                            "bg-emerald-100 text-emerald-700"
                          }`}>
                            {t.status === "new" ? "جديدة" :
                             t.status === "in_progress" ? "قيد المعالجة" : "مغلقة"}
                          </span>
                        </div>

                        <h4 className="font-bold text-xs text-gray-800 line-clamp-1 mb-1">{t.subject}</h4>
                        <div className="flex items-center justify-between text-[10px] text-gray-400">
                          <span>{t.requesterName} ({t.requesterType === 'volunteer' ? 'متطوع' : 'مستفيد'})</span>
                          <span>{new Date(t.createdAt).toLocaleDateString('ar-SA')}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-xs text-gray-400">لا توجد تذاكر تطابق البحث.</div>
                )}
              </div>
            </div>

            {/* Ticket Conversation & Actions */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-2xs flex flex-col h-[650px] overflow-hidden">
              {selectedTicket ? (
                <>
                  {/* Top Bar of Ticket */}
                  <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                          {selectedTicket.ticketNumber}
                        </span>
                        <h3 className="font-bold text-sm text-gray-800">{selectedTicket.subject}</h3>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        المستفيد: <b>{selectedTicket.requesterName}</b> • جوال: <span className="font-mono">{selectedTicket.requesterContact || "غير متوفر"}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Convert to Task Button */}
                      <button
                        onClick={() => {
                          setTaskFormData({
                            title: `معالجة تذكرة #${selectedTicket.ticketNumber}: ${selectedTicket.subject}`,
                            description: selectedTicket.messages[0]?.content || selectedTicket.subject,
                            requesterName: selectedTicket.requesterName,
                            requesterContact: selectedTicket.requesterContact || "",
                            requesterRole: selectedTicket.requesterType === "volunteer" ? "متطوع" : "مستفيد",
                            assignedAgentId: agents[0]?.id || "",
                            priority: selectedTicket.priority === "urgent" ? "urgent" : "medium",
                            dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
                            notes: `تم إنشاء المهمة من تذكرة الدعم #${selectedTicket.ticketNumber}`,
                            ticketId: selectedTicket.id
                          });
                          setShowCreateTaskModal(true);
                        }}
                        className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                        title="تحويل إلى مهمة دعم وتكليف موظف بها"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>تحويل لمهمة</span>
                      </button>

                      {/* Status selectors */}
                      <button
                        onClick={() => handleUpdateTicketStatus(selectedTicket.status === "closed" ? "in_progress" : "closed")}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                          selectedTicket.status === "closed"
                            ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                            : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs"
                        }`}
                      >
                        {selectedTicket.status === "closed" ? (
                          <>
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>إعادة فتح التذكرة</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>إغلاق التذكرة</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Messages Feed */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50/30">
                    {selectedTicket.messages.map((msg) => {
                      const isAgent = msg.senderType === "agent" || msg.senderType === "support_agent";
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isAgent ? "items-end" : "items-start"}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                              isAgent
                                ? "bg-emerald-700 text-white rounded-br-xs shadow-xs"
                                : "bg-white text-gray-800 border border-gray-200 rounded-bl-xs shadow-2xs"
                            }`}
                          >
                            <div className={`flex items-center justify-between gap-3 text-[10px] pb-1.5 mb-1.5 border-b ${
                              isAgent ? "border-emerald-600/60 text-emerald-100" : "border-gray-100 text-gray-400"
                            }`}>
                              <span className="font-bold">{msg.senderName}</span>
                              <span className="font-mono">{new Date(msg.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Reply Input Box */}
                  <div className="p-3 bg-white border-t border-gray-200">
                    <div className="flex gap-2">
                      <textarea
                        rows={2}
                        placeholder="اكتب رد الدعم الفني للمستفيد هنا..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        disabled={selectedTicket.status === "closed"}
                        className="flex-1 p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-800 resize-none disabled:opacity-50"
                      />
                      <button
                        onClick={handleSendReply}
                        disabled={!replyText.trim() || selectedTicket.status === "closed"}
                        className="px-5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-md transition-all cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        <span>إرسال</span>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
                  <Headphones className="w-12 h-12 text-emerald-600 mb-2 opacity-40" />
                  <h3 className="font-bold text-base text-gray-700">اختر تذكرة دعم فني لعرض تفاصيلها ومتابعتها</h3>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: SUPPORT TASKS & WORK DISTRIBUTION                        */}
      {/* ============================================================== */}
      {activeTab === "tasks" && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
            <div>
              <h3 className="font-black text-gray-900 text-sm">مهام الدعم الفني وتوزيع العمل</h3>
              <p className="text-[11px] text-gray-500">تكليف موظفي الدعم بالمهام ومتابعة حالتها والمواعيد المحددة</p>
            </div>

            <button
              onClick={() => {
                setTaskFormData({
                  title: "",
                  description: "",
                  requesterName: "",
                  requesterContact: "",
                  requesterRole: "متطوع",
                  assignedAgentId: agents[0]?.id || "",
                  priority: "medium",
                  dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
                  notes: "",
                  ticketId: ""
                });
                setShowCreateTaskModal(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl flex items-center gap-2 shadow-xs cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء وتكليف بمهمة جديدة</span>
            </button>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row items-center gap-3 bg-white p-3 rounded-2xl border border-gray-200">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder="ابحث برقم المهمة، العنوان، اسم المستفيد، أو الموظف المكلف..."
                value={taskSearchQuery}
                onChange={(e) => setTaskSearchQuery(e.target.value)}
                className="w-full pr-9 pl-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={taskFilterStatus}
                onChange={(e) => setTaskFilterStatus(e.target.value)}
                className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                <option value="all">جميع الحالات</option>
                <option value="new">جديدة</option>
                <option value="in_progress">قيد المعالجة</option>
                <option value="completed">مكتملة</option>
                <option value="closed">مغلقة</option>
              </select>

              <select
                value={taskFilterPriority}
                onChange={(e) => setTaskFilterPriority(e.target.value)}
                className="p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                <option value="all">جميع درجات الأولوية</option>
                <option value="critical">حرجة جداً</option>
                <option value="urgent">عاجلة</option>
                <option value="medium">متوسطة</option>
                <option value="low">منخفضة</option>
              </select>
            </div>
          </div>

          {/* Tasks Table */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
            <table className="w-full text-right text-xs">
              <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200">
                <tr>
                  <th className="p-3">رقم المهمة</th>
                  <th className="p-3">المهمة والتفاصيل</th>
                  <th className="p-3">الموظف المكلف</th>
                  <th className="p-3">صاحب الطلب</th>
                  <th className="p-3 text-center">الأولوية</th>
                  <th className="p-3 text-center">الحالة</th>
                  <th className="p-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTasks.length > 0 ? (
                  filteredTasks.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="p-3 font-mono font-bold text-gray-700">
                        <span className="bg-gray-100 px-2 py-0.5 rounded text-[11px]">{t.taskNumber}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-gray-900 block">{t.title}</span>
                        {t.description && (
                          <span className="text-[11px] text-gray-400 block max-w-sm truncate">{t.description}</span>
                        )}
                        {t.dueDate && (
                          <span className="text-[10px] text-amber-600 block mt-0.5">موعد الإنجاز: {t.dueDate}</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="font-bold text-gray-800">{t.assignedAgentName}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-gray-800 block">{t.requesterName}</span>
                        <span className="text-[10.5px] text-gray-400 font-mono block">{t.requesterContact || "-"}</span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          t.priority === "critical" ? "bg-red-100 text-red-800" :
                          t.priority === "urgent" ? "bg-amber-100 text-amber-800" :
                          t.priority === "medium" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-700"
                        }`}>
                          {t.priority === "critical" ? "حرجة" :
                           t.priority === "urgent" ? "عاجلة" :
                           t.priority === "medium" ? "متوسطة" : "عادية"}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <select
                          value={t.status}
                          onChange={(e) => handleUpdateTaskStatus(t.id, e.target.value)}
                          className={`text-[11px] font-bold px-2 py-1 rounded-lg border border-gray-200 cursor-pointer ${
                            t.status === "completed" || t.status === "closed"
                              ? "bg-emerald-50 text-emerald-800"
                              : t.status === "in_progress"
                              ? "bg-amber-50 text-amber-800"
                              : "bg-blue-50 text-blue-800"
                          }`}
                        >
                          <option value="new">جديدة</option>
                          <option value="in_progress">قيد المعالجة</option>
                          <option value="completed">مكتملة</option>
                          <option value="closed">مغلقة</option>
                        </select>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedTask(t);
                              setReassignAgentId(t.assignedAgentId);
                              setShowReassignModal(true);
                            }}
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-[10.5px] cursor-pointer"
                            title="إعادة إسناد لموظف آخر"
                          >
                            إسناد
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTask(t);
                              setShowTaskHistoryModal(true);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer"
                            title="سجل الحركات"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">لا توجد مهام مطابقة.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: SUPPORT AGENTS & TEAM                                    */}
      {/* ============================================================== */}
      {activeTab === "agents" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
            <div>
              <h3 className="font-black text-gray-900 text-sm">فريق وموظفو الدعم الفني</h3>
              <p className="text-[11px] text-gray-500">إدارة حسابات موظفي الدعم، صلاحياتهم، وعبء العمل الموزع عليهم</p>
            </div>

            <button
              onClick={() => setShowAddAgentModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl flex items-center gap-2 shadow-xs cursor-pointer transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة موظف دعم فني جديد</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <div key={agent.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-sm">
                    {agent.name.charAt(0)}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    agent.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                  }`}>
                    {agent.status === "active" ? "نشط" : "معلق"}
                  </span>
                </div>

                <div>
                  <h4 className="font-black text-gray-900 text-sm">{agent.name}</h4>
                  <span className="text-gray-400 font-mono text-[11px] block">@{agent.username}</span>
                </div>

                <div className="space-y-1 text-xs text-gray-500 border-t border-gray-100 pt-2 font-mono">
                  {agent.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <span>{agent.phone}</span>
                    </div>
                  )}
                  {agent.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      <span>{agent.email}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2.5 rounded-xl text-center font-mono">
                  <div>
                    <span className="text-[10px] text-gray-400 block font-sans">المهام الجارية</span>
                    <strong className="text-emerald-700 font-black">{agent.activeTasksCount || 0}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-sans">المهام المكتملة</span>
                    <strong className="text-gray-700 font-black">{agent.completedTasksCount || 0}</strong>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() => handleToggleAgentStatus(agent.id, agent.status)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                      agent.status === "active"
                        ? "bg-rose-50 hover:bg-rose-100 text-rose-700"
                        : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {agent.status === "active" ? "تعليق الحساب" : "تنشيط الحساب"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODALS                                                         */}
      {/* ============================================================== */}

      {/* Modal 1: Create Task */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-sm text-gray-900">إنشاء وتكليف مهمة دعم فني</h3>
              </div>
              <button onClick={() => setShowCreateTaskModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="font-bold text-gray-700 block mb-1">عنوان المهمة *</label>
                <input
                  type="text"
                  required
                  value={taskFormData.title}
                  onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                  placeholder="مثال: إصلاح خطأ استلام شهادة التطوع للمتطوع..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">تفاصيل ومحتوى المشكلة</label>
                <textarea
                  rows={3}
                  value={taskFormData.description}
                  onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                  placeholder="وصف الإجراء المطلوب من موظف الدعم..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">الموظف المكلف بالمهمة *</label>
                  <select
                    required
                    value={taskFormData.assignedAgentId}
                    onChange={(e) => setTaskFormData({ ...taskFormData, assignedAgentId: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  >
                    <option value="">اختر الموظف...</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.activeTasksCount || 0} مهام جارية)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">الأولوية</label>
                  <select
                    value={taskFormData.priority}
                    onChange={(e) => setTaskFormData({ ...taskFormData, priority: e.target.value as any })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  >
                    <option value="low">منخفضة</option>
                    <option value="medium">متوسطة</option>
                    <option value="urgent">عاجلة</option>
                    <option value="critical">حرجة وفورية</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">اسم صاحب الطلب / المستفيد</label>
                  <input
                    type="text"
                    value={taskFormData.requesterName}
                    onChange={(e) => setTaskFormData({ ...taskFormData, requesterName: e.target.value })}
                    placeholder="الاسم الكامل"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">رقم الاتصال</label>
                  <input
                    type="text"
                    value={taskFormData.requesterContact}
                    onChange={(e) => setTaskFormData({ ...taskFormData, requesterContact: e.target.value })}
                    placeholder="05XXXXXXXX"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">تاريخ استحقاق المهمة</label>
                  <input
                    type="date"
                    value={taskFormData.dueDate}
                    onChange={(e) => setTaskFormData({ ...taskFormData, dueDate: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">صفة صاحب الطلب</label>
                  <select
                    value={taskFormData.requesterRole}
                    onChange={(e) => setTaskFormData({ ...taskFormData, requesterRole: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                  >
                    <option value="متطوع">متطوع</option>
                    <option value="مستفيد">مستفيد رعاية</option>
                    <option value="موظف">موظف</option>
                    <option value="قائد فريق">قائد فريق</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl cursor-pointer"
                >
                  حفظ وتكليف الموظف فوراً
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateTaskModal(false)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Add Support Agent */}
      {showAddAgentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-sm text-gray-900">إضافة موظف دعم فني جديد</h3>
              </div>
              <button onClick={() => setShowAddAgentModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddAgent} className="space-y-3">
              <div>
                <label className="font-bold text-gray-700 block mb-1">اسم الموظف الكامل *</label>
                <input
                  type="text"
                  required
                  value={agentFormData.name}
                  onChange={(e) => setAgentFormData({ ...agentFormData, name: e.target.value })}
                  placeholder="مثال: م. فهد بن عبدالعزيز المطيري"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">اسم المستخدم لتسجيل الدخول *</label>
                <input
                  type="text"
                  required
                  value={agentFormData.username}
                  onChange={(e) => setAgentFormData({ ...agentFormData, username: e.target.value })}
                  placeholder="fahad.mutairi"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">كلمة المرور الافتراضية</label>
                <input
                  type="password"
                  value={agentFormData.password}
                  onChange={(e) => setAgentFormData({ ...agentFormData, password: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">رقم الجوال</label>
                  <input
                    type="text"
                    value={agentFormData.phone}
                    onChange={(e) => setAgentFormData({ ...agentFormData, phone: e.target.value })}
                    placeholder="05XXXXXXXX"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={agentFormData.email}
                    onChange={(e) => setAgentFormData({ ...agentFormData, email: e.target.value })}
                    placeholder="agent@example.com"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl cursor-pointer"
                >
                  حفظ وتفعيل الحساب
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddAgentModal(false)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Reassign Task */}
      {showReassignModal && selectedTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="font-black text-gray-900 text-sm">إعادة إسناد المهمة</h3>
              <button onClick={() => setShowReassignModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-gray-500">
              المهمة: <b>{selectedTask.title}</b> (المكلف حالياً: {selectedTask.assignedAgentName})
            </p>

            <div>
              <label className="font-bold text-gray-700 block mb-1">اختر الموظف الجديد المكلف بالمهمة:</label>
              <select
                value={reassignAgentId}
                onChange={(e) => setReassignAgentId(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
              >
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">سبب التحويل (اختياري):</label>
              <textarea
                rows={2}
                value={reassignReason}
                onChange={(e) => setReassignReason(e.target.value)}
                placeholder="توزيع أعباء العمل، التخصص التقني..."
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl resize-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleReassignTask}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer"
              >
                تأكيد الإسناد
              </button>
              <button
                onClick={() => setShowReassignModal(false)}
                className="px-3 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Task History Timeline */}
      {showTaskHistoryModal && selectedTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-sm text-gray-900">سجل حركات المهمة ({selectedTask.taskNumber})</h3>
              </div>
              <button onClick={() => setShowTaskHistoryModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto">
              {selectedTask.history && selectedTask.history.length > 0 ? (
                selectedTask.history.map((h, idx) => (
                  <div key={h.id || idx} className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900">{h.action}</span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {new Date(h.timestamp).toLocaleDateString('ar-SA')}
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-500 block">بواسطة: <b>{h.actor}</b></span>
                    {h.notes && <p className="text-[11px] text-gray-600 bg-white p-2 rounded-lg border border-gray-100">{h.notes}</p>}
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-gray-400">لا توجد حركات مسجلة.</div>
              )}
            </div>

            <button
              onClick={() => setShowTaskHistoryModal(false)}
              className="w-full py-2 bg-gray-100 text-gray-700 font-bold rounded-xl cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
