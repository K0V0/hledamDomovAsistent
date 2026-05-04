import type { GpsCoordinates } from '../domain/GpsCoordinates';
import type { Note, NoteColor, NoteItem, NoteItemType } from '../domain/Note';
import type { PlatformId } from '../domain/Platform';
import type { NoteRepository } from '../repository/NoteRepository';
import type { WorkflowConfigDataSource } from '../datasource/WorkflowConfigDataSource';
import { buildFullWorkflow, type WorkflowStep } from '../domain/WorkflowStep';
import { getHomeLocation } from '../config/homeLocation';
import { haversineKm, fetchRoadRoute } from '../utils/distanceService';
import { DEFAULT_COLOR, NOTE_COLOR_DEFS, NOTE_COLORS } from './noteColors';
import { injectStyles } from './styles';

export type WidgetMode = 'list' | 'detail';

export class NoteWidget {
  constructor(
    private readonly propertyId: string,
    private readonly platform: PlatformId,
    private readonly repository: NoteRepository,
    private readonly mode: WidgetMode = 'detail',
    private readonly scrapedTitle: string | null = null,
    private readonly scrapedPrice: number | null = null,
    private readonly workflowConfig: WorkflowConfigDataSource | null = null,
    private readonly scrapedGps: GpsCoordinates | null = null,
  ) {}

  /**
   * Returns the widget element, or null when mode is 'list' and no note exists.
   * Callers must handle null — it means "render nothing for this item".
   */
  async createElement(): Promise<HTMLElement | null> {
    injectStyles();
    const [existing, userSteps] = await Promise.all([
      this.repository.get(this.propertyId),
      this.workflowConfig ? this.workflowConfig.getUserSteps() : Promise.resolve([]),
    ]);

    if (this.mode === 'list') {
      const hasItems = (existing?.items?.length ?? 0) > 0;
      const hasSteps = (existing?.workflowStepIds?.length ?? 0) > 0;
      if (!hasItems && !hasSteps) return null;

      return this.createListElement(
        existing?.items ?? [],
        existing?.color ?? DEFAULT_COLOR,
        existing?.workflowStepIds ?? [],
        buildFullWorkflow(userSteps),
      );
    }

    return this.createDetailElement(existing, userSteps);
  }

  // ── List view — read-only ─────────────────────────────────────────────────

  private createListElement(
    items: NoteItem[],
    color: NoteColor,
    checkedStepIds: string[],
    allSteps: WorkflowStep[],
  ): HTMLElement {
    const root = document.createElement('div');
    root.className = 'hda-widget hda-widget--list';
    root.dataset['propertyId'] = this.propertyId;

    const checkedSteps = allSteps.filter(s => checkedStepIds.includes(s.id));
    if (checkedSteps.length > 0) {
      root.appendChild(buildListWorkflowTrain(checkedSteps));
    }

    if (items.length > 0) {
      const { bg, border } = NOTE_COLOR_DEFS[color];
      const preview = document.createElement('div');
      preview.className = 'hda-widget__preview';
      preview.style.background = bg;
      preview.style.borderLeftColor = border;

      const positives = items.filter(i => i.type === 'positive');
      const negatives = items.filter(i => i.type === 'negative');

      for (const item of positives) preview.appendChild(buildNoteItemEl(item));

      if (positives.length && negatives.length) {
        const sep = document.createElement('div');
        sep.className = 'hda-note-item-sep';
        preview.appendChild(sep);
      }

      for (const item of negatives) preview.appendChild(buildNoteItemEl(item));

      root.appendChild(preview);
    }

    return root;
  }

  // ── Detail view — editable ────────────────────────────────────────────────

