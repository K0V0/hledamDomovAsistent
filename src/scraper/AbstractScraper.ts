import type { PlatformId } from '../domain/Platform';
import type { NoteRepository } from '../repository/NoteRepository';
import { NoteWidget, type WidgetMode } from '../ui/NoteWidget';
import { injectStyles } from '../ui/styles';
import { createLogger, type Logger } from '../utils/Logger';

export abstract class AbstractScraper {
  abstract readonly platformId: PlatformId;

  // Logger context is set to the concrete subclass name (e.g. "SrealityScraper"),
  // so inherited method calls appear as [SrealityScraper > AbstractScraper.method].
  protected readonly log: Logger;

  /** Platform-specific CSS appended after base styles. Set via override.css in each platform directory. */
  protected readonly platformStyleOverrides: string = '';

  constructor(protected readonly repository: NoteRepository) {
    this.log = createLogger(this.constructor.name);
  }

  // ── List view ────────────────────────────────────────────────────────────

  /** CSS selector that matches individual property cards in list view. */
  abstract getListItemSelector(): string;

  /** Extract the canonical property URL from a list item element. */
  abstract getLinkFromListItem(item: Element): string | null;

  /** Element inside a list item where the note widget will be appended. */
  abstract getListItemInsertionPoint(item: Element): Element | null;

  // ── Detail view ──────────────────────────────────────────────────────────

  /** Return true when the current page is a property detail page. */
  abstract isDetailPage(): boolean;

  /** Extract the canonical property URL from the detail page. */
  abstract getLinkFromDetailPage(): string | null;

  /** Element on the detail page where the note widget will be inserted. */
  abstract getDetailInsertionPoint(): Element | null;

  // ── Shared ───────────────────────────────────────────────────────────────

  /**
   * Derive a stable, storage-safe key from a URL.
   * Strips query params, fragment, and trailing slash.
   */
  protected normalizePropertyUrl(url: string): string {
    try {
      const u = new URL(url, location.href);
      return (u.hostname + u.pathname).replace(/\/$/, '');
    } catch {
      return url;
    }
  }

  /**
   *    Insert note at the beginning of containing element
   */
  protected injectNoteAtTheBeginningOfContainer(): boolean {
      return false;
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  async init(): Promise<void> {
    this.log.info(`starting on ${location.href}`);
    injectStyles(this.platformStyleOverrides);
    await this.processPage();
    this.observeDOM();
  }

  private async processPage(): Promise<void> {
    const isDetail = this.isDetailPage();
    this.log.debug(`isDetailPage → ${isDetail}`);
    if (isDetail) {
      await this.processDetailPage();
    } else {
      await this.processListPage();
    }
  }

  private async processListPage(): Promise<void> {
    const selector = this.getListItemSelector();
    const items = document.querySelectorAll(selector);
    this.log.debug(`getListItemSelector → "${selector}"  matched ${items.length} item(s)`);
    await Promise.all(Array.from(items).map(item => this.processListItem(item)));
  }

  private async processListItem(item: Element): Promise<void> {
    const link = this.getLinkFromListItem(item);
    this.log.debug(`getLinkFromListItem → ${link ?? 'null'}`);
    if (!link) return;

    const propertyId = this.normalizePropertyUrl(link);
    const target = this.getListItemInsertionPoint(item);
    this.log.debug(`getListItemInsertionPoint → ${describeElement(target)}  propertyId="${propertyId}"`);
    if (!target) return;

    await this.injectWidget(propertyId, target, 'list');
  }

  private async processDetailPage(): Promise<void> {
    const link = this.getLinkFromDetailPage();
    this.log.debug(`getLinkFromDetailPage → ${link ?? 'null'}`);
    if (!link) return;

    const propertyId = this.normalizePropertyUrl(link);
    const target = this.getDetailInsertionPoint();
    this.log.debug(`getDetailInsertionPoint → ${describeElement(target)}  propertyId="${propertyId}"`);
    if (!target) return;

    await this.injectWidget(propertyId, target, 'detail');
  }

  private async injectWidget(propertyId: string, target: Element, mode: WidgetMode): Promise<void> {
    if (target.querySelector('.hda-widget')) {
      this.log.debug(`widget already present, skipping  propertyId="${propertyId}"`);
      return;
    }

    const widget = new NoteWidget(propertyId, this.platformId, this.repository, mode);
    const el = await widget.createElement();

    if (!el) {
      this.log.debug(`no note for list item, widget suppressed  propertyId="${propertyId}"`);
      return;
    }

    if (this.injectNoteAtTheBeginningOfContainer()) {
      target.prepend(el);
    } else {
      target.appendChild(el);
    }
    this.log.debug(`widget injected (${mode})  propertyId="${propertyId}"`);
  }

  private observeDOM(): void {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    this.log.debug('MutationObserver attached');

    const observer = new MutationObserver(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this.log.debug('DOM change detected, re-processing page');
        this.processPage().catch(err => this.log.error('processPage failed after DOM change', err));
      }, 300);
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }
}

/** Short human-readable description of an element for log output. */
function describeElement(el: Element | null): string {
  if (!el) return 'null';
  const id = el.id ? `#${el.id}` : '';
  const firstClass = el.classList.item(0);
  const cls = firstClass ? `.${firstClass}` : '';
  return `<${el.tagName.toLowerCase()}${id}${cls}>`;
}