# Web Engineering Coding Playground Template

This repository is designed as the foundation for coding playgrounds in the Web Engineering course. It offers a structured space for experimenting with and mastering various web development technologies and practices. 
The project is based on [this](https://developer.mozilla.org/en-US/docs/Learn/Accessibility/Accessibility_troubleshooting) repository from MDN.

The project introduces a lot of code smells for you to tackle. 
**Let's get coding!**

## Submission Details and Deadlines
* Coding playgrounds are **individual** work
* Use this base template to create your project repository.
* Submit your repository link once.
* Each playground must be submitted via a new branch in that repository (last commit within deadline will be graded).
  * Naming conventions of branch: <code>playground-1</code>, <code>playground-2</code>, ...
* Each playground consists of 5 tasks, 1 point each. A task is complete only when both its implementation work and its theory question have been answered.

### Submission Deadlines
* [1st Playground](#1-js-playground): 14.09.2026
* [2nd Playground](#2-dependency--and-build-management-playground): 28.09.2026
* [3rd Playground](#3-migrate-to-a-frontend-framework): 04.10.2026
* other Playgrounds TBA by Thomas Berger

## Features

- Wonderful UI-design :heart_eyes:
- Loads bear data using [Wikipedia API](https://www.mediawiki.org/wiki/API:Main_page) :bear:
  - Original Wikipedia Page can be found [here](https://en.wikipedia.org/wiki/List_of_ursids)
- Worst JS coding practices :cold_sweat:
- No Build and Dependency Management at all :fire:


# Coding Playground Description

## 1. JS Playground
The provided base project template contains bad coding and templating practices and bugs for you to fix. Take a look into the component files and get a grasp of the inner workings of the provided project. The app should provide the requirements described below. Some are implemented poorly or do not work at all. 

### App Requirements
* On page load the app requests the Wikipedia API to extract bear information from Wikipedia's [list of ursids](https://en.wikipedia.org/wiki/List_of_ursids). The page then renders the provided image, the common name, the scientific name and it's range.
  * the bears should be ordered in the same order and number (no duplicates) as in the corresponding Wiki page.
  * if there is no image available, the app should show a placeholder image.
* Users are able to toggle the comment section.
* Users are able to leave their name and a comment (both should not be empty).
* Users are able to search the web page contents using a search query, whereby only the html contents with tag <code>article</code> should be highlighted.

### Tasks
Fix the application code and support them with short code examples where useful.

#### Task 1: Introduce ES modules

Split the code into separate script files and use ES modules (`import`/`export`). Choose module boundaries that separate concerns and avoid circular dependencies.

**Theory question:** How does an ES module differ from a classic script with respect to scope, strict mode, loading, and bindings? Explain why the module boundaries you chose make the application easier to maintain.

> **Answer:**
>
> * **Scope:** A classic `<script>` runs in the global scope — top-level `var`/`function` declarations become properties of `window`, so scripts can silently clash over names. A module has its own top-level scope; nothing declared at the top level of `search.js` or `bears.js` leaks into another file or onto `window`. The only way to share something is an explicit `export`, and the only way to consume it is an explicit `import`.
> * **Strict mode:** Modules are automatically parsed in strict mode, without a `'use strict'` pragma. This forbids implicit globals (assigning to an undeclared variable throws), disallows duplicate parameter names, and generally rules out several classic-script foot-guns.
> * **Loading:** Classic scripts are fetched and executed synchronously in document order, blocking HTML parsing unless `async`/`defer` is used. `<script type="module">` is deferred by default, is fetched with CORS, and its dependency graph (everything reachable via `import`) is downloaded and executed only after that whole graph is resolved and in dependency order — imports first, then the importing module. This is also why modules must be served over `http(s)://`; the browser refuses to resolve module specifiers over `file://`, which is why the app needed a local static server (`python -m http.server`) to test.
> * **Bindings:** A classic script that "shares" a value across files does so by copying it onto a global object — later scripts read whatever value happened to be there at that time. An `import` is a live, read-only binding to the exporting module's variable: if the exporting module later reassigns the exported variable, every importer sees the new value automatically, without any copy or global lookup. Module instances are also singletons — a module is fetched, parsed, and evaluated once no matter how many other modules import it, so state defined in it (e.g. the `baseUrl` in `wikiApi.js`) is naturally shared rather than duplicated.
>
> **Why these module boundaries:** The original inline script mixed three unrelated responsibilities (search highlighting, comment UI, and Wikipedia data fetching/rendering) in one 160-line block sharing one implicit global scope. The refactor splits it along what each piece actually depends on:
>
> * `search.js` and `comments.js` are self-contained UI features with no dependencies on anything else — each can be read, tested, or replaced without touching the others.
> * `wikiApi.js` contains only network calls (`fetch` + URL building) and has zero DOM knowledge, so it can be reused or unit-tested independently of rendering.
> * `bears.js` imports from `wikiApi.js` (parsing/rendering depends on fetching data) but nothing imports back into `wikiApi.js`, so the dependency graph is a simple one-directional chain with no cycles.
> * `main.js` is the only file that knows about all the features; it just imports and calls each `init*` function. Adding, removing, or reordering a feature means editing one line in `main.js` instead of hunting through a monolithic script, and a bug in one feature (e.g. the comment form) can't accidentally corrupt state used by another (e.g. the bear renderer) because they no longer share scope.

#### Task 2: Correct the application behavior

Fix the semantic and functional issues according to the app requirements. Use appropriate DOM queries and event handling, and ensure the bear list has the same order and number of entries as the source page.

> **What was fixed:**
>
> * **Bear list order/duplicates (`js/bears.js`)** — bears were pushed into a shared array as async image fetches resolved (order depended on network timing), and the "done yet?" check compared a global count to a per-table count, causing re-renders/duplicates. Fixed by extracting entries in wikitext order first, then fetching images with `Promise.all` (order-preserving) and rendering once.
> * **Comment name/text never captured (`js/comments.js`)** — `.valeu`/`textContnet` typos. Fixed to `.value`/`.textContent`.
> * **Empty comments allowed** — added `required` to the name/comment inputs and a trimmed-value guard in the submit handler.
> * **Search highlighted the whole page (`js/search.js`)** — `walk()` ran on `document.body` instead of `<article>`, leaking highlights into the nav/sidebar. Scoped it to `document.querySelector('article')`.

**Theory question:** Describe event propagation (capturing, target, and bubbling). Where could event delegation be useful in this application, and what trade-off would it introduce?

> **Answer:**
>
> When an event fires, the DOM dispatches it in three phases. First is the **capturing** phase: the event starts at `window`/`document` and travels down through each ancestor of the actual element, from the outside in. Once it reaches the element the event actually happened on, that's the **target** phase. Then the event **bubbles**: it travels back up through the same chain of ancestors, from the target outward to `document`/`window`. `addEventListener` listens on the bubbling phase by default; passing `{ capture: true }` attaches the listener to the capturing phase instead. `stopPropagation()` halts this traversal in whichever direction it's currently going, and a handler can inspect `event.target` (the element the event actually fired on) versus `event.currentTarget` (the element the listener is attached to) to tell the two apart.
>
> **Where delegation would help here:** The `.more_bears` list (`js/bears.js`) and the `.comment-container` list (`js/comments.js`) both grow at runtime, after the page has already loaded — bear cards are added once the Wikipedia fetch resolves, and comments are added on every form submission. Any listener meant to react to clicks *inside* those cards (e.g. a "read more about this bear" link per card, or a future "delete comment" button) can't be attached per-element as each one is created without re-running that wiring every time the list changes. Delegation solves this cleanly: attach one listener to the stable parent (`.more_bears` or `.comment-container`) that already exists at page load, and rely on bubbling — a click on any current *or future* child bubbles up to that one listener, which then reads `event.target.closest(...)` to figure out which specific card or comment was clicked.
>
> **Trade-off:** delegation trades a direct, self-describing handler for a layer of indirection — the listener no longer knows which element triggered it, so it has to inspect `event.target` and walk up with `.closest()` to find the actual element of interest, and to explicitly filter out clicks that landed on the container itself or on unrelated descendants (e.g. an `<img>` versus the containing `.bear` div). It also only works for events that actually bubble (`click`, `submit`, `input` do; `focus`/`blur` don't, though their `focusin`/`focusout` counterparts do), and it breaks if an inner handler calls `stopPropagation()` before the event reaches the delegated listener. For the search form, the show/hide button, and the comment form in this app — each a single, static element already known at load time — that indirection would be pure overhead with no benefit, which is why they keep direct listeners instead.

#### Task 3: Make failures explicit

Add error handling with `try`/`catch` and show useful, user-facing error messages. Check whether each image can be loaded and render a placeholder when it cannot. Do not represent a failed request as valid empty data.

**Theory question:** How do synchronous exceptions and rejected promises travel through this application? Explain where errors should be caught and why catching every error at its source can make failures harder to diagnose.

#### Task 4: Refactor asynchronous control flow

Replace promise callback chains with `async`/`await` and refactor suitable callbacks to arrow functions. Run independent asynchronous operations concurrently where doing so is safe.

**Theory question:** Explain the relationship between `async`/`await`, promises, the microtask queue, and the browser event loop. Also explain why an arrow function is not always an interchangeable replacement for a regular function, particularly regarding `this`.

#### Task 5: Remove remaining code smells

Find and eliminate the remaining bad coding practices. Consider scope, accidental globals, mutation and shared references, function responsibilities, naming, duplication, and DOM update patterns. Document each relevant finding, why it is problematic, and how you fixed it below.

**Theory question:** Select one of your refactorings and explain how JavaScript scope, closures, references, or prototypes caused the original risk. State how you verified that your refactoring preserved behavior.

> **What bad coding practices did you find? Why is it a bad practice and how did you fix it?**
> 
> _Present your findings here..._
>
> ```js
> console.log('Make use of markdown codesnippets to show and explain good/bad practices!')
> ```


## 2. Dependency- and Build Management Playground
Build the application with ``npm`` and a build and a dependency management tool of your choice (e.g. [Vite](https://vitejs.dev/), [Webpack](https://webpack.js.org/), or others). 

### Tasks

#### Task 1: Establish the build

Set up the project with `npm` and a build tool of your choice (for example, Vite or Webpack). Keep source files separate from generated distribution files and commit the package-manager lockfile.

**Theory question:** Distinguish source, build, distribution, and deployment. What does your build tool do in development and in a production build, and why is the lockfile important for reproducibility?

#### Task 2: Migrate to TypeScript

Use TypeScript as the primary development language and adapt the source files and configuration accordingly. Enable strict checking, model the application's domain data, and validate data received from external APIs before treating it as a typed value.

**Theory question:** TypeScript uses structural typing and erases types during compilation. Explain both concepts and why a compile-time type alone cannot guarantee the shape of a Wikipedia API response at runtime.

#### Task 3: Add static analysis and formatting

Configure ESLint and Prettier using the rulesets below. Resolve all reported errors in the application code and avoid disabling rules without a written justification.

**Theory question:** What different problems do a linter, a formatter, and the TypeScript compiler detect? Give one concrete example for each from this project.

#### Task 4: Provide a consistent command interface

Define the following tasks within `npm scripts`:

  * `dev`: starts the development server.
  * `build`: runs the typescript compiler and bundles your application - bundling depends on your chosen build tool (e.g. Vite, Webpack) but typically bundles multiple files into one, applies optimizations like minification and obfuscation and outputs final results to a `dist` or `build` directory.
  * `lint`: runs ESLint on all  `.js` and `.ts` files in your projects `/src` directory.
  * `lint:fix`: runs and also fixes all issues found by ESLint.
  * `format`: formats all `.js` and `.ts` files in your projects `/src` directory.
  * `format:check`: checks if the files in the `/src` directory are formatted according to Prettier's rules.

The `build`, `lint`, and `format:check` commands must exit with a non-zero status when their checks fail.

**Theory question:** Why are stable, composable commands such as these useful as an interface for developers and CI? Explain idempotence and identify which of your scripts should be idempotent.

#### Task 5: Enforce quality before integration

Configure a pre-commit hook that checks staged code using [husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/lint-staged/lint-staged). Configure a continuous-integration workflow that installs dependencies from the lockfile and runs the non-mutating build, type, lint, and formatting checks for every push or pull request.

**Theory question:** Compare a local pre-commit hook with a CI quality gate. Why is CI still necessary when hooks are configured, and why should CI use non-mutating checks rather than automatically rewriting source files?


**ESLint Configurations**

Use ESLint configs [standard-with-typescript](https://www.npmjs.com/package/eslint-config-standard-with-typescript) and [TypeScript ESLint Plugin](https://www.npmjs.com/package/@typescript-eslint/eslint-plugin).
Your `.eslintrc` file should have the following extensions:
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
``` .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "printWidth": 80
}
```

## 3. Migrate to a Frontend Framework
In this playground you will migrate your application to React with TypeScript while retaining the build and quality pipeline from Playground 2.

### Tasks

#### Task 1: Establish the React application

Add React (or another framework of your choice) to the existing Vite and TypeScript project and migrate the page entry point to a React root. Preserve the build, linting, formatting, and CI setup from Playground 2, adapting scripts and configuration where necessary.

**Theory question:** Contrast imperative DOM updates with React's declarative model. What happens during React's render, reconciliation, and commit phases, and why should code outside React not modify DOM nodes owned by the React root? If you chose not to use React, answer the same questions in the context of your chosen framework.

#### Task 2: Design the component tree

Decompose the interface into components organised by feature. Use props where appropriate, keep rendering pure, and render bear collections with stable keys.

**Theory question:** Explain how component boundaries and typed props act as contracts. What makes a key stable, why does React need keys during reconciliation, and why is an array index unsuitable when list entries can change order?

#### Task 3: Model state and interaction

Implement the comment toggle, comment form, and search behavior with React events and state. Use controlled inputs, immutable updates, and derived values rather than duplicate state. Lift state only to the closest common owner that needs it.

**Theory question:** Distinguish props, stored state, and derived values. Explain why direct mutation can produce incorrect React behavior and when lifting state is preferable to introducing context.

#### Task 4: Load and represent remote data

Load and validate the bear data within the React application. Represent loading, success, empty, and error states explicitly; prevent stale requests from overwriting newer results; and retain the image fallback behavior from Playground 1.

**Theory question:** Why is fetching data a synchronization with an external system rather than part of pure rendering? Explain how cleanup or cancellation prevents race conditions when a component unmounts or a request becomes irrelevant.

#### Task 5: Add client-side routing and verify the migration

Add at least a list route and a bear-detail route using a stable bear identifier as a route parameter. Use query parameters for optional search/filter view state where appropriate. Verify that every requirement from Playground 1 still works and that all Playground 2 quality commands pass.

**Theory question:** Distinguish client-side rendering, a single-page application, and client-side routing. Compare route parameters with query parameters, and describe one benefit and one cost of the SPA architecture used here.

---

## In-Class Accessibility Workshop
You might have noticed that the base project has a number of accessibility issues - your task is to explore the existing site and fix them. Use the tools presented in our accessibility workshop to test the accessibility of your app and write a summary of your reports below.

### Tasks
* Accessibility Checks:
  * **Color**: Test the current color contrast (text/background), report the results of the test, and then fix them by changing the assigned colors.
  * **Semantic HTML**: Report on what happens when you try to navigate the page using a screen reader. Fix those navigation issues.
  * **Audio**: The ``<audio>`` player isn't accessible to hearing impaired people — can you add some kind of accessible alternative for these users?
  * **Forms**:
    * The ``<input>`` element in the search form at the top could do with a label, but we don't want to add a visible text label that would potentially spoil the design and isn't really needed by sighted users. Fix this issue by adding a label that is only accessible to screen readers.
    * The two ``<input>`` elements in the comment form have visible text labels, but they are not unambiguously associated with their labels — how do you achieve this? Note that you'll need to update some of the CSS rule as well.
  * **Comment Section**: The show/hide comment control button is not currently keyboard-accessible. Can you make it keyboard accessible, both in terms of focusing it using the tab key, and activating it using the return key?
  * **The table**: The data table is not currently very accessible — it is hard for screen reader users to associate data rows and columns together, and the table also has no kind of summary to make it clear what it shows. Can you add some features to your HTML to fix this problem?


>
> _Note your findings here..._
>

<p>© 2026 Leon Freudenthaler (Hochschule Campus Wien). All rights reversed.</p>
