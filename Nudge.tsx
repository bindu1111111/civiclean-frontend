import React from 'react';
import { Info, X } from 'lucide-react';
import { motion } from 'motion/react';

export function Nudge() {
  const [visible, setVisible] = React.useState(true);

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-md bg-blue-600 text-white p-4 rounded-2xl shadow-2xl flex items-start gap-3 border border-blue-400"
    >
      <div className="bg-blue-500 p-2 rounded-xl">
        <Info className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold">Did you know?</p>
        <p className="text-xs opacity-90 mt-1 leading-relaxed">
          Proper waste disposal in this area reduces the risk of urban flooding by 30%. Help keep our streets clean!
        </p>
      </div>
      <button onClick={() => setVisible(false)} className="opacity-60 hover:opacity-100">
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
