import type { Query, With } from 'miniplex';
import type { Entity, GameWorld, BuildSite } from '@/ecs/Entity';
import type { GameSystem } from '@/ecs/GameSystem';
import { PHYSICS_CONFIG } from '@/config';
import { gameEvents, GameEvents } from '@/events';
import { clearPath } from '@/utils';

type BuildableEntity = With<Entity, 'buildable'>;

export class BuildingSystem implements GameSystem {
  private buildables: Query<BuildableEntity>;
  private movers: Query<With<Entity, 'position' | 'velocity' | 'path'>>;
  private recruitingFor = new Set<number>();

  constructor(private world: GameWorld, _config: Record<string, any>) {
    this.buildables = world.with('buildable');
    this.movers = world.with('position', 'velocity', 'path');
  }

  destroy(): void {
    this.recruitingFor.clear();
  }

  update(delta: number, _time: number): void {
    for (const entity of this.buildables) {
      if (entity.buildable.allBuilt) continue;

      this.cleanDeadBuilders(entity);
      this.tickBuild(entity, delta);
      this.recruit(entity);
    }
  }

  private cleanDeadBuilders(entity: BuildableEntity): void {
    for (const site of entity.buildable.sites) {
      if (!site.builderEntity) continue;
      if (!this.world.has(site.builderEntity) || site.builderEntity.health?.isDead) {
        site.builderEntity = undefined;
        const entityId = this.world.id(entity);
        if (entityId !== undefined) this.recruitingFor.delete(entityId);
      }
    }
  }

  private tickBuild(entity: BuildableEntity, delta: number): void {
    const { buildable } = entity;
    let siteJustCompleted = false;
    let completedSiteIndex = -1;

    for (let i = 0; i < buildable.sites.length; i++) {
      const site = buildable.sites[i];
      if (site.built || !site.builderEntity) continue;

      const builder = site.builderEntity;
      if (!builder.position) continue;

      const dx = builder.position.x - site.x;
      const dy = builder.position.y - site.y;
      const dist = Math.hypot(dx, dy);

      if (dist > PHYSICS_CONFIG.BUILD_SITE_RADIUS) continue;

      // Signal to DestinationSystem: stop re-navigating this entity
      if (builder.assignedDestination && !builder.assignedDestination.holding) {
        builder.assignedDestination.holding = true;
      }

      site.buildProgress += delta / (buildable.buildTime * 1000);

      if (site.buildProgress >= 1) {
        site.built = true;
        siteJustCompleted = true;
        completedSiteIndex = i;

        gameEvents.emit(GameEvents.BUILD_SITE_COMPLETED, { entity, siteIndex: i });
      }
    }

    // Check full completion
    if (buildable.sites.every(s => s.built)) {
      buildable.allBuilt = true;
      gameEvents.emit(GameEvents.BUILD_COMPLETE, { entity });
      // Release all builders
      for (const site of buildable.sites) {
        if (site.builderEntity) {
          this.releaseBuilder(site.builderEntity);
          site.builderEntity = undefined;
        }
      }
      return;
    }

    // Sequential handoff: if a site just completed, move the builder to the next unbuilt site
    if (siteJustCompleted && completedSiteIndex >= 0) {
      const completedSite = buildable.sites[completedSiteIndex];
      const builder = completedSite.builderEntity;
      if (builder) {
        const nextUnbuilt = buildable.sites.find(s => !s.built && !s.builderEntity);
        if (nextUnbuilt) {
          completedSite.builderEntity = undefined;
          nextUnbuilt.builderEntity = builder;
          // Update assignment to point to next site and unhold so DestinationSystem re-navigates
          if (builder.assignedDestination) {
            builder.assignedDestination.targetPosition = { x: nextUnbuilt.x, y: nextUnbuilt.y };
            builder.assignedDestination.holding = false;
          }
          // Clear path so destination system re-navigates
          clearPath(builder);
        } else {
          // No more sites to build, release
          this.releaseBuilder(builder);
          completedSite.builderEntity = undefined;
        }
      }
    }
  }

