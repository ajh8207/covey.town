// AI assistance: written with Claude Code, prompted by Kush; see the PR discussion.
import Express from 'express';
import InvalidParametersError from '../../../lib/InvalidParametersError';
import DevGhostControls, { DevGhostHost } from './DevGhostControls';

/** The server environment variable that switches the dev ghost routes on. Off by default. */
export const DEV_GHOST_ENV_VAR = 'DEV_GHOST_ROUTES';

/** The only town the dev routes act on: the one the frontend creates in dev mode. */
export const DEV_GHOST_TOWN_NAME = 'DEBUG_TOWN';

/** The part of TownsStore the dev routes use. */
export interface DevTownSource {
  /** The publicly listed towns */
  getTowns(): { friendlyName: string; townID: string }[];
  /** The town with this ID, if there is one */
  getTownByID(townID: string): DevGhostHost | undefined;
}

/** The part of an Express app the dev routes use. */
export interface DevRouteRegistrar {
  /** Registers a handler for GET requests to a path */
  get(path: string, handler: (req: Express.Request, res: Express.Response) => void): unknown;
}

/**
 * The user name of the player a request asks for: `?name=<userName>`, or `?player=<n>` for the
 * nth player to have joined (1 is the first), because dev-mode user names are random IDs.
 *
 * @returns the user name, or undefined if the request names nobody who is in the town
 */
function requestedUserName(town: DevGhostHost, query: Express.Request['query']) {
  const { name, player } = query;
  if (typeof name === 'string' && name.length > 0) {
    return name;
  }
  if (typeof player === 'string' && /^[1-9]\d*$/.test(player)) {
    return town.players[Number(player) - 1]?.userName;
  }
  return undefined;
}

/**
 * Registers `GET /dev/ghost?name=<userName>` (or `?player=<n>`) and `GET /dev/unghost` so a
 * browser tab (or curl) can turn a player in the dev town into a ghost, and end the pretend
 * game. They play the part of the Impostor session, which nothing installs yet, to make the
 * visibility layer visible.
 *
 * Does nothing unless the server was started with DEV_GHOST_ROUTES=true, and even then only
 * acts on the town named DEBUG_TOWN, so a normal town can never be affected.
 *
 * @param app the Express app to add the routes to
 * @param towns where to look the dev town up
 * @param env the server environment (injectable for tests)
 * @returns true if the routes were registered, false if they are switched off
 */
export default function registerDevGhostRoutes(
  app: DevRouteRegistrar,
  towns: DevTownSource,
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (env[DEV_GHOST_ENV_VAR] !== 'true') {
    return false;
  }
  const controlsByTown = new WeakMap<DevGhostHost, DevGhostControls>();

  const devTown = (): DevGhostHost | undefined => {
    const listed = towns.getTowns().find(each => each.friendlyName === DEV_GHOST_TOWN_NAME);
    return listed && towns.getTownByID(listed.townID);
  };

  app.get('/dev/ghost', (req, res) => {
    const town = devTown();
    const userName = town && requestedUserName(town, req.query);
    if (!town) {
      res.status(404).json({ message: `There is no town named ${DEV_GHOST_TOWN_NAME}` });
    } else if (userName === undefined) {
      res.status(400).json({
        message: `Give a player as ?name=<userName> or ?player=<1 to ${town.players.length}>`,
      });
    } else {
      let controls = controlsByTown.get(town);
      if (!controls) {
        controls = new DevGhostControls(town);
        controlsByTown.set(town, controls);
      }
      try {
        const ghostIDs = controls.makeGhost(userName);
        res.status(200).json({ ghostIDs });
      } catch (err) {
        if (!(err instanceof InvalidParametersError)) {
          throw err;
        }
        res.status(404).json({ message: err.message });
      }
    }
  });

  app.get('/dev/unghost', (_req, res) => {
    const town = devTown();
    if (!town) {
      res.status(404).json({ message: `There is no town named ${DEV_GHOST_TOWN_NAME}` });
    } else {
      controlsByTown.get(town)?.clear();
      res.status(200).json({ ghostIDs: [] });
    }
  });
  return true;
}
