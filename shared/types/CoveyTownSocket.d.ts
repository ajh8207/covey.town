export type TownJoinResponse = {
  /** Unique ID that represents this player * */
  userID: string;
  /** Secret token that this player should use to authenticate
   * in future requests to this service * */
  sessionToken: string;
  /** Secret token that this player should use to authenticate
   * in future requests to the video service * */
  providerVideoToken: string;
  /** List of players currently in this town * */
  currentPlayers: Player[];
  /** Friendly name of this town * */
  friendlyName: string;
  /** Is this a private town? * */
  isPubliclyListed: boolean;
  /** Current state of interactables in this town */
  interactables: TypedInteractable[];
}

export type InteractableType =
  | 'ConversationArea'
  | 'ViewingArea'
  | 'TicTacToeArea'
  | 'ConnectFourArea'
  | 'ImpostorArea'
  | 'ImpostorArcade';
export interface Interactable {
  type: InteractableType;
  id: InteractableID;
  occupants: PlayerID[];
}

export type TownSettingsUpdate = {
  friendlyName?: string;
  isPubliclyListed?: boolean;
}

export type Direction = 'front' | 'back' | 'left' | 'right';

export type PlayerID = string;
export interface Player {
  id: PlayerID;
  userName: string;
  location: PlayerLocation;
};

export type XY = { x: number, y: number };

export interface PlayerLocation {
  /* The CENTER x coordinate of this player's location */
  x: number;
  /* The CENTER y coordinate of this player's location */
  y: number;
  /** @enum {string} */
  rotation: Direction;
  moving: boolean;
  interactableID?: string;
};
export type ChatMessage = {
  author: string;
  sid: string;
  body: string;
  dateCreated: Date;
  interactableID?: string;
};

export interface ConversationArea extends Interactable {
  topic?: string;
};
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
};

export interface ViewingArea extends Interactable {
  video?: string;
  isPlaying: boolean;
  elapsedTimeSec: number;
}

export type GameStatus = 'IN_PROGRESS' | 'WAITING_TO_START' | 'OVER' | 'WAITING_FOR_PLAYERS';
/**
 * Base type for the state of a game
 */
export interface GameState {
  status: GameStatus;
} 

/**
 * Type for the state of a game that can be won
 */
export interface WinnableGameState extends GameState {
  winner?: PlayerID;
}
/**
 * Base type for a move in a game. Implementers should also extend MoveType
 * @see MoveType
 */
export interface GameMove<MoveType> {
  playerID: PlayerID;
  gameID: GameInstanceID;
  move: MoveType;
}

export type TicTacToeGridPosition = 0 | 1 | 2;

/**
 * Type for a move in TicTacToe
 */
export interface TicTacToeMove {
  gamePiece: 'X' | 'O';
  row: TicTacToeGridPosition;
  col: TicTacToeGridPosition;
}

/**
 * Type for the state of a TicTacToe game
 * The state of the game is represented as a list of moves, and the playerIDs of the players (x and o)
 * The first player to join the game is x, the second is o
 */
export interface TicTacToeGameState extends WinnableGameState {
  moves: ReadonlyArray<TicTacToeMove>;
  x?: PlayerID;
  o?: PlayerID;
}

/**
 * Type for the state of a ConnectFour game.
 * The state of the game is represented as a list of moves, and the playerIDs of the players (red and yellow)
 */
export interface ConnectFourGameState extends WinnableGameState {
  // The moves in this game
  moves: ReadonlyArray<ConnectFourMove>;
  // The playerID of the red player, if any
  red?: PlayerID;
  // The playerID of the yellow player, if any
  yellow?: PlayerID;
  // Whether the red player is ready to start the game
  redReady?: boolean;
  // Whether the yellow player is ready to start the game
  yellowReady?: boolean;
  // The color of the player who will make the first move
  firstPlayer: ConnectFourColor;
}

/**
 * Type for a move in ConnectFour
 * Columns are numbered 0-6, with 0 being the leftmost column
 * Rows are numbered 0-5, with 0 being the top row
 */
export interface ConnectFourMove {
  gamePiece: ConnectFourColor;
  col: ConnectFourColIndex;
  row: ConnectFourRowIndex;
}

/**
 * Row indices in ConnectFour start at the top of the board and go down
 */
export type ConnectFourRowIndex = 0 | 1 | 2 | 3 | 4 | 5;
/**
 * Column indices in ConnectFour start at the left of the board and go right
 */
export type ConnectFourColIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type ConnectFourColor = 'Red' | 'Yellow';

/**
 * Role assigned to a player in an Impostor game
 */
export type ImpostorRole = 'Crewmate' | 'Impostor';

/**
 * Winning team in an Impostor game
 */
export type ImpostorTeam = 'Crewmates' | 'Impostors';

/**
 * Phase of an emergency meeting or body report discussion
 */
