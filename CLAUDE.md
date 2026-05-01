# Hledám Domov Asistent — Claude Guide

Chrome extension that lets users attach personal notes to property listings on Czech real estate portals. The notes persist across sessions and appear both in list/search views and on individual property detail pages.

## Tech stack

- **Language:** TypeScript (strict, no runtime dependencies)
- **Build:** esbuild bundles each content script + service worker into `dist/`
- **Storage:** configurable via `src/config/datasource.ts` (default: `chrome.storage.local`)
- **Target:** Manifest V3, Chrome 120+

## Project layout

```
src/
  domain/          # Pure TypeScript interfaces — no imports from other layers
    Note.ts        # Note interface (propertyId, text, platform, timestamps)
    Platform.ts    # PlatformId union type ('sreality' | 'mmreality' | ...)

  datasource/      # Storage implementations — depend only on domain
    NoteDataSource.ts          # Interface: get / save / delete / getAll
    ChromeStorageDataSource.ts # Impl for chrome.storage.local or .sync (constructor arg)

  config/
    datasource.ts  # ← THE ONE FILE to edit when switching storage backends

  repository/      # Business logic layer — depends on NoteDataSource interface
    NoteRepository.ts   # Thin facade; delegates to the injected NoteDataSource

  scraper/         # One subdirectory per portal platform
    AbstractScraper.ts       # Abstract base: lifecycle, DOM observation, widget injection
    sreality/
      SrealityScraper.ts     # Concrete impl for sreality.cz
    mmreality/
      MmrealityScraper.ts    # Concrete impl for mmreality.cz

  ui/              # Self-contained widget (no framework)
    NoteWidget.ts  # Builds DOM imperatively; reads/writes via NoteRepository
    styles.ts      # CSS string injected once per page via <style>

  content/         # esbuild entry points — one per platform
    sreality.ts
    mmreality.ts

  background/
    service-worker.ts   # Minimal MV3 service worker
```

## Swapping the storage backend

The active datasource is the single export in `src/config/datasource.ts`. No other file needs to change.

| Option | How | Notes |
|---|---|---|
| Device-local | `new ChromeStorageDataSource(chrome.storage.local)` | Default. ~10 MB, no account needed |
| Cross-device sync | `new ChromeStorageDataSource(chrome.storage.sync)` | Google-account-synced. Hard limit: 100 KB total, 8 KB/note |
| Backend API | `new BackendDataSource(...)` | Implement `NoteDataSource` interface in `datasource/BackendDataSource.ts` |

## Adding a new portal

1. Add `'newportal'` to `PlatformId` in `src/domain/Platform.ts`.
2. Create `src/scraper/newportal/NewportalScraper.ts` extending `AbstractScraper`.
   Implement the six abstract members (three for list view, three for detail view).
3. Create `src/content/newportal.ts` — instantiate scraper and call `init()`.
4. Add an entry to `manifest.json` under `content_scripts` with the matching URL pattern.
5. Add the new entry point to `entryPoints` in `build.js`.

No other files need to change.

## AbstractScraper contract

| Member | Purpose |
|---|---|
| `platformId` | Identifies the platform in stored notes |
| `getListItemSelector()` | CSS selector for property cards in list/grid view |
| `getLinkFromListItem(item)` | Extracts canonical URL from a card element |
| `getListItemInsertionPoint(item)` | Where inside the card to append the widget |
| `isDetailPage()` | True when current URL is a detail page |
| `getLinkFromDetailPage()` | Canonical URL for the detail page (usually `location.href`) |
| `getDetailInsertionPoint()` | Where on the detail page to insert the widget |

`normalizePropertyUrl(url)` strips query params and trailing slash to produce a stable storage key.

The base class handles:
- Calling `processListPage` / `processDetailPage` on `init()`
- MutationObserver with 300 ms debounce for SPA-driven DOM changes
- Idempotency guard (`.hda-widget` presence check before inserting)

## NoteWidget

`NoteWidget(propertyId, platform, repository).createElement()` returns a `<div class="hda-widget">` containing:
- A toggle button (blue when no note, green when a note exists)
- A collapsible panel with a `<textarea>` and autosave (800 ms debounce)

Styles are injected once per page by `injectStyles()` in `src/ui/styles.ts`. All class names are prefixed `hda-` to avoid collisions with portal styles.

## Build & load

```bash
npm install
npm run build        # outputs to dist/
npm run watch        # rebuild on save (inline sourcemaps)
npm run typecheck    # type-check without emitting
```

Load unpacked: Chrome → Extensions → Load unpacked → select project root (where `manifest.json` lives).

## Selector maintenance

Portal sites redesign without notice. When a platform stops working:
1. Open DevTools on the portal, inspect a property card or detail page.
2. Update the relevant selector methods in the platform's `*Scraper.ts`.
3. Rebuild and reload the extension.

Selectors live entirely in the platform scraper — no other file needs to change.