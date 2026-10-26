// AI assistance: written with Claude Code, prompted by Kush; see the PR discussion.
import { PlayerID } from '../../../types/CoveyTownSocket';
import SessionVisibilityPolicy, {
  VisibilityClass,
  VisibilityRoster,
  VisibilityRule,
} from './SessionVisibilityPolicy';

/** A session stand-in whose classes the test sets directly; unknown players are outsiders */
class FakeRoster implements VisibilityRoster {
  private readonly _classByPlayer = new Map<PlayerID, VisibilityClass>();

  set(playerID: PlayerID, visibilityClass: VisibilityClass): void {
    this._classByPlayer.set(playerID, visibilityClass);
  }

  visibilityClassOf(playerID: PlayerID): VisibilityClass {
    return this._classByPlayer.get(playerID) ?? 'outsider';
  }
}

describe('SessionVisibilityPolicy', () => {
  let roster: FakeRoster;

  beforeEach(() => {
    roster = new FakeRoster();
    roster.set('alive1', 'alive');
    roster.set('alive2', 'alive');
    roster.set('ghost1', 'ghost');
    roster.set('ghost2', 'ghost');
    roster.set('spectator1', 'spectator');
    roster.set('spectator2', 'spectator');
    // outsider1 and outsider2 are unknown to the roster, as town players are
  });

  describe('base table (design doc §15.8)', () => {
    const table: [VisibilityClass, VisibilityClass, boolean][] = [
      ['alive', 'alive', true],
      ['alive', 'ghost', false],
      ['alive', 'spectator', false],
      ['alive', 'outsider', true],
      ['ghost', 'alive', true],
      ['ghost', 'ghost', true],
      ['ghost', 'spectator', true],
      ['ghost', 'outsider', true],
      ['spectator', 'alive', true],
      ['spectator', 'ghost', true],
      ['spectator', 'spectator', true],
      ['spectator', 'outsider', true],
      ['outsider', 'alive', true],
      ['outsider', 'ghost', false],
      ['outsider', 'spectator', false],
      ['outsider', 'outsider', true],
    ];
    it.each(table)('A %s viewer may see a %s subject: %p', (viewer, subject, expected) => {
      const policy = new SessionVisibilityPolicy(roster);
      expect(policy.canSee(`${viewer}1`, `${subject}2`)).toBe(expected);
    });
    it.each(['alive', 'ghost', 'spectator', 'outsider'])('A %s player sees themself', cls => {
      const policy = new SessionVisibilityPolicy(roster);
      expect(policy.canSee(`${cls}1`, `${cls}1`)).toBe(true);
    });
    it('Uses the roster as of each call, so a death takes effect on the next update', () => {
      const policy = new SessionVisibilityPolicy(roster);
      expect(policy.canSee('alive1', 'alive2')).toBe(true);
      roster.set('alive2', 'ghost');
      expect(policy.canSee('alive1', 'alive2')).toBe(false);
      expect(policy.canSee('ghost1', 'alive2')).toBe(true);
      roster.set('alive2', 'outsider');
      expect(policy.canSee('alive1', 'alive2')).toBe(true);
    });
  });

  describe('extra rules', () => {
    const hidesNothing: VisibilityRule = { name: 'hides nothing', hides: () => false };
    const hidesEverything: VisibilityRule = { name: 'hides everything', hides: () => true };

    it('Cannot reveal what the base table hides', () => {
      const policy = new SessionVisibilityPolicy(roster, [hidesNothing]);
      expect(policy.canSee('alive1', 'ghost1')).toBe(false);
      expect(policy.canSee('outsider1', 'spectator1')).toBe(false);
    });
    it('Hides a subject if any one rule hides it, whatever the order', () => {
      expect(
        new SessionVisibilityPolicy(roster, [hidesNothing, hidesEverything]).canSee(
          'alive1',
          'alive2',
        ),
      ).toBe(false);
      expect(
        new SessionVisibilityPolicy(roster, [hidesEverything, hidesNothing]).canSee(
          'alive1',
          'alive2',
        ),
      ).toBe(false);
    });
    it('Never hides a player from themself, and never asks a rule about it', () => {
      const hides = jest.fn(() => true);
      const policy = new SessionVisibilityPolicy(roster, [{ name: 'spy', hides }]);
      expect(policy.canSee('alive1', 'alive1')).toBe(true);
      expect(hides).not.toHaveBeenCalled();
    });
    it('Passes the viewer and subject to the rule in that order', () => {
      const hides = jest.fn(() => false);
      new SessionVisibilityPolicy(roster, [{ name: 'spy', hides }]).canSee('alive1', 'alive2');
      expect(hides).toHaveBeenCalledWith('alive1', 'alive2');
    });
    it('Lets a vent-style rule hide a subject from the living while ghosts still see it', () => {
      const venting = new Set<PlayerID>(['alive2']);
      const inVent: VisibilityRule = {
        name: 'in-vent Impostor hidden from the living (DS-5 shape)',
        hides: (viewerID, subjectID) =>
          venting.has(subjectID) && roster.visibilityClassOf(viewerID) === 'alive',
      };
      const policy = new SessionVisibilityPolicy(roster, [inVent]);
      expect(policy.canSee('alive1', 'alive2')).toBe(false);
      expect(policy.canSee('ghost1', 'alive2')).toBe(true);
      expect(policy.canSee('spectator1', 'alive2')).toBe(true);
    });
    it('Lets a rule hide a subject from ghosts and spectators too (DS-17 shape)', () => {
      const isInMatch = (playerID: PlayerID) => roster.visibilityClassOf(playerID) !== 'outsider';
      const townMatchSeparation: VisibilityRule = {
        name: 'town and match players do not see each other (DS-17 shape)',
        hides: (viewerID, subjectID) => isInMatch(viewerID) !== isInMatch(subjectID),
      };
      const policy = new SessionVisibilityPolicy(roster, [townMatchSeparation]);
      expect(policy.canSee('ghost1', 'outsider1')).toBe(false);
      expect(policy.canSee('spectator1', 'outsider1')).toBe(false);
      expect(policy.canSee('outsider1', 'alive1')).toBe(false);
      expect(policy.canSee('ghost1', 'alive1')).toBe(true);
      expect(policy.canSee('outsider1', 'outsider2')).toBe(true);
    });
  });
});
