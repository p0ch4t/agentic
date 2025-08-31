export type ClineAsk =
  | "followup"
  | "command"
  | "completion_result"
  | "tool"
  | "api_req_failed"
  | "resume_task"
  | "resume_completed_task"
  | "mistake";

export type ClineSay =
  | "task"
  | "error"
  | "api_req_started"
  | "api_req_finished"
  | "text"
  | "completion_result"
  | "user_feedback"
  | "user_feedback_diff"
  | "api_req_retried"
  | "command_output"
  | "tool";

export interface ClineMessage {
  ts: number;
  type: "ask" | "say";
  ask?: ClineAsk;
  say?: ClineSay;
  text?: string;
  images?: string[];
  partial?: boolean;
}
