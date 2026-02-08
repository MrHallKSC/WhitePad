import { WaitingRoomStateChanged } from '../../shared/types/messages';

export type WaitingRoomUiState = {
  isLocked: boolean;
  isInWaitingRoomFlow: boolean;
  waitingRoomEnabled: boolean;
  waitingRoomUnlocked: boolean;
};

export function createInitialWaitingRoomState(
  initialIsLocked: boolean,
  initialWaitingRoomEnabled: boolean,
  initialWaitingRoomUnlocked: boolean
): WaitingRoomUiState {
  return {
    isLocked: initialIsLocked,
    isInWaitingRoomFlow: initialWaitingRoomEnabled && initialIsLocked,
    waitingRoomEnabled: initialWaitingRoomEnabled,
    waitingRoomUnlocked: initialWaitingRoomUnlocked,
  };
}

export function applyStudentLocked(
  state: WaitingRoomUiState,
  isLocked: boolean
): WaitingRoomUiState {
  if (!isLocked) {
    return {
      ...state,
      isLocked: false,
      isInWaitingRoomFlow: false,
    };
  }

  return {
    ...state,
    isLocked: true,
  };
}

export function applyWaitingRoomStateChanged(
  state: WaitingRoomUiState,
  message: WaitingRoomStateChanged
): WaitingRoomUiState {
  let nextState: WaitingRoomUiState = {
    ...state,
    waitingRoomEnabled: message.waitingRoomEnabled,
    waitingRoomUnlocked: message.waitingRoomUnlocked,
  };

  if (!message.waitingRoomEnabled) {
    nextState = {
      ...nextState,
      isLocked: false,
      isInWaitingRoomFlow: false,
    };
  } else if (!message.waitingRoomUnlocked) {
    nextState = {
      ...nextState,
      isInWaitingRoomFlow: true,
    };
  }

  return nextState;
}
