import { PlayerID } from '../../../types/CoveyTownSocket';
import VisibilityPolicy from './VisibilityPolicy';

/**
 * Throwaway policy for the 1.B1 spike: hides one player from one other player, both identified by
 * the order in which they joined the town (1 = first to join). Dev-mode usernames are random, so
 * join order is the only handle a tester has. Replaced by the session rule table in 2.B1.
 */
export default class DebugHidePolicy implements VisibilityPolicy {
  private readonly _subjectJoinIndex: number;

  private readonly _viewerJoinIndex: number;

  private readonly _playerIDsInJoinOrder: () => PlayerID[];

  /**
   * @param subjectJoinIndex join position (1-based) of the player to hide
   * @param viewerJoinIndex join position (1-based) of the player who must not see them
   * @param playerIDsInJoinOrder returns the town's current player IDs in join order
   */
  constructor(
    subjectJoinIndex: number,
    viewerJoinIndex: number,
    playerIDsInJoinOrder: () => PlayerID[],
  ) {
    this._subjectJoinIndex = subjectJoinIndex;
    this._viewerJoinIndex = viewerJoinIndex;
    this._playerIDsInJoinOrder = playerIDsInJoinOrder;
  }

  /** @inheritdoc */
  canSee(viewerID: PlayerID, subjectID: PlayerID): boolean {
    const ids = this._playerIDsInJoinOrder();
    const hiddenSubject = ids[this._subjectJoinIndex - 1];
    const blindViewer = ids[this._viewerJoinIndex - 1];
    return !(subjectID === hiddenSubject && viewerID === blindViewer);
  }
}

/**
 * Builds a DebugHidePolicy from a spec such as `1:3` ("hide the 1st player to join from the 3rd").
 *
 * @param spec the value of the DEBUG_VISIBILITY_HIDE environment variable, if any
 * @param playerIDsInJoinOrder returns the town's current player IDs in join order
 * @returns the policy, or undefined if the spec is missing or malformed
 */
export function debugHidePolicyFromSpec(
  spec: string | undefined,
  playerIDsInJoinOrder: () => PlayerID[],
): DebugHidePolicy | undefined {
  const match = spec?.trim().match(/^(\d+):(\d+)$/);
  if (!match) {
    return undefined;
  }
  const subject = Number(match[1]);
  const viewer = Number(match[2]);
  if (subject < 1 || viewer < 1 || subject === viewer) {
    return undefined;
  }
  return new DebugHidePolicy(subject, viewer, playerIDsInJoinOrder);
}
