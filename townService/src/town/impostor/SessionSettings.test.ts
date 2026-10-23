import {
  createSessionSettings,
  defaultSessionSettings,
  impostorCountForPlayerCount,
} from './SessionSettings';

describe('SessionSettings', () => {
  describe('defaultSessionSettings', () => {
    it('provides correct default values matching game rules', () => {
      expect(defaultSessionSettings.minPlayers).toBe(4);
      expect(defaultSessionSettings.maxPlayers).toBe(10);
      expect(defaultSessionSettings.killCooldownSec).toBe(20);
      expect(defaultSessionSettings.sabotageCooldownSec).toBe(30);
      expect(defaultSessionSettings.discussionDurationSec).toBe(15);
      expect(defaultSessionSettings.votingDurationSec).toBe(30);
      expect(defaultSessionSettings.resultsDurationSec).toBe(5);
      expect(defaultSessionSettings.emergencyMeetingsPerPlayer).toBe(1);
      expect(defaultSessionSettings.tasksPerCrewmate).toBe(4);
    });

    it('is an immutable frozen object', () => {
      expect(Object.isFrozen(defaultSessionSettings)).toBe(true);
    });
  });

  describe('createSessionSettings', () => {
    it('returns exact defaults when no overrides are provided', () => {
      const settings = createSessionSettings();
      expect(settings).toEqual(defaultSessionSettings);
    });

    it('applies partial overrides while preserving other defaults', () => {
      const settings = createSessionSettings({
        killCooldownSec: 15,
        tasksPerCrewmate: 6,
      });
      expect(settings.killCooldownSec).toBe(15);
      expect(settings.tasksPerCrewmate).toBe(6);
      expect(settings.minPlayers).toBe(defaultSessionSettings.minPlayers);
      expect(settings.votingDurationSec).toBe(defaultSessionSettings.votingDurationSec);
    });
  });

  describe('impostorCountForPlayerCount', () => {
    it('throws when player count is below minPlayers (4)', () => {
      expect(() => impostorCountForPlayerCount(0)).toThrow('minimum 4 players required');
      expect(() => impostorCountForPlayerCount(1)).toThrow('minimum 4 players required');
      expect(() => impostorCountForPlayerCount(2)).toThrow('minimum 4 players required');
      expect(() => impostorCountForPlayerCount(3)).toThrow('minimum 4 players required');
    });

    it('throws when player count exceeds maxPlayers (10)', () => {
      expect(() => impostorCountForPlayerCount(11)).toThrow('maximum 10 players allowed');
      expect(() => impostorCountForPlayerCount(20)).toThrow('maximum 10 players allowed');
    });

    it('returns 1 Impostor for 4, 5, or 6 players', () => {
      expect(impostorCountForPlayerCount(4)).toBe(1);
      expect(impostorCountForPlayerCount(5)).toBe(1);
      expect(impostorCountForPlayerCount(6)).toBe(1);
    });

    it('returns 2 Impostors for 7, 8, 9, or 10 players', () => {
      expect(impostorCountForPlayerCount(7)).toBe(2);
      expect(impostorCountForPlayerCount(8)).toBe(2);
      expect(impostorCountForPlayerCount(9)).toBe(2);
      expect(impostorCountForPlayerCount(10)).toBe(2);
    });
  });
});
