import React, { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, Send, Paperclip, Image, FileText, Video, Mic, Check, CheckCheck, 
  Search, Plus, Users, User, Phone, VideoIcon, MoreVertical, X, Circle, RefreshCw, Volume2, Download
} from "lucide-react";
import { ChatConversation, ChatMessage, VolunteerTeam, Volunteer } from "../types";

interface InternalChatPanelProps {
  currentUser: {
    id: string;
    name: string;
    role: string;
    avatar?: string;
  };
  teams?: VolunteerTeam[];
  volunteers?: Volunteer[];
}

export const InternalChatPanel: React.FC<InternalChatPanelProps> = ({
  currentUser,
  teams = [],
  volunteers = []
}) => {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Modal for new conversation
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatType, setNewChatType] = useState<"direct" | "group">("group");
  const [newChatName, setNewChatName] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([currentUser.id]);
  const [selectedTeamId, setSelectedTeamId] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recordingTimerRef = useRef<any>(null);

  // Load conversations on mount
  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/chat/conversations?userId=${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        if (data.length > 0 && !selectedConvId) {
          setSelectedConvId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load chat conversations", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [currentUser.id]);

  // Load messages when selected conversation changes
  const fetchMessages = async (convId: string) => {
    if (!convId) return;
    try {
      const res = await fetch(`/api/chat/messages/${convId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        // Mark as read
        await fetch("/api/chat/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId: convId, userId: currentUser.id })
        });
        // refresh unread count locally
        setConversations(prev => prev.map(c => c.id === convId ? { ...c, unreadCount: { ...c.unreadCount, [currentUser.id]: 0 } } : c));
      }
    } catch (err) {
      console.error("Failed to fetch messages", err);
    }
  };

  useEffect(() => {
    if (selectedConvId) {
      fetchMessages(selectedConvId);
    }
  }, [selectedConvId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Voice recording simulation
  const startRecording = () => {
    setIsRecording(true);
    setRecordingSeconds(0);
    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds(s => s + 1);
    }, 1000);
  };

  const stopAndSendRecording = async () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    const secs = recordingSeconds || 3;
    await sendMessage("audio", `تسجيل صوتي (${secs} ثانية)`, "صوتية_جديدة.mp3");
    setRecordingSeconds(0);
  };

  const cancelRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  // Send message API call
  const sendMessage = async (type: "text" | "image" | "file" | "audio" | "video" = "text", customContent?: string, fileName?: string) => {
    const textToSend = customContent || inputText.trim();
    if (!textToSend || !selectedConvId) return;

    if (type === "text") {
      setInputText("");
    }

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: selectedConvId,
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderAvatar: currentUser.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop",
          senderRole: currentUser.role,
          type,
          content: textToSend,
          fileName
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, data.message]);
        // update last message in conversation list
        setConversations(prev => prev.map(c => {
          if (c.id === selectedConvId) {
            return {
              ...c,
              lastMessage: textToSend,
              lastMessageTime: data.message.timestamp
            };
          }
          return c;
        }));
      }
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  // Create new conversation
  const handleCreateConversation = async () => {
    if (newChatType === "group" && !newChatName.trim()) {
      alert("يرجى إدخال اسم المجموعة");
      return;
    }

    let finalName = newChatName;
    if (newChatType === "direct") {
      const otherVol = volunteers.find(v => selectedParticipants.includes(v.id) && v.id !== currentUser.id);
      finalName = otherVol ? otherVol.name : "محادثة فردية";
    }

    const participantNames = volunteers
      .filter(v => selectedParticipants.includes(v.id))
      .map(v => v.name);

    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newChatType,
          name: finalName,
          participantIds: selectedParticipants,
          participantNames,
          teamId: selectedTeamId || undefined,
          avatar: newChatType === "group" 
            ? "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=120&h=120&fit=crop"
            : "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop"
        })
      });

      if (res.ok) {
        const data = await res.json();
        setConversations(prev => [data.conversation, ...prev.filter(c => c.id !== data.conversation.id)]);
        setSelectedConvId(data.conversation.id);
        setShowNewChatModal(false);
        setNewChatName("");
      }
    } catch (err) {
      console.error("Failed to create conversation", err);
    }
  };

  const selectedConv = conversations.find(c => c.id === selectedConvId);

  const filteredConversations = conversations.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="internal-chat-panel" className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden flex flex-col md:flex-row h-[720px]">
      
      {/* Sidebar - Chat List */}
      <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-l border-gray-200 bg-gray-50/50 flex flex-col">
        {/* Header */}
        <div className="p-4 bg-emerald-800 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-lg border border-emerald-600">
              💬
            </div>
            <div>
              <h2 className="font-bold text-base leading-tight">الدردشة الداخلية</h2>
              <p className="text-xs text-emerald-200">التواصل المباشر للإداريين والمشرفين</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewChatModal(true)}
              className="p-2 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-white transition-colors"
              title="إنشاء محادثة جديدة"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button
              onClick={fetchConversations}
              className="p-2 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-white transition-colors"
              title="تحديث قائمة المحادثات"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-gray-200 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="البحث في المحادثات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-2 text-sm bg-gray-100 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 text-gray-800"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              لا توجد محادثات حالياً. انقر على (+) لبدء محادثة.
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const unread = conv.unreadCount?.[currentUser.id] || 0;
              const isSelected = conv.id === selectedConvId;

              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConvId(conv.id)}
                  className={`p-3 cursor-pointer flex items-center gap-3 transition-colors ${
                    isSelected ? "bg-emerald-50 border-r-4 border-emerald-600" : "hover:bg-gray-100/80"
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={conv.avatar || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=120&h=120&fit=crop"}
                      alt={conv.name}
                      className="w-12 h-12 rounded-full object-cover border border-gray-200"
                    />
                    {conv.type === "group" && (
                      <span className="absolute -bottom-1 -left-1 bg-emerald-600 text-white rounded-full p-0.5 border border-white">
                        <Users className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-sm text-gray-900 truncate">{conv.name}</h3>
                      <span className="text-[11px] text-gray-400">
                        {conv.lastMessageTime ? new Date(conv.lastMessageTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500 truncate">{conv.lastMessage}</p>
                      {unread > 0 && (
                        <span className="bg-emerald-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                          {unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#e5ddd5]/20 relative">
        {selectedConv ? (
          <>
            {/* Active Conversation Header */}
            <div className="p-3 bg-white border-b border-gray-200 flex items-center justify-between shadow-sm z-10">
              <div className="flex items-center gap-3">
                <img
                  src={selectedConv.avatar || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=120&h=120&fit=crop"}
                  alt={selectedConv.name}
                  className="w-10 h-10 rounded-full object-cover border border-emerald-500"
                />
                <div>
                  <h3 className="font-bold text-gray-900 text-sm leading-tight">{selectedConv.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                    <span>متصل الآن</span>
                    {selectedConv.type === "group" && (
                      <span className="text-gray-400 mr-2">
                        • {selectedConv.participantNames?.join("، ")}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-gray-600">
                <button className="p-2 hover:bg-gray-100 rounded-full text-gray-500" title="اتصال فرضي">
                  <Phone className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-full text-gray-500" title="مكالمة فيديو">
                  <VideoIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Messages Feed */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]">
              {messages.length === 0 ? (
                <div className="text-center my-auto py-12">
                  <div className="inline-flex p-4 rounded-full bg-emerald-100 text-emerald-800 mb-2">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">لا توجد رسائل سابقة في هذه المحادثة.</p>
                  <p className="text-xs text-gray-400 mt-1">ابدأ بدعم زملائك وإرسال التعليمات الميدانية.</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === currentUser.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2 max-w-[80%] ${isMe ? "mr-auto flex-row-reverse" : "ml-auto flex-row"}`}
                    >
                      {!isMe && (
                        <img
                          src={msg.senderAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop"}
                          alt={msg.senderName}
                          className="w-8 h-8 rounded-full object-cover border border-gray-200 mt-1"
                        />
                      )}

                      <div
                        className={`rounded-2xl p-3 shadow-sm relative text-sm ${
                          isMe
                            ? "bg-emerald-700 text-white rounded-tl-none"
                            : "bg-white text-gray-800 border border-gray-100 rounded-tr-none"
                        }`}
                      >
                        {!isMe && (
                          <div className="font-bold text-xs text-emerald-700 mb-1">
                            {msg.senderName} <span className="text-[10px] font-normal text-gray-400">({msg.senderRole})</span>
                          </div>
                        )}

                        {/* Content based on type */}
                        {msg.type === "image" ? (
                          <div className="space-y-1">
                            <img
                              src={msg.content}
                              alt="مرفق صورة"
                              className="rounded-xl max-h-60 w-full object-cover border border-emerald-800/20"
                            />
                            {msg.fileName && <p className="text-xs opacity-80 mt-1">{msg.fileName}</p>}
                          </div>
                        ) : msg.type === "file" ? (
                          <div className="flex items-center gap-3 bg-black/10 p-2.5 rounded-xl">
                            <FileText className="w-8 h-8 text-emerald-400" />
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-xs truncate">{msg.fileName || "مستند مرفق.pdf"}</p>
                              <p className="text-[10px] opacity-75">{msg.content}</p>
                            </div>
                            <a
                              href={msg.content}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                        ) : msg.type === "audio" ? (
                          <div className="flex items-center gap-3 bg-emerald-900/20 p-2 rounded-xl min-w-[200px]">
                            <button className="p-2 bg-emerald-600 text-white rounded-full">
                              <Volume2 className="w-4 h-4" />
                            </button>
                            <div className="flex-1">
                              <div className="h-1 bg-emerald-300/40 rounded-full w-full overflow-hidden">
                                <div className="h-full bg-emerald-500 w-2/3"></div>
                              </div>
                              <p className="text-[10px] opacity-80 mt-1">{msg.content}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        )}

                        {/* Time & Read Ticks */}
                        <div className={`flex items-center gap-1 justify-end text-[10px] mt-1.5 ${isMe ? "text-emerald-100" : "text-gray-400"}`}>
                          <span>
                            {new Date(msg.timestamp).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {isMe && (
                            msg.status === "read" ? (
                              <CheckCheck className="w-3.5 h-3.5 text-blue-300" />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-emerald-200" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Toolbar */}
            <div className="p-3 bg-white border-t border-gray-200">
              {isRecording ? (
                <div className="flex items-center justify-between bg-red-50 text-red-700 p-3 rounded-2xl border border-red-200 animate-pulse">
                  <div className="flex items-center gap-2">
                    <Mic className="w-5 h-5 text-red-600 animate-bounce" />
                    <span className="font-bold text-sm">جاري تسجيل مقطع صوتي...</span>
                    <span className="font-mono text-xs font-bold bg-red-100 px-2 py-0.5 rounded-full">
                      {recordingSeconds} ثانية
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={cancelRecording}
                      className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs rounded-xl font-bold"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={stopAndSendRecording}
                      className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-xl font-bold flex items-center gap-1 shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" /> إرسال التسجيل
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {/* Media Buttons */}
                  <div className="flex items-center gap-1 text-gray-500">
                    <button
                      onClick={() => sendMessage("image", "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&fit=crop", "صورة_ميدانية.jpg")}
                      className="p-2 hover:bg-gray-100 rounded-full text-emerald-700 transition-colors"
                      title="إرسال صورة"
                    >
                      <Image className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => sendMessage("file", "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", "تقرير_الفعالية_العسيلة.pdf")}
                      className="p-2 hover:bg-gray-100 rounded-full text-blue-600 transition-colors"
                      title="إرسال مستند (PDF, Word, Excel)"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                    <button
                      onClick={startRecording}
                      className="p-2 hover:bg-red-50 rounded-full text-red-600 transition-colors"
                      title="تسجيل صوتي"
                    >
                      <Mic className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Input Field */}
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage("text")}
                    placeholder="اكتب رسالتك هنا..."
                    className="flex-1 py-2.5 px-4 bg-gray-100 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 text-sm text-gray-800"
                  />

                  {/* Send Button */}
                  <button
                    onClick={() => sendMessage("text")}
                    disabled={!inputText.trim()}
                    className="p-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white rounded-2xl transition-colors shadow-md"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50">
            <div className="p-4 bg-emerald-100 text-emerald-800 rounded-full mb-3">
              <MessageSquare className="w-10 h-10" />
            </div>
            <h3 className="font-bold text-lg text-gray-800 mb-1">اختر محادثة من القائمة</h3>
            <p className="text-sm text-gray-500 max-w-sm">
              يمكنك بدء التواصل مع الفرق الميدانية والإدارية فوراً دون الحاجة لبرامج خارجية.
            </p>
          </div>
        )}
      </div>

      {/* Modal: New Chat / Group Creation */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowNewChatModal(false)}
              className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gray-600 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-600" /> إنشاء محادثة جديدة
            </h3>

            {/* Type selector */}
            <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-2xl mb-4">
              <button
                onClick={() => setNewChatType("group")}
                className={`py-2 text-xs font-bold rounded-xl transition-all ${
                  newChatType === "group" ? "bg-emerald-700 text-white shadow-sm" : "text-gray-600 hover:bg-gray-200"
                }`}
              >
                مجموعة (فريق / لجنة)
              </button>
              <button
                onClick={() => setNewChatType("direct")}
                className={`py-2 text-xs font-bold rounded-xl transition-all ${
                  newChatType === "direct" ? "bg-emerald-700 text-white shadow-sm" : "text-gray-600 hover:bg-gray-200"
                }`}
              >
                محادثة فردية
              </button>
            </div>

            {newChatType === "group" && (
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-700 mb-1">اسم المجموعة / الفريق</label>
                <input
                  type="text"
                  placeholder="مثال: لجنة التنظيم الميداني بمسجد العسيلة"
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                  className="w-full p-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}

            {/* Select Team or Members */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-700 mb-1">اختر الأعضاء المشاركين</label>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100 p-1 bg-gray-50">
                {volunteers.map(vol => {
                  const isChecked = selectedParticipants.includes(vol.id);
                  return (
                    <label
                      key={vol.id}
                      className="p-2 flex items-center justify-between hover:bg-white rounded-lg cursor-pointer text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <img
                          src={vol.photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop"}
                          alt={vol.name}
                          className="w-7 h-7 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-bold text-gray-800">{vol.name}</p>
                          <p className="text-[10px] text-gray-500">{vol.titleAr}</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedParticipants(prev => [...prev, vol.id]);
                          } else {
                            setSelectedParticipants(prev => prev.filter(id => id !== vol.id));
                          }
                        }}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCreateConversation}
                className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-sm shadow-md"
              >
                بدء المحادثة الآن
              </button>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-bold text-sm"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
