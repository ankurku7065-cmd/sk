import React, { useEffect, useRef, useState } from 'react';
import { AssistantState } from '../types';
import { Mic, MicOff, Volume2, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VoiceOrbProps {
  state: AssistantState;
  isMicActive: boolean;
  onToggleMic: () => void;
  onReconnect: () => void;
  outputAnalyser: AnalyserNode | null;
  inputAnalyser: AnalyserNode | null;
  errorMessage?: string | null;
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({
  state,
  isMicActive,
  onToggleMic,
  onReconnect,
  outputAnalyser,
  inputAnalyser,
  errorMessage,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dataArray = new Uint8Array(128);

    const render = () => {
      animationFrameId = requestAnimationFrame(render);

      let activeAnalyser = null;
      if (state === 'speaking' && outputAnalyser) {
        activeAnalyser = outputAnalyser;
      } else if (state === 'listening' && inputAnalyser) {
        activeAnalyser = inputAnalyser;
      }

      let averageVolume = 0;
      if (activeAnalyser) {
        activeAnalyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        averageVolume = sum / dataArray.length;
      }

      setAudioLevel(averageVolume / 255);

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const baseRadius = 60 + (averageVolume / 255) * 30;

      // Draw pulsating aura
      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        baseRadius * 0.3,
        centerX,
        centerY,
        baseRadius * 1.8
      );

      if (state === 'speaking') {
        gradient.addColorStop(0, 'rgba(129, 140, 248, 0.8)'); // Indigo/Purple
        gradient.addColorStop(0.5, 'rgba(192, 132, 252, 0.4)'); // Purple
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
      } else if (state === 'listening') {
        gradient.addColorStop(0, 'rgba(56, 189, 248, 0.8)'); // Sky/Blue
        gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.4)'); // Indigo
        gradient.addColorStop(1, 'rgba(56, 189, 248, 0)');
      } else if (state === 'executing') {
        gradient.addColorStop(0, 'rgba(52, 211, 153, 0.8)'); // Emerald
        gradient.addColorStop(0.5, 'rgba(16, 185, 129, 0.4)');
        gradient.addColorStop(1, 'rgba(52, 211, 153, 0)');
      } else {
        gradient.addColorStop(0, 'rgba(79, 70, 229, 0.35)'); // Deep Indigo
        gradient.addColorStop(0.6, 'rgba(147, 51, 234, 0.15)');
        gradient.addColorStop(1, 'rgba(79, 70, 229, 0)');
      }

      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 1.8, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw dynamic frequency circular wave
      if (activeAnalyser && averageVolume > 2) {
        ctx.beginPath();
        const bars = 48;
        const step = (Math.PI * 2) / bars;

        for (let i = 0; i < bars; i++) {
          const sampleIndex = Math.floor((i / bars) * dataArray.length);
          const val = dataArray[sampleIndex] / 255;
          const barHeight = val * 32;
          const angle = i * step;

          const r = baseRadius + barHeight;
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.strokeStyle =
          state === 'speaking'
            ? 'rgba(192, 132, 252, 0.9)'
            : 'rgba(96, 165, 250, 0.9)';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [state, outputAnalyser, inputAnalyser]);

  const getStateLabel = () => {
    switch (state) {
      case 'speaking':
        return { text: 'Arushi Speaking...', color: 'bg-purple-500/10 text-purple-300 border-purple-500/30' };
      case 'listening':
        return { text: 'Listening...', color: 'bg-blue-500/10 text-blue-300 border-blue-500/30 animate-pulse' };
      case 'thinking':
        return { text: 'Thinking...', color: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30 animate-pulse' };
      case 'executing':
        return { text: 'Executing Device Action...', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' };
      case 'connecting':
        return { text: 'Connecting Live Voice...', color: 'bg-sky-500/10 text-sky-300 border-sky-500/30' };
      default:
        return { text: 'Ready • Tap to Speak', color: 'bg-white/5 text-slate-300 border-white/10' };
    }
  };

  const status = getStateLabel();

  return (
    <div className="flex flex-col items-center justify-center relative p-2">
      {/* Immersive Glowing Orb Container */}
      <div className="relative flex items-center justify-center">
        {/* Ambient Blur Radiations */}
        <div className="absolute w-80 h-80 rounded-full bg-blue-500/10 blur-[70px] pointer-events-none" />
        <div className="absolute w-64 h-64 rounded-full bg-purple-500/10 blur-[50px] pointer-events-none" />

        {/* Gradient Border Ring */}
        <div className="w-64 h-64 sm:w-72 sm:h-72 rounded-full bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-600 p-[1.5px] flex items-center justify-center shadow-[0_0_80px_rgba(79,70,229,0.3)] relative">
          <div className="w-full h-full rounded-full bg-[#020204] flex items-center justify-center relative overflow-hidden">
            {/* Radial Vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#020204_75%)] z-10 pointer-events-none" />

            {/* Visual Canvas */}
            <canvas
              ref={canvasRef}
              width={288}
              height={288}
              className="absolute inset-0 pointer-events-none z-0"
            />

            {/* Center Interactive Button */}
            <motion.button
              id="toggle-mic-btn"
              onClick={onToggleMic}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              className={`relative z-20 w-24 h-24 sm:w-28 sm:h-28 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-300 border backdrop-blur-md ${
                state === 'speaking'
                  ? 'bg-purple-600/80 border-purple-300/80 shadow-[0_0_30px_rgba(168,85,247,0.5)] text-white'
                  : state === 'listening'
                  ? 'bg-blue-600/80 border-blue-300/80 shadow-[0_0_30px_rgba(59,130,246,0.5)] text-white'
                  : state === 'executing'
                  ? 'bg-emerald-600/80 border-emerald-300/80 shadow-[0_0_30px_rgba(16,185,129,0.5)] text-white'
                  : isMicActive
                  ? 'bg-indigo-600/80 border-indigo-300/80 shadow-[0_0_30px_rgba(99,102,241,0.4)] text-white'
                  : 'bg-white/[0.04] border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.08] hover:border-white/20'
              }`}
            >
              {state === 'speaking' ? (
                <Volume2 className="w-8 h-8 sm:w-9 sm:h-9 animate-pulse" />
              ) : isMicActive ? (
                <Mic className="w-8 h-8 sm:w-9 sm:h-9 animate-bounce" />
              ) : (
                <MicOff className="w-8 h-8 sm:w-9 sm:h-9" />
              )}

              <span className="text-[10px] font-semibold tracking-wider uppercase mt-1">
                {state === 'speaking' ? 'Speaking' : isMicActive ? 'Mic On' : 'Tap Mic'}
              </span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Status Badge */}
      <div className="mt-4 flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium border backdrop-blur-md ${status.color}`}
        >
          {state === 'speaking' ? (
            <Volume2 className="w-3.5 h-3.5 text-purple-400" />
          ) : state === 'executing' ? (
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
          ) : (
            <span
              className={`w-2 h-2 rounded-full ${
                state === 'listening'
                  ? 'bg-blue-400 shadow-[0_0_8px_#38bdf8] animate-ping'
                  : state === 'speaking'
                  ? 'bg-purple-400 shadow-[0_0_8px_#c084fc]'
                  : isMicActive
                  ? 'bg-green-500 shadow-[0_0_8px_#22c55e]'
                  : 'bg-slate-500'
              }`}
            />
          )}
          {status.text}
        </span>

        {errorMessage && (
          <button
            onClick={onReconnect}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 transition-colors"
            title="Click to reconnect Live Voice session"
          >
            <RefreshCw className="w-3 h-3" />
            Reconnect
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="mt-2 text-xs text-rose-400 flex items-center gap-1.5 max-w-sm text-center">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
