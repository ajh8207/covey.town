// AI assistance: written with Claude Code, prompted by Kush; see the PR discussion.
import { PlayerID } from '../../../types/CoveyTownSocket';
import VisibilityPolicy from './VisibilityPolicy';

/**
 * How an Impostor game classifies a player for visibility.
 * - `alive`: a living participant of the running game.
 * - `ghost`: a participant who has died; stays a ghost until the game ends, even if they leave.
 * - `spectator`: watching the game without playing in it.
 * - `outsider`: not part of the game at all (an ordinary town player).
 */
export type VisibilityClass = 'alive' | 'ghost' | 'spectator' | 'outsider';

/**
 * The only thing SessionVisibilityPolicy needs to know about the game. The Impostor session
 * implements it; tests use a fake.
 */
export interface VisibilityRoster {
  /**
   * Classifies a player as of now. A player the game does not know is an `outsider`. A dead
   * player must stay a `ghost` until the game ends, even after disconnecting, because the Town
   * asks about a leaving player while it announces the departure.
   *
   * @param playerID the player to classify
   * @returns the player's current visibility class
   */
  visibilityClassOf(playerID: PlayerID): VisibilityClass;
}

/**
 * An extra hiding rule plugged into SessionVisibilityPolicy, such as DS-5 (an Impostor in a vent
 * is hidden from the living) or DS-17 (town and match players do not see each other).
 *
 * A rule can only hide: it never makes visible what the base table or another rule hides, so
 * adding a rule cannot leak a position and the order of rules does not matter.
 *
 * A rule may hide a subject from a viewer of ANY class, ghosts and spectators included (DS-17
 * hides town players from ghosts too). The base table does not protect ghosts from a rule, so a
 * rule that should only affect the living must check the viewer's class itself: the vent rule
 * must let ghosts and spectators keep seeing a venting Impostor.
 */
export interface VisibilityRule {
  /** Short label for the rule, used in test names and debugging */
  readonly name: string;

  /**
   * Never called with viewerID === subjectID: a player always sees themself.
   *
   * @param viewerID the player whose browser would receive the update
   * @param subjectID the player whose position is being sent
   * @returns true if this rule forbids sending the subject's position to the viewer
   */
  hides(viewerID: PlayerID, subjectID: PlayerID): boolean;
}

/**
 * Classes whose players are out of play: everyone else must not receive their positions, and
 * they themselves may receive everyone's.
 */
const OUT_OF_PLAY_CLASSES: ReadonlyArray<VisibilityClass> = ['ghost', 'spectator'];

/**
 * The visibility rules of a running Impostor game (design doc §15.8): the living and town players
 * never receive the position of a ghost or spectator, while ghosts and spectators receive
 * everyone's. Extra rules can hide more on top of this table.
 *
 * Base table (viewer in the rows, subject in the columns):
 *
 * |           | alive | ghost | spectator | outsider |
 * |-----------|-------|-------|-----------|----------|
 * | alive     | yes   | no    | no        | yes      |
 * | ghost     | yes   | yes   | yes       | yes      |
 * | spectator | yes   | yes   | yes       | yes      |
 * | outsider  | yes   | no    | no        | yes      |
 *
 * A player always sees themself, whatever the table or the rules say.
 */
export default class SessionVisibilityPolicy implements VisibilityPolicy {
  private readonly _roster: VisibilityRoster;

  private readonly _extraRules: ReadonlyArray<VisibilityRule>;

  /**
   * @param roster classifies the players of the running game
   * @param extraRules additional hiding rules, consulted after the base table
   */
  constructor(roster: VisibilityRoster, extraRules: ReadonlyArray<VisibilityRule> = []) {
    this._roster = roster;
    this._extraRules = extraRules;
  }

  /** @inheritdoc */
  canSee(viewerID: PlayerID, subjectID: PlayerID): boolean {
    if (viewerID === subjectID) {
      return true;
    }
    return (
      this._isAllowedByBaseTable(viewerID, subjectID) &&
      !this._extraRules.some(eachRule => eachRule.hides(viewerID, subjectID))
    );
  }

  private _isAllowedByBaseTable(viewerID: PlayerID, subjectID: PlayerID): boolean {
    if (!OUT_OF_PLAY_CLASSES.includes(this._roster.visibilityClassOf(subjectID))) {
      return true;
    }
    return OUT_OF_PLAY_CLASSES.includes(this._roster.visibilityClassOf(viewerID));
  }
}
