# Architecture Documentation

## Overview

The Lantern Network is a 2D game built using a pure Entity-Component-System (ECS) architecture with Phaser 3 for rendering. The game features pathfinding-driven entities that navigate through procedurally generated maze-like levels.

## Technology Stack

- **TypeScript**: Strict mode enabled for type safety
- **ECSY**: Pure ECS library for game logic
- **Phaser 3**: Game rendering engine (decoupled from ECS data)
- **Vite**: Fast build tool with HMR
- **Vitest**: Unit testing framework
- **Web Workers**: Off-thread pathfinding computation

## Core Architecture Principles

### 1. Pure ECS Architecture

The game strictly follows ECS patterns:

- **Components**: Pure data containers with no logic
- **Systems**: Pure logic that operates on components
- **Entities**: Simple IDs linking components together

```
┌─────────────┐
│   Entity    │  (Just an ID)
└─────────────┘
       │
       ├──► Position Component (data)
       ├──► Velocity Component (data)
       ├──► Path Component (data)
       └──► Renderable Component (data)
              │
              ▼
       ┌─────────────┐
       │   Systems   │  (logic)
       └─────────────┘
              │
              ├──► MovementSystem
              ├──► TargetingSystem
              ├──► DestinationSystem
              └──► RenderingSystem
```

### 2. Separation of Concerns

**ECS Layer (Game Logic)**
- Contains all game state and logic
- No Phaser dependencies
- Testable in isolation

**Rendering Layer (Phaser)**
- Only responsible for visual representation
- Reads from ECS components
- Updates Phaser sprites based on ECS state

### 3. Event-Driven Communication

Systems communicate via a typed event system rather than direct coupling:

```typescript
gameEvents.emit(GameEvents.TARGET_ACQUIRED, { entity, target });
gameEvents.on(GameEvents.PATH_COMPLETED, (data) => { /* ... */ });
```

## Directory Structure

```
src/
├── assets/              # Asset loading and manifest
├── config/              # Frozen configuration objects
│   ├── entities.ts      # Entity type definitions
│   ├── game.ts          # Game-wide settings
│   └── physics.ts       # Physics and pathfinding config
├── ecs/
│   ├── components/      # Pure data components
│   │   ├── gameplay/    # Game logic components
│   │   └── rendering/   # Rendering-related components
│   └── systems/         # Logic systems
│       ├── gameplay/    # Game logic systems
│       └── rendering/   # Rendering systems
├── entities/            # Entity factories
├── events/              # Typed event system
├── scenes/              # Phaser scenes
├── types/               # TypeScript type definitions
├── utils/               # Shared utilities
│   ├── logger.ts        # Environment-aware logging
│   └── vector.ts        # Vector math utilities
└── workers/             # Web Workers
    └── pathfinding/     # Pathfinding computation
```

## Key Components

### Components (Data)

**Core Components:**
- `Position`: x, y coordinates
- `Velocity`: vx, vy velocity
- `Path`: currentPath, nextPath, direction
- `Renderable`: sprite, color, radius
- `PhysicsBody`: body reference
- `Destination`: for array of entity types
- `Targeting`: potentialTargets array
- `Target`: current target entity
- `Interaction`: interactsWith, interactionRadius, onInteract
- `Wall`: segments, thickness, color

**Tag Components:**
- `FireflyTag`, `WispTag`, `MonsterTag`, `GoalTag`, `WallTag`

### Systems (Logic)

#### Gameplay Systems

**MovementSystem**
- Moves entities along paths
- Applies friction and physics
- Handles waypoint arrival
- Emits PATH_COMPLETED events

**DestinationSystem**
- Requests pathfinding from worker
- Manages currentPath and nextPath
- Handles race conditions with timeout-based cleanup
- Prevents memory leaks with proper cleanup

**TargetingSystem**
- Acquires targets from potentialTargets
- Emits TARGET_ACQUIRED events
- Uses ECSY Not() queries for efficiency

**WallGenerationSystem**
- Generates walls from tile maps using marching squares
- Smooths contours with Catmull-Rom splines
- Sends wall data to pathfinding worker
- Creates single wall entity per map

#### Rendering Systems

**RenderingSystem**
- Creates/updates/destroys Phaser sprites
- Syncs sprite position with Position component
- Handles sprite lifecycle
- Decoupled from game logic

