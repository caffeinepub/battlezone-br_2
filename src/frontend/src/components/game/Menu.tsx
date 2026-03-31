import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useActor } from "../../hooks/useActor";
import {
  useCreateRoom,
  useGetTopScores,
  useJoinRoom,
} from "../../hooks/useQueries";
import { MAP_CONFIGS, generateRoomCode } from "./constants";
import type { MapType } from "./types";

const S = {
  root: {
    position: "fixed" as const,
    inset: 0,
    background: "#0d0d14",
    display: "flex",
    flexDirection: "row" as const,
    fontFamily: "'Barlow Condensed', sans-serif",
    overflowY: "hidden" as const,
    overflowX: "hidden" as const,
  },
  sidebar: {
    width: 220,
    minWidth: 180,
    background: "rgba(0,0,0,0.85)",
    display: "flex",
    flexDirection: "column" as const,
    paddingTop: 40,
    paddingBottom: 20,
    borderRight: "1px solid rgba(245,197,24,0.15)",
    flexShrink: 0,
  },
  content: {
    flex: 1,
    overflowY: "auto" as const,
    padding: "32px 28px",
    display: "flex",
    flexDirection: "column" as const,
  },
  grid: {
    position: "absolute" as const,
    inset: 0,
    backgroundImage:
      "linear-gradient(rgba(245,197,24,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(245,197,24,0.03) 1px, transparent 1px)",
    backgroundSize: "40px 40px",
    pointerEvents: "none" as const,
    zIndex: 0,
  },
};

interface MenuProps {
  onPlay: (mapType: MapType, playerName: string, roomId?: string) => void;
}

function RoomCodeInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const CELL_KEYS = ["c0", "c1", "c2", "c3", "c4", "c5"];
  const chars = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  const handleChange = (i: number, raw: string) => {
    const ch = raw
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(-1);
    const next = chars.map((c, idx) => (idx === i ? ch : c)).join("");
    onChange(next);
    if (ch && i < 5) {
      refs.current[i + 1]?.focus();
    }
  };

  const handleKeyDown = (
    i: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace") {
      if (chars[i] === "") {
        if (i > 0) {
          const next = chars.map((c, idx) => (idx === i - 1 ? "" : c)).join("");
          onChange(next);
          refs.current[i - 1]?.focus();
        }
      } else {
        const next = chars.map((c, idx) => (idx === i ? "" : c)).join("");
        onChange(next);
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < 5) {
      refs.current[i + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 6);
    onChange(pasted.padEnd(6, "").slice(0, 6).replace(/ /g, "").slice(0, 6));
    // actually just use raw paste
    const filled = pasted.slice(0, 6);
    onChange(filled);
    const focusIdx = Math.min(filled.length, 5);
    refs.current[focusIdx]?.focus();
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        justifyContent: "center",
        marginBottom: 12,
      }}
      data-ocid="menu.input"
    >
      {chars.map((ch, i) => (
        <input
          key={CELL_KEYS[i]}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={ch}
          maxLength={2}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          style={{
            width: 44,
            height: 52,
            background: "rgba(27,36,48,0.9)",
            border: `2px solid ${ch ? "#F28C2A" : "rgba(242,140,42,0.4)"}`,
            color: "#F28C2A",
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: 1,
            textAlign: "center",
            outline: "none",
            textTransform: "uppercase",
            caretColor: "#F28C2A",
            transition: "border-color 0.15s",
          }}
        />
      ))}
    </div>
  );
}

