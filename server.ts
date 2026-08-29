import express from "express";
import http from "http";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API health endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Predefined safe tool declarations for Gemini Live Function Calling
const openWhatsAppTool: FunctionDeclaration = {
  name: "openWhatsApp",
  description: "Opens the WhatsApp application or chats directly via deep link/native Android intent.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      message: {
        type: Type.STRING,
        description: "Optional initial text message to prefill in WhatsApp chat.",
      },
      phoneNumber: {
        type: Type.STRING,
        description: "Optional recipient phone number with country code.",
      },
    },
  },
};

const openAppTool: FunctionDeclaration = {
  name: "openApp",
  description: "Opens an installed mobile or web application such as YouTube, Instagram, WhatsApp, Chrome, Settings, Camera, Maps, Spotify, etc.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      appName: {
        type: Type.STRING,
        description: "The name of the application to open (e.g. 'YouTube', 'Instagram', 'WhatsApp', 'Chrome', 'Settings', 'Camera', 'Maps').",
      },
    },
    required: ["appName"],
  },
};

const openUrlTool: FunctionDeclaration = {
  name: "openUrl",
  description: "Opens a specific web URL or website in the browser or WebView.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      url: {
        type: Type.STRING,
        description: "The full destination URL to navigate to (e.g. 'https://youtube.com', 'https://google.com').",
      },
    },
    required: ["url"],
  },
};

const makeCallTool: FunctionDeclaration = {
  name: "makeCall",
  description: "Dials or initiates a phone call directly to a specified phone number using the telephony dialer or native bridge.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      phoneNumber: {
        type: Type.STRING,
        description: "The phone number to dial (e.g. '9876543210', '+919876543210', '112').",
      },
      reason: {
        type: Type.STRING,
        description: "Optional context or reason for the phone call.",
      },
    },
    required: ["phoneNumber"],
  },
};

const callContactTool: FunctionDeclaration = {
  name: "callContact",
  description: "Searches for a contact by name or relationship (e.g. 'Mom', 'Mummy', 'Mother', 'Dad', 'Papa', 'Rahul', 'Rahul Sharma', 'Priya') in the user's address book and places the phone call.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      contactName: {
        type: Type.STRING,
        description: "The contact name or relationship title to look up (e.g. 'Mom', 'Mummy', 'Rahul', 'Dad', 'Rahul Sharma').",
      },
    },
    required: ["contactName"],
  },
};

const ARUSHI_SYSTEM_INSTRUCTION = `You are Arushi, an intelligent, empathetic, friendly, and highly capable Indian voice AI assistant.

CRITICAL INSTRUCTIONS & VOICE BEHAVIOR:
1. Multi-Language Voice Fluency:
   - You naturally understand and speak Hindi, English, Hinglish, Marathi, Gujarati, Bengali, Tamil, Telugu, Kannada, Malayalam, Punjabi, Urdu, and other languages supported by Gemini Live.
   - AUTOMATICALLY detect the language the user is speaking in and reply in the EXACT same language without requiring manual switching.
   - If the user speaks in Hindi (e.g. "नमस्ते आरुषि, आप कैसी हैं?" or "व्हाट्सएप खोलो"), reply warmly in Hindi.
   - If the user speaks in English (e.g. "Hello Arushi, open YouTube"), reply warmly in English.
   - If the user speaks in Hinglish (e.g. "Arushi, mummy ko phone lagao na" or "WhatsApp open karo"), reply naturally in everyday Hinglish.
   - If the user switches languages mid-conversation, seamlessly match their new language without commenting on the switch.

2. True App & Device Action Execution via Function Calling:
   - You possess real device control tools: openWhatsApp, openApp, openUrl, makeCall, and callContact.
   - When the user asks you to perform an action (e.g. "Open WhatsApp", "WhatsApp kholo", "Open YouTube", "Call Mom", "Mummy ko call karo", "Call Rahul", "Call 9876543210", "Open settings"):
     YOU MUST INVOKE THE RELEVANT TOOL IMMEDIATELY!
   - Do NOT just verbally acknowledge without calling the tool. First trigger the tool call.
   - When you receive the tool execution result:
     - If successful (e.g. WhatsApp opened, call placed), briefly confirm to the user (e.g. "Calling Mom now", "Opening WhatsApp", "Calling Rahul Sharma").
     - If multiple contacts matched (e.g., two Rahuls found: Rahul Sharma and Rahul Verma), ask the user for clarification: "I found two Rahuls: Rahul Sharma and Rahul Verma. Which one would you like to call?"
     - If contact not found or action requires native Android app wrapper, explain gracefully to the user in their language.
     - Never guess a phone number if not found.

3. Tone & Conversational Style:
   - Friendly, polite, natural Indian conversational cadence, energetic, and helpful.
   - Keep spoken answers brief and to-the-point for fast, seamless back-and-forth voice interaction.`;

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/api/live-ws" });

// Lazy initialized Gemini client
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

