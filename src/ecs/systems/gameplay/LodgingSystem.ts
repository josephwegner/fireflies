import type { Query, With } from 'miniplex';
import type { Entity, GameWorld, Team } from '@/ecs/Entity';
import { GameSystemBase } from '@/ecs/GameSystem';
import { ENTITY_CONFIG, PHYSICS_CONFIG } from '@/config';
import { SpatialGrid, Vector } from '@/utils';
import { gameEvents, GameEventPayloads, GameEvents } from '@/events';
import { logger } from '@/utils/logger';

type LodgeEntity = With<Entity, 'lodge' | 'position'>;

// Component registry for ActivationConfig string-based lookups
const COMPONENT_REGISTRY: Record<string, keyof Entity> = {
  renderable: 'renderable',
  interaction: 'interaction',
  targeting: 'targeting',
  combat: 'combat',
};

export class LodgingSystem extends GameSystemBase {
  private lodges: Query<LodgeEntity>;
  private spatialGrid: SpatialGrid;

  constructor(private world: GameWorld, config: Record<string, any>) {
    super();
    this.lodges = world.with('lodge', 'position');
    this.spatialGrid = config.spatialGrid;

    this.listen(GameEvents.TENANT_ADDED_TO_LODGE, this.handleTenantAdded);
    this.listen(GameEvents.TENANT_REMOVED_FROM_LODGE, this.handleTenantRemoved);
  }

  update(_delta: number, _time: number): void {
    for (const lodgeEntity of this.lodges) {
      if (lodgeEntity.health?.isDead) continue;
      const { lodge } = lodgeEntity;

      // Clean dead tenants
      if (lodge.tenants.length > 0) {
        const aliveBefore = lodge.tenants.length;
        lodge.tenants = lodge.tenants.filter(t => this.world.has(t));
        if (lodge.tenants.length !== aliveBefore) {
          logger.debug('LodgingSystem', `Removed ${aliveBefore - lodge.tenants.length} dead tenants`);
        }
      }

      // Clean dead/removed incoming entities
      if (lodge.incoming && lodge.incoming.length > 0) {
        lodge.incoming = lodge.incoming.filter(t =>
          this.world.has(t) && !t.health?.isDead
        );
      }

      this.processIncomingArrivals(lodgeEntity);
      this.addNewTenants(lodgeEntity);
    }
  }

  private processIncomingArrivals(lodgeEntity: LodgeEntity): void {
    const { lodge, position: lodgePos } = lodgeEntity;
    if (!lodge.incoming || lodge.incoming.length === 0) return;

    const arrivals: Entity[] = [];
    for (const entity of lodge.incoming) {
      if (!entity.position) continue;
      const dx = entity.position.x - lodgePos.x;
      const dy = entity.position.y - lodgePos.y;
      const distance = Vector.length(dx, dy);
      if (distance <= PHYSICS_CONFIG.PATH_ARRIVAL_THRESHOLD) {
        arrivals.push(entity);
      }
    }

    for (const entity of arrivals) {
      this.addTenantToLodge(lodgeEntity, entity);
    }
  }

  private addNewTenants(lodgeEntity: LodgeEntity): void {
    const { lodge, position: lodgePos } = lodgeEntity;
    const incomingCount = lodge.incoming ? lodge.incoming.length : 0;

    if (lodge.tenants.length + incomingCount >= lodge.maxTenants) return;

    const nearbyEntities = this.spatialGrid.getNearby(
      lodgePos.x,
      lodgePos.y,
      PHYSICS_CONFIG.PATH_ARRIVAL_THRESHOLD
    );

    for (const entity of nearbyEntities) {
      if (lodge.tenants.length + incomingCount >= lodge.maxTenants) return;
      if (entity === lodgeEntity) continue;
      if (!this.canLodge(entity, lodge.allowedTeam)) continue;

      const entityPos = entity.position;
      if (!entityPos) continue;

      const dx = entityPos.x - lodgePos.x;
      const dy = entityPos.y - lodgePos.y;
      const distance = Vector.length(dx, dy);

      if (distance <= PHYSICS_CONFIG.PATH_ARRIVAL_THRESHOLD) {
        this.addTenantToLodge(lodgeEntity, entity);
      }
    }
  }

  private canLodge(entity: Entity, allowedTeam: Team): boolean {
    if (entity.fleeingToGoalTag) return false;
    return entity.team === allowedTeam;
  }

  private handleTenantAdded(event: GameEventPayloads[typeof GameEvents.TENANT_ADDED_TO_LODGE]): void {
    const { lodgeEntity, tenantEntity } = event;

    this.world.removeComponent(tenantEntity, 'position');
    this.world.removeComponent(tenantEntity, 'velocity');
    this.world.removeComponent(tenantEntity, 'path');

    const lodge = lodgeEntity.lodge!;
    if (lodge.tenants.length >= lodge.maxTenants) {
      this.activate(lodgeEntity);
    }
  }

  private handleTenantRemoved(event: GameEventPayloads[typeof GameEvents.TENANT_REMOVED_FROM_LODGE]): void {
    const { lodgeEntity, tenantEntity } = event;

    const lodgePos = lodgeEntity.position!;
    const tenantType = tenantEntity.renderable?.type;

    this.world.addComponent(tenantEntity, 'position', { x: lodgePos.x + 1, y: lodgePos.y });
    this.world.addComponent(tenantEntity, 'velocity', { vx: 0, vy: 0 });
    this.world.addComponent(tenantEntity, 'path', {
      currentPath: [],
      goalPath: [],
      direction: tenantType ? ENTITY_CONFIG[tenantType as keyof typeof ENTITY_CONFIG]?.direction ?? 'r' : 'r'
    });

    const lodge = lodgeEntity.lodge!;
    if (lodge.tenants.length < lodge.maxTenants) {
      this.deactivate(lodgeEntity);
    }
  }

  private addTenantToLodge(lodgeEntity: Entity, tenantEntity: Entity): void {
    const lodge = lodgeEntity.lodge!;

    // Move from incoming to tenants
    if (lodge.incoming) {
      const incomingIdx = lodge.incoming.indexOf(tenantEntity);
      if (incomingIdx !== -1) {
        lodge.incoming.splice(incomingIdx, 1);
      }
    }

    lodge.tenants.push(tenantEntity);

    // Remove assignment — tenant has arrived
    if (tenantEntity.assignedDestination) {
      this.world.removeComponent(tenantEntity, 'assignedDestination');
    }

    gameEvents.emit(GameEvents.TENANT_ADDED_TO_LODGE, { lodgeEntity, tenantEntity });
  }

  private activate(entity: Entity): void {
    const config = entity.activationConfig;
    if (!config) return;

    for (const effect of config.onActivate) {
      this.applyEffect(entity, effect.componentName, effect.config);
    }
  }

  private deactivate(entity: Entity): void {
    const config = entity.activationConfig;
    if (!config) return;

    for (const effect of config.onDeactivate) {
      this.applyEffect(entity, effect.componentName, effect.config);
    }
  }

  private applyEffect(entity: Entity, componentName: string, config: Record<string, unknown>): void {
    const key = COMPONENT_REGISTRY[componentName];
    if (!key) return;

    const existing = entity[key];
    if (existing && typeof existing === 'object') {
      Object.assign(existing, config);
      this.world.reindex(entity);
    } else {
      this.world.addComponent(entity, key as any, config as any);
    }
  }
}
