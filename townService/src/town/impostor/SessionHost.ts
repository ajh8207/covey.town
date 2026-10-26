// AI assistance: written with Claude Code, prompted by Kush; see the PR discussion.
import VisibilityPolicy from './visibility/VisibilityPolicy';

/**
 * What an Impostor game session may ask of the Town that hosts it (design doc §15.3). The session
 * never imports Town, so it can be tested against a mock host. Later goals add more methods
 * (forceMove in 3.B1, private emits for the kill flow in 3.B2).
 *
 * Call order the session follows (agreed with Gurdeep, Oct 26):
 * - a death: mark the player dead in the roster first, then call `resyncPositions()`;
 * - a vent change (DS-5): update the vent state, then call `resyncPositions()`;
 * - game end: `setVisibilityPolicy(undefined)` first, then `resyncPositions()`.
 */
export default interface SessionHost {
  /**
   * Installs the policy that decides who receives whose position, or removes it with undefined.
   * Does not tell any client about the change by itself: call `resyncPositions()` afterwards.
   *
   * @param policy the policy to consult for every position update, or undefined for none
   */
  setVisibilityPolicy(policy: VisibilityPolicy | undefined): void;

  /**
   * Brings every client's player list in line with what it may see now: a `playerJoined` for each
   * player that became visible to it and a `playerDisconnect` for each that became hidden. Sends
   * nothing about a player the client already has, or still may not see. Then resends each area
   * whose occupant list, as that client may see it, changed (an `interactableUpdate`).
   */
  resyncPositions(): void;
}
