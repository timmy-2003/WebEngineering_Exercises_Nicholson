// Bear data: extracting bear entries from wikitext and rendering them

import { fetchBearListWikitext, fetchImageUrl } from './wikiApi.js';

var PLACEHOLDER_IMAGE = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150">' +
  '<rect width="100%" height="100%" fill="#ccc"/>' +
  '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" ' +
  'font-family="sans-serif" font-size="14" fill="#555">No image available</text>' +
  '</svg>'
);

function extractBearEntries(wikitext) {
  var speciesTables = wikitext.split('{{Species table/end}}');
  var entries = [];

  speciesTables.forEach(function(table) {
    var rows = table.split('{{Species table/row');
    rows.forEach(function(row) {
      var nameMatch = row.match(/\|name=\[\[(.*?)\]\]/);
      var binomialMatch = row.match(/\|binomial=(.*?)\n/);
      var imageMatch = row.match(/\|image=(.*?)\n/);

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
  return new Promise(function(resolve, reject) {
    var img = new Image();
    img.onload = function() { resolve(url); };
    img.onerror = function() { reject(new Error('Image failed to load: ' + url)); };
    img.src = url;
  });
}

function resolveBearImage(fileName) {
  return fetchImageUrl(fileName)
    .then(function(url) {
      return loadImage(url);
    })
    .catch(function(err) {
      console.warn('Using placeholder image for "' + fileName + '": ' + err.message);
      return PLACEHOLDER_IMAGE;
    });
}

function renderBears(bears) {
  var moreBears = document.querySelector('.more_bears');
  var html = bears.map(function(bear) {
    return '<div class="bear">' +
      '<img src="' + bear.image + '" alt="Image of ' + bear.name + '" style="width:200px; height:auto;">' +
      '<p><b>' + bear.name + '</b> (' + bear.binomial + ')</p>' +
      '<p>Range: ' + bear.range + '</p>' +
      '</div>';
  }).join('');
  moreBears.innerHTML += html;
}

function renderBearError(message) {
  var moreBears = document.querySelector('.more_bears');
  var errorPara = document.createElement('p');
  errorPara.className = 'error-message';
  errorPara.textContent = message;
  moreBears.appendChild(errorPara);
}

export async function initBearData() {
  try {
    var wikitext = await fetchBearListWikitext('List_of_ursids', 3);
    var entries = extractBearEntries(wikitext);

    if (entries.length === 0) {
      throw new Error('No bear entries were found in the Wikipedia page content.');
    }

    var bears = await Promise.all(entries.map(function(entry) {
      return resolveBearImage(entry.fileName).then(function(imageUrl) {
        return {
          name: entry.name,
          binomial: entry.binomial,
          image: imageUrl,
          range: 'TODO extract correct range'
        };
      });
    }));

    renderBears(bears);
  } catch (err) {
    console.error('Failed to load bear data:', err);
    renderBearError('Sorry, we could not load the bear information right now. Please try again later.');
  }
}
