import { Canvas } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";
import GameScene from "./GameScene";
import HUD from "./HUD";
import { BOT_COUNT, ZONE_INITIAL_RADIUS } from "./constants";
import type {
  GameDataRef,
  GamePhase,
  HudState,
  MapType,
  MobileInput,
  OnlinePlayer,
  WeaponType,
} from "./types";

const DEFAULT_HUD: HudState = {
  health: 100,
  armor: 50,
  stamina: 100,
  kills: 0,
  alivePlayers: BOT_COUNT + 1,
  weapon: "AR" as WeaponType,
  ammo: 30,
  maxAmmo: 30,
  zoneTimeLeft: 30,
  inCar: false,
  carSpeed: 0,
};

function initGameData(): GameDataRef {
  return {
    player: { x: 0, z: 0 },
    bots: Array.from({ length: BOT_COUNT }, () => ({
      x: 0,
      z: 0,
      alive: true,
    })),
    zoneRadius: ZONE_INITIAL_RADIUS,
  };
}

interface GameContainerProps {
  phase: GamePhase;
  finalKills: number;
  onDead: (kills: number) => void;
  onWin: (kills: number) => void;
  onRestart: () => void;
  mapType: MapType;
  playerName: string;
  roomId?: string;
  isOnline: boolean;
  remotePlayersRef: React.RefObject<OnlinePlayer[]>;
  onUpdatePosition: (x: number, z: number, health: number) => void;
}

export default function GameContainer({
  phase,
  finalKills,
  onDead,
  onWin,
  onRestart,
  mapType,
  playerName,
  roomId,
  isOnline,
  remotePlayersRef,
  onUpdatePosition,
}: GameContainerProps) {
  const [hud, setHud] = useState<HudState>(DEFAULT_HUD);
  const [isLocked, setIsLocked] = useState(false);
  const [sensitivity, setSensitivity] = useState(5);
  const [graphicsQuality, setGraphicsQuality] = useState<
    "low" | "medium" | "high"
  >("high");
  const sensitivityRef = useRef(5);
  useEffect(() => {
    sensitivityRef.current = sensitivity;
  }, [sensitivity]);

  const gameDataRef = useRef<GameDataRef>(initGameData());
  const mobileInputRef = useRef<MobileInput>({
    moveX: 0,
    moveZ: 0,
    lookDeltaX: 0,
    lookDeltaY: 0,
    shoot: false,
    interact: false,
    sprint: false,
  });

  const F = "'Barlow Condensed', sans-serif";

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        background: "#0E131A",
      }}
    >
      <Canvas
        style={{ width: "100%", height: "100%" }}
        camera={{ fov: 75, near: 0.1, far: 300, position: [0, 5, 10] }}
        shadows={graphicsQuality !== "low"}
        gl={{ antialias: graphicsQuality !== "low" }}
      >
        {phase === "playing" && (
          <GameScene
            onHudUpdate={setHud}
            onDead={onDead}
            onWin={onWin}
            onLockChange={setIsLocked}
            gameDataRef={gameDataRef}
            mapType={mapType}
            playerName={playerName}
            mobileInputRef={mobileInputRef}
            remotePlayersRef={remotePlayersRef}
            isOnline={isOnline}
            onUpdatePosition={onUpdatePosition}
            sensitivityRef={sensitivityRef}
            graphicsQuality={graphicsQuality}
          />
        )}
      </Canvas>

      {phase === "playing" && (
        <HUD
          hud={hud}
          gameDataRef={gameDataRef}
          isLocked={isLocked}
          mobileInputRef={mobileInputRef}
          isOnline={isOnline}
          roomId={roomId}
          playerName={playerName}
          sensitivity={sensitivity}
          graphicsQuality={graphicsQuality}
          onSensitivityChange={setSensitivity}
          onGraphicsChange={setGraphicsQuality}
        />
      )}

      {phase === "dead" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(14,19,26,0.92)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: F,
          }}
          data-ocid="dead.panel"
        >
          <div
            style={{
              color: "#ff4444",
              fontSize: "clamp(48px,12vw,72px)",
              fontWeight: 900,
              letterSpacing: 6,
              lineHeight: 1,
            }}
          >
            YOU DIED
          </div>
          <div
            style={{
              color: "#A7B0BC",
              fontSize: 18,
              marginTop: 12,
              letterSpacing: 3,
            }}
          >
            ELIMINATED
          </div>
          <div style={{ marginTop: 28 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#F28C2A", fontSize: 44, fontWeight: 900 }}>
                {finalKills}
              </div>
              <div style={{ color: "#A7B0BC", fontSize: 12, letterSpacing: 3 }}>
                KILLS
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onRestart}
            data-ocid="dead.primary_button"
            style={{
              marginTop: 36,
              background: "#F28C2A",
              color: "#0E131A",
              border: "none",
              padding: "14px 48px",
              fontSize: 20,
              fontWeight: 900,
              letterSpacing: 4,
              cursor: "pointer",
              fontFamily: F,
            }}
          >
            PLAY AGAIN
          </button>
        </div>
      )}

      {phase === "win" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(14,19,26,0.92)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: F,
          }}
          data-ocid="win.panel"
        >
          <div
            style={{
              color: "#F28C2A",
              fontSize: "clamp(40px,10vw,60px)",
              fontWeight: 900,
              letterSpacing: 4,
              lineHeight: 1,
            }}
          >
            WINNER WINNER
          </div>
          <div
            style={{
              color: "#67D46B",
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: 6,
              marginTop: 6,
            }}
          >
            CHICKEN DINNER
          </div>
          <div style={{ marginTop: 28 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#F28C2A", fontSize: 44, fontWeight: 900 }}>
                {finalKills}
              </div>
              <div style={{ color: "#A7B0BC", fontSize: 12, letterSpacing: 3 }}>
                KILLS
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onRestart}
            data-ocid="win.primary_button"
            style={{
              marginTop: 36,
              background: "#F28C2A",
              color: "#0E131A",
              border: "none",
              padding: "14px 48px",
              fontSize: 20,
              fontWeight: 900,
              letterSpacing: 4,
              cursor: "pointer",
              fontFamily: F,
            }}
          >
            PLAY AGAIN
          </button>
        </div>
      )}
    </div>
  );
}
