/**
 * Canonical chapter counts used to reject impossible scripture citations.
 * Counts follow standard Protestant numbering, plus the Deuterocanonical
 * books that appear in the BCP Daily Office (Wisdom, Sirach, etc.).
 */

export const BOOK_CHAPTER_COUNTS: Readonly<Record<string, number>> = {
  Genesis: 50,
  Exodus: 40,
  Leviticus: 27,
  Numbers: 36,
  Deuteronomy: 34,
  Joshua: 24,
  Judges: 21,
  Ruth: 4,
  '1 Samuel': 31,
  '2 Samuel': 24,
  '1 Kings': 22,
  '2 Kings': 25,
  '1 Chronicles': 29,
  '2 Chronicles': 36,
  Ezra: 10,
  Nehemiah: 13,
  Esther: 16, // includes Greek additions used in some BCP citations
  Job: 42,
  Psalm: 150,
  Proverbs: 31,
  Ecclesiastes: 12,
  'Song of Solomon': 8,
  Isaiah: 66,
  Jeremiah: 52,
  Lamentations: 5,
  Ezekiel: 48,
  Daniel: 14, // includes Greek additions
  Hosea: 14,
  Joel: 3,
  Amos: 9,
  Obadiah: 1,
  Jonah: 4,
  Micah: 7,
  Nahum: 3,
  Habakkuk: 3,
  Zephaniah: 3,
  Haggai: 2,
  Zechariah: 14,
  Malachi: 4,
  Matthew: 28,
  Mark: 16,
  Luke: 24,
  John: 21,
  Acts: 28,
  Romans: 16,
  '1 Corinthians': 16,
  '2 Corinthians': 13,
  Galatians: 6,
  Ephesians: 6,
  Philippians: 4,
  Colossians: 4,
  '1 Thessalonians': 5,
  '2 Thessalonians': 3,
  '1 Timothy': 6,
  '2 Timothy': 4,
  Titus: 3,
  Philemon: 1,
  Hebrews: 13,
  James: 5,
  '1 Peter': 5,
  '2 Peter': 3,
  '1 John': 5,
  '2 John': 1,
  '3 John': 1,
  Jude: 1,
  Revelation: 22,
  // Deuterocanonical books used in the BCP Daily Office
  Tobit: 14,
  Judith: 16,
  Wisdom: 19,
  Sirach: 51,
  Baruch: 6,
  '1 Maccabees': 16,
  '2 Maccabees': 15,
  '1 Esdras': 9,
  '2 Esdras': 16,
};

