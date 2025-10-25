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
    destroy: vi.fn(),
    add: vi.fn()
  };
  
  // Manually implement add to ensure it works correctly
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
    tintTopLeft: 0xFFFFFF, // Track the current tint
    setScale: vi.fn().mockReturnThis(),
    setTint: vi.fn().mockImplementation(function(this: any, tint: number) {
      this.tintTopLeft = tint; // Update tint when setTint is called
      return this;
    })
  };
  
  return sprite;
}

/**
 * Create a mock Phaser circle
 */
export function createMockCircle() {
  return {
    setFillStyle: vi.fn().mockReturnThis(),
    setAlpha: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    setBlendMode: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
    scene: {}
  };
}

export function createMockRectangle() {
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
    beginPath: vi.fn().mockReturnThis(),
    moveTo: vi.fn().mockReturnThis(),
    lineTo: vi.fn().mockReturnThis(),
    strokePath: vi.fn().mockReturnThis(),
    clear: vi.fn().mockReturnThis(),
    fillStyle: vi.fn().mockReturnThis(),
    fillCircle: vi.fn().mockReturnThis(),
    strokeCircle: vi.fn().mockReturnThis(),
    setAlpha: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
    scene: {},
    name: ''
  };
}

export function createMockScene(options: {
  textureExists?: (key: string) => boolean;
  containerFactory?: () => any;
  spriteFactory?: (x: number, y: number, key: string) => any;
  circleFactory?: () => any;
  rectangleFactory?: () => any;
  triangleFactory?: () => any;
  graphicsFactory?: () => any;
} = {}) {
  const {
    textureExists = () => false,
    containerFactory = createMockContainer,
    spriteFactory = () => createMockSprite(),
    circleFactory = createMockCircle,
    rectangleFactory = createMockRectangle,
    triangleFactory = createMockTriangle,
    graphicsFactory = createMockGraphics
  } = options;

  return {
    add: {
      container: vi.fn(() => containerFactory()),
      sprite: vi.fn((x, y, key) => spriteFactory(x, y, key)),
      circle: vi.fn(() => circleFactory()),
      rectangle: vi.fn(() => rectangleFactory()),
      triangle: vi.fn(() => triangleFactory()),
      graphics: vi.fn(() => graphicsFactory())
    },
    textures: {
      exists: vi.fn((key) => textureExists(key))
    },
    load: {
      image: vi.fn(),
      audio: vi.fn(),
      spritesheet: vi.fn()
    },
    tweens: {
      add: vi.fn((config: any) => {
        // Immediately call onComplete if provided
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
