import { ImpostorMeetingPhase, PlayerID } from '../../types/CoveyTownSocket';
import { SessionSettings } from './SessionSettings';

/**
 * Runs one emergency meeting at a time: DISCUSSION, then VOTING, then RESULTS, each lasting the
 * duration in the session settings. After RESULTS the meeting ends and a new one may start.
 */
export default class MeetingManager {
  private readonly _settings: SessionSettings;

  private readonly _onChange: () => void;

  private _phase?: ImpostorMeetingPhase;

  private _caller?: PlayerID;

  private _timer?: ReturnType<typeof setTimeout>;

  /**
   * @param settings The session settings that give each phase's duration
   * @param onChange Called after every phase change, including the meeting ending
   */
  constructor(settings: SessionSettings, onChange: () => void) {
    this._settings = settings;
    this._onChange = onChange;
  }

  /** The current phase, or undefined when no meeting is active */
  get phase(): ImpostorMeetingPhase | undefined {
    return this._phase;
  }

  /** The player who called the active meeting, or undefined when no meeting is active */
  get caller(): PlayerID | undefined {
    return this._caller;
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
      this._enterPhase('VOTING', this._settings.votingDurationSec, () =>
        this._enterPhase('RESULTS', this._settings.resultsDurationSec, () => this._end()),
      ),
    );
  }

  /** Stops the active meeting, if any, without calling onChange. Use when the game ends. */
  dispose(): void {
    clearTimeout(this._timer);
    this._timer = undefined;
    this._phase = undefined;
    this._caller = undefined;
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
