// AI assistance: written with Claude Code, prompted by Kush; see the PR discussion.
import Express from 'express';
import registerDevGhostRoutes, {
  DEV_GHOST_ENV_VAR,
  DEV_GHOST_TOWN_NAME,
  DevRouteRegistrar,
  DevTownSource,
} from './DevGhostRoutes';
import { DevGhostHost } from './DevGhostControls';

type Handler = (req: Express.Request, res: Express.Response) => void;

describe('registerDevGhostRoutes', () => {
  const handlers = new Map<string, Handler>();
  const app: DevRouteRegistrar = {
    get: jest.fn((path: string, handler: Handler) => handlers.set(path, handler)),
  };
  let host: jest.Mocked<DevGhostHost> & { players: { id: string; userName: string }[] };
  let towns: jest.Mocked<DevTownSource>;
  const switchedOn = { [DEV_GHOST_ENV_VAR]: 'true' };

  /** Calls a registered route and returns the status code and JSON body it answered with */
  function call(path: string, query: Record<string, unknown> = {}) {
    const handler = handlers.get(path);
    if (!handler) {
      throw new Error(`${path} was not registered`);
    }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    handler({ query } as unknown as Express.Request, res as unknown as Express.Response);
    return { status: res.status.mock.calls[0][0], body: res.json.mock.calls[0][0] };
  }

  beforeEach(() => {
    handlers.clear();
    (app.get as jest.Mock).mockClear();
    host = {
      players: [
        { id: 'p1', userName: 'alice' },
        { id: 'p2', userName: 'bob' },
      ],
      setVisibilityPolicy: jest.fn(),
      resyncPositions: jest.fn(),
    };
    towns = {
      getTowns: jest.fn(() => [
        { friendlyName: 'Some other town', townID: 'other' },
        { friendlyName: DEV_GHOST_TOWN_NAME, townID: 'dev' },
      ]),
      getTownByID: jest.fn((townID: string) => (townID === 'dev' ? host : undefined)),
    };
  });

  describe('When it is not switched on', () => {
    it.each([{}, { [DEV_GHOST_ENV_VAR]: 'false' }, { [DEV_GHOST_ENV_VAR]: '1' }])(
      'Registers nothing with the environment %j',
      env => {
        expect(registerDevGhostRoutes(app, towns, env)).toBe(false);
        expect(app.get).not.toHaveBeenCalled();
      },
    );
    it('Is off when the process environment does not set the variable', () => {
      const saved = process.env[DEV_GHOST_ENV_VAR];
      delete process.env[DEV_GHOST_ENV_VAR];
      try {
        expect(registerDevGhostRoutes(app, towns)).toBe(false);
      } finally {
        if (saved !== undefined) {
          process.env[DEV_GHOST_ENV_VAR] = saved;
        }
      }
    });
  });

  describe('When it is switched on', () => {
    beforeEach(() => {
      expect(registerDevGhostRoutes(app, towns, switchedOn)).toBe(true);
    });
    it('Registers /dev/ghost and /dev/unghost', () => {
      expect([...handlers.keys()].sort()).toEqual(['/dev/ghost', '/dev/unghost']);
    });
    it('Makes the named player a ghost and answers with their ID', () => {
      expect(call('/dev/ghost', { name: 'alice' })).toEqual({
        status: 200,
        body: { ghostIDs: ['p1'] },
      });
      expect(host.setVisibilityPolicy).toHaveBeenCalledTimes(1);
      expect(host.resyncPositions).toHaveBeenCalledTimes(1);
    });
    it('Reuses one session per town, so a second ghost joins the first', () => {
      call('/dev/ghost', { name: 'alice' });
      call('/dev/ghost', { name: 'bob' });
      const policy = host.setVisibilityPolicy.mock.calls[1][0];
      expect(policy?.canSee('p1', 'p2')).toBe(true); // alice (ghost) sees bob (ghost)
      expect(policy?.canSee('p2', 'p1')).toBe(true);
    });
    it('Asks for a name when none is given', () => {
      expect(call('/dev/ghost').status).toBe(400);
      expect(call('/dev/ghost', { name: '' }).status).toBe(400);
      expect(call('/dev/ghost', { name: ['a', 'b'] }).status).toBe(400);
      expect(host.setVisibilityPolicy).not.toHaveBeenCalled();
    });
    it('Picks a player by join order with ?player=<n>, 1 being the first to join', () => {
      expect(call('/dev/ghost', { player: '2' })).toEqual({
        status: 200,
        body: { ghostIDs: ['p2'] },
      });
    });
    it.each(['0', '3', '-1', '1.5', 'x', '01', ''])('Rejects ?player=%s', player => {
      expect(call('/dev/ghost', { player }).status).toBe(400);
      expect(host.setVisibilityPolicy).not.toHaveBeenCalled();
    });
    it('Prefers ?name over ?player when both are given', () => {
      expect(call('/dev/ghost', { name: 'alice', player: '2' }).body).toEqual({ ghostIDs: ['p1'] });
    });
    it('Answers 404 for a name nobody has', () => {
      expect(call('/dev/ghost', { name: 'zed' }).status).toBe(404);
      expect(host.setVisibilityPolicy).not.toHaveBeenCalled();
    });
    it('Does not swallow an unexpected error', () => {
      host.resyncPositions.mockImplementation(() => {
        throw new Error('boom');
      });
      expect(() => call('/dev/ghost', { name: 'alice' })).toThrow('boom');
    });
    it('Ends the pretend game: removes the policy and resyncs', () => {
      call('/dev/ghost', { name: 'alice' });
      host.setVisibilityPolicy.mockClear();
      host.resyncPositions.mockClear();
      expect(call('/dev/unghost')).toEqual({ status: 200, body: { ghostIDs: [] } });
      expect(host.setVisibilityPolicy).toHaveBeenCalledWith(undefined);
      expect(host.resyncPositions).toHaveBeenCalledTimes(1);
    });
    it('Leaves the town alone when /dev/unghost comes before any ghost', () => {
      expect(call('/dev/unghost').status).toBe(200);
      expect(host.setVisibilityPolicy).not.toHaveBeenCalled();
      expect(host.resyncPositions).not.toHaveBeenCalled();
    });

    describe('Without a town named DEBUG_TOWN (only other towns exist)', () => {
      beforeEach(() => {
        towns.getTowns.mockReturnValue([{ friendlyName: 'Some other town', townID: 'dev' }]);
      });
      it('Refuses both routes and touches no town', () => {
        expect(call('/dev/ghost', { name: 'alice' }).status).toBe(404);
        expect(call('/dev/unghost').status).toBe(404);
        expect(towns.getTownByID).not.toHaveBeenCalled();
        expect(host.setVisibilityPolicy).not.toHaveBeenCalled();
        expect(host.resyncPositions).not.toHaveBeenCalled();
      });
    });
    it('Answers 404 when the listed dev town has gone', () => {
      towns.getTownByID.mockReturnValue(undefined);
      expect(call('/dev/ghost', { name: 'alice' }).status).toBe(404);
      expect(call('/dev/unghost').status).toBe(404);
    });
  });
});
