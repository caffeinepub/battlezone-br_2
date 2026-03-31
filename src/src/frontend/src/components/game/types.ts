export type GamePhase = "menu" | "playing" | "dead" | "win";
export type WeaponType = "AR" | "Sniper" | "Shotgun";
export type BotState = "patrol" | "chase" | "shoot";
export type MapType = "city" | "desert" | "forest";

export interface WeaponStats {
  name: string;
  damage: number;
  fireRate: number;
  magSize: number;
  totalAmmo: number;
}

export interface BuildingDef {
  id: number;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
}

export interface TreeDef {
  id: number;
  x: number;
  z: number;
}

export interface PickupDef {
  id: number;
  x: number;
  z: number;
  type: WeaponType;
}

export interface BotData {
  pos: { x: number; y: number; z: number };
  health: number;
  state: BotState;
  patrolTarget: { x: number; z: number };
  shootCooldown: number;
  alive: boolean;
}

export interface PlayerData {
  x: number;
  z: number;
  yaw: number;
  health: number;
  armor: number;
  kills: number;
  weapon: WeaponType;
  ammo: number;
  shootCooldown: number;
}

export interface ZoneData {
  radius: number;
  timer: number;
}

export interface HudState {
  health: number;
  armor: number;
  stamina: number;
  kills: number;
  alivePlayers: number;
  weapon: WeaponType;
  ammo: number;
  maxAmmo: number;
  zoneTimeLeft: number;
  inCar?: boolean;
  carSpeed?: number;
}

export interface GameDataRef {
  player: { x: number; z: number };
  bots: Array<{ x: number; z: number; alive: boolean }>;
  zoneRadius: number;
}

export interface VehicleState {
  id: number;
  x: number;
  z: number;
  type: "M4" | "M5";
  occupied: boolean;
  yaw: number;
}

export interface OnlinePlayer {
  name: string;
  x: number;
  z: number;
  health: number;
  isAlive: boolean;
}

export interface MobileInput {
  moveX: number;
  moveZ: number;
  lookDeltaX: number;
  lookDeltaY: number;
  shoot: boolean;
  interact: boolean;
  sprint: boolean;
}
