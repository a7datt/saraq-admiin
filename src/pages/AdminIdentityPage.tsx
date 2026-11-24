import React, { useEffect, useState } from "react";
import { ChevronRight, ShieldCheck, X, Check, Settings } from "lucide-react";
import { showToast } from "../components/ToastContainer";
import VerifiedBadge from "../components/VerifiedBadge";

interface Props {
  adminFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onBack: () => void;
}

const STATUS_TABS = [
  { key: "pending", label: "قيد المراجعة" },
  { key: "approved", label: "موثّق" },
  { key: "rejected", label: "مرفوض" },
  { key: "all", label: "الكل" },
];
const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  pending: { text: "قيد المراجعة", cls: "bg-amber-50 text-amber-700" },
  approved: { text: "موثّق", cls: "bg-green-50 text-green-700" },
  rejected: { text: "مرفوض", cls: "bg-red-50 text-red-600" },
};

/** [PHASE-3] صفحة "توثيقات الهوية": قائمة الطلبات + عرض الصور مكبّرة + قبول/رفض (بسبب) + إعدادات التوثيق. */
export default function AdminIdentityPage({ adminFetch, onBack }: Props) {
  const [tab, setTab] = useState("pending");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState<{ row: any; front: string; back: string } | null>(null);
  const [zoom, setZoom] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<any | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [cfg, setCfg] = useState<{ enabled: boolean; description: string }>({ enabled: false, description: "" });
  const [cfgOpen, setCfgOpen] = useState(false);
  const [savingCfg, setSavingCfg] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminFetch(`/api/admin/identity/requests?status=${tab}`);
      setRows(res.ok ? await res.json() : []);
    } catch { setRows([]); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [tab]);
  useEffect(() => {
    adminFetch("/api/admin/identity/settings").then(r => r.ok ? r.json() : null).then(d => d && setCfg(d)).catch(() => {});
  }, []);
  useEffect(() => () => { if (viewer) { URL.revokeObjectURL(viewer.front); URL.revokeObjectURL(viewer.back); } }, [viewer]);

  // الصور تُجلب عبر السيرفر بصلاحية الأدمن (المخزن خاص) ثم تُعرض كروابط مؤقتة داخل المتصفح
  const openRow = async (row: any) => {
    setBusy(true);
    try {
      const get = async (side: string) => {
        const r = await adminFetch(`/api/admin/identity/requests/${row.id}/image/${side}`);
        if (!r.ok) throw new Error("img");
        return URL.createObjectURL(await r.blob());
      };
      const [front, back] = await Promise.all([get("front"), get("back")]);
      setViewer({ row, front, back });
    } catch { showToast("تعذر تحميل الصور", "error"); }
    setBusy(false);
  };
  const closeViewer = () => { setViewer(null); setZoom(null); };

  const approve = async (row: any) => {
    setBusy(true);
    const res = await adminFetch(`/api/admin/identity/requests/${row.id}/approve`, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    if (res.ok) { showToast("تم توثيق المستخدم", "success"); closeViewer(); load(); } else showToast(d?.error || "فشل القبول", "error");
    setBusy(false);
  };
  const reject = async () => {
    if (!rejecting) return;
    if (reason.trim().length < 3) { showToast("اكتب سبب الرفض", "error"); return; }
    setBusy(true);
    const res = await adminFetch(`/api/admin/identity/requests/${rejecting.id}/reject`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: reason.trim() }) });
    const d = await res.json().catch(() => ({}));
    if (res.ok) { showToast("تم رفض الطلب", "success"); setRejecting(null); setReason(""); closeViewer(); load(); } else showToast(d?.error || "فشل الرفض", "error");
    setBusy(false);
  };
  const saveCfg = async () => {
    setSavingCfg(true);
    const res = await adminFetch("/api/admin/identity/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cfg) });
    if (res.ok) showToast("تم حفظ إعدادات التوثيق", "success"); else showToast("فشل الحفظ", "error");
    setSavingCfg(false);
  };

  return (
    <div className="space-y-4 pb-20" dir="rtl">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="text-gray-500 p-1 -m-1"><ChevronRight size={22} /></button>
        <h2 className="font-black text-lg text-gray-800 flex items-center gap-2"><ShieldCheck size={18} className="text-sky-500" /> توثيقات الهوية</h2>
        <button onClick={() => setCfgOpen(o => !o)} className="mr-auto p-2 rounded-lg bg-gray-100 text-gray-600"><Settings size={16} /></button>
      </div>

      {cfgOpen && (
        <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-3">
          <p className="text-xs font-black text-gray-700">إعدادات التوثيق</p>
          <div className="grid grid-cols-2 gap-2">
            {[{ v: true, l: "مُفعَّل" }, { v: false, l: "مُعطَّل" }].map(o => (
              <button key={String(o.v)} onClick={() => setCfg({ ...cfg, enabled: o.v })}
                className={`p-3 rounded-lg border text-[11px] font-bold ${cfg.enabled === o.v ? "bg-blue-50 border-[var(--brand)] text-[var(--brand)]" : "bg-gray-50 border-gray-100 text-gray-500"}`}>{o.l}</button>
            ))}
          </div>
          <p className="text-[10px] text-gray-400">عند التفعيل يظهر زر «توثيق الهوية» في حساب المستخدم، وعند التعطيل يختفي.</p>
          <textarea value={cfg.description} onChange={e => setCfg({ ...cfg, description: e.target.value })} rows={5} maxLength={3000}
            placeholder="وصف وشرح كامل لما هو مطلوب من المستخدم (يظهر له في صفحة التوثيق)"
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none resize-none" />
          <button onClick={saveCfg} disabled={savingCfg} className="w-full py-2.5 rounded-lg bg-[var(--brand)] text-white text-xs font-bold disabled:opacity-40">{savingCfg ? "جارِ الحفظ..." : "حفظ الإعدادات"}</button>
        </div>
      )}

      <div className="grid grid-cols-4 gap-1.5">
        {STATUS_TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`py-2 rounded-lg text-[11px] font-bold ${tab === t.key ? "bg-[var(--brand)] text-white" : "bg-gray-100 text-gray-500"}`}>{t.label}</button>
        ))}
      </div>

      {loading ? <p className="text-center text-xs text-gray-400 py-8">جاري التحميل...</p>
        : rows.length === 0 ? <p className="text-center text-xs text-gray-400 py-8">لا توجد طلبات</p>
        : (
          <div className="space-y-2">
            {rows.map(r => (
              <button key={r.id} onClick={() => openRow(r)} disabled={busy} className="w-full text-right bg-white border border-gray-100 rounded-lg p-3 flex items-center gap-3 active:scale-[0.99]">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">{r.user?.name || "مستخدم محذوف"}{r.user?.identity_verified && <VerifiedBadge />} <span className="text-gray-400 font-normal text-xs">#{r.user_id}</span></p>
                  <p className="text-[10px] text-gray-400 truncate">{r.user?.email || r.user?.phone || ""}</p>
                  <p className="text-[10px] text-gray-400">{new Date(r.created_at).toLocaleString("ar")}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${STATUS_LABEL[r.status]?.cls}`}>{STATUS_LABEL[r.status]?.text}</span>
              </button>
            ))}
          </div>
        )}

      {viewer && (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-end sm:items-center justify-center" onClick={closeViewer}>
          <div className="bg-white w-full max-w-lg rounded-t-xl sm:rounded-xl p-4 space-y-3 max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-black text-sm text-gray-800">{viewer.row.user?.name || "مستخدم"} <span className="text-gray-400 text-xs">#{viewer.row.user_id}</span></p>
              <button onClick={closeViewer} className="text-gray-400"><X size={20} /></button>
            </div>
            {viewer.row.status === "rejected" && <p className="text-xs bg-red-50 text-red-600 rounded-lg p-2">سبب الرفض: {viewer.row.reject_reason}</p>}
            {[{ l: "الوجه الأمامي", u: viewer.front }, { l: "الوجه الخلفي", u: viewer.back }].map(i => (
              <div key={i.l} className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400">{i.l} (اضغط للتكبير)</p>
                <img src={i.u} alt={i.l} onClick={() => setZoom(i.u)} className="w-full rounded-lg border border-gray-200 cursor-zoom-in" />
              </div>
            ))}
            {viewer.row.status === "pending" && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button disabled={busy} onClick={() => approve(viewer.row)} className="py-3 rounded-lg bg-green-600 text-white text-sm font-bold flex items-center justify-center gap-1 disabled:opacity-40"><Check size={15} /> قبول</button>
                <button disabled={busy} onClick={() => { setRejecting(viewer.row); setReason(""); }} className="py-3 rounded-lg bg-red-600 text-white text-sm font-bold flex items-center justify-center gap-1 disabled:opacity-40"><X size={15} /> رفض</button>
              </div>
            )}
          </div>
        </div>
      )}

      {zoom && (
        <div className="fixed inset-0 z-[90] bg-black/90 flex items-center justify-center p-2" onClick={() => setZoom(null)}>
          <button className="absolute top-4 left-4 text-white"><X size={26} /></button>
          <img src={zoom} alt="" className="max-w-full max-h-full object-contain" />
        </div>
      )}

      {rejecting && (
        <div className="fixed inset-0 z-[95] bg-black/50 flex items-center justify-center p-4" onClick={() => setRejecting(null)}>
          <div className="bg-white rounded-xl p-4 w-full max-w-sm space-y-3" onClick={e => e.stopPropagation()}>
            <p className="font-black text-sm text-gray-800">سبب الرفض</p>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} maxLength={300} placeholder="مثال: الصورة غير واضحة" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none resize-none" />
            <div className="grid grid-cols-2 gap-2">
              <button disabled={busy} onClick={reject} className="py-2.5 rounded-lg bg-red-600 text-white text-xs font-bold disabled:opacity-40">تأكيد الرفض</button>
              <button onClick={() => setRejecting(null)} className="py-2.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
