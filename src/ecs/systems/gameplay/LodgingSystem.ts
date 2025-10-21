import { System } from 'ecsy';
import { ENTITY_CONFIG, PHYSICS_CONFIG } from '@/config';
import { ActivationConfig, Position, Velocity, Path, Lodge, Renderable } from '@/ecs/components';
import { ECSEntity } from '@/types';
import { SpatialGrid, Vector } from '@/utils';
import { gameEvents, GameEventPayloads, GameEvents } from '@/events';

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
    const activationConfig = entity.getComponent(ActivationConfig);
    if (!activationConfig) return;

    activationConfig.onDeactivate.forEach(addition => {
      this.addOrUpdateComponent(entity, addition.component, addition.config);
    });
  }

  private addOrUpdateComponent(entity: ECSEntity, ComponentClass: any, config: any) {
    console.log('Adding or updating component', ComponentClass, config);
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

