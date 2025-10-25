import { vi } from 'vitest';

// Disable Phaser's WebGL debugging which requires phaser3spectorjs
(global as any).WEBGL_DEBUG = false;

// Create a more complete canvas mock context
const createMockContext = () => ({
  fillStyle: '',
  strokeStyle: '',
  globalAlpha: 1,
  globalCompositeOperation: 'source-over',
  lineWidth: 1,
  lineCap: 'butt',
  lineJoin: 'miter',
  miterLimit: 10,
  shadowBlur: 0,
  shadowColor: 'rgba(0, 0, 0, 0)',
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  clearRect: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  arc: vi.fn(),
  arcTo: vi.fn(),
  rect: vi.fn(),
  quadraticCurveTo: vi.fn(),
  bezierCurveTo: vi.fn(),
  ellipse: vi.fn(),
  clip: vi.fn(),
  isPointInPath: vi.fn(() => false),
  isPointInStroke: vi.fn(() => false),
  drawImage: vi.fn(),
  createImageData: vi.fn(() => ({ data: new Uint8ClampedArray() })),
  getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(), width: 0, height: 0 })),
  putImageData: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  translate: vi.fn(),
  transform: vi.fn(),
  setTransform: vi.fn(),
  resetTransform: vi.fn(),
  drawFocusIfNeeded: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  canvas: { width: 800, height: 600 }
});

// Mock canvas for Phaser initialization
// This needs to run before Phaser imports
if (typeof HTMLCanvasElement !== 'undefined') {
  // Override getContext even if it exists
  HTMLCanvasElement.prototype.getContext = vi.fn((contextType: string) => {
    if (contextType === '2d' || contextType === 'webgl' || contextType === 'experimental-webgl') {
      return createMockContext();
    }
    return null;
  }) as any;
  
  // Mock toDataURL
  HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,mock');
}
