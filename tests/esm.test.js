import * as path from 'path';
import { fileURLToPath } from 'url';
import { twigRenderer } from '../esm/index.js';

// cwd should be in tests folder where we provide a proper folder structure.
process.chdir(path.dirname(fileURLToPath(import.meta.url)));

test('can initialize a renderer with default parameters', async () => {
	const renderer = twigRenderer();

	expect(renderer).toBeDefined();
});

test('can render a simple template', async () => {
	const renderer = twigRenderer();

	const rendered = await renderer({ body: 'foo' });

	const expected = 'hello world!<p>foo</p>\n';

	expect(rendered).toBe(expected);
});

test('can set multiple views dir with initial view', async () => {
	const renderer = twigRenderer({
		view: 'userview.twig',
		viewsDir: [
			'views2/userViews1',
			'views2/userViews2'
		]
	});

	const rendered = await renderer({ body: 'foo' });

	const expected = '__*<p>foo</p>\n*__';

	expect(rendered).toBe(expected);
});

test('can use globals', async () => {
	const renderer = twigRenderer({
		view: 'globals.test.twig',
		globals: {
			globalValue: 'foo bar'
		}
	});

	const rendered = await renderer({ body: 'foo' });

	const expected = 'foo bar';

	expect(rendered).toBe(expected);
});

test('can set additional twig functions', async () => {
	const renderer = twigRenderer({
		view: 'functions.test.twig',
		functions: {
			myfn(x) { return x; },
		}
	});

	const rendered = await renderer({ body: 'foo bar' });

	const expected = 'foo bar';

	expect(rendered).toBe(expected);
});

test('can set additional twig functions with options', async () => {
	const renderer = twigRenderer({
		view: 'functions-opts.test.twig',
		functions: {
			myfn_safe: [
				x => x,
				{ is_safe: ['html'] }
			],
			myfn: x => x,
		}
	});

	const rendered = await renderer({ body: '<foo>' });

	const expected = '&lt;foo&gt;<foo>';

	expect(rendered).toBe(expected);
});

test('can set additional twig filters', async () => {
	const renderer = twigRenderer({
		view: 'filters.test.twig',
		filters: {
			myfn(x) { return x; },
		}
	});

	const rendered = await renderer({ body: 'foo bar' });

	const expected = 'foo bar';

	expect(rendered).toBe(expected);
});

test('can set additional twig filters with options', async () => {
	const renderer = twigRenderer({
		view: 'filters-opts.test.twig',
		filters: {
			myfn_safe: [
				x => x,
				{ is_safe: ['html'] }
			],
			myfn: x => x,
		}
	});

	const rendered = await renderer({ body: '<foo>' });

	const expected = '&lt;foo&gt;<foo>';

	expect(rendered).toBe(expected);
});

test('can configure with advanced configuration', async () => {
	const renderer = twigRenderer({
		advanced: env => env.addGlobal('globalValue', 'foo bar')
	});

	const rendered = await renderer({ body: 'foo' });

	const expected = 'hello world!<p>foo</p>\n';

	expect(rendered).toBe(expected);
});

test('can turn off custom markdown filter', async () => {
	const renderer = twigRenderer({
		markedEnabled: false
	});

	await expect(async () => {
		await renderer({ body: 'foo' });
	})
		.rejects
		.toThrow('Unknown "markdown" filter');
});

test('can configure marked filter', async () => {
	const renderer = twigRenderer({
		view: 'marked.twig',
		markedOptions: {
			baseUrl: 'http://example.com'
		}
	});

	const rendered = await renderer({ body: '# foo\n[foo](foo)' });

	const expected = '<h1 id="foo">foo</h1>\n<p><a href="http://example.com/foo">foo</a></p>\n';

	expect(rendered).toBe(expected);
});

test('marked can render inline', async () => {
	const renderer = twigRenderer({
		view: 'marked-inline.twig'
	});

	const rendered = await renderer({ body: '[foo](foo)' });

	const expected = '<a href="foo">foo</a>';

	expect(rendered).toBe(expected);
});
