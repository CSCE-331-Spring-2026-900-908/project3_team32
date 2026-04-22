import { useState, useCallback, useMemo } from "react";
import { buildSystemPrompt } from "./chatbotUtils";

const GEMINI_MODEL = "gemini-2.5-flash";
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const INITIAL_MESSAGE = {
  role: "assistant",
  content: "Hi! I'm your Boba Bar assistant 🧋 Ask me anything about our menu, drinks, or how to order!",
};

export function useChatbot({ menuItems, toppingOptions, sugarOptions, iceOptions }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const systemPrompt = useMemo(
    () => buildSystemPrompt(menuItems, toppingOptions, sugarOptions, iceOptions),
    [menuItems, toppingOptions, sugarOptions, iceOptions],
  );

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMsg = { role: "user", content: trimmed };
      setMessages((prev) => [...prev, userMsg]);
      setInputValue("");
      setIsLoading(true);

      try {
        if (!API_KEY) throw new Error("VITE_GEMINI_API_KEY is not set");

        // Build conversation history for Gemini (skip the initial greeting)
        const history = messages
          .slice(1)
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          }));

        const body = {
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [...history, { role: "user", parts: [{ text: trimmed }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
        };

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${API_KEY}`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
        );

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error?.message || `HTTP ${res.status}`);
        }

        const data = await res.json();
        const reply =
          data.candidates?.[0]?.content?.parts?.[0]?.text ||
          "I'm not sure about that — please ask a staff member!";

        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      } catch (err) {
        console.error("Chatbot error:", err);
        setMessages((prev) => [
          ...prev,
          {
            role: "error",
            content: "Sorry, I'm having trouble right now. Please ask a staff member for help!",
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
