export interface Bear {
  id: string;
  name: string;
  binomial: string;
  imageUrl: string | null;
  range: string;
}

export interface BearDetail extends Bear {
  intro: string;
}

export const PLACEHOLDER_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150">' +
    '<rect width="100%" height="100%" fill="#ccc"/>' +
    '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" ' +
    'font-family="sans-serif" font-size="14" fill="#555">No image available</text>' +
    '</svg>'
)}`;
