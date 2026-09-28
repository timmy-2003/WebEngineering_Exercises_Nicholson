// Bear data: extracting bear entries from wikitext and rendering them

import { fetchBearListWikitext, fetchImageUrl } from './wikiApi.ts';
import { requireElement } from './dom.ts';

export interface BearEntry {
  name: string;
  binomial: string;
  fileName: string;
}

export interface Bear {
  name: string;
  binomial: string;
  image: string;
  range: string;
}

const PLACEHOLDER_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150">' +
    '<rect width="100%" height="100%" fill="#ccc"/>' +
    '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" ' +
    'font-family="sans-serif" font-size="14" fill="#555">No image available</text>' +
    '</svg>'
)}`;

function extractBearEntries(wikitext: string): BearEntry[] {
  const speciesTables = wikitext.split('{{Species table/end}}');
  const entries: BearEntry[] = [];

  speciesTables.forEach((table) => {
    const rows = table.split('{{Species table/row');
    rows.forEach((row) => {
      const nameMatch = /\|name=\[\[(?<name>.*?)\]\]/v.exec(row);
      const binomialMatch = /\|binomial=(?<binomial>.*?)\n/v.exec(row);
      const imageMatch = /\|image=(?<image>.*?)\n/v.exec(row);

      if (nameMatch === null || binomialMatch === null || imageMatch === null) {
        return;
      }

      const name = nameMatch.groups?.name;
      const binomial = binomialMatch.groups?.binomial;
      const image = imageMatch.groups?.image;

      if (name === undefined || binomial === undefined || image === undefined) {
        return;
      }

      entries.push({
        name,
        binomial,
        fileName: image.trim().replace('File:', ''),
      });
    });
  });

  return entries;
}

async function loadImage(url: string): Promise<string> {
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
    return url;
  } catch (cause) {
    throw new Error(`Image failed to load: ${url}`, { cause });
  }
}

async function resolveBearImage(fileName: string): Promise<string> {
  try {
    const url = await fetchImageUrl(fileName);
    return await loadImage(url);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // eslint-disable-next-line no-console -- Deliberate debug logging
    console.warn(`Using placeholder image for "${fileName}": ${message}`);
    return PLACEHOLDER_IMAGE;
  }
}

function createBearCard(bear: Bear): HTMLDivElement {
  const { name, binomial, image, range } = bear;

  const card = document.createElement('div');
  card.className = 'bear';

  const img = document.createElement('img');
  img.src = image;
  img.alt = `Image of ${name}`;

  const namePara = document.createElement('p');
  const nameBold = document.createElement('b');
  nameBold.textContent = name;
  namePara.append(nameBold, ` (${binomial})`);

  const rangePara = document.createElement('p');
  rangePara.textContent = `Range: ${range}`;

  card.append(img, namePara, rangePara);
  return card;
}

function renderBears(container: Element, bears: Bear[]): void {
  const fragment = document.createDocumentFragment();
  bears.forEach((bear) => {
    fragment.appendChild(createBearCard(bear));
  });
  container.appendChild(fragment);
}

function renderBearError(container: Element, message: string): void {
  const errorPara = document.createElement('p');
  errorPara.className = 'error-message';
  errorPara.textContent = message;
  container.appendChild(errorPara);
}

// The Wikipedia page's species table lives in this specific section of the article.
const BEAR_LIST_SECTION = 3;

export async function initBearData(): Promise<void> {
  const moreBears = requireElement('.more_bears');

  try {
    const wikitext = await fetchBearListWikitext(
      'List_of_ursids',
      BEAR_LIST_SECTION
    );
    const entries = extractBearEntries(wikitext);

    if (entries.length === 0) {
      throw new Error(
        'No bear entries were found in the Wikipedia page content.'
      );
    }

    const bears: Bear[] = await Promise.all(
      entries.map(async (entry): Promise<Bear> => {
        const imageUrl = await resolveBearImage(entry.fileName);
        return {
          name: entry.name,
          binomial: entry.binomial,
          image: imageUrl,
          range: 'TODO extract correct range',
        };
      })
    );

    renderBears(moreBears, bears);
  } catch (err) {
    // Deliberate debug logging: the user-facing message below is intentionally generic, so the
    // real cause must still be visible somewhere (Task 3).
    // eslint-disable-next-line no-console -- see comment above
    console.error('Failed to load bear data:', err);
    renderBearError(
      moreBears,
      'Sorry, we could not load the bear information right now. Please try again later.'
    );
  }
}
