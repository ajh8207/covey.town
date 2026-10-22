import {
  ConversationArea,
  Interactable,
  TicTacToeGameState,
  ViewingArea,
  GameArea,
  ConnectFourGameState,
  ImpostorGameState,
} from './CoveyTownSocket';

/**
 * Test to see if an interactable is a conversation area
 */
export function isConversationArea(interactable: Interactable): interactable is ConversationArea {
  return interactable.type === 'ConversationArea';
}

/**
 * Test to see if an interactable is a viewing area
 */
export function isViewingArea(interactable: Interactable): interactable is ViewingArea {
  return interactable.type === 'ViewingArea';
}

export function isTicTacToeArea(
  interactable: Interactable,
): interactable is GameArea<TicTacToeGameState> {
  return interactable.type === 'TicTacToeArea';
}
export function isConnectFourArea(
  interactable: Interactable,
): interactable is GameArea<ConnectFourGameState> {
  return interactable.type === 'ConnectFourArea';
}

/**
 * Test to see if an interactable is an Impostor game area
 */
export function isImpostorArea(
  interactable: Interactable,
): interactable is GameArea<ImpostorGameState> {
  return interactable.type === 'ImpostorArea' || interactable.type === 'ImpostorArcade';
}
