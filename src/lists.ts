export function shuffle<T>(list: T[], iterations = 1): T[] {
	const shuffled = list.slice();
	for (let i = 0; i < iterations; i++) {
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}
	}
	return shuffled;
}
