export type Decision = "allow" | "ask" | "deny";
export type Status = "healthy" | "watching" | "drifting" | "paused";
export interface Objective {
  operation: string;
  resource: string;
  description: string;
}
export interface BlockedObjective extends Objective {
  at: number;
  tool: string;
  reason: string;
  intent: string;
}
export interface TrajectoryEvent {
  timestamp: number;
  type:
    | "user_prompt"
    | "tool_call"
    | "tool_result"
    | "untrusted_content"
    | "decision";
  actionId?: string;
  tool?: string;
  args?: string;
  objective?: string;
  resultSummary?: string;
  decision?: Decision;
  source?: string;
}
export interface Signals {
  trajectory_drift: number;
  capability_escalation: number;
  untrusted_influence: number;
  circumvention: number;
  sensitive_resource: number;
}
export interface DriftPoint {
  actionId?: string;
  timestamp: number;
  score: number;
  modelScore: number;
  tool: string;
  decision: Decision;
}
export interface Trajectory {
  sessionId: string;
  activeUserIntent: string;
  events: TrajectoryEvent[];
  capabilitiesUsed: string[];
  resourcesAccessed: string[];
  domainsAccessed: string[];
  untrustedSources: string[];
  blockedObjectives: BlockedObjective[];
  currentDriftScore: number | null;
  driftHistory: DriftPoint[];
  status: Status;
  signals?: Signals;
  reasons?: string[];
  lastObjective?: string;
  evidence?: string;
}
export interface Action {
  tool?: string;
  input?: any;
  cwd?: string;
  agent?: string;
  sessionId?: string;
  context?: any;
}
export interface Answer {
  p?: number;
  score?: number;
  choice?: string;
  confidence?: number;
}
export interface Policy {
  watch: number;
  ask: number;
  deny: number;
  circumvention: number;
  influence: number;
}
