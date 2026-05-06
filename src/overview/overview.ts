import { noteDataSource } from '../config/datasource';
import { workflowConfigDataSource } from '../config/workflowDatasource';
import type { Note, NoteItem } from '../domain/Note';
import { buildFullWorkflow, type WorkflowStep } from '../domain/WorkflowStep';
import { DEFAULT_COLOR, NOTE_COLOR_DEFS } from '../ui/noteColors';
import type { NoteColor } from '../domain/Note';

const COLOR_SORT_ORDER: NoteColor[] = ['green', 'blue', 'orange', 'red', 'gray', 'black'];

type SortKey = 'color' | 'title' | 'price' | 'platform' | 'workflowStep' | 'createdAt';

const SORT_KEY_STORAGE = 'hda-overview-sort-key';
const SORT_DIR_STORAGE = 'hda-overview-sort-dir';

let notes: Note[] = [];
let allWorkflowSteps: WorkflowStep[] = [];
let sortKey: SortKey = (localStorage.getItem(SORT_KEY_STORAGE) as SortKey | null) ?? 'createdAt';
let sortDir: 'asc' | 'desc' = (localStorage.getItem(SORT_DIR_STORAGE) as 'asc' | 'desc' | null) ?? 'desc';

async function init(): Promise<void> {
  const [loadedNotes, userSteps] = await Promise.all([
    noteDataSource.getAll(),
    workflowConfigDataSource.getUserSteps(),
  ]);
  notes = loadedNotes;
  allWorkflowSteps = buildFullWorkflow(userSteps);
  render();
}

function render(): void {
  const tbody = document.getElementById('notes-body') as HTMLTableSectionElement;
  const sorted = [...notes].sort(comparator());

  tbody.innerHTML = '';

  if (sorted.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 11;
    td.className = 'empty';
    td.textContent = 'Zatím žádné poznámky nebyly přidány.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    updateSortIndicators();
    return;
  }

  for (const note of sorted) {
    tbody.appendChild(buildRow(note));
  }

  updateSortIndicators();
}

function buildRow(note: Note): HTMLTableRowElement {
  const tr = document.createElement('tr');

  const color = note.color ?? DEFAULT_COLOR;
  const { swatch } = NOTE_COLOR_DEFS[color];

  const tdColor = document.createElement('td');
  tdColor.className = 'col-color-cell';
  const dot = document.createElement('span');
  dot.className = 'color-dot';
  dot.style.background = swatch;
  dot.title = color;
  tdColor.appendChild(dot);

  const tdTitle = document.createElement('td');
  const a = document.createElement('a');
  a.href = `https://${note.propertyId}`;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.className = 'property-link';
  a.textContent = note.title ?? note.propertyId;
  if (!note.title) a.classList.add('property-link--url');
  tdTitle.appendChild(a);

  const tdPrice = document.createElement('td');
  tdPrice.className = 'price';
  tdPrice.textContent = note.price != null
    ? note.price.toLocaleString('cs-CZ') + ' Kč'
    : '';

  const tdPlatform = document.createElement('td');
  tdPlatform.textContent = note.platform;

  const tdWorkflow = document.createElement('td');
  const lastStep = lastCheckedStep(note.workflowStepIds ?? [], allWorkflowSteps);
  if (lastStep) {
    const badge = document.createElement('span');
    badge.className = 'workflow-badge';
    if (lastStep.id === 'end') badge.classList.add('workflow-badge--end');
    badge.textContent = lastStep.label;
    tdWorkflow.appendChild(badge);
  } else {
    tdWorkflow.className = 'workflow-badge--none';
    tdWorkflow.textContent = '—';
  }

  const tdItems = document.createElement('td');
  tdItems.className = 'note-items';
  buildItemsCell(tdItems, note.items ?? []);

  const tdDate = document.createElement('td');
  tdDate.className = 'date';
  tdDate.textContent = formatDate(note.createdAt);

  const tdAir = document.createElement('td');
  tdAir.className = 'col-dist';
  tdAir.appendChild(distCell(
    note.distanceAirKm != null ? `${note.distanceAirKm.toLocaleString('cs-CZ', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km` : null
  ));

  const tdRoad = document.createElement('td');
  tdRoad.className = 'col-dist';
  tdRoad.appendChild(distCell(
    note.distanceRoadM != null ? `${(note.distanceRoadM / 1000).toLocaleString('cs-CZ', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km` : null
  ));

  const tdDuration = document.createElement('td');
  tdDuration.className = 'col-dist';
  tdDuration.appendChild(distCell(
    note.durationRoadS != null ? formatDuration(note.durationRoadS) : null
  ));

  const tdDelete = document.createElement('td');
  tdDelete.className = 'col-delete';
  const btnDelete = document.createElement('button');
  btnDelete.className = 'btn-delete';
  btnDelete.title = 'Smazat';
  btnDelete.textContent = '×';
  btnDelete.addEventListener('click', () => deleteNote(note.propertyId));
  tdDelete.appendChild(btnDelete);

  tr.append(tdColor, tdTitle, tdPrice, tdPlatform, tdWorkflow, tdItems, tdAir, tdRoad, tdDuration, tdDate, tdDelete);
  return tr;
}

