// AI assistance: written with Claude Code, prompted by Kush; see the PR discussion.
import InvalidParametersError from '../../../lib/InvalidParametersError';
import { PlayerID } from '../../../types/CoveyTownSocket';
import SessionHost from '../SessionHost';
import SessionVisibilityPolicy, {
  VisibilityClass,
  VisibilityRoster,
} from './SessionVisibilityPolicy';

/** What the dev controls need from a Town: the session calls plus who is in the town. */
export interface DevGhostHost extends SessionHost {
  /** The players currently in the town */
  readonly players: ReadonlyArray<{ readonly id: PlayerID; readonly userName: string }>;
}

/**
 * Dev-only stand-in for the Impostor session, so the ghost rules can be seen in a browser before
 * the real session (4.A1) installs the policy. It plays the session's part of the agreed call
 * order: mark a player dead, then resync; at the end remove the policy, then resync.
 *
 * Nothing creates one unless the dev routes are switched on (see DevGhostRoutes).
 */
export default class DevGhostControls implements VisibilityRoster {
  private readonly _host: DevGhostHost;

  private readonly _ghostIDs = new Set<PlayerID>();

  private readonly _policy = new SessionVisibilityPolicy(this);

  /**
   * @param host the town to install the policy on and resync
   */
  constructor(host: DevGhostHost) {
    this._host = host;
  }

  /**
   * Classifies a player: a ghost until {@link clear}, even after leaving, and alive otherwise.
   *
   * @param playerID the player to classify
   * @returns 'ghost' for a player marked by {@link makeGhost}, 'alive' for everyone else
   */
  public visibilityClassOf(playerID: PlayerID): VisibilityClass {
    return this._ghostIDs.has(playerID) ? 'ghost' : 'alive';
  }

  /**
   * Marks every player in the town with this user name as a ghost, installs the policy and
   * resyncs, so the living are told the ghost left while other ghosts keep seeing it.
   *
   * @param userName the user name of the player to make a ghost
   * @returns the IDs of the players that were marked
   * @throws InvalidParametersError if no player in the town has that user name
   */
  public makeGhost(userName: string): PlayerID[] {
    const matches = this._host.players.filter(eachPlayer => eachPlayer.userName === userName);
    if (matches.length === 0) {
      throw new InvalidParametersError(`No player named ${userName} is in the town`);
    }
    matches.forEach(eachPlayer => this._ghostIDs.add(eachPlayer.id));
    this._host.setVisibilityPolicy(this._policy);
    this._host.resyncPositions();
    return matches.map(eachPlayer => eachPlayer.id);
  }

  /**
   * Ends the pretend game: forgets every ghost, removes the policy, then resyncs so everyone
   * is told about everyone again.
   */
  public clear(): void {
    this._ghostIDs.clear();
    this._host.setVisibilityPolicy(undefined);
    this._host.resyncPositions();
  }
}
