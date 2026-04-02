import React, { useState, useEffect } from 'react';
import { Bell, X, Info, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'alert';
  message: string;
  timestamp: number;
}

export function NotificationSystem() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Simulate a predictive alert after 5 seconds
    const timer = setTimeout(() => {
      const newAlert: Notification = {
        id: Math.random().toString(),
        type: 'warning',
        message: 'High risk of littering detected in Zone A (Market St) within the next 2 hours.',
        timestamp: Date.now()
      };
      setNotifications(prev => [newAlert, ...prev]);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="fixed top-20 right-4 z-[100] w-80 space-y-2 pointer-events-none">
      <AnimatePresence>
        {notifications.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            className={cn(
              "p-4 rounded-2xl shadow-xl border pointer-events-auto flex gap-3",
              n.type === 'warning' ? "bg-orange-50 border-orange-200" : "bg-blue-50 border-blue-200"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
              n.type === 'warning' ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
            )}>
              {n.type === 'warning' ? <AlertTriangle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">Predictive Alert</p>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">{n.message}</p>
            </div>
            <button 
              onClick={() => removeNotification(n.id)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
