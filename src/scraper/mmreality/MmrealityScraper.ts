import { AbstractScraper } from '../AbstractScraper';
import type { GpsCoordinates } from '../../domain/GpsCoordinates';
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

  private _cachedGps: GpsCoordinates | null | undefined = undefined;

  override async getGpsFromDetailPage(): Promise<GpsCoordinates | null> {
    if (this._cachedGps !== undefined) return this._cachedGps;
    this._cachedGps = await this.fetchGpsFromSource();
    return this._cachedGps;
  }

  private async fetchGpsFromSource(): Promise<GpsCoordinates | null> {
    try {
      const res = await fetch(location.href);
      const html = await res.text();
      // Server-rendered HTML contains <leaflet-component :leaflet-center="[lat,lng]">
      const match = html.match(/:leaflet-center="\[([0-9.-]+),([0-9.-]+)\]"/);
      if (match) {
        return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
      }
    } catch {
      // ignore network errors
    }
    return null;
  }

  protected override getTitleFromDetailPage(): string | null {
    return document.querySelector<HTMLElement>('h2')?.textContent?.trim() ?? null;
  }

  protected override getPriceFromDetailPage(): number | null {
    const raw = document.querySelector<HTMLElement>('div.tw-text-text-price')?.textContent;
    return this.parsePrice(raw);
  }
}