import {
  ElectronTerminal,
  ElectronTerminalProcess,
  TerminalInfo,
} from "./ElectronTerminalProcess";

export class ElectronTerminalManager {
  private terminals = new Map<string, TerminalInfo>();
  private processes = new Map<string, ElectronTerminalProcess>();
  private nextId = 1;
  private terminalOutputLineLimit = 500;

  constructor() {
    console.log("[ElectronTerminalManager] Initialized");
  }

  async getOrCreateTerminal(cwd?: string): Promise<TerminalInfo> {
    const targetCwd = cwd || process.cwd();

    // Try to find existing terminal with same cwd
    for (const [id, terminalInfo] of this.terminals) {
      if (terminalInfo.terminal.getCwd() === targetCwd && !terminalInfo.busy) {
        console.log(
          `[ElectronTerminalManager] Reusing existing terminal ${id} for cwd: ${targetCwd}`,
        );
        return terminalInfo;
      }
    }

    // Create new terminal
    const id = `terminal-${this.nextId++}`;
    const terminal = new ElectronTerminal({
      name: `Cline Terminal ${this.nextId - 1}`,
      cwd: targetCwd,
    });

    const terminalInfo: TerminalInfo = {
      id,
      terminal,
      busy: false,
    };

    this.terminals.set(id, terminalInfo);
    console.log(
      `[ElectronTerminalManager] Created new terminal ${id} for cwd: ${targetCwd}`,
    );

    return terminalInfo;
  }

  runCommand(
    terminalInfo: TerminalInfo,
    command: string,
  ): ElectronTerminalProcess & Promise<void> {
    console.log(
      `[ElectronTerminalManager] Running command on terminal ${terminalInfo.id}: ${command}`,
    );

    terminalInfo.busy = true;
    terminalInfo.lastCommand = command;

    const process = new ElectronTerminalProcess();
    this.processes.set(terminalInfo.id, process);

    process.once("completed", () => {
      terminalInfo.busy = false;
      console.log(
        `[ElectronTerminalManager] Command completed on terminal ${terminalInfo.id}`,
      );
    });

    process.once("error", (error) => {
      terminalInfo.busy = false;
      console.error(
        `[ElectronTerminalManager] Command error on terminal ${terminalInfo.id}:`,
        error,
      );
    });

    // Create promise for the process
    const promise = new Promise<void>((resolve, reject) => {
      process.once("continue", () => resolve());
      process.once("error", (error) => reject(error));
    });

    // Run the command
    process.run(terminalInfo.terminal, command);

    // Return merged promise/process object
    return this.mergePromise(process, promise);
  }

  private mergePromise(
    process: ElectronTerminalProcess,
    promise: Promise<void>,
  ): ElectronTerminalProcess & Promise<void> {
    // Create a new object that combines the process and promise
    const merged = Object.create(process);

    // Copy promise methods
    merged.then = promise.then.bind(promise);
    merged.catch = promise.catch.bind(promise);
    merged.finally = promise.finally.bind(promise);

    // Add Symbol.toStringTag for proper Promise behavior
    merged[Symbol.toStringTag] = "Promise";

    return merged;
  }

  getTerminal(id: string): TerminalInfo | undefined {
    return this.terminals.get(id);
  }

  getAllTerminals(): TerminalInfo[] {
    return Array.from(this.terminals.values());
  }

  getProcess(terminalId: string): ElectronTerminalProcess | undefined {
    return this.processes.get(terminalId);
  }

  terminateProcess(terminalId: string): void {
    const process = this.processes.get(terminalId);
    if (process) {
      process.terminate();
      this.processes.delete(terminalId);

      const terminalInfo = this.terminals.get(terminalId);
      if (terminalInfo) {
        terminalInfo.busy = false;
      }
    }
  }

  disposeTerminal(id: string): void {
    const terminalInfo = this.terminals.get(id);
    if (terminalInfo) {
      // Terminate any running process
      this.terminateProcess(id);

      // Dispose terminal
      terminalInfo.terminal.dispose();

      // Remove from registry
      this.terminals.delete(id);

      console.log(`[ElectronTerminalManager] Disposed terminal ${id}`);
    }
  }

  disposeAll(): void {
    console.log("[ElectronTerminalManager] Disposing all terminals");

    for (const id of this.terminals.keys()) {
      this.disposeTerminal(id);
    }
  }

  getTerminalOutputLineLimit(): number {
    return this.terminalOutputLineLimit;
  }

  setTerminalOutputLineLimit(limit: number): void {
    this.terminalOutputLineLimit = limit;
  }
}
