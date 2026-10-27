import MeetingManager from './MeetingManager';
import { createSessionSettings } from './SessionSettings';

describe('MeetingManager', () => {
  const settings = createSessionSettings({
    discussionDurationSec: 10,
    votingDurationSec: 20,
    resultsDurationSec: 5,
  });
  let alive: string[];
  let onChange: jest.Mock;
  let onResult: jest.Mock;
  let meeting: MeetingManager;

  beforeEach(() => {
    // Jest 28's fake timers fail on Node 18's read-only global performance
    jest.useFakeTimers({ doNotFake: ['performance'] });
    alive = ['p1', 'p2', 'p3', 'p4'];
    onChange = jest.fn();
    onResult = jest.fn();
    meeting = new MeetingManager(settings, () => alive, onChange, onResult);
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

  describe('Voting', () => {
    // Starts a meeting and skips past DISCUSSION.
    const startVoting = () => {
      meeting.start('p1');
      jest.advanceTimersByTime(10_000);
    };

    it.each(['DISCUSSION', 'RESULTS'])('Rejects votes during %s', phase => {
      meeting.start('p1');
      if (phase === 'RESULTS') {
        jest.advanceTimersByTime(30_000);
      }
      expect(meeting.phase).toBe(phase);
      expect(() => meeting.castVote('p1', 'p2')).toThrow('voting is not open');
    });

    it('Rejects votes when no meeting is active', () => {
      expect(() => meeting.castVote('p1', 'p2')).toThrow('voting is not open');
    });

    it('Rejects a vote from a dead or unknown player', () => {
      startVoting();
      alive = ['p1', 'p2', 'p3'];
      expect(() => meeting.castVote('p4', 'p1')).toThrow('voter is not alive');
      expect(() => meeting.castVote('stranger', 'p1')).toThrow('voter is not alive');
      expect(meeting.hasVoted).toEqual([]);
    });

    it('Rejects a vote for a dead or unknown target', () => {
      startVoting();
      alive = ['p1', 'p2', 'p3'];
      expect(() => meeting.castVote('p1', 'p4')).toThrow('target is not alive');
      expect(() => meeting.castVote('p1', 'stranger')).toThrow('target is not alive');
      expect(meeting.hasVoted).toEqual([]);
    });

    it('Accepts SKIP and a self vote', () => {
      startVoting();
      meeting.castVote('p1', 'SKIP');
      meeting.castVote('p2', 'p2');
      expect(meeting.hasVoted).toEqual(['p1', 'p2']);
    });

    it('Lists each voter once in hasVoted, even after a re-vote', () => {
      startVoting();
      meeting.castVote('p1', 'p2');
      meeting.castVote('p3', 'p2');
      meeting.castVote('p1', 'p3');
      expect(meeting.hasVoted).toEqual(['p1', 'p3']);
    });

    it('Passes the tally to onResult when VOTING ends, before RESULTS is announced', () => {
      startVoting();
      meeting.castVote('p1', 'p3');
      meeting.castVote('p2', 'p3');
      meeting.castVote('p3', 'SKIP');
      onResult.mockImplementation(() => expect(meeting.phase).toBe('VOTING'));

      jest.advanceTimersByTime(20_000 - 1);
      expect(onResult).not.toHaveBeenCalled();
      jest.advanceTimersByTime(1);
      expect(onResult).toHaveBeenCalledTimes(1);
      expect(onResult).toHaveBeenCalledWith('p3');
      expect(meeting.phase).toBe('RESULTS');
    });

    it('Counts the latest vote after a re-vote', () => {
      startVoting();
      meeting.castVote('p1', 'p2');
      meeting.castVote('p1', 'p3');
      jest.advanceTimersByTime(20_000);
      expect(onResult).toHaveBeenCalledWith('p3');
    });

    it.each<[string, [string, string][], string]>([
      ['no votes as SKIP', [], 'SKIP'],
      [
        'a tie as TIE',
        [
          ['p1', 'p2'],
          ['p2', 'p1'],
        ],
        'TIE',
      ],
    ])('Reports %s', (_, cast, expected) => {
      startVoting();
      cast.forEach(([voter, target]) => meeting.castVote(voter, target));
      jest.advanceTimersByTime(20_000);
      expect(onResult).toHaveBeenCalledWith(expected);
    });

    it('Starts the next meeting with no votes', () => {
      startVoting();
      meeting.castVote('p1', 'p2');
      jest.advanceTimersByTime(25_000);
      startVoting();
      expect(meeting.hasVoted).toEqual([]);
      jest.advanceTimersByTime(20_000);
      expect(onResult).toHaveBeenLastCalledWith('SKIP');
    });

    it('Drops votes from or for a player who left during VOTING', () => {
      startVoting();
      meeting.castVote('p1', 'p3');
      meeting.castVote('p2', 'p3');
      meeting.castVote('p3', 'p1');
      meeting.castVote('p4', 'p1');
      alive = ['p1', 'p2', 'p4'];
      jest.advanceTimersByTime(20_000);
      // p1 and p2 voted for p3 and p3's own vote is gone, leaving only p4's vote for p1
      expect(onResult).toHaveBeenCalledWith('p1');
      expect(meeting.hasVoted).toEqual(['p4']);
      expect(meeting.toState().votes).toEqual([{ voter: 'p4', target: 'p1' }]);
    });

    it('Still reaches RESULTS and ends when onResult throws', () => {
      onResult.mockImplementation(() => {
        throw new Error('controller failed');
      });
      startVoting();
      expect(() => jest.advanceTimersByTime(20_000)).toThrow('controller failed');
      expect(meeting.phase).toBe('RESULTS');
      jest.advanceTimersByTime(5_000);
      expect(meeting.phase).toBeUndefined();
      expect(() => meeting.start('p2')).not.toThrow();
    });

    it('Does not call onResult after dispose', () => {
      startVoting();
      meeting.castVote('p1', 'p2');
      meeting.dispose();
      jest.advanceTimersByTime(60_000);
      expect(onResult).not.toHaveBeenCalled();
      expect(meeting.hasVoted).toEqual([]);
    });
  });

  describe('toState', () => {
    it('Reports only isMeetingActive when no meeting is active', () => {
      expect(meeting.toState()).toEqual({ isMeetingActive: false });
    });

    it('Shows who voted but hides votes and the outcome until RESULTS', () => {
      meeting.start('p1');
      expect(meeting.toState()).toEqual({
        isMeetingActive: true,
        meetingPhase: 'DISCUSSION',
        meetingCaller: 'p1',
        hasVoted: [],
        meetingTimerSec: 10,
      });

      jest.advanceTimersByTime(10_000);
      meeting.castVote('p1', 'p3');
      meeting.castVote('p2', 'SKIP');
      const voting = meeting.toState();
      expect(voting.hasVoted).toEqual(['p1', 'p2']);
      expect(voting).not.toHaveProperty('votes');
      expect(voting).not.toHaveProperty('ejectedPlayer');
      expect(JSON.stringify(voting)).not.toContain('p3');

      jest.advanceTimersByTime(20_000);
      expect(meeting.toState()).toEqual({
        isMeetingActive: true,
        meetingPhase: 'RESULTS',
        meetingCaller: 'p1',
        hasVoted: ['p1', 'p2'],
        votes: [
          { voter: 'p1', target: 'p3' },
          { voter: 'p2', target: 'SKIP' },
        ],
        ejectedPlayer: 'TIE',
        meetingTimerSec: 5,
      });
    });

    it('Counts meetingTimerSec down, rounding up, and resets it each phase', () => {
      meeting.start('p1');
      jest.advanceTimersByTime(1);
      expect(meeting.toState().meetingTimerSec).toBe(10);
      jest.advanceTimersByTime(9_000 - 1);
      expect(meeting.toState().meetingTimerSec).toBe(1);
      jest.advanceTimersByTime(1_000);
      expect(meeting.toState().meetingTimerSec).toBe(20);
    });

    it('Reports the meeting as inactive once RESULTS ends', () => {
      meeting.start('p1');
      jest.advanceTimersByTime(35_000);
      expect(meeting.toState()).toEqual({ isMeetingActive: false });
    });
  });
});
