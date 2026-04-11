import { System } from 'ecsy';
import { FireflyGoal, Renderable, Position, FireflyTag, GoalTag, Destination, Path } from '@/ecs/components';
import { gameEvents, GameEvents } from '@/events';
import { GAME_CONFIG } from '@/config';
import { ECSEntity } from '@/types';

export class FireflyGoalSystem extends System {
  private processedFireflies = new Set<number>();
  private lastLoggedCount = -1;
  private debugLogInterval = 0;

  init(): void {
    console.log('[FireflyGoalSystem] Initializing...');
    // Listen for entities completing their paths (as fallback)
    gameEvents.on(GameEvents.PATH_COMPLETED, (data: any) => {
      console.log(`[FireflyGoalSystem] PATH_COMPLETED event fired for entity ${data.entity.id}`);
      this.handlePathCompleted(data);
    });
    console.log('[FireflyGoalSystem] Registered PATH_COMPLETED listener');
  }

  execute(): void {
    // Log every 60 frames (about 1 second at 60fps)
    this.debugLogInterval++;
    
    // Check for fireflies near the goal
    this.checkFirefliesNearGoal();
    
    // Update glow on all firefly goals based on current count
    this.queries.fireflyGoals.results.forEach(goalEntity => {
      const fireflyGoal = goalEntity.getComponent(FireflyGoal)!;
      const renderable = goalEntity.getMutableComponent(Renderable)!;
      
      if (this.debugLogInterval % 60 === 0) {
        console.log(`[FireflyGoalSystem] Goal found. Current count: ${fireflyGoal.currentCount}, Glow color: 0x${renderable.glow?.color?.toString(16).padStart(6, '0') || 'none'}, Glow radius: ${renderable.glow?.radius}`);
        
        // Debug: count fireflies still in scene
        const fireflyCount = (this.world.entityManager as any)._entities.filter((e: any) => e.alive && e.hasComponent(FireflyTag)).length;
        console.log(`[FireflyGoalSystem] Fireflies in scene: ${fireflyCount}`);
      }
      
      // Log when count changes for debugging
      if (fireflyGoal.currentCount !== this.lastLoggedCount) {
        console.log(`[FireflyGoalSystem] *** FIREFLY COUNT CHANGED *** Current: ${fireflyGoal.currentCount}/${GAME_CONFIG.FIREFLIES_TO_WIN}`);
        this.lastLoggedCount = fireflyGoal.currentCount;
      }
      
      this.updateGoalGlow(renderable, fireflyGoal.currentCount);
    });
    
    if (this.queries.fireflyGoals.results.length === 0 && this.debugLogInterval % 300 === 0) {
      console.warn('[FireflyGoalSystem] No firefly goals found in scene!');
    }
  }

  private checkFirefliesNearGoal(): void {
    const goalEntity = this.queries.fireflyGoals.results[0];
    if (!goalEntity) return;
    
    const goalPosition = goalEntity.getComponent(Position)!;
    
    // Get all fireflies in the scene
    const fireflyEntities = (this.world.entityManager as any)._entities.filter((e: any) => 
      e.alive && e.hasComponent(FireflyTag) && !this.processedFireflies.has(e.id)
    );
    
    fireflyEntities.forEach((fireflyEntity: any) => {
      const fireflyPosition = fireflyEntity.getComponent(Position);
      if (!fireflyPosition) return;
      
      // Check distance to goal
      const dx = fireflyPosition.x - goalPosition.x;
      const dy = fireflyPosition.y - goalPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // If firefly is near the goal, count it
      if (distance < 50) {
        const goalComponent = goalEntity.getMutableComponent(FireflyGoal)!;
        goalComponent.currentCount++;
        
        // Mark as processed
        this.processedFireflies.add(fireflyEntity.id);
        
        console.log(`[FireflyGoalSystem] *** FIREFLY REACHED GOAL *** Count: ${goalComponent.currentCount}/${GAME_CONFIG.FIREFLIES_TO_WIN}`);
        
        // Remove the firefly so it doesn't get counted again
        // Remove components so DestinationSystem stops trying to path it
        if (fireflyEntity.hasComponent(Destination)) {
          fireflyEntity.removeComponent(Destination);
        }
        if (fireflyEntity.hasComponent(Path)) {
          fireflyEntity.removeComponent(Path);
        }
        if (fireflyEntity.hasComponent(Renderable)) {
          fireflyEntity.removeComponent(Renderable);
        }
        
        // Check victory condition
        if (goalComponent.currentCount >= GAME_CONFIG.FIREFLIES_TO_WIN) {
          console.log('[FireflyGoalSystem] *** VICTORY! All fireflies collected! ***');
        }
      }
    });
  }

