import { ITiledMap, ITiledMapObjectLayer } from '@jonbell/tiled-map-type-guard';
import { DeepMockProxy, mockClear, mockDeep, mockReset } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import Player from '../lib/Player';
import TwilioVideo from '../lib/TwilioVideo';
import {
  ClientEventTypes,
  expectArraysToContainSameMembers,
  getEventListener,
  getLastEmittedEvent,
  MockedPlayer,
  mockPlayer,
} from '../TestUtils';
import {
  ChatMessage,
  Interactable,
  Player as PlayerModel,
  PlayerID,
  PlayerLocation,
  TownEmitter,
  ViewingArea as ViewingAreaModel,
} from '../types/CoveyTownSocket';
import ConversationArea from './ConversationArea';
import SessionVisibilityPolicy, {
  VisibilityClass,
} from './impostor/visibility/SessionVisibilityPolicy';
import Town from './Town';

const mockTwilioVideo = mockDeep<TwilioVideo>();
jest.spyOn(TwilioVideo, 'getInstance').mockReturnValue(mockTwilioVideo);

type TestMapDict = {
  [key in string]: ITiledMap;
};
const testingMaps: TestMapDict = {
  twoConv: {
    tiledversion: '1.9.0',
    tileheight: 32,
    tilesets: [],
    tilewidth: 32,
    type: 'map',
    layers: [
      {
        id: 4,
        name: 'Objects',
        objects: [
          {
            type: 'ConversationArea',
            height: 237,
            id: 39,
            name: 'Name1',
            rotation: 0,
            visible: true,
            width: 326,
            x: 40,
            y: 120,
          },
          {
            type: 'ConversationArea',
            height: 266,
            id: 43,
            name: 'Name2',
            rotation: 0,
            visible: true,
            width: 467,
            x: 612,
            y: 120,
          },
        ],
        opacity: 1,
        type: 'objectgroup',
        visible: true,
        x: 0,
        y: 0,
      },
    ],
  },
  overlapping: {
    tiledversion: '1.9.0',
    tileheight: 32,
    tilesets: [],
    tilewidth: 32,
    type: 'map',
    layers: [
      {
        id: 4,
        name: 'Objects',
        objects: [
          {
            type: 'ConversationArea',
            height: 237,
            id: 39,
            name: 'Name1',
            rotation: 0,
            visible: true,
            width: 326,
            x: 40,
            y: 120,
          },
          {
            type: 'ConversationArea',
            height: 266,
            id: 43,
            name: 'Name2',
            rotation: 0,
            visible: true,
            width: 467,
            x: 40,
            y: 120,
          },
        ],
        opacity: 1,
        type: 'objectgroup',
        visible: true,
        x: 0,
        y: 0,
      },
    ],
  },
  noObjects: {
    tiledversion: '1.9.0',
    tileheight: 32,
    tilesets: [],
    tilewidth: 32,
    type: 'map',
    layers: [],
  },
  duplicateNames: {
    tiledversion: '1.9.0',
    tileheight: 32,
    tilesets: [],
    tilewidth: 32,
    type: 'map',
    layers: [
      {
        id: 4,
        name: 'Objects',
        objects: [
          {
            type: 'ConversationArea',
            height: 237,
            id: 39,
            name: 'Name1',
            rotation: 0,
            visible: true,
            width: 326,
            x: 40,
            y: 120,
          },
          {
            type: 'ConversationArea',
            height: 266,
            id: 43,
            name: 'Name1',
            rotation: 0,
            visible: true,
            width: 467,
            x: 612,
            y: 120,
          },
        ],
        opacity: 1,
        type: 'objectgroup',
        visible: true,
        x: 0,
        y: 0,
      },
    ],
  },
  twoViewing: {
    tiledversion: '1.9.0',
    tileheight: 32,
    tilesets: [],
    tilewidth: 32,
    type: 'map',
    layers: [
      {
        id: 4,
        name: 'Objects',
        objects: [
          {
            type: 'ViewingArea',
            height: 237,
            id: 39,
            name: 'Name1',
            rotation: 0,
            visible: true,
            width: 326,
            x: 40,
            y: 120,
          },
          {
            type: 'ViewingArea',
            height: 266,
            id: 43,
            name: 'Name2',
            rotation: 0,
            visible: true,
            width: 467,
            x: 612,
            y: 120,
          },
        ],
        opacity: 1,
        type: 'objectgroup',
        visible: true,
        x: 0,
        y: 0,
      },
    ],
  },
  twoConvOneViewing: {
    tiledversion: '1.9.0',
    tileheight: 32,
    tilesets: [],
    tilewidth: 32,
    type: 'map',
    layers: [
      {
        id: 4,
        name: 'Objects',
        objects: [
          {
            type: 'ConversationArea',
            height: 237,
            id: 39,
            name: 'Name1',
            rotation: 0,
            visible: true,
            width: 326,
            x: 40,
            y: 120,
          },
          {
            type: 'ConversationArea',
            height: 266,
            id: 43,
            name: 'Name2',
            rotation: 0,
            visible: true,
            width: 467,
            x: 612,
            y: 120,
          },
          {
            type: 'ViewingArea',
            height: 237,
            id: 54,
            name: 'Name3',
            properties: [
              {
                name: 'video',
                type: 'string',
                value: 'someURL',
              },
            ],
            rotation: 0,
            visible: true,
            width: 326,
            x: 155,
            y: 566,
          },
        ],
        opacity: 1,
        type: 'objectgroup',
        visible: true,
        x: 0,
        y: 0,
      },
    ],
  },
  twoConvTwoViewing: {
    tiledversion: '1.9.0',
    tileheight: 32,
    tilesets: [],
    tilewidth: 32,
    type: 'map',
    layers: [
      {
        id: 4,
        name: 'Objects',
        objects: [
          {
            type: 'ConversationArea',
            height: 237,
            id: 39,
            name: 'Name1',
            rotation: 0,
            visible: true,
            width: 326,
            x: 40,
            y: 120,
          },
          {
            type: 'ConversationArea',
            height: 266,
            id: 43,
            name: 'Name2',
            rotation: 0,
            visible: true,
            width: 467,
            x: 612,
            y: 120,
          },
          {
            type: 'ViewingArea',
            height: 237,
            id: 54,
            name: 'Name3',
            properties: [
              {
                name: 'video',
                type: 'string',
                value: 'someURL',
              },
            ],
            rotation: 0,
            visible: true,
            width: 326,
            x: 155,
            y: 566,
          },
          {
            type: 'ViewingArea',
            height: 237,
            id: 55,
            name: 'Name4',
            properties: [
              {
                name: 'video',
                type: 'string',
                value: 'someURL',
              },
            ],
            rotation: 0,
            visible: true,
            width: 326,
            x: 600,
            y: 1200,
          },
        ],
        opacity: 1,
        type: 'objectgroup',
        visible: true,
        x: 0,
        y: 0,
      },
    ],
  },
};

