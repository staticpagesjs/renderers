# Static Pages / Twig

Renders documents via twig templates. This package is part of the [Static Pages](https://staticpagesjs.github.io/) project.

Uses [Twing](https://www.npmjs.com/package/twing) and [Marked](https://www.npmjs.com/package/marked) packages under the hood.

## Usage

```js
import twig from '@static-pages/twig';

const renderer = twig({
	viewsDir: 'myViews',
});

const pageData = {
	title: 'Page header',
	url: 'some/page',
	content: 'My Content',
	view: 'content'
};

renderer(pageData); // returns the rendered page in a promise
```

## Options

| Option | Type | Default value | Description |
|--------|------|---------------|-------------|
| `view` | `string \| (d: Data) => string` | `(data.view ?? 'main') + '.twig'` | Template to render. If it's a function it gets evaluated on each render call. |
| `views` | `Record<string, string>` | `undefined` | Templates stored in memory, accessed without a filesystem implementation. |
| `viewsDir` | `string \| string[]` | `undefined` | One or more directory path where the templates are found. |
| `fs` | NodeJS FS API | `node:fs` module | Using the `viewDir` impiles you are using a filesystem. Here you can provide a custom implementation for that. |
| `filters` | `TwigFilters` | `{}` | Filters in an object that gets loaded to the twig environment. |
| `functions` | `TwigFunctions` | `{}` | Functions in an object that gets loaded to the twig environment. |
| `configure` | `(env: TwingEnvironment) => void` | `() => undefined` | Allows advanced configuration with access to the `env` twig environment. |
| `markedEnabled` | `boolean` | `true` | Register a markdown filter; uses [marked](https://marked.js.org/). |
| `markedOptions` | `MarkedOptions` | *see markedOptions section* | Custom options for the marked markdown renderer. |

Custom types used in the table above:
```ts
type TwigFunctions = Record<string, TwingCallable<unknown>>;
type TwigFilters = Record<string, TwingCallable<unknown>>;
```

Example for `TwigFunctions` and `TwigFilters`:
```ts
import { twig, raw } from '@static-pages/twig';

const renderer = twig({
	functions: {
		asset(_context, asset: string) {
			return new URL(asset, '/site/assets/').toString();
		},
	},
	filters: {
		json(_context, data) {
			return raw(JSON.stringify(data, null, '\t'));
		},
	}
});
```

> Functions and filters can be async or sync. No restrictions like the underlying Twing package makes where you allowed to use async functions only.

> Everything provided by Twing and Marked is also exported from this package for advanced use cases, see `twing` and `marked` exports.

### `markedOptions` defaults
This package uses the default options of the [official marked defaults](https://marked.js.org/using_advanced#options):

In `twig` template files, the custom `markdown` filter allows you to pass markdown options to the underlying markdown renderer. Example:

```twig
{{ '~~strike~~'|markdown({ gfm: false }) }}
```
```html
<p>~~strike~~</p>
```

> `~~strike~~` converted to `<del>strike</del>` when `gfm` is true (default)

Additionally there is an `inline` option added to the available options. This removes the paragraph tags. Example:

```twig
{{ '[foo](bar)'|markdown({ inline: true }) }}
```
```html
<a href="bar">foo</a>
```
