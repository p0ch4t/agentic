// Simplified ExtensionMessage for Electron application

import { ApiConfiguration } from "./api";
import { HistoryItem } from "./HistoryItem";
import { Mode } from "./storage/types";
import { ClineMessage } from "./ClineMessage";

// Basic message interface for Electron app
export interface ExtensionMessage {
  type: "ai_response" | "task_update" | "error";
  data?: any;
}

export type Platform =
  | "aix"
  | "darwin"
  | "freebsd"
  | "linux"
  | "openbsd"
  | "sunos"
  | "win32"
  | "unknown";

export const DEFAULT_PLATFORM = "unknown";

// Simplified ExtensionState for Electron application
export interface ExtensionState {
  isNewUser: boolean;
  apiConfiguration?: ApiConfiguration;
  mode: Mode;
  clineMessages: ClineMessage[];
  platform: Platform;
  taskHistory: HistoryItem[];
  version: string;
}
