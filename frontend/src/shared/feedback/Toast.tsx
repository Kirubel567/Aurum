"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

import {
  useNotificationStore,
  type ToastItem,
} from "@/src/store/notification.store";
import { cn } from "@/lib/utils";

const variantStyles: Record<ToastItem["variant"], string> = {
  success: "border-[#10B981]/30 bg-[#10B981]/10",
  error: "border-[#EF4444]/30 bg-[#EF4444]/10",
  warning: "border-amber-500/30 bg-amber-500/10",
  info: "border-white/[0.08] bg-white/[0.05]",
};

function ToastItemView({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80 }}
      className={cn(
        "flex w-80 items-start gap-3 rounded-lg border p-4 shadow-lg backdrop-blur-md",
        variantStyles[toast.variant]
      )}
    >
      <div className="flex-1">
        <p className="text-sm font-medium">{toast.title}</p>
        {toast.description && (
          <p className="mt-1 text-xs text-muted-foreground">
            {toast.description}
          </p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </motion.div>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useNotificationStore();

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItemView
            key={toast.id}
            toast={toast}
            onDismiss={removeToast}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
