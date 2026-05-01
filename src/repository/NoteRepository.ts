import type { Note } from '../domain/Note';
import type { NoteDataSource } from '../datasource/NoteDataSource';

export class NoteRepository {
  constructor(private readonly dataSource: NoteDataSource) {}

  get(propertyId: string): Promise<Note | null> {
    return this.dataSource.get(propertyId);
  }

  save(note: Note): Promise<void> {
    return this.dataSource.save(note);
  }

  delete(propertyId: string): Promise<void> {
    return this.dataSource.delete(propertyId);
  }

  getAll(): Promise<Note[]> {
    return this.dataSource.getAll();
  }
}