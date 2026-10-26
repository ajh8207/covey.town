import { ITiledMap, ITiledMapObjectLayer } from '@jonbell/tiled-map-type-guard';
import { nanoid } from 'nanoid';
import { BroadcastOperator } from 'socket.io';
import InvalidParametersError from '../lib/InvalidParametersError';
import IVideoClient from '../lib/IVideoClient';
import Player from '../lib/Player';
import TwilioVideo from '../lib/TwilioVideo';
import { isViewingArea } from '../TestUtils';
import {
  ChatMessage,
  ConversationArea as ConversationAreaModel,
  CoveyTownSocket,
  Interactable,
  InteractableCommand,
  InteractableCommandBase,
  InteractableID,
  Player as PlayerModel,
  PlayerID,
  PlayerLocation,
  ServerToClientEvents,
  SocketData,
  ViewingArea as ViewingAreaModel,
} from '../types/CoveyTownSocket';
import { logError } from '../Utils';
import ConversationArea from './ConversationArea';
import GameAreaFactory from './games/GameAreaFactory';
import SessionHost from './impostor/SessionHost';
import VisibilityPolicy from './impostor/visibility/VisibilityPolicy';
import InteractableArea from './InteractableArea';
import ViewingArea from './ViewingArea';

/** The events that carry a player's model, and so their location */
type PositionEvent = 'playerMoved' | 'playerJoined' | 'playerDisconnect';
/**
 * The Town class implements the logic for each town: managing the various events that
 * can occur (e.g. joining a town, moving, leaving a town)
 */
export default class Town implements SessionHost {
  get capacity(): number {
    return this._capacity;
  }

  set isPubliclyListed(value: boolean) {
    this._isPubliclyListed = value;
    this._broadcastEmitter.emit('townSettingsUpdated', { isPubliclyListed: value });
  }

  get isPubliclyListed(): boolean {
    return this._isPubliclyListed;
  }

  get townUpdatePassword(): string {
    return this._townUpdatePassword;
  }

  get players(): Player[] {
    return this._players;
  }

  get occupancy(): number {
    return this.players.length;
  }

  get friendlyName(): string {
    return this._friendlyName;
  }

  set friendlyName(value: string) {
    this._friendlyName = value;
    this._broadcastEmitter.emit('townSettingsUpdated', { friendlyName: value });
  }

  get townID(): string {
    return this._townID;
  }

  get interactables(): InteractableArea[] {
    return this._interactables;
  }

  /** The list of players currently in the town * */
  private _players: Player[] = [];

  /** The videoClient that this CoveyTown will use to provision video resources * */
  private _videoClient: IVideoClient = TwilioVideo.getInstance();

  private _interactables: InteractableArea[] = [];

  private readonly _townID: string;

  private _friendlyName: string;

  private readonly _townUpdatePassword: string;

  private _isPubliclyListed: boolean;

  private _capacity: number;

  private _broadcastEmitter: BroadcastOperator<ServerToClientEvents, SocketData>;

  private _connectedSockets: Set<CoveyTownSocket> = new Set();

  /** Each connected player's own socket, so position updates can be sent per recipient */
  private _socketByPlayer: Map<PlayerID, CoveyTownSocket> = new Map();

  /** Decides who may receive whose position; undefined means broadcast to everyone */
  private _visibilityPolicy?: VisibilityPolicy;

  /**
   * For each connected player, the IDs of the players their browser has been told about (the
   * client's player list). Recorded when they join and kept current by every playerJoined and
   * playerDisconnect sent, so resyncPositions can send only what changed.
   */
  private _knownPlayersByViewer: Map<PlayerID, Set<PlayerID>> = new Map();

  /**
   * For each connected player, the model (as JSON) their browser was last sent for each area.
   * Kept current by every interactableUpdate sent, so a viewer is never sent an unchanged model
   * (which would reveal that a hidden occupant came or went) and resyncPositions can resend only
   * the areas that changed for them.
   */
  private _sentAreasByViewer: Map<PlayerID, Map<InteractableID, string>> = new Map();

  private _chatMessages: ChatMessage[] = [];

  constructor(
    friendlyName: string,
    isPubliclyListed: boolean,
    townID: string,
    broadcastEmitter: BroadcastOperator<ServerToClientEvents, SocketData>,
  ) {
    this._townID = townID;
    this._capacity = 50;
    this._townUpdatePassword = nanoid(24);
    this._isPubliclyListed = isPubliclyListed;
    this._friendlyName = friendlyName;
    this._broadcastEmitter = broadcastEmitter;
  }

