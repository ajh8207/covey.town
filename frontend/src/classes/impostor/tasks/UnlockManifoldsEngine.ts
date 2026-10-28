import { TaskEngine } from './TaskEngine';

/**
 * Handles the logic for the Unlock Manifolds task.
 * The player must select numbers from 1 through 10 in ascending order.
 */
export default class UnlockManifoldsEngine implements TaskEngine {
  private _nextNumber = 1;

  /**
   * The next number the player must select.
   */
  get nextNumber(): number {
    return this._nextNumber;
  }

  /**
   * How many numbers the player has entered correctly.
   */
  get progress(): number {
    return this._nextNumber - 1;
  }

  /**
   * Whether all ten numbers have been entered correctly.
   */
  isComplete(): boolean {
    return this._nextNumber === 11;
  }

  /**
   * Handle a number selected by the player.
   * An incorrect selection resets progress.
   */
  selectNumber(number: number): boolean {
    if (this.isComplete()) {
      return false;
    }

    if (number !== this._nextNumber) {
      this.reset();
      return false;
    }

    this._nextNumber += 1;
    return true;
  }

  /**
   * Reset the task to its initial state.
   */
  reset(): void {
    this._nextNumber = 1;
  }
}
