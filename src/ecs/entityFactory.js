import PositionComponent from './components/PositionComponent';
import VelocityComponent from './components/VelocityComponent';
import PathComponent from './components/PathComponent';
import RenderableComponent from './components/RenderableComponent';
import TypeComponent from './components/TypeComponent';
import InteractionComponent from './components/InteractionComponent';

// Factory functions for creating game entities
export function createFirefly(world, x, y, color = 0xff0000, radius = 5) {
  const JITTER = 0.3;
  const firefly = world.createEntity()
    .addComponent(PositionComponent, { x: x + Math.random() * JITTER, y: y + Math.random() * JITTER })
    .addComponent(VelocityComponent, { vx: 0, vy: 0 })
    .addComponent(PathComponent, { path: [] })
    .addComponent(RenderableComponent, { type: 'firefly', color, radius })
    .addComponent(TypeComponent, { type: 'firefly' })
  
  return firefly;
}

export function createDestination(world, x, y, color = 0x0000ff, radius = 5) {
  const destination = world.createEntity()
    .addComponent(PositionComponent, { x, y })
    .addComponent(RenderableComponent, { type: 'wisp', color, radius })
    .addComponent(TypeComponent, { type: 'wisp' })
  
  return destination;
}