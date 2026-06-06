import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle2,
  Info,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react";

import { dictionary } from "@/i18n/dictionary";
import { spring } from "@/components/natrocos-motion";
import type { Language, ToastMessage } from "@/types/natrocos";

export function ToastStack({
  language,
  toasts,
  onDismiss,
}: {
  language: Language;
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}) {
  const t = dictionary[language];
  const toneStyles = {
    info: "bg-[#eef0e9] text-[#20241f] ring-[#20241f]/8 dark:bg-[#1f241d] dark:text-[#f2f4ec] dark:ring-white/10",
    success:
      "bg-[#edf5ee] text-[#1f5f43] ring-[#2f7d59]/18 dark:bg-[#17251d] dark:text-[#a7e0bb] dark:ring-[#77a984]/20",
    warning:
      "bg-[#fbf2df] text-[#7b5520] ring-[#b88936]/20 dark:bg-[#2b2215] dark:text-[#f1cc8a] dark:ring-[#b88936]/25",
  } satisfies Record<ToastMessage["tone"], string>;
  const toneIcons = {
    info: Info,
    success: CheckCircle2,
    warning: TriangleAlert,
  } satisfies Record<ToastMessage["tone"], LucideIcon>;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-end gap-2 px-4 sm:bottom-6 sm:px-6">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const ToastIcon = toneIcons[toast.tone];

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={spring}
              className={`pointer-events-auto w-full max-w-[380px] rounded-lg p-1 shadow-[0_24px_58px_-38px_rgba(32,36,31,0.56)] ring-1 ${toneStyles[toast.tone]}`}
            >
              <div className="flex items-start gap-3 rounded-[7px] bg-white/45 p-3 backdrop-blur dark:bg-white/5">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/58 ring-1 ring-current/10 dark:bg-black/10">
                  <ToastIcon size={16} strokeWidth={1.5} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold tracking-tight">
                    {toast.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed opacity-76">
                    {toast.detail}
                  </p>
                </div>
                <button
                  aria-label={t.common.dismiss}
                  className="grid size-7 shrink-0 place-items-center rounded-full bg-black/5 transition-colors hover:bg-black/10 dark:bg-white/8 dark:hover:bg-white/12"
                  onClick={() => onDismiss(toast.id)}
                  title={t.common.dismiss}
                  type="button"
                >
                  <X size={14} strokeWidth={1.5} />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
