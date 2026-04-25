# Architecture Documentation

## Overview

The Lantern Network is a 2D game built using an Entity-Component-System (ECS) architecture with Phaser 3 for rendering. The game features pathfinding-driven entities that navigate through procedurally generated maze-like levels.

## Technology Stack

- **TypeScript**: Strict mode enabled for type safety
- **Miniplex**: TypeScript-first ECS library — entities are plain objects, components are interfaces
- **Phaser 3**: Game rendering engine (decoupled from ECS data)
- **Vite**: Fast build tool with HMR
- **Vitest**: Unit testing framework
- **Web Workers**: Off-thread pathfinding computation

## Core Architecture Principles

### 1. ECS Architecture

The game follows ECS patterns using Miniplex:

- **Components**: Plain TypeScript interfaces — just data, no logic
- **Systems**: Plain classes implementing `GameSystem` — all logic lives here
- **Entities**: Plain objects with optional component properties

```
┌──────────────────────────────────────────┐
│   Entity (plain object)                  │
│                                          │
│   { position: { x, y },                 │
│     velocity: { vx, vy },               │
│     path: { currentPath, goalPath },     │
│     renderable: { type, sprite, ... },   │
│     fireflyTag: true }                   │
└──────────────────────────────────────────┘
              │
              ▼
       ┌─────────────┐
       │   Systems    │  (logic)
       └─────────────┘
              │
              ├──► MovementSystem
              ├──► TargetingSystem
              ├──► RecruitmentSystem ──┐
              ├──► DestinationSystem ──┤── PathfindingService
              └──► RenderingSystem
```

### 2. Separation of Concerns

**Gameplay Systems (no Phaser dependency)**
- Contain all game state and logic
- Testable in isolation
- Communicate via typed events

**Rendering Systems (Phaser)**
- Only responsible for visual representation
- Read from entity components
- React to gameplay events (e.g., combat visuals)

**WorldManager (orchestrator)**
- Creates the Miniplex world, spatial grid, and all systems
- Rebuilds spatial grid each frame
- Calls `system.update()` in registration order

### 3. Event-Driven Communication

Systems communicate via a typed event system rather than direct coupling:

```typescript
gameEvents.emit(GameEvents.TARGET_ACQUIRED, { entity, target });
gameEvents.on(GameEvents.PATH_COMPLETED, (data) => { /* ... */ });
```

Combat visuals are fully decoupled from combat logic via events:
- `COMBAT_CHARGING` / `COMBAT_ATTACK_BURST` / `COMBAT_RECOVERING` / `COMBAT_CLEANUP`
- CombatSystem emits these; CombatVisualsSystem listens and renders

Level flow is event-driven:
- `GAME_STARTED` — emitted by OverlaySystem when player clicks start; unpauses gameplay
- `LEVEL_WON` — emitted by FireflyGoalSystem when enough fireflies collected; pauses gameplay
- `LEVEL_LOST` — emitted by DefeatSystem (monster reached goal, or insufficient fireflies); pauses gameplay

## Directory Structure

```
maps/                        # Tiled map editor files
├── *.tmx                    # Level maps (XML-based Tiled format)
├── *.tsx                    # Tileset definitions
├── tileset.png              # Tile spritesheet
├── propertytypes.json       # Custom property type definitions for Tiled
└── *.tiled-project/session  # Tiled editor state

src/
├── assets/              # Asset loading and manifest
├── config/              # Frozen configuration objects
│   ├── entities.ts      # Entity type definitions
│   ├── game.ts          # Game-wide settings (store costs, tile size, etc.)
│   └── physics.ts       # Physics and pathfinding config
├── ecs/
│   ├── Entity.ts        # Central Entity type + all component interfaces
│   ├── GameSystem.ts    # System interface
│   ├── WorldManager.ts  # World creation, system registration, update loop
│   ├── components/      # Barrel exports (types come from Entity.ts)
│   └── systems/
│       ├── gameplay/    # Game logic systems
│       ├── rendering/   # Rendering systems (Phaser-dependent)
│       ├── ui/          # UI overlay and placement systems
│       └── effects/     # Particle effects
├── entities/            # Entity factories (world.add pattern)
├── events/              # Typed event system
├── levels/              # Level loading pipeline (TMX parsing, registry)
├── scenes/              # Phaser scenes (thin orchestration)
├── types/               # TypeScript type definitions
├── utils/               # Shared utilities
│   ├── logger.ts        # Environment-aware logging
│   ├── SpatialGrid.ts   # Spatial partitioning
│   ├── vector.ts        # Vector math utilities
│   └── geometry.ts      # Geometry utilities (ray intersection, point-to-segment, etc.)
└── workers/             # Web Workers
    └── pathfinding/     # Pathfinding computation
```

