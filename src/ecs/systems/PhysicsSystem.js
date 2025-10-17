import { System } from 'ecsy';
import PositionComponent from '../components/PositionComponent';
import WallComponent from '../components/WallComponent';
import PhysicsBodyComponent from '../components/PhysicsBodyComponent';
import RenderableComponent from '../components/RenderableComponent';
import TypeComponent from '../components/TypeComponent';
import TargetingComponent from '../components/TargetingComponent';
import InteractionComponent from '../components/InteractionComponent';
import EntityComponent from '../components/EntityComponent';
import Entities from '../../entities/index.js';


export default class PhysicsSystem extends System {
  constructor(world, attributes) {
    super(world, attributes);
    this.physics = attributes.physics;
    this.scene = this.world.scene;
    this.wallBodies = [];
  }

  init() {
    this.entityGroup = this.physics.add.group();
    this.entityInteractionGroup = this.physics.add.group();
    this.wallGroup = this.physics.add.group({
      immovable: true
    });
    
    this.physics.add.overlap(
      this.entityGroup,
      this.wallGroup,
      this.handleWallAvoidance.bind(this),
      null,
      this
    );
    
    // Hard collider with a bounce factor of 0.2 as a last resort
    this.physics.add.collider(
      this.entityGroup,
      this.wallGroup,
      null,
      null,
      this
    );

    this.physics.add.overlap(
      this.entityInteractionGroup,
      this.entityGroup,
      this.handleInteraction.bind(this),
      null,
      this
    );
  }

  createEntitySpriteGroup(entity) {
    const physicsBody = entity.getComponent(PhysicsBodyComponent);
    const group = this.physics.add.group();
    group.ecsyEntity = entity;
    physicsBody.spriteGroup = group;

    return group;
  }

  createInteractionSprite(entity) {
    const physicsBody = entity.getComponent(PhysicsBodyComponent);
    const position = entity.getComponent(PositionComponent);
    const interaction = entity.getComponent(InteractionComponent);

    const sprite = this.physics.add.sprite(position.x, position.y, 'general');
    sprite.setCircle(interaction.interactionRadius);
    sprite.setDisplayOrigin(interaction.interactionRadius, interaction.interactionRadius);
    sprite.setAlpha(0);

    sprite.ecsyEntity = entity;
    physicsBody.interactionSprite = sprite;
    return sprite;
  }

  createEntitySprite(entity) {
    const position = entity.getComponent(PositionComponent);
    const renderable = entity.getComponent(RenderableComponent);
    const type = entity.getComponent(TypeComponent).type;
    const entityComponent = entity.getComponent(EntityComponent).entity;

    const sprite = this.physics.add.sprite(position.x, position.y, type);
    sprite.ecsyEntity = entity;
    
    // Apply any customizations from the entity definition
    if (renderable.color) {
      sprite.setTint(renderable.color);
    }

    entityComponent.customizeSprite(sprite);
    
    // Store the sprite in the physics component
    const physicsBody = entity.getMutableComponent(PhysicsBodyComponent);
    physicsBody.renderedSprite = sprite;
    
    return sprite;
  }

  handleInteraction(baseBody, targetBody) {
    const base = baseBody.ecsyEntity;
    const target = targetBody.ecsyEntity;

    if (!base ||
        !target ||
        !base.hasComponent(InteractionComponent) ||
        !base.hasComponent(TargetingComponent) ||
        !target.hasComponent(TypeComponent)) {
      return
    }

    if (target === base) { return }

    const interaction = base.getComponent(InteractionComponent);
    const targeting = base.getMutableComponent(TargetingComponent);
    const targetType = target.getComponent(TypeComponent).type;

    if (interaction.interactsWith.includes(targetType) && !targeting.potentialTargets.includes(target)) {
      targeting.potentialTargets.push(target)
    }
  }
  
  // Improved wall avoidance that preserves path following
  handleWallAvoidance(entityBody, wallBody) {
    const entity = entityBody.ecsyEntity;
    const wallEntity = wallBody.ecsyEntity;

    if (!entity || !wallEntity) { return }

    // Do nothing right now
  }

  buildWallEntities(wallEntity, wall) {
    wall.segments.forEach(segment => {
      if (segment === undefined) { return }

      // Process each subsegment (pairs of consecutive points)
      for (let i = 0; i < segment.length - 1; i++) {
        const firstPoint = segment[i];
        const secondPoint = segment[i + 1];
        
        // Calculate segment midpoint and length
        const firstSegmentX = firstPoint.x;
        const firstSegmentY = firstPoint.y;
        const secondSegmentX = secondPoint.x;
        const secondSegmentY = secondPoint.y;
        const midX = (firstSegmentX + secondSegmentX) / 2;
        const midY = (firstSegmentY + secondSegmentY) / 2;
        const length = Math.hypot(secondSegmentX - firstSegmentX, secondSegmentY - firstSegmentY);
        const angle = Math.atan2(secondSegmentY - firstSegmentY, secondSegmentX - firstSegmentX);
        
        // Create a visible wall body
        const wallBody = this.physics.add.sprite(midX, midY, 'wall');
        wallBody.ecsyEntity = wallEntity;
        wallBody.setDisplaySize(length, wall.thickness);
        wallBody.rotation = angle;
        
        // Set the color to match the wall
        wallBody.setTintFill(wall.color);
        
        // Ensure wall is truly immovable
        wallBody.setImmovable(true);
        wallBody.body.moves = false; // This is critical - prevents the physics engine from moving the wall
        
        this.wallGroup.add(wallBody);
        this.wallBodies.push(wallBody);
      }
    });
  }

  execute(delta, time) {
    this.queries.physicsEntities.added.forEach(entity => {
      const spriteGroup = this.createEntitySpriteGroup(entity);
      const entitySprite = this.createEntitySprite(entity);
      spriteGroup.add(entitySprite);
      this.entityGroup.add(entitySprite);

      if (entity.hasComponent(InteractionComponent)) {
        const interactionSprite = this.createInteractionSprite(entity);
        spriteGroup.add(interactionSprite);
        this.entityInteractionGroup.add(interactionSprite);
      }
    });

    this.queries.physicsEntities.removed.forEach(entity => {
      const physicsBody = entity.getComponent(PhysicsBodyComponent);
      if (physicsBody.spriteGroup) {
        physicsBody.spriteGroup.destroy(true);
      }
    });

    // Process walls
    this.queries.walls.added.forEach(wallEntity => {
      const wall = wallEntity.getComponent(WallComponent);
      this.buildWallEntities(wallEntity, wall);
    });
    
    // Clean up removed walls
    this.queries.walls.removed.forEach(wallEntity => {
      // This is simplified - you'd need to track which bodies belong to which wall
      // For now, we'll just rebuild all wall bodies when any wall is removed
      this.wallBodies.forEach(body => body.destroy());
      this.wallBodies = [];
    });

    // Rebuild walls if needed
    if (this.wallBodies.length === 0) {
      this.queries.walls.results.forEach(entity => {
        const wall = entity.getComponent(WallComponent);
        this.buildWallEntities(entity, wall);
      });
    }
  }
}

PhysicsSystem.queries = {
  physicsEntities: {
    components: [PositionComponent, TypeComponent, PhysicsBodyComponent, RenderableComponent],
    listen: {
      added: true,
      removed: true
    }
  },
  walls: {
    components: [WallComponent],
    listen: {
      added: true,
      removed: true
    }
  }
}; 