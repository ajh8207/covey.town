import { ITiledMap } from '@jonbell/tiled-map-type-guard';
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
