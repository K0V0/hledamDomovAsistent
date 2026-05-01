import type { Note, NoteColor } from '../domain/Note';
import type { PlatformId } from '../domain/Platform';
import type { NoteRepository } from '../repository/NoteRepository';
import { DEFAULT_COLOR, NOTE_COLOR_DEFS, NOTE_COLORS } from './noteColors';
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
   * Returns the widget element, or null when mode is 'list' and no note exists.
   * Callers must handle null — it means "render nothing for this item".
   */
  async createElement(): Promise<HTMLElement | null> {
    injectStyles();
    const existing = await this.repository.get(this.propertyId);

    if (this.mode === 'list') {
      if (!existing?.text) return null;
      return this.createListElement(existing.text, existing.color ?? DEFAULT_COLOR);
    }

    return this.createDetailElement(existing);
  }

  // ── List view — read-only ─────────────────────────────────────────────────

  private createListElement(text: string, color: NoteColor): HTMLElement {
    const { bg, border, text: textColor } = NOTE_COLOR_DEFS[color];

    const root = document.createElement('div');
    root.className = 'hda-widget hda-widget--list';
    root.dataset['propertyId'] = this.propertyId;

    const preview = document.createElement('p');
    preview.className = 'hda-widget__preview';
    preview.textContent = text;
    preview.style.background = bg;
    preview.style.borderLeftColor = border;
    preview.style.color = textColor;

    root.appendChild(preview);
    return root;
  }

  // ── Detail view — editable ────────────────────────────────────────────────

  private createDetailElement(existing: Note | null): HTMLElement {
    let activeColor: NoteColor = existing?.color ?? DEFAULT_COLOR;

    const root = document.createElement('div');
    root.className = 'hda-widget';
    root.dataset['propertyId'] = this.propertyId;

    const panel = document.createElement('div');
    panel.className = 'hda-widget__panel';

    const textarea = document.createElement('textarea');
    textarea.className = 'hda-widget__textarea';
    textarea.placeholder = 'Your notes for this property...';
    textarea.value = existing?.text ?? '';
    textarea.rows = 4;

    const status = document.createElement('span');
    status.className = 'hda-widget__status';

    const colorRow = this.createColorRow(activeColor, color => {
      activeColor = color;
      this.persistNote(textarea, status, existing, activeColor).catch(() => undefined);
    });

    panel.append(colorRow, textarea, status);
    root.append(panel);

    let saveTimer: ReturnType<typeof setTimeout> | null = null;

    textarea.addEventListener('input', () => {
      status.textContent = 'Saving...';
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(
        () => this.persistNote(textarea, status, existing, activeColor),
        800,
      );
    });

    return root;
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
    textarea: HTMLTextAreaElement,
    status: HTMLSpanElement,
    existing: Note | null,
    color: NoteColor,
  ): Promise<void> {
    const text = textarea.value.trim();
    const now = Date.now();

    await this.repository.save({
      propertyId: this.propertyId,
      platform: this.platform,
      text,
      color,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    });

    status.textContent = 'Saved';
    setTimeout(() => (status.textContent = ''), 1500);
  }
}