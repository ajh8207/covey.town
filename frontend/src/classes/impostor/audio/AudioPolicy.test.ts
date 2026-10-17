import PlayerController from '../../PlayerController';
import AudioPolicy, { canHear, noAudioPolicy } from './AudioPolicy';

function player(id: string): PlayerController {
  return new PlayerController(id, id, { x: 0, y: 0, rotation: 'front', moving: false });
}

function policy(ghostIDs: string[], meeting: boolean): AudioPolicy {
  return { isGhost: id => ghostIDs.includes(id), meetingActive: () => meeting };
}

describe('canHear', () => {
  const living = player('living');
  const otherLiving = player('otherLiving');
  const ghost = player('ghost');
  const otherGhost = player('otherGhost');
  const near = () => true;
  const far = () => false;

  it('Uses the proximity rule when there are no ghosts and no meeting', () => {
    expect(canHear(living, otherLiving, noAudioPolicy, near)).toBe(true);
    expect(canHear(living, otherLiving, noAudioPolicy, far)).toBe(false);
  });
  it('Never lets a living player hear a ghost, even nearby', () => {
    expect(canHear(living, ghost, policy(['ghost'], false), near)).toBe(false);
  });
  it('Never lets a living player hear a ghost during a meeting', () => {
    expect(canHear(living, ghost, policy(['ghost'], true), near)).toBe(false);
  });
  it('Lets a ghost hear nearby living players and ghosts', () => {
    const ghosts = policy(['ghost', 'otherGhost'], false);
    expect(canHear(ghost, living, ghosts, near)).toBe(true);
    expect(canHear(ghost, otherGhost, ghosts, near)).toBe(true);
    expect(canHear(ghost, otherGhost, ghosts, far)).toBe(false);
  });
  it('Lets everyone hear living players at any distance during a meeting', () => {
    const meeting = policy(['ghost'], true);
    expect(canHear(living, otherLiving, meeting, far)).toBe(true);
    expect(canHear(ghost, living, meeting, far)).toBe(true);
  });
  it('Lets ghosts hear each other at any distance during a meeting', () => {
    expect(canHear(ghost, otherGhost, policy(['ghost', 'otherGhost'], true), far)).toBe(true);
  });
});
