import { ImpostorVote } from '../../types/CoveyTownSocket';
import { tallyVotes, VoteOutcome } from './VoteTally';

// Builds votes from [voter, target] pairs.
const votes = (...pairs: [string, string][]): ImpostorVote[] =>
  pairs.map(([voter, target]) => ({ voter, target }));

describe('tallyVotes', () => {
  it.each<[string, ImpostorVote[], VoteOutcome]>([
    ['no votes', [], 'SKIP'],
    ['single vote ejects', votes(['p1', 'p2']), 'p2'],
    ['clear majority ejects', votes(['p1', 'p2'], ['p3', 'p2'], ['p2', 'p1']), 'p2'],
    ['plurality ejects', votes(['p1', 'p2'], ['p3', 'p2'], ['p2', 'p1'], ['p4', 'SKIP']), 'p2'],
    ['two players tied', votes(['p1', 'p2'], ['p2', 'p1']), 'TIE'],
    ['three-way tie', votes(['p1', 'p2'], ['p2', 'p3'], ['p3', 'p1']), 'TIE'],
    [
      'tie for first beats a lower count',
      votes(['p1', 'p2'], ['p3', 'p2'], ['p2', 'p1'], ['p4', 'p1'], ['p5', 'p3']),
      'TIE',
    ],
    ['all skip', votes(['p1', 'SKIP'], ['p2', 'SKIP']), 'SKIP'],
    ['skip wins over a player', votes(['p1', 'SKIP'], ['p2', 'SKIP'], ['p3', 'p1']), 'SKIP'],
    ['player tied with skip', votes(['p1', 'SKIP'], ['p2', 'p1']), 'TIE'],
    ['player beats skip', votes(['p1', 'SKIP'], ['p2', 'p1'], ['p3', 'p1']), 'p1'],
    // p4 and p5 are in the meeting but never voted
    ['non-voters do not count', votes(['p1', 'p2'], ['p3', 'p2'], ['p2', 'SKIP']), 'p2'],
    ['self vote counts', votes(['p1', 'p1']), 'p1'],
  ])('%s', (_, input, expected) => {
    expect(tallyVotes(input)).toBe(expected);
  });

  it('throws when a voter votes twice', () => {
    expect(() => tallyVotes(votes(['p1', 'p2'], ['p1', 'p3']))).toThrow(
      'Cannot tally votes: a player voted more than once',
    );
  });

  it('does not mutate its input', () => {
    const input = votes(['p1', 'p2'], ['p2', 'p1']);
    const copy = JSON.parse(JSON.stringify(input));
    tallyVotes(input);
    expect(input).toEqual(copy);
  });
});
