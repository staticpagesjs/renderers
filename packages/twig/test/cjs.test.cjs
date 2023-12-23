const assert = require('assert');
const { twig } = require('../cjs/index.js');

// If tests ran successfully on the ES module version we
// does not start the same tests on the CJS version.
// Things to tests here:
//   - exports of this module
//   - imports of the dependencies
describe('CommonJS Tests', () => {
	before(() => {
		// cwd should be in tests folder where we provide a proper folder structure.
		process.chdir(__dirname);
	});

	it('CJS version is importable and working', async () => {
		const renderer = twig({
			views: {
				'main.twig': '{{ content }} template',
			}
		});

		const rendered = await renderer({ content: 'foo' });

		const expected = 'foo template';

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
});
