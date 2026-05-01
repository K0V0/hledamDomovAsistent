import { noteDataSource } from '../config/datasource';
import { NoteRepository } from '../repository/NoteRepository';
import { MmrealityScraper } from '../scraper/mmreality/MmrealityScraper';

const scraper = new MmrealityScraper(new NoteRepository(noteDataSource));
scraper.init().catch(console.error);