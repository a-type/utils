import { describe, expect, it } from 'vitest';
import { AwaitProxy } from './awaitProxy.js';

describe('when inherited', () => {
	it('awaits the core promise before resolving methods', async () => {
		class Test extends AwaitProxy<number> {
			constructor() {
				super(Promise.resolve(42));
			}

			getMultiplied = this.withAwaited((base, factor: number) => {
				return base * factor;
			});
		}

		const test = new Test();
		const result = await test.getMultiplied(2);
		expect(result).toBe(84);
	});
});

describe('when composed', () => {
	it('awaits the core promise before resolving methods', async () => {
		class Test {
			private readonly _awaitProxy: AwaitProxy<number>;

			constructor() {
				this._awaitProxy = new AwaitProxy(Promise.resolve(42), this);
				this._awaitProxy.apply(this);
			}

			getMultiplied = async (factor: number) => {
				return this._awaitProxy.awaited * factor;
			};
		}

		const test = new Test();
		const result = await test.getMultiplied(2);
		expect(result).toBe(84);
	});

	it('only applies to specified methods', async () => {
		class Test {
			private readonly _awaitProxy: AwaitProxy<number>;

			constructor() {
				this._awaitProxy = new AwaitProxy(Promise.resolve(42), this);
				this._awaitProxy.apply(this, ['getMultiplied']);
			}

			getMultiplied = async (factor: number) => {
				return this._awaitProxy.awaited * factor;
			};

			getAdded = (addend: number) => {
				return addend + 10;
			};
		}

		const test = new Test();
		const multipliedResult = await test.getMultiplied(2);
		expect(multipliedResult).toBe(84);

		const addedResult = test.getAdded(5);
		expect(addedResult).toBe(15);
	});
});
