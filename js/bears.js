// Bear data: extracting bear entries from wikitext and rendering them

import { fetchBearListWikitext, fetchImageUrl } from './wikiApi.js';

function extractBears(wikitext) {
  var speciesTables = wikitext.split('{{Species table/end}}');
  var bears = [];
  speciesTables.forEach(function(table) {
    var rows = table.split('{{Species table/row');
    rows.forEach(function(row) {
      var nameMatch = row.match(/\|name=\[\[(.*?)\]\]/);
      var binomialMatch = row.match(/\|binomial=(.*?)\n/);
      var imageMatch = row.match(/\|image=(.*?)\n/);

      if (nameMatch && binomialMatch && imageMatch) {
        var fileName = imageMatch[1].trim().replace('File:', '');

        fetchImageUrl(fileName).then(function(imageUrl) {
          var bear = {
            name: nameMatch[1],
            binomial: binomialMatch[1],
            image: imageUrl,
            range: 'TODO extract correct range'
          };
          bears.push(bear);

          if (bears.length === rows.length) {
            var moreBears = document.querySelector('.more_bears');
            bears.forEach(function(bear) {
              var html = '<div class="bear">' +
                '<img src="' + bear.image + '" alt="Image of ' + bear.name + '" style="width:200px; height:auto;">' +
                '<p><b>' + bear.name + '</b> (' + bear.binomial + ')</p>' +
                '<p>Range: ' + bear.range + '</p>' +
                '</div>';
              moreBears.innerHTML += html;
            });
          }
        });
      }
    });
  });
}

export function initBearData() {
  fetchBearListWikitext('List_of_ursids', 3)
    .then(function(wikitext) {
      extractBears(wikitext);
    });
}
