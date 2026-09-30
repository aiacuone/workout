import type { WorkoutState } from '$lib/types';

type Ended = (status: 'completed' | 'discarded', workoutId: string) => void;
type Op = { op: string; [k: string]: unknown };

export class WorkoutSession {
	state = $state() as WorkoutState;
	offsetMs = $state(0);
	pending = $state(0);
	error = $state<string | null>(null);
	syncedAt = $state(Date.now());

	#chain: Promise<void> = Promise.resolve();
	#lastEdit = 0;
	#onEnded: Ended;
	#ended = false;

	constructor(initial: WorkoutState, onEnded: Ended) {
		this.#onEnded = onEnded;
		this.apply(initial);
	}

	get id() {
		return this.state.id;
	}

	apply(next: WorkoutState) {
		this.state = next;
		this.offsetMs = new Date(next.serverNow).getTime() - Date.now();
		this.syncedAt = Date.now();
	}

	#end(status: 'completed' | 'discarded') {
		if (this.#ended) return;
		this.#ended = true;
		this.#onEnded(status, this.state.id);
	}

	/** Queue an operation; operations run strictly in order. */
	send(op: Op): Promise<void> {
		this.pending++;
		this.#lastEdit = Date.now();
		const run = async () => {
			try {
				const res = await fetch(`/api/workouts/${this.state.id}/ops`, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(op)
				});
				if (!res.ok) {
					const body = await res.json().catch(() => null);
					this.error = body?.message ?? `Could not save (${res.status})`;
					if (res.status === 404 || res.status === 409) await this.refresh(true);
					else if (this.pending === 1) await this.refresh(true);
					return;
				}
				const body = await res.json();
				this.error = null;
				if (body.status === 'discarded' || body.status === 'completed') {
					this.#end(body.status);
					return;
				}
				// Later queued edits would be clobbered by this snapshot; the last one applies.
				if (this.pending === 1) this.apply(body);
			} catch {
				this.error = 'Connection lost — change not saved. Retrying on next sync.';
			} finally {
				this.pending--;
			}
		};
		const p = this.#chain.then(run);
		this.#chain = p;
		return p;
	}

	async refresh(force = false) {
		if (this.#ended) return;
		const q = force ? '' : `?since=${this.state.version}`;
		try {
			const res = await fetch(`/api/workouts/${this.state.id}${q}`, { cache: 'no-store' });
			if (res.status === 404) return this.#end('discarded');
			if (!res.ok) return;
			const body = await res.json();
			if (body.unchanged) {
				this.syncedAt = Date.now();
				return;
			}
			if (body.status !== 'in_progress') return this.#end(body.status);
			if (force || this.pending === 0) this.apply(body);
		} catch {
			/* offline; next poll retries */
		}
	}

	/** True when it is safe to overwrite local state with a remote snapshot. */
	canPoll(root: HTMLElement | undefined) {
		if (this.pending > 0) return false;
		if (Date.now() - this.#lastEdit < 1200) return false;
		const el = document.activeElement;
		if (el && root?.contains(el) && el.matches('input, textarea, select')) return false;
		return true;
	}
}