  /**
   * Adds a player to this Covey Town, provisioning the necessary credentials for the
   * player, and returning them
   *
   * @param newPlayer The new player to add to the town
   */
  async addPlayer(userName: string, socket: CoveyTownSocket): Promise<Player> {
    const newPlayer = new Player(userName, socket.to(this._townID));
    this._players.push(newPlayer);

    this._connectedSockets.add(socket);
    this._socketByPlayer.set(newPlayer.id, socket);

    // Create a video token for this user to join this town
    newPlayer.videoToken = await this._videoClient.getTokenForTown(this._townID, newPlayer.id);

    // The newcomer's client learns about exactly these players: joinTown builds the initialize
    // snapshot from the same check as soon as this method returns, with nothing in between.
    this._knownPlayersByViewer.set(
      newPlayer.id,
      new Set(this._playersVisibleTo(newPlayer.id).map(eachPlayer => eachPlayer.id)),
    );
    // ...and the interactables list in that snapshot comes from getInteractableModelsVisibleTo
    this._sentAreasByViewer.set(newPlayer.id, new Map());
    this._recordAreasShownTo(newPlayer.id, this._interactables);

    // Notify other players that this player has joined
    this._emitToViewersOf(newPlayer, 'playerJoined', newPlayer.toPlayerModel());

    // Register an event listener for the client socket: if the client disconnects,
    // clean up our listener adapter, and then let the CoveyTownController know that the
    // player's session is disconnected
    socket.on('disconnect', () => {
      this._removePlayer(newPlayer);
      this._connectedSockets.delete(socket);
    });

    // Set up a listener to forward all chat messages to all clients in the town
    socket.on('chatMessage', (message: ChatMessage) => {
      this._broadcastEmitter.emit('chatMessage', message);
      this._chatMessages.push(message);
      if (this._chatMessages.length > 200) {
        this._chatMessages.shift();
      }
    });

    // Register an event listener for the client socket: if the client updates their
    // location, inform the CoveyTownController
    socket.on('playerMovement', (movementData: PlayerLocation) => {
      try {
        this._updatePlayerLocation(newPlayer, movementData);
      } catch (err) {
        logError(err);
      }
    });

    // Set up a listener to process updates to interactables.
    // Currently only knows how to process updates for ViewingArea's, and
    // ignores any other updates for any other kind of interactable.
    // For ViewingArea's: dispatches an updateModel call to the viewingArea that
    // corresponds to the interactable being updated. Does not throw an error if
    // the specified viewing area does not exist.
    // With a visibility policy installed, the client's own model is not relayed: its occupant
    // list is what that client may see (a ghost sees everyone), so the server's model is sent
    // instead, filtered for each viewer.
    socket.on('interactableUpdate', (update: Interactable) => {
      if (isViewingArea(update)) {
        if (!this._visibilityPolicy) {
          newPlayer.townEmitter.emit('interactableUpdate', update);
          const sentModel = JSON.stringify(update);
          this._sentAreasByViewer.forEach(sentByArea => sentByArea.set(update.id, sentModel));
        }
        const viewingArea = this._interactables.find(
          eachInteractable => eachInteractable.id === update.id,
        );
        if (viewingArea) {
          (viewingArea as ViewingArea).updateModel(update);
          if (this._visibilityPolicy) {
            this._emitAreaUpdate(viewingArea, newPlayer.id);
          }
        }
      }
    });

    // Set up a listener to process commands to interactables.
    // Dispatches commands to the appropriate interactable and sends the response back to the client
    socket.on('interactableCommand', (command: InteractableCommand & InteractableCommandBase) => {
      const interactable = this._interactables.find(
        eachInteractable => eachInteractable.id === command.interactableID,
      );
      if (interactable) {
        try {
          const payload = interactable.handleCommand(command, newPlayer);
          socket.emit('commandResponse', {
            commandID: command.commandID,
            interactableID: command.interactableID,
            isOK: true,
            payload,
          });
        } catch (err) {
          if (err instanceof InvalidParametersError) {
            socket.emit('commandResponse', {
              commandID: command.commandID,
              interactableID: command.interactableID,
              isOK: false,
              error: err.message,
            });
          } else {
            logError(err);
            socket.emit('commandResponse', {
              commandID: command.commandID,
              interactableID: command.interactableID,
              isOK: false,
              error: 'Unknown error',
            });
          }
        }
      } else {
        socket.emit('commandResponse', {
          commandID: command.commandID,
          interactableID: command.interactableID,
          isOK: false,
          error: `No such interactable ${command.interactableID}`,
        });
      }
    });
    return newPlayer;
  }

