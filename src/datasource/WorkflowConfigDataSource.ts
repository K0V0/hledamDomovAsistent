import type { WorkflowStep } from '../domain/WorkflowStep';

export interface WorkflowConfigDataSource {
  getUserSteps(): Promise<WorkflowStep[]>;
  saveUserSteps(steps: WorkflowStep[]): Promise<void>;
}