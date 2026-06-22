"use client";

import { motion } from "framer-motion";

import { MOTION } from "@/src/lib/constants/theme";

interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export function FadeIn({ children, delay = 0, className }: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: MOTION.normal / 1000, delay: delay / 1000 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
