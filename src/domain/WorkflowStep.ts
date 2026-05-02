export interface WorkflowStep {
  id: string;
  label: string;
}

export const START_STEP: WorkflowStep = { id: 'start', label: 'Mám zájem' };
export const END_STEP:   WorkflowStep = { id: 'end',   label: 'Ukončeno'  };

export function buildFullWorkflow(userSteps: WorkflowStep[]): WorkflowStep[] {
  return [START_STEP, ...userSteps, END_STEP];
}