## Entity & Component Model

All component interfaces and the Entity type are defined in `src/ecs/Entity.ts`:

```typescript
export type Entity = {
  // Core
  position?: Position;        // { x, y }
  velocity?: Velocity;        // { vx, vy }
  renderable?: Renderable;    // { type, sprite, color, radius, glow, ... }
  physicsBody?: PhysicsBody;  // { mass, isStatic, collisionRadius }
  wall?: WallData;            // { segments, thickness, color }
  trail?: Trail;              // { enabled, config, points }

  // Gameplay
  path?: PathData;            // { currentPath, goalPath, direction }
  destination?: Destination;  // { forTeam: Team }
  target?: Target;            // { target: Entity }
  targeting?: Targeting;      // { potentialTargets: Entity[] }
  interaction?: Interaction;  // { interactionRadius }
  health?: Health;            // { currentHealth, maxHealth, isDead }
  combat?: Combat;            // { state, attackPattern, ... }
  lodge?: Lodge;              // { tenants, incoming, allowedTeam, maxTenants }
  activationConfig?: ActivationConfig;
  fireflyGoal?: FireflyGoal;  // { currentCount }
  spawner?: Spawner;          // { queue, state } — timed entity spawning
  redirect?: Redirect;        // { exits, radius, forTeam } — weighted path redirection
  redirectTarget?: { x, y };  // Temporary override destination from a redirect

  // Building
  buildable?: Buildable;      // { sites: BuildSite[], buildTime, allBuilt } — generic build sites
  wallBlueprint?: WallBlueprint; // { active, passableBy? } — wall-specific activation

  // Team — 'firefly' | 'monster', used for enemy detection, routing, lodging
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

export type GameWorld = World<Entity>;
```

Components are added at creation via `world.add({ ... })` or at runtime via `world.addComponent(entity, 'combat', { ... })`. Tags are just `true` boolean flags.

## Systems

All systems implement a simple interface:

```typescript
export interface GameSystem {
  update(delta: number, time: number): void;
  destroy?(): void;
}
```

Systems receive `(world: GameWorld, config: Record<string, any>)` in their constructor and create Miniplex queries to find entities:

```typescript
export class MovementSystem implements GameSystem {
  private moving: Query<With<Entity, 'position' | 'velocity'>>;

  constructor(private world: GameWorld, config: Record<string, any>) {
    this.moving = world.with('position', 'velocity');
  }

  update(delta: number, time: number): void {
    for (const entity of this.moving) {
      entity.position.x += entity.velocity.vx * delta;
      // ...
    }
  }
}
```

### Gameplay Systems

| System | Responsibility |
|--------|---------------|
| **MovementSystem** | Moves entities along paths, applies friction, emits PATH_COMPLETED |
| **DestinationSystem** | Requests navigation pathfinding, manages path queues, wall attack targeting |
| **RecruitmentSystem** | Finds candidates for lodges, scores by path distance, assigns closest entity |
| **TargetingSystem** | Acquires targets from potentialTargets using `world.with().without()` |
| **InteractionSystem** | Detects nearby entities via spatial grid, populates potentialTargets |
| **CombatSystem** | State machine (IDLE → CHARGING → ATTACKING → RECOVERING), emits visual events |
| **DamageSystem** | Handles ATTACK_HIT events, applies damage, manages death animations |
| **LodgingSystem** | Manages tenant lifecycle in lodges, triggers activation/deactivation |
| **WallGenerationSystem** | Generates walls via marching squares, sends to pathfinding worker |
| **SpawnerSystem** | Processes spawner queues, creates entities on timers with repeat/delay support |
| **RedirectSystem** | Detects entities entering redirect zones, picks weighted exit, overrides path. One-time-only per entity; tracking resets on navmesh update |
| **BuildingSystem** | Generic build-site recruitment (Manhattan estimate for 1 vs 2 builders), build progress ticking, sequential handoff |
| **WallActivationSystem** | Listens for BUILD_COMPLETE on wall blueprints, activates wall, pushes out overlapping entities, triggers navmesh rebuild |
| **FireflyGoalSystem** | Tracks firefly collection progress, emits LEVEL_WON when threshold met |
| **DefeatSystem** | Emits LEVEL_LOST when a monster reaches its goal or insufficient fireflies remain |
| **VictorySystem** | Listens for ENTITY_DIED, checks if all monsters defeated, evicts fireflies |

### Rendering Systems

