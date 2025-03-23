export default class BaseInteraction {
  constructor(params) {
    this.distance = params.distance || 20;
    this.force = typeof(params.force) === "number" ? params.force : 0.25;
    this.params = params;
  }

  apply(entityBody, entity, interactedWithEntityBody, interactedWithEntity, world, tileSize) {
    console.warn('BaseInteraction.apply() must be implemented');
  }
}