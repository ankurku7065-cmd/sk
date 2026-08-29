import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AssistantState, ChatMessage, Contact, DeviceActionLog } from './types';
import { LiveAudioPlayer, LiveAudioRecorder } from './utils/audio';
import { DeviceActionManager, getIsSimulatedNativeMode, setIsSimulatedNativeMode } from './utils/bridge';
import { VoiceOrb } from './components/VoiceOrb';
import { TranscriptView } from './components/TranscriptView';
import { ActionHUD } from './components/ActionHUD';
import { ActiveCallModal } from './components/ActiveCallModal';
import { ContactsManager } from './components/ContactsManager';
import { BridgeInspector } from './components/BridgeInspector';
import { TestCaseRunner } from './components/TestCaseRunner';
import {
  Mic,
  MicOff,
  Send,
  Users,
  Smartphone,
  Sparkles,
  Volume2,
  Phone,
  MessageSquare,
  Globe,
  Radio,
  HelpCircle,
} from 'lucide-react';

export default function App() {
  const [assistantState, setAssistantState] = useState<AssistantState>('idle');
  const [isMicActive, setIsMicActive] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [liveUserTranscript, setLiveUserTranscript] = useState('');
  const [liveAssistantTranscript, setLiveAssistantTranscript] = useState('');
  const [currentAction, setCurrentAction] = useState<DeviceActionLog | null>(null);
  const [actionLogs, setActionLogs] = useState<DeviceActionLog[]>([]);
  const [activeCall, setActiveCall] = useState<{ phoneNumber: string; contactName?: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');

  // Modals
  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const [isBridgeOpen, setIsBridgeOpen] = useState(false);
  const [isNativeSimulated, setIsNativeSimulated] = useState(getIsSimulatedNativeMode());

  // Audio Pipeline Refs
  const playerRef = useRef<LiveAudioPlayer | null>(null);
  const recorderRef = useRef<LiveAudioRecorder | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const isSpeakingRef = useRef(false);

  // Initialize Audio Player & Device Action Listeners
  useEffect(() => {
    const player = new LiveAudioPlayer();
    player.onPlayStateChange = (isPlaying) => {
      isSpeakingRef.current = isPlaying;
      if (isPlaying) {
        setAssistantState('speaking');
      } else {
        setAssistantState(isMicActive ? 'listening' : 'idle');
        setLiveAssistantTranscript('');
      }
    };
    playerRef.current = player;

    const actionManager = DeviceActionManager.getInstance();
    const unsubscribeAction = actionManager.addActionListener((log) => {
      setCurrentAction(log);
      setActionLogs((prev) => [log, ...prev]);

      // Add action log into transcript
      setMessages((prev) => [
        ...prev,
        {
          id: 'msg_act_' + Date.now(),
          role: 'action',
          text: `[Device Action] ${log.result.message}`,
          timestamp: new Date(),
          actionDetails: log,
        },
      ]);
    });

    actionManager.setActiveCallListener((call) => {
      setActiveCall(call);
    });

    return () => {
      unsubscribeAction();
      player.close();
      if (recorderRef.current) {
        recorderRef.current.stop();
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Connect to Gemini Live WebSocket
  const connectLiveWs = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    setAssistantState('connecting');
    setErrorMessage(null);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/live-ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[App] WebSocket connected to Gemini Live.');
      setAssistantState(isMicActive ? 'listening' : 'idle');
    };

    ws.onmessage = async (event) => {
      try {
        const payload = JSON.parse(event.data);

        // 1. Audio data playback
        if (payload.type === 'audio' && payload.data) {
          if (playerRef.current) {
            playerRef.current.playChunk(payload.data);
          }
        }

        // 2. Text transcription from Gemini
        if (payload.type === 'text_chunk' && payload.text) {
          setLiveAssistantTranscript((prev) => prev + payload.text);
        }

        // 3. Tool Call from Gemini Live
        if (payload.type === 'tool_call' && payload.functionCalls) {
          setAssistantState('executing');
          const functionCalls = payload.functionCalls;
          const functionResponses: any[] = [];

          for (const call of functionCalls) {
            const { name, args, id } = call;
            const actionManager = DeviceActionManager.getInstance();
            let executionResult: any = { success: false, message: 'Unhandled function' };

            if (name === 'openWhatsApp') {
              executionResult = await actionManager.executeOpenWhatsApp(args?.message, args?.phoneNumber);
            } else if (name === 'openApp') {
              executionResult = await actionManager.executeOpenApp(args?.appName);
            } else if (name === 'openUrl') {
              executionResult = await actionManager.executeOpenUrl(args?.url);
            } else if (name === 'makeCall') {
              executionResult = await actionManager.executeMakeCall(args?.phoneNumber, args?.reason);
            } else if (name === 'callContact') {
              executionResult = await actionManager.executeCallContact(args?.contactName);
            }

            functionResponses.push({
              id: id || name,
              name: name,
              response: { output: executionResult },
            });
          }

          // Send tool results back to Gemini Live
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: 'tool_response',
                functionResponses,
              })
            );
          }
        }

        // 4. Interruption from user
        if (payload.type === 'interrupted') {
          console.log('[App] Interrupted by user.');
          if (playerRef.current) {
            playerRef.current.interrupt();
          }
          setLiveAssistantTranscript('');
          setAssistantState(isMicActive ? 'listening' : 'idle');
        }

        // 5. Turn completion
        if (payload.type === 'turn_complete') {
          if (liveAssistantTranscript) {
            setMessages((prev) => [
              ...prev,
              {
                id: 'msg_asst_' + Date.now(),
                role: 'assistant',
                text: liveAssistantTranscript,
                timestamp: new Date(),
              },
            ]);
            setLiveAssistantTranscript('');
          }
          if (!isSpeakingRef.current) {
            setAssistantState(isMicActive ? 'listening' : 'idle');
          }
        }

        // 6. Error handling
        if (payload.type === 'error') {
          setErrorMessage(payload.message || 'Gemini Live error occurred.');
          setAssistantState('idle');
        }
      } catch (err: any) {
        console.error('[App] Error processing WS message:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('[App] WebSocket error:', err);
      setErrorMessage('Voice connection error. Please reconnect.');
      setAssistantState('idle');
    };

    ws.onclose = () => {
      console.log('[App] WebSocket closed.');
      if (isMicActive) {
        setIsMicActive(false);
        if (recorderRef.current) recorderRef.current.stop();
      }
      setAssistantState('idle');
    };
  }, [isMicActive, liveAssistantTranscript]);

  // Connect on mount
  useEffect(() => {
    connectLiveWs();
  }, [connectLiveWs]);

  // Toggle Microphone
  const toggleMic = async () => {
    if (playerRef.current) {
      playerRef.current.ensureContext();
    }

    if (isMicActive) {
      // Turn off mic
      if (recorderRef.current) {
        recorderRef.current.stop();
        recorderRef.current = null;
      }
      setIsMicActive(false);
      setAssistantState('idle');
    } else {
      // Turn on mic
      try {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          connectLiveWs();
        }

        const recorder = new LiveAudioRecorder();
        await recorder.start((base64PCM) => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: 'audio',
                data: base64PCM,
              })
            );
          }
        });

        recorderRef.current = recorder;
        setIsMicActive(true);
        setAssistantState('listening');
        setErrorMessage(null);
      } catch (err: any) {
        console.error('Failed to start microphone:', err);
        setErrorMessage('Microphone access denied or unavailable: ' + (err.message || ''));
      }
    }
  };

  // Send Text Prompt / Simulated Voice
  const handleSendText = (textToSend?: string) => {
    const text = (textToSend || textInput).trim();
    if (!text) return;

    if (playerRef.current) {
      playerRef.current.ensureContext();
    }

    // Add user message to transcript
    setMessages((prev) => [
      ...prev,
      {
        id: 'msg_user_' + Date.now(),
        role: 'user',
        text: text,
        timestamp: new Date(),
      },
    ]);

    if (!textToSend) setTextInput('');
    setAssistantState('thinking');

    // Send to Live WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'text',
          text: text,
        })
      );
    } else {
      // Reconnect and send
      connectLiveWs();
      setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'text',
              text: text,
            })
          );
        }
      }, 500);
    }
  };

  // Interruption Test (#10)
  const handleInterrupt = () => {
    if (playerRef.current) {
      playerRef.current.interrupt();
    }
    setLiveAssistantTranscript('');
    setAssistantState(isMicActive ? 'listening' : 'idle');

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'text',
          text: 'Wait, stop.',
        })
      );
    }
  };

  const handleToggleNativeMode = (val: boolean) => {
    setIsNativeSimulated(val);
    setIsSimulatedNativeMode(val);
  };

  return (
    <div className="min-h-screen bg-[#020204] bg-[radial-gradient(circle_at_50%_50%,_#0c0c1a_0%,_#020204_100%)] text-slate-100 flex flex-col font-sans relative overflow-x-hidden selection:bg-blue-500/30 selection:text-blue-200">
      {/* Background Soft Glow Orbs */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[550px] h-[550px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="absolute bottom-10 right-10 w-[450px] h-[450px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="absolute top-1/3 left-10 w-[350px] h-[350px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* Top Header */}
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-40 px-4 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400 tracking-tight">
                  Arushi AI
                </h1>
                <span className="text-[10px] uppercase font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  Multilingual Assistant
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Gemini Live Voice • Real Device Control • Android Action Bridge
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2.5">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300">
              <span
                className={`w-2 h-2 rounded-full ${
                  wsRef.current?.readyState === WebSocket.OPEN
                    ? 'bg-emerald-400 shadow-[0_0_8px_#22c55e]'
                    : 'bg-rose-500'
                }`}
              />
              <span className="font-medium text-[11px]">
                {wsRef.current?.readyState === WebSocket.OPEN
                  ? 'Gemini Live Connected'
                  : 'Disconnected'}
              </span>
            </div>

            <button
              onClick={() => setIsContactsOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
              title="View & Edit Address Book Contacts"
            >
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Address Book</span>
            </button>

            <button
              onClick={() => setIsBridgeOpen(true)}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm ${
                isNativeSimulated
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
              }`}
              title="Inspect Android JavaScript Action Bridge"
            >
              <Smartphone className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">
                {isNativeSimulated ? 'Android APK' : 'Bridge'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        {/* Left Column: Voice Orb, Actions, and Quick Test Suite */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          {/* Voice Orb Card */}
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center">
            <div className="absolute top-3.5 left-4 flex items-center gap-1.5 text-[11px] text-slate-400">
              <span
                className={`w-2 h-2 rounded-full ${
                  wsRef.current?.readyState === WebSocket.OPEN
                    ? 'bg-emerald-400 shadow-[0_0_8px_#22c55e]'
                    : 'bg-rose-500'
                }`}
              />
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                {wsRef.current?.readyState === WebSocket.OPEN
                  ? 'Live Stream Active'
                  : 'Disconnected'}
              </span>
            </div>

            <div className="absolute top-3.5 right-4 flex items-center gap-1.5 text-[11px] text-slate-400">
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Multi-Lang</span>
            </div>

            <div className="my-2">
              <VoiceOrb
                state={assistantState}
                isMicActive={isMicActive}
                onToggleMic={toggleMic}
                onReconnect={connectLiveWs}
                outputAnalyser={playerRef.current?.analyser || null}
                inputAnalyser={recorderRef.current?.analyser || null}
                errorMessage={errorMessage}
              />
            </div>

            <div className="text-center mt-2">
              <p className="text-xs text-slate-400 max-w-xs mx-auto font-light leading-relaxed">
                {isMicActive
                  ? 'Speaking aloud naturally... Arushi auto-detects Hindi, English, Hinglish, & regional languages.'
                  : 'Tap the mic to talk with Arushi in your preferred language or trigger app actions.'}
              </p>
            </div>
          </div>

          {/* Action HUD Banner */}
          <ActionHUD
            currentAction={currentAction}
            onDismiss={() => setCurrentAction(null)}
          />

          {/* Specification Test Suite */}
          <TestCaseRunner
            onRunTestPrompt={handleSendText}
            onInterrupt={handleInterrupt}
            isLiveConnected={wsRef.current?.readyState === WebSocket.OPEN}
          />
        </div>

        {/* Right Column: Live Conversation Transcript & Input */}
        <div className="lg:col-span-7 flex flex-col bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl min-h-[500px] max-h-[780px]">
          {/* Transcript Header */}
          <div className="px-5 py-3.5 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-widest">
                Live Conversation & Telemetry
              </h2>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
              {messages.length} messages
            </span>
          </div>

          {/* Transcript Scroll Area */}
          <TranscriptView
            messages={messages}
            liveUserTranscript={liveUserTranscript}
            liveAssistantTranscript={liveAssistantTranscript}
          />

          {/* Text Input / Quick Prompt Bar */}
          <div className="p-3 bg-white/[0.02] border-t border-white/10">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendText();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type or speak (e.g. 'Mummy ko call karo', 'Open YouTube')..."
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button
                type="submit"
                disabled={!textInput.trim()}
                className="p-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:hover:bg-blue-600 text-white transition-all flex items-center justify-center shrink-0 shadow-md shadow-blue-600/30"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Active Phone Call Overlay */}
      <ActiveCallModal
        callInfo={activeCall}
        onEndCall={() => setActiveCall(null)}
      />

      {/* Address Book Modal */}
      <ContactsManager
        isOpen={isContactsOpen}
        onClose={() => setIsContactsOpen(false)}
        onSelectContactToCall={(contact) => {
          handleSendText(`Call ${contact.name}`);
        }}
      />

      {/* Android Bridge Inspector Modal */}
      <BridgeInspector
        isOpen={isBridgeOpen}
        onClose={() => setIsBridgeOpen(false)}
        isNativeSimulated={isNativeSimulated}
        onToggleNativeMode={handleToggleNativeMode}
        hasRealBridge={DeviceActionManager.getInstance().hasRealNativeBridge()}
        actionLogs={actionLogs}
      />
    </div>
  );
}
