import { AndroidBridgeInterface, Contact, DeviceActionLog } from '../types';

export const INITIAL_CONTACTS: Contact[] = [
  {
    id: '1',
    name: 'Mummy',
    relationship: 'Mom / Mummy / Mother',
    phoneNumber: '+91 98765 43210',
    avatarColor: 'bg-rose-500',
  },
  {
    id: '2',
    name: 'Dad',
    relationship: 'Papa / Father',
    phoneNumber: '+91 98765 43219',
    avatarColor: 'bg-blue-500',
  },
  {
    id: '3',
    name: 'Rahul Sharma',
    relationship: 'Colleague',
    phoneNumber: '+91 98765 43211',
    avatarColor: 'bg-emerald-500',
  },
  {
    id: '4',
    name: 'Rahul Verma',
    relationship: 'Friend',
    phoneNumber: '+91 98765 43212',
    avatarColor: 'bg-amber-500',
  },
  {
    id: '5',
    name: 'Priya Patel',
    relationship: 'Sister',
    phoneNumber: '+91 98112 23344',
    avatarColor: 'bg-purple-500',
  },
  {
    id: '6',
    name: 'Emergency Services',
    relationship: 'National Helpline',
    phoneNumber: '112',
    avatarColor: 'bg-red-600',
  }
];

const CONTACTS_STORAGE_KEY = 'arushi_contacts_v1';
const BRIDGE_MODE_KEY = 'arushi_bridge_mode';

export function getStoredContacts(): Contact[] {
  try {
    const raw = localStorage.getItem(CONTACTS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load contacts:', err);
  }
  return INITIAL_CONTACTS;
}

export function saveStoredContacts(contacts: Contact[]): void {
  try {
    localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(contacts));
  } catch (err) {
    console.error('Failed to save contacts:', err);
  }
}

export function getIsSimulatedNativeMode(): boolean {
  try {
    const mode = localStorage.getItem(BRIDGE_MODE_KEY);
    return mode === 'native_simulated';
  } catch {
    return false;
  }
}

export function setIsSimulatedNativeMode(isNative: boolean): void {
  try {
    localStorage.setItem(BRIDGE_MODE_KEY, isNative ? 'native_simulated' : 'browser');
  } catch (err) {
    console.error('Failed to set bridge mode:', err);
  }
}

export class DeviceActionManager {
  private static instance: DeviceActionManager;
  private actionListeners: ((log: DeviceActionLog) => void)[] = [];
  private activeCallListener: ((call: { phoneNumber: string; contactName?: string } | null) => void) | null = null;

  public static getInstance(): DeviceActionManager {
    if (!DeviceActionManager.instance) {
      DeviceActionManager.instance = new DeviceActionManager();
    }
    return DeviceActionManager.instance;
  }

  public addActionListener(listener: (log: DeviceActionLog) => void) {
    this.actionListeners.push(listener);
    return () => {
      this.actionListeners = this.actionListeners.filter((l) => l !== listener);
    };
  }

  public setActiveCallListener(listener: (call: { phoneNumber: string; contactName?: string } | null) => void) {
    this.activeCallListener = listener;
  }

  public hasRealNativeBridge(): boolean {
    return typeof window !== 'undefined' && !!(window.AndroidBridge || window.Android);
  }

  public isNativeModeActive(): boolean {
    return this.hasRealNativeBridge() || getIsSimulatedNativeMode();
  }

  private notify(log: DeviceActionLog) {
    this.actionListeners.forEach((l) => l(log));
  }

