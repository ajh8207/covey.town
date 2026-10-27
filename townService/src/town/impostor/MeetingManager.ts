import { ImpostorMeetingPhase, PlayerID } from '../../types/CoveyTownSocket';
import { SessionSettings } from './SessionSettings';
import { tallyVotes, VoteOutcome } from './VoteTally';

/**
 * Runs one emergency meeting at a time: DISCUSSION, then VOTING, then RESULTS, each lasting the
 * duration in the session settings. Living players vote during VOTING; when it ends the votes are
 * tallied and the outcome handed to onResult. After RESULTS the meeting ends and a new one may start.
 */
export default class MeetingManager {
  private readonly _settings: SessionSettings;

  private readonly _getAlivePlayers: () => ReadonlyArray<PlayerID>;

  private readonly _onChange: () => void;

  private readonly _onResult: (outcome: VoteOutcome) => void;

  private _phase?: ImpostorMeetingPhase;

  private _caller?: PlayerID;

  private readonly _votes = new Map<PlayerID, PlayerID | 'SKIP'>();

  private _timer?: ReturnType<typeof setTimeout>;

  /**
   * @param settings The session settings that give each phase's duration
   * @param getAlivePlayers Returns the players currently alive; only they may vote or be voted for
   * @param onChange Called after every phase change, including the meeting ending
   * @param onResult Called with the tallied outcome when VOTING ends, before RESULTS begins
   */
  constructor(
    settings: SessionSettings,
    getAlivePlayers: () => ReadonlyArray<PlayerID>,
    onChange: () => void,
    onResult: (outcome: VoteOutcome) => void,
  ) {
    this._settings = settings;
    this._getAlivePlayers = getAlivePlayers;
    this._onChange = onChange;
    this._onResult = onResult;
  }

  /** The current phase, or undefined when no meeting is active */
  get phase(): ImpostorMeetingPhase | undefined {
    return this._phase;
  }

  /** The player who called the active meeting, or undefined when no meeting is active */
  get caller(): PlayerID | undefined {
    return this._caller;
  }

  /** The players who have voted in the active meeting, without their targets */
  get hasVoted(): ReadonlyArray<PlayerID> {
    return [...this._votes.keys()];
  }

  /**
   * Starts a meeting in the DISCUSSION phase.
   *
   * @param callerID The player who called the meeting or reported a body
   * @throws Error if a meeting is already active
   */
  start(callerID: PlayerID): void {
    if (this._phase) {
      throw new Error('Cannot start a meeting: a meeting is already active');
    }
    this._caller = callerID;
    this._enterPhase('DISCUSSION', this._settings.discussionDurationSec, () =>
      this._enterPhase('VOTING', this._settings.votingDurationSec, () => {
        this._onResult(tallyVotes([...this._votes].map(([voter, target]) => ({ voter, target }))));
        this._enterPhase('RESULTS', this._settings.resultsDurationSec, () => this._end());
      }),
    );
  }

  /**
   * Records a vote. A second vote from the same player replaces the first.
   *
   * @param voterID The player casting the vote
   * @param target The player voted against, or 'SKIP'
   * @throws Error if the phase is not VOTING, the voter is not alive, or the target is neither
   *   'SKIP' nor a living player
   */
  castVote(voterID: PlayerID, target: PlayerID | 'SKIP'): void {
    if (this._phase !== 'VOTING') {
      throw new Error('Cannot vote: voting is not open');
    }
    const alive = this._getAlivePlayers();
    if (!alive.includes(voterID)) {
      throw new Error('Cannot vote: voter is not alive');
    }
    if (target !== 'SKIP' && !alive.includes(target)) {
      throw new Error('Cannot vote: target is not alive');
    }
    // Locking a submitted vote is DS-14; until then a re-vote overwrites.
    this._votes.set(voterID, target);
  }

  /** Stops the active meeting, if any, without calling onChange. Use when the game ends. */
  dispose(): void {
    clearTimeout(this._timer);
    this._timer = undefined;
    this._phase = undefined;
    this._caller = undefined;
    this._votes.clear();
  }

  private _enterPhase(phase: ImpostorMeetingPhase, durationSec: number, next: () => void): void {
    this._phase = phase;
    this._timer = setTimeout(next, durationSec * 1000);
    this._onChange();
  }

  private _end(): void {
    this.dispose();
    this._onChange();
  }
}
