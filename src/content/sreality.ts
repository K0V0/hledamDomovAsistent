import { noteDataSource } from '../config/datasource';
import { NoteRepository } from '../repository/NoteRepository';
import { SrealityScraper } from '../scraper/sreality/SrealityScraper';

const scraper = new SrealityScraper(new NoteRepository(noteDataSource));
scraper.init().catch(console.error);