import React from 'react';
import { DeviceActionLog } from '../types';
import { Phone, MessageSquare, ExternalLink, Smartphone, CheckCircle, AlertTriangle, X, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ActionHUDProps {
  currentAction: DeviceActionLog | null;
  onDismiss: () => void;
  onOpenDialer?: (phoneNumber: string) => void;
}

export const ActionHUD: React.FC<ActionHUDProps> = ({
  currentAction,
  onDismiss,
  onOpenDialer,
}) => {
  if (!currentAction) return null;

  const { toolName, parameters, result } = currentAction;

  const getToolIcon = () => {
    switch (toolName) {
      case 'openWhatsApp':
        return <MessageSquare className="w-5 h-5 text-emerald-400" />;
      case 'makeCall':
      case 'callContact':
        return <Phone className="w-5 h-5 text-blue-400" />;
      case 'openApp':
        return <Smartphone className="w-5 h-5 text-amber-400" />;
      case 'openUrl':
        return <ExternalLink className="w-5 h-5 text-purple-400" />;
      default:
        return <Radio className="w-5 h-5 text-indigo-400" />;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        className="w-full max-w-xl mx-auto mb-3 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl text-slate-100 relative overflow-hidden"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-200">
              {getToolIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                  Native Bridge Action: {toolName}
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    result.success
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 shadow-[0_0_8px_rgba(34,197,94,0.3)]'
                      : result.actionType === 'clarification_needed'
                      ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                      : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {result.success ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (
                    <AlertTriangle className="w-3 h-3" />
                  )}
                  {result.actionType.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <h4 className="text-sm font-medium text-slate-100 mt-1">
                {result.message}
              </h4>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar accent */}
        <div className="mt-3 h-1 w-full bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
              result.success
                ? 'bg-gradient-to-r from-blue-500 to-emerald-500 w-full'
                : 'bg-amber-500 w-2/3'
            }`}
          />
        </div>

        {/* Action Details & Quick Links */}
        <div className="mt-3 pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">Parameters:</span>
            <span className="font-mono bg-white/5 border border-white/5 px-2 py-0.5 rounded text-blue-300 text-[11px]">
              {JSON.stringify(parameters)}
            </span>
          </div>

          {result.target && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-slate-500">Target URI:</span>
              <a
                href={result.target}
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:text-blue-300 underline font-mono flex items-center gap-1 text-[11px]"
              >
                {result.target.length > 30 ? result.target.slice(0, 30) + '...' : result.target}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
