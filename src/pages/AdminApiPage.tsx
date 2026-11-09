import React, { useState, useEffect, useMemo } from "react";
import {
  Key,
  Plus,
  X,
  Search,
  Copy,
  Check,
  Trash2,
  Power,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  ShieldCheck,
  Package,
  LayoutGrid,
} from "lucide-react";
import { showConfirm } from "../components/CustomDialogContainer";

interface AdminApiPageProps {
  adminFetch: (url: string, options?: RequestInit) => Promise<Response>;
  adminUsers?: any[];
}

function relTime(iso?: string | null) {
  if (!iso) return "لم يُستخدم بعد";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  const d = Math.floor(h / 24);
  return `منذ ${d} يوم`;
}

const AdminApiPage: React.FC<AdminApiPageProps> = ({ adminFetch, adminUsers: adminUsersProp }) => {
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [detailToken, setDetailToken] = useState<any | null>(null);
  const [adminUsersFetched, setAdminUsersFetched] = useState<any[]>([]);
  const adminUsers = adminUsersProp && adminUsersProp.length > 0 ? adminUsersProp : adminUsersFetched;

  const fetchTokens = async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/api/admin/api-tokens");
      const data = await res.json();
      setTokens(Array.isArray(data) ? data : []);
    } catch {
      setTokens([]);
    } finally {
      setLoading(false);
    }
  };

  // إن لم تُمرَّر قائمة مستخدمين من الأب، نجلبها محلياً (تُستخدم فقط لاختيار مستخدم عند إنشاء توكن جديد)
  const fetchUsersFallback = async () => {
    if (adminUsersProp && adminUsersProp.length > 0) return;
    try {
      const res = await adminFetch("/api/admin/users", { headers: { "x-admin-token": localStorage.getItem("adminToken") || "" } });
      const data = await res.json();
      setAdminUsersFetched(Array.isArray(data) ? data : (Array.isArray(data?.users) ? data.users : []));
    } catch {
      setAdminUsersFetched([]);
    }
  };

  useEffect(() => { fetchTokens(); fetchUsersFallback(); }, []);

  const handleToggle = async (t: any) => {
    try {
      await adminFetch(`/api/admin/api-tokens/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !t.enabled }),
      });
      fetchTokens();
    } catch {}
  };

  const handleDelete = async (id: number) => {
    showConfirm("هل أنت متأكد من إلغاء هذا التوكن نهائياً؟ لا يمكن التراجع عن هذا الإجراء.", "إلغاء التوكن", async () => {
      try {
        await adminFetch(`/api/admin/api-tokens/${id}`, { method: "DELETE" });
        fetchTokens();
      } catch {}
    }, true);
  };

  return (
    <div className="space-y-3" dir="rtl">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400 px-0.5">{tokens.length} توكن</p>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 bg-[var(--brand)] text-white text-xs font-bold px-3.5 py-2.5 rounded-lg shadow-sm active:scale-95 transition-all"
        >
          <Plus size={15} /> إنشاء توكن جديد
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">جارِ التحميل...</div>
      ) : tokens.length === 0 ? (
        <div className="text-center py-16">
          <Key size={40} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-400 text-sm font-medium">لا توجد توكنات بعد</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tokens.map((t: any) => (
            <div key={t.id} className="bg-white rounded-lg border border-gray-100 shadow-sm p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-gray-800 truncate">{t.name}</p>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${t.enabled ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                      {t.enabled ? "مفعّل" : "معطّل"}
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${t.scope === "all" ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"}`}>
                      {t.scope === "all" ? "جميع المنتجات" : "منتجات محددة"}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 font-mono mt-1 tracking-wider">{t.token_masked}</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    المالك: {t.users?.name || t.users?.phone || `#${t.user_id}`} · {relTime(t.last_used_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-2.5">
                {t.scope === "selected" && (
                  <button
                    onClick={() => setDetailToken(t)}
                    className="flex-1 text-xs font-bold text-[var(--brand)] bg-gray-50 rounded-md py-2 active:scale-95 transition-all"
                  >
                    إدارة المنتجات
                  </button>
                )}
                <button
                  onClick={() => handleToggle(t)}
                  className={`flex-1 flex items-center justify-center gap-1 text-xs font-bold rounded-md py-2 active:scale-95 transition-all ${t.enabled ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600"}`}
                >
                  <Power size={13} /> {t.enabled ? "تعطيل" : "تفعيل"}
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="flex items-center justify-center gap-1 text-xs font-bold text-red-500 bg-red-50 rounded-md py-2 px-3 active:scale-95 transition-all"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateTokenModal
          adminFetch={adminFetch}
          adminUsers={adminUsers}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchTokens(); }}
        />
      )}

      {detailToken && (
        <TokenScopeModal
          token={detailToken}
          adminFetch={adminFetch}
          onClose={() => setDetailToken(null)}
        />
      )}
    </div>
  );
};