  /**
   * Destroys all data related to a player in this town.
   *
   * @param session PlayerSession to destroy
   */
  private _removePlayer(player: Player): void {
    this._socketByPlayer.delete(player.id);
    if (player.location.interactableID) {
      this._removePlayerFromInteractable(player);
    }
    // Announce before dropping the player from the list: a visibility policy may need to look
    // the leaving player up while deciding who may be told about them.
    this._emitToViewersOf(player, 'playerDisconnect', player.toPlayerModel());
    this._players = this._players.filter(p => p.id !== player.id);
    this._knownPlayersByViewer.delete(player.id);
    this._knownPlayersByViewer.forEach(eachKnownSet => eachKnownSet.delete(player.id));
    this._sentAreasByViewer.delete(player.id);
  }

  /**
   * Updates the location of a player within the town
   *
   * If the player has changed conversation areas, this method also updates the
   * corresponding ConversationArea objects tracked by the town controller, and dispatches
   * any onConversationUpdated events as appropriate
   *
   * @param player Player to update location for
   * @param location New location for this player
   */
  private _updatePlayerLocation(player: Player, location: PlayerLocation): void {
    const prevInteractable = this._interactables.find(
      conv => conv.id === player.location.interactableID,
    );

    if (!prevInteractable?.contains(location)) {
      if (prevInteractable) {
        // Remove from old area
        prevInteractable.remove(player);
      }
      const newInteractable = this._interactables.find(
        eachArea => eachArea.isActive && eachArea.contains(location),
      );
      if (newInteractable) {
        newInteractable.add(player);
      }
      location.interactableID = newInteractable?.id;
    } else {
      location.interactableID = prevInteractable.id;
    }

    player.location = location;

    this._emitPlayerMoved(player);
  }

  /**
   * Installs (or, with undefined, removes) the policy that decides which players may receive
   * which other players' positions. With no policy, positions are broadcast to the whole town.
   * Clients learn about the change only when resyncPositions is called.
   *
   * @param policy the policy to consult for every position update, or undefined for none
   */
  public setVisibilityPolicy(policy: VisibilityPolicy | undefined): void {
    this._visibilityPolicy = policy;
  }

  // AI assistance: written with Claude Code, prompted by Kush; see the PR discussion.
  /**
   * Brings every client's player list in line with the current policy: sends `playerJoined` for
   * each player the client may now see but was not told about, and `playerDisconnect` for each
   * player it was told about but may no longer see. Sends nothing else, so a client never gets a
   * second `playerJoined` (its handler would add a duplicate sprite).
   *
   * A hidden player's `playerDisconnect` carries their location as of the change, which the
   * client was already sent, as long as the session resyncs right after marking the change.
   *
   * Then resends each area whose occupant list, as that client may see it, differs from the one
   * it was last sent (for example the area a player died in), and no other area.
   */
  public resyncPositions(): void {
    const areaModels = this._interactables.map(eachArea => eachArea.toModel());
    for (const [viewerID, knownIDs] of this._knownPlayersByViewer) {
      const socket = this._socketByPlayer.get(viewerID);
      if (socket) {
        for (const subject of this._players) {
          const mayReceive = this._mayReceive(viewerID, subject.id);
          if (mayReceive !== knownIDs.has(subject.id)) {
            const event = mayReceive ? 'playerJoined' : 'playerDisconnect';
            socket.emit(event, subject.toPlayerModel());
            this._recordSent(viewerID, event, subject.id);
          }
        }
        // After the player list, so an occupant who just became visible is already known
        for (const model of areaModels) {
          this._sendAreaModel(viewerID, socket, this._areaModelFor(viewerID, model));
        }
      }
    }
  }

