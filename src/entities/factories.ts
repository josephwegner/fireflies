import type { Entity, GameWorld, SpawnEntry, RedirectExit, Team, BuildSite } from '@/ecs/Entity';
import { CombatState } from '@/ecs/Entity';
import { ENTITY_CONFIG, PHYSICS_CONFIG, GAME_CONFIG } from '@/config';

export function createFirefly(world: GameWorld, x: number, y: number): Entity {
  const config = ENTITY_CONFIG.firefly;
  const visual = config.visual!;

  return world.add({
    position: {
      x: x + Math.random() * PHYSICS_CONFIG.POSITION_JITTER,
      y: y + Math.random() * PHYSICS_CONFIG.POSITION_JITTER
    },
    velocity: { vx: 0, vy: 0 },
    path: {
      currentPath: [],
      goalPath: [],
      direction: config.direction!
    },
    renderable: {
      type: config.type,
      sprite: visual.sprite,
      color: config.color,
      radius: config.radius,
      alpha: 1,
      scale: 1,
      tint: visual.tint,
      rotation: 0,
      rotationSpeed: visual.rotationSpeed,
      depth: visual.depth,
      offsetY: 0,
      glow: structuredClone(visual.glow)
    },
    physicsBody: {
      mass: config.mass,
      isStatic: config.isStatic,
      collisionRadius: config.radius
    },
    interaction: {
      interactionRadius: config.interactionRadius!
    },
    targeting: {
      potentialTargets: []
    },
    health: {
      currentHealth: config.health!,
      maxHealth: config.health!,
      isDead: false
    },
    combat: {
      state: CombatState.IDLE,
      chargeTime: 0,
      attackElapsed: 0,
      recoveryElapsed: 0,
      attackPattern: structuredClone(config.combat!),
      hasHit: false
    },
    trail: {
      enabled: true,
      config: structuredClone(visual.trail!),
      points: []
    },
    team: 'firefly',
    fireflyTag: true
  });
}

export function createWisp(world: GameWorld, x: number, y: number): Entity {
  const config = ENTITY_CONFIG.wisp;
  const visual = config.visual!;

  return world.add({
    position: { x, y },
    destination: { forTeam: 'firefly' },
    renderable: {
      type: config.type,
      sprite: visual.sprite,
      color: config.color,
      radius: config.radius,
      alpha: 1,
      scale: 1,
      tint: visual.tint,
      rotation: 0,
      rotationSpeed: visual.rotationSpeed,
      depth: visual.depth,
      offsetY: 0,
      glow: structuredClone(visual.glow)
    },
    physicsBody: {
      mass: config.mass,
      isStatic: config.isStatic,
      collisionRadius: visual.collisionRadius!
    },
    health: {
      currentHealth: 100,
      maxHealth: 100,
      isDead: false
    },
    team: 'firefly',
    wispTag: true,
    lodge: {
      tenants: [],
      incoming: [],
      allowedTeam: 'firefly',
      maxTenants: 1
    },
    activationConfig: {
      onActivate: [
        {
          componentName: 'renderable',
          config: {
            tint: config.activeColor,
            glow: structuredClone(visual.activeGlow)
          }
        },
        {
          componentName: 'interaction',
          config: {
            interactionRadius: 112
          }
        },
        {
          componentName: 'targeting',
          config: {
            potentialTargets: []
          }
        },
        {
          componentName: 'combat',
          config: {
            state: CombatState.IDLE,
            attackPattern: structuredClone(config.combat!),
            hasHit: false
          }
        }
      ],
      onDeactivate: [
        {
          componentName: 'renderable',
          config: {
            tint: config.color,
            glow: structuredClone(visual.glow)
          }
        }
      ]
    }
  });
}

