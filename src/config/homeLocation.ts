export interface HomeLocation {
  lat: number;
  lng: number;
  label: string;
}

const KEY = 'hda_home_location';

export function getHomeLocation(): Promise<HomeLocation | null> {
  return new Promise(resolve =>
    chrome.storage.local.get(KEY, r => resolve((r[KEY] as HomeLocation) ?? null))
  );
}

export function saveHomeLocation(loc: HomeLocation): Promise<void> {
  return new Promise(resolve =>
    chrome.storage.local.set({ [KEY]: loc }, resolve)
  );
}