import { useEffect, useRef, useState } from "react";
import { useActor } from "../../hooks/useActor";

interface ChatMessage {
  id: number;
  senderName: string;
  message: string;
}

interface ChatPanelProps {
  roomId: string;
  playerName: string;
  visible: boolean;
  onClose: () => void;
}

export default function ChatPanel({
  roomId,
  playerName,
  visible,
  onClose,
}: ChatPanelProps) {
  const { actor } = useActor();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const lastIdRef = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible || !actor || !roomId) return;

    const poll = async () => {
      try {
        const actorAny = actor as any;
        if (typeof actorAny.getChatMessages !== "function") return;
        const newMsgs: ChatMessage[] = await actorAny.getChatMessages(
          roomId,
          lastIdRef.current,
        );
        if (newMsgs.length > 0) {
          const mapped = newMsgs.map((m: any) => ({
            id: Number(m.id),
            senderName: String(m.senderName),
            message: String(m.message),
          }));
          setMessages((prev) => {
            const combined = [...prev, ...mapped];
            // Auto-scroll after state update
            setTimeout(() => {
              if (listRef.current) {
                listRef.current.scrollTop = listRef.current.scrollHeight;
              }
            }, 0);
            return combined.slice(-50);
          });
          lastIdRef.current = mapped[mapped.length - 1].id;
        }
      } catch {
        // backend may not have chat yet
      }
    };

    poll();
    const id = setInterval(poll, 1500);
    return () => clearInterval(id);
  }, [visible, actor, roomId]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !actor || !roomId) return;
    setSending(true);
    try {
      const actorAny = actor as any;
      if (typeof actorAny.sendChatMessage === "function") {
        await actorAny.sendChatMessage(roomId, playerName, text);
      } else {
        setMessages((prev) => {
          const updated = [
            ...prev,
            { id: Date.now(), senderName: playerName, message: text },
          ].slice(-50);
          setTimeout(() => {
            if (listRef.current) {
              listRef.current.scrollTop = listRef.current.scrollHeight;
            }
          }, 0);
          return updated;
        });
      }
    } catch {
      // silent
    }
    setInput("");
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!visible) return null;

  return (
    <div
      data-ocid="chat.panel"
      style={{
        position: "absolute",
        top: 130,
        right: 12,
        width: 260,
        background: "rgba(14,19,26,0.92)",
        border: "1px solid rgba(242,140,42,0.5)",
        display: "flex",
        flexDirection: "column",
        pointerEvents: "auto",
        fontFamily: "'Barlow Condensed', sans-serif",
        zIndex: 100,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "6px 10px",
          borderBottom: "1px solid rgba(242,140,42,0.3)",
        }}
      >
        <span
          style={{
            color: "#F28C2A",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 2,
          }}
        >
          💬 CHAT
        </span>
        <button
          type="button"
          data-ocid="chat.close_button"
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "#A7B0BC",
            fontSize: 14,
            cursor: "pointer",
            padding: "0 2px",
          }}
        >
          ✕
        </button>
      </div>

      {/* Voice note */}
      <div
        style={{
          padding: "4px 10px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          color: "rgba(167,176,188,0.55)",
          fontSize: 9,
          letterSpacing: 1,
        }}
      >
        🎤 Voice: use Discord/party chat
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        style={{
          height: 160,
          overflowY: "auto",
          padding: "6px 10px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              color: "rgba(167,176,188,0.4)",
              fontSize: 10,
              letterSpacing: 1,
              textAlign: "center",
              marginTop: 20,
            }}
          >
            No messages yet
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={`${msg.id}-${i}`}
            style={{ fontSize: 11, lineHeight: 1.4, wordBreak: "break-word" }}
          >
            <span
              style={{
                color: msg.senderName === playerName ? "#F28C2A" : "#4B9EF2",
                fontWeight: 700,
              }}
            >
              [{msg.senderName}]
            </span>{" "}
            <span style={{ color: "#E8EAF0" }}>{msg.message}</span>
          </div>
        ))}
      </div>

      {/* Input */}
      <div
        style={{
          display: "flex",
          borderTop: "1px solid rgba(242,140,42,0.3)",
        }}
      >
        <input
          data-ocid="chat.input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type message..."
          maxLength={120}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#F2F4F7",
            fontSize: 11,
            padding: "7px 10px",
            fontFamily: "'Barlow Condensed', sans-serif",
          }}
        />
        <button
          type="button"
          data-ocid="chat.submit_button"
          onClick={handleSend}
          disabled={sending || !input.trim()}
          style={{
            background: "rgba(242,140,42,0.2)",
            border: "none",
            borderLeft: "1px solid rgba(242,140,42,0.3)",
            color: "#F28C2A",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 1,
            padding: "0 10px",
            cursor: "pointer",
            fontFamily: "'Barlow Condensed', sans-serif",
          }}
        >
          SEND
        </button>
      </div>
    </div>
  );
}
