class ProgressService {
  private callbacks: ((step: string, progress: number) => void)[] = [];

  constructor() {}

  /**
   * Add a callback function to be notified of progress updates
   * @param callback - Function to call when progress updates occur
   */
  addCallback(callback: (step: string, progress: number) => void): void {
    this.callbacks.push(callback);
  }

  /**
   * Remove a specific callback function
   * @param callback - Function to remove from callbacks
   */
  removeCallback(callback: (step: string, progress: number) => void): void {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }

  /**
   * Clear all registered callbacks
   */
  clearCallbacks(): void {
    this.callbacks.length = 0;
  }

  /**
   * isEmpty - Check if there are no registered callbacks
   */
  getCallBackCount(): number {
    return this.callbacks.length;
  }

  /**
   * Updates progress and notifies all registered callbacks
   * @param step - The current step name
   * @param progress - Progress percentage (0-100)
   */
  progressUpdater(
    step: string,
    progress: number,
    progressNumber: number = 0,
  ): void {
    // Notify all registered callbacks
    this.callbacks.forEach((callback) => {
      try {
        callback(step, progress);
      } catch (error) {
        console.error('Error in progress callback:', error);
      }
    });
  }

  /**
   * Reset the service by clearing all callbacks
   */
  reset(): void {
    this.clearCallbacks();
  }
}
export default ProgressService;
