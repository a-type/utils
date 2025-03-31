export class ExpiringMap<K, V> {
	static inSeconds = (expiresIn: number): number =>
		Date.now() + expiresIn * 1000;
	static inMinutes = (expiresIn: number): number =>
		Date.now() + expiresIn * 60 * 1000;
	static inHours = (expiresIn: number): number =>
		Date.now() + expiresIn * 60 * 60 * 1000;
	static inDays = (expiresIn: number): number =>
		Date.now() + expiresIn * 24 * 60 * 60 * 1000;

	private map: Map<K, { value: V; expiresAt: number; addedAt: number }> =
		new Map();
	private schedule?: boolean;
	private timeouts: Map<K, NodeJS.Timeout> = new Map();

	constructor({
		disableScheduling,
	}: {
		/** Disable setTimeout scheduling of freeing of values */
		disableScheduling?: boolean;
	} = {}) {
		this.schedule = !disableScheduling;
	}

	set(key: K, value: V, expiresAt: number): void {
		this.map.set(key, { value, expiresAt, addedAt: Date.now() });
		if (this.schedule) {
			if (this.timeouts.has(key)) {
				clearTimeout(this.timeouts.get(key)!);
			}
			// Schedule the timeout to remove the entry
			const timeout = setTimeout(() => {
				this.map.delete(key);
				this.timeouts.delete(key);
			}, expiresAt - Date.now() + 1000); // a bit of buffer just in case
			this.timeouts.set(key, timeout);
		}
	}

	get(key: K): V | undefined {
		const entry = this.map.get(key);
		if (!entry) return entry;
		if (entry.expiresAt < Date.now()) {
			this.map.delete(key);
			return undefined;
		}
		return entry.value;
	}

	getMeta(
		key: K,
	): { value: V; expiresAt: number; addedAt: number } | undefined {
		const entry = this.map.get(key);
		return entry;
	}

	has(key: K): boolean {
		return !!this.get(key);
	}

	delete(key: K): boolean {
		const deleted = this.map.delete(key);
		if (this.schedule) {
			const timeout = this.timeouts.get(key);
			if (timeout) {
				clearTimeout(timeout);
				this.timeouts.delete(key);
			}
		}
		return deleted;
	}

	clear(): void {
		this.map.clear();
	}

	keys(): K[] {
		return Array.from(this.map.keys()).filter((key) => this.has(key));
	}
	values(): V[] {
		return Array.from(this.map.values())
			.map((entry) => entry.value)
			.filter((value) => value !== undefined) as V[];
	}
	entries(): [K, V][] {
		return Array.from(this.map.entries())
			.map(([key, entry]) => [key, entry.value])
			.filter(([, value]) => value !== undefined) as [K, V][];
	}
}

export class WeakRefMap<K, V extends WeakKey> {
	private map: Map<K, WeakRef<V>> = new Map();

	set(key: K, value: V): void {
		this.map.set(key, new WeakRef(value));
	}
	get(key: K): V | undefined {
		const weakRef = this.map.get(key);
		if (!weakRef) return undefined;
		const value = weakRef.deref();
		if (!value) {
			this.map.delete(key);
			return undefined;
		}
		return value;
	}
	has(key: K): boolean {
		return !!this.get(key);
	}
	delete(key: K): boolean {
		return this.map.delete(key);
	}
	clear(): void {
		this.map.clear();
	}
	keys(): K[] {
		return Array.from(this.map.keys()).filter((key) => this.has(key));
	}
	values(): V[] {
		return Array.from(this.map.values())
			.map((weakRef) => weakRef.deref())
			.filter((value) => value !== undefined) as V[];
	}
	entries(): [K, V][] {
		return Array.from(this.map.entries())
			.map(([key, weakRef]) => [key, weakRef.deref()])
			.filter(([, value]) => value !== undefined) as [K, V][];
	}
}
