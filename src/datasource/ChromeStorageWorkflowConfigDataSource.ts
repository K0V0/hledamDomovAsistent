import type { WorkflowStep } from '../domain/WorkflowStep';
import type { WorkflowConfigDataSource } from './WorkflowConfigDataSource';

export class ChromeStorageWorkflowConfigDataSource implements WorkflowConfigDataSource {
  private static readonly KEY = 'hda_workflow_steps';

  constructor(private readonly area: chrome.storage.StorageArea) {}

  getUserSteps(): Promise<WorkflowStep[]> {
    const k = ChromeStorageWorkflowConfigDataSource.KEY;
    return new Promise(resolve =>
      this.area.get(k, r => resolve((r[k] as WorkflowStep[]) ?? []))
    );
  }

  saveUserSteps(steps: WorkflowStep[]): Promise<void> {
    return new Promise(resolve =>
      this.area.set({ [ChromeStorageWorkflowConfigDataSource.KEY]: steps }, resolve)
    );
  }
}