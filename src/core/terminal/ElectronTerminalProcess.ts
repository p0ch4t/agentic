import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";
import * as os from "os";

export interface TerminalInfo {
  id: string;
  terminal: ElectronTerminal;
  busy: boolean;
  lastCommand?: string;
}

export class ElectronTerminalProcess extends EventEmitter {
  private childProcess: ChildProcess | null = null;
  private exitCode: number | null = null;
  private isCompleted = false;
  private buffer = "";
  private fullOutput = "";
  private isHot = false;
  private hotTimer?: NodeJS.Timeout;

  constructor() {
    super();
  }

  async run(terminal: ElectronTerminal, command: string): Promise<void> {
    console.log(`[ElectronTerminal] Running command: ${command}`);

    // Get shell and working directory from terminal
    const shell = this.getDefaultShell();
    const cwd = terminal.getCwd();

    // Prepare command for execution
    const shellArgs = this.getShellArgs(shell, command);

    try {
      // Spawn the process
      this.childProcess = spawn(shell, shellArgs, {
        cwd: cwd,
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, TERM: "xterm-256color" },
      });

      // Track process state
      let didEmitEmptyLine = false;

      // Handle stdout
      this.childProcess.stdout?.on("data", (data) => {
        const output = data.toString();
        this.handleOutput(output, didEmitEmptyLine);
        if (!didEmitEmptyLine && output) {
          this.emit("line", ""); // Signal start of output
          didEmitEmptyLine = true;
        }
      });

      // Handle stderr
      this.childProcess.stderr?.on("data", (data) => {
        const output = data.toString();
        this.handleOutput(output, didEmitEmptyLine);
        if (!didEmitEmptyLine && output) {
          this.emit("line", "");
          didEmitEmptyLine = true;
        }
      });

      // Handle process completion
      this.childProcess.on("close", (code, signal) => {
        console.log(
          `[ElectronTerminal] Process closed with code ${code}, signal ${signal}`,
        );
        this.exitCode = code;
        this.isCompleted = true;
        this.emitRemainingBuffer();

        // Clear hot timer
        if (this.hotTimer) {
          clearTimeout(this.hotTimer);
          this.isHot = false;
        }

        this.emit("completed");
        this.emit("continue");
      });

      // Handle process errors
      this.childProcess.on("error", (error) => {
        console.error(`[ElectronTerminal] Process error:`, error);
        this.emit("error", error);
      });
    } catch (error) {
      console.error(`[ElectronTerminal] Failed to spawn process:`, error);
      this.emit("error", error);
    }
  }

  private handleOutput(output: string, didEmitEmptyLine: boolean): void {
    this.fullOutput += output;
    this.buffer += output;

    // Set hot state for rapid output
    if (!this.isHot) {
      this.isHot = true;
      this.hotTimer = setTimeout(() => {
        this.isHot = false;
        this.emitBufferedLines();
      }, 100);
    }

    // If we're not hot, emit lines immediately
    if (!this.isHot) {
      this.emitBufferedLines();
    }
  }

  private emitBufferedLines(): void {
    const lines = this.buffer.split("\n");

    // Keep the last incomplete line in buffer
    this.buffer = lines.pop() || "";

    // Emit complete lines
    for (const line of lines) {
      this.emit("line", line);
    }
  }

  private emitRemainingBuffer(): void {
    if (this.buffer) {
      this.emit("line", this.buffer);
      this.buffer = "";
    }
  }

  private getDefaultShell(): string {
    const platform = os.platform();

    if (platform === "win32") {
      return process.env.COMSPEC || "cmd.exe";
    } else {
      return process.env.SHELL || "/bin/bash";
    }
  }

  private getShellArgs(shell: string, command: string): string[] {
    const platform = os.platform();

    if (platform === "win32") {
      return ["/c", command];
    } else {
      return ["-c", command];
    }
  }

  terminate(): void {
    if (this.childProcess && !this.childProcess.killed) {
      console.log(`[ElectronTerminal] Terminating process`);

      // Try graceful termination first
      this.childProcess.kill("SIGTERM");

      // Force kill after 5 seconds
      setTimeout(() => {
        if (this.childProcess && !this.childProcess.killed) {
          console.log(`[ElectronTerminal] Force killing process`);
          this.childProcess.kill("SIGKILL");
        }
      }, 5000);
    }
  }

  getFullOutput(): string {
    return this.fullOutput;
  }

  getExitCode(): number | null {
    return this.exitCode;
  }

  isProcessCompleted(): boolean {
    return this.isCompleted;
  }
}

export class ElectronTerminal {
  private name: string;
  private cwd: string;
  private shellPath?: string;
  private process: ChildProcess | null = null;
  private processId: number | null = null;

  constructor(
    options: { name?: string; cwd?: string; shellPath?: string } = {},
  ) {
    this.name = options.name || `Terminal ${Math.floor(Math.random() * 10000)}`;
    this.cwd = options.cwd || process.cwd();
    this.shellPath = options.shellPath;

    console.log(
      `[ElectronTerminal] Created terminal: ${this.name} in ${this.cwd}`,
    );
  }

  getName(): string {
    return this.name;
  }

  getCwd(): string {
    return this.cwd;
  }

  setCwd(newCwd: string): void {
    this.cwd = newCwd;
  }

  getShellPath(): string | undefined {
    return this.shellPath;
  }

  sendText(text: string, addNewLine = true): void {
    console.log(`[ElectronTerminal] sendText: ${text}`);

    // If we have an active process, send input to it
    if (this.process && !this.process.killed) {
      try {
        this.process.stdin?.write(text + (addNewLine ? "\n" : ""));
      } catch (error) {
        console.error(
          `[ElectronTerminal] Error sending text to process:`,
          error,
        );
      }
    } else {
      console.log(`[ElectronTerminal] No active process to send text to`);
    }
  }

  show(): void {
    console.log(`[ElectronTerminal] show: ${this.name}`);
  }

  hide(): void {
    console.log(`[ElectronTerminal] hide: ${this.name}`);
  }

  dispose(): void {
    console.log(`[ElectronTerminal] dispose: ${this.name}`);
    if (this.process && !this.process.killed) {
      this.process.kill("SIGTERM");
    }
  }

  setProcess(process: ChildProcess): void {
    this.process = process;
    this.processId = process.pid || null;
  }

  getProcess(): ChildProcess | null {
    return this.process;
  }

  getProcessId(): number | null {
    return this.processId;
  }
}