/** Abbreviations found in the Forward Movement BCP tables. */
const BOOK_ALIASES: Record<string, string> = {
  Gen: 'Genesis',
  'Gen.': 'Genesis',
  Genesis: 'Genesis',
  Exod: 'Exodus',
  'Exod.': 'Exodus',
  Exodus: 'Exodus',
  Lev: 'Leviticus',
  'Lev.': 'Leviticus',
  Leviticus: 'Leviticus',
  Num: 'Numbers',
  'Num.': 'Numbers',
  Numbers: 'Numbers',
  Deut: 'Deuteronomy',
  'Deut.': 'Deuteronomy',
  Deuteronomy: 'Deuteronomy',
  Josh: 'Joshua',
  'Josh.': 'Joshua',
  Joshua: 'Joshua',
  Judg: 'Judges',
  'Judg.': 'Judges',
  Judges: 'Judges',
  Ruth: 'Ruth',
  '1 Sam': '1 Samuel',
  '1 Sam.': '1 Samuel',
  '1 Samuel': '1 Samuel',
  '2 Sam': '2 Samuel',
  '2 Sam.': '2 Samuel',
  '2 Samuel': '2 Samuel',
  '1 Kings': '1 Kings',
  '2 Kings': '2 Kings',
  '1 Chron': '1 Chronicles',
  '1 Chron.': '1 Chronicles',
  '1 Chr.': '1 Chronicles',
  '2 Chron': '2 Chronicles',
  '2 Chron.': '2 Chronicles',
  '2 Chr.': '2 Chronicles',
  Ezra: 'Ezra',
  Neh: 'Nehemiah',
  'Neh.': 'Nehemiah',
  Nehemiah: 'Nehemiah',
  Esther: 'Esther',
  Job: 'Job',
  Ps: 'Psalm',
  'Ps.': 'Psalm',
  Psalm: 'Psalm',
  Psalms: 'Psalm',
  Prov: 'Proverbs',
  'Prov.': 'Proverbs',
  Proverbs: 'Proverbs',
  Eccles: 'Ecclesiastes',
  'Eccles.': 'Ecclesiastes',
  Ecclesiastes: 'Ecclesiastes',
  'Song': 'Song of Solomon',
  Isa: 'Isaiah',
  'Isa.': 'Isaiah',
  Isaiah: 'Isaiah',
  Jer: 'Jeremiah',
  'Jer.': 'Jeremiah',
  Jeremiah: 'Jeremiah',
  Lam: 'Lamentations',
  'Lam.': 'Lamentations',
  Lamentations: 'Lamentations',
  Ezek: 'Ezekiel',
  'Ezek.': 'Ezekiel',
  Ezekiel: 'Ezekiel',
  Dan: 'Daniel',
  'Dan.': 'Daniel',
  Daniel: 'Daniel',
  Hosea: 'Hosea',
  Hos: 'Hosea',
  'Hos.': 'Hosea',
  Joel: 'Joel',
  Amos: 'Amos',
  Obad: 'Obadiah',
  'Obad.': 'Obadiah',
  Obadiah: 'Obadiah',
  Jonah: 'Jonah',
  Micah: 'Micah',
  Mic: 'Micah',
  'Mic.': 'Micah',
  Nahum: 'Nahum',
  'Nah.': 'Nahum',
  Hab: 'Habakkuk',
  'Hab.': 'Habakkuk',
  Habakkuk: 'Habakkuk',
  Zeph: 'Zephaniah',
  'Zeph.': 'Zephaniah',
  Zephaniah: 'Zephaniah',
  Haggai: 'Haggai',
  'Hag.': 'Haggai',
  Zech: 'Zechariah',
  'Zech.': 'Zechariah',
  Zechariah: 'Zechariah',
  Mal: 'Malachi',
  'Mal.': 'Malachi',
  Malachi: 'Malachi',
  Matt: 'Matthew',
  'Matt.': 'Matthew',
  'Mat.': 'Matthew',
  Matthew: 'Matthew',
  Mark: 'Mark',
  Luke: 'Luke',
  John: 'John',
  Acts: 'Acts',
  Rom: 'Romans',
  'Rom.': 'Romans',
  Romans: 'Romans',
  '1 Cor': '1 Corinthians',
  '1 Cor.': '1 Corinthians',
  '1 Corinthians': '1 Corinthians',
  '2 Cor': '2 Corinthians',
  '2 Cor.': '2 Corinthians',
  '2 Corinthians': '2 Corinthians',
  Gal: 'Galatians',
  'Gal.': 'Galatians',
  Galatians: 'Galatians',
  Eph: 'Ephesians',
  'Eph.': 'Ephesians',
  'Ephes.': 'Ephesians',
  Ephesians: 'Ephesians',
  Phil: 'Philippians',
  'Phil.': 'Philippians',
  Philippians: 'Philippians',
  Col: 'Colossians',
  'Col.': 'Colossians',
  Colossians: 'Colossians',
  '1 Thess': '1 Thessalonians',
  '1 Thess.': '1 Thessalonians',
  '2 Thess': '2 Thessalonians',
  '2 Thess.': '2 Thessalonians',
  '1 Tim': '1 Timothy',
  '1 Tim.': '1 Timothy',
  '2 Tim': '2 Timothy',
  '2 Tim.': '2 Timothy',
  Titus: 'Titus',
  Philemon: 'Philemon',
  'Philem.': 'Philemon',
  Heb: 'Hebrews',
  'Heb.': 'Hebrews',
  Hebrews: 'Hebrews',
  James: 'James',
  'Jas.': 'James',
  '1 Pet': '1 Peter',
  '1 Pet.': '1 Peter',
  '1 Peter': '1 Peter',
  '2 Pet': '2 Peter',
  '2 Pet.': '2 Peter',
  '2 Peter': '2 Peter',
  '1 John': '1 John',
  '2 John': '2 John',
  '3 John': '3 John',
  Jude: 'Jude',
  Rev: 'Revelation',
  'Rev.': 'Revelation',
  Revelation: 'Revelation',
  Wisdom: 'Wisdom',
  'Wis.': 'Wisdom',
  'Wisd.': 'Wisdom',
  Sirach: 'Sirach',
  Ecclus: 'Sirach',
  'Ecclus.': 'Sirach',
  'Sir.': 'Sirach',
  Baruch: 'Baruch',
  'Bar.': 'Baruch',
  Tobit: 'Tobit',
  'Tob.': 'Tobit',
  Judith: 'Judith',
  'Jth.': 'Judith',
  '1 Esdras': '1 Esdras',
  '2 Esdras': '2 Esdras',
  '1 Macc': '1 Maccabees',
  '1 Macc.': '1 Maccabees',
  '2 Macc': '2 Maccabees',
  '2 Macc.': '2 Maccabees',
};