wss.on("connection", async (clientWs: WebSocket) => {
  console.log("[LiveWS] Client connected to Arushi voice session.");
  let geminiSession: any = null;
  let isSessionAlive = true;

  const cleanup = () => {
    isSessionAlive = false;
    if (geminiSession) {
      try {
        geminiSession.close();
      } catch (err) {
        console.warn("[LiveWS] Error closing session:", err);
      }
      geminiSession = null;
    }
  };

  clientWs.on("close", () => {
    console.log("[LiveWS] Client disconnected.");
    cleanup();
  });

  clientWs.on("error", (err) => {
    console.error("[LiveWS] Client socket error:", err);
    cleanup();
  });

  try {
    const ai = getGenAI();

    // Connect to Gemini Live bidirectional stream
    geminiSession = await ai.live.connect({
      model: "gemini-3.1-flash-live-preview",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              // Aoede / Kore is a sweet, warm voice for Arushi
              voiceName: "Aoede",
            },
          },
        },
        systemInstruction: ARUSHI_SYSTEM_INSTRUCTION,
        tools: [
          {
            functionDeclarations: [
              openWhatsAppTool,
              openAppTool,
              openUrlTool,
              makeCallTool,
              callContactTool,
            ],
          },
        ],
      },
      callbacks: {
        onmessage: (message: LiveServerMessage) => {
          if (!isSessionAlive || clientWs.readyState !== WebSocket.OPEN) return;

          // 1. Audio data from Model Turn
          const parts = message.serverContent?.modelTurn?.parts;
          if (parts && parts.length > 0) {
            for (const part of parts) {
              if (part.inlineData?.data) {
                clientWs.send(
                  JSON.stringify({
                    type: "audio",
                    data: part.inlineData.data,
                    mimeType: part.inlineData.mimeType || "audio/pcm;rate=24000",
                  })
                );
              }
              if (part.text) {
                clientWs.send(
                  JSON.stringify({
                    type: "text_chunk",
                    text: part.text,
                  })
                );
              }
            }
          }

          // 2. Tool Calls
          if (message.toolCall && (message.toolCall as any).functionCalls) {
            const functionCalls = (message.toolCall as any).functionCalls;
            console.log("[LiveWS] Gemini generated tool calls:", JSON.stringify(functionCalls));
            clientWs.send(
              JSON.stringify({
                type: "tool_call",
                functionCalls: functionCalls,
              })
            );
          }

          // 3. User Interruption
          if (message.serverContent?.interrupted) {
            console.log("[LiveWS] Speech interrupted by user.");
            clientWs.send(
              JSON.stringify({
                type: "interrupted",
              })
            );
          }

          // 4. Turn Complete
          if (message.serverContent?.turnComplete) {
            clientWs.send(
              JSON.stringify({
                type: "turn_complete",
              })
            );
          }
        },
        onerror: (err: any) => {
          console.error("[LiveWS] Gemini Live error:", err);
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(
              JSON.stringify({
                type: "error",
                message: err?.message || "Live session encountered an error.",
              })
            );
          }
        },
        onclose: () => {
          console.log("[LiveWS] Gemini Live session closed.");
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(
              JSON.stringify({
                type: "status",
                state: "closed",
              })
            );
          }
        },
      },
    });

    clientWs.send(
      JSON.stringify({
        type: "status",
        state: "connected",
        message: "Arushi Live Voice pipeline is active and ready.",
      })
    );
  } catch (err: any) {
    console.error("[LiveWS] Failed to initialize Gemini Live session:", err);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(
        JSON.stringify({
          type: "error",
          message:
            err?.message ||
            "Unable to connect to Gemini Live. Please check your API key configuration.",
        })
      );
    }
  }

  // Handle messages received from Client
  clientWs.on("message", (raw) => {
    if (!geminiSession || !isSessionAlive) return;

    try {
      const payload = JSON.parse(raw.toString());

      if (payload.type === "audio" && payload.data) {
        // Send real-time audio chunk (16kHz PCM linear)
        geminiSession.sendRealtimeInput({
          audio: {
            data: payload.data,
            mimeType: "audio/pcm;rate=16000",
          },
        });
      } else if (payload.type === "text" && payload.text) {
        // User sent a text message or voice test phrase
        geminiSession.sendRealtimeInput({
          text: payload.text,
        });
      } else if (payload.type === "tool_response" && payload.functionResponses) {
        // Send tool execution results back to Gemini Live
        console.log("[LiveWS] Returning tool responses to Gemini:", JSON.stringify(payload.functionResponses));
        geminiSession.sendToolResponse({
          functionResponses: payload.functionResponses,
        });
      } else if (payload.type === "ping") {
        clientWs.send(JSON.stringify({ type: "pong" }));
      }
    } catch (err: any) {
      console.error("[LiveWS] Error processing client message:", err);
    }
  });
});

// REST Fallback Endpoint for Text Chat and Testing
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const ai = getGenAI();
    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: message,
      config: {
        systemInstruction: ARUSHI_SYSTEM_INSTRUCTION,
        tools: [
          {
            functionDeclarations: [
              openWhatsAppTool,
              openAppTool,
              openUrlTool,
              makeCallTool,
              callContactTool,
            ],
          },
        ],
      },
    });

    const functionCalls = response.functionCalls || [];
    res.json({
      text: response.text || "",
      functionCalls,
    });
  } catch (err: any) {
    console.error("Chat API error:", err);
    res.status(500).json({ error: err.message || "Failed to process chat" });
  }
});

// Vite Middleware for Development / Static Serve for Production
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[Arushi AI] Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
