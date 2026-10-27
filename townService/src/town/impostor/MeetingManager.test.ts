import MeetingManager from './MeetingManager';
import { createSessionSettings } from './SessionSettings';

describe('MeetingManager', () => {
  const settings = createSessionSettings({
    discussionDurationSec: 10,
    votingDurationSec: 20,
    resultsDurationSec: 5,
  });
  let onChange: jest.Mock;
  let meeting: MeetingManager;

  beforeEach(() => {
    // Jest 28's fake timers fail on Node 18's read-only global performance
    jest.useFakeTimers({ doNotFake: ['performance'] });
    onChange = jest.fn();
    meeting = new MeetingManager(settings, onChange);
  });

  afterEach(() => {
    meeting.dispose();
    jest.useRealTimers();
  });

  it('Has no phase before a meeting starts', () => {
    expect(meeting.phase).toBeUndefined();
    expect(meeting.caller).toBeUndefined();
  });

  it('Starts in DISCUSSION with the caller recorded', () => {
    meeting.start('p1');
    expect(meeting.phase).toBe('DISCUSSION');
    expect(meeting.caller).toBe('p1');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('Moves through each phase at exactly its duration, then ends', () => {
    meeting.start('p1');

    jest.advanceTimersByTime(10_000 - 1);
    expect(meeting.phase).toBe('DISCUSSION');
    jest.advanceTimersByTime(1);
    expect(meeting.phase).toBe('VOTING');

    jest.advanceTimersByTime(20_000 - 1);
    expect(meeting.phase).toBe('VOTING');
    jest.advanceTimersByTime(1);
    expect(meeting.phase).toBe('RESULTS');

    jest.advanceTimersByTime(5_000 - 1);
    expect(meeting.phase).toBe('RESULTS');
    jest.advanceTimersByTime(1);
    expect(meeting.phase).toBeUndefined();
    expect(meeting.caller).toBeUndefined();

    // DISCUSSION, VOTING, RESULTS, ended
    expect(onChange).toHaveBeenCalledTimes(4);
  });

  it('Throws when a meeting is already active', () => {
    meeting.start('p1');
    expect(() => meeting.start('p2')).toThrow('a meeting is already active');
    expect(meeting.caller).toBe('p1');
  });

  it('Allows a new meeting after the previous one ends', () => {
    meeting.start('p1');
    jest.advanceTimersByTime(35_000);
    meeting.start('p2');
    expect(meeting.phase).toBe('DISCUSSION');
    expect(meeting.caller).toBe('p2');
  });

  it('Stops all phase changes on dispose', () => {
    meeting.start('p1');
    meeting.dispose();
    jest.advanceTimersByTime(60_000);
    expect(meeting.phase).toBeUndefined();
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
