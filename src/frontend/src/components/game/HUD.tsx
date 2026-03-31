import { useRef, useState } from "react";
import ChatPanel from "./ChatPanel";
import Minimap from "./Minimap";
import type { GameDataRef, HudState, MobileInput } from "./types";

const isMobileDevice = () =>
  typeof window !== "undefined" &&
  (window.innerWidth < 900 || "ontouchstart" in window);

const JOYSTICK_OUTER = 50;
const JOYSTICK_KNOB = 22;

interface JoystickState {
  active: boolean;
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  touchId: number | null;
}

function initJoy(): JoystickState {
  return { active: false, startX: 0, startY: 0, dx: 0, dy: 0, touchId: null };
}

interface HUDProps {
  hud: HudState;
  gameDataRef: React.RefObject<GameDataRef>;
  isLocked: boolean;
  mobileInputRef: React.RefObject<MobileInput>;
  isOnline?: boolean;
  roomId?: string;
  playerName?: string;
  sensitivity?: number;
  graphicsQuality?: "low" | "medium" | "high";
  onSensitivityChange?: (v: number) => void;
  onGraphicsChange?: (v: "low" | "medium" | "high") => void;
}

export default function HUD({
  hud,
  gameDataRef,
  isLocked,
  mobileInputRef,
  isOnline = false,
  roomId = "",
  playerName = "Player",
  sensitivity = 5,
  graphicsQuality = "high",
  onSensitivityChange,
  onGraphicsChange,
}: HUDProps) {
  const healthPct = Math.max(0, Math.min(100, hud.health));
  const armorPct = Math.max(0, Math.min(100, hud.armor));
  const staminaPct = Math.max(0, Math.min(100, hud.stamina ?? 100));
  const ammoPct = hud.maxAmmo > 0 ? (hud.ammo / hud.maxAmmo) * 100 : 0;
  const isMobile = isMobileDevice();

  const [chatOpen, setChatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Touch-anywhere camera zone state
  const touchCamRef = useRef<{
    active: boolean;
    lastX: number;
    lastY: number;
    touchId: number | null;
  }>({ active: false, lastX: 0, lastY: 0, touchId: null });

  const onTouchCamStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    touchCamRef.current = {
      active: true,
      lastX: touch.clientX,
      lastY: touch.clientY,
      touchId: touch.identifier,
    };
  };
  const onTouchCamMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const ref = touchCamRef.current;
    if (!ref.active) return;
    const touch = Array.from(e.changedTouches).find(
      (t) => t.identifier === ref.touchId,
    );
    if (!touch) return;
    const dx = touch.clientX - ref.lastX;
    const dy = touch.clientY - ref.lastY;
    ref.lastX = touch.clientX;
    ref.lastY = touch.clientY;
    if (mobileInputRef.current) {
      mobileInputRef.current.lookDeltaX += dx * 0.5;
      mobileInputRef.current.lookDeltaY += dy * 0.5;
    }
  };
  const onTouchCamEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    const ref = touchCamRef.current;
    const touch = Array.from(e.changedTouches).find(
      (t) => t.identifier === ref.touchId,
    );
    if (touch)
      touchCamRef.current = {
        active: false,
        lastX: 0,
        lastY: 0,
        touchId: null,
      };
  };

  const leftJoyRef = useRef<JoystickState>(initJoy());
  const rightJoyRef = useRef<JoystickState>(initJoy());
  const [leftKnob, setLeftKnob] = useState({ x: 0, y: 0 });
  const [rightKnob, setRightKnob] = useState({ x: 0, y: 0 });

  const onLeftStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    leftJoyRef.current = {
      active: true,
      startX: touch.clientX,
      startY: touch.clientY,
      dx: 0,
      dy: 0,
      touchId: touch.identifier,
    };
  };
  const onLeftMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const joy = leftJoyRef.current;
    if (!joy.active) return;
    const touch = Array.from(e.changedTouches).find(
      (t) => t.identifier === joy.touchId,
    );
    if (!touch) return;
    const rawDx = touch.clientX - joy.startX;
    const rawDy = touch.clientY - joy.startY;
    const dist = Math.sqrt(rawDx * rawDx + rawDy * rawDy);
    const clamp = Math.min(dist, JOYSTICK_OUTER);
    const angle = Math.atan2(rawDy, rawDx);
    const ox = Math.cos(angle) * clamp;
    const oy = Math.sin(angle) * clamp;
    joy.dx = ox / JOYSTICK_OUTER;
    joy.dy = oy / JOYSTICK_OUTER;
    setLeftKnob({ x: ox, y: oy });
    if (mobileInputRef.current) {
      mobileInputRef.current.moveX = joy.dx;
      mobileInputRef.current.moveZ = joy.dy;
    }
  };
  const onLeftEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = Array.from(e.changedTouches).find(
      (t) => t.identifier === leftJoyRef.current.touchId,
    );
    if (!touch) return;
    leftJoyRef.current = initJoy();
    setLeftKnob({ x: 0, y: 0 });
    if (mobileInputRef.current) {
      mobileInputRef.current.moveX = 0;
      mobileInputRef.current.moveZ = 0;
    }
  };

  const onRightStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    rightJoyRef.current = {
      active: true,
      startX: touch.clientX,
      startY: touch.clientY,
      dx: 0,
      dy: 0,
      touchId: touch.identifier,
    };
  };
  const onRightMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const joy = rightJoyRef.current;
    if (!joy.active) return;
    const touch = Array.from(e.changedTouches).find(
      (t) => t.identifier === joy.touchId,
    );
    if (!touch) return;
    const rawDx = touch.clientX - joy.startX;
    const rawDy = touch.clientY - joy.startY;
    if (mobileInputRef.current) {
      mobileInputRef.current.lookDeltaX += rawDx * 0.5;
      mobileInputRef.current.lookDeltaY += rawDy * 0.5;
    }
    const dist = Math.sqrt(rawDx * rawDx + rawDy * rawDy);
    const clamp = Math.min(dist, JOYSTICK_OUTER);
    const angle = Math.atan2(rawDy, rawDx);
    setRightKnob({ x: Math.cos(angle) * clamp, y: Math.sin(angle) * clamp });
    rightJoyRef.current.startX = touch.clientX;
    rightJoyRef.current.startY = touch.clientY;
  };
  const onRightEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = Array.from(e.changedTouches).find(
      (t) => t.identifier === rightJoyRef.current.touchId,
    );
    if (!touch) return;
    rightJoyRef.current = initJoy();
    setRightKnob({ x: 0, y: 0 });
  };

  const onShootStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (mobileInputRef.current) mobileInputRef.current.shoot = true;
  };
  const onShootEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    if (mobileInputRef.current) mobileInputRef.current.shoot = false;
  };
  const onInteract = (e: React.TouchEvent) => {
    e.preventDefault();
    if (mobileInputRef.current) mobileInputRef.current.interact = true;
  };
  const onSprintStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (mobileInputRef.current) mobileInputRef.current.sprint = true;
  };
  const onSprintEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    if (mobileInputRef.current) mobileInputRef.current.sprint = false;
  };

  const joystickBase: React.CSSProperties = {
    width: JOYSTICK_OUTER * 2,
    height: JOYSTICK_OUTER * 2,
    borderRadius: "50%",
    border: "2px solid rgba(242,140,42,0.5)",
    background: "rgba(14,19,26,0.55)",
    position: "relative" as const,
    touchAction: "none",
    flexShrink: 0,
  };

  const knobStyle = (ox: number, oy: number): React.CSSProperties => ({
    position: "absolute",
    left: "50%",
    top: "50%",
    width: JOYSTICK_KNOB * 2,
    height: JOYSTICK_KNOB * 2,
    borderRadius: "50%",
    background: "rgba(242,140,42,0.75)",
    transform: `translate(calc(-50% + ${ox}px), calc(-50% + ${oy}px))`,
    pointerEvents: "none" as const,
  });

  // Crosshair is always visible
  const showFullCrosshair = isLocked || isMobile;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        fontFamily: "'Barlow Condensed', sans-serif",
        userSelect: "none",
      }}
    >
      {/* Always-visible crosshair */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%,-50%)",
          width: 24,
          height: 24,
        }}
      >
        {/* Center dot */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: "white",
            opacity: 0.7,
            transform: "translate(-50%, -50%)",
          }}
        />
        {/* 4-arm lines (desktop when locked OR always on mobile) */}
        {showFullCrosshair &&
          [
            { k: "top", l: 11, t: 0, w: 2, h: 7 },
            { k: "bot", l: 11, t: 17, w: 2, h: 7 },
            { k: "lft", l: 0, t: 11, w: 7, h: 2 },
            { k: "rgt", l: 17, t: 11, w: 7, h: 2 },
          ].map(({ k, l, t, w, h }) => (
            <div
              key={k}
              style={{
                position: "absolute",
                left: l,
                top: t,
                width: w,
                height: h,
                background: "white",
                opacity: 0.88,
              }}
            />
          ))}
      </div>

      {/* Bottom-center: Health + Armor + Stamina */}
      <div
        style={{
          position: "absolute",
          bottom: isMobile ? 200 : 24,
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(14,19,26,0.82)",
          border: "1px solid rgba(242,140,42,0.4)",
          padding: "8px 12px",
          minWidth: 220,
          maxWidth: 280,
        }}
      >
        {/* Health */}
        <div style={{ marginBottom: 6 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 2,
            }}
          >
            <span style={{ color: "#A7B0BC", fontSize: 10, letterSpacing: 2 }}>
              HEALTH
            </span>
            <span
              style={{
                color: hud.health > 40 ? "#67D46B" : "#ff4444",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {Math.round(hud.health)}
            </span>
          </div>
          <div
            style={{
              height: 5,
              background: "rgba(255,255,255,0.1)",
              borderRadius: 2,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${healthPct}%`,
                background:
                  healthPct > 40
                    ? "#67D46B"
                    : healthPct > 20
                      ? "#F28C2A"
                      : "#ff4444",
                transition: "width 0.15s",
                borderRadius: 2,
              }}
            />
          </div>
        </div>
        {/* Armor */}
        <div style={{ marginBottom: 6 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 2,
            }}
          >
            <span style={{ color: "#A7B0BC", fontSize: 10, letterSpacing: 2 }}>
              ARMOR
            </span>
            <span style={{ color: "#4B9EF2", fontSize: 13, fontWeight: 700 }}>
              {Math.round(hud.armor)}
            </span>
          </div>
          <div
            style={{
              height: 5,
              background: "rgba(255,255,255,0.1)",
              borderRadius: 2,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${armorPct}%`,
                background: "#4B9EF2",
                transition: "width 0.15s",
                borderRadius: 2,
              }}
            />
          </div>
        </div>
      </div>
      {/* GTA V Style Stamina Bar - bottom right */}
      <div
        style={{
          position: "fixed",
          bottom: 60,
          right: 16,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 3,
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            color: "rgba(255,255,255,0.85)",
            fontSize: 9,
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: 3,
            fontVariant: "small-caps",
            textTransform: "uppercase",
          }}
        >
          STAMINA
        </span>
        <div
          style={{
            width: 80,
            height: 6,
            background: "rgba(0,0,0,0.6)",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${staminaPct}%`,
              background:
                staminaPct > 50
                  ? "#4ade80"
                  : staminaPct > 25
                    ? "#a3e635"
                    : "#facc15",
              transition: "width 0.1s",
            }}
          />
        </div>
      </div>

      {/* Top-right: Kills + Alive + Chat toggle */}
      <div
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 6,
        }}
      >
        <div
          style={{
            background: "rgba(14,19,26,0.82)",
            border: "1px solid rgba(242,140,42,0.4)",
            padding: "8px 12px",
            textAlign: "right",
          }}
          data-ocid="hud.panel"
        >
          <div
            style={{
              color: "#F28C2A",
              fontSize: 26,
              fontWeight: 900,
              lineHeight: 1,
            }}
          >
            {hud.kills}
          </div>
          <div
            style={{
              color: "#A7B0BC",
              fontSize: 10,
              letterSpacing: 2,
              marginBottom: 6,
            }}
          >
            KILLS
          </div>
          <div
            style={{
              color: "#F2F4F7",
              fontSize: 18,
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            {hud.alivePlayers}
          </div>
          <div style={{ color: "#A7B0BC", fontSize: 10, letterSpacing: 2 }}>
            ALIVE
          </div>
        </div>

        {/* Chat toggle button (online only) */}
        {isOnline && (
          <button
            type="button"
            data-ocid="hud.button"
            onClick={() => setChatOpen((v) => !v)}
            style={{
              pointerEvents: "auto",
              background: chatOpen
                ? "rgba(242,140,42,0.25)"
                : "rgba(14,19,26,0.82)",
              border: `1px solid ${chatOpen ? "#F28C2A" : "rgba(242,140,42,0.4)"}`,
              color: "#F28C2A",
              fontSize: 20,
              padding: "6px 10px",
              cursor: "pointer",
              letterSpacing: 1,
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
            }}
          >
            💬<span style={{ fontSize: 10, letterSpacing: 2 }}>CHAT</span>
          </button>
        )}
      </div>

      {/* Chat Panel */}
      {isOnline && chatOpen && (
        <ChatPanel
          roomId={roomId}
          playerName={playerName}
          visible={chatOpen}
          onClose={() => setChatOpen(false)}
        />
      )}

      {/* Car driving badge */}
      {hud.inCar && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(26,74,138,0.9)",
            border: "1px solid #4488ff",
            padding: "6px 16px",
            color: "#4488ff",
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: 3,
          }}
        >
          🚗 DRIVING — PRESS E TO EXIT
        </div>
      )}

      {/* Bottom-right: Weapon + Ammo */}
      {!hud.inCar && (
        <div
          style={{
            position: "absolute",
            bottom: isMobile ? 200 : 24,
            right: 12,
            background: "rgba(14,19,26,0.82)",
            border: "1px solid rgba(242,140,42,0.4)",
            padding: "8px 12px",
            textAlign: "right",
            minWidth: 130,
          }}
        >
          <div
            style={{
              color: "#F28C2A",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 3,
              marginBottom: 3,
            }}
          >
            {hud.weapon}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "baseline",
              gap: 3,
              marginBottom: 3,
            }}
          >
            <span
              style={{
                color: "#F2F4F7",
                fontSize: 24,
                fontWeight: 900,
                lineHeight: 1,
              }}
            >
              {hud.ammo}
            </span>
            <span style={{ color: "#A7B0BC", fontSize: 14 }}>
              / {hud.maxAmmo}
            </span>
          </div>
          <div
            style={{
              height: 4,
              background: "rgba(255,255,255,0.1)",
              borderRadius: 2,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${ammoPct}%`,
                background: "#F28C2A",
                transition: "width 0.1s",
                borderRadius: 2,
              }}
            />
          </div>
          <div
            style={{
              color: "#A7B0BC",
              fontSize: 9,
              letterSpacing: 2,
              marginTop: 3,
            }}
          >
            {isMobile ? "TAP E TO PICKUP" : "PRESS E: PICKUP / CAR"}
          </div>
        </div>
      )}

      {/* Bottom-center: Zone timer */}
      <div
        style={{
          position: "absolute",
          bottom: isMobile ? 260 : 84,
          left: "50%",
          transform: "translateX(-50%)",
          background:
            hud.zoneTimeLeft <= 5
              ? "rgba(255,68,68,0.85)"
              : "rgba(14,19,26,0.82)",
          border: `1px solid ${
            hud.zoneTimeLeft <= 5 ? "#ff4444" : "rgba(0,170,255,0.5)"
          }`,
          padding: "5px 14px",
          textAlign: "center",
          transition: "background 0.3s",
        }}
      >
        <div
          style={{
            color: "#00aaff",
            fontSize: 10,
            letterSpacing: 3,
            marginBottom: 1,
          }}
        >
          ZONE SHRINKS IN
        </div>
        <div style={{ color: "#F2F4F7", fontSize: 20, fontWeight: 700 }}>
          {Math.ceil(hud.zoneTimeLeft)}s
        </div>
      </div>

      {/* Bottom-left: Minimap */}
      <div
        style={{ position: "absolute", bottom: isMobile ? 200 : 24, left: 12 }}
      >
        <Minimap gameDataRef={gameDataRef} />
      </div>

      {/* Settings gear button */}
      <button
        type="button"
        data-ocid="settings.open_modal_button"
        onClick={() => setSettingsOpen(true)}
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          pointerEvents: "auto",
          background: "rgba(14,19,26,0.82)",
          border: "1px solid rgba(242,140,42,0.6)",
          color: "#F28C2A",
          fontSize: 20,
          width: 40,
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          borderRadius: 4,
          zIndex: 10,
        }}
        title="Settings"
      >
        ⚙
      </button>

      {/* Touch-anywhere camera zone (right 50%, above control bar) */}
      {isMobile && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 190,
            width: "50%",
            pointerEvents: "auto",
            zIndex: 1,
          }}
          onTouchStart={onTouchCamStart}
          onTouchMove={onTouchCamMove}
          onTouchEnd={onTouchCamEnd}
          onTouchCancel={onTouchCamEnd}
        />
      )}

      {/* Settings overlay */}
      {settingsOpen && (
        <div
          data-ocid="settings.modal"
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(14,19,26,0.88)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "auto",
            zIndex: 100,
            fontFamily: "'Barlow Condensed', sans-serif",
          }}
        >
          <div
            style={{
              background: "rgba(14,19,26,0.97)",
              border: "1px solid rgba(242,140,42,0.4)",
              padding: "28px 32px",
              maxWidth: 340,
              width: "90%",
              position: "relative",
            }}
          >
            {/* Close button */}
            <button
              type="button"
              data-ocid="settings.close_button"
              onClick={() => setSettingsOpen(false)}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                background: "transparent",
                border: "none",
                color: "#A7B0BC",
                fontSize: 22,
                cursor: "pointer",
                lineHeight: 1,
                padding: 4,
              }}
            >
              ✕
            </button>

            <div
              style={{
                color: "#F28C2A",
                fontSize: 22,
                fontWeight: 900,
                letterSpacing: 4,
                marginBottom: 28,
              }}
            >
              SETTINGS
            </div>

            {/* Sensitivity */}
            <div style={{ marginBottom: 28 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <span
                  style={{ color: "#A7B0BC", fontSize: 12, letterSpacing: 3 }}
                >
                  SENSITIVITY
                </span>
                <span
                  style={{ color: "#F28C2A", fontSize: 16, fontWeight: 800 }}
                >
                  {sensitivity}
                </span>
              </div>
              <input
                data-ocid="settings.input"
                type="range"
                min={1}
                max={10}
                value={sensitivity}
                onChange={(e) => onSensitivityChange?.(Number(e.target.value))}
                style={{
                  width: "100%",
                  accentColor: "#F28C2A",
                  cursor: "pointer",
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 4,
                }}
              >
                <span
                  style={{ color: "#A7B0BC", fontSize: 9, letterSpacing: 1 }}
                >
                  SLOW
                </span>
                <span
                  style={{ color: "#A7B0BC", fontSize: 9, letterSpacing: 1 }}
                >
                  FAST
                </span>
              </div>
            </div>

            {/* Graphics Quality */}
            <div>
              <div
                style={{
                  color: "#A7B0BC",
                  fontSize: 12,
                  letterSpacing: 3,
                  marginBottom: 10,
                }}
              >
                GRAPHICS QUALITY
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {(["LOW", "MEDIUM", "HIGH"] as const).map((q) => (
                  <button
                    key={q}
                    type="button"
                    data-ocid={`settings.${q.toLowerCase()}.button`}
                    onClick={() =>
                      onGraphicsChange?.(
                        q.toLowerCase() as "low" | "medium" | "high",
                      )
                    }
                    style={{
                      flex: 1,
                      padding: "8px 4px",
                      background:
                        graphicsQuality === q.toLowerCase()
                          ? "#F28C2A"
                          : "rgba(14,19,26,0.8)",
                      border: `1px solid ${graphicsQuality === q.toLowerCase() ? "#F28C2A" : "rgba(242,140,42,0.4)"}`,
                      color:
                        graphicsQuality === q.toLowerCase()
                          ? "#0E131A"
                          : "#A7B0BC",
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: 2,
                      cursor: "pointer",
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop hint */}
      {!isLocked && !isMobile && (
        <div
          style={{
            position: "absolute",
            bottom: 170,
            left: "50%",
            transform: "translateX(-50%)",
            color: "#F28C2A",
            fontSize: 12,
            letterSpacing: 2,
            background: "rgba(14,19,26,0.85)",
            padding: "5px 14px",
            border: "1px solid rgba(242,140,42,0.4)",
          }}
        >
          CLICK TO LOCK MOUSE · SHIFT TO SPRINT
        </div>
      )}

      {/* Mobile touch controls */}
      {isMobile && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 190,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 20px",
            pointerEvents: "auto",
          }}
        >
          {/* Left section: SPRINT button above MOVE joystick */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            {/* Sprint button — above move joystick */}
            <button
              type="button"
              style={{
                width: 64,
                height: 30,
                borderRadius: 6,
                background: "rgba(242,201,76,0.2)",
                border: "2px solid rgba(242,201,76,0.7)",
                color: "#F2C94C",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: 1,
                cursor: "pointer",
                touchAction: "none",
              }}
              onTouchStart={onSprintStart}
              onTouchEnd={onSprintEnd}
              onTouchCancel={onSprintEnd}
              data-ocid="hud.toggle"
            >
              SPRINT
            </button>

            {/* Left joystick — movement */}
            <div
              style={joystickBase}
              onTouchStart={onLeftStart}
              onTouchMove={onLeftMove}
              onTouchEnd={onLeftEnd}
              onTouchCancel={onLeftEnd}
            >
              <div style={knobStyle(leftKnob.x, leftKnob.y)} />
              <span
                style={{
                  position: "absolute",
                  bottom: -20,
                  left: 0,
                  right: 0,
                  textAlign: "center",
                  color: "rgba(167,176,188,0.5)",
                  fontSize: 9,
                  letterSpacing: 1,
                }}
              >
                MOVE
              </span>
            </div>
          </div>

          {/* Center buttons — E only */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              alignItems: "center",
            }}
          >
            {/* E button */}
            <button
              type="button"
              style={{
                width: 64,
                height: 30,
                borderRadius: 6,
                background: "rgba(75,158,242,0.25)",
                border: "2px solid rgba(75,158,242,0.7)",
                color: "#4B9EF2",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 1,
                cursor: "pointer",
                touchAction: "none",
              }}
              onTouchStart={onInteract}
              data-ocid="hud.button"
            >
              E
            </button>
          </div>

          {/* Right side: FIRE button + camera joystick */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            {/* Fire button — next to camera joystick */}
            <div
              style={{
                width: 70,
                height: 70,
                borderRadius: "50%",
                background: "rgba(255,68,68,0.25)",
                border: "3px solid rgba(255,68,68,0.8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ff4444",
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: 1,
                touchAction: "none",
              }}
              onTouchStart={onShootStart}
              onTouchEnd={onShootEnd}
              onTouchCancel={onShootEnd}
            >
              FIRE
            </div>

            {/* Right joystick — look */}
            <div
              style={joystickBase}
              onTouchStart={onRightStart}
              onTouchMove={onRightMove}
              onTouchEnd={onRightEnd}
              onTouchCancel={onRightEnd}
            >
              <div style={knobStyle(rightKnob.x, rightKnob.y)} />
              <span
                style={{
                  position: "absolute",
                  bottom: -20,
                  left: 0,
                  right: 0,
                  textAlign: "center",
                  color: "rgba(167,176,188,0.5)",
                  fontSize: 9,
                  letterSpacing: 1,
                }}
              >
                LOOK
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
