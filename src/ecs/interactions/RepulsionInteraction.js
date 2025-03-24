import BaseInteraction from './BaseInteraction';
import PositionComponent from '../components/PositionComponent';
import VelocityComponent from '../components/VelocityComponent';
import PhysicsBodyComponent from '../components/PhysicsBodyComponent';
import WallComponent from '../components/WallComponent';

export default class RepulsionInteraction extends BaseInteraction {
  constructor(params = {}) {
    super({
      distance: 10,
      force: 25,
      ...params,
    });
  }

  apply(entityBody, entity, interactedWithEntityBody, interactedWithEntity, world, tileSize) {
    if (!interactedWithEntity.hasComponent(PositionComponent) ||
        !interactedWithEntity.hasComponent(VelocityComponent) ||
        !interactedWithEntity.hasComponent(PhysicsBodyComponent)) {
      return;
    }

    const velocity = interactedWithEntity.getMutableComponent(VelocityComponent);;
    
    const dx = interactedWithEntityBody.x - entityBody.x - 10 // 10 is a magic number to account for the offset of the physics body (circle radius)
    const dy = interactedWithEntityBody.y - entityBody.y - 10

    // For walls, use normal vector (this is the default)
    let dirX = dx;
    let dirY = dy;

    if (entity.hasComponent(WallComponent)) {
      const wallNormalX = Math.sin(entityBody.rotation);
      const wallNormalY = -Math.cos(entityBody.rotation);

      const projection = dx * wallNormalX + dy * wallNormalY;

      dirX = Math.sign(projection) * wallNormalX;
      dirY = Math.sign(projection) * wallNormalY;

      const distance = Math.abs(projection);

      if (distance < this.distance) {
        // Log the angle of repulsion
        const forceMagnitude = (this.force / 10000) * Math.pow(1 - (distance / this.distance * tileSize), 2);

        velocity.vx += dirX * forceMagnitude;
        velocity.vy += dirY * forceMagnitude;
      }
    } else {
      // For non-wall entities, use direct vector
      const distance = Math.hypot(dx, dy);

      if (distance > 0 && distance < this.distance) {
        dirX = dx / distance;
        dirY = dy / distance;

        const forceMagnitude = this.force * Math.pow(1 - distance / this.distance, 2);

        interactedWithEntityBody.body.velocity.x += dirX * forceMagnitude;
        interactedWithEntityBody.body.velocity.y += dirY * forceMagnitude;

        velocity.vx = interactedWithEntityBody.body.velocity.x;
        velocity.vy = interactedWithEntityBody.body.velocity.y;
      }
    }
  }
}
