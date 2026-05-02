import { workflowConfigDataSource } from '../config/workflowDatasource';
import { buildFullWorkflow, START_STEP, END_STEP, type WorkflowStep } from '../domain/WorkflowStep';

let userSteps: WorkflowStep[] = [];

async function init(): Promise<void> {
  userSteps = await workflowConfigDataSource.getUserSteps();
  render();
}

function render(): void {
  renderPreview();
  renderStepsList();
}

function renderPreview(): void {
  const container = document.getElementById('workflow-preview')!;
  container.innerHTML = '';

  const allSteps = buildFullWorkflow(userSteps);

  allSteps.forEach((step, i) => {
    const box = document.createElement('span');
    box.className = 'workflow-train__step';
    if (step.id === 'start' || step.id === 'end') {
      box.classList.add('workflow-train__step--builtin');
    }
    box.textContent = step.label;
    container.appendChild(box);

    if (i < allSteps.length - 1) {
      const arrow = document.createElement('span');
      arrow.className = 'workflow-train__arrow';
      arrow.textContent = '›';
      container.appendChild(arrow);
    }
  });
}

function renderStepsList(): void {
  const list = document.getElementById('steps-list')!;
  list.innerHTML = '';

  list.appendChild(buildBuiltInItem(START_STEP.label));

  if (userSteps.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty-steps';
    li.textContent = 'Zatím žádné vlastní kroky. Přidejte je níže.';
    list.appendChild(li);
  } else {
    userSteps.forEach((step, i) => list.appendChild(buildUserStepItem(step, i)));
  }

  list.appendChild(buildBuiltInItem(END_STEP.label));
}

function buildBuiltInItem(label: string): HTMLLIElement {
  const li = document.createElement('li');
  li.className = 'step-item step-item--builtin';

  const name = document.createElement('span');
  name.className = 'step-item__name';
  name.textContent = label;

  const badge = document.createElement('span');
  badge.className = 'step-item__badge';
  badge.textContent = 'zabudovaný';

  li.append(name, badge);
  return li;
}

function buildUserStepItem(step: WorkflowStep, index: number): HTMLLIElement {
  const li = document.createElement('li');
  li.className = 'step-item';

  const name = document.createElement('span');
  name.className = 'step-item__name';
  name.textContent = step.label;

  const removeBtn = document.createElement('button');
  removeBtn.className = 'step-item__remove';
  removeBtn.textContent = 'Odebrat';
  removeBtn.addEventListener('click', async () => {
    userSteps.splice(index, 1);
    await workflowConfigDataSource.saveUserSteps(userSteps);
    render();
  });

  li.append(name, removeBtn);
  return li;
}

async function addStep(): Promise<void> {
  const input = document.getElementById('new-step-label') as HTMLInputElement;
  const label = input.value.trim();
  if (!label) return;

  const newStep: WorkflowStep = {
    id: `step_${Date.now()}`,
    label,
  };

  userSteps.push(newStep);
  await workflowConfigDataSource.saveUserSteps(userSteps);
  input.value = '';
  render();
}

document.getElementById('add-step-btn')?.addEventListener('click', () => {
  addStep().catch(console.error);
});

document.getElementById('new-step-label')?.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Enter') addStep().catch(console.error);
});

init().catch(console.error);