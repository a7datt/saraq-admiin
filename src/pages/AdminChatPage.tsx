import React, { useState, useEffect, useRef, useCallback } from "react";
import { uploadImage } from "../utils/uploadImage";
import {
  ArrowRight,
  User,
  Crown,
  Lock,
  Send,
  Image as ImageIcon,
  X,
  Star,
  MessageSquare,
  CheckCheck,
} from "lucide-react";
import { showToast } from "../components/ToastContainer";
import { showConfirm } from "../components/CustomDialogContainer";
import OptimizedImage from "../components/OptimizedImage";

export interface AdminChatPageProps {
  selectedChatUser: any;
  setSelectedChatUser: (val: any) => void;
  adminFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

interface Message {
  id: number | string;
  sender_role: "user" | "admin";
  content: string;
  image_url?: string;
  type?: string;
  created_at: string;
}

const AdminChatPage: React.FC<AdminChatPageProps> = ({
  selectedChatUser,
  setSelectedChatUser,
  adminFetch,
}) => {
  const [chatList, setChatList] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const listPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const fetchChatList = useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin/chat/list", {
        headers: { "x-admin-token": localStorage.getItem("adminToken") || "" },
      });
      if (!res.ok) return;
      const data = await res.json();
      setChatList((prev) => {
        const prevStr = JSON.stringify(prev.map((c) => ({ id: c.id, unread: c.unread_count, last: c.last_message })));
        const newStr = JSON.stringify((Array.isArray(data) ? data : []).map((c: any) => ({ id: c.id, unread: c.unread_count, last: c.last_message })));
        if (prevStr === newStr) return prev;
        return Array.isArray(data) ? data : [];
      });
    } catch {}
  }, [adminFetch]);

  const fetchMessages = useCallback(
    async (userId: any, isGuest: boolean) => {
      try {
        const res = await adminFetch(
          `/api/admin/chat/messages/${userId}${isGuest ? "?guest=true" : ""}`
        );
        if (!res.ok) return;
        const data = await res.json();
        const msgs: Message[] = Array.isArray(data) ? data : [];
        setMessages((prev) => {
          const prevIds = prev.map((m) => m.id).join(",");
          const newIds = msgs.map((m) => m.id).join(",");
          if (prevIds === newIds) return prev;
          return msgs;
        });

        // mark read silently
        adminFetch("/api/admin/chat/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            [isGuest ? "guestId" : "userId"]: userId,
          }),
        }).catch(() => {});
      } catch {}
    },
    [adminFetch]
  );

  // List polling
  useEffect(() => {
    fetchChatList();
    listPollRef.current = setInterval(fetchChatList, 5000);
    return () => {
      if (listPollRef.current) clearInterval(listPollRef.current);
    };
  }, [fetchChatList]);

  // Message polling when a user is selected
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!selectedChatUser) {
      setMessages([]);
      return;
    }
    fetchMessages(selectedChatUser.id, selectedChatUser.is_guest);
    pollRef.current = setInterval(
      () => fetchMessages(selectedChatUser.id, selectedChatUser.is_guest),
      3000
    );
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedChatUser?.id, selectedChatUser?.is_guest]);

  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages.length]);

  const handleSendReply = useCallback(
    async (content?: string, imageUrl?: string, type = "text") => {
      if (!selectedChatUser) return;
      if (!content && !imageUrl && type === "text") return;

      const tempId = `temp_${Date.now()}`;
      const tempMsg: Message = {
        id: tempId,
        sender_role: "admin",
        content: content || "",
        image_url: imageUrl,
        type,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempMsg]);
      setReply("");
      setShowOptions(false);
      setSending(true);
      setIsTyping(true);

      try {
        const res = await adminFetch("/api/admin/chat/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-token": localStorage.getItem("adminToken") || "",
          },
          body: JSON.stringify({
            userId: selectedChatUser.is_guest ? null : selectedChatUser.id,
            guestId: selectedChatUser.is_guest ? selectedChatUser.id : null,
            message: content || "",
            imageUrl: imageUrl || "",
            type,
          }),
        });

        if (res.ok) {
          await new Promise((r) => setTimeout(r, 400));
          setIsTyping(false);
          await fetchMessages(selectedChatUser.id, selectedChatUser.is_guest);
          fetchChatList();
        } else {
          setIsTyping(false);
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
          showToast("فشل الإرسال", "error");
        }
      } catch {
        setIsTyping(false);
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        showToast("فشل الإرسال", "error");
      } finally {
        setSending(false);
      }
    },
    [selectedChatUser, fetchMessages, fetchChatList]
  );

  const handleToggleBlock = (userId: number, currentBlocked: boolean) => {
    showConfirm(
      `هل تريد ${currentBlocked ? "إلغاء حظر" : "حظر"} هذا المستخدم؟`,
      currentBlocked ? "إلغاء الحظر" : "حظر المستخدم",
      async () => {
        const res = await adminFetch("/api/admin/chat/block", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, blocked: !currentBlocked }),
        });
        if (res.ok) {
          if (selectedChatUser?.id === userId) {
            setSelectedChatUser({
              ...selectedChatUser,
              chat_blocked: !currentBlocked,
            });
          }
          fetchChatList();
        }
      },
      false
    );
  };

  const formatTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  // ───────── Chat View ─────────
  if (selectedChatUser) {
    return (
      <div
        className="fixed inset-0 bottom-16 z-[60] flex flex-col bg-[#F0F2F5]"
      >
        {/* Header */}
        <div className="bg-white flex items-center justify-between px-4 py-3 shadow-sm border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedChatUser(null)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ArrowRight size={18} className="text-gray-600" />
            </button>
            <div className="w-10 h-10 bg-gray-100 rounded-full overflow-hidden border border-gray-200 shrink-0">
              {selectedChatUser.avatar_url ? (
                <OptimizedImage
                  src={selectedChatUser.avatar_url}
                  width={80}
                  height={80}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <User size={20} />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-bold text-sm text-gray-800">
                  {selectedChatUser.name}
                </h4>
                {selectedChatUser.is_vip && (
                  <span className="vip-badge scale-75 origin-right">
                    <Crown size={8} />
                    VIP
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-400 font-bold">
                ID: #{selectedChatUser.id}
              </p>
            </div>
          </div>
          {!selectedChatUser.is_guest && (
            <button
              onClick={() =>
                handleToggleBlock(
                  selectedChatUser.id,
                  selectedChatUser.chat_blocked
                )
              }
              className={`p-2 rounded-lg transition-all active:scale-90 ${
                selectedChatUser.chat_blocked
                  ? "bg-blue-50 text-blue-600"
                  : "bg-red-50 text-red-600"
              }`}
            >
              <Lock size={18} />
            </button>
          )}
        </div>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto px-3 py-4 space-y-2"
          style={{ overscrollBehavior: "contain" }}
        >
          {messages.map((m) => {
            const isAdmin = m.sender_role === "admin";
            const isTemp = String(m.id).startsWith("temp_");

            return (
              <div
                key={m.id}
                className={`flex ${isAdmin ? "justify-start" : "justify-end"} items-end gap-2`}
              >
                {isAdmin && (
                  <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 mb-1">
                    <User size={14} />
                  </div>
                )}

                <div
                  className={`
                    max-w-[78%] px-3 py-2 rounded-2xl shadow-sm
                    ${isAdmin
                      ? "bg-[var(--brand)] text-white rounded-bl-sm"
                      : "bg-white text-gray-800 rounded-br-sm"
                    }
                    ${isTemp ? "opacity-70" : "opacity-100"}
                  `}
                  style={{ transition: "opacity 0.2s" }}
                >
                  {m.image_url && (
                    <OptimizedImage
                      src={m.image_url}
                      width={320}
                      quality={80}
                      alt=""
                      className="rounded-xl mb-1.5 max-w-full max-h-64 object-contain"
                    />
                  )}
                  {m.content && (
                    <p className="text-sm font-medium leading-relaxed break-words">
                      {m.content}
                    </p>
                  )}
                  <div
                    className={`flex items-center gap-1 mt-0.5 ${isAdmin ? "justify-end" : "justify-start"}`}
                  >
                    <span
                      className={`text-[10px] ${
                        isAdmin ? "text-white/60" : "text-gray-400"
                      }`}
                    >
                      {formatTime(m.created_at)}
                    </span>
                    {!isAdmin && !isTemp && (
                      <CheckCheck size={12} className="text-gray-400" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {/* ─── Typing Indicator ─── */}
          {isTyping && (
            <div className="flex justify-start items-end gap-2 animate-fade-in">
              <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <div className="bg-white text-gray-800 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-1.5">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Options panel */}
        {showOptions && (
          <div className="mx-3 mb-2 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/80">
              <span className="font-bold text-sm text-gray-700">خيارات</span>
              <button
                onClick={() => setShowOptions(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-3">
              <button
                onClick={() =>
                  handleSendReply(
                    "قيم تجربتك مع الدعم",
                    "",
                    "rating_request"
                  )
                }
                className="w-full p-3 bg-blue-50 text-[var(--brand)] rounded-xl text-sm font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Star size={16} />
                إرسال طلب تقييم
              </button>
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="bg-white border-t border-gray-100 px-3 py-2.5 flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowOptions((v) => !v)}
            className={`p-2 rounded-full transition-colors shrink-0 ${
              showOptions
                ? "bg-[var(--brand)] text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            <Star size={18} />
          </button>

          {/* image upload */}
          <label className="p-2 rounded-full bg-gray-100 text-gray-500 cursor-pointer hover:bg-gray-200 transition-colors shrink-0">
            <ImageIcon size={18} />
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploading(true);
                try {
                  const url = await uploadImage(file);
                  await handleSendReply("", url);
                } catch {
                  showToast("فشل رفع الصورة", "error");
                } finally {
                  setUploading(false);
                  e.target.value = "";
                }
              }}
              disabled={uploading}
            />
          </label>

          <input
            ref={inputRef}
            type="text"
            dir="rtl"
            placeholder="اكتب ردك..."
            className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand)]/30 transition-all min-w-0"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendReply(reply);
              }
            }}
            disabled={sending}
          />

          <button
            onClick={() => handleSendReply(reply)}
            disabled={sending || uploading || !reply.trim()}
            className="p-2.5 bg-[var(--brand)] text-white rounded-full shadow-sm disabled:opacity-40 active:scale-90 transition-all shrink-0"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
      </div>
    );
  }

  // ───────── Chat List View ─────────
  return (
    <div className="space-y-3">
      <h3 className="font-bold text-gray-800 text-lg">محادثات الدعم</h3>
      {chatList.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
          <p className="font-bold text-sm">لا توجد محادثات نشطة</p>
        </div>
      )}
      {chatList.map((chat) => (
        <button
          key={chat.id}
          onClick={() => setSelectedChatUser(chat)}
          className={`w-full p-4 rounded-2xl border shadow-sm flex items-center gap-3 text-right transition-all active:scale-[0.98] ${
            chat.is_guest
              ? "bg-red-50 border-red-100"
              : "bg-white border-gray-100"
          }`}
        >
          <div className="relative shrink-0">
            <div className="w-12 h-12 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
              {chat.avatar_url ? (
                <OptimizedImage
                  src={chat.avatar_url}
                  width={96}
                  height={96}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <User size={22} />
                </div>
              )}
            </div>
            {chat.unread_count > 0 && (
              <div className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[var(--brand)] text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white px-1">
                {chat.unread_count}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-bold text-gray-800 text-sm truncate">
                  {chat.name}
                </span>
                {chat.is_vip && (
                  <span className="vip-badge scale-75 origin-right shrink-0">
                    <Crown size={8} />
                    VIP
                  </span>
                )}
              </div>
              <span className="text-[10px] text-gray-400 shrink-0 mr-1">
                {chat.last_message_at
                  ? new Date(chat.last_message_at).toLocaleDateString("ar-EG")
                  : ""}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-gray-400 truncate flex-1">
                {chat.last_message || "بدأ محادثة جديدة"}
              </p>
              <span className="text-[9px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold shrink-0">
                #{chat.id}
              </span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

export default AdminChatPage;
