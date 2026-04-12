import type { Query, With } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import type { GameSystem } from '@/ecs/GameSystem';
import { gameEvents, GameEvents } from '@/events';
import { ENTITY_CONFIG, PHYSICS_CONFIG } from '@/config';
import { logger } from '@/utils/logger';

export class VictorySystem implements GameSystem {
  private monsters: Query<With<Entity, 'monsterTag' | 'health'>>;
  private lodges: Query<With<Entity, 'lodge' | 'position'>>;
  private fireflies: Query<With<Entity, 'fireflyTag' | 'position' | 'velocity' | 'path'>>;
  private victoryTriggered = false;
  private handleEntityDiedBound: (data: any) => void;

  constructor(private world: GameWorld, _config: Record<string, any>) {
    this.monsters = world.with('monsterTag', 'health');
    this.lodges = world.with('lodge', 'position');
    this.fireflies = world.with('fireflyTag', 'position', 'velocity', 'path');

    this.handleEntityDiedBound = this.handleEntityDied.bind(this);
    gameEvents.on(GameEvents.ENTITY_DIED, this.handleEntityDiedBound);
  }

  destroy(): void {
    gameEvents.off(GameEvents.ENTITY_DIED, this.handleEntityDiedBound);
  }

  update(_delta: number, _time: number): void {
    // Victory checking is event-driven
  }

  private handleEntityDied(_data: any): void {
    if (this.victoryTriggered) return;

    const livingMonsters = this.monsters.entities.filter(m => !m.health.isDead);

    if (this.monsters.entities.length > 0 && livingMonsters.length === 0) {
      this.triggerVictory();
    }
  }

  private triggerVictory(): void {
    this.victoryTriggered = true;
    logger.info('VictorySystem', 'All monsters defeated!');
    gameEvents.emit(GameEvents.ALL_MONSTERS_DEFEATED, {});
    this.evictAllFireflies();
    this.fleeAllFireflies();
  }

  private fleeAllFireflies(): void {
    for (const firefly of this.fireflies) {
      if (firefly.fleeingToGoalTag) continue;

      if (firefly.assignedDestination) {
        this.world.removeComponent(firefly, 'assignedDestination');
      }

      firefly.path.currentPath = [];
      firefly.path.goalPath = [];

      this.world.addComponent(firefly, 'fleeingToGoalTag', true);
    }

    for (const lodgeEntity of this.lodges) {
      lodgeEntity.lodge.incoming = [];
    }
  }

  private evictAllFireflies(): void {
    for (const lodgeEntity of this.lodges) {
      const { lodge, position: lodgePos } = lodgeEntity;
      const tenantsToEvict = [...lodge.tenants];

      for (const tenant of tenantsToEvict) {
        if (!this.world.has(tenant)) {
          const idx = lodge.tenants.indexOf(tenant);
          if (idx !== -1) lodge.tenants.splice(idx, 1);
          continue;
        }

        if (!tenant.fireflyTag) continue;

        const idx = lodge.tenants.indexOf(tenant);
        if (idx !== -1) lodge.tenants.splice(idx, 1);

        const tenantType = tenant.renderable?.type;
        if (!tenantType) continue;

        this.world.addComponent(tenant, 'position', { x: lodgePos.x, y: lodgePos.y });
        this.world.addComponent(tenant, 'velocity', { vx: 0, vy: 0 });

        const config = ENTITY_CONFIG[tenantType as keyof typeof ENTITY_CONFIG];
        this.world.addComponent(tenant, 'path', {
          currentPath: [],
          goalPath: [],
          direction: config?.direction ?? 'r'
        });

        this.world.addComponent(tenant, 'fleeingToGoalTag', true);
      }
    }
  }
}