  private createDetailElement(existing: Note | null, userSteps: WorkflowStep[]): HTMLElement {
    const allSteps = buildFullWorkflow(userSteps);
    let activeColor: NoteColor = existing?.color ?? DEFAULT_COLOR;
    let activeWorkflowStepIds: string[] = existing?.workflowStepIds ?? [];

    const root = document.createElement('div');
    root.className = 'hda-widget';
    root.dataset['propertyId'] = this.propertyId;

    const panel = document.createElement('div');
    panel.className = 'hda-widget__panel';

    const positiveGroup = document.createElement('div');
    positiveGroup.className = 'hda-widget__item-group';
    positiveGroup.dataset['type'] = 'positive';

    const negativeGroup = document.createElement('div');
    negativeGroup.className = 'hda-widget__item-group';
    negativeGroup.dataset['type'] = 'negative';

    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'hda-widget__items';
    itemsContainer.append(positiveGroup, negativeGroup);

    const status = document.createElement('span');
    status.className = 'hda-widget__status';

    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleSave = () => {
      status.textContent = 'Saving...';
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(
        () => this.persistNote(itemsContainer, status, existing, activeColor, activeWorkflowStepIds).catch(() => undefined),
        800,
      );
    };

    const addRow = (group: HTMLElement, type: NoteItemType, text: string, focus = false) => {
      const row = document.createElement('div');
      row.className = 'hda-widget__item';

      const icon = document.createElement('span');
      icon.className = `hda-widget__item-icon hda-widget__item-icon--${type}`;
      icon.textContent = type === 'positive' ? '+' : '−';

      const ta = document.createElement('textarea');
      ta.className = 'hda-widget__item-textarea';
      ta.value = text;
      ta.rows = 2;
      ta.placeholder = type === 'positive' ? 'Co se mi líbí...' : 'Co mi vadí...';
      ta.addEventListener('input', scheduleSave);

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'hda-widget__item-remove';
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', () => {
        row.remove();
        this.persistNote(itemsContainer, status, existing, activeColor, activeWorkflowStepIds).catch(() => undefined);
      });

