import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  BOT_CHASE_RANGE,
  BOT_COUNT,
  BOT_HEALTH,
  BOT_MESH_DEFS,
  BOT_SHOOT_COOLDOWN,
  BOT_SHOOT_DAMAGE,
  BOT_SHOOT_RANGE,
  BOT_SPAWN_POSITIONS,
  BOT_SPEED_CHASE,
  BOT_SPEED_PATROL,
  BOT_SPEED_SHOOT,
  BUILDINGS,
  CAR_ENTER_RANGE,
  CAR_POSITIONS,
  CAR_SPEED,
  EXTRA_FOREST_TREES,
  MAP_CONFIGS,
  PICKUPS,
  PICKUP_COLLECT_RANGE,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  TREES,
  WEAPON_STATS,
  ZONE_INITIAL_RADIUS,
  ZONE_SHRINK_FACTOR,
  ZONE_SHRINK_INTERVAL,
} from "./constants";
import type {
  GameDataRef,
  HudState,
  MapType,
  MobileInput,
  OnlinePlayer,
  WeaponType,
} from "./types";

const _vec = new THREE.Vector3();
const _euler = new THREE.Euler(0, 0, 0, "YXZ");
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _camPos = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _origin = new THREE.Vector3();
const _castDir = new THREE.Vector3();

const STAMINA_MAX = 100;
const _STAMINA_DRAIN = 25; // per second while sprinting + moving
const _STAMINA_REGEN = 15; // per second while not sprinting / not moving
const SPRINT_MULTIPLIER = 1.6;

interface PlayerMutable {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  health: number;
  armor: number;
  kills: number;
  weapon: WeaponType;
  ammo: number;
  maxAmmo: number;
  shootCooldown: number;
  stamina: number;
}

interface BotMutable {
  x: number;
  y: number;
  z: number;
  health: number;
  state: "patrol" | "chase" | "shoot";
  patrolX: number;
  patrolZ: number;
  shootCooldown: number;
  alive: boolean;
}

interface ZoneMutable {
  radius: number;
  timer: number;
}

interface CarMutable {
  id: number;
  x: number;
  z: number;
  yaw: number;
  type: "M4" | "M5";
  occupied: boolean;
}

function initPlayer(): PlayerMutable {
  return {
    x: 0,
    y: 0.75,
    z: 0,
    yaw: 0,
    pitch: 0,
    health: 100,
    armor: 50,
    kills: 0,
    weapon: "AR",
    ammo: 30,
    maxAmmo: 30,
    shootCooldown: 0,
    stamina: STAMINA_MAX,
  };
}

function initBots(): BotMutable[] {
  return BOT_SPAWN_POSITIONS.slice(0, BOT_COUNT).map(([bx, bz]) => ({
    x: bx,
    y: 0.75,
    z: bz,
    health: BOT_HEALTH,
    state: "patrol" as const,
    patrolX: bx + (Math.random() - 0.5) * 40,
    patrolZ: bz + (Math.random() - 0.5) * 40,
    shootCooldown: Math.random() * 2,
    alive: true,
  }));
}

function checkBuildingCollision(
  px: number,
  pz: number,
): { x: number; z: number } {
  let nx = px;
  let nz = pz;
  for (const b of BUILDINGS) {
    const halfW = b.w / 2 + PLAYER_RADIUS;
    const halfD = b.d / 2 + PLAYER_RADIUS;
    const dx = nx - b.x;
    const dz = nz - b.z;
    if (Math.abs(dx) < halfW && Math.abs(dz) < halfD) {
      const overlapX = halfW - Math.abs(dx);
      const overlapZ = halfD - Math.abs(dz);
      if (overlapX < overlapZ) nx += dx > 0 ? overlapX : -overlapX;
      else nz += dz > 0 ? overlapZ : -overlapZ;
    }
  }
  return {
    x: Math.max(-99, Math.min(99, nx)),
    z: Math.max(-99, Math.min(99, nz)),
  };
}

