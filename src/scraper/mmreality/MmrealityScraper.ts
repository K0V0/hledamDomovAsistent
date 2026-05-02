import { AbstractScraper } from '../AbstractScraper';
import type { PlatformId } from '../../domain/Platform';
import overrideCss from './override.css';

/**
 * Scraper for mmreality.cz.
 *
 * Selectors are initial best-guesses — verify and refine against live DOM.
 * Update selectors here when the portal redesigns its markup.
 */
export class MmrealityScraper extends AbstractScraper {
  override readonly platformId: PlatformId = 'mmreality';
  protected override readonly platformStyleOverrides = overrideCss;

  override getListItemSelector(): string {
    return 'div#offers-list > a';
  }

  override getLinkFromListItem(item: Element): string | null {
    // item IS the <a> (matched by "div#offers-list > a").
    // getAttribute returns the raw relative path; new URL resolves it to absolute.

    const path = item.getAttribute('href');
    return path ? new URL(path, location.href).href : null;
  }

  override getListItemInsertionPoint(item: Element): Element | null {
    return item.querySelector('a > article > div.rds-content') ?? item;
  }

  override isDetailPage(): boolean {
      console.log(location.pathname);
    return /\/nemovitosti\/\d+/.test(location.pathname);
  }

  override getLinkFromDetailPage(): string | null {
    return location.href;
  }

  override getDetailInsertionPoint(): Element | null {
    return document.querySelector('div.rds-detail-container-inner > div');
  }

  override injectNoteAtTheBeginningOfContainer(): boolean {
    return true;
  }
}