      row.append(icon, ta, removeBtn);
      group.appendChild(row);
      if (focus) ta.focus();
    };

    for (const item of existing?.items ?? []) {
      const group = item.type === 'positive' ? positiveGroup : negativeGroup;
      addRow(group, item.type, item.text);
    }

    const workflowSection = this.createWorkflowSection(allSteps, activeWorkflowStepIds, stepIds => {
      activeWorkflowStepIds = stepIds;
      this.persistNote(itemsContainer, status, existing, activeColor, activeWorkflowStepIds).catch(() => undefined);
    });

    const colorRow = this.createColorRow(activeColor, color => {
      activeColor = color;
      this.persistNote(itemsContainer, status, existing, activeColor, activeWorkflowStepIds).catch(() => undefined);
    });

    const actions = document.createElement('div');
    actions.className = 'hda-widget__actions';

    const addPositiveBtn = document.createElement('button');
    addPositiveBtn.type = 'button';
    addPositiveBtn.className = 'hda-widget__add-btn hda-widget__add-btn--positive';
    addPositiveBtn.textContent = '+ Přidat pozitivní hodnocení';
    addPositiveBtn.addEventListener('click', () => addRow(positiveGroup, 'positive', '', true));

    const addNegativeBtn = document.createElement('button');
    addNegativeBtn.type = 'button';
    addNegativeBtn.className = 'hda-widget__add-btn hda-widget__add-btn--negative';
    addNegativeBtn.textContent = '− Přidat negativní hodnocení';
    addNegativeBtn.addEventListener('click', () => addRow(negativeGroup, 'negative', '', true));

    actions.append(addPositiveBtn, addNegativeBtn);
    panel.append(workflowSection, colorRow, itemsContainer, actions, status);
    root.append(panel);

    return root;
  }

  private createWorkflowSection(
    allSteps: WorkflowStep[],
    initialStepIds: string[],
    onStepsChange: (stepIds: string[]) => void,
  ): HTMLElement {
    const section = document.createElement('div');
    section.className = 'hda-workflow';

    const train = document.createElement('div');
    train.className = 'hda-workflow__train';

    const checked = new Set<string>(initialStepIds);
    const stepBtns = new Map<string, HTMLButtonElement>();

    const syncVisuals = () => {
      stepBtns.forEach((btn, id) => {
        btn.classList.toggle('hda-workflow__step--checked', checked.has(id));
      });
    };

    allSteps.forEach((step, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hda-workflow__step';
      btn.textContent = step.label;
      stepBtns.set(step.id, btn);

      btn.addEventListener('click', () => {
        if (step.id === 'start') {
          if (checked.has('start')) {
            checked.clear();
          } else {
            checked.add('start');
          }
        } else {
          if (checked.has(step.id)) {
            checked.delete(step.id);
          } else {
            checked.add(step.id);
            checked.add('start');
          }
        }
        syncVisuals();
        onStepsChange(Array.from(checked));
      });

      train.appendChild(btn);

      if (i < allSteps.length - 1) {
        const arrow = document.createElement('span');
        arrow.className = 'hda-workflow__arrow';
        arrow.textContent = '›';
        train.appendChild(arrow);
      }
    });

    syncVisuals();
    section.appendChild(train);
    return section;
  }

  private createColorRow(
    initial: NoteColor,
    onChange: (color: NoteColor) => void,
  ): HTMLElement {
    const row = document.createElement('div');
    row.className = 'hda-widget__colors';

    const buttons = new Map<NoteColor, HTMLButtonElement>();

    for (const color of NOTE_COLORS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hda-widget__color-btn';
      btn.dataset['color'] = color;
      btn.title = color;
      btn.style.background = NOTE_COLOR_DEFS[color].swatch;
      if (color === initial) btn.classList.add('hda-widget__color-btn--selected');

      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('hda-widget__color-btn--selected'));
        btn.classList.add('hda-widget__color-btn--selected');
        onChange(color);
      });

      buttons.set(color, btn);
      row.appendChild(btn);
    }

    return row;
  }

  // ── Persistence ───────────────────────────────────────────────────────────

  private async persistNote(
    itemsContainer: HTMLElement,
    status: HTMLSpanElement,
    existing: Note | null,
    color: NoteColor,
    workflowStepIds: string[],
  ): Promise<void> {
    const items = this.collectItems(itemsContainer);
    const now = Date.now();
    const gps = this.scrapedGps ?? existing?.gps;

    const note: Note = {
      propertyId: this.propertyId,
      platform: this.platform,
      items,
      color,
      title: this.scrapedTitle ?? existing?.title,
      price: this.scrapedPrice ?? existing?.price,
      gps,
      distanceAirKm: existing?.distanceAirKm,
      distanceRoadM: existing?.distanceRoadM,
      durationRoadS: existing?.durationRoadS,
      workflowStepIds,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    await this.repository.save(note);

    // Recalculate distances only if GPS is available and distances aren't cached yet
    // (or the GPS point changed from what was previously stored)
    const gpsChanged = gps && (
      existing?.gps?.lat !== gps.lat || existing?.gps?.lng !== gps.lng
    );
    const distancesMissing = gps && existing?.distanceRoadM == null;

    if (gps && (gpsChanged || distancesMissing)) {
      this.calculateAndSaveDistances(note, gps).catch(() => undefined);
    }

    status.textContent = 'Saved';
    setTimeout(() => (status.textContent = ''), 1500);
  }

  private async calculateAndSaveDistances(note: Note, gps: GpsCoordinates): Promise<void> {
    const home = await getHomeLocation();
    if (!home) return;

    const distanceAirKm = haversineKm(home, gps);
    const road = await fetchRoadRoute(home, gps);

    await this.repository.save({
      ...note,
      gps,
      distanceAirKm,
      distanceRoadM: road?.distanceM,
      durationRoadS: road?.durationS,
    });
  }

  private collectItems(container: HTMLElement): NoteItem[] {
    const items: NoteItem[] = [];
    container.querySelectorAll<HTMLElement>('.hda-widget__item-group').forEach(group => {
      const type = group.dataset['type'] as NoteItemType;
      group.querySelectorAll<HTMLTextAreaElement>('.hda-widget__item-textarea').forEach(ta => {
        const text = ta.value.trim();
        if (text) items.push({ type, text });
      });
    });
    return items;
  }
}

function buildListWorkflowTrain(steps: WorkflowStep[]): HTMLElement {
  const train = document.createElement('div');
  train.className = 'hda-wf-train';

  steps.forEach((step, i) => {
    const pill = document.createElement('span');
    pill.className = 'hda-wf-step';
    if (i === steps.length - 1) pill.classList.add('hda-wf-step--last');
    pill.textContent = step.label;
    train.appendChild(pill);

    if (i < steps.length - 1) {
      const arrow = document.createElement('span');
      arrow.className = 'hda-wf-arrow';
      arrow.textContent = '›';
      train.appendChild(arrow);
    }
  });

  return train;
}

function buildNoteItemEl(item: NoteItem): HTMLElement {
  const row = document.createElement('div');
  row.className = `hda-note-item hda-note-item--${item.type}`;

  const icon = document.createElement('span');
  icon.className = 'hda-note-item__icon';
  icon.textContent = item.type === 'positive' ? '+' : '−';

  const text = document.createElement('span');
  text.className = 'hda-note-item__text';
  text.textContent = item.text;

  row.append(icon, text);
  return row;
}