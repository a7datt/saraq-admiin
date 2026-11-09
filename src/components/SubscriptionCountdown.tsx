import { useEffect, useState } from "react";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "منتهي";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  if (days > 0) return `${days} يوم متبقي`;
  return `${hours} ساعة متبقية`;
}

export default function SubscriptionCountdown() {
  const [end, setEnd] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/subscription-status");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setEnd(data.end || null);
          setExpired(!!data.expired);
        }
      } catch {
        /* silent — لا نعطل لوحة التحكم بسبب فشل هذا العداد */
      }
    };
    load();
    const poll = setInterval(load, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(poll); };
  }, []);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(tick);
  }, []);

  if (!end) return null;

  const remainingMs = new Date(end).getTime() - now;
  const isExpired = expired || remainingMs <= 0;

  return (
    <div
      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 ${
        isExpired ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-700"
      }`}
      dir="rtl"
    >
      {isExpired ? "انتهى الاشتراك" : formatRemaining(remainingMs)}
    </div>
  );
}
