export type AssistantState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'executing';

export interface Contact {
  id: string;
  name: string;
  relationship?: string; // e.g. "Mom", "Mummy", "Mother", "Dad", "Papa"
  phoneNumber: string;
  email?: string;
  avatarColor?: string;
}

export interface DeviceActionLog {
  id: string;
  timestamp: Date;
  toolName: 'openWhatsApp' | 'openApp' | 'openUrl' | 'makeCall' | 'callContact';
  parameters: Record<string, any>;
  result: {
    success: boolean;
    message: string;
    actionType: 'native_bridge' | 'deep_link' | 'tel_link' | 'web_fallback' | 'clarification_needed' | 'error';
    target?: string;
    details?: any;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'action';
  text: string;
  timestamp: Date;
  language?: string;
  actionDetails?: DeviceActionLog;
}

export interface AndroidBridgeInterface {
  openApp: (appName: string) => boolean | Promise<boolean>;
  makeCall: (phoneNumber: string) => boolean | Promise<boolean>;
  callContact: (contactName: string) => string | Promise<string>;
  openWhatsApp: (message?: string, phoneNumber?: string) => boolean | Promise<boolean>;
  openUrl: (url: string) => boolean | Promise<boolean>;
  getContacts?: () => Contact[] | Promise<Contact[]>;
  isNative?: boolean;
}

declare global {
  interface Window {
    AndroidBridge?: AndroidBridgeInterface;
    Android?: AndroidBridgeInterface;
  }
}
