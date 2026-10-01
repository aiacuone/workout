export type ToastKind = 'ok' | 'error';

export const toastState = $state({ message: '', kind: 'ok' as ToastKind });

let timer: ReturnType<typeof setTimeout> | undefined;

export function toast(message: string, kind: ToastKind = 'ok') {
	toastState.message = message;
	toastState.kind = kind;
	clearTimeout(timer);
	timer = setTimeout(() => {
		toastState.message = '';
	}, 4200);
}

const ERROR_KEYS = ['error', 'pwError', 'importError', 'measureImportError'] as const;

export function toastFormError(data: unknown) {
	if (!data || typeof data !== 'object') return;
	const record = data as Record<string, unknown>;
	for (const key of ERROR_KEYS) {
		const value = record[key];
		if (typeof value === 'string' && value) {
			toast(value, 'error');
			return;
		}
	}
}
