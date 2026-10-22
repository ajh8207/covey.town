import _ from 'lodash';
import { useEffect, useState } from 'react';
import {
  GameArea,
  GameStatus,
  ImpostorGameState,
  ImpostorMeetingPhase,
  ImpostorPrivateState,
  ImpostorRole,
  ImpostorTask,
  ImpostorTeam,
  ImpostorVote,
  InteractableID,
  PlayerID,
} from '../../types/CoveyTownSocket';
import PlayerController from '../PlayerController';
import TownController from '../TownController';
import GameAreaController, {
  GameEventTypes,
  NO_GAME_IN_PROGRESS_ERROR,
  NO_GAME_STARTABLE,
  PLAYER_NOT_IN_GAME_ERROR,
} from './GameAreaController';

/**
 * Event types emitted by ImpostorSessionController.
 */
export type ImpostorEvents = GameEventTypes & {
  phaseChanged: (phase: ImpostorMeetingPhase | undefined) => void;
  roleChanged: (role: ImpostorRole | undefined) => void;
  alivePlayersChanged: (alive: PlayerController[]) => void;
  deadPlayersChanged: (dead: PlayerController[]) => void;
  taskProgressChanged: (completed: number, total: number) => void;
  tasksChanged: (tasks: ReadonlyArray<ImpostorTask>) => void;
  privateStateChanged: (privateState: ImpostorPrivateState) => void;
  meetingCallerChanged: (caller: PlayerController | undefined) => void;
  hasVotedChanged: (voters: PlayerController[]) => void;
  ejectedPlayerChanged: (ejected: PlayerController | 'SKIP' | 'TIE' | undefined) => void;
  cooldownsChanged: () => void;
};

/**
 * Controller responsible for managing the state of an Impostor game session,
 * diffing public and private state updates, and dispatching commands to the server.
 */
export default class ImpostorSessionController extends GameAreaController<
  ImpostorGameState,
  ImpostorEvents
