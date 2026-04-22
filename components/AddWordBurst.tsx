"use client";

import { motion } from "framer-motion";

export function AddWordBurst({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      <motion.div
        className="h-24 w-24 rounded-full border-2 border-[#8B7355]/40"
        initial={{ scale: 0.5, opacity: 0.8 }}
        animate={{ scale: 2.2, opacity: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
    </motion.div>
  );
}
