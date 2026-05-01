import { AbstractScraper } from '../AbstractScraper';
import type { PlatformId } from '../../domain/Platform';

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
}