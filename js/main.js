// Entry point: wires up all page features

import { initSearchHighlighter } from './search.js';
import { initCommentToggle, initCommentForm } from './comments.js';
import { initBearData } from './bears.js';

initSearchHighlighter();
initCommentToggle();
initCommentForm();
initBearData();
