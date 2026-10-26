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
 * - 7 to 10 players: 2 Impostors
 *
 * @param playerCount Number of participating players
 * @param settings Optional SessionSettings to use for min and max player boundaries
 * @throws Error if playerCount < settings.minPlayers or playerCount > settings.maxPlayers
 */
export function impostorCountForPlayerCount(
  playerCount: number,
  settings: SessionSettings = defaultSessionSettings,
): number {
  if (playerCount < settings.minPlayers) {
    throw new Error(
      `Cannot start Impostor game: minimum ` +
        `${settings.minPlayers} players required, got ${playerCount}`,
    );
  }
  if (playerCount > settings.maxPlayers) {
    throw new Error(
      `Cannot start Impostor game: maximum ` +
        `${settings.maxPlayers} players allowed, got ${playerCount}`,
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
 * @throws Error if minPlayers < 4, minPlayers > maxPlayers, or any duration/count is negative
 */
export function createSessionSettings(overrides?: Partial<SessionSettings>): SessionSettings {
  const merged = {
    ...defaultSessionSettings,
    ...overrides,
  };

  if (merged.minPlayers < 4) {
    throw new Error(`Invalid settings: minPlayers (${merged.minPlayers}) cannot be less than 4`);
  }
  if (merged.minPlayers > merged.maxPlayers) {
    throw new Error(
      `Invalid settings: minPlayers (${merged.minPlayers}) cannot be greater than ` +
        `maxPlayers (${merged.maxPlayers})`,
    );
  }
  if (
    merged.killCooldownSec < 0 ||
    merged.sabotageCooldownSec < 0 ||
    merged.discussionDurationSec < 0 ||
    merged.votingDurationSec < 0 ||
    merged.resultsDurationSec < 0 ||
    merged.emergencyMeetingsPerPlayer < 0 ||
    merged.tasksPerCrewmate < 0
  ) {
    throw new Error('Invalid settings: cooldowns, durations, and counts cannot be negative');
  }

  return merged;
}
