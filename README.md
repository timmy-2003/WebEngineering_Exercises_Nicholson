# Web Engineering Coding Playground Template

This repository is designed as the foundation for coding playgrounds in the Web Engineering course. It offers a
structured space for experimenting with and mastering various web development technologies and practices. The project is
based on [this](https://developer.mozilla.org/en-US/docs/Learn/Accessibility/Accessibility_troubleshooting) repository
from MDN.

The project introduces a lot of code smells for you to tackle. **Let's get coding!**

## Submission Details and Deadlines

- Coding playgrounds are **individual** work
- Use this base template to create your project repository.
- Submit your repository link once.
- Each playground must be submitted via a new branch in that repository (last commit within deadline will be graded).
  - Naming conventions of branch: <code>playground-1</code>, <code>playground-2</code>, ...
- Each playground consists of 5 tasks, 1 point each. A task is complete only when both its implementation work and its
  theory question have been answered.

### Submission Deadlines

- [1st Playground](#1-js-playground): 14.09.2026
- [2nd Playground](#2-dependency--and-build-management-playground): 28.09.2026
- [3rd Playground](#3-migrate-to-a-frontend-framework): 04.10.2026
- other Playgrounds TBA by Thomas Berger

## Features

- Wonderful UI-design :heart_eyes:
- Loads bear data using [Wikipedia API](https://www.mediawiki.org/wiki/API:Main_page) :bear:
  - Original Wikipedia Page can be found [here](https://en.wikipedia.org/wiki/List_of_ursids)
- Worst JS coding practices :cold_sweat:
- No Build and Dependency Management at all :fire:

# Coding Playground Description

## 1. JS Playground

The provided base project template contains bad coding and templating practices and bugs for you to fix. Take a look
into the component files and get a grasp of the inner workings of the provided project. The app should provide the
requirements described below. Some are implemented poorly or do not work at all.

### App Requirements

- On page load the app requests the Wikipedia API to extract bear information from Wikipedia's
  [list of ursids](https://en.wikipedia.org/wiki/List_of_ursids). The page then renders the provided image, the common
  name, the scientific name and it's range.
  - the bears should be ordered in the same order and number (no duplicates) as in the corresponding Wiki page.
  - if there is no image available, the app should show a placeholder image.
- Users are able to toggle the comment section.
- Users are able to leave their name and a comment (both should not be empty).
- Users are able to search the web page contents using a search query, whereby only the html contents with tag
  <code>article</code> should be highlighted.

### Tasks

Fix the application code and support them with short code examples where useful.

#### Task 1: Introduce ES modules

Split the code into separate script files and use ES modules (`import`/`export`). Choose module boundaries that separate
concerns and avoid circular dependencies.

**Theory question:** How does an ES module differ from a classic script with respect to scope, strict mode, loading, and
bindings? Explain why the module boundaries you chose make the application easier to maintain.

> **Answer:**
>
> Classic scripts share one global scope — top-level `var`/`function` declarations land on `window`, so files can clash.
> A module gets its own scope; the only way to share anything is `export`/`import`, and it's automatically strict mode,
> so accidental globals throw instead of silently existing. Classic scripts load and run synchronously in document
> order; a module and its whole `import` graph load together and only run once that graph resolves — and only over
> `http(s)://`, which is why testing this app needed a local server. Imports are also live bindings to the exporter's
> own variable, not a copy, and a module only ever runs once no matter how many files import it.
>
> I split the files by what each piece actually depends on: `search.js` and `comments.js` are self-contained UI
> features, `wikiApi.js` is pure network code with no DOM knowledge, `bears.js` imports from `wikiApi.js` but nothing
> imports back (no cycle), and `main.js` is the only file that knows about all of them. That keeps each feature
> independently readable and replaceable, and a bug in one — say, the comment form — can't leak into another's state,
> since they no longer share scope.

#### Task 2: Correct the application behavior

Fix the semantic and functional issues according to the app requirements. Use appropriate DOM queries and event
handling, and ensure the bear list has the same order and number of entries as the source page.

> **What was fixed:**
>
> - **Bear list order/duplicates (`js/bears.js`)** — bears were pushed into a shared array as async image fetches
>   resolved (order depended on network timing), and the "done yet?" check compared a global count to a per-table count,
>   causing re-renders/duplicates. Fixed by extracting entries in wikitext order first, then fetching images with
>   `Promise.all` (order-preserving) and rendering once.
> - **Comment name/text never captured (`js/comments.js`)** — `.valeu`/`textContnet` typos. Fixed to
>   `.value`/`.textContent`.
> - **Empty comments allowed** — added `required` to the name/comment inputs and a trimmed-value guard in the submit
>   handler.
> - **Search highlighted the whole page (`js/search.js`)** — `walk()` ran on `document.body` instead of `<article>`,
>   leaking highlights into the nav/sidebar. Scoped it to `document.querySelector('article')`.
> - **Comment toggle only expanded once (`js/comments.js`)** — found after the fact, user-reported: the toggle inferred
>   its state by comparing the button's _own displayed text_ against the literal `'Show comment'` (singular), but after
>   the first click the button only ever reads `'Hide comments'`/`'Show comments'` (plural). So the `if` branch matching
>   the singular string could fire once, ever; every click after that fell into the `else` branch, which unconditionally
>   set `display: none` — hiding again instead of re-expanding. Fixed by tracking a real `isVisible` boolean instead of
>   parsing the button's own label back as state. Verified: four consecutive clicks now alternate `block`/`none`
>   correctly, instead of getting stuck hidden after the second click.

**Theory question:** Describe event propagation (capturing, target, and bubbling). Where could event delegation be
useful in this application, and what trade-off would it introduce?

> **Answer:**
>
> An event first **captures** — traveling from `window` down through each ancestor to the target — then hits the
> **target** itself, then **bubbles** back up the same path. `addEventListener` listens on bubbling by default;
> `{ capture: true }` opts into the first phase instead. `event.target` is whatever actually fired the event;
> `event.currentTarget` is whatever element the listener is attached to.
>
> Delegation would help on `.more_bears` and `.comment-container`, since both lists grow after page load — a single
> listener on the stable parent, using `event.target.closest(...)`, could handle clicks on any current _or future_
> card/comment without rewiring each one as it's added. The trade-off: the listener no longer knows what was clicked, so
> it needs that `.closest()` lookup and has to filter out irrelevant descendants; it only works for events that bubble,
> and it breaks if something calls `stopPropagation()` first. For the search form, the toggle button, and the comment
> form — each a single static element already known at load time — that indirection would buy nothing, which is why they
> keep direct listeners.

#### Task 3: Make failures explicit

Add error handling with `try`/`catch` and show useful, user-facing error messages. Check whether each image can be
loaded and render a placeholder when it cannot. Do not represent a failed request as valid empty data.

> **What was fixed:**
>
> - **Wikipedia API failures were unhandled (`js/wikiApi.js`)** — both functions blindly read into the response shape
>   (`data.parse.wikitext['*']`, `page.imageinfo[0].url`), so an API error, a missing page, or a missing image threw an
>   opaque `TypeError` that nothing ever caught. Both now check `res.ok`, check for `data.error`, and validate the
>   expected fields exist, throwing a specific `Error` with a clear message for each distinct failure instead.
> - **A missing image crashed the whole list (`js/bears.js`)** — previously nothing distinguished "this file has no
>   image" from "the network request failed," and either one would silently break the app requirement that missing
>   images fall back to a placeholder. Added `resolveBearImage()`, which fetches the image URL, verifies it actually
>   loads via a real `Image()` object (`onload`/`onerror`), and falls back to an inline SVG placeholder on any failure —
>   logged with `console.warn` so it's still visible for debugging, but never surfaced as a user-facing error since a
>   missing photo isn't fatal.
> - **A failed wikitext fetch rendered nothing, with no explanation** — `initBearData()` is now an `async` function with
>   one `try`/`catch` around the whole pipeline: on failure it renders a styled `.error-message` paragraph into
>   `.more_bears` instead of leaving that section empty (which would look like "zero bears exist" rather than "the
>   request failed"). The same check now throws if parsing the wikitext yields zero entries, for the same reason.
>
> Verified against the live API: a nonexistent file name now throws `No image available for "…"` (a `TypeError` before),
> a nonexistent page title throws `Wikipedia API error: …`, and the top-level catch renders a visible red
> `.error-message` box — while the normal path still renders all 8 bears with no regressions.

**Theory question:** How do synchronous exceptions and rejected promises travel through this application? Explain where
errors should be caught and why catching every error at its source can make failures harder to diagnose.

> **Answer:**
>
> A synchronous throw unwinds the call stack until a `try`/`catch` catches it. A rejected promise instead travels along
> a `.then()` chain until it hits a `.catch()` — or, under `await`, until an enclosing `try`/`catch`, since `await`
> re-throws a rejection as a normal exception. That's why `initBearData()`'s one `try`/`catch` can catch both a
> synchronous throw from `extractBearEntries()` and an awaited rejection from `fetchBearListWikitext()` — a bare
> `try`/`catch` around code that only _starts_ a `.then()` chain would miss that chain's rejections entirely.
>
> I catch at the smallest boundary that still knows what to do about the failure: `resolveBearImage()` catches per-image
> errors because the answer is always "show a placeholder"; `initBearData()` catches everything else, since it's the
> only place that knows what the user should see; `wikiApi.js` itself never catches, only validates and throws more
> specific errors. Catching at the source instead — say, `fetchImageUrl()` swallowing everything into `null` — would
> collapse "no image exists," "the network failed," and "the API changed shape" into the same value, exactly the
> failed-request-as-empty-data problem this task warns against, and it means nothing further up the chain ever gets to
> log or react to what actually went wrong.

#### Task 4: Refactor asynchronous control flow

Replace promise callback chains with `async`/`await` and refactor suitable callbacks to arrow functions. Run independent
asynchronous operations concurrently where doing so is safe.

> **What was fixed:**
>
> - **`js/wikiApi.js`** — both fetch functions were `.then()` chains; rewritten as `async function`s using `await`,
>   which reads top-to-bottom instead of nested callbacks.
> - **`js/bears.js`** — `loadImage`/`resolveBearImage` converted from `.then()`/`.catch()` to `async`/`await` with
>   `try`/`catch`. The per-bear mapping inside `Promise.all(entries.map(...))` is now an `async` arrow function that
>   `await`s `resolveBearImage` directly instead of chaining `.then()`. `Promise.all` was already in place from Task 2/3
>   and is kept — it's what runs every bear's image fetch concurrently, and there's nothing else in this app that's both
>   async and independent enough to parallelize further.
> - **Callbacks → arrow functions**, everywhere `this` wasn't needed: the `forEach`/`map` callbacks in `bears.js` and
>   `search.js`, `walk()` in `search.js`, and the `onclick`/`onsubmit` handlers in `comments.js`.
> - **One callback deliberately kept as a regular function**: the search form's `submit` listener in `search.js` reads
>   `this.q.value`, where `this` is the `<form>` (`addEventListener` binds `this` to the element the listener is on). An
>   arrow function has no `this` of its own — it would've inherited `this` from the enclosing module scope
>   (`undefined`), breaking `this.q`. This is the concrete case the theory question asks about.
>
> Re-verified after the refactor: the bear list still renders all 8 entries in order, the search highlighter still
> confines matches to `<article>`, and the comment form still validates and appends correctly — no behavioral changes,
> only control-flow style.

**Theory question:** Explain the relationship between `async`/`await`, promises, the microtask queue, and the browser
event loop. Also explain why an arrow function is not always an interchangeable replacement for a regular function,
particularly regarding `this`.

> **Answer:**
>
> `async`/`await` is sugar over promises: an `async` function always returns one, and `await` pauses its body until that
> promise settles, without blocking anything else. The continuation after an `await` (like a `.then()` callback) doesn't
> run immediately — it's queued as a **microtask**, and the event loop always drains the whole microtask queue before
> moving on to the next macrotask (timers, UI events, etc.). That's why `main.js` calling `initBearData()` without
> `await` doesn't block the other `init*` calls: `initBearData` runs synchronously up to its first `await`, yields, and
> the rest of `main.js` continues right away — `initBearData`'s continuation only resumes later, once the network
> response arrives.
>
> Arrow functions don't have their own `this` (or `arguments`) — they capture it from the scope they were _defined_ in,
> not from how they're called. Most callbacks here didn't care, so converting them was safe. But `search.js`'s submit
> handler needs `this` to be the `<form>`, which only works because `addEventListener` calls a regular function with
> `this` bound to the listener's element; as an arrow function it would've inherited `this` from the module scope
> (`undefined`) and thrown. That's why it's the one callback left as `function(e) { ... }`.

#### Task 5: Remove remaining code smells

Find and eliminate the remaining bad coding practices. Consider scope, accidental globals, mutation and shared
references, function responsibilities, naming, duplication, and DOM update patterns. Document each relevant finding, why
it is problematic, and how you fixed it below.

**Theory question:** Select one of your refactorings and explain how JavaScript scope, closures, references, or
prototypes caused the original risk. State how you verified that your refactoring preserved behavior.

> **Answer:**
>
> I'm picking the `renderBears`/`renderBearError` fix. Both used to call `document.querySelector('.more_bears')`
> independently — but a selector doesn't guarantee the same reference every time, only that something currently matches
> it. If that element were ever replaced elsewhere in the app, the two functions could silently end up pointing at two
> different nodes, since neither call would error. The risk was entirely about **references**: "same selector" isn't
> "same object identity" in JS. The fix queries once in `initBearData` and passes that one reference into whichever
> function runs, so there's no window for them to disagree.
>
> To verify behavior held, I re-ran the same checks as after every earlier task, against the live API: all 8 bears still
> render in order with the new DOM-based markup, the toggle still alternates over repeated clicks, a submitted comment
> still appends and clears the form, and search still highlights only within `<article>` — no console errors, no
> behavior changes, just internal structure.

> **What bad coding practices did you find? Why is it a bad practice and how did you fix it?**
>
> - **Duplication — `js/wikiApi.js`**: `fetchBearListWikitext` and `fetchImageUrl` each repeated the same four-step
>   boilerplate (build the URL from `params`, `fetch` it, check `res.ok` and throw, parse `.json()`) with only the
>   params differing. Two copies of the same logic means two places to keep in sync and two places a fix can be
>   forgotten. Extracted a private `fetchJson(params)` helper that both functions now call, then apply their own
>   response-shape validation on top.
>
>   ```js
>   async function fetchJson(params) {
>     const url = baseUrl + "?" + new URLSearchParams(params).toString();
>     const res = await fetch(url);
>     if (!res.ok) {
>       throw new Error("Wikipedia API request failed with status " + res.status);
>     }
>     return res.json();
>   }
>   ```
>
> - **DOM update anti-pattern + unescaped string-built HTML — `js/bears.js`**: `renderBears` built the entire bear list
>   as one string via `.map().join('')` and injected it with `moreBears.innerHTML += html`. `innerHTML +=` reads the
>   element's _current_ serialized HTML, concatenates the new markup, and reparses the whole thing back into DOM nodes —
>   so every existing node in `.more_bears` (including the "More Bears" heading) gets destroyed and rebuilt on every
>   call, not just the new part. It also interpolated `bear.name`/`bear.binomial` directly into an HTML string with no
>   escaping. Rewrote it to build real DOM nodes with `createElement`/`textContent` (safe by construction — text always
>   lands as text, never as parsed markup) and insert them once via a `DocumentFragment`, matching the pattern
>   `renderBearError` already used correctly.
> - **Duplication + function responsibilities — `js/bears.js`**: `renderBears` and `renderBearError` each independently
>   called `document.querySelector('.more_bears')` instead of receiving the container as a parameter. Besides
>   duplicating the lookup, this couples two supposedly-reusable rendering functions to one hardcoded selector and to
>   _whatever element matches it at the moment each one happens to run_ — see the theory answer below for why that's a
>   real (if currently latent) risk. Both functions now take `container` as their first argument; `initBearData` queries
>   `.more_bears` once and passes the same reference to whichever one runs.
> - **Duplicated/inlined styling — `js/bears.js`**: every generated `<img>` repeated the literal string
>   `style="width:200px; height:auto;"`. Moved it to a `.bear img { width: 200px; height: auto; }` rule in `style.css` —
>   one place to change the size instead of one per card.
> - **Function responsibilities + DOM update pattern — `js/comments.js`**: `initCommentForm`'s submit handler appended
>   the empty `<li>` to the live list _before_ appending its children into it (works, but builds the node partially in
>   front of the user instead of fully off-DOM first), and mixed validation, node construction, and form-reset into one
>   handler. Extracted `createCommentItem(name, comment)`, which builds the complete node and returns it; the handler
>   now does one `commentList.appendChild(createCommentItem(...))`.
> - **Naming — `js/comments.js`**: the `.comment-container` element was stored as `list`, a generic name in a file that
>   also deals with a `.comment-form` and a toggleable wrapper. Renamed to `commentList`.

## 2. Dependency- and Build Management Playground

Build the application with `npm` and a build and a dependency management tool of your choice (e.g.
[Vite](https://vitejs.dev/), [Webpack](https://webpack.js.org/), or others).

### Tasks

#### Task 1: Establish the build

Set up the project with `npm` and a build tool of your choice (for example, Vite or Webpack). Keep source files separate
from generated distribution files and commit the package-manager lockfile.

**Theory question:** Distinguish source, build, distribution, and deployment. What does your build tool do in
development and in a production build, and why is the lockfile important for reproducibility?

#### Task 2: Migrate to TypeScript

Use TypeScript as the primary development language and adapt the source files and configuration accordingly. Enable
strict checking, model the application's domain data, and validate data received from external APIs before treating it
as a typed value.

**Theory question:** TypeScript uses structural typing and erases types during compilation. Explain both concepts and
why a compile-time type alone cannot guarantee the shape of a Wikipedia API response at runtime.

#### Task 3: Add static analysis and formatting

Configure ESLint and Prettier using the rulesets below. Resolve all reported errors in the application code and avoid
disabling rules without a written justification.

**Theory question:** What different problems do a linter, a formatter, and the TypeScript compiler detect? Give one
concrete example for each from this project.

#### Task 4: Provide a consistent command interface

Define the following tasks within `npm scripts`:

- `dev`: starts the development server.
- `build`: runs the typescript compiler and bundles your application - bundling depends on your chosen build tool (e.g.
  Vite, Webpack) but typically bundles multiple files into one, applies optimizations like minification and obfuscation
  and outputs final results to a `dist` or `build` directory.
- `lint`: runs ESLint on all `.js` and `.ts` files in your projects `/src` directory.
- `lint:fix`: runs and also fixes all issues found by ESLint.
- `format`: formats all `.js` and `.ts` files in your projects `/src` directory.
- `format:check`: checks if the files in the `/src` directory are formatted according to Prettier's rules.

The `build`, `lint`, and `format:check` commands must exit with a non-zero status when their checks fail.

**Theory question:** Why are stable, composable commands such as these useful as an interface for developers and CI?
Explain idempotence and identify which of your scripts should be idempotent.

#### Task 5: Enforce quality before integration

Configure a pre-commit hook that checks staged code using [husky](https://typicode.github.io/husky/) and
[lint-staged](https://github.com/lint-staged/lint-staged). Configure a continuous-integration workflow that installs
dependencies from the lockfile and runs the non-mutating build, type, lint, and formatting checks for every push or pull
request.

**Theory question:** Compare a local pre-commit hook with a CI quality gate. Why is CI still necessary when hooks are
configured, and why should CI use non-mutating checks rather than automatically rewriting source files?

**ESLint Configurations**

Use ESLint configs [standard-with-typescript](https://www.npmjs.com/package/eslint-config-standard-with-typescript) and
[TypeScript ESLint Plugin](https://www.npmjs.com/package/@typescript-eslint/eslint-plugin). Your `.eslintrc` file should
have the following extensions:

```.eslintrc.yml
...
extends:
  - standard-with-typescript
  - plugin:@typescript-eslint/recommended
  - plugin:prettier/recommended
  - prettier
...
```

**Prettier Configurations**

Apply the following ruleset for Prettier:

```.prettierrc
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "printWidth": 80
}
```

## 3. Migrate to a Frontend Framework

In this playground you will migrate your application to React with TypeScript while retaining the build and quality
pipeline from Playground 2.

### Tasks

#### Task 1: Establish the React application

Add React (or another framework of your choice) to the existing Vite and TypeScript project and migrate the page entry
point to a React root. Preserve the build, linting, formatting, and CI setup from Playground 2, adapting scripts and
configuration where necessary.

**Theory question:** Contrast imperative DOM updates with React's declarative model. What happens during React's render,
reconciliation, and commit phases, and why should code outside React not modify DOM nodes owned by the React root? If
you chose not to use React, answer the same questions in the context of your chosen framework.

#### Task 2: Design the component tree

Decompose the interface into components organised by feature. Use props where appropriate, keep rendering pure, and
render bear collections with stable keys.

**Theory question:** Explain how component boundaries and typed props act as contracts. What makes a key stable, why
does React need keys during reconciliation, and why is an array index unsuitable when list entries can change order?

#### Task 3: Model state and interaction

Implement the comment toggle, comment form, and search behavior with React events and state. Use controlled inputs,
immutable updates, and derived values rather than duplicate state. Lift state only to the closest common owner that
needs it.

**Theory question:** Distinguish props, stored state, and derived values. Explain why direct mutation can produce
incorrect React behavior and when lifting state is preferable to introducing context.

#### Task 4: Load and represent remote data

Load and validate the bear data within the React application. Represent loading, success, empty, and error states
explicitly; prevent stale requests from overwriting newer results; and retain the image fallback behavior from
Playground 1.

**Theory question:** Why is fetching data a synchronization with an external system rather than part of pure rendering?
Explain how cleanup or cancellation prevents race conditions when a component unmounts or a request becomes irrelevant.

#### Task 5: Add client-side routing and verify the migration

Add at least a list route and a bear-detail route using a stable bear identifier as a route parameter. Use query
parameters for optional search/filter view state where appropriate. Verify that every requirement from Playground 1
still works and that all Playground 2 quality commands pass.

**Theory question:** Distinguish client-side rendering, a single-page application, and client-side routing. Compare
route parameters with query parameters, and describe one benefit and one cost of the SPA architecture used here.

---

## In-Class Accessibility Workshop

You might have noticed that the base project has a number of accessibility issues - your task is to explore the existing
site and fix them. Use the tools presented in our accessibility workshop to test the accessibility of your app and write
a summary of your reports below.

### Tasks

- Accessibility Checks:
  - **Color**: Test the current color contrast (text/background), report the results of the test, and then fix them by
    changing the assigned colors.
  - **Semantic HTML**: Report on what happens when you try to navigate the page using a screen reader. Fix those
    navigation issues.
  - **Audio**: The `<audio>` player isn't accessible to hearing impaired people — can you add some kind of accessible
    alternative for these users?
  - **Forms**:
    - The `<input>` element in the search form at the top could do with a label, but we don't want to add a visible text
      label that would potentially spoil the design and isn't really needed by sighted users. Fix this issue by adding a
      label that is only accessible to screen readers.
    - The two `<input>` elements in the comment form have visible text labels, but they are not unambiguously associated
      with their labels — how do you achieve this? Note that you'll need to update some of the CSS rule as well.
  - **Comment Section**: The show/hide comment control button is not currently keyboard-accessible. Can you make it
    keyboard accessible, both in terms of focusing it using the tab key, and activating it using the return key?
  - **The table**: The data table is not currently very accessible — it is hard for screen reader users to associate
    data rows and columns together, and the table also has no kind of summary to make it clear what it shows. Can you
    add some features to your HTML to fix this problem?

> _Note your findings here..._

<p>© 2026 Leon Freudenthaler (Hochschule Campus Wien). All rights reversed.</p>
