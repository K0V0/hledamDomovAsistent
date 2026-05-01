import { ChromeStorageDataSource } from '../datasource/ChromeStorageDataSource';
// import { BackendDataSource } from '../datasource/BackendDataSource';

/**
 * Active datasource for the extension.
 *
 * To swap storage, change the one uncommented export below.
 * No other file needs to change.
 *
 * Options:
 *   chrome.storage.local  — device-only, ~10 MB. Safe default.
 *   chrome.storage.sync   — Google-account-synced. Max 100 KB total, 8 KB/note.
 *   BackendDataSource     — future user-authenticated REST backend.
 */
export const noteDataSource = new ChromeStorageDataSource(chrome.storage.local);

// Sync variant — uncomment to enable cross-device sync (mind the quota):
// export const noteDataSource = new ChromeStorageDataSource(chrome.storage.sync);

// Backend variant — uncomment once BackendDataSource is implemented:
// export const noteDataSource = new BackendDataSource({ baseUrl: 'https://api.hledamdomov.cz' });