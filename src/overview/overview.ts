import { noteDataSource } from '../config/datasource';
import type { Note, NoteItem } from '../domain/Note';
import { DEFAULT_COLOR, NOTE_COLOR_DEFS, NOTE_COLORS } from '../ui/noteColors';

type SortKey = 'color' | 'propertyId' | 'platform' | 'createdAt';

let notes: Note[] = [];
let sortKey: SortKey = 'createdAt';
let sortDir: 'asc' | 'desc' = 'desc';

async function init(): Promise<void> {
  notes = await noteDataSource.getAll();
  render();
}

function render(): void {
  const tbody = document.getElementById('notes-body') as HTMLTableSectionElement;
  const sorted = [...notes].sort(comparator());

  tbody.innerHTML = '';

  if (sorted.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 5;
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

  const tdLink = document.createElement('td');
  const a = document.createElement('a');
  a.href = `https://${note.propertyId}`;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.className = 'property-link';
  a.textContent = note.propertyId;
  tdLink.appendChild(a);

  const tdPlatform = document.createElement('td');
  tdPlatform.textContent = note.platform;

  const tdItems = document.createElement('td');
  tdItems.className = 'note-items';
  buildItemsCell(tdItems, note.items ?? []);

  const tdDate = document.createElement('td');
  tdDate.className = 'date';
  tdDate.textContent = formatDate(note.createdAt);

  tr.append(tdColor, tdLink, tdPlatform, tdItems, tdDate);
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

function comparator(): (a: Note, b: Note) => number {
  return (a, b) => {
    let cmp: number;
    if (sortKey === 'color') {
      const ai = NOTE_COLORS.indexOf(a.color ?? DEFAULT_COLOR);
      const bi = NOTE_COLORS.indexOf(b.color ?? DEFAULT_COLOR);
      cmp = ai - bi;
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
    render();
  });
});

init().catch(console.error);