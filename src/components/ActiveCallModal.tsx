import React, { useEffect, useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ActiveCallModalProps {
  callInfo: { phoneNumber: string; contactName?: string } | null;
  onEndCall: () => void;
}

export const ActiveCallModal: React.FC<ActiveCallModalProps> = ({
  callInfo,
  onEndCall,
}) => {
  const [seconds, setSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (!callInfo) {
      setSeconds(0);
      return;
    }
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [callInfo]);

  if (!callInfo) return null;

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="w-full max-w-sm bg-[#080812] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center text-slate-100 relative overflow-hidden"
        >
          {/* Ambient Glow */}
          <div className="absolute w-40 h-40 rounded-full bg-blue-500/10 blur-[50px] pointer-events-none" />

          {/* Top pulse ring */}
          <div className="w-24 h-24 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 relative z-10">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <User className="w-8 h-8" />
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-blue-500/40 animate-ping opacity-30" />
          </div>

          <h3 className="text-xl font-bold text-slate-100 z-10">
            {callInfo.contactName || 'Dialing...'}
          </h3>
          <p className="text-sm font-mono text-slate-400 mt-1 z-10">
            {callInfo.phoneNumber}
          </p>

          <div className="mt-4 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-emerald-400 flex items-center gap-2 z-10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse" />
            Connected • {formatTime(seconds)}
          </div>

          {/* Quick in-call controls */}
          <div className="mt-8 flex items-center justify-center gap-6 z-10">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-3.5 rounded-full border transition-all ${
                isMuted
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
              }`}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <button
              onClick={onEndCall}
              className="p-4 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/40 transition-all hover:scale-105 active:scale-95"
            >
              <PhoneOff className="w-6 h-6" />
            </button>

            <button
              className="p-3.5 rounded-full bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 transition-all"
            >
              <Volume2 className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
