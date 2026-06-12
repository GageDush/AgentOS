"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { MagneticButton } from "@agentos/ui";
import type { ChatMessageRecord, ChatThreadRecord, QuickActionRecord } from "@agentos/shared";

type ForgeChatDockProps = {
  thread?: ChatThreadRecord;
  messages: ChatMessageRecord[];
  chatDraft: string;
  setChatDraft: Dispatch<SetStateAction<string>>;
  busyAction?: string;
  onSendChat: () => Promise<void>;
  quickActions?: QuickActionRecord[];
  onConsumeQuickAction?: (actionId: string) => Promise<void>;
};

const DOCK_OPEN_KEY = "agentos-forge-chat-open";

export function ForgeChatDock({
  thread,
  messages,
  chatDraft,
  setChatDraft,
  busyAction,
  onSendChat,
  quickActions = [],
  onConsumeQuickAction
}: ForgeChatDockProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DOCK_OPEN_KEY) === "1") setOpen(true);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(DOCK_OPEN_KEY, open ? "1" : "0");
    } catch {
      // ignore
    }
  }, [open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "/") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const visibleMessages = thread ? messages.filter((message) => message.threadId === thread.id) : messages;

  return (
    <div className="forge-chat-dock">
      {open ? (
        <div ref={panelRef} className="forge-chat-panel" role="dialog" aria-label="Conversational control">
          <header className="forge-chat-panel-head">
            <div>
              <p className="forge-chat-panel-kicker">AgentOS chat</p>
              <strong>{thread?.title ?? "No active thread"}</strong>
            </div>
            <button type="button" className="forge-btn forge-btn-sm" onClick={() => setOpen(false)} aria-label="Close chat">
              ×
            </button>
          </header>
          <div className="forge-chat-log forge-mini-log">
            {visibleMessages.length === 0 ? (
              <p className="forge-chat-empty">Ask to approve, pause, run QA, or inspect the active mission.</p>
            ) : (
              visibleMessages.slice(-12).map((message) => (
                <div className="log-line forge-log-line" key={message.id}>
                  <span className={`log-level log-level-${message.role === "assistant" ? "result" : message.role === "system" ? "system" : "plan"}`}>
                    {message.role}
                  </span>
                  <span>{message.content}</span>
                </div>
              ))
            )}
          </div>
          <label className="forge-chat-compose">
            <span className="forge-field-label">Message</span>
            <textarea
              className="forge-textarea"
              rows={3}
              value={chatDraft}
              onChange={(event) => setChatDraft(event.target.value)}
              placeholder='Try "approve that", "pause it", or "show details".'
            />
          </label>
          <div className="forge-chat-actions forge-button-row">
            <MagneticButton variant="primary" disabled={busyAction === "send-chat" || !thread} onClick={() => void onSendChat()}>
              {busyAction === "send-chat" ? "Sending…" : "Send"}
            </MagneticButton>
            {quickActions.slice(0, 3).map((action) => (
              <MagneticButton
                key={action.id}
                disabled={busyAction === `quick-${action.id}`}
                onClick={() => void onConsumeQuickAction?.(action.id)}
              >
                {action.emoji} {action.label}
              </MagneticButton>
            ))}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className="forge-chat-fab"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="forge-chat-fab-label">{open ? "Close chat" : "Ask AgentOS"}</span>
      </button>
    </div>
  );
}
