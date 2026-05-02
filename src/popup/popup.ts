import { noteDataSource } from '../config/datasource';
import { workflowConfigDataSource } from '../config/workflowDatasource';
import type { Note } from '../domain/Note';
import type { WorkflowStep } from '../domain/WorkflowStep';

// ── Navigation ────────────────────────────────────────────────────────────────

document.getElementById('menu-overview')?.addEventListener('click', e => {
  e.preventDefault();
  chrome.tabs.create({ url: chrome.runtime.getURL('overview.html') });
  window.close();
});

document.getElementById('menu-workflow')?.addEventListener('click', e => {
  e.preventDefault();
  chrome.tabs.create({ url: chrome.runtime.getURL('workflow.html') });
  window.close();
});

// ── Export ────────────────────────────────────────────────────────────────────

document.getElementById('menu-export')?.addEventListener('click', e => {
  e.preventDefault();
  runExport().catch(() => showStatus('Export selhal.', 'error'));
});

async function runExport(): Promise<void> {
  const [notes, userSteps] = await Promise.all([
    noteDataSource.getAll(),
    workflowConfigDataSource.getUserSteps(),
  ]);

  const payload = {
    version: 1,
    exportedAt: Date.now(),
    workflowSteps: userSteps,
    notes,
  };

  const json = JSON.stringify(payload, null, 2);
  const date = new Date().toISOString().slice(0, 10);
  const dataUrl = `data:application/json;charset=utf-8,${encodeURIComponent(json)}`;

  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `hda-backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  showStatus(`Exportováno ${notes.length} nemovitostí.`, 'success');
}

// ── Import ────────────────────────────────────────────────────────────────────

document.getElementById('menu-import')?.addEventListener('click', e => {
  e.preventDefault();
  (document.getElementById('import-file') as HTMLInputElement).click();
});

document.getElementById('import-file')?.addEventListener('change', e => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  runImport(file).catch(() => showStatus('Import selhal.', 'error'));
});

async function runImport(file: File): Promise<void> {
  const text = await file.text();

  let data: { version?: number; workflowSteps?: unknown; notes?: unknown };
  try {
    data = JSON.parse(text) as typeof data;
  } catch {
    showStatus('Neplatný soubor (není JSON).', 'error');
    return;
  }

  if (!Array.isArray(data.notes)) {
    showStatus('Neplatný formát – chybí pole notes.', 'error');
    return;
  }

  // Merge notes: imported wins when updatedAt is newer
  const existing = await noteDataSource.getAll();
  const localMap = new Map(existing.map(n => [n.propertyId, n]));

  let imported = 0;
  let skipped = 0;

  for (const raw of data.notes) {
    if (!isValidNote(raw)) { skipped++; continue; }
    const local = localMap.get(raw.propertyId);
    if (!local || raw.updatedAt > local.updatedAt) {
      await noteDataSource.save(raw);
      imported++;
    } else {
      skipped++;
    }
  }

  // Merge workflow steps: add any steps whose id is not already present locally
  if (Array.isArray(data.workflowSteps) && data.workflowSteps.length > 0) {
    const localSteps = await workflowConfigDataSource.getUserSteps();
    const localIds = new Set(localSteps.map(s => s.id));
    const newSteps = (data.workflowSteps as WorkflowStep[]).filter(
      s => typeof s.id === 'string' && typeof s.label === 'string' && !localIds.has(s.id),
    );
    if (newSteps.length > 0) {
      await workflowConfigDataSource.saveUserSteps([...localSteps, ...newSteps]);
    }
  }

  showStatus(`Importováno: ${imported}, přeskočeno: ${skipped}.`, 'success');
}

function isValidNote(obj: unknown): obj is Note {
  if (typeof obj !== 'object' || obj === null) return false;
  const n = obj as Record<string, unknown>;
  return (
    typeof n['propertyId'] === 'string' &&
    typeof n['platform'] === 'string' &&
    typeof n['createdAt'] === 'number' &&
    typeof n['updatedAt'] === 'number' &&
    Array.isArray(n['items'])
  );
}

// ── Status display ────────────────────────────────────────────────────────────

function showStatus(text: string, type: 'success' | 'error'): void {
  const el = document.getElementById('popup-status');
  if (!el) return;
  el.textContent = text;
  el.className = `popup-status--${type}`;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}