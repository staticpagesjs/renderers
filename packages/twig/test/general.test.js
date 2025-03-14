import assert from 'assert';
import { twig, raw } from '../esm/index.js';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

describe('General Tests', () => {
	before(() => {
		// cwd should be in tests folder where we provide a proper folder structure.
		process.chdir(path.dirname(fileURLToPath(import.meta.url)));
	});

	it('can initialize a renderer with default parameters', async () => {
		assert.notEqual(twig(), undefined);
	});

	it('can render a template from memory storage', async () => {
		const renderer = twig({
			views: {
				'main.twig': '{{ content }} template',
			}
		});

		const rendered = await renderer({ content: 'foo' });

		const expected = 'foo template';

		assert.deepStrictEqual(rendered, expected);
	});

	it('can render a template from the filesystem', async () => {
		const renderer = twig({
			viewsDir: 'views1'
		});

		const rendered = await renderer({ content: 'foo' });

		const expected = 'hello world!\nfoo\n';

		assert.deepStrictEqual(rendered, expected);
	});

	it('can set multiple views dir', async () => {
		const renderer = twig({
			viewsDir: [
				'views2/dir1',
				'views2/dir2'
			]
		});

		const rendered = await renderer({ content: 'foo' });

		const expected = '__*foo*__';

		assert.deepStrictEqual(rendered, expected);
	});

	it('should throw when the template file is not found in the filesystem', async () => {
		await assert.rejects(async () => {
			const renderer = twig({
				view: 'not-existing.twig',
				viewsDir: [
					'views2/dir1',
					'views2/dir2'
				]
			});
			await renderer({ content: '# foo' });
		}, { message: `Unable to find template "not-existing.twig".` });
	});

	it('can set template name from the document', async () => {
		const renderer = twig({
			views: {
				'entrypoint.twig': '{{ content }}',
			}
		});

		const rendered = await renderer({ content: 'foo bar', view: 'entrypoint' });

		const expected = 'foo bar';

		assert.deepStrictEqual(rendered, expected);
	});

	it('can autoescapes html by default', async () => {
		const renderer = twig({
			views: {
				'main.twig': '{{ content }} template',
			}
		});

		const rendered = await renderer({ content: '<foo>' });

		const expected = '&lt;foo&gt; template';

		assert.deepStrictEqual(rendered, expected);
	});

	it('can render markdown', async () => {
		const renderer = twig({
			views: {
				'main.twig': '{{ content|markdown }}',
			}
		});

		const rendered = await renderer({ content: '# foo' });

		const expected = '<h1>foo</h1>\n';

		assert.deepStrictEqual(rendered, expected);
	});

	it('can add twig filters', async () => {
		const renderer = twig({
			views: {
				'main.twig': '{{ content|my_filter }}',
			},
			filters: {
				my_filter(_context, x) { return `__${x}__`; },
			}
		});

		const rendered = await renderer({ content: 'foo bar' });

		const expected = '__foo bar__';

		assert.deepStrictEqual(rendered, expected);
	});

	it('can add async twig filters', async () => {
		const renderer = twig({
			views: {
				'main.twig': '{{ content|my_filter }}',
			},
			filters: {
				async my_filter(_context, x) { return `__${x}__`; },
			}
		});

		const rendered = await renderer({ content: 'foo bar' });

		const expected = '__foo bar__';

		assert.deepStrictEqual(rendered, expected);
	});

	it('can add twig filters with unescaped output', async () => {
		const renderer = twig({
			views: {
				'main.twig': '{{ content|my_filter }}',
			},
			filters: {
				my_filter(_context, x) { return raw(`__${x}__`); },
			}
		});

		const rendered = await renderer({ content: '<foo>' });

		const expected = '__<foo>__';

		assert.deepStrictEqual(rendered, expected);
	});

	it('can add twig functions', async () => {
		const renderer = twig({
			views: {
				'main.twig': '{{ my_function(content) }}',
			},
			functions: {
				my_function(_context, x) { return `__${x}__`; },
			}
		});

		const rendered = await renderer({ content: 'foo bar' });

		const expected = '__foo bar__';

		assert.deepStrictEqual(rendered, expected);
	});

	it('can add async twig functions', async () => {
		const renderer = twig({
			views: {
				'main.twig': '{{ my_function(content) }}',
			},
			functions: {
				async my_function(_context, x) { return `__${x}__`; },
			}
		});

		const rendered = await renderer({ content: 'foo bar' });

		const expected = '__foo bar__';

		assert.deepStrictEqual(rendered, expected);
	});

	it('can add twig functions with unescaped output', async () => {
		const renderer = twig({
			views: {
				'main.twig': '{{ my_function(content) }}',
			},
			functions: {
				my_function(_context, x) { return raw(`__${x}__`); },
			}
		});

		const rendered = await renderer({ content: '<foo>' });

		const expected = '__<foo>__';

		assert.deepStrictEqual(rendered, expected);
	});

	it('uses given globals', async () => {
		const renderer = twig({
			globals: {
				content: 'abc',
				hello: 'world',
			},
			views: {
				'main.twig': '{{ content }} template {{ hello }}',
			}
		});

		const rendered = await renderer({ content: 'foo' });

		const expected = 'foo template world';

		assert.deepStrictEqual(rendered, expected);
	});

	it('can apply special configuration to twig env', async () => {
		const renderer = twig({
			views: {
				'main.twig': '{{ content|number_format }}',
			},
			configure(env) {
				env.numberFormat.decimalPoint = ',';
				env.numberFormat.thousandSeparator = ' ';
				env.numberFormat.numberOfDecimals = 2;
			}
		});

		const rendered = await renderer({ content: 123456.789 });

		const expected = '123 456,79';

		assert.deepStrictEqual(rendered, expected);
	});

	it('silently handles when markdown filter recieves non-text values', async () => {
		const renderer = twig({
			views: {
				'main.twig': 'a{{ content|markdown }}b{{ undefined_variable|markdown }}c',
			}
		});

		const rendered = await renderer({ content: {} });

		const expected = 'a<p>[object Object]</p>\nbc';

		assert.deepStrictEqual(rendered, expected);
	});

	it('can turn off custom markdown filter', async () => {
		await assert.rejects(async () => {
			const renderer = twig({
				markedEnabled: false,
				views: {
					'main.twig': '{{ content|markdown }}',
				},
			});
			await renderer({ content: '# foo' });
		}, { message: `Unknown filter "markdown" in "main.twig" at line 1, column 12.` });
	});

	it('can configure marked filter', async () => {
		const renderer = twig({
			views: {
				'main.twig': '{{ content|markdown }}',
			},
			markedOptions: {
				gfm: false,
			}
		});

		const rendered = await renderer({ content: '~~Hi~~ Hello, ~there~ world!' });

		const expected = '<p>~~Hi~~ Hello, ~there~ world!</p>\n';

		assert.deepStrictEqual(rendered, expected);
	});

	it('can configure marked filter from the template', async () => {
		const renderer = twig({
			views: {
				'main.twig': '{{ content|markdown({ gfm: false }) }}',
			},
		});

		const rendered = await renderer({ content: '~~Hi~~ Hello, ~there~ world!' });

		const expected = '<p>~~Hi~~ Hello, ~there~ world!</p>\n';

		assert.deepStrictEqual(rendered, expected);
	});
	it('can render markdown inline style', async () => {
		const renderer = twig({
			views: {
				'main.twig': '{{ content|markdown({ inline: true }) }}',
			},
		});

		const rendered = await renderer({ content: 'foo' });

		const expected = 'foo';

		assert.deepStrictEqual(rendered, expected);
	});
});
