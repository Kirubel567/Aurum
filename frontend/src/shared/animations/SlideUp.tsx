"use client";

import { motion } from "framer-motion";

import { MOTION } from "@/src/lib/constants/theme";

interface SlideUpProps {
  children: React.ReactNode;
  duration?: number;
  className?: string;
}

export function SlideUp({
  children,
  duration = MOTION.normal,
  className,
}: SlideUpProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: duration / 1000, ease: MOTION.ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
