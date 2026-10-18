import PlayerController from '../../PlayerController';

/**
 * What the audio rules need to know about the game. Supplied by DebugAudioPolicy for the 1.D1 spike
 * and by the game session later on.
 *
 * Implementations must be pure: no sockets, no timers.
 */
export default interface AudioPolicy {
  /**
   * @param playerID the player to check
   * @returns true if the player is dead (a ghost)
   */
  isGhost(playerID: string): boolean;

  /**
   * @returns true while a meeting is in progress
   */
  meetingActive(): boolean;
}

/** The starter town's behavior: nobody is a ghost and there are no meetings. */
export const noAudioPolicy: AudioPolicy = {
  isGhost: () => false,
  meetingActive: () => false,
};

/**
 * Decides whether the listener's browser should play the speaker's audio and video.
 *
 * 1. A living listener never hears a ghost, wherever they are (US2).
 * 2. During a meeting everyone else is heard, at any distance (US3).
 * 3. Otherwise the starter town's proximity rule applies.
 *
 * @param listener the player whose browser would play the track
 * @param speaker the player who published the track
 * @param policy the current ghost and meeting state
 * @param inProximity the starter town's rule for whether the speaker is close enough to hear
 */
export function canHear(
  listener: PlayerController,
  speaker: PlayerController,
  policy: AudioPolicy,
  inProximity: (speaker: PlayerController) => boolean,
): boolean {
  if (policy.isGhost(speaker.id) && !policy.isGhost(listener.id)) {
    return false;
  }
  if (policy.meetingActive()) {
    return true;
  }
  return inProximity(speaker);
}
