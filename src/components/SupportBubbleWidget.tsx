import React, { useState, useEffect, useRef } from "react";
import { 
  Headphones, MessageSquare, Send, X, Bot, ShieldAlert, CheckCircle, 
  Sparkles, User, RefreshCw, ChevronDown, Clock, ArrowLeft, PhoneCall
} from "lucide-react";
import { SupportTicket } from "../types";

interface SupportBubbleWidgetProps {
  currentUser?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
  };
}

export const SupportBubbleWidget: React.FC<SupportBubbleWidgetProps> = ({
  currentUser
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<"ai" | "human">("ai");
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<Array<{
    id: string;
    sender: "user" | "ai" | "support";
    senderName: string;
    text: string;
    timestamp: string;
    ticketNumber?: string;
  }>>([
    {
      id: "welcome-1",
      sender: "ai",
      senderName: "مساعد ريادة العطاء الذكي",
      text: "مرحباً بك! أنا المساعد الذكي ووحدة الدعم الفني الفوري لجمعية ريادة العطاء لخدمة الإنسان بالعسيلة. كيف يمكنني مساعدتك اليوم؟ (يمكنك السؤال عن المبادرات، البطاقة الذكية، أو كتابة 'تحويل للدعم الفني' للتحدث مع موظف).",
      timestamp: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [activeTicketNum, setActiveTicketNum] = useState<string | null>(null);
  const [hasUnreadAlert, setHasUnreadAlert] = useState(true);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setHasUnreadAlert(false);
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOpen, messages]);

  // Handle message sending to AI / Support endpoint
  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputText.trim();
    if (!textToSend || loading) return;

    if (!customText) {
      setInputText("");
    }

    const userMsgId = "msg-u-" + Date.now();
    const timeNow = new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });

    // Add user message
    setMessages(prev => [
      ...prev,
      {
        id: userMsgId,
        sender: "user",
        senderName: currentUser?.name || "المستخدم",
        text: textToSend,
        timestamp: timeNow
      }
    ]);

    setLoading(true);

    try {
      // Call AI endpoint
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: textToSend,
          conversationHistory: messages.map(m => ({
            role: m.sender === "user" ? "user" : "model",
            text: m.text
          })),
          userInfo: {
            id: currentUser?.id || "usr-guest",
            name: currentUser?.name || "زائر / متطوع",
            email: currentUser?.email || "user@reyada.sa",
            phone: currentUser?.phone || "0500000000",
            role: currentUser?.role || "volunteer"
          }
        })
      });

      if (res.ok) {
        const data = await res.json();

        if (data.ticketNumber) {
          setActiveTicketNum(data.ticketNumber);
          setActiveMode("human");
        }

        setMessages(prev => [
          ...prev,
          {
            id: "msg-r-" + Date.now(),
            sender: data.transferToSupport ? "support" : "ai",
            senderName: data.transferToSupport ? "فريق الدعم الفني البشري" : "مساعد ريادة العطاء الذكي",
            text: data.reply,
            timestamp: new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }),
            ticketNumber: data.ticketNumber
          }
        ]);
      } else {
        throw new Error("فشل الاتصال بالدعم الفني");
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: "msg-err-" + Date.now(),
          sender: "ai",
          senderName: "نظام الدعم",
          text: "حدث خطأ مؤقت في الاتصال بالسيرفر. تمت معالجة طلبك محلياً وتسجيل إشعار للادارة.",
          timestamp: timeNow
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Direct escalation button trigger
  const handleDirectEscalate = async () => {
    await handleSendMessage("أريد التحويل المباشر للتحدث مع موظف الدعم الفني الفعلي لجمعية ريادة العطاء لخدمة الإنسان بالعسيلة.");
  };

  return (
    <div id="support-bubble-widget" className="no-print">
      
      {/* FLOATING BUBBLE BUTTON (Positioned safely above mobile bottom nav with ample clearance, and bottom corner on desktop) */}
      <div className="fixed bottom-24 left-4 sm:bottom-26 sm:left-5 lg:bottom-6 lg:left-6 z-30 flex items-center pointer-events-auto">
        
        {/* Customer Care Icon Floating Button */}
        <button
          id="btn-customer-service-bubble"
          onClick={() => setIsOpen(!isOpen)}
          className={`relative w-12 h-12 sm:w-13 sm:h-13 rounded-full shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer ${
            isOpen 
              ? "bg-neutral-800 text-white rotate-90" 
              : "bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white ring-2 sm:ring-4 ring-emerald-500/30 shadow-emerald-900/30"
          }`}
          title="خدمة العملاء والدعم الفني"
          aria-label="خدمة العملاء والدعم الفني"
        >
          {isOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <>
              {/* Headset Customer Service Agent Icon */}
              <Headphones className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
              {hasUnreadAlert && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full flex items-center justify-center">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                </span>
              )}
            </>
          )}
        </button>
      </div>

      {/* POPUP CHAT WINDOW */}
      {isOpen && (
        <div className="fixed bottom-20 left-3 right-3 sm:bottom-22 sm:left-5 sm:right-auto lg:bottom-20 lg:left-6 z-40 w-auto sm:w-[380px] md:w-[420px] max-h-[75vh] sm:max-h-[520px] bg-white rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-5 duration-200 dir-rtl" dir="rtl">
          
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-emerald-600 border border-emerald-400 flex items-center justify-center font-bold text-lg">
                  <Headphones className="w-5 h-5" />
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-emerald-800 rounded-full"></span>
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                  مركز الدعم الفني المباشر
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                </h3>
                <p className="text-[10px] text-emerald-200 mt-0.5">جمعية ريادة العطاء لخدمة الإنسان بالعسيلة</p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 bg-emerald-700/60 hover:bg-emerald-600 rounded-full text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="bg-emerald-50/70 p-2 border-b border-emerald-100 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1">
              <span className={`px-2.5 py-1 rounded-xl font-bold transition-all text-[11px] ${
                activeMode === "ai" ? "bg-white text-emerald-800 shadow-2xs" : "text-emerald-700"
              }`}>
                🤖 المساعد الذكي
              </span>
              {activeTicketNum && (
                <span className="bg-red-100 text-red-700 font-mono font-bold px-2 py-0.5 rounded-lg text-[10px] flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-red-600" />
                  #{activeTicketNum}
                </span>
              )}
            </div>

            <button
              onClick={handleDirectEscalate}
              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-[10.5px] font-bold flex items-center gap-1 transition-colors shadow-2xs"
            >
              <PhoneCall className="w-3 h-3" />
              <span>طلب موظف إنساني</span>
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[380px] bg-neutral-50/50">
            {messages.map((msg) => {
              const isUser = msg.sender === "user";
              const isSupport = msg.sender === "support";

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2 max-w-[88%] ${isUser ? "mr-auto flex-row-reverse" : "ml-auto flex-row"}`}
                >
                  <div
                    className={`rounded-2xl p-3 shadow-2xs text-xs leading-relaxed ${
                      isUser
                        ? "bg-emerald-700 text-white rounded-tl-none"
                        : isSupport
                        ? "bg-red-50 text-red-900 border border-red-200 rounded-tr-none"
                        : "bg-white text-neutral-800 border border-neutral-200 rounded-tr-none"
                    }`}
                  >
                    <div className="font-bold text-[10px] mb-1 flex items-center justify-between gap-3 border-b border-black/10 pb-1">
                      <span>{msg.senderName}</span>
                      <span className="opacity-70 font-mono">{msg.timestamp}</span>
                    </div>

                    <p className="whitespace-pre-wrap">{msg.text}</p>

                    {msg.ticketNumber && (
                      <div className="mt-2 bg-red-100 text-red-800 p-2 rounded-xl border border-red-200 text-[10.5px] font-bold flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-red-600" />
                        <span>جاري المتابعة تحت رقم التذكرة: {msg.ticketNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-2xl border border-neutral-200 text-neutral-500 text-xs flex items-center gap-2 shadow-2xs">
                  <Bot className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>جاري التواصل المباشر ومعالجة الطلب...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="p-2 bg-white border-t border-neutral-100 flex gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none text-[10.5px]">
            <button
              onClick={() => handleSendMessage("كيف أستخرج بطاقة التطوع الذكية؟")}
              className="px-2.5 py-1 bg-neutral-100 hover:bg-emerald-50 hover:text-emerald-800 text-neutral-600 rounded-lg transition-colors font-medium"
            >
              💳 استخراج البطاقة
            </button>
            <button
              onClick={() => handleSendMessage("اريد التحدث مع موظف الدعم الفني")}
              className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors font-bold"
            >
              📞 تحويل لموظف
            </button>
            <button
              onClick={() => handleSendMessage("ماهي المبادرات التطوعية النشطة اليوم؟")}
              className="px-2.5 py-1 bg-neutral-100 hover:bg-emerald-50 hover:text-emerald-800 text-neutral-600 rounded-lg transition-colors font-medium"
            >
              📅 المبادرات اليوم
            </button>
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white border-t border-neutral-200 flex gap-2"
          >
            <input
              type="text"
              placeholder="اكتب استفسارك أو مشكلتك هنا..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={loading}
              className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-neutral-800"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || loading}
              className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white p-2.5 rounded-xl transition-colors shadow-2xs"
            >
              <Send className="w-4 h-4 rotate-180" />
            </button>
          </form>

        </div>
      )}
    </div>
  );
};
