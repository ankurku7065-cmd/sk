import React from 'react';
import { Play, Sparkles, MessageSquare, Phone, Volume2, Globe, ShieldAlert } from 'lucide-react';
import { motion } from 'motion/react';

interface TestCaseRunnerProps {
  onRunTestPrompt: (promptText: string) => void;
  onInterrupt: () => void;
  isLiveConnected: boolean;
}

export const TestCaseRunner: React.FC<TestCaseRunnerProps> = ({
  onRunTestPrompt,
  onInterrupt,
  isLiveConnected,
}) => {
  const TEST_CASES = [
    {
      id: 1,
      title: '1. Hello Arushi',
      prompt: 'Hello Arushi.',
      category: 'Voice Output',
      desc: 'Gemini Live voice greeting',
      icon: <Volume2 className="w-3.5 h-3.5 text-blue-400" />,
      color: 'hover:border-blue-500/40 hover:bg-blue-500/10',
    },
    {
      id: 2,
      title: '2. Hindi Language',
      prompt: 'Hindi mein baat karo.',
      category: 'Multi-Language',
      desc: 'Auto-switches to Hindi voice',
      icon: <Globe className="w-3.5 h-3.5 text-emerald-400" />,
      color: 'hover:border-emerald-500/40 hover:bg-emerald-500/10',
    },
    {
      id: 3,
      title: '3. English Language',
      prompt: 'Talk to me in English.',
      category: 'Multi-Language',
      desc: 'Auto-switches to English voice',
      icon: <Globe className="w-3.5 h-3.5 text-blue-400" />,
      color: 'hover:border-blue-500/40 hover:bg-blue-500/10',
    },
    {
      id: 4,
      title: '4. Hinglish Language',
      prompt: 'Hinglish mein baat karo.',
      category: 'Multi-Language',
      desc: 'Natural conversational Hinglish',
      icon: <Globe className="w-3.5 h-3.5 text-purple-400" />,
      color: 'hover:border-purple-500/40 hover:bg-purple-500/10',
    },
    {
      id: 5,
      title: '5. WhatsApp (Hindi)',
      prompt: 'WhatsApp kholo.',
      category: 'App Control',
      desc: 'Executes openWhatsApp tool',
      icon: <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />,
      color: 'hover:border-emerald-500/40 hover:bg-emerald-500/10',
    },
    {
      id: 6,
      title: '6. Open WhatsApp (Eng)',
      prompt: 'Open WhatsApp.',
      category: 'App Control',
      desc: 'Executes openWhatsApp tool',
      icon: <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />,
      color: 'hover:border-emerald-500/40 hover:bg-emerald-500/10',
    },
    {
      id: 7,
      title: '7. Call Mummy (Alias)',
      prompt: 'Mummy ko call karo.',
      category: 'Calling',
      desc: 'Finds Mummy (+91 98765 43210)',
      icon: <Phone className="w-3.5 h-3.5 text-indigo-400" />,
      color: 'hover:border-indigo-500/40 hover:bg-indigo-500/10',
    },
    {
      id: 8,
      title: '8. Call Rahul (Clarification)',
      prompt: 'Call Rahul.',
      category: 'Calling Safety',
      desc: 'Finds 2 Rahuls, asks clarification',
      icon: <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />,
      color: 'hover:border-amber-500/40 hover:bg-amber-500/10',
    },
    {
      id: 9,
      title: '9. Direct Number Call',
      prompt: 'Call 9876543210.',
      category: 'Calling',
      desc: 'Dials raw number 9876543210',
      icon: <Phone className="w-3.5 h-3.5 text-blue-400" />,
      color: 'hover:border-blue-500/40 hover:bg-blue-500/10',
    },
  ];

  return (
    <div className="w-full bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest">
            Specification Test Suite
          </h3>
        </div>

        {/* Interruption Test Button #10 */}
        <button
          onClick={onInterrupt}
          className="px-3 py-1 rounded-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[11px] font-medium flex items-center gap-1.5 transition-all shadow-sm"
          title="Test Case #10: User interrupts Arushi while speaking"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shadow-[0_0_6px_#f43f5e] animate-ping" />
          Test Interruption (#10)
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {TEST_CASES.map((tc) => (
          <motion.button
            key={tc.id}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onRunTestPrompt(tc.prompt)}
            className={`p-3 rounded-xl bg-white/[0.02] border border-white/10 text-left transition-all group flex flex-col justify-between ${tc.color}`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                {tc.icon}
                {tc.title}
              </span>
              <Play className="w-3 h-3 text-slate-500 group-hover:text-blue-400 transition-colors" />
            </div>
            <p className="text-[11px] text-slate-300/90 font-light italic">"{tc.prompt}"</p>
            <span className="text-[10px] text-slate-500 mt-1.5 block">
              {tc.desc}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
