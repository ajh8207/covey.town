export interface TaskEngine {
  /**
   * isComplete returns true if the task has been completed, false otherwise.
   */
  isComplete(): boolean;

  /** reset resets the task to its initial state.
   *
   */
  reset(): void;
}
