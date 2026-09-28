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
>     const url = baseUrl + '?' + new URLSearchParams(params).toString();
>     const res = await fetch(url);
>     if (!res.ok) {
>       throw new Error('Wikipedia API request failed with status ' + res.status);
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

> **What was set up:**
>
> - Ran `npm init -y` to create `package.json`, then installed [Vite](https://vitejs.dev/) as the only `devDependency`.
>   No framework plugin is needed yet since the app is still plain HTML/CSS/JS — Vite handles that out of the box.
> - Added three `npm scripts`: `dev` (starts the Vite dev server with hot module reloading), `build` (produces an
>   optimized production bundle in `dist/`), and `preview` (serves that `dist/` build locally to sanity-check it).
> - No source files moved: `index.html` stays at the project root (Vite's convention — it's treated as the entry point),
>   and `style.css`/`js/*.js`/`media/*` stay exactly where they were. Vite discovers the module graph starting from the
>   `<script type="module" src="js/main.js">` tag already in `index.html`, so Task 1's ES-module split from Playground 1
>   is what makes this migration possible with zero code changes.
> - `.gitignore` already excluded `dist`, `dist-ssr`, and `node_modules` from the project template, so generated output
>   was never at risk of being committed; `package-lock.json` is committed alongside `package.json`.
>
> Verified `npm run build`: 10 modules were transformed into one hashed JS bundle and one hashed CSS file in
> `dist/assets/`, all four `media/` files (2 images, 2 audio) were copied with hashed filenames and their references in
> `index.html` rewritten to match, and the page's inline `<style>` block was minified in place. Verified `npm run dev`:
> the dev server serves `index.html` and `js/main.js` directly (HTTP 200 on both) with no build step, confirming the app
> still runs unmodified.

**Theory question:** Distinguish source, build, distribution, and deployment. What does your build tool do in
development and in a production build, and why is the lockfile important for reproducibility?

> **Answer:**
>
> **Source** is what's committed and hand-written — `index.html`, `style.css`, `js/*.js` — meant for humans and tools to
> read and edit, not for a browser to necessarily consume as-is. **Build** is the process of transforming that source
> into something more optimized: bundling modules together, minifying, hashing filenames for cache-busting.
> **Distribution** is the concrete output of that process — the `dist/` folder: self-contained, browser-ready files,
> never hand-edited, always regenerable from source (which is exactly why it's gitignored). **Deployment** is the
> separate step of taking that distribution artifact and making it reachable at a URL — uploading `dist/` to a static
> host, a CDN, or a server.
>
> In development (`npm run dev`), Vite doesn't bundle at all: it serves source files over native ES module imports and
> only transforms what the browser actually requests, which is why the server starts instantly regardless of project
> size, and why edits show up via hot module reloading without a full page reload. In a production build
> (`npm run build`), Vite instead bundles the whole module graph with Rollup: it merges the 5 JS files into one chunk,
> minifies JS/CSS, hashes every output filename (so browsers can cache it forever until the content actually changes),
> and rewrites every reference to those files (in `index.html`, in `url()`/`<img src>` for `media/`) to point at the
> hashed names.
>
> The lockfile (`package-lock.json`) records the exact resolved version — and for transitive dependencies, exact
> versions all the way down — of every package that was installed, not just the version ranges declared in
> `package.json`. Without it, `npm install` could resolve a dependency's dependency to a newer version between two
> installs (even with identical `package.json` files) and silently change the build tool's behavior for someone else on
> the team, in CI, or on a future machine. Committing it means `npm ci` reproduces the exact same `node_modules` tree
> every time.

#### Task 2: Migrate to TypeScript

Use TypeScript as the primary development language and adapt the source files and configuration accordingly. Enable
strict checking, model the application's domain data, and validate data received from external APIs before treating it
as a typed value.

> **What was migrated:**
>
> - Renamed `js/*.js` to `src/*.ts` (`git mv`, so history tracks them as renames) and updated `index.html`'s entry
>   script to `<script type="module" src="/src/main.ts">`. Installed `typescript` as a devDependency and added a
>   `tsconfig.json` modeled on Vite's own `vanilla-ts` template: `strict: true` plus
>   `noUnusedLocals`/`noUnusedParameters`/ `noFallthroughCasesInSwitch`, `moduleResolution: "bundler"` with
>   `allowImportingTsExtensions` (so imports can say `./wikiApi.ts` directly), and `noEmit: true` since Vite/esbuild
>   does the actual transpilation — `tsc` here only type-checks.
> - Wired that in: `npm run build` is now `tsc && vite build` (fails the build on a type error before bundling even
>   starts), and added a standalone `npm run typecheck` (`tsc --noEmit`) for quick checks during development. This
>   matters because **Vite's dev server does not type-check** — it uses esbuild to strip types on the fly for speed, so
>   a type error is invisible in `npm run dev` and only surfaces via `tsc`/`npm run build`. That's the type-erasure
>   theory question, made concrete: the dev server only ever sees erased output.
> - **Domain data modeled** in `bears.ts`: `BearEntry` (`name`, `binomial`, `fileName` — what wikitext parsing produces)
>   and `Bear` (`name`, `binomial`, `image`, `range` — what actually gets rendered, once an image URL is resolved) are
>   now two distinct `interface`s instead of anonymous object literals, so a mistake like passing a `BearEntry` where a
>   `Bear` is expected is a compile error, not a `bear.image` runtime `undefined`.
> - **External data validated before being treated as typed** in `wikiApi.ts`: `fetchJson()` now returns
>   `Promise<unknown>` — deliberately not a specific interface — because nothing about a successful HTTP status
>   guarantees the response body matches what this app expects. `fetchBearListWikitext`/`fetchImageUrl` each run the
>   `unknown` value through a type-guard function (`isWikiApiError`, `isParseWikitextResponse`, `isImageInfoResponse`)
>   that inspects the actual value at runtime and only then narrows it to a typed interface; this is the same
>   `res.ok`/`data.error`/shape checks from Task 3, now expressed as `unknown` → validate → narrow instead of implicit
>   `any`.
> - **A new shared file, `dom.ts`**: strict null checks mean `querySelector()` returns `T | null`, so every call site
>   would otherwise need a `!` assertion or a null check. Added one `requireElement<T>(selector)` helper that throws a
>   clear error if nothing matches, used by `search.ts`, `comments.ts`, and `bears.ts` — a horizontal concern like
>   `wikiApi.ts` was in Task 1, not tied to any one feature.
> - **A real type error strict mode caught**: `search.ts`'s `walk()` used
>   `node.replaceWith.apply(node, span.childNodes)`. TypeScript's `Function.prototype.apply` types check the argument
>   array against `replaceWith`'s actual parameter type (`(Node | string)[]`), and `NodeListOf<ChildNode>` doesn't
>   structurally satisfy `Array` (no `push`/`concat`/etc.), so this line failed to compile. It ran fine as plain JS —
>   `.apply()` is untyped there — but strict TypeScript flagged a genuine latent mismatch. Fixed with a spread instead:
>   `node.replaceWith(...span.childNodes)`, which is both type-safe and clearer.
> - **A legacy DOM feature strict typing doesn't model**: the search form's submit handler used to read `this.q.value`,
>   relying on the (real, working) browser behavior that named form controls are exposed as properties on `<form>`.
>   TypeScript's `HTMLFormElement` type has no index signature for that, so `this.q` doesn't compile. Replaced with
>   `this.elements.namedItem('q')` plus an `instanceof HTMLInputElement` check — the typed equivalent, and also more
>   defensive (it fails with a clear message if the form's markup ever changes instead of silently reading `undefined`).
>
> Verified: `npm run typecheck` passes with zero errors, `npm run build` produces the same bundle shape as Task 1 (one
> hashed JS chunk, one hashed CSS file, four hashed media files) with no `tsc` failures, and `npm run dev` still serves
> `/src/main.ts` directly (confirmed via a raw request, HTTP 200) with the app behaving identically to before the
> migration — same 8 bears rendered in order, same search/comment/toggle behavior.

**Theory question:** TypeScript uses structural typing and erases types during compilation. Explain both concepts and
why a compile-time type alone cannot guarantee the shape of a Wikipedia API response at runtime.

> **Answer:**
>
> **Structural typing** means TypeScript decides whether a value satisfies a type by comparing shape — does it have the
> right properties with the right types — not by whether it was explicitly declared as that type (nominal typing, as in
> Java/C#). Two independently-declared interfaces with identical members are interchangeable; a plain object literal is
> assignable to an interface it never mentions, as long as its shape matches. That's exactly how
> `isParseWikitextResponse` can narrow a bare `unknown` value into `ParseWikitextResponse` — there's no runtime "is this
> class" check possible, only a shape check, which is why the guard has to manually inspect properties instead of
> relying on `instanceof`.
>
> **Type erasure** means none of this exists after compilation: `interface`, `type`, generic parameters, and type
> annotations are compile-time-only information the compiler uses to check code, then deletes. The emitted JavaScript
> (or, in this project, what esbuild produces when Vite serves/bundles `.ts` files, since `tsc` itself never emits here
> — `noEmit: true`) contains no trace of `ParseWikitextResponse` or `Bear` at runtime; a `console.log(typeof someBear)`
> would just say `"object"`. There is no `Bear.class` to check against, because the type was erased before the code ever
> ran.
>
> Put together: writing `const data: ParseWikitextResponse = await fetchJson(...)` would type-check, but it wouldn't
> make the response _be_ that shape — it would just tell the compiler to stop checking, and then vanish, leaving nothing
> behind to verify the claim at runtime. If Wikipedia changed its API response format, returned a rate-limit error body,
> or the network returned malformed JSON, the annotation wouldn't catch any of it; the code would run exactly as if the
> assumption were true, right up until it read a property that doesn't exist and crashed with a runtime error the type
> system had no way to prevent. That's why `fetchJson()` returns `unknown` instead of a typed interface: `unknown`
> forces every caller to actually check the value's shape (via a type guard) before TypeScript will let it be used as
> anything more specific — turning an assumption enforced only at compile time into a check enforced at the one time it
> actually matters, runtime.

#### Task 3: Add static analysis and formatting

Configure ESLint and Prettier using the rulesets below. Resolve all reported errors in the application code and avoid
disabling rules without a written justification.

> **A note on the ruleset below before setting this up:** the assignment names `eslint-config-standard-with-typescript`
> and a `.eslintrc` config file. I checked both against the npm registry before installing anything:
> `eslint-config-standard-with-typescript` is deprecated (npm prints "Please use eslint-config-love, instead" — same
> author, direct successor, same "Standard style + strict TypeScript" philosophy). On top of that, current ESLint (v9+,
> now v10) defaults to flat config (`eslint.config.js`) instead of `.eslintrc`, and `eslint-config-love` only ships a
> flat-config export — it doesn't support `.eslintrc extends` at all. So the literal recipe in the assignment can't be
> followed as written; I used `eslint-config-love` + flat config instead, which is the closest match to the assignment's
> actual intent, just updated for current tooling.
>
> **What was set up:**
>
> - Installed `eslint`, `eslint-config-love`, `eslint-plugin-prettier`, `eslint-config-prettier`, and `prettier` as
>   devDependencies, and added `eslint.config.js` (flat config): `love`'s ruleset scoped to `src/**/*.ts`, plus
>   `eslint-plugin-prettier/recommended` (which also pulls in `eslint-config-prettier` to disable any ESLint formatting
>   rule that would conflict with Prettier) as the last entry so it can override earlier rules.
> - **A real, unrelated compatibility problem turned up during install**: this project's `typescript` devDependency
>   (installed in Task 2) was already on version 7, but `eslint-config-love`'s bundled `@typescript-eslint` tooling caps
>   out below TypeScript 6.1 (`npm ls` reported it as `invalid`). Rather than fight that, I pinned `typescript` down to
>   `~6.0.3` — the newest release the linter's toolchain actually supports, and still a fully current, strict-capable
>   compiler; nothing in this project uses anything TypeScript 7-specific.
> - Extended the existing `.prettierrc.json` (from Playground 1's markdown-formatting setup) rather than replacing it:
>   the assignment's ruleset (`semi`, `singleQuote`, `trailingComma: "es5"`, `tabWidth: 2`, `printWidth: 80`) is now the
>   base config, with an `overrides` entry keeping `proseWrap: "always"` and `printWidth: 120` for `*.md` files only, so
>   the two configs coexist instead of one overwriting the other.
> - Added `npm run lint` (`eslint src`) and `npm run format` (`prettier --write src`) scripts.
>
> **Errors resolved, not disabled** (love is intentionally strict — "safety at the cost of verbosity" — so most of the
> ~110 initial errors were genuine, if pedantic; a sample of the non-mechanical fixes):
>
> - **A real bug-shaped strictness catch**: `loadImage()` in `bears.ts` used a manual
>   `new Promise((resolve, reject) => {...})` around `Image.onload`/`onerror`, which `promise/avoid-new` flagged.
>   Rewrote it around `HTMLImageElement.prototype.decode()`, a native promise-returning API that resolves once the image
>   is decoded and rejects on failure — removing the manual wrapper entirely instead of just suppressing the rule.
>   `search.ts`'s `walk()` used `node.nodeType === 1` plus an unchecked `node as Element` cast, which
>   `@typescript-eslint/no-unsafe-type-assertion` flagged as unsound; switched to `node instanceof Element` (and
>   `instanceof Text` for the other branch), which TypeScript can actually narrow on, removing the cast.
> - **`@typescript-eslint/strict-boolean-expressions`** (the most frequent finding) disallows using a nullable value
>   directly as a condition (`if (!parent)`, `if (!searchKey)`) and requires an explicit comparison
>   (`if (parent === null)`, `if (searchKey === '')`) — this is exactly the distinction between "falsy" and "actually
>   absent" that caused the Task 2 comment-toggle bug category in spirit, just enforced at compile time now instead of
>   by manual review.
> - **`require-unicode-regexp`** required the regex literals in `bears.ts` (wikitext field extraction) and `search.ts`
>   (character-escaping) to declare a Unicode mode. It specifically wants the newer `v` flag over `u`, which has a
>   stricter character-class grammar — e.g. `[.*+?^${}()|[\]\\]` (a well-known "escape all regex metacharacters"
>   pattern) had to become `[.*+?^$\{\}\(\)\|\[\]\\]`, since `v` reserves `{`, `}`, `(`, `)`, `|`, and `[` inside a
>   class for future set-notation syntax. This also required bumping `tsconfig.json`'s `target`/`lib` to `ES2024`, since
>   TypeScript itself only recognizes the `v` flag at that target.
> - **Two disables, both with an inline justification comment** (the only ones in the codebase): `no-console` on the two
>   intentional `console.warn`/`console.error` calls from Task 3's error-handling design — those exist specifically to
>   stay visible for debugging while the user only sees a generic message, so silencing them would undo that decision.
>   And `@typescript-eslint/no-unnecessary-type-parameters` on `dom.ts`'s `requireElement<T>` — the rule's heuristic is
>   that a type parameter used only once should just be inlined, but here it's a deliberate explicit-override generic
>   (the same shape as the DOM's own `querySelector<T>`), which the heuristic can't tell apart from an accidental one.
> - **One config-level tuning, not a disable**: `@typescript-eslint/no-magic-numbers` was set to ignore `0` and `1`
>   project-wide (`eslint.config.js`), since they recur constantly as array-first-element and empty-check literals
>   (`entries.length === 0`, `imageinfo?.[0]`) with no meaning a named constant would add. Every other numeric literal —
>   including the Wikipedia section index — still gets flagged; that one was extracted into
>   `const BEAR_LIST_SECTION = 3`.
>
> Verified: `npm run lint` and `npm run format -- --check` both pass with zero issues, and `npm run build` still
> produces the same bundle shape with no new type errors — confirming the stricter regex flags, `instanceof` narrowing,
> and `decode()`-based image loading didn't change behavior.

**Theory question:** What different problems do a linter, a formatter, and the TypeScript compiler detect? Give one
concrete example for each from this project.

> **Answer:**
>
> A **formatter** (Prettier) only cares about _appearance_ — whitespace, quote style, line-wrapping, trailing commas —
> and rewrites code to a single consistent style without ever asking whether the code is correct. Example: Prettier
> reformatted `search.ts`'s `addEventListener` call from a wide single line into a multi-line call once it exceeded 80
> characters; the code's behavior was identical before and after.
>
> A **linter** (ESLint) checks for _patterns_ that are syntactically valid and often behaviorally correct today, but are
> risky, unclear, or against a team's conventions — things a compiler has no opinion on because they don't affect
> whether the types check out. Example: `@typescript-eslint/strict-boolean-expressions` flagged `if (!parent)` in
> `search.ts`, where `parent: (Node & ParentNode) | null` — the code would have run fine, but a nullable value used as a
> plain boolean silently treats `null` and other falsy-but-different values the same way, which is exactly the kind of
> implicit-coercion bug this project's Task 2 comment-toggle regression grew from.
>
> The **TypeScript compiler** checks something neither tool does: whether the _types_ of values are consistent with how
> they're used, independent of formatting or style. Example: `tsc` is what makes
> `node.replaceWith.apply(node, span.childNodes)` (from Task 2's migration) a compile error — `NodeListOf<ChildNode>`
> doesn't structurally satisfy the array type `Function.prototype.apply` expects for `replaceWith`'s parameters — even
> though ESLint has no rule about `.apply()` and Prettier has no opinion on it at all. Only the compiler reasons about
> the actual shape of the values flowing through the code.
>
> Concretely in this project: Prettier decides how a line of code _looks_, ESLint decides whether a _pattern_ in
> otherwise-valid code is a latent risk, and `tsc` decides whether the code is _type-consistent_ in the first place —
> three independent, non-overlapping checks, which is why all three run in `npm run build` (`tsc && vite build`) and
> `npm run lint`/`npm run format` rather than any one of them replacing the others.

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

> **What was set up:** the `dev`, `build`, and `lint` scripts already existed from Tasks 1–3 (`vite`,
> `tsc && vite build`, `eslint src`); this task added the two missing ones and widened the lint scope slightly:
>
> - `lint:fix`: `eslint src --fix`
> - `format`: `prettier --write src` (already existed from Task 3)
> - `format:check`: `prettier --check src`
> - Widened `eslint.config.js`'s `files` pattern from `src/**/*.ts` to `['src/**/*.ts', 'src/**/*.js']`, matching the
>   assignment's "all `.js` and `.ts` files" wording exactly (there are currently no `.js` files under `src/`, so this
>   has no effect today, but it means one wouldn't silently go unlinted if added later).
>
> Verified all three failure-exit requirements directly rather than assuming it: added a scratch file to `src/` with an
> unused variable, a formatting violation, and a type error, confirmed `npm run lint`, `npm run format:check`, and
> `npm run build` each exited non-zero (`1`, `1`, `2` respectively), then deleted the scratch file and re-confirmed all
> three pass cleanly again on the real source. `build`'s and `lint`'s non-zero-on-failure behavior come for free from
> `tsc`/`vite`/`eslint` themselves; `format:check` needed the dedicated `--check` flag specifically because plain
> `prettier --write` (the `format` script) always exits `0` — it fixes issues rather than failing on them, which is why
> a CI gate needs the separate, non-mutating `--check` variant.

**Theory question:** Why are stable, composable commands such as these useful as an interface for developers and CI?
Explain idempotence and identify which of your scripts should be idempotent.

> **Answer:**
>
> A fixed set of command _names_ — `dev`, `build`, `lint`, `lint:fix`, `format`, `format:check` — is a stable interface
> in front of tools that can change underneath it: today `build` means `tsc && vite build`, but if this project ever
> swapped Vite for Webpack, or added a second linter, nobody invoking `npm run build` in a teammate's terminal or in a
> CI YAML file would need to change anything, because the interface didn't change, only its implementation. That's what
> "composable" adds on top: since every script is a small, single-purpose unit with a predictable exit code, a CI
> pipeline (or a pre-commit hook) can chain them — `npm run lint && npm run format:check && npm run build` — and reason
> about failure at the level of "which stage failed" without knowing anything about ESLint's or Prettier's internals.
>
> **Idempotence** means applying an operation more than once has the same effect as applying it once — `f(f(x)) = f(x)`.
> It's a spectrum here, not a single yes/no:
>
> - `lint` and `format:check` are idempotent in the strongest sense: they're read-only, so running either any number of
>   times against unchanged source always produces the same verdict and never alters anything themselves.
> - `build` is idempotent in the sense that matters for CI and deployment: given the same source and dependencies,
>   running it again produces the same output, because Vite/Rollup content-hashes every output filename
>   (`index-DcPurWg7.js`, from the hash of that file's contents) — so an unchanged input always regenerates the exact
>   same `dist/`, which is what makes build caching and reproducible deploys possible at all.
> - `lint:fix` and `format` are the interesting case: they _do_ mutate files, so they're not side-effect-free — but
>   they're still idempotent in the classical sense, because once the code is fixed/formatted, running the command again
>   is a no-op (there's nothing left to change, so nothing changes). This convergence is exactly what makes them safe to
>   wire into an editor's "format on save" or a pre-commit hook: they can run on every save or every commit without ever
>   fighting themselves or producing an ever-growing diff.
>
> `dev` doesn't fit this framing at all — it's a long-running dev server, not an operation that transforms a fixed input
> into an output, so "idempotent" isn't really a meaningful question to ask of it.

#### Task 5: Enforce quality before integration

Configure a pre-commit hook that checks staged code using [husky](https://typicode.github.io/husky/) and
[lint-staged](https://github.com/lint-staged/lint-staged). Configure a continuous-integration workflow that installs
dependencies from the lockfile and runs the non-mutating build, type, lint, and formatting checks for every push or pull
request.

> **What was set up — CI (`.github/workflows/ci.yml`):**
>
> - Triggers on every `push` and `pull_request`, matching the assignment's wording exactly (no branch filter).
> - `npm ci` (not `npm install`) installs dependencies strictly from `package-lock.json`, per the assignment's
>   requirement and the reasoning from Task 1's theory answer: reproducible builds need the exact resolved dependency
>   tree, not whatever a fresh `npm install` might re-resolve.
> - Four separate, non-mutating steps: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build` —
>   deliberately the `:check`/read-only scripts from Task 4, never `lint:fix`/`format`, for the reason covered in the
>   theory answer below.
> - Verified by running the exact same four commands locally in sequence against a clean `npm ci` install — all pass —
>   and separately confirmed (via a scratch file, then deleted) that `lint`, `format:check`, and `build` each exit
>   non-zero on a real violation, so a genuinely broken commit would fail this pipeline.
>
> **What was set up — pre-commit hook (husky + lint-staged):**
>
> - Installed `husky` and `lint-staged`; `npx husky init` scaffolded `.husky/pre-commit` (its default `npm test` content
>   was replaced with `npx lint-staged`) and added a `"prepare": "husky"` script to `package.json`. That `prepare`
>   script is what matters for anyone else who clones this repo: `git`'s hook path (`core.hooksPath`) is _local_ machine
>   configuration, never committed, so the hook has to reinstall itself automatically whenever someone runs
>   `npm install` — nobody needs to remember a separate manual setup step.
> - `lint-staged` config (in `package.json`): `"src/**/*.{js,ts}": ["eslint --fix", "prettier --write"]` — the same
>   src-only, `.js`/`.ts`-only scope as the `lint`/`format` scripts from Task 4, just applied to the staged subset
>   instead of the whole tree, and allowed to auto-fix (unlike CI) since a human reviews the result before committing.
> - Added `.husky/_` to `.gitignore`: that subdirectory holds husky's auto-generated shim scripts, recreated by
>   `npm install`'s `prepare` step, so it doesn't belong in version control.
> - **Deliberately left type-checking out of the pre-commit hook.** `tsc` reasons about the whole project's type graph
>   at once — there's no meaningful way to "type-check only the staged files" the way `eslint --fix`/`prettier --write`
>   can operate file-by-file, since a change to one file's types can break another file that wasn't even touched. That
>   check stays exclusively in CI, where it always runs against the complete, real state of the branch.
> - **Verified by running `npx lint-staged` directly** — exactly what `.husky/pre-commit` invokes — against the staged
>   `src/*.ts` files: it found all 6, ran `eslint --fix` then `prettier --write`, and re-staged the results (everything
>   was already clean, so nothing actually changed). Also confirmed `git config core.hooksPath` resolves to `.husky/_`,
>   proving the hook is wired up locally, not just present as a file.
>
> **To confirm the hook actually rejects a bad commit** rather than just taking that on faith, revert one of the
> non-auto-fixable findings from Task 3 — for example, change `search.ts`'s `if (parent === null) return;` back to
> `if (!parent) return;` — stage it, and run `git commit`. `eslint --fix` cannot silently repair a
> `@typescript-eslint/strict-boolean-expressions` violation (deciding the _correct_ null check is a human judgment call,
> not a mechanical rewrite), so `lint-staged` will fail and husky will abort the commit before it's created. A
> magic-number or `no-console` violation would behave the same way; anything Prettier-only (spacing, quotes) would
> instead get silently fixed and staged, which is the intended, non-blocking case.

**Theory question:** Compare a local pre-commit hook with a CI quality gate. Why is CI still necessary when hooks are
configured, and why should CI use non-mutating checks rather than automatically rewriting source files?

> **Answer:**
>
> A pre-commit hook runs on _one developer's machine_, against only the files _they staged_, using whatever tool
> versions happen to be installed locally — and it's optional in a way CI isn't: it can be skipped outright
> (`git commit --no-verify`), it was never installed if someone forgets to run `npm install` after cloning, and
> `core.hooksPath` is local git configuration that was never part of the repository to begin with (only the
> `.husky/pre-commit` file and the `prepare` script that reinstalls it are committed). A CI quality gate runs on a
> clean, neutral machine for _every_ push and pull request, against the _complete_ state of the branch rather than a
> staged subset, installing dependencies from the exact resolved lockfile via `npm ci`. That's why CI is still necessary
> even with the hook configured: the hook is a fast, convenient, and skippable first line of defense; CI is the one
> check that cannot be bypassed, forgotten, or drift out of sync with what the repository actually declares.
>
> The hook is allowed to mutate files (`eslint --fix`, `prettier --write`) because a human is sitting right there to
> review the diff before committing it. CI must not do the equivalent, for two reasons this project's own scripts make
> concrete. First, a CI job that "fixed" code and pushed the result back would need write access to the branch and would
> create commits nobody authored or reviewed — the opposite of what a quality gate is for. Second, and more
> fundamentally: CI's job is to answer _"does this branch already meet the bar?"_, not _"can I make it meet the bar?"_.
> That's exactly why `format:check` exists as a separate script from `format`, and why CI runs `lint`/`format:check`
> instead of `lint:fix`/`format` — a mutating check would silently paper over the fact that a contributor's local hook
> either didn't run or was skipped, and a genuinely non-compliant commit would still end up merged. The non-mutating
> version is what actually verifies the work was done, rather than doing it on the gate's behalf.

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