// ── Humanoid Avatar ──────────────────────────────────────────────────────────
function HumanoidAvatar({
  color,
  nameTag,
}: { color: string; nameTag?: string }) {
  return (
    <group>
      {/* Head */}
      <mesh position={[0, 1.45, 0]}>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshLambertMaterial color="#f5c5a0" />
      </mesh>
      {/* Torso */}
      <mesh position={[0, 0.95, 0]}>
        <boxGeometry args={[0.55, 0.65, 0.3]} />
        <meshLambertMaterial color={color} />
      </mesh>
      {/* Left arm */}
      <mesh position={[-0.37, 0.92, 0]}>
        <boxGeometry args={[0.18, 0.55, 0.18]} />
        <meshLambertMaterial color={color} />
      </mesh>
      {/* Right arm */}
      <mesh position={[0.37, 0.92, 0]}>
        <boxGeometry args={[0.18, 0.55, 0.18]} />
        <meshLambertMaterial color={color} />
      </mesh>
      {/* Left leg */}
      <mesh position={[-0.15, 0.27, 0]}>
        <boxGeometry args={[0.2, 0.55, 0.2]} />
        <meshLambertMaterial color="#333" />
      </mesh>
      {/* Right leg */}
      <mesh position={[0.15, 0.27, 0]}>
        <boxGeometry args={[0.2, 0.55, 0.2]} />
        <meshLambertMaterial color="#333" />
      </mesh>
      {nameTag && (
        <Html position={[0, 2.1, 0]} center distanceFactor={10}>
          <div
            style={{
              color: "white",
              fontSize: "12px",
              background: "rgba(0,0,0,0.6)",
              padding: "2px 6px",
              borderRadius: 3,
              whiteSpace: "nowrap",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            {nameTag}
          </div>
        </Html>
      )}
    </group>
  );
}

// ── Car Mesh ─────────────────────────────────────────────────────────────────
function CarMesh({ type }: { type: "M4" | "M5" }) {
  const bodyColor = type === "M4" ? "#1a4a8a" : "#1a1a1a";
  return (
    <group>
      {/* Body */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[4, 1.2, 2]} />
        <meshLambertMaterial color={bodyColor} />
      </mesh>
      {/* Roof/windows */}
      <mesh position={[0, 1.35, 0]}>
        <boxGeometry args={[2.2, 0.7, 1.8]} />
        <meshLambertMaterial color="#aaccee" transparent opacity={0.7} />
      </mesh>
      {/* Front grill */}
      <mesh position={[2.05, 0.5, 0]}>
        <boxGeometry args={[0.1, 0.5, 1.5]} />
        <meshLambertMaterial color="#333" />
      </mesh>
      {/* Badge */}
      <mesh position={[2.11, 0.75, 0]}>
        <boxGeometry args={[0.05, 0.22, 0.28]} />
        <meshLambertMaterial color={type === "M4" ? "#4488ff" : "#aaaaaa"} />
      </mesh>
      {/* Wheels */}
      {(
        [
          [-1.5, -0.8],
          [-1.5, 0.8],
          [1.3, -0.8],
          [1.3, 0.8],
        ] as [number, number][]
      ).map(([wx, wz]) => (
        <mesh
          key={`w${wx}-${wz}`}
          position={[wx, 0.3, wz]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <cylinderGeometry args={[0.4, 0.4, 0.25, 12]} />
          <meshLambertMaterial color="#222" />
        </mesh>
      ))}
      {/* Model label */}
      <Html position={[0, 2.2, 0]} center distanceFactor={12}>
        <div
          style={{
            color: type === "M4" ? "#4488ff" : "#aaaaaa",
            fontSize: "11px",
            background: "rgba(0,0,0,0.7)",
            padding: "1px 5px",
            borderRadius: 2,
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 800,
            letterSpacing: 2,
            border: `1px solid ${type === "M4" ? "#4488ff" : "#aaaaaa"}`,
          }}
        >
          BMW {type}
        </div>
      </Html>
    </group>
  );
}

// ── Tree component ────────────────────────────────────────────────────────────
function Tree({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1 * scale, 0]} castShadow>
        <cylinderGeometry args={[0.2 * scale, 0.3 * scale, 2 * scale, 6]} />
        <meshLambertMaterial color="#5c3d1e" />
      </mesh>
      <mesh position={[0, 2.8 * scale, 0]} castShadow>
        <sphereGeometry args={[1.2 * scale, 7, 6]} />
        <meshLambertMaterial color="#2d5a1b" />
      </mesh>
    </group>
  );
}

// ── Game Logic ────────────────────────────────────────────────────────────────
interface GameSceneProps {
  onHudUpdate: (state: HudState) => void;
  onDead: (kills: number) => void;
  onWin: (kills: number) => void;
  onLockChange: (locked: boolean) => void;
  gameDataRef: React.RefObject<GameDataRef>;
  mapType: MapType;
  playerName: string;
  mobileInputRef: React.RefObject<MobileInput>;
  remotePlayersRef: React.RefObject<OnlinePlayer[]>;
  isOnline: boolean;
  onUpdatePosition: (x: number, z: number, health: number) => void;
  sensitivityRef?: React.RefObject<number>;
  graphicsQuality?: "low" | "medium" | "high";
}

function GameLogic({
  onHudUpdate,
  onDead: _onDead,
  onWin: _onWin,
  onLockChange,
  gameDataRef,
  playerName,
  mobileInputRef,
  remotePlayersRef,
  isOnline,
  onUpdatePosition,
  sensitivityRef,
}: GameSceneProps) {
  const { camera, gl } = useThree();

  const playerRef = useRef<PlayerMutable>(initPlayer());
  const botsRef = useRef<BotMutable[]>(initBots());
  const zoneRef = useRef<ZoneMutable>({
    radius: ZONE_INITIAL_RADIUS,
    timer: ZONE_SHRINK_INTERVAL,
  });
  const carsRef = useRef<CarMutable[]>(
    CAR_POSITIONS.map((c) => ({ ...c, yaw: 0, occupied: false })),
  );
  const inCarRef = useRef<{ value: boolean; carId: number }>({
    value: false,
    carId: -1,
  });
  const keysRef = useRef({
    w: false,
    a: false,
    s: false,
    d: false,
    e: false,
    shift: false,
  });
  const eJustPressedRef = useRef(false);
  const gameActiveRef = useRef(true);
  const lastHudUpdate = useRef(0);
  const updateThrottle = useRef(0);
  const isMobile =
    typeof window !== "undefined" &&
    (window.innerWidth < 768 || "ontouchstart" in window);

  const playerGroupRef = useRef<THREE.Group | null>(null);
  const botGroupRefs = useRef<Array<THREE.Group | null>>(
    new Array(BOT_COUNT).fill(null),
  );
  const botMeshRefs = useRef<Array<THREE.Mesh | null>>(
    new Array(BOT_COUNT).fill(null),
  );
  const carGroupRefs = useRef<Array<THREE.Group | null>>(
    CAR_POSITIONS.map(() => null),
  );
  const zoneRingRef = useRef<THREE.Mesh>(null);

  const [botsAlive, setBotsAlive] = useState<boolean[]>(
    new Array(BOT_COUNT).fill(true),
  );
  const [zoneRadius, setZoneRadius] = useState(ZONE_INITIAL_RADIUS);
  const [pickupsVisible, setPickupsVisible] = useState<boolean[]>(
    new Array(PICKUPS.length).fill(true),
  );
  const pickupsVisibleRef = useRef<boolean[]>(
    new Array(PICKUPS.length).fill(true),
  );
  const [remotePlayers, setRemotePlayers] = useState<OnlinePlayer[]>([]);
  const remoteUpdateThrottle = useRef(0);

  const killBot = useCallback(
    (index: number) => {
      setBotsAlive((prev) => {
        const n = [...prev];
        n[index] = false;
        const allDead = n.every((alive) => !alive);
        if (allDead) {
          _onWin(playerRef.current.kills);
        }
        return n;
      });
    },
    [_onWin],
  );

  const collectPickup = useCallback((index: number) => {
    pickupsVisibleRef.current[index] = false;
    setPickupsVisible((prev) => {
      const n = [...prev];
      n[index] = false;
      return n;
    });
  }, []);

  const handleShoot = useCallback(() => {
    if (!gameActiveRef.current) return;
    const player = playerRef.current;
    if (inCarRef.current.value) return;
    if (player.shootCooldown > 0) return;
    const stats = WEAPON_STATS[player.weapon];
    player.shootCooldown = stats.fireRate;
    // Infinite ammo -- no decrement

    _origin.setFromMatrixPosition(camera.matrixWorld);
    _castDir.set(0, 0, -1).transformDirection(camera.matrixWorld);
    _raycaster.set(_origin, _castDir);
    _raycaster.far = 200;

    const aliveMeshes: THREE.Object3D[] = [];
    botMeshRefs.current.forEach((m, i) => {
      if (m && botsRef.current[i]?.alive) aliveMeshes.push(m);
    });

    const hits = _raycaster.intersectObjects(aliveMeshes);
    if (hits.length > 0) {
      const hitMesh = hits[0].object as THREE.Mesh;
      const botIndex = botMeshRefs.current.indexOf(hitMesh);
      if (botIndex >= 0) {
        const bot = botsRef.current[botIndex];
        if (bot?.alive) {
          bot.health -= stats.damage;
          if (bot.health <= 0) {
            bot.alive = false;
            playerRef.current.kills += 1;
            killBot(botIndex);
          }
        }
      }
    }
  }, [camera, killBot]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: sensitivityRef is a stable ref
  useEffect(() => {
    const canvas = gl.domElement;
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "w") keysRef.current.w = true;
      if (k === "a") keysRef.current.a = true;
      if (k === "s") keysRef.current.s = true;
      if (k === "d") keysRef.current.d = true;
      if (k === "e") {
        keysRef.current.e = true;
        eJustPressedRef.current = true;
      }
      if (e.key === "Shift") keysRef.current.shift = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "w") keysRef.current.w = false;
      if (k === "a") keysRef.current.a = false;
      if (k === "s") keysRef.current.s = false;
      if (k === "d") keysRef.current.d = false;
      if (k === "e") keysRef.current.e = false;
      if (e.key === "Shift") keysRef.current.shift = false;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === canvas) {
        const sens = sensitivityRef?.current ?? 5;
        playerRef.current.yaw -= e.movementX * 0.002 * (sens / 5);
        playerRef.current.pitch -= e.movementY * 0.002 * (sens / 5);
        playerRef.current.pitch = Math.max(
          -Math.PI / 2.2,
          Math.min(Math.PI / 2.2, playerRef.current.pitch),
        );
      }
    };
    const onPointerLockChange = () => {
      onLockChange(document.pointerLockElement === canvas);
    };
    const onClick = () => {
      if (!isMobile) {
        if (document.pointerLockElement !== canvas) canvas.requestPointerLock();
        else handleShoot();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("pointerlockchange", onPointerLockChange);
    canvas.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      canvas.removeEventListener("click", onClick);
      document.exitPointerLock?.();
    };
  }, [gl, handleShoot, onLockChange, isMobile, sensitivityRef]);

  useFrame((_, delta) => {
    if (!gameActiveRef.current) return;
    const dt = Math.min(delta, 0.1);
    const player = playerRef.current;
    const bots = botsRef.current;
    const zone = zoneRef.current;
    const keys = keysRef.current;
    const cars = carsRef.current;

    const eJust = eJustPressedRef.current;
    eJustPressedRef.current = false;

    // ── Mobile input ────────────────────────────────────────────────────────
    const mi = mobileInputRef?.current;
    if (mi) {
      const mobileSens = sensitivityRef?.current ?? 5;
      if (Math.abs(mi.lookDeltaX) > 0) {
        player.yaw -= mi.lookDeltaX * 0.01 * (mobileSens / 5);
        mi.lookDeltaX = 0;
      }
      if (Math.abs(mi.lookDeltaY) > 0) {
        player.pitch -= mi.lookDeltaY * 0.01 * (mobileSens / 5);
        player.pitch = Math.max(
          -Math.PI / 2.2,
          Math.min(Math.PI / 2.2, player.pitch),
        );
        mi.lookDeltaY = 0;
      }
      if (mi.shoot) {
        handleShoot();
        mi.shoot = false;
      }
      if (mi.interact) {
        eJustPressedRef.current = true;
        mi.interact = false;
      }
    }

    // ── Car logic ────────────────────────────────────────────────────────────
    if (inCarRef.current.value) {
      const car = cars[inCarRef.current.carId];
      if (eJust || mi?.interact) {
        car.occupied = false;
        inCarRef.current = { value: false, carId: -1 };
        player.x = car.x + 3;
        player.z = car.z;
      } else {
        if (keys.a) car.yaw += 1.8 * dt;
        if (keys.d) car.yaw -= 1.8 * dt;
        if (mi) {
          if (mi.moveX < -0.3) car.yaw += 1.8 * dt;
          if (mi.moveX > 0.3) car.yaw -= 1.8 * dt;
        }
        _euler.set(0, car.yaw, 0);
        _fwd.set(0, 0, -1).applyEuler(_euler);
        const fwd = keys.w || (mi ? mi.moveZ < -0.3 : false);
        const bwd = keys.s || (mi ? mi.moveZ > 0.3 : false);
        if (fwd) {
          car.x += _fwd.x * CAR_SPEED * dt;
          car.z += _fwd.z * CAR_SPEED * dt;
        }
        if (bwd) {
          car.x -= _fwd.x * (CAR_SPEED * 0.6) * dt;
          car.z -= _fwd.z * (CAR_SPEED * 0.6) * dt;
        }
        car.x = Math.max(-99, Math.min(99, car.x));
        car.z = Math.max(-99, Math.min(99, car.z));
        player.x = car.x;
        player.z = car.z;
        player.yaw = car.yaw;
        _euler.set(0, car.yaw, 0);
        _fwd.set(0, 0, -1).applyEuler(_euler);
        _camPos.set(car.x - _fwd.x * 12, 4, car.z - _fwd.z * 12);
        camera.position.copy(_camPos);
        camera.lookAt(car.x, 1, car.z);
      }
    } else {
      // ── Enter car on E ────────────────────────────────────────────────────
      if (eJust) {
        for (let i = 0; i < cars.length; i++) {
          if (cars[i].occupied) continue;
          const dx = player.x - cars[i].x;
          const dz = player.z - cars[i].z;
          if (dx * dx + dz * dz < CAR_ENTER_RANGE * CAR_ENTER_RANGE) {
            cars[i].occupied = true;
            inCarRef.current = { value: true, carId: i };
            break;
          }
        }
      }

      // ── Player movement with stamina/sprint ───────────────────────────────
      _euler.set(0, player.yaw, 0);
      _fwd.set(0, 0, -1).applyEuler(_euler);
      _right.set(1, 0, 0).applyEuler(_euler);
      _vec.set(0, 0, 0);
      if (keys.w) _vec.addScaledVector(_fwd, 1);
      if (keys.s) _vec.addScaledVector(_fwd, -1);
      if (keys.a) _vec.addScaledVector(_right, -1);
      if (keys.d) _vec.addScaledVector(_right, 1);
      if (mi && (Math.abs(mi.moveX) > 0.05 || Math.abs(mi.moveZ) > 0.05)) {
        _vec.addScaledVector(_fwd, -mi.moveZ);
        _vec.addScaledVector(_right, mi.moveX);
      }

      const moving = _vec.lengthSq() > 0;
      const desktopSprint = keys.shift;
      const mobileSprint = mi ? mi.sprint : false;
      // Infinite stamina -- always allow sprint
      const isSprinting = (desktopSprint || mobileSprint) && moving;

      // Infinite stamina -- always full
      player.stamina = STAMINA_MAX;

      if (moving) {
        const speed = isSprinting
          ? PLAYER_SPEED * SPRINT_MULTIPLIER
          : PLAYER_SPEED;
        _vec.normalize().multiplyScalar(speed * dt);
        const { x: cx, z: cz } = checkBuildingCollision(
          player.x + _vec.x,
          player.z + _vec.z,
        );
        player.x = cx;
        player.z = cz;
      }

      // ── Camera (third person) ─────────────────────────────────────────────
      _euler.set(0, player.yaw, 0);
      _fwd.set(0, 0, -1).applyEuler(_euler);
      const camDist = 10;
      const camHeight = 5 - Math.sin(player.pitch) * camDist * 0.5;
      _camPos.set(
        player.x - _fwd.x * camDist,
        player.y + Math.max(1, camHeight),
        player.z - _fwd.z * camDist,
      );
      camera.position.copy(_camPos);
      const lookY = player.y + 1.5 + Math.tan(player.pitch) * 8;
      camera.lookAt(player.x, lookY, player.z);

      // ── Pickups ─────────────────────────────────────────────────────────
      if (keys.e) {
        for (let i = 0; i < PICKUPS.length; i++) {
          if (!pickupsVisibleRef.current[i]) continue;
          const pu = PICKUPS[i];
          const pdx = player.x - pu.x;
          const pdz = player.z - pu.z;
          if (
            pdx * pdx + pdz * pdz <
            PICKUP_COLLECT_RANGE * PICKUP_COLLECT_RANGE
          ) {
            const stats = WEAPON_STATS[pu.type];
            player.weapon = pu.type;
            player.ammo = stats.magSize;
            player.maxAmmo = stats.magSize;
            collectPickup(i);
          }
        }
      }
    }

    // ── Update player group mesh ───────────────────────────────────────────
    if (playerGroupRef.current) {
      playerGroupRef.current.position.set(player.x, 0, player.z);
      playerGroupRef.current.rotation.y = player.yaw;
    }

    // ── Bots (offline only) ──────────────────────────────────────────────
    if (!isOnline) {
      for (let i = 0; i < bots.length; i++) {
        const bot = bots[i];
        if (!bot.alive) continue;
        const dx = player.x - bot.x;
        const dz = player.z - bot.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        bot.state =
          dist < BOT_SHOOT_RANGE
            ? "shoot"
            : dist < BOT_CHASE_RANGE
              ? "chase"
              : "patrol";
        if (bot.state === "patrol") {
          const pdx = bot.patrolX - bot.x;
          const pdz = bot.patrolZ - bot.z;
          const pdist = Math.sqrt(pdx * pdx + pdz * pdz);
          if (pdist < 1.5) {
            bot.patrolX = (Math.random() - 0.5) * 160;
            bot.patrolZ = (Math.random() - 0.5) * 160;
          } else {
            bot.x += (pdx / pdist) * BOT_SPEED_PATROL * dt;
            bot.z += (pdz / pdist) * BOT_SPEED_PATROL * dt;
          }
        } else if (bot.state === "chase") {
          bot.x += (dx / dist) * BOT_SPEED_CHASE * dt;
          bot.z += (dz / dist) * BOT_SPEED_CHASE * dt;
        } else {
          bot.x += (dx / dist) * BOT_SPEED_SHOOT * dt;
          bot.z += (dz / dist) * BOT_SPEED_SHOOT * dt;
          bot.shootCooldown -= dt;
          if (bot.shootCooldown <= 0) {
            bot.shootCooldown = BOT_SHOOT_COOLDOWN + Math.random();
            // player health is kept full -- no damage
          }
        }
        bot.x = Math.max(-99, Math.min(99, bot.x));
        bot.z = Math.max(-99, Math.min(99, bot.z));
        const grp = botGroupRefs.current[i];
        if (grp) {
          grp.position.set(bot.x, 0, bot.z);
          grp.rotation.y = Math.atan2(player.x - bot.x, player.z - bot.z);
        }
      }
    }

    // ── Update car group positions ─────────────────────────────────────────
    for (let i = 0; i < cars.length; i++) {
      const cg = carGroupRefs.current[i];
      if (cg) {
        cg.position.set(cars[i].x, 0, cars[i].z);
        cg.rotation.y = cars[i].yaw;
      }
    }

    // ── Zone ──────────────────────────────────────────────────────────────
    zone.timer -= dt;
    if (zone.timer <= 0) {
      zone.timer = ZONE_SHRINK_INTERVAL;
      zone.radius = Math.max(5, zone.radius * ZONE_SHRINK_FACTOR);
      setZoneRadius(zone.radius);
    }
    // Zone damage disabled on all maps

    if (player.shootCooldown > 0)
      player.shootCooldown = Math.max(0, player.shootCooldown - dt);

    // ── Infinite ammo -- always keep full ────────────────────────────────
    player.ammo = player.maxAmmo;

    // ── Minimap data ──────────────────────────────────────────────────────
    gameDataRef.current.player.x = player.x;
    gameDataRef.current.player.z = player.z;
    gameDataRef.current.zoneRadius = zone.radius;
    for (let i = 0; i < bots.length; i++) {
      gameDataRef.current.bots[i] = {
        x: bots[i].x,
        z: bots[i].z,
        alive: bots[i].alive,
      };
    }

    // ── Remote players update (throttled) ────────────────────────────────
    remoteUpdateThrottle.current += dt * 1000;
    if (remoteUpdateThrottle.current >= 300 && isOnline) {
      remoteUpdateThrottle.current = 0;
      setRemotePlayers([...(remotePlayersRef.current ?? [])]);
    }

    // ── Online position update (fire-and-forget, throttled) ──────────────
    updateThrottle.current += dt * 1000;
    if (updateThrottle.current >= 500 && isOnline) {
      updateThrottle.current = 0;
      onUpdatePosition(player.x, player.z, player.health);
    }

    // ── HUD update (throttled) ────────────────────────────────────────────
    lastHudUpdate.current += dt * 1000;
    if (lastHudUpdate.current >= 100) {
      lastHudUpdate.current = 0;
      onHudUpdate({
        health: Math.max(0, player.health),
        armor: Math.max(0, player.armor),
        stamina: player.stamina,
        kills: player.kills,
        alivePlayers: bots.filter((b) => b.alive).length + 1,
        weapon: player.weapon,
        ammo: player.ammo,
        maxAmmo: player.maxAmmo,
        zoneTimeLeft: zone.timer,
        inCar: inCarRef.current.value,
        carSpeed: inCarRef.current.value ? CAR_SPEED : 0,
      });
    }

    // ── No elimination on any map -- keep health full ────────────────────
    player.health = 100;
    player.armor = 50;
  });

  return (
    <>
      {/* Terrain */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200, 1, 1]} />
        <meshLambertMaterial color="#3a4a2a" />
      </mesh>
      <gridHelper
        args={[200, 20, "#2a3a1a", "#2a3a1a"]}
        position={[0, 0.01, 0]}
      />

      {/* Buildings */}
      {BUILDINGS.map((b) => (
        <group key={b.id} position={[b.x, b.h / 2, b.z]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshLambertMaterial color="#4a5060" />
          </mesh>
          <mesh position={[0, b.h / 2 + 0.05, 0]}>
            <boxGeometry args={[b.w + 0.3, 0.15, b.d + 0.3]} />
            <meshLambertMaterial color="#5a6270" />
          </mesh>
        </group>
      ))}

      {/* Trees */}
      {TREES.map((t) => (
        <Tree key={t.id} x={t.x} z={t.z} />
      ))}
      {EXTRA_FOREST_TREES.map((t) => (
        <Tree key={t.id} x={t.x} z={t.z} scale={1.3} />
      ))}

      {/* Weapon pickups */}
      {PICKUPS.map((pu, puIdx) => (
        <mesh
          key={pu.id}
          position={[pu.x, 0.5, pu.z]}
          visible={pickupsVisible[puIdx]}
        >
          <boxGeometry args={[0.6, 0.6, 0.6]} />
          <meshLambertMaterial
            color={
              pu.type === "Sniper"
                ? "#4488ff"
                : pu.type === "Shotgun"
                  ? "#ff8844"
                  : "#44ff88"
            }
            emissive={
              pu.type === "Sniper"
                ? "#1133aa"
                : pu.type === "Shotgun"
                  ? "#aa4411"
                  : "#11aa33"
            }
            emissiveIntensity={0.6}
          />
        </mesh>
      ))}

      {/* Player */}
      <group
        ref={(el) => {
          playerGroupRef.current = el;
        }}
        position={[0, 0, 0]}
      >
        <mesh position={[0, 0.75, 0]} visible={false}>
          <boxGeometry args={[0.8, 1.5, 0.5]} />
          <meshBasicMaterial />
        </mesh>
        <HumanoidAvatar color="#F28C2A" nameTag={playerName} />
      </group>

      {/* Bots -- only in offline mode */}
      {!isOnline &&
        BOT_MESH_DEFS.map(({ stableKey, idx, color, spawnX, spawnZ }) => (
          <group
            key={stableKey}
            ref={(el) => {
              botGroupRefs.current[idx] = el;
            }}
            position={[spawnX, 0, spawnZ]}
          >
            <mesh
              ref={(el) => {
                botMeshRefs.current[idx] = el;
              }}
              position={[0, 0.75, 0]}
              visible={false}
            >
              <boxGeometry args={[0.8, 1.5, 0.5]} />
              <meshBasicMaterial />
            </mesh>
            {botsAlive[idx] && (
              <HumanoidAvatar color={color} nameTag={`Mob ${idx + 1}`} />
            )}
          </group>
        ))}

      {/* Cars */}
      {CAR_POSITIONS.map((cp, i) => (
        <group
          key={`car-${cp.id}`}
          ref={(el) => {
            carGroupRefs.current[i] = el;
          }}
          position={[cp.x, 0, cp.z]}
        >
          <CarMesh type={cp.type} />
        </group>
      ))}

      {/* Remote players (online mode) */}
      {remotePlayers
        .filter((rp) => rp.isAlive)
        .map((rp) => (
          <group key={`remote-${rp.name}`} position={[rp.x, 0, rp.z]}>
            <HumanoidAvatar color="#4BC8F2" nameTag={rp.name} />
          </group>
        ))}

      {/* Safe zone ring */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.12, 0]}
        ref={zoneRingRef}
      >
        <ringGeometry args={[zoneRadius - 1.5, zoneRadius + 1.5, 128]} />
        <meshBasicMaterial
          color="#00aaff"
          transparent
          opacity={0.65}
          side={THREE.DoubleSide}
        />
      </mesh>
    </>
  );
}

