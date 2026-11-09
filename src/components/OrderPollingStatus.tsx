import React from "react";

interface OrderPollingStatusProps {
  externalOrderId: string;
  onStatusChange: (status: string, replayApi: any[]) => void;
}

const OrderPollingStatus = ({ externalOrderId, onStatusChange }: OrderPollingStatusProps) => {
  const [polling, setPolling] = React.useState(false);
  const [pollCount, setPollCount] = React.useState(0);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    if (!externalOrderId || done) return;
    let cancelled = false;
    let attempts = 0;
    const interval = setInterval(async () => {
      if (cancelled) { clearInterval(interval); return; }
      attempts++;
      setPollCount(attempts);
      setPolling(true);
      try {
        const token = localStorage.getItem("authToken") || "";
        if (!token) { clearInterval(interval); setDone(true); return; }
        const res = await fetch(`/api/orders/check-external/${encodeURIComponent(externalOrderId)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) { setPolling(false); return; }
        const data = await res.json();
        const status = (data?.status || "").toLowerCase();
        // الـ API قد يُرجع: accept/completed أو reject/rejected/cancelled
        const isFinal = status === "accept" || status === "completed" || status === "reject" || status === "rejected" || status === "cancelled";
        if (isFinal) {
          clearInterval(interval);
          setDone(true);
          onStatusChange(status, Array.isArray(data.replay_api) ? data.replay_api : []);
        }
        // أي حالة أخرى = لا تزال في المعالجة، نكمل الـ polling
      } catch {}
      setPolling(false);
    }, 8000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [externalOrderId]);

  if (done) return null;
  return (
    <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 space-y-1">
      <div className="flex items-center gap-2">
        {polling
          ? <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"/>
          : <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse"/>}
        <p className="text-xs font-bold text-amber-700">جاري متابعة حالة الطلب تلقائياً...</p>
      </div>
      <p className="text-[10px] text-amber-500">المحاولة {pollCount} · يتحقق كل 8 ثوانٍ · ينتهي تلقائياً عند تغيير الحالة</p>
    </div>
  );
};

export default OrderPollingStatus;