  private recruit(entity: BuildableEntity): void {
    const entityId = this.world.id(entity);
    if (entityId === undefined) return;

    // Don't re-recruit if we already have builders for all unbuilt sites
    const unassignedSites = entity.buildable.sites.filter(s => !s.built && !s.builderEntity);
    if (unassignedSites.length === 0) return;
    if (this.recruitingFor.has(entityId)) return;

    const candidates = this.getAvailableFireflies();
    if (candidates.length === 0) return;

    this.recruitingFor.add(entityId);

    if (unassignedSites.length >= 2) {
      this.recruitForMultipleSites(entity, unassignedSites, candidates);
    } else {
      this.recruitForSingleSite(entity, unassignedSites[0], candidates);
    }
  }

  private recruitForMultipleSites(
    entity: BuildableEntity,
    sites: BuildSite[],
    candidates: Entity[]
  ): void {
    const site0 = sites[0];
    const site1 = sites[1];

    // Find best candidate for each site (Manhattan distance)
    let bestForSite0: { entity: Entity; dist: number } | null = null;
    let bestForSite1: { entity: Entity; dist: number } | null = null;

    for (const c of candidates) {
      const dist0 = Math.abs(c.position!.x - site0.x) + Math.abs(c.position!.y - site0.y);
      const dist1 = Math.abs(c.position!.x - site1.x) + Math.abs(c.position!.y - site1.y);

      if (!bestForSite0 || dist0 < bestForSite0.dist) {
        bestForSite0 = { entity: c, dist: dist0 };
      }
      if (!bestForSite1 || dist1 < bestForSite1.dist) {
        bestForSite1 = { entity: c, dist: dist1 };
      }
    }

    if (!bestForSite0) return;

    const interSiteDist = Math.abs(site0.x - site1.x) + Math.abs(site0.y - site1.y);
    const seqCost = bestForSite0.dist + interSiteDist;
    const parCost = Math.max(bestForSite0.dist, bestForSite1?.dist ?? Infinity);

    if (seqCost < parCost * 1.3 || candidates.length < 2) {
      // Sequential: send one firefly to site0 first
      this.assignBuilder(entity, site0, bestForSite0.entity);
    } else {
      // Parallel: send two fireflies
      this.assignBuilder(entity, site0, bestForSite0.entity);
      // Find a different candidate for site1
      const remaining = candidates.filter(c => c !== bestForSite0!.entity);
      if (remaining.length > 0) {
        let best1: { entity: Entity; dist: number } | null = null;
        for (const c of remaining) {
          const dist = Math.abs(c.position!.x - site1.x) + Math.abs(c.position!.y - site1.y);
          if (!best1 || dist < best1.dist) {
            best1 = { entity: c, dist };
          }
        }
        if (best1) {
          this.assignBuilder(entity, site1, best1.entity);
        }
      }
    }
  }

  private recruitForSingleSite(
    entity: BuildableEntity,
    site: BuildSite,
    candidates: Entity[]
  ): void {
    let best: { entity: Entity; dist: number } | null = null;
    for (const c of candidates) {
      const dist = Math.abs(c.position!.x - site.x) + Math.abs(c.position!.y - site.y);
      if (!best || dist < best.dist) {
        best = { entity: c, dist };
      }
    }
    if (best) {
      this.assignBuilder(entity, site, best.entity);
    }
  }

  private assignBuilder(buildableEntity: Entity, site: BuildSite, builder: Entity): void {
    site.builderEntity = builder;
    this.world.addComponent(builder, 'assignedDestination', {
      target: buildableEntity,
      targetPosition: { x: site.x, y: site.y }
    });
    // Clear path so destination system navigates to site
    clearPath(builder);
  }

  private releaseBuilder(builder: Entity): void {
    if (!this.world.has(builder)) return;
    if (builder.assignedDestination) {
      this.world.removeComponent(builder, 'assignedDestination');
    }
    clearPath(builder);
  }

  private getAvailableFireflies(): Entity[] {
    const result: Entity[] = [];
    for (const mover of this.movers) {
      if (mover.team !== 'firefly') continue;
      if (mover.assignedDestination) continue;
      if (mover.fleeingToGoalTag) continue;
      result.push(mover);
    }
    return result;
  }
}