  /**
   * 1. Open WhatsApp
   */
  public async executeOpenWhatsApp(message?: string, phoneNumber?: string): Promise<{ success: boolean; message: string; details?: any }> {
    const isNative = this.isNativeModeActive();
    const cleanPhone = phoneNumber ? phoneNumber.replace(/\D/g, '') : '';
    let target = '';

    if (isNative && window.AndroidBridge?.openWhatsApp) {
      try {
        const res = await window.AndroidBridge.openWhatsApp(message, phoneNumber);
        const log: DeviceActionLog = {
          id: 'act_' + Date.now(),
          timestamp: new Date(),
          toolName: 'openWhatsApp',
          parameters: { message, phoneNumber },
          result: {
            success: Boolean(res),
            message: 'WhatsApp opened via Android Native Bridge Intent',
            actionType: 'native_bridge',
            target: 'com.whatsapp',
          },
        };
        this.notify(log);
        return { success: true, message: 'WhatsApp opened via native Android intent.' };
      } catch (err: any) {
        console.warn('Native openWhatsApp error:', err);
      }
    }

    // Web Fallback / Deep-link
    if (cleanPhone) {
      target = `https://wa.me/${cleanPhone}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
    } else if (message) {
      target = `whatsapp://send?text=${encodeURIComponent(message)}`;
    } else {
      target = 'whatsapp://';
    }

    try {
      // Try opening deep link or web WhatsApp
      const webUrl = cleanPhone 
        ? `https://wa.me/${cleanPhone}${message ? `?text=${encodeURIComponent(message)}` : ''}`
        : 'https://web.whatsapp.com';

      // Open in a new tab or trigger deep link
      window.open(webUrl, '_blank', 'noopener,noreferrer');

      const log: DeviceActionLog = {
        id: 'act_' + Date.now(),
        timestamp: new Date(),
        toolName: 'openWhatsApp',
        parameters: { message, phoneNumber },
        result: {
          success: true,
          message: 'WhatsApp launched via web deep link',
          actionType: isNative ? 'native_bridge' : 'deep_link',
          target: target || webUrl,
        },
      };
      this.notify(log);
      return { success: true, message: 'WhatsApp opened successfully.' };
    } catch (err: any) {
      const log: DeviceActionLog = {
        id: 'act_' + Date.now(),
        timestamp: new Date(),
        toolName: 'openWhatsApp',
        parameters: { message, phoneNumber },
        result: {
          success: false,
          message: 'Could not open WhatsApp: ' + (err.message || 'Unknown error'),
          actionType: 'error',
        },
      };
      this.notify(log);
      return { success: false, message: 'Could not open WhatsApp on this browser/device.' };
    }
  }

