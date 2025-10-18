declare module 'ecsy' {
  export class World {
    constructor();
    registerComponent(component: typeof Component, objectPool?: boolean): this;
    registerSystem(system: typeof System, attributes?: any): this;
    createEntity(name?: string): Entity;
    execute(delta?: number, time?: number): void;
    stop(): void;
    play(): void;
    getSystem<T extends System>(systemClass: new (...args: any[]) => T): T;
    entityRemoved(entity: Entity): void;
  }

  export class Entity {
    id: number;
    alive: boolean;
    addComponent<T extends Component>(
      component: ComponentConstructor<T>,
      values?: Partial<T>
    ): this;
    removeComponent<T extends Component>(
      component: ComponentConstructor<T>,
      forceRemove?: boolean
    ): this;
    hasComponent<T extends Component>(component: ComponentConstructor<T>): boolean;
    hasRemovedComponent<T extends Component>(component: ComponentConstructor<T>): boolean;
    hasAllComponents(components: Array<ComponentConstructor<any>>): boolean;
    hasAnyComponents(components: Array<ComponentConstructor<any>>): boolean;
    getComponent<T extends Component>(component: ComponentConstructor<T>): T;
    getMutableComponent<T extends Component>(component: ComponentConstructor<T>): T;
    remove(forceRemove?: boolean): void;
  }

  export class Component<T = any> {
    static isComponent: true;
    static schema?: any;
    reset?(): void;
    copy?(source: this): this;
  }

  export type ComponentConstructor<T extends Component = Component> = new () => T;

  export abstract class System {
    world: World;
    queries: Record<string, Query>;
    enabled: boolean;
    priority: number;
    executeTime: number;

    constructor(world: World, attributes?: any);

    init?(attributes?: any): void;
    execute?(delta?: number, time?: number): void;
    stop?(): void;
    play?(): void;

    static queries?: Record<string, QueryDefinition>;
  }

  export interface Query {
    results: Entity[];
    added?: Entity[];
    removed?: Entity[];
    changed?: Entity[];
  }

  export interface QueryDefinition {
    components: Array<ComponentConstructor<any>>;
    listen?: {
      added?: boolean;
      removed?: boolean;
      changed?: boolean | Array<ComponentConstructor<any>>;
    };
  }

  export class TagComponent extends Component {
    constructor();
  }

  export class SystemStateComponent extends Component {}

  export function Not<T extends Component>(
    component: ComponentConstructor<T>
  ): ComponentConstructor<T>;

  export namespace Types {
    export const Number: any;
    export const String: any;
    export const Boolean: any;
    export const Array: any;
    export const Ref: any;
    export const JSON: any;
  }
}
