import { AbstractScraper } from '../AbstractScraper';
import type { PlatformId } from '../../domain/Platform';
import overrideCss from './override.css';

/**
 * Scraper for sreality.cz.
 *
 * Selectors are based on the DOM structure observed in 2024-2025.
 * sreality.cz is an Angular SPA — the MutationObserver in AbstractScraper
 * handles late-rendered content automatically.
 *
 * Update selectors here when the portal redesigns its markup.
 */
export class SrealityScraper extends AbstractScraper {
  override readonly platformId: PlatformId = 'sreality';
  protected override readonly platformStyleOverrides = overrideCss;

  override getListItemSelector(): string {
    return 'a.MuiLink-underlineAlways';
  }

  override getLinkFromListItem(item: Element): string | null {
    const path = item.getAttribute('href');
    return path ? new URL(path, location.href).href : null;
  }

  override getListItemInsertionPoint(item: Element): Element | null {
    return item.querySelector('div.css-adf8sc') ?? item;
  }

  override isDetailPage(): boolean {
    return location.pathname.includes('/detail/');
  }

  override getLinkFromDetailPage(): string | null {
    return location.href;
  }

  override getDetailInsertionPoint(): Element | null {
    return document.querySelector('[data-e2e="detail-description"]');
  }

  protected override getTitleFromDetailPage(): string | null {
    return (
        document.querySelector('[data-e2e="detail-heading"]')?.textContent?.trim() ??
        document.querySelector<HTMLElement>('[data-e2e="detail-heading"]')?.textContent?.trim() ??
        null
    );
  }

  protected override getPriceFromDetailPage(): number | null {
    const raw =
      document.querySelector<HTMLElement>('[class*="price-value"]')?.textContent ??
      document.querySelector<HTMLElement>('.b-property-price strong')?.textContent ??
      document.querySelector<HTMLElement>('[class*="PropertyPrice"]')?.textContent;
    return this.parsePrice(raw);
  }

  override injectNoteAtTheBeginningOfContainer(): boolean {
    return true;
  }
}