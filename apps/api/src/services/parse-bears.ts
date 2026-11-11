export interface BearEntry {
  id: string;
  name: string;
  binomial: string;
  range: string;
  fileName: string;
}

export function toSlug(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z]+/gv, '-')
    .replace(/^-|-$/gv, '');
}

function stripWikiMarkup(value: string): string {
  return value
    .replace(/\[\[(?:[^\]\|]*\|)?(?<label>[^\]]*)\]\]/gv, '$<label>')
    .replace(/'{2,}/gv, '')
    .trim();
}

function readField(text: string, field: string): string | undefined {
  const pattern = new RegExp(
    `\\|${field}=(?<value>.*?)(?: \\|[\\w\\-]+=|\\n|\\}\\})`,
    'v'
  );
  return pattern.exec(text)?.groups?.value?.trim();
}

function readGenus(tableHeader: string): string | undefined {
  const genus = readField(tableHeader, 'genus');
  return genus === undefined ? undefined : stripWikiMarkup(genus);
}

function expandBinomial(binomial: string, genus: string | undefined): string {
  const epithet = /^[A-Z]\.\s*(?<epithet>.+)$/v.exec(binomial)?.groups?.epithet;
  return genus !== undefined && epithet !== undefined
    ? `${genus} ${epithet}`
    : binomial;
}

function parseRow(row: string, genus: string | undefined): BearEntry | null {
  const name = /\|name=\[\[(?<name>[^\]\|]*)/v.exec(row)?.groups?.name?.trim();
  const binomial = readField(row, 'binomial');
  const image = readField(row, 'image');
  if (name === undefined || binomial === undefined || image === undefined) {
    return null;
  }

  const fullBinomial = expandBinomial(stripWikiMarkup(binomial), genus);
  return {
    id: toSlug(fullBinomial),
    name,
    binomial: fullBinomial,
    range: stripWikiMarkup(readField(row, 'range') ?? ''),
    fileName: image.replace(/^File:/v, '').trim(),
  };
}

export function parseBearEntries(wikitext: string): BearEntry[] {
  const entries = new Map<string, BearEntry>();

  for (const table of wikitext.split('{{Species table/end}}')) {
    const [header = '', ...rows] = table.split('{{Species table/row');
    const genus = readGenus(header);

    for (const row of rows) {
      const entry = parseRow(row, genus);
      if (entry !== null && entry.id !== '' && !entries.has(entry.id)) {
        entries.set(entry.id, entry);
      }
    }
  }

  return [...entries.values()];
}
