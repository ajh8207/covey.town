// AI assistance: written with Claude Code, prompted by Kush; see the PR discussion.
import { mockDeep, mockReset } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import InvalidParametersError from '../../../lib/InvalidParametersError';
import TwilioVideo from '../../../lib/TwilioVideo';
import { MockedPlayer, mockPlayer } from '../../../TestUtils';
import { Player as PlayerModel, PlayerID, TownEmitter } from '../../../types/CoveyTownSocket';
import Town from '../../Town';
import DevGhostControls from './DevGhostControls';

const mockTwilioVideo = mockDeep<TwilioVideo>();
jest.spyOn(TwilioVideo, 'getInstance').mockReturnValue(mockTwilioVideo);

describe('DevGhostControls (the dev stand-in for the session, on a real Town)', () => {
  const townEmitter = mockDeep<TownEmitter>();
  let town: Town;
  let controls: DevGhostControls;
  let alice: MockedPlayer;
  let bob: MockedPlayer;
  let carol: MockedPlayer;

  const idOf = (mockedPlayer: MockedPlayer): PlayerID => {
    if (!mockedPlayer.player) {
      throw new Error('Mocked player was not added to the town');
    }
    return mockedPlayer.player.id;
  };

  /** The `event` payloads about `subject` sent straight to `viewer`'s socket */
  const eventsAbout = (viewer: MockedPlayer, event: string, subject: MockedPlayer) =>
    viewer.socket.emit.mock.calls
      .filter(eachCall => eachCall[0] === event)
      .map(eachCall => eachCall[1] as PlayerModel)
      .filter(eachModel => eachModel.id === idOf(subject));

  const clearSentEvents = () => {
    mockReset(townEmitter);
    for (const eachPlayer of [alice, bob, carol]) {
      eachPlayer.socket.emit.mockClear();
    }
  };

  beforeEach(async () => {
    town = new Town(nanoid(), false, nanoid(), townEmitter);
    controls = new DevGhostControls(town);
    alice = mockPlayer(town.townID);
    bob = mockPlayer(town.townID);
    carol = mockPlayer(town.townID);
    alice.player = await town.addPlayer(alice.userName, alice.socket);
    bob.player = await town.addPlayer(bob.userName, bob.socket);
    carol.player = await town.addPlayer(carol.userName, carol.socket);
    clearSentEvents();
  });

  it('Classifies marked players as ghosts and everyone else as alive', () => {
    expect(controls.visibilityClassOf(idOf(alice))).toBe('alive');
    controls.makeGhost(alice.userName);
    expect(controls.visibilityClassOf(idOf(alice))).toBe('ghost');
    expect(controls.visibilityClassOf(idOf(bob))).toBe('alive');
  });

  it('Returns the IDs of the players it marked', () => {
    expect(controls.makeGhost(alice.userName)).toEqual([idOf(alice)]);
  });

  describe('When alice is made a ghost', () => {
    beforeEach(() => {
      controls.makeGhost(alice.userName);
    });
    it('Tells every living client that alice left, and tells alice nothing', () => {
      expect(eventsAbout(bob, 'playerDisconnect', alice)).toHaveLength(1);
      expect(eventsAbout(carol, 'playerDisconnect', alice)).toHaveLength(1);
      for (const eachSubject of [alice, bob, carol]) {
        expect(eventsAbout(alice, 'playerDisconnect', eachSubject)).toHaveLength(0);
      }
    });
    it('Sends no position of alice to the living, and still sends them to a second ghost', () => {
      controls.makeGhost(carol.userName);
      clearSentEvents();
      alice.moveTo(10, 20);
      expect(eventsAbout(bob, 'playerMoved', alice)).toHaveLength(0);
      expect(eventsAbout(carol, 'playerMoved', alice)).toHaveLength(1);
    });
    it('Lets a ghost keep seeing the living move', () => {
      clearSentEvents();
      bob.moveTo(30, 40);
      expect(eventsAbout(alice, 'playerMoved', bob)).toHaveLength(1);
    });
    it('Tells a second ghost about the first ghost and tells the living about the second', () => {
      clearSentEvents();
      controls.makeGhost(carol.userName);
      expect(eventsAbout(carol, 'playerJoined', alice)).toHaveLength(1);
      expect(eventsAbout(bob, 'playerDisconnect', carol)).toHaveLength(1);
      expect(eventsAbout(alice, 'playerDisconnect', carol)).toHaveLength(0);
    });
  });

  it('Changes nothing when no player has that name', () => {
    expect(() => controls.makeGhost('nobody')).toThrow(InvalidParametersError);
    for (const eachPlayer of [alice, bob, carol]) {
      expect(eachPlayer.socket.emit).not.toHaveBeenCalled();
    }
    alice.moveTo(10, 20); // still the starter's room broadcast: no policy was installed
    expect(townEmitter.emit).toHaveBeenCalledWith(
      'playerMoved',
      expect.objectContaining({ id: idOf(alice) }),
    );
  });

  describe('When the pretend game is cleared', () => {
    beforeEach(() => {
      controls.makeGhost(alice.userName);
      controls.makeGhost(carol.userName);
      clearSentEvents();
      controls.clear();
    });
    it('Tells the living about every ghost again', () => {
      expect(eventsAbout(bob, 'playerJoined', alice)).toHaveLength(1);
      expect(eventsAbout(bob, 'playerJoined', carol)).toHaveLength(1);
    });
    it('Forgets the ghosts and goes back to broadcasting moves', () => {
      expect(controls.visibilityClassOf(idOf(alice))).toBe('alive');
      clearSentEvents();
      alice.moveTo(10, 20);
      expect(townEmitter.emit).toHaveBeenCalledWith(
        'playerMoved',
        expect.objectContaining({ id: idOf(alice) }),
      );
      expect(eventsAbout(bob, 'playerMoved', alice)).toHaveLength(0);
    });
  });
});