  private handlePathCompleted = (data: { entity: ECSEntity; position: { x: number; y: number } }): void => {
    const { entity, position } = data;

    // Check if this is a firefly
    if (!entity.hasComponent(FireflyTag)) {
      console.log(`[FireflyGoalSystem] PATH_COMPLETED: Entity ${entity.id} is not a firefly`);
      return;
    }

    console.log(`[FireflyGoalSystem] PATH_COMPLETED: Firefly ${entity.id} reached position (${position.x.toFixed(0)}, ${position.y.toFixed(0)})`);

    // Prevent double-counting the same firefly
    if (this.processedFireflies.has(entity.id)) {
      console.log(`[FireflyGoalSystem] Firefly ${entity.id} already processed, skipping`);
      return;
    }

    // Find the firefly goal
    const fireflyGoal = this.queries.fireflyGoals.results[0];
    if (!fireflyGoal) {
      console.warn('[FireflyGoalSystem] No firefly goal found!');
      return;
    }

    const goalPosition = fireflyGoal.getComponent(Position)!;
    
    // Check if firefly is near the goal (within threshold)
    const dx = position.x - goalPosition.x;
    const dy = position.y - goalPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    console.log(`[FireflyGoalSystem] Distance from goal: ${distance.toFixed(1)} (threshold: 50)`);
    
    // If firefly reached the goal, increment count
    if (distance < 50) {
      const goalComponent = fireflyGoal.getMutableComponent(FireflyGoal)!;
      goalComponent.currentCount++;
      
      // Mark this firefly as processed
      this.processedFireflies.add(entity.id);
      
      // Remove renderable so it's no longer visible
      entity.removeComponent(Renderable);

      if (entity.hasComponent(Trail)) {
        const trail = entity.getMutableComponent(Trail)!;
        trail.enabled = false;
      }
      
      console.log(`[FireflyGoalSystem] *** FIREFLY COLLECTED *** Count: ${goalComponent.currentCount}/${GAME_CONFIG.FIREFLIES_TO_WIN}`);
      
      // Check victory condition
      if (goalComponent.currentCount >= GAME_CONFIG.FIREFLIES_TO_WIN) {
        console.log('[FireflyGoalSystem] *** VICTORY! All fireflies collected! ***');
      }
    } else {
      console.log(`[FireflyGoalSystem] Firefly too far from goal (distance: ${distance.toFixed(1)})`);
    }
  };

  private updateGoalGlow(renderable: Renderable, currentCount: number): void {
    if (!renderable.glow) {
      console.warn('[FireflyGoalSystem] Goal renderable does not have glow configured');
      return;
    }

    const glowConfig = GAME_CONFIG.FIREFLY_GOAL_GLOW;
    const progress = Math.min(currentCount / GAME_CONFIG.FIREFLIES_TO_WIN, 1);
    
    // Use a step function (cubic easing) for smoother visual progression
    const easedProgress = this.easeInOutCubic(progress);
    
    // Interpolate color from start to end using config values
    const startR = (glowConfig.startColor >> 16) & 0xFF;
    const startG = (glowConfig.startColor >> 8) & 0xFF;
    const startB = glowConfig.startColor & 0xFF;
    
    const endR = (glowConfig.endColor >> 16) & 0xFF;
    const endG = (glowConfig.endColor >> 8) & 0xFF;
    const endB = glowConfig.endColor & 0xFF;
    
    const r = Math.round(startR + (endR - startR) * easedProgress);
    const g = Math.round(startG + (endG - startG) * easedProgress);
    const b = Math.round(startB + (endB - startB) * easedProgress);
    
    const color = (r << 16) | (g << 8) | b;
    
    // Interpolate radius using config values
    const radius = glowConfig.minRadius + (glowConfig.maxRadius - glowConfig.minRadius) * easedProgress;
    
    // Interpolate intensity using config values
    const intensity = glowConfig.minIntensity + (glowConfig.maxIntensity - glowConfig.minIntensity) * easedProgress;
    
    // Update the glow properties
    const oldColor = renderable.glow.color;
    const oldRadius = renderable.glow.radius;
    const oldIntensity = renderable.glow.intensity;
    
    renderable.glow.color = color;
    renderable.glow.radius = radius;
    renderable.glow.intensity = intensity;
    
    // Log when properties change for debugging
    if (oldColor !== color || oldRadius !== radius || oldIntensity !== intensity) {
      console.log(`[FireflyGoalSystem] Updated glow - color: 0x${color.toString(16).padStart(6, '0')}, radius: ${radius.toFixed(1)}, intensity: ${intensity.toFixed(2)}`);
    }
  }

  // Smooth cubic easing function for more gradual transitions
  private easeInOutCubic(t: number): number {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  static queries = {
    fireflyGoals: {
      components: [FireflyGoal, Renderable, Position, GoalTag]
    }
  };
}

