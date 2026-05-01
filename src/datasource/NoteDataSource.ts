import type { Note } from '../domain/Note';

/**
 * Contract for any storage backend that persists notes.
 *
 * Implementations:
 *   ChromeStorageDataSource  — chrome.storage.local or chrome.storage.sync
 *   BackendDataSource        — future REST/gRPC backend for cross-device sync
 *
 * The active implementation is selected in src/config/datasource.ts.
 * Swapping storage requires only changing that one import — no other code changes.
 */
export interface NoteDataSource {
  get(propertyId: string): Promise<Note | null>;
  save(note: Note): Promise<void>;
  delete(propertyId: string): Promise<void>;
  getAll(): Promise<Note[]>;
}