| System | Responsibility |
|--------|---------------|
| **RenderingSystem** | Creates/updates/destroys Phaser sprites, manages glow effects |
| **CombatVisualsSystem** | Renders charging rings, burst shockwaves, recovery tints via combat events |
| **WallRenderingSystem** | Renders wall segments as Phaser graphics |
| **ForestDecorationSystem** | Places tree sprites on non-pathable tiles |
| **TrailSystem** | Renders fading movement trails behind entities |
| **WispVisualsSystem** | Updates wisp sprite based on lodge occupancy |
| **WallBlueprintRenderingSystem** | Renders wall blueprints (dashed lines when building, solid when active), build-progress indicators at nodes |
| **DebugRedirectSystem** | Visualizes redirect zones and exits (enabled via `?debug` URL param) |
| **ParticleEffectsSystem** | Event-driven particle bursts for lodging and death |

### UI Systems

| System | Responsibility |
|--------|---------------|
| **UISystem** | Energy display and HUD elements |
| **PlacementSystem** | Handles wisp placement via user interaction |
| **WallPlacementSystem** | Two-click wall placement: first anchor snaps to wall geometry, second anchor snaps to ray-wall intersection |
| **OverlaySystem** | Pregame start button, victory/defeat overlays, level progression buttons |

## WorldManager

`WorldManager` is the central orchestrator. Systems are split into three update groups:

- **Rendering systems** — always run (sprites, walls, trails, debug overlays)
- **UI systems** — always run (HUD, placement, victory/defeat overlays)
- **Gameplay systems** — only run when unpaused (movement, combat, spawning, etc.)

```typescript
export class WorldManager {
  readonly world: GameWorld;
  readonly spatialGrid: SpatialGrid;
  private renderingSystems: GameSystem[] = [];
  private uiSystems: GameSystem[] = [];
  private gameplaySystems: GameSystem[] = [];
  private _paused = true;

  constructor(scene, pathfindingWorker, map, config: WorldManagerConfig) { ... }

  update(delta: number, time: number): void {
    this.rebuildSpatialGrid();
    for (const system of this.renderingSystems) system.update(delta, time);
    for (const system of this.uiSystems) system.update(delta, time);
    if (!this._paused) {
      for (const system of this.gameplaySystems) system.update(delta, time);
    }
  }
}
```

The game starts paused. The `OverlaySystem` shows a start button; pressing it emits `GAME_STARTED`, which GameScene uses to unpause. On `LEVEL_WON` or `LEVEL_LOST`, the game pauses again and the overlay shows next-level or retry buttons.

GameScene is thin orchestration — it parses the TMX level, creates the WorldManager, and wires up level-flow event listeners:

```typescript
create(): void {
  const levelData = parseTmx(LEVELS[this.levelIndex]);
  this.worldManager = new WorldManager(this, this.pathfindingWorker, levelData.map, {
    energyManager, levelConfig, levelIndex,
    onNextLevel: () => this.scene.restart({ levelIndex: this.levelIndex + 1 }),
    onRetry: () => this.scene.restart({ levelIndex: this.levelIndex }),
  });
  loadLevelFromData(this.worldManager.world, levelData);
}
```

## Levels

