import { PlayerID } from '../../../types/CoveyTownSocket';

/**
 * Decides whether one player's position may be sent to another player's browser.
 *
 * A Town with a policy installed consults it for every position update it sends; a Town with no
 * policy installed broadcasts positions to everyone, exactly like the starter town.
 *
 * Implementations must be pure: no sockets, no timers.
 */
export default interface VisibilityPolicy {
  /**
   * @param viewerID the player whose browser would receive the update
   * @param subjectID the player whose position is being sent
   * @returns true if the viewer may receive the subject's position
   */
  canSee(viewerID: PlayerID, subjectID: PlayerID): boolean;
}