// ═══ Create Token Modal ═══
const CreateTokenModal: React.FC<{
  adminFetch: (url: string, options?: RequestInit) => Promise<Response>;
  adminUsers: any[];
  onClose: () => void;
  onCreated: () => void;
}> = ({ adminFetch, adminUsers, onClose, onCreated }) => {
  const [name, setName] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [allowedIps, setAllowedIps] = useState("");
  const [canOrder, setCanOrder] = useState(true);
  const [scope, setScope] = useState<"all" | "selected">("all");
  const [saving, setSaving] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return [];
    const q = userSearch.toLowerCase();
    return (adminUsers || [])
      .filter((u: any) =>
        String(u.name || u.username || "").toLowerCase().includes(q) ||
        String(u.phone || "").includes(q) ||
        String(u.id).includes(q)
      )
      .slice(0, 8);
  }, [adminUsers, userSearch]);

  const handleCreate = async () => {
    if (!name.trim() || !selectedUser) return;
    setSaving(true);
    try {
      const res = await adminFetch("/api/admin/api-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          user_id: selectedUser.id,
          allowed_ips: allowedIps.split("\n").map(s => s.trim()).filter(Boolean),
          can_order: canOrder,
          scope,
        }),
      });
      const data = await res.json();
      if (data?.token) setCreatedToken(data.token);
    } catch {} finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    if (!createdToken) return;
    navigator.clipboard.writeText(createdToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={createdToken ? onCreated : onClose} />
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto p-4" dir="rtl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-gray-800 flex items-center gap-1.5"><Key size={16}/> إنشاء توكن جديد</h3>
          <button onClick={createdToken ? onCreated : onClose} className="text-gray-400 p-1"><X size={18}/></button>
        </div>

        {createdToken ? (
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 font-bold">لن يظهر هذا التوكن مرة أخرى — انسخه الآن</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 flex items-center gap-2">
              <code className="flex-1 text-[11px] font-mono text-gray-700 break-all">{createdToken}</code>
              <button onClick={handleCopy} className="shrink-0 w-8 h-8 rounded-md bg-white border border-gray-200 flex items-center justify-center active:scale-95">
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-gray-500" />}
              </button>
            </div>
            <button onClick={onCreated} className="w-full bg-[var(--brand)] text-white text-sm font-bold py-3 rounded-lg active:scale-95 transition-all">
              تم، إغلاق
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">اسم التوكن</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="مثال: تطبيق الجوال"
                className="w-full bg-gray-50 border border-gray-100 rounded-md px-3 py-2.5 text-xs outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">المستخدم المالك</label>
              {selectedUser ? (
                <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-md px-3 py-2.5">
                  <span className="text-xs font-bold text-gray-700">{selectedUser.name || selectedUser.username || selectedUser.phone}</span>
                  <button onClick={() => { setSelectedUser(null); setUserSearch(""); }} className="text-gray-400"><X size={14}/></button>
                </div>
              ) : (
                <div className="relative">
                  <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    placeholder="ابحث بالاسم أو الرقم..."
                    className="w-full bg-gray-50 border border-gray-100 rounded-md pr-9 pl-3 py-2.5 text-xs outline-none"
                  />
                  {filteredUsers.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-100 rounded-md shadow-lg max-h-40 overflow-y-auto">
                      {filteredUsers.map((u: any) => (
                        <button
                          key={u.id}
                          onClick={() => { setSelectedUser(u); setUserSearch(""); }}
                          className="w-full text-right px-3 py-2 text-xs hover:bg-gray-50 transition-colors"
                        >
                          {u.name || u.username || u.phone} <span className="text-gray-400">#{u.id}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">عناوين IP المسموحة</label>
              <textarea
                value={allowedIps}
                onChange={e => setAllowedIps(e.target.value)}
                placeholder={"192.168.1.1\n10.0.0.5"}
                rows={3}
                className="w-full bg-gray-50 border border-gray-100 rounded-md px-3 py-2.5 text-xs outline-none font-mono"
              />
              <p className="text-[10px] text-gray-400 mt-1">إذا تركت الحقل فارغًا، فسيتم قبول الطلبات من أي عنوان IP</p>
            </div>

            <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-md px-3 py-2.5">
              <span className="text-xs font-bold text-gray-600">السماح بإنشاء طلبات</span>
              <button
                onClick={() => setCanOrder(v => !v)}
                className={`w-10 h-6 rounded-full transition-colors relative ${canOrder ? "bg-[var(--brand)]" : "bg-gray-300"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${canOrder ? "translate-x-[-1.25rem]" : "translate-x-[-0.125rem]"} right-0`} />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1.5">نطاق الوصول</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setScope("all")}
                  className={`py-2.5 rounded-md text-xs font-bold border transition-all ${scope === "all" ? "bg-purple-50 border-purple-300 text-purple-600" : "bg-white border-gray-100 text-gray-500"}`}
                >
                  جميع المنتجات
                </button>
                <button
                  onClick={() => setScope("selected")}
                  className={`py-2.5 rounded-md text-xs font-bold border transition-all ${scope === "selected" ? "bg-blue-50 border-blue-300 text-blue-600" : "bg-white border-gray-100 text-gray-500"}`}
                >
                  منتجات محددة
                </button>
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={!name.trim() || !selectedUser || saving}
              className="w-full bg-[var(--brand)] text-white text-sm font-bold py-3 rounded-lg active:scale-95 transition-all disabled:opacity-40"
            >
              {saving ? "جارِ الإنشاء..." : "إنشاء التوكن"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ═══ Token Scope (products/categories) Modal ═══
const TokenScopeModal: React.FC<{
  token: any;
  adminFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onClose: () => void;
}> = ({ token, adminFetch, onClose }) => {
  const [tab, setTab] = useState<"products" | "categories">("products");
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [subSubCategories, setSubSubCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [linkedProducts, setLinkedProducts] = useState<Set<number>>(new Set());
  const [linkedCategories, setLinkedCategories] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [catRes, subRes, subSubRes, prodRes, linkedProdRes, linkedCatRes] = await Promise.all([
          adminFetch("/api/categories?admin=1"),
          adminFetch("/api/subcategories?admin=1"),
          adminFetch("/api/sub-sub-categories?admin=1"),
          adminFetch("/api/admin/products-all"),
          adminFetch(`/api/admin/api-tokens/${token.id}/products`),
          adminFetch(`/api/admin/api-tokens/${token.id}/categories`),
        ]);
        const [cats, subs, subSubs, prods, linkedProd, linkedCat] = await Promise.all([
          catRes.json(), subRes.json(), subSubRes.json(), prodRes.json(), linkedProdRes.json(), linkedCatRes.json(),
        ]);
        setCategories(Array.isArray(cats) ? cats : []);
        setSubcategories(Array.isArray(subs) ? subs : []);
        setSubSubCategories(Array.isArray(subSubs) ? subSubs : []);
        setProducts(Array.isArray(prods) ? prods : []);
        setLinkedProducts(new Set((Array.isArray(linkedProd) ? linkedProd : []).map((r: any) => r.product_id)));
        setLinkedCategories(new Set((Array.isArray(linkedCat) ? linkedCat : []).map((r: any) => `${r.category_type}:${r.category_id}`)));
      } catch {} finally {
        setLoading(false);
      }
    };
    load();
  }, [token.id]);

  const toggleExpand = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleProduct = async (productId: number) => {
    const isLinked = linkedProducts.has(productId);
    setLinkedProducts(prev => {
      const next = new Set(prev);
      isLinked ? next.delete(productId) : next.add(productId);
      return next;
    });
    try {
      if (isLinked) {
        await adminFetch(`/api/admin/api-tokens/${token.id}/products`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product_id: productId }),
        });
      } else {
        await adminFetch(`/api/admin/api-tokens/${token.id}/products`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product_id: productId }),
        });
      }
    } catch {}
  };

  const toggleCategory = async (categoryType: string, categoryId: number) => {
    const key = `${categoryType}:${categoryId}`;
    const isLinked = linkedCategories.has(key);
    setLinkedCategories(prev => {
      const next = new Set(prev);
      isLinked ? next.delete(key) : next.add(key);
      return next;
    });
    try {
      if (isLinked) {
        await adminFetch(`/api/admin/api-tokens/${token.id}/categories`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category_type: categoryType, category_id: categoryId }),
        });
      } else {
        await adminFetch(`/api/admin/api-tokens/${token.id}/categories`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category_type: categoryType, category_id: categoryId }),
        });
      }
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto p-4" dir="rtl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-gray-800 truncate">{token.name}</h3>
          <button onClick={onClose} className="text-gray-400 p-1"><X size={18}/></button>
        </div>

        <div className="flex gap-1.5 bg-gray-100 p-1 rounded-lg mb-3">
          <button onClick={() => setTab("products")}
            className={`flex-1 py-2 rounded-md text-xs font-bold flex items-center justify-center gap-1 transition-all ${tab === "products" ? "bg-white text-[var(--brand)] shadow-sm" : "text-gray-500"}`}>
            <Package size={13}/> منتجات فردية
          </button>
          <button onClick={() => setTab("categories")}
            className={`flex-1 py-2 rounded-md text-xs font-bold flex items-center justify-center gap-1 transition-all ${tab === "categories" ? "bg-white text-[var(--brand)] shadow-sm" : "text-gray-500"}`}>
            <LayoutGrid size={13}/> أقسام كاملة
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">جارِ التحميل...</div>
        ) : tab === "products" ? (
          <div className="space-y-2">
            <p className="text-[11px] text-gray-500 font-bold bg-blue-50 text-blue-600 rounded-md px-3 py-2">
              {linkedProducts.size} منتج مفعّل عبر هذا التوكن
            </p>
            {categories.map(cat => {
              const catSubs = subcategories.filter((s: any) => s.category_id === cat.id);
              const catKey = `cat-${cat.id}`;
              return (
                <div key={cat.id} className="border border-gray-100 rounded-lg overflow-hidden">
                  <button onClick={() => toggleExpand(catKey)} className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50">
                    <span className="text-xs font-bold text-gray-700">{cat.name}</span>
                    {expanded.has(catKey) ? <ChevronDown size={14} className="text-gray-400"/> : <ChevronRight size={14} className="text-gray-400"/>}
                  </button>
                  {expanded.has(catKey) && (
                    <div className="px-3 py-1.5 space-y-1">
                      {catSubs.map((sub: any) => {
                        const subKey = `sub-${sub.id}`;
                        const subProducts = products.filter((p: any) => p.subcategory_id === sub.id && !p.sub_sub_category_id);
                        const subSubs = subSubCategories.filter((ss: any) => ss.subcategory_id === sub.id);
                        return (
                          <div key={sub.id} className="border-r-2 border-gray-100 pr-2">
                            <button onClick={() => toggleExpand(subKey)} className="w-full flex items-center justify-between py-1.5">
                              <span className="text-[11px] font-bold text-gray-600">{sub.name}</span>
                              {expanded.has(subKey) ? <ChevronDown size={12} className="text-gray-400"/> : <ChevronRight size={12} className="text-gray-400"/>}
                            </button>
                            {expanded.has(subKey) && (
                              <div className="space-y-1 pb-1">
                                {subProducts.map((p: any) => (
                                  <label key={p.id} className="flex items-center gap-2 py-1 text-[11px] text-gray-600">
                                    <input type="checkbox" checked={linkedProducts.has(p.id)} onChange={() => toggleProduct(p.id)} className="w-4 h-4 rounded" />
                                    {p.name}
                                  </label>
                                ))}
                                {subSubs.map((ss: any) => {
                                  const ssProducts = products.filter((p: any) => p.sub_sub_category_id === ss.id);
                                  const ssKey = `subsub-${ss.id}`;
                                  return (
                                    <div key={ss.id} className="border-r-2 border-gray-100 pr-2">
                                      <button onClick={() => toggleExpand(ssKey)} className="w-full flex items-center justify-between py-1">
                                        <span className="text-[10px] font-bold text-gray-500">{ss.name}</span>
                                        {expanded.has(ssKey) ? <ChevronDown size={11} className="text-gray-400"/> : <ChevronRight size={11} className="text-gray-400"/>}
                                      </button>
                                      {expanded.has(ssKey) && (
                                        <div className="space-y-1 pb-1">
                                          {ssProducts.map((p: any) => (
                                            <label key={p.id} className="flex items-center gap-2 py-1 text-[11px] text-gray-600">
                                              <input type="checkbox" checked={linkedProducts.has(p.id)} onChange={() => toggleProduct(p.id)} className="w-4 h-4 rounded" />
                                              {p.name}
                                            </label>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[11px] text-gray-500 font-bold bg-blue-50 text-blue-600 rounded-md px-3 py-2">
              {linkedCategories.size} قسم مفعّل عبر هذا التوكن
            </p>
            <p className="text-[10px] text-gray-400 flex items-start gap-1.5 bg-gray-50 rounded-md px-3 py-2">
              <ShieldCheck size={13} className="shrink-0 mt-0.5 text-gray-400" />
              أي منتج يُضاف مستقبلاً لهذا القسم سيظهر تلقائياً في الـ API دون أي إجراء إضافي.
            </p>
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-gray-400 px-1">الأقسام الرئيسية</p>
              {categories.map((c: any) => (
                <label key={`c-${c.id}`} className="flex items-center gap-2 py-1.5 px-2 bg-white border border-gray-100 rounded-md text-xs text-gray-700">
                  <input type="checkbox" checked={linkedCategories.has(`category:${c.id}`)} onChange={() => toggleCategory("category", c.id)} className="w-4 h-4 rounded" />
                  {c.name}
                </label>
              ))}
              <p className="text-[10px] font-black text-gray-400 px-1 pt-2">الأقسام الفرعية</p>
              {subcategories.map((s: any) => (
                <label key={`s-${s.id}`} className="flex items-center gap-2 py-1.5 px-2 bg-white border border-gray-100 rounded-md text-xs text-gray-700">
                  <input type="checkbox" checked={linkedCategories.has(`subcategory:${s.id}`)} onChange={() => toggleCategory("subcategory", s.id)} className="w-4 h-4 rounded" />
                  {s.name}
                </label>
              ))}
              <p className="text-[10px] font-black text-gray-400 px-1 pt-2">الأفرع الفرعية</p>
              {subSubCategories.map((ss: any) => (
                <label key={`ss-${ss.id}`} className="flex items-center gap-2 py-1.5 px-2 bg-white border border-gray-100 rounded-md text-xs text-gray-700">
                  <input type="checkbox" checked={linkedCategories.has(`sub_sub_category:${ss.id}`)} onChange={() => toggleCategory("sub_sub_category", ss.id)} className="w-4 h-4 rounded" />
                  {ss.name}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminApiPage;
