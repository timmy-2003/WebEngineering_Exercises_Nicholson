// Wikipedia API access - pure network calls, no DOM knowledge

var baseUrl = 'https://en.wikipedia.org/w/api.php';

export function fetchBearListWikitext(title, section) {
  var params = {
    action: 'parse',
    page: title,
    prop: 'wikitext',
    section: section,
    format: 'json',
    origin: '*'
  };

  var url = baseUrl + '?' + new URLSearchParams(params).toString();
  return fetch(url)
    .then(function(res) {
      if (!res.ok) {
        throw new Error('Wikipedia API request failed with status ' + res.status);
      }
      return res.json();
    })
    .then(function(data) {
      if (data.error) {
        throw new Error('Wikipedia API error: ' + data.error.info);
      }

      var wikitext = data.parse && data.parse.wikitext && data.parse.wikitext['*'];
      if (!wikitext) {
        throw new Error('Unexpected Wikipedia API response: missing wikitext.');
      }

      return wikitext;
    });
}

export function fetchImageUrl(fileName) {
  var imageParams = {
    action: 'query',
    titles: 'File:' + fileName,
    prop: 'imageinfo',
    iiprop: 'url',
    format: 'json',
    origin: '*'
  };

  var url = baseUrl + '?' + new URLSearchParams(imageParams).toString();
  return fetch(url)
    .then(function(res) {
      if (!res.ok) {
        throw new Error('Wikipedia API request failed with status ' + res.status);
      }
      return res.json();
    })
    .then(function(data) {
      var pages = data.query && data.query.pages;
      var page = pages && Object.values(pages)[0];
      var info = page && page.imageinfo && page.imageinfo[0];

      if (!info || !info.url) {
        throw new Error('No image available for "' + fileName + '"');
      }

      return info.url;
    });
}
