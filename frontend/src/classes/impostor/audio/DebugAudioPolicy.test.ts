import PlayerController from '../../PlayerController';
import DebugAudioPolicy, { debugAudioEnabled } from './DebugAudioPolicy';

describe('DebugAudioPolicy', () => {
  const location = { x: 0, y: 0, rotation: 'front' as const, moving: false };
  const players = [
    new PlayerController('1', 'Ghost-Nick', location),
    new PlayerController('2', 'Kush', location),
    new PlayerController('3', 'notaghost', location),
  ];

  it('Treats usernames starting with "ghost" (any case) as ghosts', () => {
    const policy = new DebugAudioPolicy(() => players, jest.fn());
    expect(policy.isGhost('1')).toBe(true);
    expect(policy.isGhost('2')).toBe(false);
    expect(policy.isGhost('3')).toBe(false);
    expect(policy.isGhost('unknown')).toBe(false);
  });
  it('Starts with no meeting and reports each change once', () => {
    const onChange = jest.fn();
    const policy = new DebugAudioPolicy(() => players, onChange);
    expect(policy.meetingActive()).toBe(false);
    policy.setMeeting(true);
    policy.setMeeting(true);
    expect(policy.meetingActive()).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
    policy.setMeeting(false);
    expect(policy.meetingActive()).toBe(false);
    expect(onChange).toHaveBeenCalledTimes(2);
  });
  describe('debugAudioEnabled', () => {
    it.each(['true', ' TRUE '])('Is enabled for %p', flag => {
      expect(debugAudioEnabled(flag)).toBe(true);
    });
    it.each([undefined, '', 'false', '1', 'yes'])('Is disabled for %p', flag => {
      expect(debugAudioEnabled(flag)).toBe(false);
    });
  });
});
