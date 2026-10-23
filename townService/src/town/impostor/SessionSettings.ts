/**
 * Configuration settings for an Impostor game session.
 */
export interface SessionSettings {
  /** Minimum number of players required to start a game (default: 4) */
  minPlayers: number;
  /** Maximum number of players permitted in a game (default: 10) */
  maxPlayers: number;
  /** Cooldown in seconds before an Impostor can perform a kill (default: 20) */
  killCooldownSec: number;
  /** Cooldown in seconds before an Impostor can trigger a sabotage (default: 30) */
  sabotageCooldownSec: number;
  /** Duration in seconds of emergency meeting open discussion (default: 15) */
  discussionDurationSec: number;
  /** Duration in seconds of emergency meeting voting phase (default: 30) */
  votingDurationSec: number;
  /** Duration in seconds of emergency meeting results reveal phase (default: 5) */
  resultsDurationSec: number;
  /** Maximum number of emergency meetings each player may call (default: 1) */
  emergencyMeetingsPerPlayer: number;
  /** Number of tasks assigned to each crewmate (default: 4) */
  tasksPerCrewmate: number;
}

/**
 * Default settings for an Impostor session.
 */
export const defaultSessionSettings: Readonly<SessionSettings> = Object.freeze({
  minPlayers: 4,
  maxPlayers: 10,
  killCooldownSec: 20,
  sabotageCooldownSec: 30,
  discussionDurationSec: 15,
  votingDurationSec: 30,
  resultsDurationSec: 5,
  emergencyMeetingsPerPlayer: 1,
  tasksPerCrewmate: 4,
});

/**
 * Returns the number of impostors that should be assigned for a given player count.
 *
 * Rules:
 * - 4 to 6 players: 1 Impostor
 * - 7 to 8 players: 2 Impostors
 * - 9 to 10 players: 2 Impostors
 *
 * @param playerCount Number of participating players
 * @throws Error if playerCount < minPlayers (4) or playerCount > maxPlayers (10)
 */
export function impostorCountForPlayerCount(playerCount: number): number {
  if (playerCount < defaultSessionSettings.minPlayers) {
    throw new Error(
      `Cannot start Impostor game: minimum ` +
        `${defaultSessionSettings.minPlayers} players required, got ${playerCount}`,
    );
  }
  if (playerCount > defaultSessionSettings.maxPlayers) {
    throw new Error(
      `Cannot start Impostor game: maximum ` +
        `${defaultSessionSettings.maxPlayers} players allowed, got ${playerCount}`,
    );
  }
  if (playerCount <= 6) {
    return 1;
  }
  return 2;
}

/**
 * Creates a complete SessionSettings object by merging optional overrides with defaults.
 *
 * @param overrides Partial settings to override default values
 * @returns Complete SessionSettings object
 */
export function createSessionSettings(overrides?: Partial<SessionSettings>): SessionSettings {
  return {
    ...defaultSessionSettings,
    ...overrides,
  };
}
