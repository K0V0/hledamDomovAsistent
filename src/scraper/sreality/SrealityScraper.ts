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
    return 'article.property';
  }

  override getLinkFromListItem(item: Element): string | null {
    return (
      item.querySelector<HTMLAnchorElement>('a[href*="/detail/"]')?.href ?? null
    );
  }

  override getListItemInsertionPoint(item: Element): Element | null {
    return item.querySelector('.property-title') ?? item;
  }

  override isDetailPage(): boolean {
    return location.pathname.includes('/detail/');
  }

  override getLinkFromDetailPage(): string | null {
    return location.href;
  }

  override getDetailInsertionPoint(): Element | null {
    return (
      document.querySelector('.property-detail-header') ??
      document.querySelector('h1') ??
      document.querySelector('main')
    );
  }

  protected override getTitleFromDetailPage(): string | null {
    return (
      document.querySelector<HTMLElement>('.property-detail-header h1')?.textContent?.trim() ??
      document.querySelector<HTMLElement>('h1')?.textContent?.trim() ??
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
}