**WallRenderingSystem**
- Renders wall segments as Phaser graphics
- Updates when wall components change

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

- Pending requests tracked in Map<entityId, timeout>
- 5-second timeout auto-clears stuck requests
- Error responses include entityId for cleanup
- Stop() method cleans up all listeners and timeouts

## Configuration Management

All configuration is centralized and immutable:

```typescript
export const PHYSICS_CONFIG = Object.freeze({
  DEFAULT_SPEED: 20,
  FRICTION: 0.01,
  MIN_VELOCITY: 0.001,
  // ...
});
```

### Configuration Files

- `entities.ts`: Entity type definitions (frozen, readonly arrays)
- `game.ts`: Canvas size, tile size, wall config
- `physics.ts`: Movement, friction, pathfinding weights

## Event System

Type-safe event system with payload interfaces:

```typescript
export interface GameEventPayloads {
  [GameEvents.PATH_COMPLETED]: {
    entity: ECSEntity;
    position: { x: number; y: number }
  };
  [GameEvents.TARGET_ACQUIRED]: {
    entity: ECSEntity;
    target: ECSEntity
  };
  // ...
}
```

Benefits:
- Type checking at compile time
- IntelliSense support
- Prevents typos and runtime errors

## Logging System

Environment-aware logger with namespace filtering:

```typescript
import { logger } from '@/utils';

// Logs in development, silent in production
logger.debug('MovementSystem', 'Entity moved', entity);
logger.error('Worker', 'Pathfinding failed', error);
```

**Log Levels:**
- DEBUG: Development only
- INFO: Development and staging
- WARN: All environments
- ERROR: Always logged
- NONE: Disable all logging

**Namespace Filtering:**
```typescript
logger.enable('MovementSystem');
logger.disable('RenderingSystem');
```

## Testing Strategy

### Unit Tests

Tests cover all critical systems with focus on:
- Happy path functionality
- Edge cases (NaN, Infinity, empty arrays, etc.)
- Race conditions and error handling
- Type safety and immutability

**Test Organization:**
- Component/config tests verify immutability
- System tests run in isolated ECSY worlds
- Edge case tests cover boundary conditions
- Integration tests verify system interactions

## Performance Considerations

### Bundle Optimization

- Code splitting: Phaser and ECSY in separate chunks
- Worker code bundled independently
- Source maps enabled for debugging

### Memory Management

**Entity Lifecycle:**
- ECSY handles entity pooling
- Components reused when possible
- Proper cleanup in system stop() methods

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
- Create sprites only for Renderable entities
- Destroy sprites when entities removed
- Update only changed positions

**Graphics Rendering:**
- Walls rendered as single graphics object
- No per-frame redraw unless changed
- Catmull-Rom smoothing for fewer points

## Error Handling

### System-Level Error Handling

All systems wrapped in try-catch:
```typescript
execute() {
  this.queries.moving.results.forEach(entity => {
    try {
      // System logic
    } catch (error) {
      console.error('[MovementSystem] Error:', entity.id, error);
    }
  });
}
```

### Worker Error Handling

Worker errors include context for cleanup:
```typescript
catch (error) {
  self.postMessage({
    action: 'error',
    error: error.message,
    stack: error.stack,
    entityId: e.data?.entityId
  });
}
```

### Memory Leak Prevention

- Worker listeners set to null on stop()
- Timeouts cleared on cleanup
- Pending requests tracked and cleaned

## Build and Development

### Commands

```bash
npm run dev      # Start development server (port 8080)
npm run build    # Production build
npm test         # Run all tests
npm run preview  # Preview production build
```

### Development Flow

1. **Make changes**: Edit TypeScript files
2. **HMR**: Vite hot reloads instantly
3. **Test**: Run tests with Vitest
4. **Build**: Verify production build
5. **Commit**: Clean git history

### Type Safety

- TypeScript strict mode enabled
- No `any` types except in tests
- Frozen configurations prevent mutations
- Type-safe event payloads

## Conclusion

This architecture provides:

- **Maintainability**: Clear separation of concerns
- **Testability**: Pure functions and isolated systems
- **Performance**: Worker-based pathfinding, efficient rendering
- **Type Safety**: Compile-time error catching
- **Scalability**: ECS scales to thousands of entities

The pure ECS approach ensures game logic remains independent of rendering, making it easy to test, maintain, and extend.