  /**
   * Sends an area's model to the town. With no policy installed this is the starter's room
   * broadcast. With a policy installed, each connected player gets their own copy listing only
   * the occupants they may see, and only if it differs from the copy they were last sent.
   *
   * @param area the area whose model changed
   * @param skippedViewerID a player not to send it to (the client the change came from)
   */
  private _emitAreaUpdate(area: InteractableArea, skippedViewerID?: PlayerID): void {
    const model = area.toModel();
    if (!this._visibilityPolicy) {
      this._broadcastEmitter.emit('interactableUpdate', model);
      const sentModel = JSON.stringify(model);
      this._sentAreasByViewer.forEach(sentByArea => sentByArea.set(model.id, sentModel));
      return;
    }
    for (const [viewerID, socket] of this._socketByPlayer) {
      const visibleModel = this._areaModelFor(viewerID, model);
      if (viewerID !== skippedViewerID) {
        this._sendAreaModel(viewerID, socket, visibleModel);
      } else {
        // The client the change came from already shows it
        this._sentAreasByViewer.get(viewerID)?.set(model.id, JSON.stringify(visibleModel));
      }
    }
  }

  /**
   * Sends one viewer their copy of an area's model, unless it is exactly the copy they were last
   * sent, and records it.
   */
  private _sendAreaModel(viewerID: PlayerID, socket: CoveyTownSocket, model: Interactable): void {
    const sentModel = JSON.stringify(model);
    const sentByArea = this._sentAreasByViewer.get(viewerID);
    if (sentByArea?.get(model.id) !== sentModel) {
      socket.emit('interactableUpdate', model);
      sentByArea?.set(model.id, sentModel);
    }
  }

  /** Records that the viewer's client was shown these areas as they stand now */
  private _recordAreasShownTo(viewerID: PlayerID, areas: InteractableArea[]): void {
    const sentByArea = this._sentAreasByViewer.get(viewerID);
    areas.forEach(eachArea =>
      sentByArea?.set(
        eachArea.id,
        JSON.stringify(this._areaModelFor(viewerID, eachArea.toModel())),
      ),
    );
  }

  /**
   * @returns a copy of the area model whose occupants are only the players the viewer may see;
   * every other field is unchanged (game state is not filtered, see the 2.B1b PR)
   */
  private _areaModelFor(viewerID: PlayerID, model: Interactable): Interactable {
    return {
      ...model,
      occupants: model.occupants.filter(eachID => this._mayReceive(viewerID, eachID)),
    };
  }

  /**
   * The interactables list for a newly joined client's `initialize` snapshot: every area, each
   * listing only the occupants the viewer may see.
   *
   * @param viewerID the player whose browser will receive the snapshot
   * @returns a model of every area, filtered for the viewer
   */
  public getInteractableModelsVisibleTo(viewerID: PlayerID): Interactable[] {
    return this._interactables.map(eachArea => this._areaModelFor(viewerID, eachArea.toModel()));
  }

  /**
   * The single choke point for sending a player's position to other clients.
   *
   * With no policy installed this is the starter's room broadcast. With a policy installed, the
   * update goes to each connected player's own socket that the policy allows; the subject always
   * receives its own update, because the client learns its interactableID from it.
   *
   * @param subject the player whose position changed
   */
  private _emitPlayerMoved(subject: Player): void {
    this._emitToViewersOf(subject, 'playerMoved', subject.toPlayerModel());
  }

  /**
   * Sends an event that carries a player's model (and so their location) to the town. With no
   * policy installed this is the starter's room broadcast. With a policy installed, it goes only
   * to the sockets of players allowed to see the subject, plus the subject's own socket.
   *
   * Invariant for 2.B1: a client's player list holds exactly the players it may see. Joins and
   * disconnects are recorded per client so resyncPositions can restore it after a change.
   *
   * @param subject the player the model describes
   * @param event which event to send
   * @param model the payload, always the subject's model
   */
  private _emitToViewersOf(subject: Player, event: PositionEvent, model: PlayerModel): void {
    if (!this._visibilityPolicy) {
      this._broadcastEmitter.emit(event, model);
      this._knownPlayersByViewer.forEach((_knownIDs, viewerID) =>
        this._recordSent(viewerID, event, subject.id),
      );
      return;
    }
    for (const [viewerID, socket] of this._socketByPlayer) {
      if (this._mayReceive(viewerID, subject.id)) {
        socket.emit(event, model);
        this._recordSent(viewerID, event, subject.id);
      }
    }
  }

