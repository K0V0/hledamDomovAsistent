import { AbstractScraper } from '../AbstractScraper';
import type { GpsCoordinates } from '../../domain/GpsCoordinates';
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
    const raw = document
        .querySelector<HTMLElement>('p.css-1b1ajfd')?.textContent;
    // Strip anything from the first '(' onward to ignore "per m²" suffix
    const mainPrice = raw?.replace(/\(.*$/s, '');
    return this.parsePrice(mainPrice);
  }

  override injectNoteAtTheBeginningOfContainer(): boolean {
    return true;
  }

  override async getGpsFromDetailPage(): Promise<GpsCoordinates | null> {
    // Try JSON-LD structured data (schema.org/RealEstateListing or Place)
    for (const script of document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]')) {
      try {
        const data = JSON.parse(script.textContent ?? '') as Record<string, unknown>;
        const geo = (data['geo'] ?? (data['location'] as Record<string, unknown> | undefined)?.['geo']) as Record<string, unknown> | undefined;
        if (typeof geo?.['latitude'] === 'number' && typeof geo?.['longitude'] === 'number') {
          return { lat: geo['latitude'] as number, lng: geo['longitude'] as number };
        }
        if (typeof geo?.['latitude'] === 'string' && typeof geo?.['longitude'] === 'string') {
          return { lat: parseFloat(geo['latitude'] as string), lng: parseFloat(geo['longitude'] as string) };
        }
      } catch {
        // malformed JSON-LD, skip
      }
    }
    return null;
  }
}