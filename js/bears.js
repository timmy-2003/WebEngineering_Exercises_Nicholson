// Bear data: extracting bear entries from wikitext and rendering them

import { fetchBearListWikitext, fetchImageUrl } from './wikiApi.js';

const PLACEHOLDER_IMAGE = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150">' +
  '<rect width="100%" height="100%" fill="#ccc"/>' +
  '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" ' +
  'font-family="sans-serif" font-size="14" fill="#555">No image available</text>' +
  '</svg>'
);

function extractBearEntries(wikitext) {
  const speciesTables = wikitext.split('{{Species table/end}}');
  const entries = [];

  speciesTables.forEach((table) => {
    const rows = table.split('{{Species table/row');
    rows.forEach((row) => {
      const nameMatch = row.match(/\|name=\[\[(.*?)\]\]/);
      const binomialMatch = row.match(/\|binomial=(.*?)\n/);
      const imageMatch = row.match(/\|image=(.*?)\n/);

      if (nameMatch && binomialMatch && imageMatch) {
        entries.push({
          name: nameMatch[1],
          binomial: binomialMatch[1],
          fileName: imageMatch[1].trim().replace('File:', '')
        });
      }
    });
  });

  return entries;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = () => reject(new Error('Image failed to load: ' + url));
    img.src = url;
  });
}

async function resolveBearImage(fileName) {
  try {
    const url = await fetchImageUrl(fileName);
    return await loadImage(url);
  } catch (err) {
    console.warn('Using placeholder image for "' + fileName + '": ' + err.message);
    return PLACEHOLDER_IMAGE;
  }
}

function createBearCard(bear) {
  const card = document.createElement('div');
  card.className = 'bear';

  const img = document.createElement('img');
  img.src = bear.image;
  img.alt = 'Image of ' + bear.name;

  const namePara = document.createElement('p');
  const nameBold = document.createElement('b');
  nameBold.textContent = bear.name;
  namePara.append(nameBold, ' (' + bear.binomial + ')');

  const rangePara = document.createElement('p');
  rangePara.textContent = 'Range: ' + bear.range;

  card.append(img, namePara, rangePara);
  return card;
}

function renderBears(container, bears) {
  const fragment = document.createDocumentFragment();
  bears.forEach((bear) => fragment.appendChild(createBearCard(bear)));
  container.appendChild(fragment);
}

function renderBearError(container, message) {
  const errorPara = document.createElement('p');
  errorPara.className = 'error-message';
  errorPara.textContent = message;
  container.appendChild(errorPara);
}

export async function initBearData() {
  const moreBears = document.querySelector('.more_bears');

  try {
    const wikitext = await fetchBearListWikitext('List_of_ursids', 3);
    const entries = extractBearEntries(wikitext);

    if (entries.length === 0) {
      throw new Error('No bear entries were found in the Wikipedia page content.');
    }

    const bears = await Promise.all(entries.map(async (entry) => {
      const imageUrl = await resolveBearImage(entry.fileName);
      return {
        name: entry.name,
        binomial: entry.binomial,
        image: imageUrl,
        range: 'TODO extract correct range'
      };
    }));

    renderBears(moreBears, bears);
  } catch (err) {
    console.error('Failed to load bear data:', err);
    renderBearError(moreBears, 'Sorry, we could not load the bear information right now. Please try again later.');
  }
}
