// Entry point: wires up all page features

import { initSearchHighlighter } from './search.ts';
import { initCommentToggle, initCommentForm } from './comments.ts';
import { initBearData } from './bears.ts';

initSearchHighlighter();
initCommentToggle();
initCommentForm();
void initBearData();
