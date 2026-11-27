import React, { useEffect, useState } from "react";
import { ChevronRight, Briefcase, Settings, Search, Plus, Trash2, Pencil, X, Users, Store, MapPin, Phone, Globe } from "lucide-react";
import { showToast } from "../components/ToastContainer";
import AdminImageUpload from "../components/AdminImageUpload";

interface Props {
  adminFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onBack: () => void;
}

interface Cfg { enabled: boolean; mode: "all" | "selected"; percent: number; directoryEnabled: boolean }
interface AgentRow { id: number; name: string; email: string; agent_enabled: boolean; agent_code: string | null; is_active_agent: boolean; clients_count: number; total_commission: number; custom_percent: number | null; effective_percent: number }
interface DirRow { id?: number; name: string; image_url: string; website_url: string; phone: string; location: string; description: string; is_active: boolean; sort_order: number }

const EMPTY_DIR: DirRow = { name: "", image_url: "", website_url: "", phone: "", location: "", description: "", is_active: true, sort_order: 0 };
const money = (n: number) => `${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString("en-US")}$`;
const json = (body: any): RequestInit => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

/** [AGENTS] إدارة نظام الوكلاء: الإعدادات، تفعيل حساب الوكيل للمستخدمين، عملاء كل وكيل، ودليل "وكلائنا". */
export default function AdminAgentsPage({ adminFetch, onBack }: Props) {
  const [tab, setTab] = useState<"agents" | "directory">("agents");
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [cfgOpen, setCfgOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [pctEdit, setPctEdit] = useState<{ id: number; value: string } | null>(null);
  const [clientsOf, setClientsOf] = useState<{ agent: AgentRow; data: any | null } | null>(null);

  const [dir, setDir] = useState<any[]>([]);
  const [editing, setEditing] = useState<DirRow | null>(null);

  const loadCfg = () => adminFetch("/api/admin/agents/settings").then(r => r.ok ? r.json() : null).then(d => d && setCfg(d)).catch(() => {});
  const loadAgents = async () => {
    setLoading(true);
    try { const r = await adminFetch("/api/admin/agents"); const d = r.ok ? await r.json() : null; setAgents(d?.agents || []); } catch { setAgents([]); }
    setLoading(false);
  };
  const loadDir = async () => {
    try { const r = await adminFetch("/api/admin/agents/directory"); setDir(r.ok ? await r.json() : []); } catch { setDir([]); }
  };
  useEffect(() => { loadCfg(); loadAgents(); loadDir(); }, []);

  const saveCfg = async (patch: Partial<Cfg>) => {
    if (!cfg) return;
    setSaving(true);
    try {
      const r = await adminFetch("/api/admin/agents/settings", { ...json({ ...cfg, ...patch }), method: "PUT" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.error || "فشل الحفظ");
      setCfg(d); showToast("تم حفظ إعدادات الوكلاء", "success"); loadAgents();
    } catch (e: any) { showToast(e?.message || "فشل الحفظ", "error"); }
    setSaving(false);
  };

  const search = async () => {
    const s = q.trim();
    if (!s) { setResults([]); return; }
    setSearching(true);
    try { const r = await adminFetch(`/api/admin/users/search?q=${encodeURIComponent(s)}`); setResults(r.ok ? await r.json() : []); } catch { setResults([]); }
    setSearching(false);
  };

  const toggleAgent = async (id: number, enabled: boolean) => {
    try {
      const r = await adminFetch(`/api/admin/agents/users/${id}`, json({ enabled }));
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.error || "فشل التحديث");
      showToast(enabled ? "تم تفعيل حساب الوكيل" : "تم إلغاء حساب الوكيل", "success");
      loadAgents();
    } catch (e: any) { showToast(e?.message || "فشل التحديث", "error"); }
  };

  const savePercent = async (id: number, value: string | null) => {
    try {
      const r = await adminFetch(`/api/admin/agents/users/${id}/percent`, json({ percent: value === null || value.trim() === "" ? null : Number(value) }));
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.error || "فشل الحفظ");
      showToast(d.percent === null ? "عاد الوكيل للنسبة العامة" : `نسبة الوكيل الآن ${d.percent}%`, "success");
      setPctEdit(null); loadAgents();
    } catch (e: any) { showToast(e?.message || "فشل الحفظ", "error"); }
  };

  const openClients = async (agent: AgentRow) => {
    setClientsOf({ agent, data: null });
    try { const r = await adminFetch(`/api/admin/agents/users/${agent.id}/clients`); setClientsOf({ agent, data: r.ok ? await r.json() : { clients: [] } }); }
    catch { setClientsOf({ agent, data: { clients: [] } }); }
  };

  const saveDir = async () => {
    if (!editing) return;
    if (!editing.name.trim()) { showToast("اسم الوكيل مطلوب", "error"); return; }
    setSaving(true);
    try {
      const url = editing.id ? `/api/admin/agents/directory/${editing.id}` : "/api/admin/agents/directory";
      const r = await adminFetch(url, { ...json(editing), method: editing.id ? "PUT" : "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.error || "فشل الحفظ");
      showToast("تم الحفظ", "success"); setEditing(null); loadDir();
    } catch (e: any) { showToast(e?.message || "فشل الحفظ", "error"); }
    setSaving(false);
  };

  const delDir = async (row: any) => {
    if (!window.confirm(`حذف "${row.name}" من صفحة وكلائنا؟`)) return;
    try {
      const r = await adminFetch(`/api/admin/agents/directory/${row.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      showToast("تم الحذف", "success"); loadDir();
    } catch { showToast("فشل الحذف", "error"); }
  };

  const agentIds = new Set(agents.filter(a => a.agent_enabled).map(a => a.id));
  const input = "w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none";

  return (
    <div className="space-y-4 pb-20" dir="rtl">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="text-gray-500 p-1 -m-1"><ChevronRight size={22} /></button>
        <h2 className="font-black text-lg text-gray-800 flex items-center gap-2"><Briefcase size={18} className="text-[var(--brand)]" /> الوكلاء</h2>
        <button onClick={() => setCfgOpen(o => !o)} className="mr-auto p-2 rounded-lg bg-gray-100 text-gray-600"><Settings size={16} /></button>
      </div>

      {cfg && (
        <div className={`rounded-lg p-3 text-xs font-bold flex items-center justify-between ${cfg.enabled ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
          <span>{cfg.enabled ? `نظام الوكلاء مُفعَّل — ${cfg.mode === "all" ? "لكل المستخدمين" : "لمستخدمين محدّدين"} — العمولة ${cfg.percent}% من صافي الربح` : "نظام الوكلاء مُعطَّل (لا يظهر حساب الوكيل ولا حقل كود الوكيل)"}</span>
          <button onClick={() => saveCfg({ enabled: !cfg.enabled })} disabled={saving} className={`shrink-0 px-3 py-1.5 rounded-md text-white text-[11px] ${cfg.enabled ? "bg-red-500" : "bg-green-600"} disabled:opacity-40`}>{cfg.enabled ? "تعطيل" : "تفعيل"}</button>
        </div>
      )}

      {cfgOpen && cfg && (
        <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-3">
          <p className="text-xs font-black text-gray-700">إعدادات نظام الوكلاء</p>
          <p className="text-[11px] font-bold text-gray-500">من يملك حساب وكيل؟</p>
          <div className="grid grid-cols-2 gap-2">
            {[{ v: "all", l: "كل المستخدمين" }, { v: "selected", l: "مستخدمون محدّدون" }].map(o => (
              <button key={o.v} onClick={() => setCfg({ ...cfg, mode: o.v as any })}
                className={`p-3 rounded-lg border text-[11px] font-bold ${cfg.mode === o.v ? "bg-blue-50 border-[var(--brand)] text-[var(--brand)]" : "bg-gray-50 border-gray-100 text-gray-500"}`}>{o.l}</button>
            ))}
          </div>
          <label className="block space-y-1">
            <span className="text-[11px] font-bold text-gray-500">النسبة العامة لعمولة الوكيل من صافي ربح المتجر (%) — يمكن تخصيص نسبة لكل وكيل من بطاقته</span>
            <input type="number" min={0} max={100} step="0.1" value={cfg.percent} onChange={e => setCfg({ ...cfg, percent: Number(e.target.value) })} className={input} dir="ltr" />
          </label>
          <p className="text-[10px] text-gray-400 leading-relaxed">مثال: منتج سعره 100$ وربحك عليه 5% → يُباع بـ 105$ وربحك 5$. بعمولة {cfg.percent || 0}% يحصل الوكيل على {money(5 * (Number(cfg.percent) || 0) / 100)} من كل عملية شراء لأحد عملائه. العمولة لا تُحسب على الشحن، وتُسحب تلقائياً إن استُرجع الطلب.</p>
          <label className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
            <span className="text-[11px] font-bold text-gray-600">إظهار صفحة «وكلائنا» في القائمة الجانبية</span>
            <input type="checkbox" className="w-5 h-5 accent-[var(--brand)]" checked={cfg.directoryEnabled} onChange={e => setCfg({ ...cfg, directoryEnabled: e.target.checked })} />
          </label>
          <button onClick={() => saveCfg({})} disabled={saving} className="w-full py-2.5 rounded-lg bg-[var(--brand)] text-white text-xs font-bold disabled:opacity-40">{saving ? "جارِ الحفظ..." : "حفظ الإعدادات"}</button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5">
        <button onClick={() => setTab("agents")} className={`py-2 rounded-lg text-[11px] font-bold ${tab === "agents" ? "bg-[var(--brand)] text-white" : "bg-gray-100 text-gray-500"}`}>حسابات الوكلاء</button>
        <button onClick={() => setTab("directory")} className={`py-2 rounded-lg text-[11px] font-bold ${tab === "directory" ? "bg-[var(--brand)] text-white" : "bg-gray-100 text-gray-500"}`}>وكلائنا ({dir.length})</button>
      </div>

      {tab === "agents" && (
        <>
          <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
            <p className="text-xs font-black text-gray-700">تفعيل حساب وكيل لمستخدم</p>
            {cfg?.mode === "all" && <p className="text-[10px] text-amber-600">النمط الحالي «كل المستخدمين»: كل مستخدم وكيلٌ تلقائياً، والتفعيل الفردي يبقى محفوظاً إن غيّرت النمط لاحقاً.</p>}
            <div className="flex gap-2">
              <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && search()} placeholder="اسم أو إيميل أو رقم الحساب" className={input} />
              <button onClick={search} disabled={searching} className="px-3 rounded-lg bg-[var(--brand)] text-white disabled:opacity-40"><Search size={16} /></button>
            </div>
            {results.map(u => (
              <div key={u.id} className="flex items-center gap-2 border border-gray-100 rounded-lg p-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-800 truncate">{u.name} <span className="text-gray-400 font-normal">#{u.id}</span></p>
                  <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                </div>
                {agentIds.has(u.id)
                  ? <button onClick={() => toggleAgent(u.id, false)} className="px-2.5 py-1.5 rounded-md bg-red-50 text-red-600 text-[11px] font-bold">إلغاء الوكيل</button>
                  : <button onClick={() => toggleAgent(u.id, true)} className="px-2.5 py-1.5 rounded-md bg-green-50 text-green-700 text-[11px] font-bold">تفعيل كوكيل</button>}
              </div>
            ))}
          </div>

          {loading ? <p className="text-center text-xs text-gray-400 py-8">جاري التحميل...</p>
            : agents.length === 0 ? <p className="text-center text-xs text-gray-400 py-8">لا يوجد وكلاء بعد</p>
            : (
              <div className="space-y-2">
                {agents.map(a => (
                  <div key={a.id} className="bg-white border border-gray-100 rounded-lg p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800 truncate">{a.name} <span className="text-gray-400 font-normal text-xs">#{a.id}</span></p>
                        <p className="text-[10px] text-gray-400 truncate">{a.email}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${a.is_active_agent ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>{a.is_active_agent ? "وكيل فعّال" : "غير فعّال"}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      <div className="bg-gray-50 rounded-md py-1.5"><p className="text-[10px] text-gray-500">الكود</p><p className="text-xs font-black font-mono text-gray-800">{a.agent_code || "—"}</p></div>
                      <div className="bg-gray-50 rounded-md py-1.5"><p className="text-[10px] text-gray-500">العملاء</p><p className="text-xs font-black text-gray-800">{a.clients_count}</p></div>
                      <div className="bg-green-50 rounded-md py-1.5"><p className="text-[10px] text-gray-500">العمولات</p><p className="text-xs font-black text-green-700">{money(a.total_commission)}</p></div>
                    </div>
                    {pctEdit?.id === a.id ? (
                      <div className="flex items-center gap-1.5 bg-amber-50 rounded-md p-2">
                        <span className="text-[11px] font-bold text-amber-700 shrink-0">نسبته %</span>
                        <input autoFocus type="number" min={0} max={100} step="0.1" value={pctEdit.value} onChange={e => setPctEdit({ id: a.id, value: e.target.value })}
                          placeholder={`العامة ${cfg?.percent ?? 5}`} className="flex-1 min-w-0 p-1.5 rounded border border-amber-200 text-sm outline-none" dir="ltr" />
                        <button onClick={() => savePercent(a.id, pctEdit.value)} className="px-2.5 py-1.5 rounded bg-[var(--brand)] text-white text-[11px] font-bold">حفظ</button>
                        {a.custom_percent !== null && <button onClick={() => savePercent(a.id, null)} className="px-2 py-1.5 rounded bg-white text-gray-600 text-[11px] font-bold">العامة</button>}
                        <button onClick={() => setPctEdit(null)} className="p-1 text-gray-400"><X size={14} /></button>
                      </div>
                    ) : (
                      <button onClick={() => setPctEdit({ id: a.id, value: a.custom_percent === null ? "" : String(a.custom_percent) })} className="w-full flex items-center justify-between bg-amber-50 rounded-md px-2.5 py-2 text-[11px] font-bold text-amber-700">
                        <span>نسبة العمولة من صافي الربح: {a.effective_percent}% {a.custom_percent === null ? "(العامة)" : "(مخصّصة)"}</span>
                        <Pencil size={12} />
                      </button>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => openClients(a)} className="flex-1 py-2 rounded-md bg-gray-100 text-gray-700 text-[11px] font-bold flex items-center justify-center gap-1"><Users size={13} /> العملاء</button>
                      {a.agent_enabled
                        ? <button onClick={() => toggleAgent(a.id, false)} className="flex-1 py-2 rounded-md bg-red-50 text-red-600 text-[11px] font-bold">إلغاء الوكيل</button>
                        : <button onClick={() => toggleAgent(a.id, true)} className="flex-1 py-2 rounded-md bg-green-50 text-green-700 text-[11px] font-bold">تفعيل كوكيل</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
        </>
      )}

      {tab === "directory" && (
        <>
          <button onClick={() => setEditing({ ...EMPTY_DIR, sort_order: dir.length })} className="w-full py-2.5 rounded-lg bg-[var(--brand)] text-white text-xs font-bold flex items-center justify-center gap-1"><Plus size={15} /> إضافة وكيل إلى «وكلائنا»</button>
          {dir.length === 0 ? <p className="text-center text-xs text-gray-400 py-8">لا يوجد وكلاء في الصفحة بعد</p> : (
            <div className="space-y-2">
              {dir.map(d => (
                <div key={d.id} className="bg-white border border-gray-100 rounded-lg p-3 flex items-center gap-3">
                  {d.image_url ? <img src={d.image_url} alt="" className="w-12 h-12 rounded-lg object-cover bg-gray-100" /> : <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400"><Store size={20} /></div>}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{d.name} {!d.is_active && <span className="text-[10px] text-red-500">(مخفي)</span>}</p>
                    <p className="text-[10px] text-gray-400 truncate flex items-center gap-2">
                      {d.phone && <span className="inline-flex items-center gap-0.5" dir="ltr"><Phone size={10} />{d.phone}</span>}
                      {d.location && <span className="inline-flex items-center gap-0.5"><MapPin size={10} />{d.location}</span>}
                      {d.website_url && <Globe size={10} />}
                    </p>
                  </div>
                  <button onClick={() => setEditing({ ...EMPTY_DIR, ...Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v ?? ""])), is_active: !!d.is_active, sort_order: Number(d.sort_order) || 0 } as DirRow)} className="p-2 rounded-md bg-gray-100 text-gray-600"><Pencil size={14} /></button>
                  <button onClick={() => delDir(d)} className="p-2 rounded-md bg-red-50 text-red-500"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {editing && (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-end sm:items-center justify-center" onClick={() => setEditing(null)}>
          <div className="bg-white w-full max-w-lg rounded-t-xl sm:rounded-xl p-4 space-y-3 max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-black text-gray-800">{editing.id ? "تعديل وكيل" : "إضافة وكيل"}</p>
              <button onClick={() => setEditing(null)} className="p-1 text-gray-500"><X size={18} /></button>
            </div>
            <AdminImageUpload label="صورة الوكيل (اختياري)" currentUrl={editing.image_url} onUpload={url => setEditing({ ...editing, image_url: url })} />
            <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="اسم الوكيل *" className={input} maxLength={100} />
            <input value={editing.phone} onChange={e => setEditing({ ...editing, phone: e.target.value })} placeholder="رقم الهاتف" className={input} dir="ltr" maxLength={40} />
            <input value={editing.location} onChange={e => setEditing({ ...editing, location: e.target.value })} placeholder="الموقع الجغرافي (اختياري) — عنوان أو رابط خرائط" className={input} maxLength={300} />
            <input value={editing.website_url} onChange={e => setEditing({ ...editing, website_url: e.target.value })} placeholder="رابط الموقع (اختياري)" className={input} dir="ltr" maxLength={500} />
            <textarea value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} placeholder="وصف أو تفاصيل إضافية (اختياري)" rows={3} className={`${input} resize-none`} maxLength={1000} />
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1"><span className="text-[10px] font-bold text-gray-500">الترتيب</span>
                <input type="number" value={editing.sort_order} onChange={e => setEditing({ ...editing, sort_order: Number(e.target.value) })} className={input} dir="ltr" /></label>
              <label className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 mt-5"><input type="checkbox" className="w-4 h-4 accent-[var(--brand)]" checked={editing.is_active} onChange={e => setEditing({ ...editing, is_active: e.target.checked })} /><span className="text-[11px] font-bold text-gray-600">ظاهر في الصفحة</span></label>
            </div>
            <button onClick={saveDir} disabled={saving} className="w-full py-2.5 rounded-lg bg-[var(--brand)] text-white text-xs font-bold disabled:opacity-40">{saving ? "جارِ الحفظ..." : "حفظ"}</button>
          </div>
        </div>
      )}

      {clientsOf && (
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-end sm:items-center justify-center" onClick={() => setClientsOf(null)}>
          <div className="bg-white w-full max-w-lg rounded-t-xl sm:rounded-xl p-4 space-y-3 max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-black text-gray-800">عملاء {clientsOf.agent.name}</p>
              <button onClick={() => setClientsOf(null)} className="p-1 text-gray-500"><X size={18} /></button>
            </div>
            {!clientsOf.data ? <p className="text-center text-xs text-gray-400 py-6">جاري التحميل...</p>
              : (clientsOf.data.clients || []).length === 0 ? <p className="text-center text-xs text-gray-400 py-6">لا يوجد عملاء</p>
              : (
                <>
                  <p className="text-[11px] text-gray-500">{clientsOf.data.clientsCount} عميل — {clientsOf.data.ordersCount} عملية بعمولة — إجمالي العمولات {money(clientsOf.data.totalCommission)}</p>
                  {clientsOf.data.clients.map((c: any) => (
                    <div key={c.id} className="border border-gray-100 rounded-lg p-2.5">
                      <p className="text-xs font-bold text-gray-800">{c.name} <span className="text-gray-400 font-normal">#{c.id}</span></p>
                      <p className="text-[10px] text-gray-400" dir="ltr">{c.email}</p>
                      <p className="text-[10px] text-gray-600 mt-1">إجمالي الشحن {money(c.total_recharge)} · الرصيد {money(c.balance)} · العمولة {money(c.commission)}</p>
                    </div>
                  ))}
                </>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
