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
              ├──► DestinationSystem
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

## Directory Structure

```
src/
├── assets/              # Asset loading and manifest
├── config/              # Frozen configuration objects
│   ├── entities.ts      # Entity type definitions
│   ├── game.ts          # Game-wide settings
│   └── physics.ts       # Physics and pathfinding config
├── ecs/
│   ├── Entity.ts        # Central Entity type + all component interfaces
│   ├── GameSystem.ts    # System interface
│   ├── WorldManager.ts  # World creation, system registration, update loop
│   ├── components/      # Barrel exports (types come from Entity.ts)
│   └── systems/
│       ├── gameplay/    # Game logic systems
│       ├── rendering/   # Rendering systems (Phaser-dependent)
│       └── effects/     # Particle effects
├── entities/            # Entity factories (world.add pattern)
├── events/              # Typed event system
├── levels/              # Level data and entity spawning
├── scenes/              # Phaser scenes (thin orchestration)
├── types/               # TypeScript type definitions
├── utils/               # Shared utilities
│   ├── logger.ts        # Environment-aware logging
│   ├── SpatialGrid.ts   # Spatial partitioning
│   └── vector.ts        # Vector math utilities
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
  destination?: Destination;  // { for: string[] }
  target?: Target;            // { target: Entity }
  targeting?: Targeting;      // { potentialTargets: Entity[] }
  interaction?: Interaction;  // { interactsWith, interactionRadius }
  health?: Health;            // { currentHealth, maxHealth, isDead }
  combat?: Combat;            // { state, attackPattern, ... }
  lodge?: Lodge;              // { tenants, allowedTenants, maxTenants }
  activationConfig?: ActivationConfig;
  fireflyGoal?: FireflyGoal;  // { currentCount }

  // Tags (boolean flags)
  fireflyTag?: true;
  wispTag?: true;
  monsterTag?: true;
  goalTag?: true;
  wallTag?: true;
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
| **DestinationSystem** | Requests pathfinding from worker, manages path queues |
| **TargetingSystem** | Acquires targets from potentialTargets using `world.with().without()` |
| **InteractionSystem** | Detects nearby entities via spatial grid, populates potentialTargets |
| **CombatSystem** | State machine (IDLE → CHARGING → ATTACKING → RECOVERING), emits visual events |
| **DamageSystem** | Handles ATTACK_HIT events, applies damage, manages death animations |
| **LodgingSystem** | Manages tenant lifecycle in lodges, triggers activation/deactivation |
| **WallGenerationSystem** | Generates walls via marching squares, sends to pathfinding worker |
| **FireflyGoalSystem** | Tracks firefly collection progress, updates goal glow |
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
| **ParticleEffectsSystem** | Event-driven particle bursts for lodging and death |

## WorldManager

`WorldManager` is the central orchestrator, replacing the previous pattern where GameScene owned everything:

```typescript
export class WorldManager {
  readonly world: GameWorld;
  readonly spatialGrid: SpatialGrid;

  constructor(scene: Phaser.Scene, pathfindingWorker: Worker, map: number[][]) {
    this.world = new World<Entity>();
    this.spatialGrid = new SpatialGrid(PHYSICS_CONFIG.SPATIAL_GRID_CELL_SIZE);
    this.registerSystems(); // Creates all systems in order
  }

  update(delta: number, time: number): void {
    this.rebuildSpatialGrid();
    for (const system of this.systems) {
      system.update(delta, time);
    }
  }
}
```

GameScene is now thin orchestration:

```typescript
create(): void {
  this.worldManager = new WorldManager(this, this.pathfindingWorker, LEVEL_1_MAP);
  loadLevel(this.worldManager.world);
}

update(time: number, delta: number): void {
  this.worldManager.update(delta, time);
}
```

## Levels

Level data and entity spawning are separated from the scene:

```typescript
// src/levels/level1.ts
export const LEVEL_1_MAP: number[][] = [ /* tile data */ ];

export function loadLevel(world: GameWorld): void {
  createFirefly(world, x, y);
  createWisp(world, x, y);
  // ...
}
```

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
- `game.ts`: Canvas size, tile size, wall config, victory conditions
- `physics.ts`: Movement, friction, pathfinding weights

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
