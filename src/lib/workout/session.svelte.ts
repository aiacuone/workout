import { toast } from '$lib/toast.svelte';
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
	/** Set when a snapshot arrived while a field was focused, so the next idle poll still applies it. */
	#forceNext = false;

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

	/** True while the user is in a field; applying a snapshot would drop that focus. */
	#editingField() {
		if (typeof document === 'undefined') return false;
		const el = document.activeElement;
		return el instanceof Element && el.matches('input, textarea, select');
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
					const message = body?.message ?? `Could not save (${res.status})`;
					this.error = message;
					toast(message, 'error');
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
				// Skip while a field is focused — the poll applies once the user is not typing.
				if (this.pending === 1 && !this.#editingField()) this.apply(body);
			} catch {
				const message = 'Connection lost — change not saved. Retrying on next sync.';
				this.error = message;
				toast(message, 'error');
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
		const hard = force || this.#forceNext;
		const q = hard ? '' : `?since=${this.state.version}`;
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
			if (!(hard || this.pending === 0)) return;
			// A failed save still fetches; don't replace state under a focused field.
			if (this.#editingField()) {
				this.#forceNext = true;
				return;
			}
			this.#forceNext = false;
			this.apply(body);
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
