import React, { useState, useEffect, useRef } from "react";
import {
  ArrowRight,
  Plus,
  X,
  Trash2,
  Bot,
  MessageSquare,
  ChevronRight,
  CheckCircle,
  XCircle,
  Save,
  Power,
  PowerOff,
  Upload,
  FileText,
  Image as ImageIcon,
  Loader,
  Eye,
  EyeOff,
  AlertTriangle,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { showToast } from "../components/ToastContainer";
import { showConfirm } from "../components/CustomDialogContainer";

interface ChatSettingsPageProps {
  setView: (val: any) => void;
  adminFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

type ModalType = "choice" | "auto_reply" | "ai_config" | "min_messages" | null;

// قائمة النماذج الفعّالة حالياً لدى كل مزود (يونيو 2026).
// ملاحظة مهمة: نماذج قديمة كـ gpt-4o و gemini-1.5-* و claude-3-5-* تم سحبها أو
// إيقافها بالكامل من مزوّديها، واستخدامها يتسبب بعدم رد الذكاء الاصطناعي على
// المستخدمين بصمت تام. راجع وثائق كل مزود رسمياً قبل تحديث هذه القائمة.
const AVAILABLE_MODELS = [
  { id: "gpt-5.5", name: "GPT-5.5", provider: "openai", providerLabel: "OpenAI" },
  { id: "gpt-5.4", name: "GPT-5.4", provider: "openai", providerLabel: "OpenAI" },
  { id: "gpt-5.4-mini", name: "GPT-5.4 Mini", provider: "openai", providerLabel: "OpenAI" },
  { id: "gpt-5.4-nano", name: "GPT-5.4 Nano", provider: "openai", providerLabel: "OpenAI" },
  { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash", provider: "google", providerLabel: "Google" },
  { id: "gemini-3.1-pro", name: "Gemini 3.1 Pro", provider: "google", providerLabel: "Google" },
  { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash Lite", provider: "google", providerLabel: "Google" },
  { id: "claude-opus-4-8", name: "Claude Opus 4.8", provider: "anthropic", providerLabel: "Anthropic" },
  { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", provider: "anthropic", providerLabel: "Anthropic" },
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", provider: "anthropic", providerLabel: "Anthropic" },
];
const DEFAULT_MODEL = "gpt-5.4-mini";

const PROVIDER_GROUPS = [
  { key: "openai", label: "OpenAI" },
  { key: "google", label: "Google Gemini" },
  { key: "anthropic", label: "Anthropic Claude" },
];

export default function ChatSettingsPage({ setView, adminFetch }: ChatSettingsPageProps) {
  const [showModal, setShowModal] = useState<ModalType>(null);
  const [autoReplies, setAutoReplies] = useState<any[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(true);

  // Auto Reply form
  const triggerRef = useRef<HTMLInputElement>(null);
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const [isFaqChecked, setIsFaqChecked] = useState(false);
  const [savingReply, setSavingReply] = useState(false);

  // AI Config
  const [aiConfig, setAiConfig] = useState<any>(null);
  const [aiKey, setAiKey] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [aiModel, setAiModel] = useState(DEFAULT_MODEL);
  const [aiTrainingText, setAiTrainingText] = useState("");
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiFiles, setAiFiles] = useState<File[]>([]);
  const [savingAi, setSavingAi] = useState(false);
  const [togglingAi, setTogglingAi] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Min Messages
  const [minMsgNormal, setMinMsgNormal] = useState<number>(0);
  const [minMsgVip, setMinMsgVip] = useState<number>(0);
  const [loadingMinMsg, setLoadingMinMsg] = useState(false);
  const [savingMinMsg, setSavingMinMsg] = useState(false);

  const adminToken = localStorage.getItem("adminToken") || "";
  const isKnownModel = AVAILABLE_MODELS.some(m => m.id === aiModel);

  const fetchAutoReplies = async () => {
    try {
      const res = await adminFetch("/api/admin/auto-replies", {
        headers: { "x-admin-token": adminToken }
      });
      const data = await res.json();
      setAutoReplies(Array.isArray(data) ? data : []);
    } catch {
      showToast("تعذّر تحميل الردود التلقائية", 'error');
    } finally {
      setLoadingReplies(false);
    }
  };

  const fetchAiConfig = async () => {
    try {
      const res = await adminFetch("/api/admin/ai-config", {
        headers: { "x-admin-token": adminToken }
      });
      if (res.ok) {
        const data = await res.json();
        setAiConfig(data);
        setAiKey(data?.api_key || "");
        setKeyTouched(false);
        setAiModel(data?.model || DEFAULT_MODEL);
        setAiTrainingText(data?.training_text || "");
        setAiEnabled(data?.enabled || false);
      }
    } catch {
      showToast("تعذّر تحميل إعدادات الذكاء الاصطناعي", 'error');
    }
  };

  useEffect(() => {
    fetchAutoReplies();
    fetchAiConfig();
    fetchMinMessages();
  }, []);

  const fetchMinMessages = async () => {
    setLoadingMinMsg(true);
    try {
      const res = await adminFetch("/api/admin/chat-min-messages", {
        headers: { "x-admin-token": adminToken }
      });
      if (res.ok) {
        const data = await res.json();
        setMinMsgNormal(data?.normal ?? 0);
        setMinMsgVip(data?.vip ?? 0);
      }
    } catch {
      // silent
    } finally {
      setLoadingMinMsg(false);
    }
  };

  const handleSaveMinMessages = async () => {
    setSavingMinMsg(true);
    try {
      const res = await adminFetch("/api/admin/chat-min-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ normal: minMsgNormal, vip: minMsgVip })
      });
      if (res.ok) {
        showToast(<><CheckCircle size={16} className="inline mr-1" /> تم حفظ الحد الأدنى للرسائل</>, 'success');
        setShowModal(null);
      } else {
        showToast(<><XCircle size={16} className="inline mr-1" /> فشل الحفظ</>, 'error');
      }
    } catch {
      showToast("فشل الاتصال", 'error');
    } finally {
      setSavingMinMsg(false);
    }
  };

  const handleDeleteAutoReply = (id: number) => {
    showConfirm("هل تريد حذف هذا الرد التلقائي؟", "حذف الرد التلقائي", async () => {
      try {
        const res = await adminFetch(`/api/admin/auto-replies/${id}`, {
          method: "DELETE",
          headers: { "x-admin-token": adminToken }
        });
        if (res.ok) {
          setAutoReplies(prev => prev.filter((r: any) => r.id !== id));
          showToast(<><CheckCircle size={16} className="inline mr-1" /> تم الحذف</>, 'success');
        } else {
          showToast(<><XCircle size={16} className="inline mr-1" /> فشل الحذف</>, 'error');
        }
      } catch {
        showToast("فشل الاتصال", 'error');
      }
    }, true);
  };

  const handleSaveAutoReply = async () => {
    const trigger = triggerRef.current?.value?.trim() || "";
    const replyText = replyRef.current?.value?.trim() || "";
    if (!trigger || !replyText) return showToast("يرجى إدخال النص والرد", 'error');
    setSavingReply(true);
    try {
      const res = await adminFetch("/api/admin/auto-replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger_text: trigger, reply_text: replyText, is_faq: isFaqChecked })
      });
      if (res.ok) {
        if (triggerRef.current) triggerRef.current.value = "";
        if (replyRef.current) replyRef.current.value = "";
        setIsFaqChecked(false);
        fetchAutoReplies();
        setShowModal(null);
        showToast(<><CheckCircle size={16} className="inline mr-1" /> تم حفظ الرد التلقائي</>, 'success');
      } else {
        showToast(<><XCircle size={16} className="inline mr-1" /> فشل الحفظ</>, 'error');
      }
    } catch {
      showToast("فشل الاتصال", 'error');
    } finally {
      setSavingReply(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = Array.from(e.target.files || []);
    const allowed = files.filter(f =>
      f.type.startsWith("image/") ||
      f.name.endsWith(".md") ||
      f.name.endsWith(".txt")
    );
    if (allowed.length !== files.length) {
      showToast("يُسمح فقط بالصور وملفات .md و .txt", 'error');
    }
    setAiFiles(prev => [...prev, ...allowed]);
    e.target.value = "";
  };

  const readFilesAsText = async (files: File[]): Promise<string> => {
    const texts: string[] = [];
    for (const file of files) {
      if (file.type.startsWith("image/")) {
        texts.push(`[صورة مرفقة: ${file.name}]`);
      } else {
        const text = await file.text();
        texts.push(`--- محتوى ملف: ${file.name} ---\n${text}`);
      }
    }
    return texts.join("\n\n");
  };

  const handleSaveAiConfig = async () => {
    if (!aiKey.trim()) return showToast("يرجى إدخال مفتاح API", 'error');
    if (!aiModel) return showToast("يرجى اختيار النموذج", 'error');
    setSavingAi(true);
    try {
      let filesContent = "";
      if (aiFiles.length > 0) {
        filesContent = await readFilesAsText(aiFiles);
      }
      const combinedTraining = [aiTrainingText, filesContent].filter(Boolean).join("\n\n");
      const res = await adminFetch("/api/admin/ai-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // إذا لم يلمس الأدمن حقل المفتاح، لا نرسله أصلاً فيبقى المفتاح المحفوظ كما هو
          api_key: keyTouched ? aiKey : undefined,
          model: aiModel,
          training_text: combinedTraining,
          enabled: aiEnabled
        })
      });
      if (res.ok) {
        setAiFiles([]);
        await fetchAiConfig();
        setShowModal(null);
        showToast(<><CheckCircle size={16} className="inline mr-1" /> تم حفظ إعدادات الذكاء الاصطناعي</>, 'success');
      } else {
        showToast(<><XCircle size={16} className="inline mr-1" /> فشل الحفظ</>, 'error');
      }
    } catch {
      showToast("فشل الاتصال", 'error');
    } finally {
      setSavingAi(false);
    }
  };

  const handleToggleAi = async () => {
    setTogglingAi(true);
    try {
      const newEnabled = !aiEnabled;
      const res = await adminFetch("/api/admin/ai-config/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: newEnabled })
      });
      if (res.ok) {
        setAiEnabled(newEnabled);
        showToast(newEnabled ? "✅ تم تفعيل الذكاء الاصطناعي" : "⏸️ تم إيقاف الذكاء الاصطناعي", 'success');
      } else {
        showToast("فشل تغيير الحالة", 'error');
      }
    } catch {
      showToast("فشل الاتصال", 'error');
    } finally {
      setTogglingAi(false);
    }
  };

  return (
    <div className="px-4 space-y-5 pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={() => setView({ type: "main" })}
          className="w-10 h-10 shrink-0 flex items-center justify-center bg-gray-100 rounded-full active:scale-90 transition-transform"
          aria-label="رجوع"
        >
          <ArrowRight size={18} className="text-gray-600" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-gray-900 leading-tight">إعدادات الشات</h2>
          <p className="text-[11px] text-gray-400 leading-tight">الردود التلقائية والذكاء الاصطناعي</p>
        </div>
      </div>

      {/* AI Status Card */}
      {aiConfig && (
        <div className={`rounded-2xl p-4 border ${aiEnabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center ${aiEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                <Bot size={20} />
              </div>
              <div className="min-w-0">
                <p className={`font-bold text-sm ${aiEnabled ? 'text-green-700' : 'text-gray-600'}`}>الذكاء الاصطناعي</p>
                <p className={`text-xs truncate ${aiEnabled ? 'text-green-500' : 'text-gray-400'}`}>
                  {aiEnabled ? `مفعّل — ${aiConfig.model || ''}` : 'غير مفعّل حالياً'}
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleAi}
              disabled={togglingAi}
              className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-60 ${
                aiEnabled
                  ? 'bg-red-100 text-red-600'
                  : 'bg-green-100 text-green-600'
              }`}
            >
              {togglingAi ? <Loader size={14} className="animate-spin" /> : aiEnabled ? <PowerOff size={14} /> : <Power size={14} />}
              {aiEnabled ? 'إيقاف' : 'تفعيل'}
            </button>
          </div>

          {/* تنبيه إذا كان النموذج المحفوظ قديماً/غير معروف وقد يتوقف الرد بصمت */}
          {aiEnabled && aiConfig.model && !AVAILABLE_MODELS.some(m => m.id === aiConfig.model) && (
            <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-700 leading-relaxed">
                النموذج الحالي <span className="font-bold" dir="ltr">"{aiConfig.model}"</span> غير موجود في قائمة النماذج المدعومة حالياً، وقد يكون متوقفاً لدى مزوّده.
                هذا يعني أن الذكاء الاصطناعي قد لا يرد على المستخدمين. يُرجى تحديث النموذج من الإعدادات.
              </p>
            </div>
          )}

          <button
            onClick={() => setShowModal("ai_config")}
            className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-bold text-brand bg-white border border-gray-200 rounded-xl py-2.5 active:scale-[0.98] transition-all"
          >
            تعديل إعدادات الذكاء الاصطناعي
            <ChevronRight size={14} className="rotate-180" />
          </button>
        </div>
      )}

      {/* Min Messages Card */}
      <div
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all"
        onClick={() => { if (!loadingMinMsg) setShowModal("min_messages"); }}
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 shrink-0 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
            <MessageSquare size={19} />
          </div>
          <div>
            <p className="font-bold text-sm text-gray-800">الحد الأدنى لعدد الرسائل</p>
            <p className="text-xs text-gray-400 mt-0.5">
              عادي: <span className="font-bold text-gray-600">{minMsgNormal}</span> · VIP: <span className="font-bold text-gray-600">{minMsgVip}</span>
            </p>
          </div>
        </div>
        <ChevronRight size={18} className="text-gray-300 rotate-180 shrink-0" />
      </div>

      {/* Auto Replies List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare size={17} className="text-gray-400" />
            <h3 className="font-bold text-gray-700 text-sm">الردود التلقائية</h3>
          </div>
          {autoReplies.length > 0 && (
            <span className="bg-brand text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{autoReplies.length}</span>
          )}
        </div>

        {loadingReplies ? (
          <div className="p-10 flex items-center justify-center text-gray-300">
            <Loader size={22} className="animate-spin" />
          </div>
        ) : autoReplies.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <MessageSquare size={30} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">لا توجد ردود تلقائية بعد</p>
            <p className="text-xs text-gray-300 mt-1">أضف رداً يطابق رسائل المستخدمين تلقائياً</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {autoReplies.map((ar: any) => (
              <div key={ar.id} className="p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-brand mb-1">إذا أرسل المستخدم:</p>
                  <p className="text-xs font-bold text-gray-700 mb-2 bg-gray-50 rounded-lg px-2.5 py-1.5 break-words">{ar.trigger_text}</p>
                  <p className="text-[10px] font-bold text-gray-400 mb-1">الرد التلقائي:</p>
                  <p className="text-xs text-gray-600 break-words leading-relaxed">{ar.reply_text}</p>
                  {ar.is_faq && (
                    <span className="mt-2 inline-block text-[9px] bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full font-bold">سؤال شائع (FAQ)</span>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteAutoReply(ar.id)}
                  className="p-2 -m-1 text-red-300 active:text-red-500 active:scale-90 transition-all shrink-0"
                  aria-label="حذف"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Button — زر ضمن الصفحة (ليس عائماً فوق شريط التنقل) لتجنّب التداخل مع زر "+" العام بالأسفل */}
      <button
        onClick={() => setShowModal("choice")}
        className="w-full flex items-center justify-center gap-2 bg-brand text-white rounded-2xl py-3.5 font-bold text-sm shadow-sm active:scale-[0.98] transition-all"
      >
        <Plus size={18} />
        إضافة رد تلقائي أو ذكاء اصطناعي
      </button>

      {/* Choice Modal */}
      {showModal === "choice" && (
        <BottomSheet onClose={() => setShowModal(null)}>
          <div className="p-5 pb-6 space-y-3">
            <h3 className="font-bold text-gray-800 text-center mb-1">ماذا تريد إضافة؟</h3>
            <button
              onClick={() => setShowModal("auto_reply")}
              className="w-full p-4 bg-gray-50 rounded-2xl flex items-center gap-3.5 active:scale-[0.98] transition-all"
            >
              <div className="w-11 h-11 shrink-0 bg-brand-light/30 rounded-full flex items-center justify-center text-brand">
                <MessageSquare size={20} />
              </div>
              <div className="text-right flex-1">
                <p className="font-bold text-gray-800 text-sm">إضافة رد تلقائي</p>
                <p className="text-xs text-gray-400">رد على رسالة محددة بشكل تلقائي (تطابق 100%)</p>
              </div>
              <ChevronRight size={18} className="text-gray-300 rotate-180 shrink-0" />
            </button>
            <button
              onClick={() => setShowModal("ai_config")}
              className="w-full p-4 bg-gray-50 rounded-2xl flex items-center gap-3.5 active:scale-[0.98] transition-all"
            >
              <div className="w-11 h-11 shrink-0 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                <Bot size={20} />
              </div>
              <div className="text-right flex-1">
                <p className="font-bold text-gray-800 text-sm">{aiConfig ? "تعديل الذكاء الاصطناعي" : "إضافة ذكاء اصطناعي"}</p>
                <p className="text-xs text-gray-400">ربط نموذج AI للرد على المستخدمين تلقائياً</p>
              </div>
              <ChevronRight size={18} className="text-gray-300 rotate-180 shrink-0" />
            </button>
          </div>
        </BottomSheet>
      )}

      {/* Auto Reply Modal */}
      {showModal === "auto_reply" && (
        <BottomSheet onClose={() => setShowModal(null)} title="إضافة رد تلقائي جديد">
          <div className="p-4 pb-6 space-y-3.5">
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">النص الذي يرسله المستخدم (يجب التطابق 100٪)</label>
              <input
                ref={triggerRef}
                type="text"
                placeholder="مثال: كيف أشحن رصيدي؟"
                className="w-full p-3.5 bg-gray-50 rounded-xl text-sm border border-gray-200 outline-none focus:ring-2 focus:ring-brand focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">رد البوت التلقائي</label>
              <textarea
                ref={replyRef}
                placeholder="اكتب نص الرد الذي سيصل للمستخدم تلقائياً..."
                className="w-full p-3.5 bg-gray-50 rounded-xl text-sm border border-gray-200 outline-none focus:ring-2 focus:ring-brand focus:bg-white transition-all h-28 resize-none"
              />
            </div>
            <label className="flex items-center gap-2.5 px-1 py-1">
              <input
                type="checkbox"
                checked={isFaqChecked}
                onChange={e => setIsFaqChecked(e.target.checked)}
                className="w-4.5 h-4.5 rounded accent-brand"
              />
              <span className="text-xs font-bold text-gray-600">إضافته كسؤال شائع (FAQ) يظهر للمستخدمين</span>
            </label>
            <button
              onClick={handleSaveAutoReply}
              disabled={savingReply}
              className="w-full p-3.5 bg-brand text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {savingReply ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
              حفظ الرد التلقائي
            </button>
          </div>
        </BottomSheet>
      )}

      {/* AI Config Modal */}
      {showModal === "ai_config" && (
        <BottomSheet
          onClose={() => setShowModal(null)}
          title="إعدادات الذكاء الاصطناعي"
          icon={<Bot size={19} className="text-purple-600" />}
        >
          <div className="p-4 pb-6 space-y-4">

            {/* Model Selection — moved first since it determines provider/key */}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">النموذج (Model)</label>
              <select
                value={aiModel}
                onChange={e => setAiModel(e.target.value)}
                className="w-full p-3.5 bg-gray-50 rounded-xl text-sm border border-gray-200 outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white transition-all"
              >
                {!isKnownModel && (
                  <option value={aiModel}>⚠️ {aiModel} (غير معروف)</option>
                )}
                {PROVIDER_GROUPS.map(group => (
                  <optgroup key={group.key} label={group.label}>
                    {AVAILABLE_MODELS.filter(m => m.provider === group.key).map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {!isKnownModel && (
                <p className="mt-1.5 flex items-start gap-1.5 text-[11px] text-amber-600 leading-relaxed">
                  <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                  هذا النموذج قد يكون متوقفاً لدى مزوّده ولن يرد على المستخدمين. اختر نموذجاً من القائمة.
                </p>
              )}
            </div>

            {/* API Key */}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">مفتاح API الخاص بالنموذج المختار</label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={aiKey}
                  onChange={e => { setAiKey(e.target.value); setKeyTouched(true); }}
                  placeholder="أدخل مفتاح API هنا"
                  className="w-full p-3.5 pl-11 bg-gray-50 rounded-xl text-sm border border-gray-200 outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white transition-all"
                  dir="ltr"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 p-1"
                  aria-label={showKey ? "إخفاء المفتاح" : "إظهار المفتاح"}
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {aiConfig?.api_key && !keyTouched && (
                <p className="mt-1.5 text-[11px] text-gray-400">المفتاح المحفوظ حالياً مُخفي لأسباب أمنية — لن يتغيّر إلا إذا كتبت مفتاحاً جديداً.</p>
              )}
            </div>

            {/* Training Text */}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1.5 block">نص التدريب المباشر (اختياري)</label>
              <textarea
                value={aiTrainingText}
                onChange={e => setAiTrainingText(e.target.value)}
                placeholder="مثال: نحن متجر يبيع الإلكترونيات، ساعات العمل من 9 صباحاً حتى 11 مساءً..."
                className="w-full p-3.5 bg-gray-50 rounded-xl text-sm border border-gray-200 outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white transition-all h-28 resize-none"
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-2 block">رفع ملفات للتدريب (.md / .txt / صور)</label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-3.5 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center gap-2 text-sm text-gray-400 active:border-purple-300 active:text-purple-500 transition-colors"
              >
                <Upload size={16} />
                اختر ملفات
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".md,.txt,image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
              {aiFiles.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {aiFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs bg-gray-50 rounded-xl p-2.5">
                      {f.type.startsWith("image/") ? <ImageIcon size={13} className="text-blue-400 shrink-0" /> : <FileText size={13} className="text-green-400 shrink-0" />}
                      <span className="flex-1 truncate text-gray-600">{f.name}</span>
                      <button onClick={() => setAiFiles(prev => prev.filter((_, j) => j !== i))} className="text-red-400 p-1 -m-1" aria-label="إزالة">
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Enable Toggle */}
            <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl">
              <div className="min-w-0 pr-2">
                <p className="text-sm font-bold text-gray-700">تفعيل الذكاء الاصطناعي</p>
                <p className="text-xs text-gray-400">سيرد تلقائياً على رسائل المستخدمين</p>
              </div>
              <button
                type="button"
                onClick={() => setAiEnabled(!aiEnabled)}
                className={`w-12 h-6 shrink-0 rounded-full relative transition-colors ${aiEnabled ? 'bg-brand' : 'bg-gray-300'}`}
                aria-label="تفعيل/إيقاف"
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow ${aiEnabled ? 'right-1' : 'left-1'}`} />
              </button>
            </div>

            {/* Integration Info */}
            <div className="bg-purple-50 rounded-xl p-3.5 border border-purple-100 flex items-start gap-2.5">
              <Sparkles size={15} className="text-purple-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-purple-600 leading-relaxed">
                سيتمكن الذكاء الاصطناعي من قراءة أسعار المنتجات، وعرض طلبات ومدفوعات المستخدم المرسِل فقط (بحسب صلاحيات حسابه).
              </p>
            </div>

            {/* Troubleshooting tip */}
            <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 flex items-start gap-2.5">
              <HelpCircle size={15} className="text-gray-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-gray-500 leading-relaxed">
                إذا لم يرد الذكاء الاصطناعي على المستخدمين بعد التفعيل، تحقّق من صحة مفتاح API ومن اختيار نموذج فعّال من القائمة، وراجع سجلّات الخادم (Logs) لمزيد من التفاصيل.
              </p>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveAiConfig}
              disabled={savingAi}
              className="w-full p-3.5 bg-purple-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {savingAi ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
              حفظ إعدادات الذكاء الاصطناعي
            </button>
          </div>
        </BottomSheet>
      )}

      {/* Min Messages Modal */}
      {showModal === "min_messages" && (
        <BottomSheet onClose={() => setShowModal(null)} title="الحد الأدنى لعدد الرسائل">
          <div className="p-4 pb-6 space-y-4">
            <p className="text-xs text-gray-400 leading-relaxed">
              حدّد الحد الأدنى لعدد الرسائل المسموح بإرسالها في الشات. أدخل 0 لإلغاء الحد.
            </p>

            {/* Normal User */}
            <div className="bg-gray-50 rounded-xl p-3.5 space-y-2">
              <label className="text-xs font-bold text-gray-600 block">تعيين الحد الأدنى للمستخدم العادي</label>
              <input
                type="number"
                min={0}
                value={minMsgNormal}
                onChange={e => setMinMsgNormal(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full p-3 bg-white rounded-lg text-sm border border-gray-200 outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                placeholder="مثال: 10"
                dir="ltr"
              />
              <p className="text-[11px] text-gray-400">عدد الرسائل المسموح بها للمستخدم العادي</p>
            </div>

            {/* VIP User */}
            <div className="bg-amber-50 rounded-xl p-3.5 space-y-2 border border-amber-100">
              <label className="text-xs font-bold text-amber-700 block">تعيين الحد الأدنى للمستخدم VIP</label>
              <input
                type="number"
                min={0}
                value={minMsgVip}
                onChange={e => setMinMsgVip(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full p-3 bg-white rounded-lg text-sm border border-amber-200 outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                placeholder="مثال: 50"
                dir="ltr"
              />
              <p className="text-[11px] text-amber-600">عدد الرسائل المسموح بها للمستخدم VIP</p>
            </div>

            <button
              onClick={handleSaveMinMessages}
              disabled={savingMinMsg}
              className="w-full p-3.5 bg-blue-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {savingMinMsg ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
              حفظ الحد الأدنى
            </button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

/** صفحة سفلية (Bottom Sheet) موحّدة لكل النوافذ المنبثقة في هذه الصفحة.
 * مبنية كحاوية flex-column بارتفاع أقصى ثابت (90vh) مع رأس ثابت (sticky)
 * وجسم قابل للتمرير، لضمان ظهور النافذة كاملة وبدون قطع على أي شاشة جوال
 * بما فيها الحالات التي تظهر فيها لوحة المفاتيح. */
function BottomSheet({
  children,
  onClose,
  title,
  icon,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md max-h-[90vh] rounded-t-3xl overflow-hidden flex flex-col animate-[slideUp_0.2s_ease-out]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* رأس ثابت لا يتحرك مع التمرير */}
        <div className="shrink-0 bg-white relative">
          <div className="flex justify-center pt-2.5 pb-1">
            <div className="w-10 h-1.5 bg-gray-200 rounded-full" />
          </div>
          {title ? (
            <div className="px-4 pb-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {icon}
                <h3 className="font-bold text-gray-800">{title}</h3>
              </div>
              <button onClick={onClose} className="text-gray-400 p-1.5 -m-1.5" aria-label="إغلاق">
                <X size={20} />
              </button>
            </div>
          ) : (
            <button onClick={onClose} className="absolute top-3 left-3 text-gray-400 p-1.5" aria-label="إغلاق">
              <X size={20} />
            </button>
          )}
        </div>

        {/* جسم قابل للتمرير يأخذ كل المساحة المتبقية */}
        <div className="overflow-y-auto flex-1 min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
}
