import { AlertTriangle, Pencil, HelpCircle } from "lucide-react";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";

// ===================== CUSTOM DIALOG SYSTEM =====================
interface DialogConfig {
  type: 'confirm' | 'prompt';
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  inputLabel?: string;
  inputDefault?: string;
  inputPlaceholder?: string;
  onConfirm: (value?: string) => void;
  onCancel?: () => void;
  danger?: boolean;
}
let globalShowDialog: ((cfg: DialogConfig) => void) | null = null;

export function showDialog(cfg: DialogConfig) {
  if (globalShowDialog) globalShowDialog(cfg);
}

export function showConfirm(message: string, title: string, onConfirm: () => void, danger = false) {
  showDialog({ type: 'confirm', title, message, confirmText: 'تأكيد', cancelText: 'إلغاء', onConfirm, danger });
}

export function showPromptDialog(message: string, title: string, onConfirm: (val?: string) => void, inputDefault = '', inputPlaceholder = '') {
  showDialog({ type: 'prompt', title, message, confirmText: 'تأكيد', cancelText: 'إلغاء', inputDefault, inputPlaceholder, onConfirm });
}

export const CustomDialogContainer = () => {
  const [dialog, setDialog] = useState<DialogConfig | null>(null);
  const [inputValue, setInputValue] = useState('');
  useEffect(() => {
    globalShowDialog = (cfg) => {
      setInputValue(cfg.inputDefault || '');
      setDialog(cfg);
    };
    return () => { globalShowDialog = null; };
  }, []);
  if (!dialog) return null;
  const handleConfirm = () => {
    const currentDialog = dialog;
    const value = currentDialog.type === 'prompt' ? inputValue : undefined;
    setDialog(null);
    setTimeout(() => {
      currentDialog.onConfirm(value);
    }, 0);
  };
  const handleCancel = () => {
    if (dialog.onCancel) dialog.onCancel();
    setDialog(null);
  };
  return (
    <div className="fixed inset-0 z-[9998] flex items-end justify-center" style={{backdropFilter:'blur(2px)',WebkitBackdropFilter:'blur(2px)',background:'rgba(0,0,0,0.35)'}}>
      <div className="bg-white w-full max-w-sm rounded-t-lg shadow-2xl p-6 space-y-4 animate-slideUp" style={{animation:'slideUpDialog 0.25s ease'}}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${dialog.danger ? 'bg-red-100' : 'bg-brand-light'}`}>
            {dialog.danger ? <AlertTriangle size={20} className='text-red-600'/> : dialog.type === 'prompt' ? <Pencil size={20} className='text-brand'/> : <HelpCircle size={20} className='text-brand'/>}
          </div>
          <div>
            <h3 className={`font-bold text-base ${dialog.danger ? 'text-red-700' : 'text-gray-800'}`}>{dialog.title}</h3>
            <p className="text-gray-500 text-sm leading-snug">{dialog.message}</p>
          </div>
        </div>
        {dialog.type === 'prompt' && (
          <input
            autoFocus
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder={dialog.inputPlaceholder || ''}
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-brand shadow-sm"
            onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); }}
          />
        )}
        <div className="flex gap-3">
          <button onClick={handleCancel} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-bold text-sm">
            {dialog.cancelText || 'إلغاء'}
          </button>
          <button onClick={handleConfirm} className={`flex-1 py-3 rounded-lg font-bold text-sm text-white ${dialog.danger ? 'bg-red-500' : 'bg-brand'}`}>
            {dialog.confirmText || 'تأكيد'}
          </button>
        </div>
      </div>
    </div>
  );
};
// ===================== END CUSTOM DIALOG SYSTEM =====================
