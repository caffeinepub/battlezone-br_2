import { useEffect, useRef, useState } from "react";
import GameContainer from "./components/game/GameContainer";
import Menu from "./components/game/Menu";
import type { GamePhase, MapType, OnlinePlayer } from "./components/game/types";
import { useActor } from "./hooks/useActor";
import { useSubmitScore } from "./hooks/useQueries";

// Positions in the game range from -99 to +99.
// The backend stores positions as Nat32 (unsigned), so we offset by +100
// when writing (making the range 1-199) and subtract 100 when reading.
const POS_OFFSET = 100;

export default function App() {
  const [phase, setPhase] = useState<GamePhase>("menu");
  const [finalKills, setFinalKills] = useState(0);
  const [gameKey, setGameKey] = useState(0);
  const [playerName, setPlayerName] = useState("Player");
  const [selectedMap, setSelectedMap] = useState<MapType>("city");
  const [roomId, setRoomId] = useState<string | undefined>(undefined);
  const [isOnline, setIsOnline] = useState(false);
  const remotePlayersRef = useRef<OnlinePlayer[]>([]);

  const { actor } = useActor();
  const { mutate: submitScore } = useSubmitScore();

  // Online polling — decode positions by subtracting the offset
  useEffect(() => {
    if (!isOnline || !roomId || !actor || phase !== "playing") return;
    const id = setInterval(async () => {
      try {
        const players = await actor.getRoomState(roomId);
        remotePlayersRef.current = players
          .filter((p) => p.name !== playerName)
          .map((p) => ({
            name: p.name,
            x: Number(p.position) - POS_OFFSET,
            z: Number(p.zPosition) - POS_OFFSET,
            health: p.health,
            isAlive: p.isAlive,
          }));
      } catch {
        // ignore
      }
    }, 200);
    return () => clearInterval(id);
  }, [isOnline, roomId, actor, playerName, phase]);

  // Encode positions by adding the offset before sending to backend
  const handleUpdatePosition = (x: number, z: number, health: number) => {
    if (!isOnline || !roomId || !actor) return;
    actor
      .updatePlayerState(
        roomId,
        playerName,
        Math.round(x + POS_OFFSET),
        Math.round(z + POS_OFFSET),
        Math.max(0, Math.round(health)),
      )
      .catch(() => {});
  };

  const handleDead = (kills: number) => {
    setFinalKills(kills);
    setPhase("dead");
    submitScore({
      name: playerName,
      kills,
      placement: Math.max(1, 11 - kills),
    });
    if (isOnline && roomId && actor) {
      actor.leaveRoom(roomId, playerName).catch(() => {});
    }
  };

  const handleWin = (kills: number) => {
    setFinalKills(kills);
    setPhase("win");
    submitScore({ name: playerName, kills, placement: 1 });
    if (isOnline && roomId && actor) {
      actor.leaveRoom(roomId, playerName).catch(() => {});
    }
  };

  const handleRestart = () => {
    setPhase("menu");
    setGameKey((k) => k + 1);
    setFinalKills(0);
    setIsOnline(false);
    setRoomId(undefined);
    remotePlayersRef.current = [];
  };

  const handlePlay = (mapType: MapType, name: string, rid?: string) => {
    setPlayerName(name || "Player");
    setSelectedMap(mapType);
    setRoomId(rid);
    setIsOnline(!!rid);
    setPhase("playing");
    setGameKey((k) => k + 1);
  };

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      {phase === "menu" && <Menu onPlay={handlePlay} />}
      {(phase === "playing" || phase === "dead" || phase === "win") && (
        <GameContainer
          key={gameKey}
          phase={phase}
          finalKills={finalKills}
          onDead={handleDead}
          onWin={handleWin}
          onRestart={handleRestart}
          mapType={selectedMap}
          playerName={playerName}
          roomId={roomId}
          isOnline={isOnline}
          remotePlayersRef={remotePlayersRef}
          onUpdatePosition={handleUpdatePosition}
        />
      )}
      <div
        style={{
          position: "fixed",
          bottom: 6,
          left: "50%",
          transform: "translateX(-50%)",
          color: "rgba(167,176,188,0.4)",
          fontSize: 10,
          letterSpacing: 2,
          fontFamily: "'Barlow', sans-serif",
          pointerEvents: "none",
          zIndex: 9999,
          whiteSpace: "nowrap",
        }}
      >
        © {new Date().getFullYear()} Built with ♥ using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          style={{
            color: "rgba(167,176,188,0.4)",
            textDecoration: "none",
            pointerEvents: "all",
          }}
          target="_blank"
          rel="noreferrer"
        >
          caffeine.ai
        </a>
      </div>
    </div>
  );
}
