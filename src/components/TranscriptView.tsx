import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import { Bot, User, Sparkles, Phone, MessageSquare, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';

interface TranscriptViewProps {
  messages: ChatMessage[];
  liveUserTranscript?: string;
  liveAssistantTranscript?: string;
}

export const TranscriptView: React.FC<TranscriptViewProps> = ({
  messages,
  liveUserTranscript,
  liveAssistantTranscript,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, liveUserTranscript, liveAssistantTranscript]);

  const detectLanguage = (text: string): string => {
    // Detect Devanagari script (Hindi / Marathi)
    if (/[\u0900-\u097F]/.test(text)) return 'Hindi / Devanagari';
    // Detect Tamil
    if (/[\u0B80-\u0BFF]/.test(text)) return 'Tamil';
    // Detect Telugu
    if (/[\u0C00-\u0C7F]/.test(text)) return 'Telugu';
    // Detect Bengali
    if (/[\u0980-\u09FF]/.test(text)) return 'Bengali';
    // Detect Gujarati
    if (/[\u0A80-\u0AFF]/.test(text)) return 'Gujarati';
    // Detect Hinglish patterns
    const hinglishWords = ['kholo', 'karo', 'chalao', 'lagao', 'baat', 'mein', 'kya', 'hai', 'kaise', 'batao', 'mummy', 'bhai', 'namaste', 'kaise ho'];
    const lower = text.toLowerCase();
    if (hinglishWords.some((w) => lower.includes(w))) return 'Hinglish';
    return 'English / Auto';
  };

  return (
    <div
      ref={scrollRef}
      className="flex-1 w-full overflow-y-auto px-4 py-4 space-y-3.5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
    >
      {messages.length === 0 && !liveUserTranscript && !liveAssistantTranscript && (
        <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-12">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">
            Arushi is listening
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
            Speak in Hindi, English, Hinglish, or any regional language. Say "WhatsApp kholo", "Call Mom", "Rahul ko call karo", or "Open YouTube".
          </p>
        </div>
      )}

      {messages.map((msg) => {
        const lang = msg.language || detectLanguage(msg.text);

        if (msg.role === 'action' && msg.actionDetails) {
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="my-2 p-3 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/10 text-xs flex items-center justify-between gap-3 text-slate-300"
            >
              <div className="flex items-center gap-2">
                {msg.actionDetails.toolName === 'openWhatsApp' ? (
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                ) : msg.actionDetails.toolName === 'openApp' ? (
                  <Sparkles className="w-4 h-4 text-amber-400" />
                ) : (
                  <Phone className="w-4 h-4 text-blue-400" />
                )}
                <span className="font-medium text-slate-200">{msg.text}</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </motion.div>
          );
        }

        const isUser = msg.role === 'user';

        return (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${
                isUser
                  ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md shadow-purple-500/20'
              }`}
            >
              {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`max-w-[82%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                isUser
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none shadow-md shadow-blue-600/20'
                  : 'bg-white/[0.04] backdrop-blur-md border border-white/10 text-slate-200 rounded-tl-none shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-bold text-slate-300">
                  {isUser ? 'You' : 'Arushi'}
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/10 text-slate-400 font-mono">
                  {lang}
                </span>
              </div>
              <p className="leading-relaxed whitespace-pre-wrap font-light">{msg.text}</p>
            </div>
          </motion.div>
        );
      })}

      {/* Live Active Streaming User / Assistant Transcript */}
      {liveUserTranscript && (
        <div className="flex items-start gap-2.5 flex-row-reverse">
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0 text-white shadow-md shadow-blue-500/20">
            <User className="w-4 h-4" />
          </div>
          <div className="max-w-[80%] rounded-2xl rounded-tr-none px-4 py-2.5 text-sm bg-blue-600/50 text-white/90 border border-blue-400/30 animate-pulse backdrop-blur-md">
            <span className="text-[10px] block text-blue-200 font-medium">Listening...</span>
            <p className="italic font-light">{liveUserTranscript}</p>
          </div>
        </div>
      )}

      {liveAssistantTranscript && (
        <div className="flex items-start gap-2.5 flex-row">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shrink-0 text-white shadow-md shadow-purple-500/20">
            <Bot className="w-4 h-4" />
          </div>
          <div className="max-w-[80%] rounded-2xl rounded-tl-none px-4 py-2.5 text-sm bg-white/[0.05] backdrop-blur-md border border-purple-500/30 text-slate-100 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
            <span className="text-[10px] block text-purple-300 font-medium">Arushi speaking...</span>
            <p className="leading-relaxed font-light">{liveAssistantTranscript}</p>
          </div>
        </div>
      )}
    </div>
  );
};
