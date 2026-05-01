import type { Note } from '../domain/Note';
import type { PlatformId } from '../domain/Platform';
import type { NoteRepository } from '../repository/NoteRepository';
import { injectStyles } from './styles';

export type WidgetMode = 'list' | 'detail';

export class NoteWidget {
  constructor(
    private readonly propertyId: string,
    private readonly platform: PlatformId,
    private readonly repository: NoteRepository,
    private readonly mode: WidgetMode = 'detail',
  ) {}

  /**
   * Returns the widget element, or null when the mode is 'list' and no note exists.
   * Callers must handle null — it means "render nothing for this item".
   */
  async createElement(): Promise<HTMLElement | null> {
    injectStyles();
    const existing = await this.repository.get(this.propertyId);

    if (this.mode === 'list') {
      return existing?.text ? this.createListElement(existing.text) : null;
    }

    return this.createDetailElement(existing);
  }

  // ── List view — read-only ─────────────────────────────────────────────────

  private createListElement(text: string): HTMLElement {
    const root = document.createElement('div');
    root.className = 'hda-widget hda-widget--list';
    root.dataset['propertyId'] = this.propertyId;

    const preview = document.createElement('p');
    preview.className = 'hda-widget__preview';
    preview.textContent = text;

    root.appendChild(preview);
    return root;
  }

  // ── Detail view — editable ────────────────────────────────────────────────

  private createDetailElement(existing: Note | null): HTMLElement {
    const root = document.createElement('div');
    root.className = 'hda-widget';
    root.dataset['propertyId'] = this.propertyId;

    const toggle = document.createElement('button');
    this.applyToggleState(toggle, existing?.text ?? '');

    const panel = document.createElement('div');
    panel.className = 'hda-widget__panel';
    panel.hidden = true;

    const textarea = document.createElement('textarea');
    textarea.className = 'hda-widget__textarea';
    textarea.placeholder = 'Your notes for this property...';
    textarea.value = existing?.text ?? '';
    textarea.rows = 4;

    const status = document.createElement('span');
    status.className = 'hda-widget__status';

    panel.append(textarea, status);
    root.append(toggle, panel);

    toggle.addEventListener('click', () => {
      panel.hidden = !panel.hidden;
      if (!panel.hidden) textarea.focus();
    });

    let saveTimer: ReturnType<typeof setTimeout> | null = null;

    textarea.addEventListener('input', () => {
      status.textContent = 'Saving...';
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(
        () => this.persist(textarea, toggle, status, existing),
        800,
      );
    });

    return root;
  }

  private async persist(
    textarea: HTMLTextAreaElement,
    toggle: HTMLButtonElement,
    status: HTMLSpanElement,
    existing: Note | null,
  ): Promise<void> {
    const text = textarea.value.trim();
    const now = Date.now();

    await this.repository.save({
      propertyId: this.propertyId,
      platform: this.platform,
      text,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });

    this.applyToggleState(toggle, text);
    status.textContent = 'Saved';
    setTimeout(() => (status.textContent = ''), 1500);
  }

  private applyToggleState(toggle: HTMLButtonElement, text: string): void {
    const hasNote = text.length > 0;
    toggle.textContent = hasNote ? '📝 Note' : '+ Add note';
    toggle.title = hasNote ? 'View / edit note' : 'Add a note for this property';
    toggle.className =
      'hda-widget__toggle' + (hasNote ? ' hda-widget__toggle--has-note' : '');
  }
}