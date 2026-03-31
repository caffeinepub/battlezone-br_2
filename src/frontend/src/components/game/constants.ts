import type {
  BuildingDef,
  PickupDef,
  TreeDef,
  WeaponStats,
  WeaponType,
} from "./types";

export const MAP_SIZE = 200;
export const ZONE_INITIAL_RADIUS = 90;
export const ZONE_SHRINK_INTERVAL = 30;
export const ZONE_SHRINK_FACTOR = 0.75;
export const BOT_COUNT = 10;
export const PLAYER_SPEED = 8;
export const CAR_SPEED = 15;
export const BOT_SPEED_PATROL = 2.5;
export const BOT_SPEED_CHASE = 4;
export const BOT_SPEED_SHOOT = 1.5;
export const BOT_CHASE_RANGE = 30;
export const BOT_SHOOT_RANGE = 15;
export const BOT_SHOOT_DAMAGE = 8;
export const BOT_SHOOT_COOLDOWN = 2;
export const PLAYER_RADIUS = 0.6;
export const BOT_HEALTH = 100;
export const PICKUP_COLLECT_RANGE = 3;
export const CAR_ENTER_RANGE = 3;

export const MAP_CONFIGS = {
  city: {
    name: "City",
    description: "Urban warfare",
    terrainColor: "#3a3a4a",
    fogColor: "#1a1a2a",
    fogNear: 40,
    fogFar: 130,
    skyColor: "#1a1a2a",
    gridColor: "#2a2a3a",
  },
  desert: {
    name: "Desert",
    description: "Sandy dunes",
    terrainColor: "#c8a96e",
    fogColor: "#d4b483",
    fogNear: 60,
    fogFar: 200,
    skyColor: "#e8c87a",
    gridColor: "#b89858",
  },
  forest: {
    name: "Forest",
    description: "Dense jungle",
    terrainColor: "#1a3a0a",
    fogColor: "#0a180a",
    fogNear: 30,
    fogFar: 100,
    skyColor: "#0a1a0a",
    gridColor: "#0f2a08",
  },
} as const;

export const CAR_POSITIONS: Array<{
  id: number;
  x: number;
  z: number;
  type: "M4" | "M5";
}> = [
  { id: 0, x: 10, z: -20, type: "M4" },
  { id: 1, x: -30, z: 15, type: "M5" },
  { id: 2, x: 45, z: 5, type: "M4" },
  { id: 3, x: -10, z: -50, type: "M5" },
];

export function generateRoomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from(
    { length: 6 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

export const WEAPON_STATS: Record<WeaponType, WeaponStats> = {
  AR: { name: "AR-15", damage: 25, fireRate: 0.12, magSize: 30, totalAmmo: 90 },
  Sniper: {
    name: "SNIPER",
    damage: 100,
    fireRate: 1.5,
    magSize: 5,
    totalAmmo: 15,
  },
  Shotgun: {
    name: "SHOTGUN",
    damage: 60,
    fireRate: 0.7,
    magSize: 10,
    totalAmmo: 30,
  },
};

export const BUILDINGS: BuildingDef[] = [
  { id: 0, x: 25, z: 25, w: 8, d: 6, h: 5 },
  { id: 1, x: -20, z: 30, w: 10, d: 8, h: 4 },
  { id: 2, x: 40, z: -15, w: 6, d: 12, h: 7 },
  { id: 3, x: -35, z: -20, w: 8, d: 8, h: 5 },
  { id: 4, x: 15, z: -40, w: 12, d: 6, h: 4 },
  { id: 5, x: -50, z: 10, w: 8, d: 10, h: 6 },
  { id: 6, x: 60, z: 30, w: 10, d: 8, h: 5 },
  { id: 7, x: -10, z: 60, w: 8, d: 6, h: 4 },
  { id: 8, x: 55, z: -40, w: 6, d: 8, h: 6 },
  { id: 9, x: -60, z: 50, w: 10, d: 6, h: 5 },
  { id: 10, x: 30, z: 60, w: 8, d: 8, h: 4 },
  { id: 11, x: -40, z: -55, w: 12, d: 6, h: 6 },
  { id: 12, x: 70, z: 0, w: 6, d: 6, h: 7 },
  { id: 13, x: 0, z: -60, w: 8, d: 10, h: 5 },
  { id: 14, x: -70, z: -30, w: 10, d: 8, h: 4 },
];

export const TREES: TreeDef[] = [
  { id: 0, x: 10, z: 15 },
  { id: 1, x: -15, z: -8 },
  { id: 2, x: 35, z: 10 },
  { id: 3, x: -30, z: 5 },
  { id: 4, x: 5, z: -25 },
  { id: 5, x: -45, z: 35 },
  { id: 6, x: 50, z: 15 },
  { id: 7, x: -5, z: 45 },
  { id: 8, x: 45, z: -30 },
  { id: 9, x: -55, z: -10 },
  { id: 10, x: 20, z: 50 },
  { id: 11, x: -25, z: -45 },
  { id: 12, x: 65, z: -15 },
  { id: 13, x: -15, z: -70 },
  { id: 14, x: 30, z: -70 },
  { id: 15, x: -65, z: 20 },
  { id: 16, x: 75, z: 45 },
  { id: 17, x: -75, z: -5 },
  { id: 18, x: 10, z: 75 },
  { id: 19, x: -20, z: 75 },
  { id: 20, x: 50, z: 55 },
  { id: 21, x: -55, z: -60 },
  { id: 22, x: 80, z: -50 },
  { id: 23, x: -80, z: 40 },
  { id: 24, x: 40, z: 80 },
];

export const EXTRA_FOREST_TREES: TreeDef[] = [
  { id: 100, x: -8, z: 32 },
  { id: 101, x: 22, z: -18 },
  { id: 102, x: -42, z: -8 },
  { id: 103, x: 58, z: -25 },
  { id: 104, x: -28, z: 58 },
  { id: 105, x: 38, z: 42 },
  { id: 106, x: -62, z: -42 },
  { id: 107, x: 72, z: 18 },
  { id: 108, x: -18, z: -32 },
  { id: 109, x: 12, z: 62 },
  { id: 110, x: -52, z: 28 },
  { id: 111, x: 32, z: -58 },
];

export const PICKUPS: PickupDef[] = [
  { id: 0, x: 8, z: 8, type: "Sniper" },
  { id: 1, x: -12, z: 20, type: "Shotgun" },
  { id: 2, x: 30, z: -5, type: "AR" },
];

export const BOT_SPAWN_POSITIONS: [number, number][] = [
  [30, 40],
  [-25, 35],
  [50, -20],
  [-40, -30],
  [20, -50],
  [-60, 15],
  [65, 25],
  [-15, 65],
  [55, -50],
  [-70, -35],
];

const BOT_COLORS = [
  "#e05252",
  "#e07852",
  "#52a0e0",
  "#e052c0",
  "#52e0a0",
  "#e0d852",
  "#a052e0",
  "#52e0d8",
  "#e08252",
  "#7052e0",
];

export const BOT_MESH_DEFS = BOT_SPAWN_POSITIONS.slice(0, BOT_COUNT).map(
  ([spawnX, spawnZ], rawIdx) => ({
    stableKey: `bot-at-${spawnX}-${spawnZ}`,
    idx: rawIdx,
    color: BOT_COLORS[rawIdx % BOT_COLORS.length],
    spawnX,
    spawnZ,
  }),
);