export default function GameScene(props: GameSceneProps) {
  const cfg = MAP_CONFIGS[props.mapType];
  return (
    <>
      <color attach="background" args={[cfg.skyColor]} />
      <fog attach="fog" args={[cfg.fogColor, cfg.fogNear, cfg.fogFar]} />
      <ambientLight intensity={0.5} color="#b0c8e0" />
      <directionalLight
        position={[40, 80, 30]}
        intensity={1.2}
        color="#ffe8c0"
        castShadow={props.graphicsQuality !== "low"}
        shadow-mapSize={
          props.graphicsQuality === "high"
            ? [2048, 2048]
            : props.graphicsQuality === "medium"
              ? [1024, 1024]
              : [512, 512]
        }
      />
      <directionalLight
        position={[-30, 20, -40]}
        intensity={0.3}
        color="#8090a0"
      />
      <MapTerrain mapType={props.mapType} />
      <GameLogic {...props} />
    </>
  );
}

// ── Map terrain layers ────────────────────────────────────────────────────────
function MapTerrain({ mapType }: { mapType: MapType }) {
  const cfg = MAP_CONFIGS[mapType];
  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        receiveShadow
      >
        <planeGeometry args={[200, 200, 1, 1]} />
        <meshLambertMaterial color={cfg.terrainColor} />
      </mesh>
      <gridHelper
        args={[200, 20, cfg.gridColor, cfg.gridColor]}
        position={[0, 0.01, 0]}
      />
      {mapType === "desert" &&
        [
          [30, -40, 12, 1.5, 8],
          [-50, 20, 10, 2, 6],
          [60, 50, 14, 1.8, 10],
          [-20, -70, 8, 1.2, 5],
        ].map(([dx, dz, dw, dh, dd]) => (
          <mesh
            key={`dune-${Math.round(dx)}-${Math.round(dz)}`}
            position={[dx, dh / 2 - 0.2, dz]}
          >
            <boxGeometry args={[dw, dh, dd]} />
            <meshLambertMaterial color="#b89050" />
          </mesh>
        ))}
      {mapType === "forest" && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <planeGeometry args={[180, 180, 1, 1]} />
          <meshLambertMaterial color="#1e4a10" transparent opacity={0.5} />
        </mesh>
      )}
    </>
  );
}