  /**
   * Updates the record of who a client was told about after it was sent an event: a join adds
   * the subject to its player list and a disconnect removes them. Moves change nothing.
   */
  private _recordSent(viewerID: PlayerID, event: PositionEvent, subjectID: PlayerID): void {
    const knownIDs = this._knownPlayersByViewer.get(viewerID);
    if (event === 'playerJoined') {
      knownIDs?.add(subjectID);
    } else if (event === 'playerDisconnect') {
      knownIDs?.delete(subjectID);
    }
  }

  /**
   * @returns true if the viewer's browser may be told about the subject's position: with no
   * policy everyone may; with one, the subject always may (the client reads its own
   * interactableID from its echoed moves) and others only if the policy allows.
   */
  private _mayReceive(viewerID: PlayerID, subjectID: PlayerID): boolean {
    return (
      !this._visibilityPolicy ||
      viewerID === subjectID ||
      this._visibilityPolicy.canSee(viewerID, subjectID)
    );
  }

  /**
   * The players a newly joined (or resyncing) client may be told about, for its `initialize`
   * snapshot. Always includes the viewer: the client finds itself in this list by its user ID.
   *
   * @param viewerID the player whose browser will receive the snapshot
   * @returns models of every player the viewer may see
   */
  public getPlayerModelsVisibleTo(viewerID: PlayerID): PlayerModel[] {
    return this._playersVisibleTo(viewerID).map(eachPlayer => eachPlayer.toPlayerModel());
  }

  /** @returns the players the viewer may be told about now, the viewer included */
  private _playersVisibleTo(viewerID: PlayerID): Player[] {
    return this._players.filter(eachPlayer => this._mayReceive(viewerID, eachPlayer.id));
  }

  /**
   * Removes a player from a conversation area, updating the conversation area's occupants list,
   * and emitting the appropriate message (area updated or area destroyed)
   *
   * @param player Player to remove from their current conversation area
   */
  private _removePlayerFromInteractable(player: Player): void {
    const area = this._interactables.find(
      eachArea => eachArea.id === player.location.interactableID,
    );
    if (area) {
      area.remove(player);
    }
  }

  /**
   * Creates a new conversation area in this town if there is not currently an active
   * conversation with the same ID. The conversation area ID must match the name of a
   * conversation area that exists in this town's map, and the conversation area must not
   * already have a topic set.
   *
   * If successful creating the conversation area, this method:
   *  Adds any players who are in the region defined by the conversation area to it.
   *  Notifies all players in the town that the conversation area has been updated
   *
   * @param conversationArea Information describing the conversation area to create. Ignores any
   *  occupantsById that are set on the conversation area that is passed to this method.
   *
   * @returns true if the conversation is successfully created, or false if there is no known
   * conversation area with the specified ID or if there is already an active conversation area
   * with the specified ID
   */
  public addConversationArea(conversationArea: ConversationAreaModel): boolean {
    const area = this._interactables.find(
      eachArea => eachArea.id === conversationArea.id,
    ) as ConversationArea;
    if (!area || !conversationArea.topic || area.topic) {
      return false;
    }
    area.topic = conversationArea.topic;
    area.addPlayersWithinBounds(this._players);
    this._emitAreaUpdate(area);
    return true;
  }

  /**
   * Creates a new viewing area in this town if there is not currently an active
   * viewing area with the same ID. The viewing area ID must match the name of a
   * viewing area that exists in this town's map, and the viewing area must not
   * already have a video set.
   *
   * If successful creating the viewing area, this method:
   *    Adds any players who are in the region defined by the viewing area to it
   *    Notifies all players in the town that the viewing area has been updated by
   *      emitting an interactableUpdate event
   *
   * @param viewingArea Information describing the viewing area to create.
   *
   * @returns True if the viewing area was created or false if there is no known
   * viewing area with the specified ID or if there is already an active viewing area
   * with the specified ID or if there is no video URL specified
   */
  public addViewingArea(viewingArea: ViewingAreaModel): boolean {
    const area = this._interactables.find(
      eachArea => eachArea.id === viewingArea.id,
    ) as ViewingArea;
    if (!area || !viewingArea.video || area.video) {
      return false;
    }
    area.updateModel(viewingArea);
    area.addPlayersWithinBounds(this._players);
    this._emitAreaUpdate(area);
    return true;
  }

  /**
   * Fetch a player's session based on the provided session token. Returns undefined if the
   * session token is not valid.
   *
   * @param token
   */
  public getPlayerBySessionToken(token: string): Player | undefined {
    return this.players.find(eachPlayer => eachPlayer.sessionToken === token);
  }

