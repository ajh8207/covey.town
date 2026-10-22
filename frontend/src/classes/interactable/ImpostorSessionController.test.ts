import { act, cleanup, render } from '@testing-library/react';
import assert from 'assert';
import { mock } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import React from 'react';
import {
  GameResult,
  GameStatus,
  ImpostorMeetingPhase,
  ImpostorPrivateState,
  ImpostorRole,
  ImpostorTask,
  ImpostorTeam,
  ImpostorVote,
  PlayerID,
} from '../../types/CoveyTownSocket';
import PlayerController from '../PlayerController';
import TownController from '../TownController';
import {
  NO_GAME_IN_PROGRESS_ERROR,
  NO_GAME_STARTABLE,
  PLAYER_NOT_IN_GAME_ERROR,
} from './GameAreaController';
import ImpostorSessionController, {
  useImpostorPhase,
  useMyRole,
} from './ImpostorSessionController';

describe('ImpostorSessionController', () => {
  const ourPlayer = new PlayerController(nanoid(), 'OurPlayer', {
    x: 0,
    y: 0,
    moving: false,
    rotation: 'front',
  });
  const otherPlayers = [
    new PlayerController(nanoid(), 'Player1', {
      x: 0,
      y: 0,
      moving: false,
      rotation: 'front',
    }),
    new PlayerController(nanoid(), 'Player2', {
      x: 0,
      y: 0,
      moving: false,
      rotation: 'front',
    }),
    new PlayerController(nanoid(), 'Player3', {
      x: 0,
      y: 0,
      moving: false,
      rotation: 'front',
    }),
  ];

  const townListeners = new Map<string, Array<(...args: unknown[]) => void>>();
  const mockTownController = mock<TownController>();
  Object.defineProperty(mockTownController, 'ourPlayer', {
    get: () => ourPlayer,
  });
  Object.defineProperty(mockTownController, 'players', {
    get: () => [ourPlayer, ...otherPlayers],
  });
  mockTownController.getPlayer.mockImplementation(playerID => {
    const p = mockTownController.players.find(player => player.id === playerID);
    assert(p);
    return p;
  });
  mockTownController.addListener.mockImplementation((event: string, fn: unknown) => {
    const arr = townListeners.get(event) || [];
    arr.push(fn as (...args: unknown[]) => void);
    townListeners.set(event, arr);
    return mockTownController;
  });
  mockTownController.removeListener.mockImplementation((event: string, fn: unknown) => {
    const arr = townListeners.get(event) || [];
    townListeners.set(
      event,
      arr.filter(f => f !== fn),
    );
    return mockTownController;
  });

  function emitTownControllerEvent(event: string, ...args: unknown[]) {
    townListeners.get(event)?.forEach(fn => fn(...args));
  }

  function impostorControllerWithProps({
    _id,
    history,
    undefinedGame,
    status,
    players,
    alivePlayers,
    deadPlayers,
    tasksCompleted,
    totalTasks,
    isMeetingActive,
    meetingPhase,
    meetingCaller,
    hasVoted,
    votes,
    ejectedPlayer,
    winner,
    gameInstanceID,
    observers,
  }: {
    _id?: string;
    history?: GameResult[];
    undefinedGame?: boolean;
    status?: GameStatus;
    players?: string[];
    alivePlayers?: string[];
    deadPlayers?: string[];
    tasksCompleted?: number;
    totalTasks?: number;
    isMeetingActive?: boolean;
    meetingPhase?: ImpostorMeetingPhase;
    meetingCaller?: PlayerID;
    hasVoted?: PlayerID[];
    votes?: ImpostorVote[];
    ejectedPlayer?: PlayerID | 'SKIP' | 'TIE';
    winner?: ImpostorTeam;
    gameInstanceID?: string;
    observers?: string[];
  }) {
    const id = _id || `INTERACTABLE-ID-${nanoid()}`;
    const instanceID = gameInstanceID || `GAME-INSTANCE-ID-${nanoid()}`;
    const allOccupants = [...(players || [])];
    if (observers) {
      allOccupants.push(...observers);
    }
    const ret = new ImpostorSessionController(
      id,
      {
        id,
        occupants: allOccupants,
        history: history || [],
        type: 'ImpostorArea',
        game: undefinedGame
          ? undefined
          : {
              id: instanceID,
              players: players || [],
              state: {
                status: status || 'WAITING_FOR_PLAYERS',
                alivePlayers: alivePlayers || [],
                deadPlayers: deadPlayers || [],
                tasksCompleted: tasksCompleted || 0,
                totalTasks: totalTasks || 0,
                isMeetingActive: isMeetingActive || false,
                meetingPhase,
                meetingCaller,
                hasVoted,
                votes,
                ejectedPlayer,
                winner,
              },
            },
      },
      mockTownController,
    );
    ret.occupants = allOccupants
      .map(eachID => mockTownController.players.find(p => p.id === eachID))
      .filter((p): p is PlayerController => p !== undefined);
    return ret;
  }

  beforeEach(() => {
    townListeners.clear();
    jest.clearAllMocks();
  });

  describe('isEmpty and isActive', () => {
    it('isEmpty returns true when there are no occupants and no players in game', () => {
      const controller = impostorControllerWithProps({
        undefinedGame: true,
      });
      expect(controller.isEmpty()).toBe(true);
    });
    it('isEmpty returns false when there are occupants in the area', () => {
      const controller = impostorControllerWithProps({
        observers: [ourPlayer.id],
      });
      expect(controller.isEmpty()).toBe(false);
    });
    it('isEmpty returns false when there are players in the game', () => {
      const controller = impostorControllerWithProps({
        players: [ourPlayer.id],
      });
      expect(controller.isEmpty()).toBe(false);
    });
    it('isActive returns false when status is WAITING_FOR_PLAYERS', () => {
      const controller = impostorControllerWithProps({
        players: [ourPlayer.id],
        status: 'WAITING_FOR_PLAYERS',
      });
      expect(controller.isActive()).toBe(false);
    });
    it('isActive returns true when status is IN_PROGRESS', () => {
      const controller = impostorControllerWithProps({
        players: [ourPlayer.id],
        status: 'IN_PROGRESS',
      });
      expect(controller.isActive()).toBe(true);
    });
    it('isActive returns true when status is WAITING_TO_START', () => {
      const controller = impostorControllerWithProps({
        players: [ourPlayer.id],
        status: 'WAITING_TO_START',
      });
      expect(controller.isActive()).toBe(true);
    });
  });

  describe('Public State Getters', () => {
    it('Returns correct values for a fully defined game state', () => {
      const controller = impostorControllerWithProps({
        players: [ourPlayer.id, otherPlayers[0].id],
        alivePlayers: [ourPlayer.id],
        deadPlayers: [otherPlayers[0].id],
        status: 'IN_PROGRESS',
        tasksCompleted: 3,
        totalTasks: 10,
        isMeetingActive: true,
        meetingPhase: 'VOTING',
        meetingCaller: ourPlayer.id,
        hasVoted: [ourPlayer.id],
        votes: [{ voter: ourPlayer.id, target: 'SKIP' }],
        ejectedPlayer: otherPlayers[0].id,
        winner: 'Crewmates',
      });

      expect(controller.status).toBe('IN_PROGRESS');
      expect(controller.isPlayer).toBe(true);
      expect(controller.isAlive).toBe(true);
      expect(controller.isGhost).toBe(false);
      expect(controller.alivePlayers.map((p: PlayerController) => p.id)).toEqual([ourPlayer.id]);
      expect(controller.deadPlayers.map((p: PlayerController) => p.id)).toEqual([
        otherPlayers[0].id,
      ]);
      expect(controller.tasksCompleted).toBe(3);
      expect(controller.totalTasks).toBe(10);
      expect(controller.isMeetingActive).toBe(true);
      expect(controller.meetingPhase).toBe('VOTING');
      expect(controller.meetingCaller?.id).toBe(ourPlayer.id);
      expect(controller.hasVoted.map((p: PlayerController) => p.id)).toEqual([ourPlayer.id]);
      expect(controller.votes).toEqual([{ voter: ourPlayer.id, target: 'SKIP' }]);
      expect((controller.ejectedPlayer as PlayerController)?.id).toBe(otherPlayers[0].id);
      expect(controller.winner).toBe('Crewmates');
    });

    it('Returns correct fallback defaults when game is undefined', () => {
      const controller = impostorControllerWithProps({ undefinedGame: true });
      expect(controller.status).toBe('WAITING_FOR_PLAYERS');
      expect(controller.isPlayer).toBe(false);
      expect(controller.isAlive).toBe(false);
      expect(controller.isGhost).toBe(false);
      expect(controller.alivePlayers).toEqual([]);
      expect(controller.deadPlayers).toEqual([]);
      expect(controller.tasksCompleted).toBe(0);
      expect(controller.totalTasks).toBe(0);
      expect(controller.isMeetingActive).toBe(false);
      expect(controller.meetingPhase).toBeUndefined();
      expect(controller.meetingCaller).toBeUndefined();
      expect(controller.hasVoted).toEqual([]);
      expect(controller.votes).toBeUndefined();
      expect(controller.ejectedPlayer).toBeUndefined();
      expect(controller.winner).toBeUndefined();
    });

    it('Handles ejectedPlayer as SKIP or TIE', () => {
      const skipController = impostorControllerWithProps({ ejectedPlayer: 'SKIP' });
      expect(skipController.ejectedPlayer).toBe('SKIP');
      const tieController = impostorControllerWithProps({ ejectedPlayer: 'TIE' });
      expect(tieController.ejectedPlayer).toBe('TIE');
    });
  });

  describe('Private State Handling', () => {
    it('Updates private state when receiving impostorPrivateUpdate for matching gameID', () => {
      const gameID = 'matching-game-id';
      const controller = impostorControllerWithProps({ gameInstanceID: gameID });

      const roleSpy = jest.fn();
      const tasksSpy = jest.fn();
      const privateSpy = jest.fn();
      const cooldownSpy = jest.fn();

      controller.addListener('roleChanged', roleSpy);
      controller.addListener('tasksChanged', tasksSpy);
      controller.addListener('privateStateChanged', privateSpy);
      controller.addListener('cooldownsChanged', cooldownSpy);

      const tasks: ImpostorTask[] = [{ taskID: 'task-1', name: 'Wiring', completed: false }];
      const privateUpdate: ImpostorPrivateState = {
        gameID,
        role: 'Impostor',
        impostorTeammates: [otherPlayers[0].id],
        tasks,
        killCooldownEndsAt: 10000,
        sabotageCooldownEndsAt: 15000,
      };

      emitTownControllerEvent('impostorPrivateUpdate', privateUpdate);

      expect(roleSpy).toHaveBeenCalledWith('Impostor');
      expect(tasksSpy).toHaveBeenCalledWith(tasks);
      expect(privateSpy).toHaveBeenCalledWith(privateUpdate);
      expect(cooldownSpy).toHaveBeenCalled();

      expect(controller.myRole).toBe('Impostor');
      expect(controller.tasks).toEqual(tasks);
      expect(controller.impostorTeammates.map((p: PlayerController) => p.id)).toEqual([
        otherPlayers[0].id,
      ]);
      expect(controller.killCooldownEndsAt).toBe(10000);
      expect(controller.sabotageCooldownEndsAt).toBe(15000);
      expect(controller.privateState).toEqual(privateUpdate);
    });

    it('Ignores private update with mismatched gameID', () => {
      const controller = impostorControllerWithProps({ gameInstanceID: 'game-A' });
      const roleSpy = jest.fn();
      controller.addListener('roleChanged', roleSpy);

      emitTownControllerEvent('impostorPrivateUpdate', {
        gameID: 'game-B',
        role: 'Impostor',
        tasks: [],
      });

      expect(roleSpy).not.toHaveBeenCalled();
      expect(controller.myRole).toBeUndefined();
    });

    it('Does not emit roleChanged or tasksChanged if values are unchanged', () => {
      const gameID = 'game-test';
      const controller = impostorControllerWithProps({ gameInstanceID: gameID });
      const roleSpy = jest.fn();
      const tasksSpy = jest.fn();
      controller.addListener('roleChanged', roleSpy);
      controller.addListener('tasksChanged', tasksSpy);

      const privateState: ImpostorPrivateState = {
        gameID,
        role: 'Crewmate',
        tasks: [{ taskID: 'task-1', name: 'Swipe Card', completed: false }],
      };

      emitTownControllerEvent('impostorPrivateUpdate', privateState);
      expect(roleSpy).toHaveBeenCalledTimes(1);
      expect(tasksSpy).toHaveBeenCalledTimes(1);

      // Same update again
      emitTownControllerEvent('impostorPrivateUpdate', privateState);
      expect(roleSpy).toHaveBeenCalledTimes(1);
      expect(tasksSpy).toHaveBeenCalledTimes(1);
    });

    it('Unsubscribes from TownController on destroy', () => {
      const controller = impostorControllerWithProps({ gameInstanceID: 'destroy-test' });
      const roleSpy = jest.fn();
      controller.addListener('roleChanged', roleSpy);

      controller.destroy();

      emitTownControllerEvent('impostorPrivateUpdate', {
        gameID: 'destroy-test',
        role: 'Crewmate',
        tasks: [],
      });

      expect(roleSpy).not.toHaveBeenCalled();
    });
  });

  describe('Event Diffing in _updateFrom', () => {
    it('Emits phaseChanged only when meetingPhase changes', () => {
      const controller = impostorControllerWithProps({
        meetingPhase: 'DISCUSSION',
      });
      const phaseSpy = jest.fn();
      controller.addListener('phaseChanged', phaseSpy);

      // Same phase update
      const sameModel = Object.assign({}, controller.toInteractableAreaModel());
      controller.updateFrom(sameModel, controller.occupants);
      expect(phaseSpy).not.toHaveBeenCalled();

      // Change phase to VOTING
      const nextModel = JSON.parse(JSON.stringify(sameModel));
      nextModel.game.state.meetingPhase = 'VOTING';
      controller.updateFrom(nextModel, controller.occupants);
      expect(phaseSpy).toHaveBeenCalledWith('VOTING');
      expect(phaseSpy).toHaveBeenCalledTimes(1);
    });

    it('Emits alivePlayersChanged and deadPlayersChanged only when player lists change', () => {
      const controller = impostorControllerWithProps({
        alivePlayers: [ourPlayer.id, otherPlayers[0].id],
        deadPlayers: [],
      });
      const aliveSpy = jest.fn();
      const deadSpy = jest.fn();
      controller.addListener('alivePlayersChanged', aliveSpy);
      controller.addListener('deadPlayersChanged', deadSpy);

      // Same model
      const sameModel = Object.assign({}, controller.toInteractableAreaModel());
      controller.updateFrom(sameModel, controller.occupants);
      expect(aliveSpy).not.toHaveBeenCalled();
      expect(deadSpy).not.toHaveBeenCalled();

      // One player dies
      const killModel = JSON.parse(JSON.stringify(sameModel));
      killModel.game.state.alivePlayers = [ourPlayer.id];
      killModel.game.state.deadPlayers = [otherPlayers[0].id];
      controller.updateFrom(killModel, controller.occupants);

      expect(aliveSpy).toHaveBeenCalledTimes(1);
      expect(deadSpy).toHaveBeenCalledTimes(1);
      expect(controller.alivePlayers.map((p: PlayerController) => p.id)).toEqual([ourPlayer.id]);
      expect(controller.deadPlayers.map((p: PlayerController) => p.id)).toEqual([
        otherPlayers[0].id,
      ]);
    });

    it('Emits taskProgressChanged only when completed or total tasks change', () => {
      const controller = impostorControllerWithProps({
        tasksCompleted: 1,
        totalTasks: 5,
      });
      const taskSpy = jest.fn();
      controller.addListener('taskProgressChanged', taskSpy);

      // Same model
      const sameModel = Object.assign({}, controller.toInteractableAreaModel());
      controller.updateFrom(sameModel, controller.occupants);
      expect(taskSpy).not.toHaveBeenCalled();

      // Update task progress
      const nextModel = JSON.parse(JSON.stringify(sameModel));
      nextModel.game.state.tasksCompleted = 2;
      controller.updateFrom(nextModel, controller.occupants);

      expect(taskSpy).toHaveBeenCalledWith(2, 5);
      expect(taskSpy).toHaveBeenCalledTimes(1);
    });

    it('Emits meetingCallerChanged, hasVotedChanged, ejectedPlayerChanged when changed', () => {
      const controller = impostorControllerWithProps({
        meetingCaller: undefined,
        hasVoted: [],
        ejectedPlayer: undefined,
      });
      const callerSpy = jest.fn();
      const votedSpy = jest.fn();
      const ejectedSpy = jest.fn();
      controller.addListener('meetingCallerChanged', callerSpy);
      controller.addListener('hasVotedChanged', votedSpy);
      controller.addListener('ejectedPlayerChanged', ejectedSpy);

      const nextModel = JSON.parse(JSON.stringify(controller.toInteractableAreaModel()));
      nextModel.game.state.meetingCaller = ourPlayer.id;
      nextModel.game.state.hasVoted = [ourPlayer.id];
      nextModel.game.state.ejectedPlayer = 'SKIP';
      controller.updateFrom(nextModel, controller.occupants);

      expect(callerSpy).toHaveBeenCalledWith(ourPlayer);
      expect(votedSpy).toHaveBeenCalledWith([ourPlayer]);
      expect(ejectedSpy).toHaveBeenCalledWith('SKIP');
    });

    it('Cleans up state when game becomes undefined', () => {
      const controller = impostorControllerWithProps({
        meetingPhase: 'VOTING',
        alivePlayers: [ourPlayer.id],
      });
      const phaseSpy = jest.fn();
      controller.addListener('phaseChanged', phaseSpy);

      const clearedModel = {
        id: controller.id,
        occupants: [],
        history: [],
        type: 'ImpostorArea' as const,
        game: undefined,
      };
      controller.updateFrom(clearedModel, []);

      expect(phaseSpy).toHaveBeenCalledWith(undefined);
      expect(controller.alivePlayers).toEqual([]);
    });
  });

  describe('Game Commands', () => {
    describe('startGame', () => {
      it('Throws NO_GAME_STARTABLE if status is not WAITING_TO_START', async () => {
        const controller = impostorControllerWithProps({
          status: 'WAITING_FOR_PLAYERS',
        });
        await expect(controller.startGame()).rejects.toThrow(NO_GAME_STARTABLE);
      });

      it('Sends StartGame command when status is WAITING_TO_START', async () => {
        const gameInstanceID = 'game-start-id';
        const controller = impostorControllerWithProps({
          status: 'WAITING_TO_START',
          gameInstanceID,
        });
        mockTownController.sendInteractableCommand.mockResolvedValueOnce(undefined);

        await controller.startGame();

        expect(mockTownController.sendInteractableCommand).toHaveBeenCalledWith(controller.id, {
          type: 'StartGame',
          gameID: gameInstanceID,
        });
      });
    });

    describe('Moves preconditions', () => {
      it('Throws NO_GAME_IN_PROGRESS_ERROR if game is not in progress', async () => {
        const controller = impostorControllerWithProps({
          status: 'WAITING_TO_START',
          players: [ourPlayer.id],
        });
        await expect(controller.callMeeting()).rejects.toThrow(NO_GAME_IN_PROGRESS_ERROR);
        await expect(controller.reportBody(otherPlayers[0].id)).rejects.toThrow(
          NO_GAME_IN_PROGRESS_ERROR,
        );
        await expect(controller.castVote('SKIP')).rejects.toThrow(NO_GAME_IN_PROGRESS_ERROR);
        await expect(controller.completeTask('t1')).rejects.toThrow(NO_GAME_IN_PROGRESS_ERROR);
        await expect(controller.killPlayer(otherPlayers[0].id)).rejects.toThrow(
          NO_GAME_IN_PROGRESS_ERROR,
        );
        await expect(controller.sabotage('LIGHTS')).rejects.toThrow(NO_GAME_IN_PROGRESS_ERROR);
      });

      it('Throws PLAYER_NOT_IN_GAME_ERROR if local player is not a player', async () => {
        const controller = impostorControllerWithProps({
          status: 'IN_PROGRESS',
          players: [otherPlayers[0].id],
        });
        await expect(controller.callMeeting()).rejects.toThrow(PLAYER_NOT_IN_GAME_ERROR);
        await expect(controller.reportBody(otherPlayers[0].id)).rejects.toThrow(
          PLAYER_NOT_IN_GAME_ERROR,
        );
        await expect(controller.castVote('SKIP')).rejects.toThrow(PLAYER_NOT_IN_GAME_ERROR);
        await expect(controller.completeTask('t1')).rejects.toThrow(PLAYER_NOT_IN_GAME_ERROR);
        await expect(controller.killPlayer(otherPlayers[0].id)).rejects.toThrow(
          PLAYER_NOT_IN_GAME_ERROR,
        );
        await expect(controller.sabotage('LIGHTS')).rejects.toThrow(PLAYER_NOT_IN_GAME_ERROR);
      });
    });

    describe('Valid moves', () => {
      let controller: ImpostorSessionController;
      const gameInstanceID = 'game-moves-id';

      beforeEach(() => {
        controller = impostorControllerWithProps({
          status: 'IN_PROGRESS',
          players: [ourPlayer.id, otherPlayers[0].id],
          gameInstanceID,
        });
        mockTownController.sendInteractableCommand.mockResolvedValue(undefined);
      });

      it('callMeeting sends CallMeeting move', async () => {
        await controller.callMeeting();
        expect(mockTownController.sendInteractableCommand).toHaveBeenCalledWith(controller.id, {
          type: 'ImpostorCommand',
          gameID: gameInstanceID,
          move: {
            moveType: 'CallMeeting',
          },
        });
      });

      it('reportBody sends ReportBody move with victimID', async () => {
        await controller.reportBody(otherPlayers[0].id);
        expect(mockTownController.sendInteractableCommand).toHaveBeenCalledWith(controller.id, {
          type: 'ImpostorCommand',
          gameID: gameInstanceID,
          move: {
            moveType: 'ReportBody',
            victimID: otherPlayers[0].id,
          },
        });
      });

      it('castVote sends CastVote move with PlayerID or SKIP', async () => {
        await controller.castVote(otherPlayers[0].id);
        expect(mockTownController.sendInteractableCommand).toHaveBeenCalledWith(controller.id, {
          type: 'ImpostorCommand',
          gameID: gameInstanceID,
          move: {
            moveType: 'CastVote',
            target: otherPlayers[0].id,
          },
        });

        await controller.castVote('SKIP');
        expect(mockTownController.sendInteractableCommand).toHaveBeenCalledWith(controller.id, {
          type: 'ImpostorCommand',
          gameID: gameInstanceID,
          move: {
            moveType: 'CastVote',
            target: 'SKIP',
          },
        });
      });

      it('completeTask sends CompleteTask move', async () => {
        await controller.completeTask('task-xyz');
        expect(mockTownController.sendInteractableCommand).toHaveBeenCalledWith(controller.id, {
          type: 'ImpostorCommand',
          gameID: gameInstanceID,
          move: {
            moveType: 'CompleteTask',
            taskID: 'task-xyz',
          },
        });
      });

      it('killPlayer sends KillPlayer move', async () => {
        await controller.killPlayer(otherPlayers[0].id);
        expect(mockTownController.sendInteractableCommand).toHaveBeenCalledWith(controller.id, {
          type: 'ImpostorCommand',
          gameID: gameInstanceID,
          move: {
            moveType: 'KillPlayer',
            victimID: otherPlayers[0].id,
          },
        });
      });

      it('sabotage sends Sabotage move', async () => {
        await controller.sabotage('OXYGEN');
        expect(mockTownController.sendInteractableCommand).toHaveBeenCalledWith(controller.id, {
          type: 'ImpostorCommand',
          gameID: gameInstanceID,
          move: {
            moveType: 'Sabotage',
            sabotageType: 'OXYGEN',
          },
        });
      });
    });
  });

  describe('React Hooks', () => {
    describe('useImpostorPhase', () => {
      let phaseValue: ImpostorMeetingPhase | undefined;
      function PhaseComponent({ controller }: { controller: ImpostorSessionController }) {
        phaseValue = useImpostorPhase(controller);
        return null;
      }

      it('Returns initial phase and updates on phaseChanged', () => {
        const controller = impostorControllerWithProps({
          meetingPhase: 'DISCUSSION',
        });
        render(React.createElement(PhaseComponent, { controller }));
        expect(phaseValue).toBe('DISCUSSION');

        act(() => {
          controller.emit('phaseChanged', 'VOTING');
        });
        expect(phaseValue).toBe('VOTING');

        act(() => {
          controller.emit('phaseChanged', undefined);
        });
        expect(phaseValue).toBeUndefined();

        cleanup();
      });
    });

    describe('useMyRole', () => {
      let roleValue: ImpostorRole | undefined;
      function RoleComponent({ controller }: { controller: ImpostorSessionController }) {
        roleValue = useMyRole(controller);
        return null;
      }

      it('Returns initial role and updates on roleChanged', () => {
        const controller = impostorControllerWithProps({});
        render(React.createElement(RoleComponent, { controller }));
        expect(roleValue).toBeUndefined();

        act(() => {
          controller.emit('roleChanged', 'Crewmate');
        });
        expect(roleValue).toBe('Crewmate');

        act(() => {
          controller.emit('roleChanged', 'Impostor');
        });
        expect(roleValue).toBe('Impostor');

        cleanup();
      });
    });
  });
});
