import RoleAssigner, { assignRoles } from './RoleAssigner';
import { createSessionSettings } from './SessionSettings';

describe('RoleAssigner', () => {
  const createPlayerIDs = (count: number): string[] =>
    Array.from({ length: count }, (_, i) => `player-${i + 1}`);

  describe('Validation', () => {
    it('throws when player count is below minimum (4)', () => {
      expect(() => assignRoles(createPlayerIDs(3))).toThrow(
        'Cannot assign roles: minimum 4 players required, got 3',
      );
      expect(() => assignRoles([])).toThrow(
        'Cannot assign roles: minimum 4 players required, got 0',
      );
    });

    it('throws when player count exceeds maximum (10)', () => {
      expect(() => assignRoles(createPlayerIDs(11))).toThrow(
        'Cannot assign roles: maximum 10 players allowed, got 11',
      );
    });

    it('throws when duplicate player IDs are provided', () => {
      const playersWithDuplicate = ['p1', 'p2', 'p3', 'p4', 'p2'];
      expect(() => assignRoles(playersWithDuplicate)).toThrow(
        'Cannot assign roles: playerIDs array contains duplicate player IDs',
      );
    });

    it('throws if custom impostorCount is less than 1 or not an integer', () => {
      expect(() => assignRoles(createPlayerIDs(6), { impostorCount: 0 })).toThrow(
        'impostorCount must be a positive integer, got 0',
      );
      expect(() => assignRoles(createPlayerIDs(6), { impostorCount: 1.5 })).toThrow(
        'impostorCount must be a positive integer, got 1.5',
      );
    });

    it('throws if custom impostorCount is greater than or equal to half the players', () => {
      expect(() => assignRoles(createPlayerIDs(4), { impostorCount: 2 })).toThrow(
        'impostorCount (2) must be strictly less than half the player count (4)',
      );
      expect(() => assignRoles(createPlayerIDs(5), { impostorCount: 3 })).toThrow(
        'impostorCount (3) must be strictly less than half the player count (5)',
      );
    });

    it('allows 2 impostors with 5 players (2 * 2 < 5)', () => {
      const players = createPlayerIDs(5);
      const result = assignRoles(players, { impostorCount: 2, seed: 123 });
      expect(result.impostors).toHaveLength(2);
      expect(result.crewmates).toHaveLength(3);
    });
  });

  describe('Role Distribution by Player Count', () => {
    it.each([
      [4, 1, 3],
      [5, 1, 4],
      [6, 1, 5],
      [7, 2, 5],
      [8, 2, 6],
      [9, 2, 7],
      [10, 2, 8],
    ])(
      'for %i players assigns %i Impostor(s) and %i Crewmate(s)',
      (playerCount, expectedImpostors, expectedCrewmates) => {
        const players = createPlayerIDs(playerCount);
        const result = assignRoles(players, { seed: 12345 });

        expect(result.impostors).toHaveLength(expectedImpostors);
        expect(result.crewmates).toHaveLength(expectedCrewmates);
        expect(result.roles.size).toBe(playerCount);

        // Every player has a role assigned
        players.forEach(p => {
          expect(result.roles.has(p)).toBe(true);
        });

        // Impostors have 'Impostor' role and crewmates have 'Crewmate' role
        result.impostors.forEach(impID => {
          expect(result.roles.get(impID)).toBe('Impostor');
        });
        result.crewmates.forEach(crewID => {
          expect(result.roles.get(crewID)).toBe('Crewmate');
        });
      },
    );
  });

  describe('Teammates Lookup (getTeammates)', () => {
    it('returns empty array for an impostor when there is only 1 impostor', () => {
      const players = createPlayerIDs(5);
      const result = assignRoles(players, { seed: 42 });

      expect(result.impostors).toHaveLength(1);
      const soleImpostor = result.impostors[0];

      expect(result.getTeammates(soleImpostor)).toEqual([]);
    });

    it('returns the fellow impostor(s) for each impostor in a 2-impostor game', () => {
      const players = createPlayerIDs(8);
      const result = assignRoles(players, { seed: 999 });

      expect(result.impostors).toHaveLength(2);
      const [imp1, imp2] = result.impostors;

      expect(result.getTeammates(imp1)).toEqual([imp2]);
      expect(result.getTeammates(imp2)).toEqual([imp1]);
    });

    it('returns undefined for any crewmate', () => {
      const players = createPlayerIDs(6);
      const result = assignRoles(players, { seed: 101 });

      result.crewmates.forEach(crewID => {
        expect(result.getTeammates(crewID)).toBeUndefined();
      });
    });

    it('returns undefined for a player ID not in the game', () => {
      const players = createPlayerIDs(4);
      const result = assignRoles(players, { seed: 55 });

      expect(result.getTeammates('non-existent-player')).toBeUndefined();
    });
  });

  describe('Determinism & Seeding', () => {
    it('produces the exact same role assignment given identical seeds', () => {
      const players = createPlayerIDs(7);
      const run1 = assignRoles(players, { seed: 'match-xyz' });
      const run2 = assignRoles(players, { seed: 'match-xyz' });

      expect(run1.impostors).toEqual(run2.impostors);
      expect(run1.crewmates).toEqual(run2.crewmates);
      expect(Array.from(run1.roles.entries())).toEqual(Array.from(run2.roles.entries()));
    });

    it('produces different role assignments with different seeds', () => {
      const players = createPlayerIDs(10);
      const run1 = assignRoles(players, { seed: 111 });
      const run2 = assignRoles(players, { seed: 222 });

      expect(run1.impostors).not.toEqual(run2.impostors);
    });
  });

  describe('Custom Settings and Overrides', () => {
    it('supports custom valid impostorCount override', () => {
      const players = createPlayerIDs(8);
      // Default for 8 players is 2 impostors; override to 1
      const result = assignRoles(players, { impostorCount: 1, seed: 10 });

      expect(result.impostors).toHaveLength(1);
      expect(result.crewmates).toHaveLength(7);
    });

    it('respects custom session settings for player boundaries', () => {
      const customSettings = createSessionSettings({
        minPlayers: 6,
        maxPlayers: 8,
      });

      expect(() => assignRoles(createPlayerIDs(5), { settings: customSettings })).toThrow(
        'minimum 6 players required, got 5',
      );

      expect(() => assignRoles(createPlayerIDs(9), { settings: customSettings })).toThrow(
        'maximum 8 players allowed, got 9',
      );

      const validResult = assignRoles(createPlayerIDs(6), { settings: customSettings });
      expect(validResult.roles.size).toBe(6);
    });

    it('respects custom maxPlayers > 10 and computes impostor count without throwing', () => {
      const customSettings = createSessionSettings({
        minPlayers: 4,
        maxPlayers: 12,
      });

      const result = assignRoles(createPlayerIDs(11), { settings: customSettings });
      expect(result.impostors).toHaveLength(2);
      expect(result.crewmates).toHaveLength(9);
    });

    it('RoleAssigner.assign static method matches assignRoles function', () => {
      const players = createPlayerIDs(5);
      const resStatic = RoleAssigner.assign(players, { seed: 'same' });
      const resFunc = assignRoles(players, { seed: 'same' });

      expect(resStatic.impostors).toEqual(resFunc.impostors);
      expect(resStatic.crewmates).toEqual(resFunc.crewmates);
    });
  });
});
