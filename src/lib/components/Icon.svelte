<script lang="ts">
	type Name =
		| 'home'
		| 'history'
		| 'plus'
		| 'dumbbell'
		| 'ruler'
		| 'settings'
		| 'check'
		| 'x'
		| 'trash'
		| 'up'
		| 'down'
		| 'chart'
		| 'timer'
		| 'more'
		| 'back'
		| 'bolt'
		| 'search'
		| 'play'
		| 'list';

	let { name, size = 22 }: { name: Name; size?: number } = $props();

	const paths: Record<Name, string> = {
		home: 'M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5',
		history: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2',
		plus: 'M12 5v14M5 12h14',
		dumbbell: 'M2 12h20M6 7v10M9 5v14M15 5v14M18 7v10',
		ruler: 'M3 17 17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2',
		settings:
			'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z',
		check: 'M4.5 12.5 10 18 20 6',
		x: 'M6 6l12 12M18 6 6 18',
		trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
		up: 'M6 15l6-6 6 6',
		down: 'M6 9l6 6 6-6',
		chart: 'M4 20V4M4 20h16M8 16l4-5 3 3 5-7',
		timer: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM12 9v4l2 2M9 2h6',
		more: 'M5 12h.01M12 12h.01M19 12h.01',
		back: 'M15 5l-7 7 7 7',
		bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
		search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4',
		play: 'M7 4v16l13-8z',
		list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'
	};
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width={name === 'more' ? 3.2 : 2}
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	<path d={paths[name]} />
</svg>
