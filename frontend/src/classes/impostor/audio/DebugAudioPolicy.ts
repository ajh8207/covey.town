import PlayerController from '../../PlayerController';
import AudioPolicy from './AudioPolicy';

const GHOST_NAME_PREFIX = 'ghost';

/**
 * Throwaway policy for the 1.D1 spike. There is no game state yet, so a player is a ghost if their
 * username starts with "ghost" (any case), and each tester starts or ends a meeting in their own
 * browser from the dev tools console. Replaced by the game session in a later task.
 */
export default class DebugAudioPolicy implements AudioPolicy {
  private readonly _players: () => PlayerController[];

  private readonly _onChange: () => void;

  private _meetingActive = false;

  /**
   * @param players returns the town's current players
   * @param onChange called whenever the meeting starts or ends
   */
  constructor(players: () => PlayerController[], onChange: () => void) {
    this._players = players;
    this._onChange = onChange;
  }

  /** @inheritdoc */
  isGhost(playerID: string): boolean {
    const player = this._players().find(eachPlayer => eachPlayer.id === playerID);
    return player !== undefined && player.userName.toLowerCase().startsWith(GHOST_NAME_PREFIX);
  }

  /** @inheritdoc */
  meetingActive(): boolean {
    return this._meetingActive;
  }

  /**
   * Starts or ends the meeting in this browser only.
   */
  setMeeting(active: boolean): void {
    if (this._meetingActive !== active) {
      this._meetingActive = active;
      this._onChange();
    }
  }
}

/**
 * @param flag the value of the NEXT_PUBLIC_DEBUG_AUDIO environment variable, if any
 * @returns true if the spike policy should be installed
 */
export function debugAudioEnabled(flag: string | undefined): boolean {
  return flag?.trim().toLowerCase() === 'true';
}
