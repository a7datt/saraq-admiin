import React from "react";
import { ChevronDown, Settings2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

/**
 * قسم "المزيد من التفاصيل" القابل للطي — يظهر أعلى زر الحفظ/الإضافة
 * يخفي الإعدادات المتقدمة (نسبة الربح، التحقق من الاسم، الحقول المخصصة...)
 * ويُبقي الواجهة الأساسية بسيطة واحترافية.
 */

interface Props {
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function MoreDetailsSection({ children, defaultOpen = false }: Props) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3.5 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="flex items-center gap-2 text-xs font-black text-gray-600">
          <Settings2 size={14} className="text-gray-400" />
          المزيد من التفاصيل
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={16} className="text-gray-400" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: "hidden" }}
          >
            <div className="p-3.5 space-y-3 bg-white border-t border-gray-100">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
