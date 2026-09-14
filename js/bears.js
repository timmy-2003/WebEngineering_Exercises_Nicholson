// Bear data: extracting bear entries from wikitext and rendering them

import { fetchBearListWikitext, fetchImageUrl } from './wikiApi.js';

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

export function initBearData() {
  fetchBearListWikitext('List_of_ursids', 3)
    .then(function(wikitext) {
      var entries = extractBearEntries(wikitext);

      return Promise.all(entries.map(function(entry) {
        return fetchImageUrl(entry.fileName).then(function(imageUrl) {
          return {
            name: entry.name,
            binomial: entry.binomial,
            image: imageUrl,
            range: 'TODO extract correct range'
          };
        });
      }));
    })
    .then(function(bears) {
      renderBears(bears);
    });
}