export interface ParsedCitation {
  book: string;
  /** Highest chapter number mentioned in the citation. */
  maxChapter: number;
  display: string;
}

/**
 * Parse a lesson citation such as "Isa. 1:1-9" or "1 John 4:7-16".
 * Returns null for empty or unparseable strings.
 */

function highestChapterInRef(ref: string, bookChapters: number): number {
  if (bookChapters === 1) {
    return 1;
  }
  const cleaned = ref.replace(/[[\]()]/g, ' ');
  const fromColons = [...cleaned.matchAll(/(\d+):/g)].map((m) => Number(m[1]));
  if (fromColons.length > 0) {
    return Math.max(...fromColons);
  }
  // No verse colons: "Isaiah 1-12" or "Psalm 72" are chapter numbers.
  const nums = [...cleaned.matchAll(/\d+/g)].map((m) => Number(m[0]));
  return nums.length > 0 ? Math.max(...nums) : 1;
}


function resolveBookName(alias: string): string | null {
  if (Object.prototype.hasOwnProperty.call(BOOK_CHAPTER_COUNTS, alias)) {
    return alias;
  }
  return BOOK_ALIASES[alias] || BOOK_ALIASES[alias.replace(/\.$/, '')] || null;
}

export function parseCitation(raw: string): ParsedCitation | null {
  const text = raw.trim();
  if (!text) {
    return null;
  }
  const match = /^((?:[123]\s+)?[A-Za-z][A-Za-z.]+)\s+(.+)$/.exec(text);
  if (!match) {
    return null;
  }
  const alias = match[1].replace(/\s+/g, ' ').trim();
  const book = resolveBookName(alias);
  if (!book) {
    return null;
  }
  const maxChapter = highestChapterInRef(match[2], BOOK_CHAPTER_COUNTS[book] || 150);
  const display = `${book} ${match[2].trim()}`;
  return { book, maxChapter, display };
}

export interface CitationIssue {
  citation: string;
  reason: string;
}

export function validateCitation(raw: string): CitationIssue | null {
  const parts = raw.split(/\s*;\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    return { citation: raw, reason: 'empty citation' };
  }
  let lastBook: string | undefined;
  for (const part of parts) {
    const parsed =
      parseCitation(part) ||
      (lastBook && /^\d/.test(part) ? parseCitation(`${lastBook} ${part}`) : null);
    if (!parsed) {
      return { citation: part, reason: 'unrecognized book or empty citation' };
    }
    lastBook = parsed.book;
    const count = BOOK_CHAPTER_COUNTS[parsed.book];
    if (count === undefined) {
      return { citation: part, reason: `no chapter count for ${parsed.book}` };
    }
    if (parsed.maxChapter < 1 || parsed.maxChapter > count) {
      return {
        citation: part,
        reason: `${parsed.book} has ${count} chapters, but citation refers to chapter ${parsed.maxChapter}`,
      };
    }
  }
  return null;
}

export function canonicalBookName(alias: string): string | null {
  const key = alias.replace(/\s+/g, ' ').trim();
  return resolveBookName(key);
}
