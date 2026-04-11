import { gameEvents, GameEvents } from '@/events';

export class EnergyManager {
  private energy: number;

  constructor(initialEnergy: number) {
    this.energy = initialEnergy;
  }

  getEnergy(): number {
    return this.energy;
  }

  canAfford(cost: number): boolean {
    return this.energy >= cost;
  }

  spend(cost: number): boolean {
    if (!this.canAfford(cost)) return false;

    this.energy -= cost;
    gameEvents.emit(GameEvents.ENERGY_CHANGED, { current: this.energy });
    return true;
  }
}