describe('Town', () => {
  const townEmitter: DeepMockProxy<TownEmitter> = mockDeep<TownEmitter>();
  let town: Town;
  let player: Player;
  let playerTestData: MockedPlayer;
  let playerID: PlayerID;

  beforeEach(async () => {
    town = new Town(nanoid(), false, nanoid(), townEmitter);
    playerTestData = mockPlayer(town.townID);
    player = await town.addPlayer(playerTestData.userName, playerTestData.socket);
    playerTestData.player = player;
    playerID = player.id;
    // Set this dummy player to be off the map so that they do not show up in conversation areas
    playerTestData.moveTo(-1, -1);

    mockReset(townEmitter);
  });

  it('constructor should set its properties', () => {
    const townName = `FriendlyNameTest-${nanoid()}`;
    const townID = nanoid();
    const testTown = new Town(townName, true, townID, townEmitter);
    expect(testTown.friendlyName).toBe(townName);
    expect(testTown.townID).toBe(townID);
    expect(testTown.isPubliclyListed).toBe(true);
  });
  describe('addPlayer', () => {
    it('should use the townID and player ID properties when requesting a video token', async () => {
      const newPlayer = mockPlayer(town.townID);
      mockTwilioVideo.getTokenForTown.mockClear();
      const newPlayerObj = await town.addPlayer(newPlayer.userName, newPlayer.socket);

      expect(mockTwilioVideo.getTokenForTown).toBeCalledTimes(1);
      expect(mockTwilioVideo.getTokenForTown).toBeCalledWith(town.townID, newPlayerObj.id);
    });
    it('should register callbacks for all client-to-server events', () => {
      const expectedEvents: ClientEventTypes[] = [
        'disconnect',
        'chatMessage',
        'playerMovement',
        'interactableUpdate',
      ];
      expectedEvents.forEach(eachEvent =>
        expect(getEventListener(playerTestData.socket, eachEvent)).toBeDefined(),
      );
    });
    describe('[T1] interactableUpdate callback', () => {
      let interactableUpdateHandler: (update: ViewingAreaModel) => void;
      beforeEach(() => {
        town.initializeFromMap(testingMaps.twoConvTwoViewing);
        interactableUpdateHandler = getEventListener(playerTestData.socket, 'interactableUpdate');
      });
      it('Should not throw an error for any interactable area that is not a viewing area', () => {
        expect(() =>
          interactableUpdateHandler({
            id: 'Name1',
            topic: nanoid(),
            occupantsByID: [],
          } as unknown as ViewingAreaModel),
        ).not.toThrowError();
      });
      it('Should not throw an error if there is no such viewing area', () => {
        expect(() =>
          interactableUpdateHandler({
            id: 'NotActuallyAnInteractable',
            topic: nanoid(),
            occupantsByID: [],
          } as unknown as ViewingAreaModel),
        ).not.toThrowError();
      });
      describe('When called passing a valid viewing area', () => {
        let newArea: ViewingAreaModel;
        let secondPlayer: MockedPlayer;
        beforeEach(async () => {
          newArea = {
            id: 'Name4',
            elapsedTimeSec: 0,
            isPlaying: true,
            video: nanoid(),
            occupants: [],
            type: 'ViewingArea',
          };
          expect(town.addViewingArea(newArea)).toBe(true);
          secondPlayer = mockPlayer(town.townID);
          mockTwilioVideo.getTokenForTown.mockClear();
          await town.addPlayer(secondPlayer.userName, secondPlayer.socket);

          newArea.elapsedTimeSec = 100;
          newArea.isPlaying = false;
          mockClear(townEmitter);

          mockClear(secondPlayer.socket);
          mockClear(secondPlayer.socketToRoomMock);
          interactableUpdateHandler(newArea);
        });
        it("Should emit the interactable update to the other players in the town using the player's townEmitter, after the viewing area was successfully created", () => {
          const updatedArea = town.getInteractable(newArea.id);
          expect(updatedArea.toModel()).toEqual(newArea);
        });
        it('Should update the model for the viewing area', () => {
          const lastUpdate = getLastEmittedEvent(
            playerTestData.socketToRoomMock,
            'interactableUpdate',
          );
          expect(lastUpdate).toEqual(newArea);
        });
        it('Should not emit interactableUpdate events to players directly, or to the whole town', () => {
          expect(() =>
            getLastEmittedEvent(playerTestData.socket, 'interactableUpdate'),
          ).toThrowError();
          expect(() => getLastEmittedEvent(townEmitter, 'interactableUpdate')).toThrowError();
          expect(() =>
            getLastEmittedEvent(secondPlayer.socket, 'interactableUpdate'),
          ).toThrowError();
          expect(() =>
            getLastEmittedEvent(secondPlayer.socketToRoomMock, 'interactableUpdate'),
          ).toThrowError();
        });
      });
    });
  });
  describe('Socket event listeners created in addPlayer', () => {
    describe('on socket disconnect', () => {
      function disconnectPlayer(playerToLeave: MockedPlayer) {
        // Call the disconnect event handler
        const disconnectHandler = getEventListener(playerToLeave.socket, 'disconnect');
        disconnectHandler('unknown');
      }
      it("Invalidates the players's session token", async () => {
        const token = player.sessionToken;

        expect(town.getPlayerBySessionToken(token)).toBe(player);
        disconnectPlayer(playerTestData);

        expect(town.getPlayerBySessionToken(token)).toEqual(undefined);
      });
      it('Informs all other players of the disconnection using the broadcast emitter', () => {
        const playerToLeaveID = player.id;

        disconnectPlayer(playerTestData);
        const callToDisconnect = getLastEmittedEvent(townEmitter, 'playerDisconnect');
        expect(callToDisconnect.id).toEqual(playerToLeaveID);
      });
      it('Removes the player from any active conversation area', () => {
        // Load in a map with a conversation area
        town.initializeFromMap(testingMaps.twoConvOneViewing);
        playerTestData.moveTo(45, 122); // Inside of "Name1" area
        expect(
          town.addConversationArea({
            id: 'Name1',
            topic: 'test',
            occupants: [],
            type: 'ConversationArea',
          }),
        ).toBeTruthy();
        const convArea = town.getInteractable('Name1') as ConversationArea;
        expect(convArea.occupantsByID).toEqual([player.id]);
        disconnectPlayer(playerTestData);
        expect(convArea.occupantsByID).toEqual([]);
        expect(town.occupancy).toBe(0);
      });

      it('Removes the player from any active viewing area', () => {
        // Load in a map with a conversation area
        town.initializeFromMap(testingMaps.twoConvOneViewing);
        playerTestData.moveTo(156, 567); // Inside of "Name3" area
        expect(
          town.addViewingArea({
            id: 'Name3',
            isPlaying: true,
            elapsedTimeSec: 0,
            video: nanoid(),
            occupants: [],
            type: 'ViewingArea',
          }),
        ).toBeTruthy();
        const viewingArea = town.getInteractable('Name3');
        expect(viewingArea.occupantsByID).toEqual([player.id]);
        disconnectPlayer(playerTestData);
        expect(viewingArea.occupantsByID).toEqual([]);
      });
    });
    describe('playerMovement', () => {
      const newLocation: PlayerLocation = {
        x: 100,
        y: 100,
        rotation: 'back',
        moving: true,
      };

      beforeEach(() => {
        playerTestData.moveTo(
          newLocation.x,
          newLocation.y,
          newLocation.rotation,
          newLocation.moving,
        );
      });

      it('Emits a playerMoved event', () => {
        const lastEmittedMovement = getLastEmittedEvent(townEmitter, 'playerMoved');
        expect(lastEmittedMovement.id).toEqual(playerTestData.player?.id);
        expect(lastEmittedMovement.location).toEqual(newLocation);
      });
      it("Updates the player's location", () => {
        expect(player.location).toEqual(newLocation);
      });
    });
    describe('interactableUpdate', () => {
      let interactableUpdateCallback: (update: Interactable) => void;
      let update: ViewingAreaModel;
      beforeEach(async () => {
        town.initializeFromMap(testingMaps.twoConvOneViewing);
        playerTestData.moveTo(156, 567); // Inside of "Name3" viewing area
        interactableUpdateCallback = getEventListener(playerTestData.socket, 'interactableUpdate');
        update = {
          id: 'Name3',
          isPlaying: true,
          elapsedTimeSec: 100,
          video: nanoid(),
          occupants: [],
          type: 'ViewingArea',
        };
        interactableUpdateCallback(update);
      });
      it('forwards updates to others in the town', () => {
        const lastEvent = getLastEmittedEvent(
          playerTestData.socketToRoomMock,
          'interactableUpdate',
        );
        expect(lastEvent).toEqual(update);
      });
      it('does not forward updates to the ENTIRE town', () => {
        expect(
          // getLastEmittedEvent will throw an error if no event was emitted, which we expect to be the case here
          () => getLastEmittedEvent(townEmitter, 'interactableUpdate'),
        ).toThrowError();
      });
      it('updates the local model for that interactable', () => {
        const interactable = town.getInteractable(update.id);
        expect(interactable?.toModel()).toEqual(update);
      });
    });
    it('Forwards chat messages to all players in the same town', async () => {
      const chatHandler = getEventListener(playerTestData.socket, 'chatMessage');
      const chatMessage: ChatMessage = {
        author: player.id,
        body: 'Test message',
        dateCreated: new Date(),
        sid: 'test message id',
      };

      chatHandler(chatMessage);

      const emittedMessage = getLastEmittedEvent(townEmitter, 'chatMessage');
      expect(emittedMessage).toEqual(chatMessage);
    });
  });
  describe('addConversationArea', () => {
    beforeEach(async () => {
      town.initializeFromMap(testingMaps.twoConvOneViewing);
    });
    it('Should return false if no area exists with that ID', () => {
      expect(
        town.addConversationArea({
          id: nanoid(),
          topic: nanoid(),
          occupants: [],
          type: 'ConversationArea',
        }),
      ).toEqual(false);
    });
    it('Should return false if the requested topic is empty', () => {
      expect(
        town.addConversationArea({
          id: 'Name1',
          topic: '',
          occupants: [],
          type: 'ConversationArea',
        }),
      ).toEqual(false);
      expect(
        town.addConversationArea({
          id: 'Name1',
          topic: undefined,
          occupants: [],
          type: 'ConversationArea',
        }),
      ).toEqual(false);
    });
    it('Should return false if the area already has a topic', () => {
      expect(
        town.addConversationArea({
          id: 'Name1',
          topic: 'new topic',
          occupants: [],
          type: 'ConversationArea',
        }),
      ).toEqual(true);
      expect(
        town.addConversationArea({
          id: 'Name1',
          topic: 'new new topic',
          occupants: [],
          type: 'ConversationArea',
        }),
      ).toEqual(false);
    });
    describe('When successful', () => {
      const newTopic = 'new topic';
      beforeEach(() => {
        playerTestData.moveTo(45, 122); // Inside of "Name1" area
        expect(
          town.addConversationArea({
            id: 'Name1',
            topic: newTopic,
            occupants: [],
            type: 'ConversationArea',
          }),
        ).toEqual(true);
      });
      it('Should update the local model for that area', () => {
        const convArea = town.getInteractable('Name1') as ConversationArea;
        expect(convArea.topic).toEqual(newTopic);
      });
      it('Should include any players in that area as occupants', () => {
        const convArea = town.getInteractable('Name1') as ConversationArea;
        expect(convArea.occupantsByID).toEqual([player.id]);
      });
      it('Should emit an interactableUpdate message', () => {
        const lastEmittedUpdate = getLastEmittedEvent(townEmitter, 'interactableUpdate');
        expect(lastEmittedUpdate).toEqual({
          id: 'Name1',
          topic: newTopic,
          occupants: [player.id],
          type: 'ConversationArea',
        });
      });
    });
  });
  describe('[T1] addViewingArea', () => {
    beforeEach(async () => {
      town.initializeFromMap(testingMaps.twoConvOneViewing);
    });
    it('Should return false if no area exists with that ID', () => {
      expect(
        town.addViewingArea({
          id: nanoid(),
          isPlaying: false,
          elapsedTimeSec: 0,
          video: nanoid(),
          occupants: [],
          type: 'ViewingArea',
        }),
      ).toBe(false);
    });
    it('Should return false if the requested video is empty', () => {
      expect(
        town.addViewingArea({
          id: 'Name3',
          isPlaying: false,
          elapsedTimeSec: 0,
          video: '',
          occupants: [],
          type: 'ViewingArea',
        }),
      ).toBe(false);
      expect(
        town.addViewingArea({
          id: 'Name3',
          isPlaying: false,
          elapsedTimeSec: 0,
          video: undefined,
          occupants: [],
          type: 'ViewingArea',
        }),
      ).toBe(false);
    });
    it('Should return false if the area is already active', () => {
      expect(
        town.addViewingArea({
          id: 'Name3',
          isPlaying: false,
          elapsedTimeSec: 0,
          video: 'test',
          occupants: [],
          type: 'ViewingArea',
        }),
      ).toBe(true);
      expect(
        town.addViewingArea({
          id: 'Name3',
          isPlaying: false,
          elapsedTimeSec: 0,
          video: 'test2',
          occupants: [],
          type: 'ViewingArea',
        }),
      ).toBe(false);
    });
    describe('When successful', () => {
      const newModel: ViewingAreaModel = {
        id: 'Name3',
        isPlaying: true,
        elapsedTimeSec: 100,
        video: nanoid(),
        occupants: [playerID],
        type: 'ViewingArea',
      };
      beforeEach(() => {
        playerTestData.moveTo(160, 570); // Inside of "Name3" area
        expect(town.addViewingArea(newModel)).toBe(true);
        newModel.occupants = [playerID];
      });

      it('Should update the local model for that area', () => {
        const viewingArea = town.getInteractable('Name3');
        expect(viewingArea.toModel()).toEqual(newModel);
      });

      it('Should emit an interactableUpdate message', () => {
        const lastEmittedUpdate = getLastEmittedEvent(townEmitter, 'interactableUpdate');
        expect(lastEmittedUpdate).toEqual(newModel);
      });
      it('Should include any players in that area as occupants', () => {
        const viewingArea = town.getInteractable('Name3');
        expect(viewingArea.occupantsByID).toEqual([player.id]);
      });
    });
  });

  describe('disconnectAllPlayers', () => {
    beforeEach(() => {
      town.disconnectAllPlayers();
    });
    it('Should emit the townClosing event', () => {
      getLastEmittedEvent(townEmitter, 'townClosing'); // Throws an error if no event existed
    });
    it("Should disconnect each players's socket", () => {
      expect(playerTestData.socket.disconnect).toBeCalledWith(true);
    });
  });
  describe('initializeFromMap', () => {
    const expectInitializingFromMapToThrowError = (map: ITiledMap) => {
      expect(() => town.initializeFromMap(map)).toThrowError();
    };
    it('Throws an error if there is no layer called "objects"', async () => {
      expectInitializingFromMapToThrowError(testingMaps.noObjects);
    });
    it('Throws an error if there are duplicate interactable object IDs', async () => {
      expectInitializingFromMapToThrowError(testingMaps.duplicateNames);
    });
    it('Throws an error if there are overlapping objects', async () => {
      expectInitializingFromMapToThrowError(testingMaps.overlapping);
    });
    it('Creates a ConversationArea instance for each region on the map', async () => {
      town.initializeFromMap(testingMaps.twoConv);
      const conv1 = town.getInteractable('Name1');
      const conv2 = town.getInteractable('Name2');
      expect(conv1.id).toEqual('Name1');
      expect(conv1.boundingBox).toEqual({ x: 40, y: 120, height: 237, width: 326 });
      expect(conv2.id).toEqual('Name2');
      expect(conv2.boundingBox).toEqual({ x: 612, y: 120, height: 266, width: 467 });
      expect(town.interactables.length).toBe(2);
    });
    it('Creates a ViewingArea instance for each region on the map', async () => {
      town.initializeFromMap(testingMaps.twoViewing);
      const viewingArea1 = town.getInteractable('Name1');
      const viewingArea2 = town.getInteractable('Name2');
      expect(viewingArea1.id).toEqual('Name1');
      expect(viewingArea1.boundingBox).toEqual({ x: 40, y: 120, height: 237, width: 326 });
      expect(viewingArea2.id).toEqual('Name2');
      expect(viewingArea2.boundingBox).toEqual({ x: 612, y: 120, height: 266, width: 467 });
      expect(town.interactables.length).toBe(2);
    });
    describe('Updating interactable state in playerMovements', () => {
      beforeEach(async () => {
        town.initializeFromMap(testingMaps.twoConvOneViewing);
        playerTestData.moveTo(51, 121);
        expect(
          town.addConversationArea({
            id: 'Name1',
            topic: 'test',
            occupants: [],
            type: 'ViewingArea',
          }),
        ).toBe(true);
      });
      it('Adds a player to a new interactable and sets their conversation label, if they move into it', async () => {
        const newPlayer = mockPlayer(town.townID);
        const newPlayerObj = await town.addPlayer(newPlayer.userName, newPlayer.socket);
        newPlayer.moveTo(51, 121);

        // Check that the player's location was updated
        expect(newPlayerObj.location.interactableID).toEqual('Name1');

        // Check that a movement event was emitted with the correct label
        const lastEmittedMovement = getLastEmittedEvent(townEmitter, 'playerMoved');
        expect(lastEmittedMovement.location.interactableID).toEqual('Name1');

        // Check that the conversation area occupants was updated
        const occupants = town.getInteractable('Name1').occupantsByID;
        expectArraysToContainSameMembers(occupants, [newPlayerObj.id, player.id]);
      });
      it('Removes a player from their prior interactable and sets their conversation label, if they moved outside of it', () => {
        expect(player.location.interactableID).toEqual('Name1');
        playerTestData.moveTo(0, 0);
        expect(player.location.interactableID).toBeUndefined();
      });
    });
  });
  describe('per-recipient playerMoved (visibility choke point)', () => {
    let alice: MockedPlayer;
    let bob: MockedPlayer;
    let carol: MockedPlayer;

    type PositionEvent = 'playerMoved' | 'playerJoined' | 'playerDisconnect';

    /** The `event` payloads about `subjectID` that were sent directly to `viewer`'s socket */
    function eventsSentTo(
      viewer: MockedPlayer,
      event: PositionEvent,
      subjectID: PlayerID,
    ): PlayerModel[] {
      return viewer.socket.emit.mock.calls
        .filter(eachCall => eachCall[0] === event)
        .map(eachCall => eachCall[1] as PlayerModel)
        .filter(eachModel => eachModel.id === subjectID);
    }

    function movesSentTo(viewer: MockedPlayer, subjectID: PlayerID): PlayerModel[] {
      return eventsSentTo(viewer, 'playerMoved', subjectID);
    }

    function idOf(mockedPlayer: MockedPlayer): PlayerID {
      if (!mockedPlayer.player) {
        throw new Error('Mocked player was not added to the town');
      }
      return mockedPlayer.player.id;
    }

    beforeEach(async () => {
      alice = mockPlayer(town.townID);
      bob = mockPlayer(town.townID);
      carol = mockPlayer(town.townID);
      alice.player = await town.addPlayer(alice.userName, alice.socket);
      bob.player = await town.addPlayer(bob.userName, bob.socket);
      carol.player = await town.addPlayer(carol.userName, carol.socket);
      mockReset(townEmitter);
      for (const eachPlayer of [playerTestData, alice, bob, carol]) {
        eachPlayer.socket.emit.mockClear();
      }
    });

    it('With no policy, broadcasts to the whole town and sends nothing per socket', () => {
      alice.moveTo(10, 20);
      const broadcast = getLastEmittedEvent(townEmitter, 'playerMoved');
      expect(broadcast.id).toEqual(idOf(alice));
      for (const eachPlayer of [playerTestData, alice, bob, carol]) {
        expect(movesSentTo(eachPlayer, idOf(alice))).toHaveLength(0);
      }
    });
    describe('With a policy that hides alice from carol', () => {
      beforeEach(() => {
        town.setVisibilityPolicy({
          canSee: (viewerID, subjectID) => !(viewerID === idOf(carol) && subjectID === idOf(alice)),
        });
      });
      it("Sends alice's move to every allowed viewer but not to carol", () => {
        alice.moveTo(10, 20, 'left', true);
        expect(movesSentTo(bob, idOf(alice))).toHaveLength(1);
        expect(movesSentTo(playerTestData, idOf(alice))).toHaveLength(1);
        expect(movesSentTo(carol, idOf(alice))).toHaveLength(0);
        expect(movesSentTo(bob, idOf(alice))[0].location).toEqual({
          x: 10,
          y: 20,
          rotation: 'left',
          moving: true,
          interactableID: undefined,
        });
      });
      it('Does not also broadcast the move to the town room', () => {
        alice.moveTo(10, 20);
        expect(() => getLastEmittedEvent(townEmitter, 'playerMoved')).toThrowError();
      });
      it('Still sends alice her own move (the client reads its interactableID from it)', () => {
        alice.moveTo(10, 20);
        expect(movesSentTo(alice, idOf(alice))).toHaveLength(1);
      });
      it("Still sends other players' moves to carol", () => {
        bob.moveTo(30, 40);
        expect(movesSentTo(carol, idOf(bob))).toHaveLength(1);
      });
      it('Restores the room broadcast when the policy is removed', () => {
        town.setVisibilityPolicy(undefined);
        alice.moveTo(10, 20);
        expect(getLastEmittedEvent(townEmitter, 'playerMoved').id).toEqual(idOf(alice));
        expect(movesSentTo(bob, idOf(alice))).toHaveLength(0);
      });
    });
    it('Sends a player their own move even when the policy hides them from everyone', () => {
      town.setVisibilityPolicy({ canSee: () => false });
      alice.moveTo(10, 20);
      expect(movesSentTo(alice, idOf(alice))).toHaveLength(1);
      expect(movesSentTo(bob, idOf(alice))).toHaveLength(0);
    });
    it('Stops sending moves to a player once they disconnect', () => {
      town.setVisibilityPolicy({ canSee: () => true });
      getEventListener(bob.socket, 'disconnect')('unknown');
      bob.socket.emit.mockClear();
      alice.moveTo(10, 20);
      expect(movesSentTo(bob, idOf(alice))).toHaveLength(0);
      expect(movesSentTo(carol, idOf(alice))).toHaveLength(1);
    });

    describe('interactable area paths (InteractableArea.add / remove)', () => {
      beforeEach(() => {
        town.initializeFromMap(testingMaps.twoConvOneViewing);
        alice.moveTo(45, 122); // Inside of "Name1" area, which is not active yet
        town.setVisibilityPolicy({
          canSee: (viewerID, subjectID) => !(viewerID === idOf(carol) && subjectID === idOf(alice)),
        });
        for (const eachPlayer of [playerTestData, alice, bob, carol]) {
          eachPlayer.socket.emit.mockClear();
        }
        mockReset(townEmitter);
      });
      it('Hides the add() update from carol when the area activates around alice', () => {
        expect(
          town.addConversationArea({
            id: 'Name1',
            topic: nanoid(),
            occupants: [],
            type: 'ConversationArea',
          }),
        ).toBe(true);
        expect(town.getInteractable('Name1').occupantsByID).toEqual([idOf(alice)]);
        expect(movesSentTo(bob, idOf(alice))).toHaveLength(1);
        expect(movesSentTo(bob, idOf(alice))[0].location.interactableID).toEqual('Name1');
        expect(movesSentTo(carol, idOf(alice))).toHaveLength(0);
        expect(() => getLastEmittedEvent(townEmitter, 'playerMoved')).toThrowError();
      });
      it('Hides the remove() update from carol when alice walks out of the area', () => {
        town.addConversationArea({
          id: 'Name1',
          topic: nanoid(),
          occupants: [],
          type: 'ConversationArea',
        });
        bob.socket.emit.mockClear();
        alice.moveTo(0, 0);
        // one update from remove() and one from the move itself
        expect(movesSentTo(bob, idOf(alice))).toHaveLength(2);
        expect(movesSentTo(carol, idOf(alice))).toHaveLength(0);
        expect(() => getLastEmittedEvent(townEmitter, 'playerMoved')).toThrowError();
      });
      it('Hides the remove() update from carol when alice disconnects inside the area', () => {
        town.addConversationArea({
          id: 'Name1',
          topic: nanoid(),
          occupants: [],
          type: 'ConversationArea',
        });
        bob.socket.emit.mockClear();
        getEventListener(alice.socket, 'disconnect')('unknown');
        expect(movesSentTo(bob, idOf(alice))).toHaveLength(1);
        expect(movesSentTo(carol, idOf(alice))).toHaveLength(0);
      });
      it('Broadcasts area updates to the whole town when no policy is installed', () => {
        town.setVisibilityPolicy(undefined);
        town.addConversationArea({
          id: 'Name1',
          topic: nanoid(),
          occupants: [],
          type: 'ConversationArea',
        });
        expect(getLastEmittedEvent(townEmitter, 'playerMoved').id).toEqual(idOf(alice));
        expect(movesSentTo(carol, idOf(alice))).toHaveLength(0);
      });
    });

    describe('playerJoined path', () => {
      let dave: MockedPlayer;
      beforeEach(() => {
        dave = mockPlayer(town.townID);
      });
      it('Broadcasts to the whole town when no policy is installed', async () => {
        dave.player = await town.addPlayer(dave.userName, dave.socket);
        expect(getLastEmittedEvent(townEmitter, 'playerJoined').id).toEqual(idOf(dave));
        for (const eachPlayer of [alice, bob, carol]) {
          expect(eventsSentTo(eachPlayer, 'playerJoined', idOf(dave))).toHaveLength(0);
        }
      });
      describe('With a policy that hides every newcomer from carol', () => {
        beforeEach(() => {
          const known = new Set([playerTestData, alice, bob, carol].map(idOf));
          town.setVisibilityPolicy({
            canSee: (viewerID, subjectID) => !(viewerID === idOf(carol) && !known.has(subjectID)),
          });
        });
        it('Does not tell carol about the newcomer, and tells everyone else', async () => {
          dave.player = await town.addPlayer(dave.userName, dave.socket);
          expect(eventsSentTo(carol, 'playerJoined', idOf(dave))).toHaveLength(0);
          expect(eventsSentTo(bob, 'playerJoined', idOf(dave))).toHaveLength(1);
          expect(eventsSentTo(alice, 'playerJoined', idOf(dave))).toHaveLength(1);
          expect(() => getLastEmittedEvent(townEmitter, 'playerJoined')).toThrowError();
        });
        it('Still tells the newcomer about themself', async () => {
          dave.player = await town.addPlayer(dave.userName, dave.socket);
          expect(eventsSentTo(dave, 'playerJoined', idOf(dave))).toHaveLength(1);
        });
      });
    });

    describe('playerDisconnect path (the model carries the last location)', () => {
      it('Broadcasts to the whole town when no policy is installed', () => {
        getEventListener(alice.socket, 'disconnect')('unknown');
        expect(getLastEmittedEvent(townEmitter, 'playerDisconnect').id).toEqual(idOf(alice));
      });
      it('Asks the policy about a leaving player while they are still in the player list', () => {
        const subjectWasListed: boolean[] = [];
        town.setVisibilityPolicy({
          canSee: (_viewerID, subjectID) => {
            subjectWasListed.push(town.players.some(eachPlayer => eachPlayer.id === subjectID));
            return true;
          },
        });
        getEventListener(alice.socket, 'disconnect')('unknown');
        expect(subjectWasListed.length).toBeGreaterThan(0);
        expect(subjectWasListed.every(Boolean)).toBe(true);
      });
      it("Does not send alice's last location to carol, who could not see her", () => {
        town.setVisibilityPolicy({
          canSee: (viewerID, subjectID) => !(viewerID === idOf(carol) && subjectID === idOf(alice)),
        });
        getEventListener(alice.socket, 'disconnect')('unknown');
        expect(eventsSentTo(carol, 'playerDisconnect', idOf(alice))).toHaveLength(0);
        expect(eventsSentTo(bob, 'playerDisconnect', idOf(alice))).toHaveLength(1);
        expect(() => getLastEmittedEvent(townEmitter, 'playerDisconnect')).toThrowError();
      });
    });

    describe('getPlayerModelsVisibleTo (the initialize snapshot)', () => {
      const idsFor = (viewer: MockedPlayer) =>
        town.getPlayerModelsVisibleTo(idOf(viewer)).map(eachModel => eachModel.id);
      it('Returns every player when no policy is installed', () => {
        const everyone = [playerTestData, alice, bob, carol].map(idOf);
        expect(idsFor(carol)).toEqual(expect.arrayContaining(everyone));
        expect(idsFor(carol)).toHaveLength(everyone.length);
      });
      it('Leaves out players the policy hides from the viewer', () => {
        town.setVisibilityPolicy({
          canSee: (viewerID, subjectID) => !(viewerID === idOf(carol) && subjectID === idOf(alice)),
        });
        expect(idsFor(carol)).not.toContain(idOf(alice));
        expect(idsFor(carol)).toContain(idOf(bob));
        expect(idsFor(bob)).toContain(idOf(alice));
      });
      it('Always includes the viewer, because the client finds itself in the list', () => {
        town.setVisibilityPolicy({ canSee: () => false });
        expect(idsFor(carol)).toEqual([idOf(carol)]);
      });
    });

    // AI assistance: written with Claude Code, prompted by Kush; see the PR discussion.
    describe('With the session policy installed', () => {
      // Covers the events that carry a player model. Area updates (interactableUpdate) are
      // covered by the 2.B1b block further down.
      const classByPlayer = new Map<PlayerID, VisibilityClass>();
      let dave: MockedPlayer;

      /** Names of the position, join and disconnect events about `subject` sent to `viewer` */
      function eventsAbout(viewer: MockedPlayer, subject: MockedPlayer): string[] {
        return (['playerMoved', 'playerJoined', 'playerDisconnect'] as PositionEvent[]).flatMap(
          eachEvent => eventsSentTo(viewer, eachEvent, idOf(subject)).map(() => eachEvent),
        );
      }

      /** A sorted copy, so a check compares counts per event and ignores their order */
      const sorted = (events: string[]) => [...events].sort();

      beforeEach(async () => {
        town.initializeFromMap(testingMaps.twoConvOneViewing);
        classByPlayer.clear();
        classByPlayer.set(idOf(playerTestData), 'alive');
        classByPlayer.set(idOf(bob), 'alive');
        classByPlayer.set(idOf(alice), 'ghost');
        classByPlayer.set(idOf(carol), 'ghost');
        // A player who joins during the game is a spectator (design doc §15.8)
        town.setVisibilityPolicy(
          new SessionVisibilityPolicy({
            visibilityClassOf: classifiedID => classByPlayer.get(classifiedID) ?? 'spectator',
          }),
        );
        for (const eachPlayer of [playerTestData, alice, bob, carol]) {
          eachPlayer.socket.emit.mockClear();
        }
        mockReset(townEmitter);

        // Every path that carries a player model, run by ghosts and a spectator
        alice.moveTo(10, 20); // Town._updatePlayerLocation
        alice.moveTo(45, 122); // into the "Name1" area, which is not active yet
        town.addConversationArea({
          id: 'Name1',
          topic: nanoid(),
          occupants: [],
          type: 'ConversationArea',
        }); // InteractableArea.add for alice
        carol.moveTo(45, 122); // InteractableArea.add for carol, while the area is active
        alice.moveTo(0, 0); // InteractableArea.remove
        getEventListener(carol.socket, 'disconnect')('unknown'); // remove + playerDisconnect
        dave = mockPlayer(town.townID);
        dave.player = await town.addPlayer(dave.userName, dave.socket); // playerJoined
        dave.moveTo(5, 5);
        playerTestData.moveTo(7, 7); // a living player, as a control
      });

      it('Sends no position, join or disconnect events for a ghost on any path', () => {
        for (const eachLiving of [playerTestData, bob]) {
          expect(eventsAbout(eachLiving, alice)).toEqual([]);
          expect(eventsAbout(eachLiving, carol)).toEqual([]);
        }
        expect(() => getLastEmittedEvent(townEmitter, 'playerMoved')).toThrowError();
        expect(() => getLastEmittedEvent(townEmitter, 'playerJoined')).toThrowError();
        expect(() => getLastEmittedEvent(townEmitter, 'playerDisconnect')).toThrowError();
      });
      it('Sends no position or join events for a spectator who joined mid-game', () => {
        expect(eventsAbout(playerTestData, dave)).toEqual([]);
        expect(eventsAbout(bob, dave)).toEqual([]);
      });
      it('Sends ghosts every one of those events (so every path above really ran)', () => {
        expect(sorted(eventsAbout(carol, alice))).toEqual(
          sorted(['playerMoved', 'playerMoved', 'playerMoved', 'playerMoved', 'playerMoved']),
        );
        expect(sorted(eventsAbout(alice, carol))).toEqual(
          sorted(['playerMoved', 'playerMoved', 'playerMoved', 'playerDisconnect']),
        );
        expect(sorted(eventsAbout(alice, dave))).toEqual(sorted(['playerJoined', 'playerMoved']));
      });
      it('Still sends living players to everyone', () => {
        for (const eachViewer of [alice, bob, dave]) {
          expect(eventsAbout(eachViewer, playerTestData)).toEqual(['playerMoved']);
        }
      });
      it("Leaves ghosts and spectators out of a living player's initialize snapshot", () => {
        const snapshotIDs = town.getPlayerModelsVisibleTo(idOf(bob)).map(eachModel => eachModel.id);
        expect(snapshotIDs).toEqual(expect.arrayContaining([idOf(bob), idOf(playerTestData)]));
        expect(snapshotIDs).toHaveLength(2);
        expect(town.getPlayerModelsVisibleTo(idOf(alice))).toHaveLength(4);
      });
    });

    // AI assistance: written with Claude Code, prompted by Kush; see the PR discussion.
    describe('resyncPositions (SessionHost)', () => {
      const classByPlayer = new Map<PlayerID, VisibilityClass>();
      let isAliceVenting: boolean;
      let dave: MockedPlayer;

      /** The joins and disconnects sent to `viewer`, as 'event:subjectName' strings */
      function listChangesSentTo(viewer: MockedPlayer): string[] {
        const names = new Map(
          [playerTestData, alice, bob, carol, dave].map(eachPlayer => [
            eachPlayer.player?.id,
            eachPlayer === playerTestData ? 'tester' : eachPlayer.userName,
          ]),
        );
        return viewer.socket.emit.mock.calls
          .filter(eachCall => eachCall[0] === 'playerJoined' || eachCall[0] === 'playerDisconnect')
          .map(eachCall => `${eachCall[0]}:${names.get((eachCall[1] as PlayerModel).id)}`);
      }

      function clearSentEvents(): void {
        for (const eachPlayer of [playerTestData, alice, bob, carol, dave]) {
          eachPlayer.socket.emit.mockClear();
        }
        mockReset(townEmitter);
      }

      const joined = (subject: MockedPlayer) => `playerJoined:${subject.userName}`;
      const left = (subject: MockedPlayer) => `playerDisconnect:${subject.userName}`;

      /** Installs the session policy, plus a DS-5 style rule hiding a venting alice */
      function startGame(): void {
        town.setVisibilityPolicy(
          new SessionVisibilityPolicy(
            { visibilityClassOf: classifiedID => classByPlayer.get(classifiedID) ?? 'spectator' },
            [
              {
                name: 'alice is in a vent',
                hides: (viewerID, subjectID) =>
                  isAliceVenting &&
                  subjectID === idOf(alice) &&
                  classByPlayer.get(viewerID) === 'alive',
              },
            ],
          ),
        );
        town.resyncPositions();
      }

      beforeEach(() => {
        dave = mockPlayer(town.townID);
        isAliceVenting = false;
        classByPlayer.clear();
        for (const eachPlayer of [playerTestData, alice, bob, carol]) {
          classByPlayer.set(idOf(eachPlayer), 'alive');
        }
        alice.moveTo(10, 20);
        clearSentEvents();
      });

      describe('With no policy installed', () => {
        it('Sends nothing, per socket or to the town room', () => {
          town.resyncPositions();
          for (const eachPlayer of [playerTestData, alice, bob, carol]) {
            expect(eachPlayer.socket.emit).not.toHaveBeenCalled();
          }
          expect(townEmitter.emit).not.toHaveBeenCalled();
        });
        it('Still sends nothing after a player joins and another leaves', async () => {
          dave.player = await town.addPlayer(dave.userName, dave.socket);
          getEventListener(bob.socket, 'disconnect')('unknown');
          clearSentEvents();
          town.resyncPositions();
          for (const eachPlayer of [playerTestData, alice, carol, dave]) {
            expect(eachPlayer.socket.emit).not.toHaveBeenCalled();
          }
        });
        it('Remembers broadcast joins: hiding the newcomer later tells everyone else', async () => {
          dave.player = await town.addPlayer(dave.userName, dave.socket);
          clearSentEvents();
          startGame(); // dave is not in the roster, so he is a spectator
          for (const eachPlayer of [playerTestData, alice, bob, carol]) {
            expect(listChangesSentTo(eachPlayer)).toEqual([left(dave)]);
          }
          expect(listChangesSentTo(dave)).toEqual([]);
        });
      });

      describe('During a game', () => {
        beforeEach(() => {
          startGame();
        });
        it('Sends nothing at game start when everyone is alive', () => {
          for (const eachPlayer of [playerTestData, alice, bob, carol]) {
            expect(eachPlayer.socket.emit).not.toHaveBeenCalled();
          }
        });
        describe('After alice dies (marked dead, then resync)', () => {
          beforeEach(() => {
            clearSentEvents();
            classByPlayer.set(idOf(alice), 'ghost');
            town.resyncPositions();
          });
          it('Tells each living player once that alice left, and nothing else', () => {
            for (const eachLiving of [playerTestData, bob, carol]) {
              expect(listChangesSentTo(eachLiving)).toEqual([left(alice)]);
            }
          });
          it('Sends the living only the location they already had for alice', () => {
            const sentModel = eventsSentTo(bob, 'playerDisconnect', idOf(alice))[0];
            expect(sentModel.location).toMatchObject({ x: 10, y: 20 });
          });
          it('Sends alice nothing: as a ghost she keeps seeing everyone', () => {
            expect(alice.socket.emit).not.toHaveBeenCalled();
            bob.moveTo(30, 40);
            expect(eventsSentTo(alice, 'playerMoved', idOf(bob))).toHaveLength(1);
          });
          it("Stops alice's moves reaching the living", () => {
            alice.moveTo(50, 60);
            for (const eachLiving of [playerTestData, bob, carol]) {
              expect(eventsSentTo(eachLiving, 'playerMoved', idOf(alice))).toHaveLength(0);
            }
            expect(eventsSentTo(alice, 'playerMoved', idOf(alice))).toHaveLength(1);
          });
          it('Sends nothing on a second resync with no change', () => {
            clearSentEvents();
            town.resyncPositions();
            for (const eachPlayer of [playerTestData, alice, bob, carol]) {
              expect(eachPlayer.socket.emit).not.toHaveBeenCalled();
            }
          });
          it('Shows alice again to carol when carol dies too, and tells only carol', () => {
            clearSentEvents();
            classByPlayer.set(idOf(carol), 'ghost');
            town.resyncPositions();
            expect(listChangesSentTo(carol)).toEqual([joined(alice)]);
            expect(listChangesSentTo(alice)).toEqual([]);
            expect(listChangesSentTo(bob)).toEqual([left(carol)]);
            expect(listChangesSentTo(playerTestData)).toEqual([left(carol)]);
          });
          it('Restores alice for everyone at game end (policy removed, then resync)', () => {
            alice.moveTo(70, 80);
            clearSentEvents();
            town.setVisibilityPolicy(undefined);
            town.resyncPositions();
            for (const eachLiving of [playerTestData, bob, carol]) {
              expect(listChangesSentTo(eachLiving)).toEqual([joined(alice)]);
              const sentModel = eventsSentTo(eachLiving, 'playerJoined', idOf(alice))[0];
              expect(sentModel.location).toMatchObject({ x: 70, y: 80 });
            }
            expect(alice.socket.emit).not.toHaveBeenCalled();
            alice.moveTo(90, 90);
            expect(getLastEmittedEvent(townEmitter, 'playerMoved').id).toEqual(idOf(alice));
          });
          it('Forgets alice when she leaves: game end then sends nothing about her', () => {
            getEventListener(alice.socket, 'disconnect')('unknown');
            expect(eventsSentTo(bob, 'playerDisconnect', idOf(alice))).toHaveLength(1);
            clearSentEvents();
            town.setVisibilityPolicy(undefined);
            town.resyncPositions();
            for (const eachPlayer of [playerTestData, bob, carol]) {
              expect(eachPlayer.socket.emit).not.toHaveBeenCalled();
            }
          });
        });
        describe('When dave joins mid-game (a spectator)', () => {
          beforeEach(async () => {
            dave.player = await town.addPlayer(dave.userName, dave.socket);
          });
          it('Tells only dave about himself, and the living nothing', () => {
            expect(listChangesSentTo(dave)).toEqual([joined(dave)]);
            for (const eachPlayer of [playerTestData, alice, bob, carol]) {
              expect(listChangesSentTo(eachPlayer)).toEqual([]);
            }
          });
          it('Sends nothing on resync: his snapshot already held everyone', () => {
            expect(town.getPlayerModelsVisibleTo(idOf(dave))).toHaveLength(5);
            clearSentEvents();
            town.resyncPositions();
            for (const eachPlayer of [playerTestData, alice, bob, carol, dave]) {
              expect(eachPlayer.socket.emit).not.toHaveBeenCalled();
            }
          });
          it('Shows dave to everyone at game end', () => {
            clearSentEvents();
            town.setVisibilityPolicy(undefined);
            town.resyncPositions();
            for (const eachPlayer of [playerTestData, alice, bob, carol]) {
              expect(listChangesSentTo(eachPlayer)).toEqual([joined(dave)]);
            }
            expect(dave.socket.emit).not.toHaveBeenCalled();
          });
        });
        describe('When alice enters and leaves a vent (resync after each change)', () => {
          beforeEach(() => {
            classByPlayer.set(idOf(carol), 'ghost');
            town.resyncPositions();
            clearSentEvents();
            isAliceVenting = true;
            town.resyncPositions();
          });
          it('Hides alice from the living, but not from the ghost carol', () => {
            expect(listChangesSentTo(bob)).toEqual([left(alice)]);
            expect(listChangesSentTo(playerTestData)).toEqual([left(alice)]);
            expect(listChangesSentTo(carol)).toEqual([]);
          });
          it('Shows alice again where she came out of the vent', () => {
            alice.moveTo(55, 66);
            clearSentEvents();
            isAliceVenting = false;
            town.resyncPositions();
            expect(listChangesSentTo(bob)).toEqual([joined(alice)]);
            const sentModel = eventsSentTo(bob, 'playerJoined', idOf(alice))[0];
            expect(sentModel.location).toMatchObject({ x: 55, y: 66 });
            expect(listChangesSentTo(carol)).toEqual([]);
          });
        });
      });
    });

    // AI assistance: written with Claude Code, prompted by Kush; see the PR discussion.
    describe('Area updates and the initialize interactables (2.B1b)', () => {
      const classByPlayer = new Map<PlayerID, VisibilityClass>();
      let dave: MockedPlayer;

      /** twoConvOneViewing plus the tic-tac-toe area 'Game1', which is always active */
      function mapWithGameArea(): ITiledMap {
        const map = JSON.parse(JSON.stringify(testingMaps.twoConvOneViewing)) as ITiledMap;
        (map.layers[0] as ITiledMapObjectLayer).objects.push({
          type: 'GameArea',
          height: 200,
          id: 60,
          name: 'Game1',
          properties: [{ name: 'type', type: 'string', value: 'TicTacToe' }],
          rotation: 0,
          visible: true,
          width: 200,
          x: 700,
          y: 600,
        });
        return map;
      }

      /** The interactableUpdate payloads sent directly to `viewer`'s socket, oldest first */
      function areaUpdatesSentTo(viewer: MockedPlayer): Interactable[] {
        return viewer.socket.emit.mock.calls
          .filter(eachCall => eachCall[0] === 'interactableUpdate')
          .map(eachCall => eachCall[1] as Interactable);
      }

      /** The occupant lists of every update about `areaID` sent to `viewer`, oldest first */
      function occupantsSentTo(viewer: MockedPlayer, areaID: string): PlayerID[][] {
        return areaUpdatesSentTo(viewer)
          .filter(eachModel => eachModel.id === areaID)
          .map(eachModel => eachModel.occupants);
      }

      /** The names of the events sent directly to `viewer`'s socket, in order */
      function eventNamesSentTo(viewer: MockedPlayer): string[] {
        return viewer.socket.emit.mock.calls.map(eachCall => eachCall[0] as string);
      }

      function clearSentEvents(): void {
        for (const eachPlayer of [playerTestData, alice, bob, carol, dave]) {
          eachPlayer.socket.emit.mockClear();
          eachPlayer.socketToRoomMock.emit.mockClear();
        }
        mockReset(townEmitter);
      }

      function expectNothingSent(): void {
        for (const eachPlayer of [playerTestData, alice, bob, carol, dave]) {
          expect(eachPlayer.socket.emit).not.toHaveBeenCalled();
        }
        expect(townEmitter.emit).not.toHaveBeenCalled();
      }

      function startGame(): void {
        town.setVisibilityPolicy(
          new SessionVisibilityPolicy({
            visibilityClassOf: classifiedID => classByPlayer.get(classifiedID) ?? 'spectator',
          }),
        );
        town.resyncPositions();
      }

      const createName1 = () =>
        town.addConversationArea({
          id: 'Name1',
          topic: nanoid(),
          occupants: [],
          type: 'ConversationArea',
        });

      beforeEach(() => {
        town.initializeFromMap(mapWithGameArea());
        dave = mockPlayer(town.townID);
        classByPlayer.clear();
        for (const eachPlayer of [playerTestData, alice, bob, carol]) {
          classByPlayer.set(idOf(eachPlayer), 'alive');
        }
        clearSentEvents();
      });

      describe('With no policy installed (the starter behavior)', () => {
        beforeEach(() => {
          alice.moveTo(45, 122); // into Name1, which is not active yet
          createName1();
          carol.moveTo(750, 650); // into Game1
        });
        it('Broadcasts full occupant lists to the town and sends none per socket', () => {
          const broadcastAreas = townEmitter.emit.mock.calls
            .filter(eachCall => eachCall[0] === 'interactableUpdate')
            .map(eachCall => eachCall[1] as Interactable);
          expect(broadcastAreas.map(eachModel => [eachModel.id, eachModel.occupants])).toEqual([
            ['Name1', [idOf(alice)]],
            ['Name1', [idOf(alice)]],
            ['Game1', [idOf(carol)]],
          ]);
          for (const eachPlayer of [playerTestData, alice, bob, carol]) {
            expect(areaUpdatesSentTo(eachPlayer)).toEqual([]);
          }
        });
        it('Puts every area, unchanged, in the initialize interactables', () => {
          expect(town.getInteractableModelsVisibleTo(idOf(bob))).toEqual(
            town.interactables.map(eachArea => eachArea.toModel()),
          );
        });
        it('Sends nothing on resync', () => {
          clearSentEvents();
          town.resyncPositions();
          expectNothingSent();
        });
        it('Still relays a viewing area update from a client to the rest of the town', () => {
          const update = { ...town.getInteractable('Name3').toModel(), isPlaying: true };
          getEventListener(bob.socket, 'interactableUpdate')(update as ViewingAreaModel);
          expect(getLastEmittedEvent(bob.socketToRoomMock, 'interactableUpdate')).toBe(update);
        });
      });

      it('Sends nothing at game start when everyone is alive, even with occupied areas', () => {
        alice.moveTo(45, 122);
        createName1();
        carol.moveTo(750, 650);
        clearSentEvents();
        startGame();
        expectNothingSent();
      });

      describe('During a game with ghosts (alice, carol) and a spectator (dave)', () => {
        beforeEach(async () => {
          classByPlayer.set(idOf(alice), 'ghost');
          classByPlayer.set(idOf(carol), 'ghost');
          startGame();
          clearSentEvents();
          // Every path that sends an area model, with ghosts, the living and a spectator in it
          alice.moveTo(45, 122); // into Name1, which is not active yet
          createName1(); // add() for alice, then addConversationArea's own update
          bob.moveTo(60, 130); // add() into the active Name1
          carol.moveTo(750, 650); // add() into Game1
          alice.moveTo(160, 600); // remove() from Name1; Name3 is not active yet
          town.addViewingArea({
            id: 'Name3',
            video: nanoid(),
            isPlaying: false,
            elapsedTimeSec: 0,
            occupants: [],
            type: 'ViewingArea',
          }); // add() for alice, then addViewingArea's own update
          // alice's client reports the video playing, listing the occupants it sees
          const aliceUpdate = {
            ...town.getInteractable('Name3').toModel(),
            isPlaying: true,
            occupants: [idOf(alice), idOf(carol)],
          };
          getEventListener(alice.socket, 'interactableUpdate')(aliceUpdate as ViewingAreaModel);
          getEventListener(carol.socket, 'disconnect')('unknown'); // remove() from Game1
          dave.player = await town.addPlayer(dave.userName, dave.socket);
          dave.moveTo(70, 140); // add() into Name1
        });

        it("Never sends a living player a ghost's or spectator's ID in an area update", () => {
          const hiddenIDs = [alice, carol, dave].map(idOf);
          for (const eachLiving of [playerTestData, bob]) {
            expect(areaUpdatesSentTo(eachLiving)).toHaveLength(4);
            for (const eachUpdate of areaUpdatesSentTo(eachLiving)) {
              for (const eachID of hiddenIDs) {
                expect(JSON.stringify(eachUpdate)).not.toContain(eachID);
              }
            }
          }
          expect(() => getLastEmittedEvent(townEmitter, 'interactableUpdate')).toThrowError();
          expect(() => getLastEmittedEvent(alice.socketToRoomMock, 'interactableUpdate')).toThrow();
        });
        it('Still lists the living occupants for the living', () => {
          // Name1 gets its topic, then bob walks in
          expect(occupantsSentTo(bob, 'Name1')).toEqual([[], [idOf(bob)]]);
          // Name3 gets its video, then alice's client starts it
          expect(occupantsSentTo(playerTestData, 'Name3')).toEqual([[], []]);
        });
        it('Sends the living nothing when only a hidden player comes or goes', () => {
          // carol entered and left Game1; alice left Name1 and dave entered it
          expect(occupantsSentTo(bob, 'Game1')).toEqual([]);
          expect(occupantsSentTo(playerTestData, 'Game1')).toEqual([]);
          expect(occupantsSentTo(bob, 'Name1')).toHaveLength(2);
        });
        it('Sends ghosts the full occupant list of every area', () => {
          expect(occupantsSentTo(alice, 'Name1')).toEqual([
            [idOf(alice)],
            [idOf(alice), idOf(bob)],
            [idOf(bob)],
            [idOf(bob), idOf(dave)],
          ]);
          expect(occupantsSentTo(alice, 'Game1')).toEqual([[idOf(carol)], []]);
          expect(occupantsSentTo(alice, 'Name3')).toEqual([[idOf(alice)]]);
        });
        it("Sends the others the server's viewing area model, not the client's own", () => {
          const relayed = areaUpdatesSentTo(bob).filter(eachModel => eachModel.id === 'Name3');
          expect(relayed.pop()).toMatchObject({ isPlaying: true, occupants: [] });
          expect(occupantsSentTo(dave, 'Name3')).toEqual([]); // dave joined later
          expect(town.getInteractableModelsVisibleTo(idOf(dave))).toContainEqual(
            expect.objectContaining({ id: 'Name3', isPlaying: true, occupants: [idOf(alice)] }),
          );
        });
        it("Leaves ghosts and spectators out of a living player's initialize interactables", () => {
          const models = town.getInteractableModelsVisibleTo(idOf(bob));
          const payload = JSON.stringify(models);
          [alice, carol, dave].map(idOf).forEach(eachID => expect(payload).not.toContain(eachID));
          expect(models).toHaveLength(town.interactables.length);
          expect(models.find(eachModel => eachModel.id === 'Name1')?.occupants).toEqual([
            idOf(bob),
          ]);
        });
        it('Gives ghosts and the spectator every occupant in initialize interactables', () => {
          for (const eachViewer of [alice, dave]) {
            expect(town.getInteractableModelsVisibleTo(idOf(eachViewer))).toEqual(
              town.interactables.map(eachArea => eachArea.toModel()),
            );
          }
        });
        it('Sends nothing on resync when nothing changed', () => {
          clearSentEvents();
          town.resyncPositions();
          expectNothingSent();
        });
      });

      describe('After alice dies in Name1 (marked dead, then resync)', () => {
        beforeEach(() => {
          alice.moveTo(45, 122);
          createName1();
          bob.moveTo(60, 130); // Name1 = [alice, bob]
          carol.moveTo(750, 650); // Game1 = [carol]
          startGame();
          clearSentEvents();
          classByPlayer.set(idOf(alice), 'ghost');
          town.resyncPositions();
        });
        it('Sends each living player one update, for Name1, without alice', () => {
          for (const eachLiving of [playerTestData, bob, carol]) {
            expect(areaUpdatesSentTo(eachLiving)).toHaveLength(1);
            expect(areaUpdatesSentTo(eachLiving)[0]).toMatchObject({
              id: 'Name1',
              occupants: [idOf(bob)],
            });
          }
        });
        it('Sends it after telling them alice left', () => {
          for (const eachLiving of [playerTestData, bob, carol]) {
            expect(eventNamesSentTo(eachLiving)).toEqual([
              'playerDisconnect',
              'interactableUpdate',
            ]);
          }
        });
        it('Sends alice nothing: as a ghost she still sees every occupant', () => {
          expect(alice.socket.emit).not.toHaveBeenCalled();
        });
        it('Sends nothing on a second resync', () => {
          clearSentEvents();
          town.resyncPositions();
          expectNothingSent();
        });
        it('Keeps alice out of later updates to Name1 for the living', () => {
          playerTestData.moveTo(70, 140); // Name1 = [alice, bob, tester]
          expect(occupantsSentTo(bob, 'Name1').pop()).toEqual([idOf(bob), idOf(playerTestData)]);
          expect(occupantsSentTo(alice, 'Name1').pop()).toEqual([
            idOf(alice),
            idOf(bob),
            idOf(playerTestData),
          ]);
        });
        it('Sends only the player list change when the victim stood in no area', () => {
          clearSentEvents();
          classByPlayer.set(idOf(playerTestData), 'ghost');
          town.resyncPositions();
          for (const eachLiving of [bob, carol]) {
            expect(eventNamesSentTo(eachLiving)).toEqual(['playerDisconnect']);
          }
        });
        it('Lists alice again for everyone at game end, after her playerJoined', () => {
          clearSentEvents();
          town.setVisibilityPolicy(undefined);
          town.resyncPositions();
          for (const eachLiving of [playerTestData, bob, carol]) {
            expect(eventNamesSentTo(eachLiving)).toEqual(['playerJoined', 'interactableUpdate']);
            expect(areaUpdatesSentTo(eachLiving)[0]).toMatchObject({
              id: 'Name1',
              occupants: [idOf(alice), idOf(bob)],
            });
          }
          expect(alice.socket.emit).not.toHaveBeenCalled();
          playerTestData.moveTo(70, 140);
          expect(getLastEmittedEvent(townEmitter, 'interactableUpdate').occupants).toEqual([
            idOf(alice),
            idOf(bob),
            idOf(playerTestData),
          ]);
        });
      });
    });
  });
  describe('Updating town settings', () => {
    it('Emits townSettingsUpdated events when friendlyName changes', async () => {
      const newFriendlyName = nanoid();
      town.friendlyName = newFriendlyName;
      expect(townEmitter.emit).toBeCalledWith('townSettingsUpdated', {
        friendlyName: newFriendlyName,
      });
    });
    it('Emits townSettingsUpdated events when isPubliclyListed changes', async () => {
      const expected = !town.isPubliclyListed;
      town.isPubliclyListed = expected;
      expect(townEmitter.emit).toBeCalledWith('townSettingsUpdated', {
        isPubliclyListed: expected,
      });
    });
  });
});
