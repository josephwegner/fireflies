import { System } from 'ecsy';
import PositionComponent from '../components/PositionComponent';
import VelocityComponent from '../components/VelocityComponent';
import WallComponent from '../components/WallComponent';
import PhysicsBodyComponent from '../components/PhysicsBodyComponent';
import PathComponent from '../components/PathComponent';

export default class PhysicsSystem extends System {
  constructor(world, attributes) {
    super(world, attributes);
    this.physics = attributes.physics;
    this.tileSize = attributes.tileSize;
    this.wallBodies = [];
    this.avoidanceDistance = 20; // Distance to start avoiding walls
    this.avoidanceForce = 0.25;   // Significantly stronger avoidance force
  }

  init() {
    // Set up physics groups
    this.entityGroup = this.physics.add.group();
    this.wallGroup = this.physics.add.group({
      immovable: true
    });
    
    // Use overlap for wall avoidance
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
  }
  
  // Improved wall avoidance that preserves path following
  handleWallAvoidance(entityBody, wallBody) {
    const entity = entityBody.ecsyEntity;
    if (!entity) return;
    
    const velocity = entity.getMutableComponent(VelocityComponent);
    const entityPos = entity.getComponent(PositionComponent);
    
    // Get the entity's position
    const entityX = (entityPos.x.toFixed(2) * this.tileSize) + this.tileSize / 2;
    const entityY = (entityPos.y.toFixed(2) * this.tileSize) + this.tileSize / 2;
    
    // Calculate the vector from wall to entity
    const dx = entityX - wallBody.x;
    const dy = entityY - wallBody.y;
    
    // Get the wall's normal vector (perpendicular to wall)
    const wallNormalX = Math.sin(wallBody.rotation); // Perpendicular to wall direction
    const wallNormalY = -Math.cos(wallBody.rotation);
    
    // Calculate the projection of entity-wall vector onto wall normal
    const projection = dx * wallNormalX + dy * wallNormalY;
    
    // The true distance to the wall is the absolute value of this projection
    const trueDistance = Math.abs(projection);

    // Apply avoidance force if close enough
    if (trueDistance < this.avoidanceDistance) {
      // Direction away from wall (along the normal)
      const dirX = Math.sign(projection) * wallNormalX;
      const dirY = Math.sign(projection) * wallNormalY;
      
      // Force magnitude based on distance
      const forceMagnitude = this.avoidanceForce * 
        Math.pow(1 - trueDistance / this.avoidanceDistance, 2);
      
      // Apply force
      entityBody.body.velocity.x += dirX * forceMagnitude;
      entityBody.body.velocity.y += dirY * forceMagnitude;
      
      // Update velocity component
      velocity.vx = entityBody.body.velocity.x;
      velocity.vy = entityBody.body.velocity.y;
    }
  }

  buildWallEntities(wall) {
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
        
        // Create a physics body for this subsegment
        const wallBody = this.physics.add.sprite(midX, midY, 'wall');
        wallBody.setAlpha(0); // Make invisible (we'll render separately)
        //wallBody.setAlpha(1); wallBody.setTintFill(0xFFFFFF);
        
        // Ensure wall is truly immovable
        wallBody.setImmovable(true);
        wallBody.body.moves = false; // This is critical - prevents the physics engine from moving the wall
        
        wallBody.setDisplaySize(length, wall.thickness);
        wallBody.rotation = angle;
        
        this.wallGroup.add(wallBody);
        this.wallBodies.push(wallBody);
      }
    });
  }

  execute(delta, time) {
    // Process entities that need physics bodies
    this.queries.physicsEntities.added.forEach(entity => {
      const position = entity.getComponent(PositionComponent);
      
      // Create a Phaser physics sprite at the entity's position
      const physicsBody = this.physics.add.sprite(
        (position.x * this.tileSize) + this.tileSize - 5,
        (position.y * this.tileSize) + this.tileSize - 5,
        'particle');
      physicsBody.setCircle(5); // Set collision radius
      physicsBody.setAlpha(0);
      
      // Store reference to the ECSY entity
      physicsBody.ecsyEntity = entity;
      
      // Add to entity group
      this.entityGroup.add(physicsBody);
      
      // Store the physics body in a component
      entity.addComponent(PhysicsBodyComponent, { body: physicsBody });
    });
    
    // Process walls that need physics bodies
    this.queries.walls.added.forEach(wallEntity => {
      const wall = wallEntity.getComponent(WallComponent);
      this.buildWallEntities(wall)
    });
    
    // Clean up removed entities
    this.queries.physicsEntities.removed.forEach(entity => {
      const physicsComponent = entity.getComponent(PhysicsBodyComponent);
      if (physicsComponent && physicsComponent.body) {
        physicsComponent.body.destroy();
      }
    });
    
    // Clean up removed walls
    this.queries.walls.removed.forEach(wallEntity => {
      // This is simplified - you'd need to track which bodies belong to which wall
      // For now, we'll just rebuild all wall bodies when any wall is removed
      this.wallBodies.forEach(body => body.destroy());
      this.wallBodies = [];
    });
    
    // Update entity positions based on their physics bodies
    this.queries.physicsEntities.results.forEach(entity => {
      const position = entity.getMutableComponent(PositionComponent);
      const velocity = entity.getMutableComponent(VelocityComponent);
      const physicsComponent = entity.getComponent(PhysicsBodyComponent);
      
      if (physicsComponent && physicsComponent.body) {
        const body = physicsComponent.body;
        
        // Update physics body position from entity position
        body.setPosition(
          (position.x * this.tileSize) + this.tileSize - 5,
          (position.y * this.tileSize) + this.tileSize - 5
        );
        
        // Apply a maximum velocity to prevent extreme speeds
        const maxSpeed = 2.0;
        const currentSpeed = Math.hypot(body.body.velocity.x, body.body.velocity.y);
        if (currentSpeed > maxSpeed) {
          const scale = maxSpeed / currentSpeed;
          body.body.velocity.x *= scale;
          body.body.velocity.y *= scale;
        }
        
        // Set a small drag to prevent perpetual bouncing
        body.body.setDamping(true);
        body.body.setDrag(0.05);
        
        // After physics update, sync back to entity components
        position.x = (body.x - this.tileSize + 5) / this.tileSize;
        position.y = (body.y - this.tileSize + 5) / this.tileSize;
        velocity.vx = body.body.velocity.x;
        velocity.vy = body.body.velocity.y;
      }
    });

    if (this.wallBodies.length === 0) {
      this.queries.walls.results.forEach(entity => {
        const wall = entity.getComponent(WallComponent)
        this.buildWallEntities(wall)
      })
    }
  }
}

PhysicsSystem.queries = {
  physicsEntities: {
    components: [PositionComponent, VelocityComponent],
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