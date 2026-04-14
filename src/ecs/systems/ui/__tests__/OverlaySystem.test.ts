import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from 'miniplex';
import type { Entity, GameWorld } from '@/ecs/Entity';
import { OverlaySystem } from '../OverlaySystem';
import { gameEvents, GameEvents } from '@/events';

function createMockScene() {
  const mockText = () => ({
    setScrollFactor: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    setOrigin: vi.fn().mockReturnThis(),
    setText: vi.fn().mockReturnThis(),
    setVisible: vi.fn().mockReturnThis(),
    setInteractive: vi.fn().mockReturnThis(),
    disableInteractive: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    off: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
    text: ''
  });

  const mockGraphics = {
    setScrollFactor: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    setVisible: vi.fn().mockReturnThis(),
    fillStyle: vi.fn().mockReturnThis(),
    fillRect: vi.fn().mockReturnThis(),
    clear: vi.fn().mockReturnThis(),
    destroy: vi.fn()
  };

  return {
    add: {
      text: vi.fn().mockImplementation(() => mockText()),
      graphics: vi.fn().mockReturnValue(mockGraphics)
    },
    scale: { width: 800, height: 600, on: vi.fn() }
  };
}

describe('OverlaySystem', () => {
  let world: GameWorld;
  let mockScene: ReturnType<typeof createMockScene>;
  let onNextLevel: ReturnType<typeof vi.fn>;
  let onRetry: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    world = new World<Entity>();
    gameEvents.clear();
    mockScene = createMockScene();
    onNextLevel = vi.fn();
    onRetry = vi.fn();
  });

  function createSystem(levelIndex = 0) {
    return new OverlaySystem(world, {
      scene: mockScene,
      levelIndex,
      onNextLevel,
      onRetry
    });
  }

  // Text objects created: [0]=levelLabel, [1]=startButton, [2]=titleText, [3]=subtitleText, [4]=actionButton
  function getStartButton() { return mockScene.add.text.mock.results[1].value; }
  function getLevelLabel() { return mockScene.add.text.mock.results[0].value; }
  function getTitleText() { return mockScene.add.text.mock.results[2].value; }
  function getSubtitleText() { return mockScene.add.text.mock.results[3].value; }
  function getActionButton() { return mockScene.add.text.mock.results[4].value; }

  describe('start button', () => {
    it('should show a Start button in the sidebar on creation', () => {
      createSystem(0);

      const startBtn = getStartButton();
      expect(startBtn.setText).not.toHaveBeenCalled(); // text set in constructor arg
      const textArg = mockScene.add.text.mock.calls[1][2];
      expect(textArg).toBe('Start');
    });

    it('should show level label', () => {
      createSystem(1);

      const labelArg = mockScene.add.text.mock.calls[0][2];
      expect(labelArg).toBe('Level 2');
    });

    it('should emit GAME_STARTED when start button is clicked', () => {
      const listener = vi.fn();
      gameEvents.on(GameEvents.GAME_STARTED, listener);

      createSystem();

      const startBtn = getStartButton();
      const pointerdownHandler = startBtn.on.mock.calls.find(
        (call: any[]) => call[0] === 'pointerdown'
      );
      pointerdownHandler![1]();

      expect(listener).toHaveBeenCalledOnce();
    });

    it('should hide start button and label when clicked', () => {
      createSystem();

      const startBtn = getStartButton();
      const label = getLevelLabel();
      const pointerdownHandler = startBtn.on.mock.calls.find(
        (call: any[]) => call[0] === 'pointerdown'
      );
      pointerdownHandler![1]();

      expect(startBtn.setVisible).toHaveBeenCalledWith(false);
      expect(label.setVisible).toHaveBeenCalledWith(false);
    });

    it('should not show full-screen overlay on creation', () => {
      createSystem();

      const backdrop = mockScene.add.graphics.mock.results[0].value;
      expect(backdrop.setVisible).toHaveBeenCalledWith(false);
    });
  });

  describe('victory overlay', () => {
    it('should show victory overlay on LEVEL_WON', () => {
      createSystem();

      gameEvents.emit(GameEvents.LEVEL_WON, { firefliesCollected: 3 });

      const titleObj = getTitleText();
      expect(titleObj.setText).toHaveBeenCalledWith('Victory!');
      expect(titleObj.setVisible).toHaveBeenCalledWith(true);
    });

    it('should show Next Level button when more levels exist', () => {
      createSystem(0);

      gameEvents.emit(GameEvents.LEVEL_WON, { firefliesCollected: 2 });

      const actionBtn = getActionButton();
      expect(actionBtn.setText).toHaveBeenCalledWith('Next Level');
    });

    it('should call onNextLevel when Next Level is clicked', () => {
      createSystem(0);

      gameEvents.emit(GameEvents.LEVEL_WON, { firefliesCollected: 2 });

      const actionBtn = getActionButton();
      const lastCall = actionBtn.on.mock.calls[actionBtn.on.mock.calls.length - 1];
      lastCall[1]();

      expect(onNextLevel).toHaveBeenCalledOnce();
    });

    it('should show You Win on last level', () => {
      createSystem(1);

      gameEvents.emit(GameEvents.LEVEL_WON, { firefliesCollected: 2 });

      const actionBtn = getActionButton();
      expect(actionBtn.setText).toHaveBeenCalledWith('You Win!');
    });

    it('should not show victory if already defeated', () => {
      createSystem();

      gameEvents.emit(GameEvents.LEVEL_LOST, { reason: 'monster_reached_goal' });
      gameEvents.emit(GameEvents.LEVEL_WON, { firefliesCollected: 2 });

      const titleObj = getTitleText();
      const calls = titleObj.setText.mock.calls.map((c: any[]) => c[0]);
      expect(calls).not.toContain('Victory!');
    });
  });

  describe('defeat overlay', () => {
    it('should show defeat overlay on LEVEL_LOST', () => {
      createSystem();

      gameEvents.emit(GameEvents.LEVEL_LOST, { reason: 'monster_reached_goal' });

      const titleObj = getTitleText();
      expect(titleObj.setText).toHaveBeenCalledWith('Defeat');
    });

    it('should show monster message for monster_reached_goal', () => {
      createSystem();

      gameEvents.emit(GameEvents.LEVEL_LOST, { reason: 'monster_reached_goal' });

      const subtitleObj = getSubtitleText();
      expect(subtitleObj.setText).toHaveBeenCalledWith('A monster reached its goal');
    });

    it('should show firefly message for insufficient_fireflies', () => {
      createSystem();

      gameEvents.emit(GameEvents.LEVEL_LOST, { reason: 'insufficient_fireflies' });

      const subtitleObj = getSubtitleText();
      expect(subtitleObj.setText).toHaveBeenCalledWith('Not enough fireflies survived');
    });

    it('should call onRetry when Retry is clicked', () => {
      createSystem();

      gameEvents.emit(GameEvents.LEVEL_LOST, { reason: 'monster_reached_goal' });

      const actionBtn = getActionButton();
      const lastCall = actionBtn.on.mock.calls[actionBtn.on.mock.calls.length - 1];
      lastCall[1]();

      expect(onRetry).toHaveBeenCalledOnce();
    });

    it('should not show defeat if already defeated', () => {
      createSystem();

      gameEvents.emit(GameEvents.LEVEL_LOST, { reason: 'monster_reached_goal' });
      const titleObj = getTitleText();
      const callCount = titleObj.setText.mock.calls.length;

      gameEvents.emit(GameEvents.LEVEL_LOST, { reason: 'insufficient_fireflies' });
      expect(titleObj.setText.mock.calls.length).toBe(callCount);
    });
  });

  describe('cleanup', () => {
    it('should destroy all elements and unsubscribe events', () => {
      const system = createSystem();
      system.destroy();

      const startBtn = getStartButton();
      expect(startBtn.destroy).toHaveBeenCalled();

      const titleObj = getTitleText();
      expect(titleObj.destroy).toHaveBeenCalled();
    });
  });
});
