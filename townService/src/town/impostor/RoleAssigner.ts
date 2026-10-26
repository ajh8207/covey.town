import { ImpostorRole, PlayerID } from '../../types/CoveyTownSocket';
import { createSeededRandom, shuffle } from './SeededRandom';
import {
  defaultSessionSettings,
  impostorCountForPlayerCount,
  SessionSettings,
} from './SessionSettings';

/**
 * Result of role assignment for an Impostor game session.
 */
export interface RoleAssignment {
  /** Map of each player's ID to their assigned role */
  roles: Map<PlayerID, ImpostorRole>;
  /** PlayerIDs of all players assigned as Impostors */
  impostors: ReadonlyArray<PlayerID>;
  /** PlayerIDs of all players assigned as Crewmates */
  crewmates: ReadonlyArray<PlayerID>;
  /**
   * Returns the fellow impostor teammates for a given player.
   * If the player is an Impostor, returns the IDs of the other Impostors.
   * If the player is a Crewmate or not in the game, returns undefined.
   */
  getTeammates(playerID: PlayerID): ReadonlyArray<PlayerID> | undefined;
}

/**
 * Options for configuring role assignment.
 */
export interface RoleAssignerOptions {
  /** Optional custom session settings (used for min/max player boundaries) */
  settings?: SessionSettings;
  /** Optional numeric or string seed for deterministic random assignment */
  seed?: number | string;
  /** Optional custom RNG function returning [0, 1) */
  rng?: () => number;
  /** Optional explicit override of impostor count */
  impostorCount?: number;
}

/**
 * Assigns secret roles (Impostor or Crewmate) to a group of players.
 *
 * @param playerIDs Array of unique PlayerIDs participating in the game
 * @param options Optional configuration for random seed, settings, or impostor count
 * @returns Complete RoleAssignment mapping roles, lists, and teammate lookups
 * @throws Error if player count is below minPlayers or above maxPlayers
 * @throws Error if playerIDs array contains duplicates
 * @throws Error if custom impostorCount is invalid
 */
export function assignRoles(
  playerIDs: ReadonlyArray<PlayerID>,
  options?: RoleAssignerOptions,
): RoleAssignment {
  const minPlayers = options?.settings?.minPlayers ?? defaultSessionSettings.minPlayers;
  const maxPlayers = options?.settings?.maxPlayers ?? defaultSessionSettings.maxPlayers;

  if (playerIDs.length < minPlayers) {
    throw new Error(
      `Cannot assign roles: minimum ${minPlayers} players required, got ${playerIDs.length}`,
    );
  }
  if (playerIDs.length > maxPlayers) {
    throw new Error(
      `Cannot assign roles: maximum ${maxPlayers} players allowed, got ${playerIDs.length}`,
    );
  }

  const uniqueIDs = new Set(playerIDs);
  if (uniqueIDs.size !== playerIDs.length) {
    throw new Error('Cannot assign roles: playerIDs array contains duplicate player IDs');
  }

  let impostorCount: number;
  if (options?.impostorCount !== undefined) {
    if (!Number.isInteger(options.impostorCount) || options.impostorCount < 1) {
      throw new Error(`impostorCount must be a positive integer, got ${options.impostorCount}`);
    }
    if (options.impostorCount * 2 >= playerIDs.length) {
      throw new Error(
        `impostorCount (${options.impostorCount}) must be strictly less than half the ` +
          `player count (${playerIDs.length})`,
      );
    }
    impostorCount = options.impostorCount;
  } else {
    impostorCount = impostorCountForPlayerCount(playerIDs.length, options?.settings);
  }

  const rng =
    options?.rng ?? (options?.seed !== undefined ? createSeededRandom(options.seed) : Math.random);
  const shuffled = shuffle(playerIDs, rng);

  const impostors = shuffled.slice(0, impostorCount);
  const crewmates = shuffled.slice(impostorCount);

  const roles = new Map<PlayerID, ImpostorRole>();
  impostors.forEach(id => roles.set(id, 'Impostor'));
  crewmates.forEach(id => roles.set(id, 'Crewmate'));

  const impostorSet = new Set(impostors);

  return {
    roles,
    impostors,
    crewmates,
    getTeammates(playerID: PlayerID): ReadonlyArray<PlayerID> | undefined {
      if (!impostorSet.has(playerID)) {
        return undefined;
      }
      return impostors.filter(id => id !== playerID);
    },
  };
}

/**
 * RoleAssigner class providing static assignment utilities.
 */
export default class RoleAssigner {
  /**
   * Assigns roles to players based on player count and a seeded RNG.
   *
   * @param playerIDs List of unique player IDs participating in the game
   * @param options Optional configuration including seed, RNG, settings, or impostorCount override
   * @returns A structured RoleAssignment containing roles, lists, and teammate lookups
   */
  public static assign(
    playerIDs: ReadonlyArray<PlayerID>,
    options?: RoleAssignerOptions,
  ): RoleAssignment {
    return assignRoles(playerIDs, options);
  }
}
