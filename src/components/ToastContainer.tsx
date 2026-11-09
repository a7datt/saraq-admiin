/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { CheckCircle, XCircle, Info } from "lucide-react";

// ===================== TOAST SYSTEM =====================
type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; message: string; type: ToastType; }

let toastIdCounter = 0;
let globalShowToast: ((msg: string, type?: ToastType) => void) | null = null;

export function showToast(msg: string, type: ToastType = 'info') {
  if (globalShowToast) globalShowToast(msg, type);
}

export const ToastContainer = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => {
    globalShowToast = (msg, type = 'info') => {
      const id = ++toastIdCounter;
      setToasts(prev => [...prev, { id, message: msg, type }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    };
    return () => { globalShowToast = null; };
  }, []);
  const colors: Record<ToastType, string> = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };
  const iconMap: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle size={16} className="shrink-0" />,
    error:   <XCircle    size={16} className="shrink-0" />,
    info:    <Info       size={16} className="shrink-0" />,
  };
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none" style={{minWidth:'260px',maxWidth:'90vw'}}>
      {toasts.map(t => (
        <div key={t.id} className={`${colors[t.type]} text-white px-5 py-3 rounded-lg shadow-xl flex items-center gap-2 text-sm font-bold`}
          style={{animation:'toastIn 0.3s ease, toastOut 0.4s ease 3.1s forwards'}}>
          {iconMap[t.type]}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
};
// ===================== END TOAST SYSTEM =====================
