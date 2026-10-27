import { ImpostorVote, PlayerID } from '../../types/CoveyTownSocket';

/**
 * Outcome of a meeting vote: the ejected player, 'SKIP' (no one ejected),
 * or 'TIE' (the top count is shared, so no one is ejected).
 */
export type VoteOutcome = PlayerID | 'SKIP' | 'TIE';

/**
 * Tallies the votes cast during a meeting. 'SKIP' counts as a candidate, so a tie
 * between a player and skip is a 'TIE'. Players who did not vote are absent from
 * `votes` and have no effect. No votes at all is a 'SKIP'.
 *
 * @param votes The votes cast, at most one per voter
 * @returns The ejected player, 'SKIP' or 'TIE'
 * @throws Error if a voter appears more than once
 */
export function tallyVotes(votes: ReadonlyArray<ImpostorVote>): VoteOutcome {
  const voters = new Set(votes.map(vote => vote.voter));
  if (voters.size !== votes.length) {
    throw new Error('Cannot tally votes: a player voted more than once');
  }

  const counts = new Map<PlayerID | 'SKIP', number>();
  votes.forEach(({ target }) => counts.set(target, (counts.get(target) ?? 0) + 1));

  let top: VoteOutcome = 'SKIP';
  let topCount = 0;
  counts.forEach((count, target) => {
    if (count > topCount) {
      top = target;
      topCount = count;
    } else if (count === topCount) {
      top = 'TIE';
    }
  });
  return top;
}
