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
  return fetch(url).then(function(res) {
    return res.json();
  }).then(function(data) {
    return data.parse.wikitext['*'];
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
  return fetch(url).then(function(res) {
    return res.json();
  }).then(function(data) {
    var pages = data.query.pages;
    var page = Object.values(pages)[0];
    return page.imageinfo[0].url;
  });
}
