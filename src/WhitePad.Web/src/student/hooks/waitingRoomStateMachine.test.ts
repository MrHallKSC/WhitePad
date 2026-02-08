import { describe, expect, it } from 'vitest';
import {
  applyStudentLocked,
  applyWaitingRoomStateChanged,
  createInitialWaitingRoomState,
} from './waitingRoomStateMachine';

describe('waitingRoomStateMachine', () => {
  it('creates waiting-room flow state when initially locked with waiting room enabled', () => {
    const state = createInitialWaitingRoomState(true, true, false);

    expect(state).toEqual({
      isLocked: true,
      isInWaitingRoomFlow: true,
      waitingRoomEnabled: true,
      waitingRoomUnlocked: false,
    });
  });

  it('creates classroom-lock state when initially locked with waiting room disabled', () => {
    const state = createInitialWaitingRoomState(true, false, false);

    expect(state).toEqual({
      isLocked: true,
      isInWaitingRoomFlow: false,
      waitingRoomEnabled: false,
      waitingRoomUnlocked: false,
    });
  });

  it('keeps waiting-room flow active after start activity unlock event until student joins', () => {
    const initial = createInitialWaitingRoomState(true, true, false);

    const afterStartActivity = applyWaitingRoomStateChanged(initial, {
      waitingRoomEnabled: true,
      waitingRoomUnlocked: true,
    });

    expect(afterStartActivity.isLocked).toBe(true);
    expect(afterStartActivity.isInWaitingRoomFlow).toBe(true);
    expect(afterStartActivity.waitingRoomUnlocked).toBe(true);
  });

  it('exits waiting-room flow when student is unlocked (after join)', () => {
    const initial = createInitialWaitingRoomState(true, true, true);

    const afterJoin = applyStudentLocked(initial, false);

    expect(afterJoin.isLocked).toBe(false);
    expect(afterJoin.isInWaitingRoomFlow).toBe(false);
  });

  it('treats lock-all as classroom lock when waiting room flow is not active', () => {
    const initial = createInitialWaitingRoomState(false, false, false);

    const afterLockAll = applyStudentLocked(initial, true);

    expect(afterLockAll.isLocked).toBe(true);
    expect(afterLockAll.isInWaitingRoomFlow).toBe(false);
  });

  it('clears lock and waiting-room flow when waiting room is disabled', () => {
    const initial = createInitialWaitingRoomState(true, true, false);

    const afterDisable = applyWaitingRoomStateChanged(initial, {
      waitingRoomEnabled: false,
      waitingRoomUnlocked: false,
    });

    expect(afterDisable.isLocked).toBe(false);
    expect(afterDisable.isInWaitingRoomFlow).toBe(false);
    expect(afterDisable.waitingRoomEnabled).toBe(false);
  });

  it('reactivates waiting-room flow when waiting room is re-enabled and locked', () => {
    const initial = createInitialWaitingRoomState(false, false, false);

    const afterReEnable = applyWaitingRoomStateChanged(initial, {
      waitingRoomEnabled: true,
      waitingRoomUnlocked: false,
    });

    expect(afterReEnable.waitingRoomEnabled).toBe(true);
    expect(afterReEnable.waitingRoomUnlocked).toBe(false);
    expect(afterReEnable.isInWaitingRoomFlow).toBe(true);
  });
});