function buildItemsCell(td: HTMLElement, items: NoteItem[]): void {
  const positives = items.filter(i => i.type === 'positive');
  const negatives = items.filter(i => i.type === 'negative');

  for (const item of positives) td.appendChild(buildNoteItemEl(item));

  if (positives.length && negatives.length) {
    const sep = document.createElement('div');
    sep.className = 'note-item-sep';
    td.appendChild(sep);
  }

  for (const item of negatives) td.appendChild(buildNoteItemEl(item));
}

function buildNoteItemEl(item: NoteItem): HTMLElement {
  const row = document.createElement('div');
  row.className = `note-item note-item--${item.type}`;

  const icon = document.createElement('span');
  icon.className = 'note-item__icon';
  icon.textContent = item.type === 'positive' ? '+' : '−';

  const text = document.createElement('span');
  text.textContent = item.text;

  row.append(icon, text);
  return row;
}

async function deleteNote(propertyId: string): Promise<void> {
  if (!confirm('Opravdu chcete tuto nemovitost smazat?')) return;
  await noteDataSource.delete(propertyId);
  notes = notes.filter(n => n.propertyId !== propertyId);
  render();
}

function comparator(): (a: Note, b: Note) => number {
  return (a, b) => {
    let cmp: number;
    if (sortKey === 'color') {
      const ai = COLOR_SORT_ORDER.indexOf(a.color ?? DEFAULT_COLOR);
      const bi = COLOR_SORT_ORDER.indexOf(b.color ?? DEFAULT_COLOR);
      cmp = ai - bi;
    } else if (sortKey === 'price') {
      const ap = a.price;
      const bp = b.price;
      if (ap == null && bp == null) cmp = 0;
      else if (ap == null) cmp = 1;
      else if (bp == null) cmp = -1;
      else cmp = ap - bp;
    } else if (sortKey === 'workflowStep') {
      cmp = lastCheckedIndex(a.workflowStepIds ?? [], allWorkflowSteps)
          - lastCheckedIndex(b.workflowStepIds ?? [], allWorkflowSteps);
    } else {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') {
        cmp = av - bv;
      } else {
        cmp = String(av ?? '').localeCompare(String(bv ?? ''), 'cs');
      }
    }
    return sortDir === 'asc' ? cmp : -cmp;
  };
}

function updateSortIndicators(): void {
  document.querySelectorAll<HTMLElement>('[data-sort]').forEach(th => {
    th.removeAttribute('aria-sort');
    const existing = th.querySelector('.sort-indicator');
    if (existing) existing.remove();
  });

  const active = document.querySelector<HTMLElement>(`[data-sort="${sortKey}"]`);
  if (!active) return;

  active.setAttribute('aria-sort', sortDir === 'asc' ? 'ascending' : 'descending');
  const indicator = document.createElement('span');
  indicator.className = 'sort-indicator';
  indicator.textContent = sortDir === 'asc' ? '▲' : '▼';
  active.appendChild(indicator);
}

function lastCheckedStep(checkedIds: string[], allSteps: WorkflowStep[]): WorkflowStep | null {
  let last: WorkflowStep | null = null;
  for (const step of allSteps) {
    if (checkedIds.includes(step.id)) last = step;
  }
  return last;
}

function lastCheckedIndex(checkedIds: string[], allSteps: WorkflowStep[]): number {
  let idx = -1;
  allSteps.forEach((step, i) => {
    if (checkedIds.includes(step.id)) idx = i;
  });
  return idx;
}

function distCell(text: string | null): HTMLElement {
  const span = document.createElement('span');
  if (text) {
    span.className = 'dist-value';
    span.textContent = text;
  } else {
    span.className = 'dist-none';
    span.textContent = '—';
  }
  return span;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('cs-CZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

document.querySelectorAll<HTMLElement>('[data-sort]').forEach(th => {
  th.addEventListener('click', () => {
    const key = th.dataset['sort'] as SortKey;
    if (sortKey === key) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortKey = key;
      sortDir = 'asc';
    }
    localStorage.setItem(SORT_KEY_STORAGE, sortKey);
    localStorage.setItem(SORT_DIR_STORAGE, sortDir);
    render();
  });
});

init().catch(console.error);