export default function Menu({ onPlay }: MenuProps) {
  const [playerName, setPlayerName] = useState("Player");
  const [selectedMap] = useState<MapType>("city");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [createdRoomCode, setCreatedRoomCode] = useState("");
  const [joinedRoom, setJoinedRoom] = useState("");
  const [onlineError, setOnlineError] = useState("");
  const [lobbyPlayers, setLobbyPlayers] = useState<string[]>([]);

  const { actor } = useActor();
  const { data: scores, isLoading } = useGetTopScores();
  const { mutate: createRoom, isPending: isCreating } = useCreateRoom();
  const { mutate: joinRoom, isPending: isJoining } = useJoinRoom();

  // Poll room state for lobby
  useEffect(() => {
    if (!joinedRoom || !actor) return;
    const poll = async () => {
      try {
        const players = await actor.getRoomState(joinedRoom);
        setLobbyPlayers(players.map((p) => p.name));
      } catch {
        // ignore
      }
    };
    poll();
    const id = setInterval(poll, 1500);
    return () => clearInterval(id);
  }, [joinedRoom, actor]);

  const handleCreateRoom = () => {
    const code = generateRoomCode();
    const name = playerName || "Player";
    // Show room code immediately so user can share it right away
    setCreatedRoomCode(code);
    setJoinedRoom(code);
    setOnlineError("");
    // Sync with backend in the background, then register creator as a player
    createRoom(code, {
      onSuccess: () => {
        joinRoom(
          { roomCode: code, playerName: name },
          {
            onError: () => {
              // Non-fatal: lobby polling will retry
            },
          },
        );
      },
      onError: () => {
        // Still show the code even if backend fails (offline/loading)
        setOnlineError("⚠ Could not sync room — share code anyway.");
      },
    });
  };

  const handleJoinRoom = () => {
    const code = roomCodeInput.toUpperCase().trim();
    if (code.length !== 6) {
      setOnlineError("Enter a 6-char room code.");
      return;
    }
    joinRoom(
      { roomCode: code, playerName: playerName || "Player" },
      {
        onSuccess: () => {
          setJoinedRoom(code);
          setOnlineError("");
        },
        onError: () => setOnlineError("Room not found or error joining."),
      },
    );
  };

  const handleStartOnline = () => {
    onPlay(selectedMap, playerName || "Player", joinedRoom);
  };

  // Suppress unused import warning — MAP_CONFIGS used elsewhere in game logic
  void MAP_CONFIGS;

  const [activeSection, setActiveSection] = useState<
    "solo" | "online" | "settings"
  >("solo");

  const NAV_ITEMS: Array<{
    key: "solo" | "online" | "settings";
    label: string;
  }> = [
    { key: "solo", label: "PLAY" },
    { key: "online", label: "ONLINE" },
    { key: "settings", label: "SETTINGS" },
  ];

  const Y = "#f5c518";
  const F = "'Barlow Condensed', sans-serif";

  return (
    <div style={S.root} data-ocid="menu.panel">
      <div style={S.grid} />

      {/* LEFT SIDEBAR */}
      <div style={{ ...S.sidebar, position: "relative", zIndex: 2 }}>
        {/* Title */}
        <div style={{ padding: "0 20px 32px" }}>
          <div
            style={{
              color: "#888",
              fontSize: 10,
              letterSpacing: 4,
              fontFamily: F,
              marginBottom: 4,
            }}
          >
            BATTLE ROYALE
          </div>
          <div
            style={{
              color: Y,
              fontSize: 22,
              fontWeight: 900,
              fontFamily: F,
              letterSpacing: 2,
              lineHeight: 1.1,
            }}
          >
            BATTLEZONE
          </div>
          <div
            style={{
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: F,
              letterSpacing: 8,
            }}
          >
            BR
          </div>
        </div>

        {/* Nav items */}
        <div style={{ flex: 1 }}>
          {NAV_ITEMS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              data-ocid="menu.tab"
              onClick={() => setActiveSection(key)}
              style={{
                display: "block",
                width: "100%",
                background: "transparent",
                border: "none",
                borderLeft:
                  activeSection === key
                    ? `4px solid ${Y}`
                    : "4px solid transparent",
                padding: "14px 20px",
                textAlign: "left",
                fontFamily: F,
                fontSize: 16,
                fontWeight: 800,
                letterSpacing: 4,
                color: activeSection === key ? Y : "#888",
                cursor: "pointer",
                transition: "color 0.1s, border-color 0.1s",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Bottom separator */}
        <div
          style={{
            height: 2,
            background: Y,
            margin: "0 20px 20px",
            opacity: 0.8,
          }}
        />
        <div
          style={{
            color: "#555",
            fontSize: 10,
            fontFamily: F,
            letterSpacing: 2,
            padding: "0 20px",
            textAlign: "center",
          }}
        >
          © {new Date().getFullYear()} BATTLEZONE BR
        </div>
      </div>

      {/* RIGHT CONTENT PANEL */}
      <div style={{ ...S.content, position: "relative", zIndex: 2 }}>
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          style={{ maxWidth: 480, width: "100%" }}
        >
          {/* PLAY / SOLO section */}
          {activeSection === "solo" && (
            <>
              <div
                style={{
                  color: "#888",
                  fontSize: 11,
                  letterSpacing: 5,
                  fontFamily: F,
                  marginBottom: 6,
                }}
              >
                SELECT MODE
              </div>
              <div
                style={{
                  color: "#fff",
                  fontSize: 28,
                  fontWeight: 900,
                  fontFamily: F,
                  letterSpacing: 3,
                  marginBottom: 24,
                  borderBottom: "1px solid rgba(245,197,24,0.2)",
                  paddingBottom: 12,
                }}
              >
                SOLO <span style={{ color: Y }}>QUICKPLAY</span>
              </div>

              {/* Player name */}
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    color: "#888",
                    fontSize: 10,
                    letterSpacing: 4,
                    fontFamily: F,
                    marginBottom: 6,
                  }}
                >
                  PLAYER NAME
                </div>
                <input
                  data-ocid="menu.input"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={16}
                  placeholder="ENTER NAME"
                  style={{
                    background: "rgba(0,0,0,0.8)",
                    border: "none",
                    borderBottom: `2px solid ${Y}`,
                    color: "#fff",
                    fontFamily: F,
                    fontSize: 20,
                    fontWeight: 700,
                    letterSpacing: 3,
                    padding: "8px 0",
                    width: "100%",
                    outline: "none",
                    textTransform: "uppercase",
                  }}
                />
              </div>

              <motion.button
                type="button"
                onClick={() => onPlay(selectedMap, playerName || "Player")}
                data-ocid="menu.primary_button"
                whileHover={{ backgroundColor: "#ffd700" }}
                whileTap={{ scale: 0.97 }}
                style={{
                  width: "100%",
                  background: Y,
                  color: "#0d0d14",
                  border: "none",
                  padding: "16px 0",
                  fontSize: 22,
                  fontWeight: 900,
                  letterSpacing: 6,
                  cursor: "pointer",
                  fontFamily: F,
                  marginBottom: 20,
                }}
              >
                ▶ PLAY NOW
              </motion.button>

              {/* Controls */}
              <div
                style={{
                  background: "rgba(0,0,0,0.6)",
                  padding: "14px 16px",
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    color: "#888",
                    fontSize: 10,
                    letterSpacing: 4,
                    fontFamily: F,
                    marginBottom: 10,
                  }}
                >
                  CONTROLS
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "6px 16px",
                  }}
                >
                  {[
                    ["WASD", "Move"],
                    ["MOUSE", "Aim"],
                    ["CLICK", "Shoot"],
                    ["E", "Car / Pickup"],
                  ].map(([k, d]) => (
                    <div
                      key={k}
                      style={{ display: "flex", gap: 8, alignItems: "center" }}
                    >
                      <span
                        style={{
                          background: "rgba(245,197,24,0.15)",
                          border: `1px solid ${Y}`,
                          color: Y,
                          padding: "1px 6px",
                          fontSize: 10,
                          fontWeight: 700,
                          minWidth: 40,
                          textAlign: "center",
                          fontFamily: F,
                        }}
                      >
                        {k}
                      </span>
                      <span
                        style={{ color: "#888", fontSize: 12, fontFamily: F }}
                      >
                        {d}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Leaderboard */}
              <div
                data-ocid="menu.card"
                style={{ background: "rgba(0,0,0,0.6)", padding: "14px 16px" }}
              >
                <div
                  style={{
                    color: Y,
                    fontSize: 13,
                    fontWeight: 800,
                    letterSpacing: 4,
                    marginBottom: 10,
                    fontFamily: F,
                    borderBottom: "1px solid rgba(245,197,24,0.2)",
                    paddingBottom: 6,
                  }}
                >
                  LEADERBOARD
                </div>
                {isLoading && (
                  <div
                    style={{
                      color: "#888",
                      fontSize: 12,
                      textAlign: "center",
                      fontFamily: F,
                    }}
                    data-ocid="menu.loading_state"
                  >
                    LOADING...
                  </div>
                )}
                {!isLoading && (!scores || scores.length === 0) && (
                  <div
                    style={{
                      color: "#888",
                      fontSize: 12,
                      textAlign: "center",
                      fontFamily: F,
                    }}
                    data-ocid="menu.empty_state"
                  >
                    NO SCORES YET
                  </div>
                )}
                {scores && scores.length > 0 && (
                  <div data-ocid="menu.table">
                    {scores.slice(0, 5).map((s, i) => (
                      <div
                        key={`${s.name}_${i}`}
                        data-ocid={`menu.item.${i + 1}`}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "5px 0",
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                        }}
                      >
                        <span
                          style={{
                            color: i === 0 ? Y : "#888",
                            fontSize: 12,
                            fontWeight: 700,
                            fontFamily: F,
                            minWidth: 24,
                          }}
                        >
                          #{i + 1}
                        </span>
                        <span
                          style={{
                            color: "#fff",
                            fontSize: 13,
                            flex: 1,
                            marginLeft: 6,
                            fontFamily: F,
                          }}
                        >
                          {s.name}
                        </span>
                        <span
                          style={{
                            color: "#4ade80",
                            fontSize: 13,
                            fontWeight: 700,
                            fontFamily: F,
                          }}
                        >
                          {s.kills}K
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ONLINE section */}
          {activeSection === "online" && (
            <>
              <div
                style={{
                  color: "#888",
                  fontSize: 11,
                  letterSpacing: 5,
                  fontFamily: F,
                  marginBottom: 6,
                }}
              >
                MULTIPLAYER
              </div>
              <div
                style={{
                  color: "#fff",
                  fontSize: 28,
                  fontWeight: 900,
                  fontFamily: F,
                  letterSpacing: 3,
                  marginBottom: 24,
                  borderBottom: "1px solid rgba(245,197,24,0.2)",
                  paddingBottom: 12,
                }}
              >
                ONLINE <span style={{ color: Y }}>ROOMS</span>
              </div>

              {/* Player name */}
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    color: "#888",
                    fontSize: 10,
                    letterSpacing: 4,
                    fontFamily: F,
                    marginBottom: 6,
                  }}
                >
                  PLAYER NAME
                </div>
                <input
                  data-ocid="menu.input"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={16}
                  placeholder="ENTER NAME"
                  style={{
                    background: "rgba(0,0,0,0.8)",
                    border: "none",
                    borderBottom: `2px solid ${Y}`,
                    color: "#fff",
                    fontFamily: F,
                    fontSize: 20,
                    fontWeight: 700,
                    letterSpacing: 3,
                    padding: "8px 0",
                    width: "100%",
                    outline: "none",
                    textTransform: "uppercase",
                  }}
                />
              </div>

              <div
                style={{ overflowY: "auto", maxHeight: "calc(100vh - 300px)" }}
              >
                {!joinedRoom ? (
                  <>
                    <button
                      type="button"
                      data-ocid="menu.primary_button"
                      onClick={handleCreateRoom}
                      disabled={isCreating}
                      style={{
                        width: "100%",
                        background: isCreating ? "rgba(245,197,24,0.4)" : Y,
                        color: "#0d0d14",
                        border: "none",
                        padding: "14px 0",
                        fontSize: 18,
                        fontWeight: 900,
                        letterSpacing: 4,
                        cursor: isCreating ? "not-allowed" : "pointer",
                        fontFamily: F,
                        marginBottom: 16,
                      }}
                    >
                      {isCreating ? "CREATING..." : "+ CREATE ROOM"}
                    </button>

                    <div
                      style={{
                        color: "#555",
                        fontSize: 12,
                        letterSpacing: 3,
                        margin: "8px 0 16px",
                        textAlign: "center",
                        fontFamily: F,
                      }}
                    >
                      — OR JOIN —
                    </div>

                    <div
                      style={{
                        color: "#888",
                        fontSize: 10,
                        letterSpacing: 4,
                        marginBottom: 8,
                        textAlign: "center",
                        fontFamily: F,
                      }}
                    >
                      ENTER ROOM CODE
                    </div>
                    <RoomCodeInput
                      value={roomCodeInput}
                      onChange={setRoomCodeInput}
                    />

                    <button
                      type="button"
                      data-ocid="menu.secondary_button"
                      onClick={handleJoinRoom}
                      disabled={isJoining}
                      style={{
                        width: "100%",
                        background: "rgba(0,0,0,0.8)",
                        border: `1px solid ${Y}`,
                        color: Y,
                        fontFamily: F,
                        fontSize: 18,
                        fontWeight: 800,
                        letterSpacing: 4,
                        padding: "12px 0",
                        cursor: isJoining ? "not-allowed" : "pointer",
                        opacity: isJoining ? 0.6 : 1,
                      }}
                    >
                      {isJoining ? "JOINING..." : "JOIN ROOM"}
                    </button>

                    {onlineError && (
                      <div
                        style={{
                          color: "#ff4444",
                          fontSize: 12,
                          marginTop: 10,
                          textAlign: "center",
                          fontFamily: F,
                        }}
                        data-ocid="menu.error_state"
                      >
                        {onlineError}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ textAlign: "center" }} data-ocid="menu.panel">
                    <div
                      style={{
                        color: "#888",
                        fontSize: 10,
                        letterSpacing: 4,
                        marginBottom: 8,
                        fontFamily: F,
                      }}
                    >
                      ROOM CODE — SHARE WITH FRIENDS
                    </div>
                    <div style={{ position: "relative", marginBottom: 14 }}>
                      <div
                        style={{
                          color: Y,
                          fontSize: 36,
                          fontWeight: 900,
                          letterSpacing: 12,
                          background: "rgba(245,197,24,0.08)",
                          border: "2px solid rgba(245,197,24,0.6)",
                          padding: "14px 0",
                          fontFamily: F,
                        }}
                      >
                        {joinedRoom}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard
                            ?.writeText(joinedRoom)
                            .catch(() => {});
                        }}
                        style={{
                          marginTop: 6,
                          background: "rgba(245,197,24,0.15)",
                          border: "1px solid rgba(245,197,24,0.5)",
                          color: Y,
                          fontFamily: F,
                          fontSize: 12,
                          letterSpacing: 3,
                          padding: "6px 18px",
                          cursor: "pointer",
                          width: "100%",
                        }}
                      >
                        TAP TO COPY CODE
                      </button>
                    </div>

                    <div
                      data-ocid="menu.card"
                      style={{
                        background: "rgba(0,0,0,0.6)",
                        padding: "10px 14px",
                        marginBottom: 14,
                        textAlign: "left",
                      }}
                    >
                      <div
                        style={{
                          color: "#888",
                          fontSize: 10,
                          letterSpacing: 3,
                          marginBottom: 8,
                          borderBottom: "1px solid rgba(245,197,24,0.15)",
                          paddingBottom: 6,
                          fontFamily: F,
                        }}
                      >
                        PLAYERS IN ROOM:
                      </div>
                      {lobbyPlayers.length === 0 ? (
                        <div
                          style={{
                            color: "rgba(167,176,188,0.5)",
                            fontSize: 12,
                            textAlign: "center",
                            padding: "6px 0",
                            fontFamily: F,
                          }}
                          data-ocid="menu.loading_state"
                        >
                          Waiting for players...
                        </div>
                      ) : (
                        <div data-ocid="menu.list">
                          {lobbyPlayers.map((name, i) => (
                            <div
                              key={name}
                              data-ocid={`menu.item.${i + 1}`}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "5px 0",
                                borderBottom:
                                  "1px solid rgba(255,255,255,0.04)",
                              }}
                            >
                              <span
                                style={{
                                  width: 7,
                                  height: 7,
                                  borderRadius: "50%",
                                  background: "#4ade80",
                                  display: "inline-block",
                                  flexShrink: 0,
                                }}
                              />
                              <span
                                style={{
                                  color:
                                    name === (playerName || "Player")
                                      ? Y
                                      : "#fff",
                                  fontSize: 13,
                                  fontWeight: 700,
                                  letterSpacing: 2,
                                  fontFamily: F,
                                }}
                              >
                                {name.toUpperCase()}
                                {name === (playerName || "Player") && (
                                  <span
                                    style={{
                                      color: "#888",
                                      fontSize: 10,
                                      fontWeight: 400,
                                      marginLeft: 6,
                                    }}
                                  >
                                    (YOU)
                                  </span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {createdRoomCode && (
                      <div
                        style={{
                          color: "#888",
                          fontSize: 11,
                          marginBottom: 12,
                          fontFamily: F,
                        }}
                      >
                        You created this room. Share the code and start when
                        ready.
                      </div>
                    )}

                    <button
                      type="button"
                      data-ocid="menu.primary_button"
                      onClick={handleStartOnline}
                      style={{
                        width: "100%",
                        background: "#4ade80",
                        color: "#0d0d14",
                        border: "none",
                        padding: "14px 0",
                        fontSize: 20,
                        fontWeight: 900,
                        letterSpacing: 5,
                        cursor: "pointer",
                        fontFamily: F,
                        marginBottom: 10,
                      }}
                    >
                      START GAME
                    </button>
                    <button
                      type="button"
                      data-ocid="menu.cancel_button"
                      onClick={() => {
                        setJoinedRoom("");
                        setCreatedRoomCode("");
                        setLobbyPlayers([]);
                      }}
                      style={{
                        background: "transparent",
                        border: "1px solid rgba(255,255,255,0.15)",
                        color: "#888",
                        fontFamily: F,
                        fontSize: 13,
                        letterSpacing: 3,
                        padding: "6px 16px",
                        cursor: "pointer",
                      }}
                    >
                      LEAVE ROOM
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* SETTINGS section */}
          {activeSection === "settings" && (
            <>
              <div
                style={{
                  color: "#888",
                  fontSize: 11,
                  letterSpacing: 5,
                  fontFamily: F,
                  marginBottom: 6,
                }}
              >
                CONFIGURATION
              </div>
              <div
                style={{
                  color: "#fff",
                  fontSize: 28,
                  fontWeight: 900,
                  fontFamily: F,
                  letterSpacing: 3,
                  marginBottom: 24,
                  borderBottom: "1px solid rgba(245,197,24,0.2)",
                  paddingBottom: 12,
                }}
              >
                GAME <span style={{ color: Y }}>SETTINGS</span>
              </div>
              <div
                style={{
                  color: "#888",
                  fontSize: 11,
                  letterSpacing: 2,
                  fontFamily: F,
                  marginBottom: 12,
                }}
              >
                Adjust these settings before starting a game.
              </div>
              <div style={{ background: "rgba(0,0,0,0.6)", padding: "16px" }}>
                <div
                  style={{
                    color: "#888",
                    fontSize: 10,
                    letterSpacing: 4,
                    fontFamily: F,
                    marginBottom: 16,
                  }}
                >
                  CONTROLS &amp; DISPLAY
                </div>
                <div
                  style={{
                    color: "#555",
                    fontSize: 11,
                    fontFamily: F,
                    textAlign: "center",
                  }}
                >
                  Open the ⚙ settings button during gameplay to adjust
                  sensitivity and graphics quality.
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