export function createMonster(world: GameWorld, x: number, y: number): Entity {
  const config = ENTITY_CONFIG.monster;
  const visual = config.visual!;

  return world.add({
    position: {
      x: x + Math.random() * PHYSICS_CONFIG.POSITION_JITTER,
      y: y + Math.random() * PHYSICS_CONFIG.POSITION_JITTER
    },
    velocity: { vx: 0, vy: 0 },
    path: {
      currentPath: [],
      goalPath: [],
      direction: config.direction!
    },
    renderable: {
      type: config.type,
      sprite: visual.sprite,
      color: config.color,
      radius: config.radius,
      alpha: 1,
      scale: 1,
      tint: visual.tint,
      rotation: 0,
      rotationSpeed: visual.rotationSpeed,
      depth: visual.depth,
      offsetY: 0
    },
    physicsBody: {
      mass: config.mass,
      isStatic: config.isStatic,
      collisionRadius: config.radius
    },
    interaction: {
      interactionRadius: config.interactionRadius!
    },
    targeting: {
      potentialTargets: []
    },
    health: {
      currentHealth: config.health!,
      maxHealth: config.health!,
      isDead: false
    },
    combat: {
      state: CombatState.IDLE,
      chargeTime: 0,
      attackElapsed: 0,
      recoveryElapsed: 0,
      attackPattern: structuredClone(config.combat!),
      hasHit: false
    },
    team: 'monster',
    monsterTag: true
  });
}

export function createGoal(
  world: GameWorld,
  x: number,
  y: number,
  forTeam: Team
): Entity {
  const goalConfig = forTeam === 'monster' ? ENTITY_CONFIG.goalMonster : ENTITY_CONFIG.goalFirefly;
  const visual = goalConfig.visual!;

  const renderableConfig: Entity['renderable'] = {
    type: goalConfig.type,
    sprite: visual.sprite,
    color: goalConfig.color,
    radius: visual.spriteRadius!,
    alpha: 1,
    scale: 1,
    tint: visual.tint,
    rotation: 0,
    rotationSpeed: visual.rotationSpeed,
    depth: visual.depth,
    offsetY: visual.offsetY ?? 0,
    glow: structuredClone(visual.glow)
  };

  const entity: Partial<Entity> = {
    position: { x, y },
    destination: { forTeam },
    renderable: renderableConfig,
    physicsBody: {
      mass: goalConfig.mass,
      isStatic: goalConfig.isStatic,
      collisionRadius: goalConfig.radius
    },
    goalTag: true
  };

  if (forTeam === 'firefly') {
    entity.fireflyGoal = { currentCount: 0 };
  }

  return world.add(entity as Entity);
}

export function createRedirect(
  world: GameWorld,
  x: number,
  y: number,
  exits: RedirectExit[],
  forTeam: Team,
  radius: number = GAME_CONFIG.TILE_SIZE * 3
): Entity {
  return world.add({
    position: { x, y },
    redirect: {
      exits,
      radius,
      forTeam
    },
    redirectTag: true
  });
}

export function createWallBlueprint(
  world: GameWorld,
  nodeA: { x: number; y: number },
  nodeB: { x: number; y: number },
  buildTime: number,
  passableBy?: Team
): Entity {
  const midX = (nodeA.x + nodeB.x) / 2;
  const midY = (nodeA.y + nodeB.y) / 2;

  const sites: BuildSite[] = [
    { x: nodeA.x, y: nodeA.y, built: false, buildProgress: 0 },
    { x: nodeB.x, y: nodeB.y, built: false, buildProgress: 0 }
  ];

  return world.add({
    position: { x: midX, y: midY },
    buildable: { sites, buildTime, allBuilt: false },
    wallBlueprint: { active: false, passableBy },
    wallBlueprintTag: true,
    health: { currentHealth: GAME_CONFIG.WALL_HP, maxHealth: GAME_CONFIG.WALL_HP, isDead: false },
    team: 'firefly' as Team,
    physicsBody: { collisionRadius: GAME_CONFIG.WALL_BLUEPRINT_THICKNESS / 2, mass: 0, isStatic: true }
  });
}

export function createSpawner(
  world: GameWorld,
  x: number,
  y: number,
  queue: SpawnEntry[]
): Entity {
  return world.add({
    position: { x, y },
    spawner: {
      queue,
      state: {
        currentIndex: 0,
        repeatsDone: 0,
        timer: 0,
        phase: queue.length > 0 ? 'spawning' as const : 'done' as const
      }
    },
    spawnerTag: true
  });
}
