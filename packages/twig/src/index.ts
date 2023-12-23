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
import type { MarkedOptions } from 'marked';
import { marked } from 'marked';
import { join } from 'node:path';
import * as nodefs from 'node:fs';

export * as twing from 'twing';
export { marked };
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
		configure?: { (env: TwingEnvironment): void };
		markedEnabled?: boolean;
		markedOptions?: MarkedOptions;
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
	configure,
	markedEnabled = true,
	markedOptions = {}
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

	const loader = viewsDir
		? createChainLoader([
			createArrayLoader(views),
			createFilesystemLoader(cwdfs(fs, viewsDir)),
		])
		: createArrayLoader(views);

	// Create Twig env
	const env = createEnvironment(loader, { autoEscapingStrategy: 'html' });

	// Provide a built-in markdown filter
	if (markedEnabled) {
		env.addFilter(createFilter('markdown',
			async (_context, text, options) => {
				if (text == undefined) text = '';
				else if (typeof text !== 'string') text = '' + text;

				if (options) {
					const { inline, ...rest } = Object.fromEntries(options.entries());
					return createMarkup(
						await (inline ? marked.parseInline : marked)(text, { ...markedOptions, ...rest })
					);
				}
				return createMarkup(await marked(text, markedOptions));
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
        }
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

export default twig;
