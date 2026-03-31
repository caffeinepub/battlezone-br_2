import { useEffect, useRef } from "react";
import type { GameDataRef } from "./types";

const MINIMAP_SIZE = 130;
const MAP_HALF = 100;
const SCALE = MINIMAP_SIZE / (MAP_HALF * 2);

function worldToMap(wx: number, wz: number) {
  return {
    x: (wx + MAP_HALF) * SCALE,
    y: (wz + MAP_HALF) * SCALE,
  };
}

interface MinimapProps {
  gameDataRef: React.RefObject<GameDataRef>;
}

export default function Minimap({ gameDataRef }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function draw() {
      if (!ctx || !canvas) return;
      const data = gameDataRef.current;

      ctx.clearRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

      // Background
      ctx.fillStyle = "rgba(14, 19, 26, 0.85)";
      ctx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

      // Zone ring
      const zoneScreenRadius = data.zoneRadius * SCALE;
      const center = MINIMAP_SIZE / 2;
      ctx.beginPath();
      ctx.arc(center, center, zoneScreenRadius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0, 170, 255, 0.7)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Zone fill (outside = danger)
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
      ctx.arc(center, center, zoneScreenRadius, 0, Math.PI * 2, true);
      ctx.fillStyle = "rgba(255, 0, 0, 0.12)";
      ctx.fill();
      ctx.restore();

      // Bots (red dots)
      for (const bot of data.bots) {
        if (!bot.alive) continue;
        const mp = worldToMap(bot.x, bot.z);
        ctx.beginPath();
        ctx.arc(mp.x, mp.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "#ff4444";
        ctx.fill();
      }

      // Player (white dot)
      const pp = worldToMap(data.player.x, data.player.z);
      ctx.beginPath();
      ctx.arc(pp.x, pp.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = "#F28C2A";
      ctx.lineWidth = 1;
      ctx.stroke();

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameDataRef]);

  return (
    <div
      style={{
        position: "relative",
        width: MINIMAP_SIZE,
        height: MINIMAP_SIZE,
        borderRadius: "50%",
        overflow: "hidden",
        border: "2px solid rgba(242, 140, 42, 0.6)",
        boxShadow: "0 0 12px rgba(0,0,0,0.8)",
      }}
    >
      <canvas ref={canvasRef} width={MINIMAP_SIZE} height={MINIMAP_SIZE} />
    </div>
  );
}
