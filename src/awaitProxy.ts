/**
 * A proxy to handle awaiting a core promise before executing methods.
 * Supports inheritance and composition.
 *
 * For inheritance, extend AwaitProxy and use `withAwaited` to wrap methods.
 *
 * For composition, create an instance of AwaitProxy and use `apply` to
 * wrap methods of the target instance.
 */
export class AwaitProxy<T> {
	private _awaited: T | undefined;
	constructor(
		private readonly _promise: Promise<T>,
		private readonly _bindTo: any = this,
	) {
		_promise.then((v) => {
			this._awaited = v;
		});
	}

	get awaited(): T {
		if (!this._awaited) {
			throw new Error(
				'Promise not resolved yet. Did you wrap the accessing method in withAwaited or use apply on your class instance?',
			);
		}
		return this._awaited;
	}

	/**
	 * Wraps all methods of the target instance to await the core promise before executing.
	 * Or pass a list of method names to apply to.
	 */
	apply = <TTarget extends object>(
		target: TTarget,
		onlyNames?: (keyof TTarget)[],
	) => {
		const names = Object.getOwnPropertyNames(target);
		for (const key of names) {
			if (key === 'constructor') continue;
			const desc = Object.getOwnPropertyDescriptor(target, key);
			if (
				desc &&
				typeof desc.value === 'function' &&
				(!onlyNames || onlyNames.includes(key as keyof TTarget))
			) {
				// Wrap method
				target[key as keyof TTarget] = this.afterAwaited(desc.value) as any;
			}
		}
	};

	/**
	 * Extends a method to await the core promise and passes it as the
	 * first argument.
	 */
	withAwaited<TArgs extends any[], TReturn>(
		fn: (awaited: T, ...args: TArgs) => TReturn,
	): (...args: TArgs) => Promise<Unpacked<TReturn>> {
		return async (...args: TArgs): Promise<Unpacked<TReturn>> => {
			const awaited = await this._promise;
			return fn.apply(this._bindTo, [awaited, ...args]) as Unpacked<TReturn>;
		};
	}

	/**
	 * Wraps a method to await the core promise but does not change
	 * its arguments.
	 */
	afterAwaited<TArgs extends any[], TReturn>(
		fn: (...args: TArgs) => TReturn,
	): (...args: TArgs) => Promise<Unpacked<TReturn>> {
		return async (...args: TArgs): Promise<Unpacked<TReturn>> => {
			await this._promise;
			return fn.apply(this._bindTo, args) as Unpacked<TReturn>;
		};
	}
}

type Unpacked<T> = T extends Promise<infer U> ? U : T;