  /**
   * Find an interactable by its ID
   *
   * @param id
   * @returns the interactable
   * @throws Error if no such interactable exists
   */
  public getInteractable(id: string): InteractableArea {
    const ret = this._interactables.find(eachInteractable => eachInteractable.id === id);
    if (!ret) {
      throw new Error(`No such interactable ${id}`);
    }
    return ret;
  }

  /**
   * Retrieves all chat messages, optionally filtered by interactableID
   * @param interactableID optional interactableID to filter by
   */
  public getChatMessages(interactableID: string | undefined) {
    return this._chatMessages.filter(eachMessage => eachMessage.interactableID === interactableID);
  }

  /**
   * Informs all players' clients that they are about to be disconnected, and then
   * disconnects all players.
   */
  public disconnectAllPlayers(): void {
    this._broadcastEmitter.emit('townClosing');
    this._connectedSockets.forEach(eachSocket => eachSocket.disconnect(true));
  }

  /**
   * Initializes the town's state from a JSON map, setting the "interactables" property of this town
   * to instances of InteractableArea that match each interactable in the map.
   *
   * Each tilemap may contain "objects", and those objects may have properties. Towns
   * support two kinds of interactable objects: "ViewingArea" and "ConversationArea."
   * Initializing the town state from the map, then, means instantiating the corresponding objects.
   *
   * This method will throw an Error if the objects are not valid:
   * In the map file, each object is identified with a name. Names must be unique. Each object also has
   * some kind of geometry that establishes where the object is on the map. Objects must not overlap.
   *
   * @param mapFile the map file to read in, defaults to the "indoors" map in the frontend
   * @throws Error if there is no layer named "Objects" in the map, if the objects overlap or if object
   *  names are not unique
   */
  public initializeFromMap(map: ITiledMap) {
    const objectLayer = map.layers.find(
      eachLayer => eachLayer.name === 'Objects',
    ) as ITiledMapObjectLayer;
    if (!objectLayer) {
      throw new Error(`Unable to find objects layer in map`);
    }
    const viewingAreas = objectLayer.objects
      .filter(eachObject => eachObject.type === 'ViewingArea')
      .map(eachViewingAreaObject =>
        ViewingArea.fromMapObject(eachViewingAreaObject, this._broadcastEmitter),
      );

    const conversationAreas = objectLayer.objects
      .filter(eachObject => eachObject.type === 'ConversationArea')
      .map(eachConvAreaObj =>
        ConversationArea.fromMapObject(eachConvAreaObj, this._broadcastEmitter),
      );

    const gameAreas = objectLayer.objects
      .filter(eachObject => eachObject.type === 'GameArea')
      .map(eachGameAreaObj => GameAreaFactory(eachGameAreaObj, this._broadcastEmitter));

    const newAreas = [...viewingAreas, ...conversationAreas, ...gameAreas];
    this._interactables = this._interactables.concat(newAreas);
    this._validateInteractables();
    // Areas announce occupants' interactableID changes and their own model changes through the
    // visibility choke point
    this._interactables.forEach(eachInteractable => {
      eachInteractable.setPlayerMovedNotifier(player => this._emitPlayerMoved(player));
      eachInteractable.setAreaChangedNotifier(area => this._emitAreaUpdate(area));
    });
    // Clients already connected start with these areas empty, as a new area from the map is
    this._sentAreasByViewer.forEach((_sentByArea, viewerID) =>
      this._recordAreasShownTo(viewerID, newAreas),
    );
  }

  private _validateInteractables() {
    // Make sure that the IDs are unique
    const interactableIDs = this._interactables.map(eachInteractable => eachInteractable.id);
    if (
      interactableIDs.some(
        item => interactableIDs.indexOf(item) !== interactableIDs.lastIndexOf(item),
      )
    ) {
      throw new Error(
        `Expected all interactable IDs to be unique, but found duplicate interactable ID in ${interactableIDs}`,
      );
    }
    // Make sure that there are no overlapping objects
    for (const interactable of this._interactables) {
      for (const otherInteractable of this._interactables) {
        if (interactable !== otherInteractable && interactable.overlaps(otherInteractable)) {
          throw new Error(
            `Expected interactables not to overlap, but found overlap between ${interactable.id} and ${otherInteractable.id}`,
          );
        }
      }
    }
  }
}
