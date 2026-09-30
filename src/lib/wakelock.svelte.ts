/** Keep the screen on while mounted. Re-acquires the lock whenever the page becomes visible again. */
export class WakeLock {
	supported = $state(false);
	active = $state(false);

	#sentinel: WakeLockSentinel | null = null;
	#enabled = false;

	#onVisible = () => {
		if (document.visibilityState === 'visible') this.#request();
	};

	start() {
		this.supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
		if (!this.supported) return;
		this.#enabled = true;
		document.addEventListener('visibilitychange', this.#onVisible);
		this.#request();
	}

	stop() {
		this.#enabled = false;
		document.removeEventListener('visibilitychange', this.#onVisible);
		this.#sentinel?.release().catch(() => {});
		this.#sentinel = null;
		this.active = false;
	}

	async #request() {
		if (!this.#enabled || document.visibilityState !== 'visible' || this.#sentinel) return;
		try {
			const s = await navigator.wakeLock.request('screen');
			this.#sentinel = s;
			this.active = true;
			s.addEventListener('release', () => {
				this.#sentinel = null;
				this.active = false;
			});
		} catch {
			this.active = false;
		}
	}
}
