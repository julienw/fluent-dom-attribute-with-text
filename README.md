# fluent-dom attribute with text

Testcase for fluent-dom's behavior when a `title` HTML attribute is set via an
overlay and the variable value contains newlines (e.g. a stringified JSON).

## Setup

```sh
npm install
```

## Run

```sh
npm start
```

Then open http://localhost:8765 in your browser.

## What it demonstrates

The FTL message uses an HTML overlay to set the `title` attribute:

```ftl
box = <span title="{ $data }">Hover me</span>
```

The `$data` variable is a pretty-printed JSON string containing newlines and
double quotes. When fluent-dom substitutes the variable and parses the result
as HTML, the double quotes inside the JSON break the attribute value parsing.
The `title` ends up truncated at the first `"` character.

Contrast this with the FTL attribute syntax, which does not go through HTML
parsing and handles arbitrary string values correctly:

```ftl
box =
    .title = { $data }
```