export type ImpostorMeetingPhase = 'DISCUSSION' | 'VOTING' | 'RESULTS';

/**
 * Individual player vote during an emergency meeting.
 */
export type ImpostorVote = {
  /** PlayerID of the player who cast the vote */
  voter: PlayerID;
  /** Target PlayerID being voted for, or 'SKIP' */
  target: PlayerID | 'SKIP';
};

/**
 * Representation of an individual task assigned in the game.
 */
export interface ImpostorTask {
  /** Unique identifier for the task */
  taskID: string;
  /** Display name of the task */
  name: string;
  /** Whether the task has been completed */
  completed: boolean;
}

/**
 * Reason for a server-forced player repositioning.
 */
export type ForceMoveReason = 'MEETING' | 'KILL' | 'SPAWN';

/**
 * Payload sent by the server to force-move a player.
 */
export interface ForceMovePayload {
  /** Target location coordinates and orientation */
  location: Partial<PlayerLocation>;
  /** Sequence number to be acknowledged by the client */
  seq: number;
  /** The reason for this forced movement */
  reason: ForceMoveReason;
}

/**
 * Public state of an Impostor game visible to all players in the game area.
 * Secret information (such as who the impostors are) is omitted from this state.
 */
export interface ImpostorGameState extends GameState {
  /** Winning team if the game is over */
  winner?: ImpostorTeam;
  /** PlayerIDs of players who are still alive */
  alivePlayers: ReadonlyArray<PlayerID>;
  /** PlayerIDs of players who have died or become ghosts */
  deadPlayers: ReadonlyArray<PlayerID>;
  /** Total number of tasks completed across all crewmates */
  tasksCompleted: number;
  /** Total number of tasks required to achieve a task victory */
  totalTasks: number;
  /** Whether an emergency meeting or body report is currently active */
  isMeetingActive: boolean;
  /** Current phase of the active emergency meeting */
  meetingPhase?: ImpostorMeetingPhase;
  /** PlayerID of the player who triggered the meeting or reported a body */
  meetingCaller?: PlayerID;
  /** PlayerIDs of players who have cast a vote during the current meeting */
  hasVoted?: ReadonlyArray<PlayerID>;
  /** Recorded votes; only populated when meetingPhase === 'RESULTS' */
  votes?: ReadonlyArray<ImpostorVote>;
  /** The player ejected during the meeting, or 'SKIP' / 'TIE'; only in RESULTS */
  ejectedPlayer?: PlayerID | 'SKIP' | 'TIE';
  /** Remaining countdown in seconds for discussion or voting */
  meetingTimerSec?: number;
}

/**
 * Private state of an Impostor game sent only to an individual player.
 * Contains secret role assignment, teammate identities, and private cooldowns.
 */
export interface ImpostorPrivateState {
  /** Unique identifier of the game instance this private state belongs to */
  gameID: GameInstanceID;
  /** Secret role assigned to this player */
  role: ImpostorRole;
  /** PlayerIDs of fellow impostors (only populated if this player is an impostor) */
  impostorTeammates?: ReadonlyArray<PlayerID>;
  /** Task list assigned to this player */
  tasks: ReadonlyArray<ImpostorTask>;
  /** Epoch timestamp in milliseconds when the kill cooldown expires (impostor only) */
  killCooldownEndsAt?: number;
  /** Epoch timestamp in milliseconds when the sabotage cooldown expires (impostor only) */
  sabotageCooldownEndsAt?: number;
}

/**
 * Move to initiate an emergency meeting.
 */
export interface ImpostorCallMeetingMove {
  moveType: 'CallMeeting';
}

/**
 * Move to report a discovered dead body.
 */
export interface ImpostorReportBodyMove {
  moveType: 'ReportBody';
  /** PlayerID of the discovered dead player */
  victimID: PlayerID;
}

/**
 * Move to cast a vote during an active emergency meeting.
 */
export interface ImpostorCastVoteMove {
  moveType: 'CastVote';
  /** The player being voted against, or 'SKIP' to skip voting */
  target: PlayerID | 'SKIP';
}

/**
 * Move to complete a crewmate task.
 */
export interface ImpostorCompleteTaskMove {
  moveType: 'CompleteTask';
  /** Unique identifier of the task being completed */
  taskID: string;
}

/**
 * Move to execute an impostor kill on a crewmate.
 */
export interface ImpostorKillPlayerMove {
  moveType: 'KillPlayer';
  /** PlayerID of the victim being eliminated */
  victimID: PlayerID;
}

/**
 * Move to trigger an impostor sabotage.
 */
export interface ImpostorSabotageMove {
  moveType: 'Sabotage';
  /** Identifier or name of the sabotage action */
  sabotageType: string;
}

/**
 * Actions that can be performed in an Impostor game
 */