> {
  protected _privateState?: ImpostorPrivateState;

  /**
   * Listener callback for private state updates from TownController.
   */
  private _onPrivateUpdate = (privateState: ImpostorPrivateState): void => {
    if (this._instanceID && privateState.gameID !== this._instanceID) {
      return;
    }
    const oldRole = this._privateState?.role;
    const oldTasks = this._privateState?.tasks;
    const oldKill = this._privateState?.killCooldownEndsAt;
    const oldSabotage = this._privateState?.sabotageCooldownEndsAt;

    this._privateState = privateState;

    if (oldRole !== privateState.role) {
      this.emit('roleChanged', privateState.role);
    }
    if (!_.isEqual(oldTasks, privateState.tasks)) {
      this.emit('tasksChanged', privateState.tasks);
    }
    if (
      oldKill !== privateState.killCooldownEndsAt ||
      oldSabotage !== privateState.sabotageCooldownEndsAt
    ) {
      this.emit('cooldownsChanged');
    }
    this.emit('privateStateChanged', privateState);
  };

  /**
   * Constructs a new ImpostorSessionController.
   *
   * @param id Interactable ID of the game area
   * @param gameArea Initial model of the game area
   * @param townController TownController managing the town connection
   */
  constructor(
    id: InteractableID,
    gameArea: GameArea<ImpostorGameState>,
    townController: TownController,
  ) {
    super(id, gameArea, townController);
    this._instanceID = gameArea.game?.id;
    this._townController.addListener('impostorPrivateUpdate', this._onPrivateUpdate);
  }

  /**
   * Cleans up event listeners on TownController.
   */
  public destroy(): void {
    this._townController.removeListener('impostorPrivateUpdate', this._onPrivateUpdate);
  }

  /**
   * Current meeting phase, or undefined if no meeting is in progress.
   */
  get meetingPhase(): ImpostorMeetingPhase | undefined {
    return this._model.game?.state.meetingPhase;
  }

  /**
   * Whether an emergency meeting or dead body discussion is currently active.
   */
  get isMeetingActive(): boolean {
    return this._model.game?.state.isMeetingActive ?? false;
  }

  /**
   * Player who called the current meeting or reported a dead body.
   */
  get meetingCaller(): PlayerController | undefined {
    const callerID = this._model.game?.state.meetingCaller;
    if (!callerID) {
      return undefined;
    }
    return this._townController.players.find(p => p.id === callerID);
  }

  /**
   * Secret role assigned to the local player, or undefined if not assigned yet.
   */
  get myRole(): ImpostorRole | undefined {
    return this._privateState?.role;
  }

  /**
   * Private state sent only to this client.
   */
  get privateState(): ImpostorPrivateState | undefined {
    return this._privateState;
  }

  /**
   * Task list assigned to the local player.
   */
  get tasks(): ReadonlyArray<ImpostorTask> {
    return this._privateState?.tasks ?? [];
  }

  /**
   * Fellow impostors known to this player (only populated if local player is an impostor).
   */
  get impostorTeammates(): PlayerController[] {
    const teammateIDs = this._privateState?.impostorTeammates;
    if (!teammateIDs) {
      return [];
    }
    return teammateIDs
      .map(id => this._townController.players.find(p => p.id === id))
      .filter((p): p is PlayerController => p !== undefined);
  }

  /**
   * Timestamp (ms) when the kill cooldown expires for this player, if impostor.
   */
  get killCooldownEndsAt(): number | undefined {
    return this._privateState?.killCooldownEndsAt;
  }

  /**
   * Timestamp (ms) when the sabotage cooldown expires for this player, if impostor.
   */
  get sabotageCooldownEndsAt(): number | undefined {
    return this._privateState?.sabotageCooldownEndsAt;
  }

  /**
   * List of players currently alive in the game session.
   */
  get alivePlayers(): PlayerController[] {
    const ids = this._model.game?.state.alivePlayers;
    if (!ids) {
      return [];
    }
    return ids
      .map(id => this._townController.players.find(p => p.id === id))
      .filter((p): p is PlayerController => p !== undefined);
  }

  /**
   * List of players who have died and are now ghosts.
   */
  get deadPlayers(): PlayerController[] {
    const ids = this._model.game?.state.deadPlayers;
    if (!ids) {
      return [];
    }
    return ids
      .map(id => this._townController.players.find(p => p.id === id))
      .filter((p): p is PlayerController => p !== undefined);
  }

  /**
   * Total number of tasks completed across all crewmates.
   */
  get tasksCompleted(): number {
    return this._model.game?.state.tasksCompleted ?? 0;
  }

  /**
   * Total number of tasks required for crewmate task victory.
   */
  get totalTasks(): number {
    return this._model.game?.state.totalTasks ?? 0;
  }

  /**
   * Players who have cast their vote during the current meeting.
   */
  get hasVoted(): PlayerController[] {
    const ids = this._model.game?.state.hasVoted;
    if (!ids) {
      return [];
    }
    return ids
      .map(id => this._townController.players.find(p => p.id === id))
      .filter((p): p is PlayerController => p !== undefined);
  }

  /**
   * Recorded votes revealed when meetingPhase === 'RESULTS'.
   */
  get votes(): ReadonlyArray<ImpostorVote> | undefined {
    return this._model.game?.state.votes;
  }

  /**
   * Ejected player from the last meeting, or 'SKIP', 'TIE', or undefined.
   */
  get ejectedPlayer(): PlayerController | 'SKIP' | 'TIE' | undefined {
    const ejected = this._model.game?.state.ejectedPlayer;
    if (ejected === undefined || ejected === 'SKIP' || ejected === 'TIE') {
      return ejected;
    }
    return this._townController.players.find(p => p.id === ejected);
  }

  /**
   * Winning team if the game has ended.
   */
  get winner(): ImpostorTeam | undefined {
    return this._model.game?.state.winner;
  }

  /**
   * Status of the game.
   */
  get status(): GameStatus {
    return this._model.game?.state.status ?? 'WAITING_FOR_PLAYERS';
  }

  /**
   * True if the local player has joined the game.
   */
  get isPlayer(): boolean {
    return this._model.game?.players.includes(this._townController.ourPlayer.id) ?? false;
  }

  /**
   * True if the local player is currently alive in the game.
   */
  get isAlive(): boolean {
    return (
      this._model.game?.state.alivePlayers.includes(this._townController.ourPlayer.id) ?? false
    );
  }

  /**
   * True if the local player is currently dead (a ghost).
   */
  get isGhost(): boolean {
    return this._model.game?.state.deadPlayers.includes(this._townController.ourPlayer.id) ?? false;
  }

  /**
   * Returns true if no players are in the game and no occupants in the area.
   */
  public isEmpty(): boolean {
    return (
      this.occupants.length === 0 && (!this._model.game || this._model.game.players.length === 0)
    );
  }

  /**
   * Returns true if the game is active (not waiting for players and not empty).
   */
  public isActive(): boolean {
    return !this.isEmpty() && this.status !== 'WAITING_FOR_PLAYERS';
  }

  /**
   * Updates internal state from a new model, diffing fields to emit events only on change.
   *
   * @param newModel Updated GameArea model from the server
   */
  protected _updateFrom(newModel: GameArea<ImpostorGameState>): void {
    const oldState = this._model.game?.state;
    super._updateFrom(newModel);
    const newState = newModel.game?.state;

    if (!newState) {
      if (oldState) {
        this.emit('phaseChanged', undefined);
        this.emit('alivePlayersChanged', []);
        this.emit('deadPlayersChanged', []);
        this.emit('taskProgressChanged', 0, 0);
        this.emit('meetingCallerChanged', undefined);
        this.emit('hasVotedChanged', []);
        this.emit('ejectedPlayerChanged', undefined);
      }
      return;
    }

    if (oldState?.meetingPhase !== newState.meetingPhase) {
      this.emit('phaseChanged', newState.meetingPhase);
    }
    if (!_.isEqual(oldState?.alivePlayers, newState.alivePlayers)) {
      this.emit('alivePlayersChanged', this.alivePlayers);
    }
    if (!_.isEqual(oldState?.deadPlayers, newState.deadPlayers)) {
      this.emit('deadPlayersChanged', this.deadPlayers);
    }
    if (
      oldState?.tasksCompleted !== newState.tasksCompleted ||
      oldState?.totalTasks !== newState.totalTasks
    ) {
      this.emit('taskProgressChanged', newState.tasksCompleted, newState.totalTasks);
    }
    if (oldState?.meetingCaller !== newState.meetingCaller) {
      this.emit('meetingCallerChanged', this.meetingCaller);
    }
    if (!_.isEqual(oldState?.hasVoted, newState.hasVoted)) {
      this.emit('hasVotedChanged', this.hasVoted);
    }
    if (oldState?.ejectedPlayer !== newState.ejectedPlayer) {
      this.emit('ejectedPlayerChanged', this.ejectedPlayer);
    }
  }

  /**
   * Sends a request to start the game.
   *
   * @throws NO_GAME_STARTABLE if game is not in WAITING_TO_START status
   */
  public async startGame(): Promise<void> {
    const instanceID = this._instanceID;
    if (!instanceID || this._model.game?.state.status !== 'WAITING_TO_START') {
      throw new Error(NO_GAME_STARTABLE);
    }
    await this._townController.sendInteractableCommand(this.id, {
      gameID: instanceID,
      type: 'StartGame',
    });
  }

  /**
   * Asserts that a game is currently in progress and the local player is a participant.
   */
  private _checkGameInProgressAndPlayer(): GameArea<ImpostorGameState> {
    const instanceID = this._instanceID;
    if (!instanceID || this.status !== 'IN_PROGRESS') {
      throw new Error(NO_GAME_IN_PROGRESS_ERROR);
    }
    if (!this.isPlayer) {
      throw new Error(PLAYER_NOT_IN_GAME_ERROR);
    }
    return this._model;
  }

  /**
   * Initiates an emergency meeting.
   */
  public async callMeeting(): Promise<void> {
    this._checkGameInProgressAndPlayer();
    await this._townController.sendInteractableCommand(this.id, {
      type: 'ImpostorCommand',
      gameID: this._instanceID as string,
      move: {
        moveType: 'CallMeeting',
      },
    });
  }

  /**
   * Reports a discovered dead body, calling an emergency meeting.
   *
   * @param victimID PlayerID of the discovered dead player
   */
  public async reportBody(victimID: PlayerID): Promise<void> {
    this._checkGameInProgressAndPlayer();
    await this._townController.sendInteractableCommand(this.id, {
      type: 'ImpostorCommand',
      gameID: this._instanceID as string,
      move: {
        moveType: 'ReportBody',
        victimID,
      },
    });
  }

  /**
   * Casts a vote during the voting phase of an emergency meeting.
   *
   * @param target PlayerID of the player voted for, or 'SKIP' to skip voting
   */
  public async castVote(target: PlayerID | 'SKIP'): Promise<void> {
    this._checkGameInProgressAndPlayer();
    await this._townController.sendInteractableCommand(this.id, {
      type: 'ImpostorCommand',
      gameID: this._instanceID as string,
      move: {
        moveType: 'CastVote',
        target,
      },
    });
  }

  /**
   * Marks a task as completed.
   *
   * @param taskID ID of the completed task
   */
  public async completeTask(taskID: string): Promise<void> {
    this._checkGameInProgressAndPlayer();
    await this._townController.sendInteractableCommand(this.id, {
      type: 'ImpostorCommand',
      gameID: this._instanceID as string,
      move: {
        moveType: 'CompleteTask',
        taskID,
      },
    });
  }

  /**
   * Kills an alive player (Impostor only).
   *
   * @param victimID PlayerID of the victim to kill
   */
  public async killPlayer(victimID: PlayerID): Promise<void> {
    this._checkGameInProgressAndPlayer();
    await this._townController.sendInteractableCommand(this.id, {
      type: 'ImpostorCommand',
      gameID: this._instanceID as string,
      move: {
        moveType: 'KillPlayer',
        victimID,
      },
    });
  }

  /**
   * Triggers a sabotage event (Impostor only).
   *
   * @param sabotageType Type of sabotage to trigger
   */
  public async sabotage(sabotageType: string): Promise<void> {
    this._checkGameInProgressAndPlayer();
    await this._townController.sendInteractableCommand(this.id, {
      type: 'ImpostorCommand',
      gameID: this._instanceID as string,
      move: {
        moveType: 'Sabotage',
        sabotageType,
      },
    });
  }
}

export { ImpostorSessionController as ImpostorAreaController };

/**
 * React hook that returns the current Impostor meeting phase, re-rendering on changes.
 *
 * @param controller ImpostorSessionController to subscribe to
 * @returns Current meeting phase or undefined if no meeting is active
 */
export function useImpostorPhase(
  controller: ImpostorSessionController,
): ImpostorMeetingPhase | undefined {
  const [phase, setPhase] = useState<ImpostorMeetingPhase | undefined>(controller.meetingPhase);
  useEffect(() => {
    controller.addListener('phaseChanged', setPhase);
    return () => {
      controller.removeListener('phaseChanged', setPhase);
    };
  }, [controller]);
  return phase;
}

/**
 * React hook that returns the local player's assigned role, re-rendering on changes.
 *
 * @param controller ImpostorSessionController to subscribe to
 * @returns Assigned ImpostorRole or undefined if not assigned yet
 */
export function useMyRole(controller: ImpostorSessionController): ImpostorRole | undefined {
  const [role, setRole] = useState<ImpostorRole | undefined>(controller.myRole);
  useEffect(() => {
    controller.addListener('roleChanged', setRole);
    return () => {
      controller.removeListener('roleChanged', setRole);
    };
  }, [controller]);
  return role;
}
