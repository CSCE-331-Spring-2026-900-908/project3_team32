import { useState, useCallback, useMemo } from "react";
import { buildSystemPrompt } from "./chatbotUtils";

const GEMINI_MODEL = "gemini-2.5-flash";
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${API_KEY}`;

const INITIAL_MESSAGE = {
  role: "assistant",
  content: "Hi! I'm your Boba Bar assistant 🧋 Ask me anything about our menu, drinks, or how to order!",
};

async function callGemini(systemPrompt, history, userText) {
  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [
      ...history,
      { role: "user", parts: [{ text: userText }] },
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 400,
      topP: 0.9,
    },
  };

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const status = res.status;
    // 429 = rate limit, 503 = overloaded — both are retryable
    const retryable = status === 429 || status === 503 || status >= 500;
    const error = new Error(err?.error?.message || `HTTP ${status}`);
    error.retryable = retryable;
    throw error;
  }

  const data = await res.json();
  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
    "I'm not sure about that — please ask a staff member!"
  );
}

export function useChatbot({ menuItems, toppingOptions, sugarOptions, iceOptions, sizeOptions, mostOrderedItems }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const systemPrompt = useMemo(
    () => buildSystemPrompt(menuItems, toppingOptions, sugarOptions, iceOptions, sizeOptions, mostOrderedItems),
    [menuItems, toppingOptions, sugarOptions, iceOptions, sizeOptions, mostOrderedItems],
  );

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMsg = { role: "user", content: trimmed };
      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setInputValue("");
      setIsLoading(true);

      // Build history from conversation (skip the initial greeting)
      const history = messages
        .slice(1)
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));

      try {
        if (!API_KEY) throw new Error("VITE_GEMINI_API_KEY is not set");

        let reply;
        try {
          reply = await callGemini(systemPrompt, history, trimmed);
        } catch (err) {
          // One retry for transient server errors
          if (err.retryable) {
            await new Promise((r) => setTimeout(r, 1500));
            reply = await callGemini(systemPrompt, history, trimmed);
          } else {
            throw err;
          }
        }

        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      } catch (err) {
        console.error("Chatbot error:", err);
        setMessages((prev) => [
          ...prev,
          {
            role: "error",
            content: "Sorry, I'm having trouble right now. Please try again or ask a staff member for help!",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, systemPrompt],
  );

  const clearChat = useCallback(() => {
    setMessages([INITIAL_MESSAGE]);
    setInputValue("");
  }, []);

  return { isOpen, setIsOpen, messages, inputValue, setInputValue, isLoading, sendMessage, clearChat };
}