export type ImpostorMove =
  | ImpostorCallMeetingMove
  | ImpostorReportBodyMove
  | ImpostorCastVoteMove
  | ImpostorCompleteTaskMove
  | ImpostorKillPlayerMove
  | ImpostorSabotageMove;

export type InteractableID = string;
export type GameInstanceID = string;

/**
 * Type for the result of a game
 */
export interface GameResult {
  gameID: GameInstanceID;
  scores: { [playerName: string]: number };
}

/**
 * Base type for an *instance* of a game. An instance of a game
 * consists of the present state of the game (which can change over time),
 * the players in the game, and the result of the game
 * @see GameState
 */
export interface GameInstance<T extends GameState> {
  state: T;
  id: GameInstanceID;
  players: PlayerID[];
  result?: GameResult;
}

/**
 * Base type for an area that can host a game
 * @see GameInstance
 */
export interface GameArea<T extends GameState> extends Interactable {
  game: GameInstance<T> | undefined;
  history: GameResult[];
}

/**
 * Base type for an area that can host an Impostor game
 * @see GameArea
 */
export type ImpostorArea = GameArea<ImpostorGameState>;

export type CommandID = string;

/**
 * Base type for a command that can be sent to an interactable.
 * This type is used only by the client/server interface, which decorates
 * an @see InteractableCommand with a commandID and interactableID
 */
interface InteractableCommandBase {
  /**
   * A unique ID for this command. This ID is used to match a command against a response
   */
  commandID: CommandID;
  /**
   * The ID of the interactable that this command is being sent to
   */
  interactableID: InteractableID;
  /**
   * The type of this command
   */
  type: string;
}

export type InteractableCommand =
  | ViewingAreaUpdateCommand
  | JoinGameCommand
  | GameMoveCommand<TicTacToeMove>
  | GameMoveCommand<ConnectFourMove>
  | ImpostorCommand
  | StartGameCommand
  | LeaveGameCommand;
export interface ViewingAreaUpdateCommand  {
  type: 'ViewingAreaUpdate';
  update: ViewingArea;
}
export interface JoinGameCommand {
  type: 'JoinGame';
}
export interface LeaveGameCommand {
  type: 'LeaveGame';
  gameID: GameInstanceID;
}
export interface StartGameCommand {
  type: 'StartGame';
  gameID: GameInstanceID;
}
export interface GameMoveCommand<MoveType> {
  type: 'GameMove';
  gameID: GameInstanceID;
  move: MoveType;
}
/**
 * Command to execute an in-game move in an Impostor game
 */
export interface ImpostorCommand {
  type: 'ImpostorCommand';
  gameID: GameInstanceID;
  move: ImpostorMove;
}
export type InteractableCommandReturnType<CommandType extends InteractableCommand> = 
  CommandType extends JoinGameCommand ? { gameID: string}:
  CommandType extends ViewingAreaUpdateCommand ? undefined :
  CommandType extends GameMoveCommand<TicTacToeMove> ? undefined :
  CommandType extends ImpostorCommand ? undefined :
  CommandType extends LeaveGameCommand ? undefined :
  never;

export type InteractableCommandResponse<MessageType> = {
  commandID: CommandID;
  interactableID: InteractableID;
  error?: string;
  payload?: InteractableCommandResponseMap[MessageType];
}

export interface ServerToClientEvents {
  playerMoved: (movedPlayer: Player) => void;
  playerDisconnect: (disconnectedPlayer: Player) => void;
  playerJoined: (newPlayer: Player) => void;
  initialize: (initialData: TownJoinResponse) => void;
  townSettingsUpdated: (update: TownSettingsUpdate) => void;
  townClosing: () => void;
  chatMessage: (message: ChatMessage) => void;
  interactableUpdate: (interactable: Interactable) => void;
  commandResponse: (response: InteractableCommandResponse) => void;
  /**
   * Forces a player to move to a designated location (e.g. teleporting to emergency meeting
   * table or round spawn point).
   * @param payload Target location, sequence number, and context reason.
   */
  forceMove: (payload: ForceMovePayload) => void;
  /**
   * Sends private, asymmetric state to an individual player in an Impostor game
   * (e.g. secret role, impostor teammates, private tasks, cooldowns).
   * @param privateState The private state payload for the recipient player.
   */
  impostorPrivateUpdate: (privateState: ImpostorPrivateState) => void;
}

export interface ClientToServerEvents {
  chatMessage: (message: ChatMessage) => void;
  playerMovement: (movementData: PlayerLocation) => void;
  interactableUpdate: (update: Interactable) => void;
  interactableCommand: (command: InteractableCommand & InteractableCommandBase) => void;
  /**
   * Acknowledges receipt of a forced repositioning event from the server.
   * @param seq The sequence number of the forceMove that is being acknowledged.
   */
  forceMoveAck: (seq: number) => void;
}