# Contributing

## Fix the strongest layer first

When a correction comes in, put it where the next page cannot miss it.

1. Codebase structure: design tokens and shared markup. The homepage brand palette and fonts live as CSS custom properties at the top of the homepage stylesheet (`--navy`, `--slate`, `--slate-soft`, `--steel`, `--gold`, `--rust` for the call-to-action button only, and `--font-serif`, `--font-sans`, `--font-mono`).
2. An automated check, so the correction fails the build instead of coming back as a note.
3. A written note, only for what a check cannot see.

Keep new checks small and limited to what the homepage needs.

## Brand check

```bash
npm run check:brand
```

That runs `node scripts/check-brand.mjs` against `index.html`. To check another file, pass it:

```bash
node scripts/check-brand.mjs path/to/page.html
```

To cover another page on every run, add it to `DEFAULT_PAGES` at the top of `scripts/check-brand.mjs`.

The check fails when a page has:

- a green hex or hue, including `#22764F`, `#4FC28C`, and `#0F5136`
- more than two rust call-to-action buttons, a rust button that does not point at `https://cal.com/samgorla/quick-connect`, or rust used anywhere other than that button and its `--rust` / `--rust-deep` tokens
- a `cal.com/samgorla/consultation` link
- an `img` with a missing or empty `alt`
- the phrase Fortune 1500
- a name on `VENDOR_DENYLIST` (EasyCater and Google Sheets today; edit that list in the script)
- a dollar figure that is neither on `DOLLAR_ALLOWLIST` (each entry has a source note) nor inside an element marked as an example

Mark an example with `class="sample"`, `class="example"`, or `data-figure="sample"`. The class token has to be exact: `sample-list` does not count. Do not add a dollar amount to the allowlist without a source you can point at.

## Launch check

```bash
npm run check:launch
```

That runs the same brand check with `--launch`, and also fails while any element has a `data-publish-gate` attribute. Wrap content that can show on a preview but waits on someone's written approval in a gate, with a comment saying whose approval:

```html
<div data-publish-gate="cfa-john-velarde">…</div>
```

`npm run check:brand` lists gates but passes, so previews stay green. Before going live, run `npm run check:launch`; when the approval comes in, remove the wrapper (or remove the gated content and any links to it).

This repository does not have GitHub Actions yet. When CI is added, run `npm run check:brand` on pull requests. Do not add a workflow only for this check until the repo has a CI setup to put it in.
