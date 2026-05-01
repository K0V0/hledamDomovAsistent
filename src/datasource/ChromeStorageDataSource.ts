import type { Note } from '../domain/Note';
import type { NoteDataSource } from './NoteDataSource';

/**
 * Persists notes in a Chrome StorageArea (local or sync).
 *
 * Pass the desired area via the constructor — configured in src/config/datasource.ts.
 *
 * chrome.storage.local  — device-only, up to 10 MB. Default choice.
 * chrome.storage.sync   — Google-account-synced across devices, but limited to
 *                         100 KB total / 8 KB per item / 512 items. Use only if
 *                         notes are expected to stay small and sparse.
 */
export class ChromeStorageDataSource implements NoteDataSource {
  private static readonly PREFIX = 'hda_note_';

  constructor(private readonly area: chrome.storage.StorageArea) {}

  private key(propertyId: string): string {
    return ChromeStorageDataSource.PREFIX + propertyId;
  }

  get(propertyId: string): Promise<Note | null> {
    const k = this.key(propertyId);
    return new Promise(resolve => {
      this.area.get(k, result => resolve((result[k] as Note) ?? null));
    });
  }

  save(note: Note): Promise<void> {
    return new Promise(resolve => {
      this.area.set({ [this.key(note.propertyId)]: note }, resolve);
    });
  }

  delete(propertyId: string): Promise<void> {
    return new Promise(resolve => {
      this.area.remove(this.key(propertyId), resolve);
    });
  }

  getAll(): Promise<Note[]> {
    return new Promise(resolve => {
      this.area.get(null, items => {
        const notes = Object.entries(items)
          .filter(([k]) => k.startsWith(ChromeStorageDataSource.PREFIX))
          .map(([, v]) => v as Note);
        resolve(notes);
      });
    });
  }
}