Levels are authored in [Tiled](https://www.mapeditor.org/) and stored as `.tmx` files in the `maps/` directory. The loading pipeline is:

1. **`levelRegistry.ts`** — imports TMX files as raw strings via Vite's `?raw` suffix
2. **`parseTmx(xml)`** — parses the TMX XML into a `LevelData` object:
   - Tile layer CSV → `number[][]` map grid (GID-1 mapping)
   - Map-level properties → `LevelConfig` (`initialEnergy`, `firefliesToWin`)
   - Object layer → `EntityDescriptor[]` (spawners, goals, wisps, redirects)
3. **`loadLevelFromData(world, data)`** — calls entity factories for each descriptor

```typescript
// src/levels/levelRegistry.ts
import level1Tmx from '../../maps/level1.tmx?raw';
import level2Tmx from '../../maps/level2.tmx?raw';
export const LEVELS: readonly string[] = [level1Tmx, level2Tmx];
```

Tiled objects use custom properties (defined in `maps/propertytypes.json`) for entity-specific data like spawner queues (JSON), redirect exits (linked via `redirect_exit` objects), and goal types.

Level selection: GameScene reads `?level=N` from the URL, or accepts `{ levelIndex }` via scene restart data.

## Pathfinding Architecture

### Worker-Based Computation

Pathfinding runs in a Web Worker to prevent main thread blocking:

```
Main Thread                    Worker Thread
    │                              │
    ├──► buildNavMesh ────────────►│
    │                              │ Generate NavMesh
    │◄──── navmeshReady ───────────┤
    │                              │
    ├──► pathfind ─────────────────►│
    │    (start, destination)      │ A* pathfinding
    │                              │
    │◄──── path result ─────────────┤
    │                              │
```

### NavMesh Generation

1. **Wall Contour Extraction**: Marching squares algorithm
2. **Path Shrinking**: Offset shapes by entity radius
3. **Triangulation**: Earcut library for triangulation
4. **Caching**: NavMesh cached per radius size

### Snap-to-Mesh

When a start or destination point falls outside the NavMesh (e.g., an entity near a wall edge), the `pathfind` function snaps it to the closest mesh point within a 20-unit radius before querying. This prevents pathfinding failures for entities slightly off the walkable area.

### Race Condition Prevention

- Pending requests tracked in `Map<entityId, timeout>`
- 5-second timeout auto-clears stuck requests
- Error responses include entityId for cleanup
- `destroy()` method cleans up all listeners and timeouts

## Configuration Management

All configuration is centralized and immutable:

```typescript
export const PHYSICS_CONFIG = Object.freeze({
  DEFAULT_SPEED: 20,
  FRICTION: 0.975,
  MIN_VELOCITY: 0.01,
  // ...
});
```

### Configuration Files

- `entities.ts`: Entity type definitions (frozen, readonly arrays)
- `game.ts`: Canvas size, tile size, wall config, store costs
- `physics.ts`: Movement, friction, pathfinding weights

Per-level configuration (energy budget, win threshold) is defined as Tiled map properties in each `.tmx` file, parsed at load time rather than stored in global config.

## Event System

Type-safe event system with payload interfaces:

```typescript
export interface GameEventPayloads {
  [GameEvents.PATH_COMPLETED]: {
    entity: Entity;
    position: { x: number; y: number }
  };
  [GameEvents.COMBAT_ATTACK_BURST]: {
    entity: Entity;
    attackPattern: AttackPattern;
    position: { x: number; y: number }
  };
  [GameEvents.LEVEL_WON]: { firefliesCollected: number };
  [GameEvents.LEVEL_LOST]: { reason: 'monster_reached_goal' | 'insufficient_fireflies' };
  [GameEvents.GAME_STARTED]: {};
  // ...
}
```

## Logging System

Environment-aware logger with namespace filtering:

```typescript
import { logger } from '@/utils';

logger.debug('MovementSystem', 'Entity moved', entity);
logger.error('Worker', 'Pathfinding failed', error);
```

**Log Levels:** DEBUG, INFO, WARN, ERROR, NONE

## Testing Strategy

### Unit Tests

Tests cover all critical systems with focus on:
- Happy path functionality
- Edge cases (NaN, Infinity, empty arrays, etc.)
- Race conditions and error handling
- Type safety and immutability

**Test Organization:**
- System tests create isolated Miniplex worlds and instantiate systems directly
- Shared test helpers in `src/__tests__/helpers/` provide entity factories
- Edge case tests cover boundary conditions

## Performance Considerations

### Bundle Optimization

- Code splitting: Phaser and Miniplex in separate chunks
- Worker code bundled independently
- Console logs and debugger statements stripped in production builds

### Memory Management

**Entity Lifecycle:**
- Entities are plain objects — no pooling overhead
- `world.remove(entity)` cleans up from all queries
- Systems implement `destroy()` for event listener cleanup

**Worker Communication:**
- Minimal data transfer (only coordinates)
- Structured clone algorithm
- No shared memory (simpler, safer)

**NavMesh Caching:**
- Cache keyed by entity radius
- Lazy generation on first request
- Persistent across frames

### Rendering Optimization

**Sprite Management:**
- Sprites created/destroyed via Miniplex query `onEntityAdded`/`onEntityRemoved` events
- Only entities with `position` + `renderable` components get sprites
- Glow effects recreated only when properties change

**Graphics Rendering:**
- Walls rendered as single graphics object (drawn once)
- Catmull-Rom smoothing for fewer points
- Trails cleared and redrawn each frame with ADD blend mode

## Error Handling

### System-Level Error Handling

All systems wrapped in try-catch:
```typescript
update(delta: number, time: number): void {
  for (const entity of this.query) {
    try {
      // System logic
    } catch (error) {
      console.error('[SystemName] Error:', error);
    }
  }
}
```

### Worker Error Handling

Worker errors include context for cleanup:
```typescript
catch (error) {
  self.postMessage({
    action: 'error',
    error: error.message,
    entityId: e.data?.entityId
  });
}
```

## Build and Development

### Commands

```bash
npm run dev      # Start development server (port 8080)
npm run build    # Production build (tsc + vite)
npm test         # Run all tests
npm run preview  # Preview production build
```
