import React from 'react';
import { DeviceActionLog } from '../types';
import { Smartphone, CheckCircle, AlertCircle, ToggleLeft, ToggleRight, Radio, RefreshCw, X } from 'lucide-react';
import { motion } from 'motion/react';

interface BridgeInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  isNativeSimulated: boolean;
  onToggleNativeMode: (val: boolean) => void;
  hasRealBridge: boolean;
  actionLogs: DeviceActionLog[];
}

export const BridgeInspector: React.FC<BridgeInspectorProps> = ({
  isOpen,
  onClose,
  isNativeSimulated,
  onToggleNativeMode,
  hasRealBridge,
  actionLogs,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-xl bg-[#080812] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100">Android App Action Bridge</h3>
              <p className="text-xs text-slate-400">
                Inspect Native JavaScript Bridge & Platform Execution
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bridge Mode Config */}
        <div className="p-4 bg-white/[0.02] border-b border-white/10 space-y-3">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
            <div>
              <span className="text-xs font-semibold text-slate-200 block">
                Platform Environment
              </span>
              <span className="text-[11px] text-slate-400">
                {hasRealBridge
                  ? 'Active Hardware Android Native Bridge Detected'
                  : isNativeSimulated
                  ? 'Simulated Android APK (Capacitor/WebView) Bridge'
                  : 'Standard Web Browser (HTTPS & Deep Links Mode)'}
              </span>
            </div>
            <button
              onClick={() => onToggleNativeMode(!isNativeSimulated)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-200 text-xs font-medium transition-all shadow-sm"
            >
              {isNativeSimulated ? (
                <>
                  <ToggleRight className="w-4 h-4 text-emerald-400" />
                  <span>APK Mode: ON</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-4 h-4 text-slate-400" />
                  <span>Web Browser Mode</span>
                </>
              )}
            </button>
          </div>

          {/* Bridge Methods Supported */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-300">
            <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>openApp(appName)</span>
            </div>
            <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>makeCall(phone)</span>
            </div>
            <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>callContact(name)</span>
            </div>
            <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>openWhatsApp()</span>
            </div>
            <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>openUrl(url)</span>
            </div>
            <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Contacts Intent</span>
            </div>
          </div>
        </div>

        {/* Live Execution Logs */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            Recent Bridge Telemetry ({actionLogs.length})
          </h4>

          {actionLogs.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No device actions executed yet. Say "Open WhatsApp" or "Call Mom" to test!
            </div>
          ) : (
            actionLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-white/[0.02] border border-white/10 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-blue-300 font-semibold">
                    {log.toolName}()
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-slate-300 font-light">{log.result.message}</p>
                <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                  <span>Type: {log.result.actionType}</span>
                  {log.result.target && <span>Target: {log.result.target}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};