  /**
   * 2. Open App
   */
  public async executeOpenApp(appName: string): Promise<{ success: boolean; message: string; details?: any }> {
    const isNative = this.isNativeModeActive();
    const normalized = (appName || '').trim().toLowerCase();

    if (isNative && window.AndroidBridge?.openApp) {
      try {
        const res = await window.AndroidBridge.openApp(appName);
        const log: DeviceActionLog = {
          id: 'act_' + Date.now(),
          timestamp: new Date(),
          toolName: 'openApp',
          parameters: { appName },
          result: {
            success: Boolean(res),
            message: `Opened application '${appName}' via Android Bridge`,
            actionType: 'native_bridge',
            target: appName,
          },
        };
        this.notify(log);
        return { success: true, message: `Application ${appName} launched via native bridge.` };
      } catch (err: any) {
        console.warn('Native openApp error:', err);
      }
    }

    // Known app mappings
    const APP_MAPPINGS: Record<string, { deepLink: string; webFallback: string; name: string }> = {
      whatsapp: { deepLink: 'whatsapp://', webFallback: 'https://web.whatsapp.com', name: 'WhatsApp' },
      youtube: { deepLink: 'vnd.youtube://', webFallback: 'https://www.youtube.com', name: 'YouTube' },
      instagram: { deepLink: 'instagram://', webFallback: 'https://www.instagram.com', name: 'Instagram' },
      chrome: { deepLink: 'googlechrome://', webFallback: 'https://www.google.com', name: 'Google Chrome' },
      browser: { deepLink: 'https://www.google.com', webFallback: 'https://www.google.com', name: 'Browser' },
      settings: { deepLink: 'app-settings:', webFallback: '', name: 'Settings' },
      maps: { deepLink: 'geo:0,0', webFallback: 'https://maps.google.com', name: 'Google Maps' },
      gmail: { deepLink: 'googlegmail://', webFallback: 'https://mail.google.com', name: 'Gmail' },
      spotify: { deepLink: 'spotify://', webFallback: 'https://open.spotify.com', name: 'Spotify' },
      music: { deepLink: 'music://', webFallback: 'https://music.youtube.com', name: 'YouTube Music' },
      camera: { deepLink: '', webFallback: '', name: 'Camera' },
      calculator: { deepLink: 'calculator://', webFallback: '', name: 'Calculator' },
      telegram: { deepLink: 'tg://', webFallback: 'https://web.telegram.org', name: 'Telegram' },
      twitter: { deepLink: 'twitter://', webFallback: 'https://x.com', name: 'X / Twitter' },
      x: { deepLink: 'twitter://', webFallback: 'https://x.com', name: 'X / Twitter' },
      playstore: { deepLink: 'market://', webFallback: 'https://play.google.com', name: 'Google Play Store' },
    };

    let matchedKey = Object.keys(APP_MAPPINGS).find((k) => normalized.includes(k));
    const targetApp = matchedKey ? APP_MAPPINGS[matchedKey] : null;

    if (normalized.includes('setting')) {
      // In web browser, settings cannot be accessed natively unless simulated/packaged
      const log: DeviceActionLog = {
        id: 'act_' + Date.now(),
        timestamp: new Date(),
        toolName: 'openApp',
        parameters: { appName },
        result: {
          success: isNative,
          message: isNative
            ? 'Device Settings opened via Android OS Intent'
            : 'Device Settings requires Android Native Bridge (simulated mode available)',
          actionType: isNative ? 'native_bridge' : 'web_fallback',
          target: 'android.settings.SETTINGS',
        },
      };
      this.notify(log);
      return {
        success: isNative,
        message: isNative
          ? 'Device Settings opened successfully.'
          : 'Device settings can only be launched directly in the Android APK package.',
      };
    }

    if (targetApp) {
      if (targetApp.webFallback) {
        window.open(targetApp.webFallback, '_blank', 'noopener,noreferrer');
      }
      const log: DeviceActionLog = {
        id: 'act_' + Date.now(),
        timestamp: new Date(),
        toolName: 'openApp',
        parameters: { appName },
        result: {
          success: true,
          message: `Opened ${targetApp.name} (${targetApp.webFallback || targetApp.deepLink})`,
          actionType: isNative ? 'native_bridge' : 'deep_link',
          target: targetApp.webFallback || targetApp.deepLink,
        },
      };
      this.notify(log);
      return { success: true, message: `${targetApp.name} opened.` };
    }

    // Generic URL or search fallback
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(appName)}`;
    window.open(searchUrl, '_blank', 'noopener,noreferrer');

    const log: DeviceActionLog = {
      id: 'act_' + Date.now(),
      timestamp: new Date(),
      toolName: 'openApp',
      parameters: { appName },
      result: {
        success: true,
        message: `Searching and opening ${appName}`,
        actionType: 'web_fallback',
        target: searchUrl,
      },
    };
    this.notify(log);
    return { success: true, message: `Opened ${appName}.` };
  }

  /**
   * 3. Open URL
   */
  public async executeOpenUrl(url: string): Promise<{ success: boolean; message: string; details?: any }> {
    let cleanUrl = (url || '').trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    const isNative = this.isNativeModeActive();
    if (isNative && window.AndroidBridge?.openUrl) {
      try {
        await window.AndroidBridge.openUrl(cleanUrl);
      } catch (err) {
        console.warn('Native openUrl error:', err);
      }
    }

    window.open(cleanUrl, '_blank', 'noopener,noreferrer');

    const log: DeviceActionLog = {
      id: 'act_' + Date.now(),
      timestamp: new Date(),
      toolName: 'openUrl',
      parameters: { url: cleanUrl },
      result: {
        success: true,
        message: `Navigated to ${cleanUrl}`,
        actionType: isNative ? 'native_bridge' : 'web_fallback',
        target: cleanUrl,
      },
    };
    this.notify(log);
    return { success: true, message: `Opened URL ${cleanUrl}.` };
  }

  /**
   * 4. Phone Calling by Number
   */
  public async executeMakeCall(phoneNumber: string, reason?: string): Promise<{ success: boolean; message: string; details?: any }> {
    const isNative = this.isNativeModeActive();
    const cleanNumber = (phoneNumber || '').trim();

    if (!cleanNumber) {
      return { success: false, message: 'Invalid phone number provided.' };
    }

    if (isNative && window.AndroidBridge?.makeCall) {
      try {
        const res = await window.AndroidBridge.makeCall(cleanNumber);
        const log: DeviceActionLog = {
          id: 'act_' + Date.now(),
          timestamp: new Date(),
          toolName: 'makeCall',
          parameters: { phoneNumber: cleanNumber, reason },
          result: {
            success: Boolean(res),
            message: `Initiated phone call to ${cleanNumber} via Android Telephony Intent`,
            actionType: 'native_bridge',
            target: `tel:${cleanNumber}`,
          },
        };
        this.notify(log);
        this.activeCallListener?.({ phoneNumber: cleanNumber });
        return { success: true, message: `Calling ${cleanNumber}...` };
      } catch (err: any) {
        console.warn('Native makeCall error:', err);
      }
    }

    // Web Fallback: open tel: URI & trigger dialer UI
    const telLink = `tel:${cleanNumber.replace(/\s+/g, '')}`;
    
    // In iframe or browser, we trigger dialer and notify UI
    this.activeCallListener?.({ phoneNumber: cleanNumber });

    // Try triggering tel: protocol
    try {
      const a = document.createElement('a');
      a.href = telLink;
      a.click();
    } catch {
      // Ignored
    }

    const log: DeviceActionLog = {
      id: 'act_' + Date.now(),
      timestamp: new Date(),
      toolName: 'makeCall',
      parameters: { phoneNumber: cleanNumber, reason },
      result: {
        success: true,
        message: `Opened dialer for ${cleanNumber} (tel: protocol)`,
        actionType: isNative ? 'native_bridge' : 'tel_link',
        target: telLink,
      },
    };
    this.notify(log);
    return { success: true, message: `Dialing ${cleanNumber}...` };
  }

  /**
   * 5. Call Contact by Name
   */
  public async executeCallContact(contactName: string): Promise<{
    success: boolean;
    status: 'called' | 'multiple_matches' | 'not_found';
    message: string;
    matches?: { name: string; phoneNumber: string; relationship?: string }[];
    selectedContact?: Contact;
  }> {
    const contacts = getStoredContacts();
    const query = (contactName || '').trim().toLowerCase();

    if (!query) {
      return {
        success: false,
        status: 'not_found',
        message: 'No contact name provided.',
      };
    }

    // Normalize relationships and aliases
    const isMomQuery = query.includes('mom') || query.includes('mummy') || query.includes('mother') || query.includes('maa') || query.includes('mata');
    const isDadQuery = query.includes('dad') || query.includes('papa') || query.includes('father') || query.includes('pitaji');

    const matchedContacts = contacts.filter((c) => {
      const nameLower = c.name.toLowerCase();
      const relLower = (c.relationship || '').toLowerCase();

      if (isMomQuery && (nameLower.includes('mom') || nameLower.includes('mummy') || nameLower.includes('mother') || relLower.includes('mom') || relLower.includes('mummy'))) {
        return true;
      }
      if (isDadQuery && (nameLower.includes('dad') || nameLower.includes('papa') || nameLower.includes('father') || relLower.includes('dad') || relLower.includes('papa'))) {
        return true;
      }

      // Check name match or partial match
      if (nameLower.includes(query) || query.includes(nameLower)) {
        return true;
      }
      // Check first name match (e.g. query "Rahul" matches "Rahul Sharma" and "Rahul Verma")
      const firstName = nameLower.split(' ')[0];
      if (query.includes(firstName) || firstName === query) {
        return true;
      }

      return false;
    });

    if (matchedContacts.length === 0) {
      const log: DeviceActionLog = {
        id: 'act_' + Date.now(),
        timestamp: new Date(),
        toolName: 'callContact',
        parameters: { contactName },
        result: {
          success: false,
          message: `No contact found matching '${contactName}' in address book`,
          actionType: 'error',
        },
      };
      this.notify(log);
      return {
        success: false,
        status: 'not_found',
        message: `Contact '${contactName}' was not found in your address book.`,
      };
    }

    if (matchedContacts.length === 1) {
      const target = matchedContacts[0];
      await this.executeMakeCall(target.phoneNumber, `Call to ${target.name}`);
      this.activeCallListener?.({ phoneNumber: target.phoneNumber, contactName: target.name });

      const log: DeviceActionLog = {
        id: 'act_' + Date.now(),
        timestamp: new Date(),
        toolName: 'callContact',
        parameters: { contactName },
        result: {
          success: true,
          message: `Calling ${target.name} (${target.phoneNumber})`,
          actionType: this.isNativeModeActive() ? 'native_bridge' : 'tel_link',
          target: `tel:${target.phoneNumber}`,
          details: target,
        },
      };
      this.notify(log);
      return {
        success: true,
        status: 'called',
        message: `Calling ${target.name} on ${target.phoneNumber}...`,
        selectedContact: target,
      };
    }

    // Multiple matches! E.g. Rahul Sharma vs Rahul Verma
    const matchesSummary = matchedContacts.map((c) => ({
      name: c.name,
      phoneNumber: c.phoneNumber,
      relationship: c.relationship,
    }));

    const log: DeviceActionLog = {
      id: 'act_' + Date.now(),
      timestamp: new Date(),
      toolName: 'callContact',
      parameters: { contactName },
      result: {
        success: false,
        message: `Found ${matchedContacts.length} contacts matching '${contactName}'. Clarification needed.`,
        actionType: 'clarification_needed',
        details: matchesSummary,
      },
    };
    this.notify(log);

    const namesList = matchedContacts.map((c) => `${c.name} (${c.phoneNumber})`).join(' and ');
    return {
      success: false,
      status: 'multiple_matches',
      message: `Found multiple contacts matching '${contactName}': ${namesList}. Please specify which contact you want to call.`,
      matches: matchesSummary,
    };
  }
}
