import { World } from 'miniplex';

export type Team = 'firefly' | 'monster';

// ─── Component Data Types ───────────────────────────────────────────────────

export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  vx: number;
  vy: number;
}

export interface GlowPulse {
  enabled: boolean;
  speed: number;
  minIntensity: number;
  maxIntensity: number;
}

export interface GlowConfig {
  radius: number;
  color: number;
  intensity: number;
  pulse?: GlowPulse;
}

export interface Renderable {
  type: string;
  sprite?: string;
  color: number;
  radius: number;
  alpha: number;
  scale: number;
  tint: number;
  rotation: number;
  rotationSpeed: number;
  glow?: GlowConfig | null;
  depth: number;
  offsetY: number;
}

export interface PhysicsBody {
  mass: number;
  isStatic: boolean;
  collisionRadius: number;
}

export interface WallData {
  segments: { x: number; y: number }[][];
  thickness: number;
  color: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface TrailConfig {
  length: number;
  fadeTime: number;
  color: number;
  width: number;
  minAlpha: number;
}

export interface Trail {
  enabled: boolean;
  config: TrailConfig;
  points: TrailPoint[];
}

export interface PathData {
  currentPath: { x: number; y: number }[];
  goalPath: { x: number; y: number }[];
  direction: string;
}

export interface Destination {
  forTeam: Team;
}

export interface Target {
  target: Entity;
}

export interface Targeting {
  potentialTargets: Entity[];
}

export interface Interaction {
  interactionRadius: number;
}

export interface Health {
  currentHealth: number;
  maxHealth: number;
  isDead: boolean;
}

export enum CombatState {
  IDLE = 'IDLE',
  CHARGING = 'CHARGING',
  ATTACKING = 'ATTACKING',
  RECOVERING = 'RECOVERING'
}

export interface AttackPattern {
  handlerType: 'dash' | 'pulse';
  chargeTime: number;
  attackDuration: number;
  recoveryTime: number;
  damage: number;
  knockbackForce?: number;
  dashSpeed?: number;
  radius?: number;
  color?: number;
}

export interface Combat {
  state: CombatState;
  chargeTime: number;
  attackElapsed: number;
  recoveryElapsed: number;
  attackPattern: AttackPattern;
  hasHit: boolean;
}

export interface Lodge {
  tenants: Entity[];
  incoming: Entity[];
  allowedTeam: Team;
  maxTenants: number;
}

export interface AssignedDestination {
  target: Entity;
  targetPosition?: { x: number; y: number };
  holding?: boolean;
}

export interface ActivationEffect {
  componentName: string;
  config: Record<string, unknown>;
}

export interface ActivationConfig {
  onActivate: ActivationEffect[];
  onDeactivate: ActivationEffect[];
}

export interface FireflyGoal {
  currentCount: number;
}

export interface SpawnEntry {
  unit: 'firefly' | 'monster';
  delay?: number;
  repeat?: number;
  delayBetween?: number;
}

export interface SpawnerState {
  currentIndex: number;
  repeatsDone: number;
  timer: number;
  phase: 'spawning' | 'repeat_wait' | 'entry_delay' | 'done';
}

export interface Spawner {
  queue: SpawnEntry[];
  state: SpawnerState;
}

export interface RedirectExit {
  x: number;
  y: number;
  weight: number;
}

export interface Redirect {
  exits: RedirectExit[];
  radius: number;
  forTeam: Team;
}

// ─── Building ──────────────────────────────────────────────────────────────

export interface BuildSite {
  x: number;
  y: number;
  built: boolean;
  buildProgress: number;
  builderEntity?: Entity;
}

export interface Buildable {
  sites: BuildSite[];
  buildTime: number;
  allBuilt: boolean;
}

export interface WallBlueprint {
  active: boolean;
  passableBy?: Team;
}

export interface WallAttackTarget {
  wallEntity: Entity;
  attackCooldown: number;
  triedWalls: Set<number>;
}

// ─── Entity Type ────────────────────────────────────────────────────────────

export type Entity = {
  // Core
  position?: Position;
  velocity?: Velocity;
  renderable?: Renderable;
  physicsBody?: PhysicsBody;
  wall?: WallData;
  trail?: Trail;

  // Gameplay
  path?: PathData;
  destination?: Destination;
  target?: Target;
  targeting?: Targeting;
  interaction?: Interaction;
  health?: Health;
  combat?: Combat;
  lodge?: Lodge;
  assignedDestination?: AssignedDestination;
  activationConfig?: ActivationConfig;
  fireflyGoal?: FireflyGoal;
  spawner?: Spawner;
  redirect?: Redirect;
  redirectTarget?: { x: number; y: number };

  // Building
  buildable?: Buildable;
  wallBlueprint?: WallBlueprint;
  wallAttackTarget?: WallAttackTarget;

  // Team
  team?: Team;

  // Tags (boolean flags)
  fireflyTag?: true;
  wispTag?: true;
  monsterTag?: true;
  goalTag?: true;
  wallTag?: true;
  spawnerTag?: true;
  redirectTag?: true;
  wallBlueprintTag?: true;
  fleeingToGoalTag?: true;
};

// ─── World Type ─────────────────────────────────────────────────────────────

export type GameWorld = World<Entity>;
