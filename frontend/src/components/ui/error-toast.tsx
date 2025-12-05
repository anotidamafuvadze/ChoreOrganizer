import { AnimatePresence, motion } from "motion/react";
import React from "react";

interface ErrorToastProps {
  message?: string | null;
}

export default function ErrorToast({ message }: ErrorToastProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 transform-gpu z-50 pointer-events-none"
        >
          <div className="pointer-events-auto bg-red-100 border border-red-400 text-red-700 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 min-w-[300px] justify-center">
            <span className="text-sm font-medium text-center">{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
