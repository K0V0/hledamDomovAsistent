import type { Note } from '../domain/Note';
import type { PlatformId } from '../domain/Platform';
import type { NoteRepository } from '../repository/NoteRepository';
import { injectStyles } from './styles';

export class NoteWidget {
  constructor(
    private readonly propertyId: string,
    private readonly platform: PlatformId,
    private readonly repository: NoteRepository,
  ) {}

  async createElement(): Promise<HTMLElement> {
    injectStyles();

    const existing = await this.repository.get(this.propertyId);

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