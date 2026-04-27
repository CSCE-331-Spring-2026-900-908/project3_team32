import React, { useEffect, useRef } from "react";
import { IoChatbubblesSharp, IoClose, IoSend, IoRefresh } from "react-icons/io5";
import { useChatbot } from "./useChatbot";
import { QUICK_SUGGESTIONS } from "./chatbotUtils";
import "./Chatbot.css";

export default function Chatbot({ menuItems, toppingOptions, sugarOptions, iceOptions, sizeOptions, mostOrderedItems }) {
  const { isOpen, setIsOpen, messages, inputValue, setInputValue, isLoading, sendMessage, clearChat } =
    useChatbot({ menuItems, toppingOptions, sugarOptions, iceOptions, sizeOptions, mostOrderedItems });

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  }

  const showSuggestions = messages.length === 1;

  return (
    <>
      {/* Chat window */}
      {isOpen && (
        <div className="chatbot-window" role="dialog" aria-label="Boba Bar Assistant">
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <span className="chatbot-header-avatar">🧋</span>
              <div>
                <div className="chatbot-header-title">Boba Bar Assistant</div>
                <div className="chatbot-header-subtitle">Ask me anything!</div>
              </div>
            </div>
            <div className="chatbot-header-actions">
              <button
                className="chatbot-icon-btn"
                onClick={clearChat}
                title="Clear chat"
                aria-label="Clear chat history"
              >
                <IoRefresh />
              </button>
              <button
                className="chatbot-icon-btn"
                onClick={() => setIsOpen(false)}
                title="Close"
                aria-label="Close chat"
              >
                <IoClose />
              </button>
            </div>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chatbot-msg chatbot-msg--${msg.role}`}>
                {msg.role === "assistant" && (
                  <span className="chatbot-msg-avatar">🧋</span>
                )}
                <div className="chatbot-msg-bubble">{msg.content}</div>
              </div>
            ))}

            {isLoading && (
              <div className="chatbot-msg chatbot-msg--assistant">
                <span className="chatbot-msg-avatar">🧋</span>
                <div className="chatbot-msg-bubble chatbot-msg-bubble--typing">
                  <span /><span /><span />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {showSuggestions && (
            <div className="chatbot-suggestions">
              {QUICK_SUGGESTIONS.map((s) => (
                <button key={s} className="chatbot-suggestion-chip" onClick={() => sendMessage(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="chatbot-input-row">
            <input
              ref={inputRef}
              className="chatbot-input"
              type="text"
              placeholder="Ask about our menu…"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              maxLength={500}
            />
            <button
              className="chatbot-send-btn"
              onClick={() => sendMessage(inputValue)}
              disabled={isLoading || !inputValue.trim()}
              aria-label="Send message"
            >
              <IoSend />
            </button>
          </div>
        </div>
      )}

      {/* Floating trigger button */}
      <button
        className={`chatbot-fab ${isOpen ? "chatbot-fab--open" : ""}`}
        onClick={() => setIsOpen((o) => !o)}
        aria-label={isOpen ? "Close chat assistant" : "Open chat assistant"}
        title="Boba Bar Assistant"
      >
        {isOpen ? <IoClose /> : <IoChatbubblesSharp />}
      </button>
    </>
  );
}
