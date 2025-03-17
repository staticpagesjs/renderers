import type { TwingEnvironment, TwingFilesystemLoaderFilesystem, TwingCallable } from 'twing';
import {
	createEnvironment,
	createArrayLoader,
	createFilesystemLoader,
	createChainLoader,
	createFunction,
	createFilter,
	createMarkup,
} from 'twing';
import type { MarkedOptions, MarkedExtension } from 'marked';
import { Marked } from 'marked';
import { join } from 'node:path';
import * as nodefs from 'node:fs';

export * as twing from 'twing';
export * as marked from 'marked';
export { createMarkup as raw };

export type MaybePromise<T> = T | Promise<T>;

export namespace twig {
	export type Options = {
		fs?: TwingFilesystemLoaderFilesystem;
		view?: string | { (data: Record<string, unknown>): string };
		views?: Record<string, string>;
		viewsDir?: string | string[];
		functions?: Record<string, TwingCallable<unknown[]>>;
		filters?: Record<string, TwingCallable<unknown[]>>;
		globals?: Record<string, unknown>;
		configure?: { (env: TwingEnvironment): void };
		markedEnabled?: boolean;
		markedOptions?: MarkedOptions;
		markedExtensions?: MarkedExtension[];
	};
}

type AsyncFunctionType = { (...args: unknown[]): Promise<unknown>; };

const isAsyncFunction = (fn: unknown): fn is AsyncFunctionType =>
	fn?.constructor?.name === 'AsyncFunction';

const ensureAsyncFunction = (fn: { (...args: any[]): any }): { (...args: any[]): Promise<any> } =>
	isAsyncFunction(fn)
		? fn
		: (...args: any[]) => Promise.resolve(fn(...args));

const defaultView: twig.Options['view'] = ({ view }) => (view ?? 'main') + '.twig';

export const twig = ({
	view = defaultView,
	views = {},
	viewsDir,
	fs = nodefs,
	functions = {},
	filters = {},
	globals,
	configure,
	markedEnabled = true,
	markedOptions = {},
	markedExtensions = [],
}: twig.Options = {}) => {
	if (typeof view !== 'string' && typeof view !== 'function')
		throw new TypeError(`Expected 'Iterable' or 'AsyncIterable' at 'view' property.`);

	if (typeof viewsDir !== 'undefined' && typeof viewsDir !== 'string' && !(Array.isArray(viewsDir) && viewsDir.every(x => typeof x === 'string')))
		throw new TypeError(`Expected 'string' or 'string[]' at 'viewsDir' property.`);

	if (typeof functions !== 'object' || !functions)
		throw new TypeError(`Expected 'object' at 'functions' property.`);

	if (typeof filters !== 'object' || !filters)
		throw new TypeError(`Expected 'object' at 'filters' property.`);

	if (typeof configure !== 'undefined' && typeof configure !== 'function')
		throw new TypeError(`Expected 'function' at 'advanced' property.`);

	if (typeof markedOptions !== 'object' || !markedOptions)
		throw new TypeError(`Expected 'object' at 'markedOptions' property.`);

	let loader;
	if (viewsDir) {
		// HOTFIX: https://gitlab.com/nightlycommit/twing/-/issues/621
		const fsLoader = createFilesystemLoader(cwdfs(fs, viewsDir));
		// UNCOMMENT WHEN #621 IS FIXED:
		// const fsLoader = createFilesystemLoader(fs);
		// if (Array.isArray(viewsDir)) {
		// 	for (const dir of viewsDir) {
		// 		fsLoader.addPath(dir);
		// 	}
		// } else {
		// 	fsLoader.addPath(viewsDir);
		// }
		if (views) {
			loader = createChainLoader([createArrayLoader(views), fsLoader])
		} else {
			loader = fsLoader;
		}
	} else {
		loader = createArrayLoader(views ?? {});
	}

	// Create Twig env
	const env = createEnvironment(loader, {
		globals,
		autoEscapingStrategy: 'html',
	});

	// Provide a built-in markdown filter
	if (markedEnabled) {
		const marked = new Marked(...markedExtensions);
		env.addFilter(createFilter('markdown',
			async (_context, text, options) => {
				if (text == undefined) text = '';
				else if (typeof text !== 'string') text = '' + text;

				if (options) {
					const { inline, ...rest } = Object.fromEntries(options.entries());
					return createMarkup(
						(await (inline ? marked.parseInline : marked.parse)(text, { ...markedOptions, ...rest })).trim()
					);
				}
				return createMarkup((await marked.parse(text, markedOptions)).trim());
			},
			[{ name: 'options', defaultValue: null }]
		));
	}

	// Filters
	for (const [k, v] of Object.entries(filters)) {
		env.addFilter(createFilter(k, ensureAsyncFunction(v), [], { is_variadic: true }));
	}

	// Functions
	for (const [k, v] of Object.entries(functions)) {
		env.addFunction(createFunction(k, ensureAsyncFunction(v), [], { is_variadic: true }));
	}

	// Advanced configuration if nothing helps.
	configure?.(env);

	return (data: Record<string, unknown>) => env.render(typeof view === 'function' ? view(data) : view, data);
};

export default twig;

// HOTFIX: https://gitlab.com/nightlycommit/twing/-/issues/621
function cwdfs(fs: TwingFilesystemLoaderFilesystem, paths: string | string[]): TwingFilesystemLoaderFilesystem {
	if (!Array.isArray(paths)) paths = [paths];
	return {
		readFile: (filePath, callback: any) => {
			findPath(filePath, (err, fullPath) => {
				if (err) return callback(err);
				fs.readFile(fullPath!, callback);
			});
		},
		stat: (filePath, callback: any) => {
			findPath(filePath, (err, fullPath) => {
				if (err) return callback(err);
				fs.stat(fullPath!, callback);
			});
		},
	};

	function findPath(filePath: string, callback: (err: Error | null, path?: string) => void) {
		let checkedPaths = 0;
		for (let p of paths) {
			const fullPath = join(p, filePath);
			fs.stat(fullPath, (err, stats) => {
				if (!err && stats!.isFile()) {
					return callback(null, fullPath);
				}
				if (++checkedPaths === paths.length) {
					callback(new Error(`File not found: ${filePath}`));
				}
			});
		}
	}
}
