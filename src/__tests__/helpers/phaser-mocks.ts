import { vi } from 'vitest';

/**
 * Create a mock Phaser container with common methods
 */
export function createMockContainer() {
  const container = {
    list: [] as any[],
    setPosition: vi.fn().mockReturnThis(),
    setScale: vi.fn().mockReturnThis(),
    setRotation: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
    addAt: vi.fn()
  };

  container.add.mockImplementation((child: any) => {
    container.list.push(child);
    return container;
  });

  return container;
}

/**
 * Create a mock Phaser sprite with common properties
 */
export function createMockSprite(width = 100, height = 100) {
  const sprite = {
    width,
    height,
    displayWidth: width,
    displayHeight: height,
    tintTopLeft: 0xFFFFFF,
    setScale: vi.fn().mockReturnThis(),
    setPosition: vi.fn().mockReturnThis(),
    setScrollFactor: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    setOrigin: vi.fn().mockReturnThis(),
    setAlpha: vi.fn().mockReturnThis(),
    setInteractive: vi.fn().mockReturnThis(),
    disableInteractive: vi.fn().mockReturnThis(),
    setTint: vi.fn().mockImplementation(function(this: any, tint: number) {
      this.tintTopLeft = tint;
      return this;
    }),
    clearTint: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    destroy: vi.fn()
  };

  return sprite;
}

/**
 * Create a mock Phaser circle
 */
export function createMockCircle() {
  return {
    setPosition: vi.fn().mockReturnThis(),
    setFillStyle: vi.fn().mockReturnThis(),
    setTint: vi.fn().mockReturnThis(),
    setAlpha: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    setBlendMode: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
    scene: {}
  };
}

export function createMockRectangle() {
  return {
    setScrollFactor: vi.fn().mockReturnThis(),
    setAlpha: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    setBlendMode: vi.fn().mockReturnThis(),
    setInteractive: vi.fn().mockReturnThis(),
    disableInteractive: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
    scene: {},
    x: 0,
    y: 0
  };
}

export function createMockTriangle() {
  return {
    setAlpha: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    setBlendMode: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
    scene: {},
    x: 0,
    y: 0
  };
}

export function createMockGraphics() {
  return {
    lineStyle: vi.fn().mockReturnThis(),
    lineBetween: vi.fn().mockReturnThis(),
    beginPath: vi.fn().mockReturnThis(),
    moveTo: vi.fn().mockReturnThis(),
    lineTo: vi.fn().mockReturnThis(),
    strokePath: vi.fn().mockReturnThis(),
    clear: vi.fn().mockReturnThis(),
    fillStyle: vi.fn().mockReturnThis(),
    fillRect: vi.fn().mockReturnThis(),
    fillCircle: vi.fn().mockReturnThis(),
    strokeCircle: vi.fn().mockReturnThis(),
    setScrollFactor: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    setOrigin: vi.fn().mockReturnThis(),
    setAlpha: vi.fn().mockReturnThis(),
    setBlendMode: vi.fn().mockReturnThis(),
    setData: vi.fn().mockReturnThis(),
    getData: vi.fn(),
    destroy: vi.fn(),
    scene: {},
    name: ''
  };
}

export function createMockText() {
  return {
    setScrollFactor: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    setOrigin: vi.fn().mockReturnThis(),
    setText: vi.fn().mockReturnThis(),
    setStyle: vi.fn().mockReturnThis(),
    setAlpha: vi.fn().mockReturnThis(),
    setVisible: vi.fn().mockReturnThis(),
    setInteractive: vi.fn().mockReturnThis(),
    disableInteractive: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    off: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
    text: ''
  };
}

export function createMockInput() {
  const pointerHandlers: Record<string, Function> = {};
  const keyHandlers: Record<string, Function> = {};

  return {
    input: {
      on: vi.fn((event: string, handler: Function) => {
        pointerHandlers[event] = handler;
      }),
      off: vi.fn(),
      activePointer: { x: 0, y: 0 },
      keyboard: {
        on: vi.fn((event: string, handler: Function) => {
          keyHandlers[event] = handler;
        }),
        off: vi.fn()
      }
    },
    pointerHandlers,
    keyHandlers
  };
}

export interface MockSceneOptions {
  textureExists?: (key: string) => boolean;
  containerFactory?: () => any;
  spriteFactory?: (x: number, y: number, key: string) => any;
  circleFactory?: () => any;
  rectangleFactory?: () => any;
  triangleFactory?: () => any;
  graphicsFactory?: () => any;
  textFactory?: () => any;
  width?: number;
  height?: number;
}

export function createMockScene(options: MockSceneOptions = {}) {
  const {
    textureExists = () => false,
    containerFactory = createMockContainer,
    spriteFactory = () => createMockSprite(),
    circleFactory = createMockCircle,
    rectangleFactory = createMockRectangle,
    triangleFactory = createMockTriangle,
    graphicsFactory = createMockGraphics,
    textFactory = createMockText,
    width = 1200,
    height = 800
  } = options;

  return {
    add: {
      container: vi.fn(() => containerFactory()),
      sprite: vi.fn((x: number, y: number, key: string) => spriteFactory(x, y, key)),
      circle: vi.fn(() => circleFactory()),
      rectangle: vi.fn(() => rectangleFactory()),
      triangle: vi.fn(() => triangleFactory()),
      graphics: vi.fn(() => graphicsFactory()),
      text: vi.fn(() => textFactory())
    },
    textures: {
      exists: vi.fn((key: string) => textureExists(key))
    },
    scale: {
      width,
      height,
      on: vi.fn()
    },
    input: {
      on: vi.fn(),
      off: vi.fn(),
      activePointer: { x: 0, y: 0 },
      keyboard: {
        on: vi.fn(),
        off: vi.fn()
      }
    },
    cameras: {
      main: {
        getWorldPoint: vi.fn((x: number, y: number) => ({ x, y }))
      }
    },
    load: {
      image: vi.fn(),
      audio: vi.fn(),
      spritesheet: vi.fn()
    },
    tweens: {
      add: vi.fn((config: any) => {
        if (config.onComplete) {
          config.onComplete();
        }
        return {
          stop: vi.fn(),
          remove: vi.fn()
        };
      })
    }
  };
}

/**
 * Create a mock Phaser scene where all textures exist
 */
export function createMockSceneWithTextures() {
  return createMockScene({
    textureExists: () => true
  });
}

/**
 * Create a mock Phaser scene where no textures exist (fallback to circles)
 */
export function createMockSceneWithoutTextures() {
  return createMockScene({
    textureExists: () => false
  });
}

/**
 * Create a mock Phaser scene where specific textures exist
 */
export function createMockSceneWithSpecificTextures(existingTextures: string[]) {
  return createMockScene({
    textureExists: (key: string) => existingTextures.includes(key)
  });
}

/**
 * Create a mock worker for testing systems that use web workers
 */
export function createMockWorker() {
  return {
    postMessage: vi.fn(),
    onmessage: null as any,
    onerror: null as any,
    terminate: vi.fn()
  };
}
