import { System } from 'ecsy';
import { ENTITY_CONFIG, PHYSICS_CONFIG } from '@/config';
import { ActivationConfig, Position, Velocity, Path, Lodge, Renderable } from '@/ecs/components';
import { ECSEntity } from '@/types';
import { SpatialGrid, Vector } from '@/utils';
import { gameEvents, GameEventPayloads, GameEvents } from '@/events';
import { FleeingToGoalTag } from '@/ecs/components/tags';

export class LodgingSystem extends System {
  private spatialGrid!: SpatialGrid;

  constructor(world: any, attributes?: any) {
    super(world, attributes);
    if (attributes?.spatialGrid) {
      this.spatialGrid = attributes.spatialGrid;
    }

    gameEvents.on(GameEvents.TENANT_ADDED_TO_LODGE, this.handleTenantAdded.bind(this));
    gameEvents.on(GameEvents.TENANT_REMOVED_FROM_LODGE, this.handleTenantRemoved.bind(this));
  }

  execute(delta?: number): void {
    this.queries.lodges.results.forEach(lodgeEntity => {
      const lodge = lodgeEntity.getComponent(Lodge);
      const renderable = lodgeEntity.getComponent(Renderable);
      
      // Debug: check if any tenants have become invalid
      if (lodge && lodge.tenants.length > 0) {
        const aliveTenants = lodge.tenants.filter(t => t.alive);
        if (aliveTenants.length !== lodge.tenants.length) {
          console.log('🔴 DEAD TENANTS DETECTED!', {
            lodgeId: lodgeEntity.id,
            lodgeType: renderable?.type,
            totalTenants: lodge.tenants.length,
            aliveTenants: aliveTenants.length,
            deadCount: lodge.tenants.length - aliveTenants.length
          });
        }
      }
      
      this.addNewTenants(lodgeEntity);
    });
  }

  addNewTenants(lodgeEntity: ECSEntity) {
    const lodge = <Lodge>lodgeEntity.getMutableComponent(Lodge)!;
    const lodgePos = lodgeEntity.getComponent(Position)!;
    
    // Only look for new tenants if there's room
    if (lodge.tenants.length < lodge.maxTenants) {
      const nearbyEntities = this.spatialGrid.getNearby(
        lodgePos.x,
        lodgePos.y,
        PHYSICS_CONFIG.PATH_ARRIVAL_THRESHOLD
      );

      nearbyEntities.forEach(entity => {
        if (lodge.tenants.length >= lodge.maxTenants) return;
        if (entity === lodgeEntity) return;
        if (!this.canLodge(entity, lodge.allowedTenants)) return;

        // Verify exact distance (spatial grid returns candidates within cell radius)
        const entityPos = entity.getComponent(Position);
        if (!entityPos) return;

        const dx = entityPos.x - lodgePos.x;
        const dy = entityPos.y - lodgePos.y;
        const distance = Vector.length(dx, dy);

        if (distance <= PHYSICS_CONFIG.PATH_ARRIVAL_THRESHOLD) {
          this.addTenantToLodge(lodgeEntity, entity);
        }
      });
    }
  }

  canLodge(entity: ECSEntity, allowedTenants: readonly string[]): boolean {
    const renderable = entity.getComponent(Renderable);
    if (!renderable) return false;
    
    // Don't allow lodging if entity is fleeing to goal
    if (entity.hasComponent(FleeingToGoalTag)) return false;
    
    return allowedTenants.includes(renderable.type);
  }

  handleTenantAdded(event: GameEventPayloads[GameEvents.TENANT_ADDED_TO_LODGE]): void {
    const { lodgeEntity, tenantEntity } = event;

    tenantEntity.removeComponent(Position);
    tenantEntity.removeComponent(Velocity);
    tenantEntity.removeComponent(Path);


    const lodge = <Lodge>lodgeEntity.getMutableComponent(Lodge)!;
    if (lodge.tenants.length >= lodge.maxTenants) {
      this.activate(lodgeEntity);
    }
  }

  handleTenantRemoved(event: GameEventPayloads[GameEvents.TENANT_REMOVED_FROM_LODGE]): void {
    const { lodgeEntity, tenantEntity } = event;

    console.log('🔴 TENANT_REMOVED_FROM_LODGE event received', {
      lodgeId: lodgeEntity.id,
      tenantId: tenantEntity.id,
      tenantAlive: tenantEntity.alive
    });

    const tenantRenderable = tenantEntity.getMutableComponent(Renderable);
    const lodgePos = lodgeEntity.getComponent(Position)!;
    // Move it 1px to the right so that we don't path to the same lodge
    tenantEntity.addComponent(Position, { x: lodgePos.x + 1, y: lodgePos.y });
    tenantEntity.addComponent(Velocity, { vx: 0, vy: 0 });
    tenantEntity.addComponent(Path, {
      currentPath: [],
      nextPath: [],
      direction: ENTITY_CONFIG[tenantRenderable.type as keyof typeof ENTITY_CONFIG].direction!
    });

    const lodge = <Lodge>lodgeEntity.getMutableComponent(Lodge)!;
    if (lodge.tenants.length < lodge.maxTenants) {
      this.deactivate(lodgeEntity);
    }
  }

  addTenantToLodge(lodgeEntity: ECSEntity, tenantEntity: ECSEntity): void {
    const lodge = lodgeEntity.getMutableComponent(Lodge)!;
    const tenant = tenantEntity.getComponent(Renderable)!;
    lodge.tenants.push(tenantEntity);

    gameEvents.emit(GameEvents.TENANT_ADDED_TO_LODGE, { lodgeEntity, tenantEntity });
  }

  private activate(entity: ECSEntity): void {
    const activationConfig = entity.getComponent(ActivationConfig);
    if (!activationConfig) return;

    activationConfig.onActivate.forEach(addition => {
      this.addOrUpdateComponent(entity, addition.component, addition.config);
    });
  }

  private deactivate(entity: ECSEntity): void {
    console.log('🔴 DEACTIVATE CALLED', {
      entityId: entity.id,
      entityType: entity.getComponent(Renderable)?.type,
      stackTrace: new Error().stack
    });
    
    const activationConfig = entity.getComponent(ActivationConfig);
    if (!activationConfig) return;

    activationConfig.onDeactivate.forEach(addition => {
      this.addOrUpdateComponent(entity, addition.component, addition.config);
    });
  }

  private addOrUpdateComponent(entity: ECSEntity, ComponentClass: any, config: any) {
    if (entity.hasComponent(ComponentClass)) {
      const component = entity.getMutableComponent(ComponentClass)!;
      Object.assign(component, config);
    } else {
      entity.addComponent(ComponentClass, config);
    }
  }

  static queries = {
    lodges: {
      components: [Lodge, Position]
    }
  };
}

