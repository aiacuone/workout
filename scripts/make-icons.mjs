import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const INK = [0x14, 0x20, 0x1d];
const LIME = [0xc8, 0xf1, 0x35];

// Barbell drawn on a 100x100 grid: [x, y, w, h]
const SHAPES = [
	[14, 47, 72, 6], // bar
	[22, 30, 8, 40], // outer plate L
	[31, 36, 7, 28], // inner plate L
	[62, 36, 7, 28], // inner plate R
	[70, 30, 8, 40] // outer plate R
];

function crcTable() {
	const t = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		t[n] = c >>> 0;
	}
	return t;
}
const TABLE = crcTable();
function crc32(buf) {
	let c = 0xffffffff;
	for (const b of buf) c = TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
	const len = Buffer.alloc(4);
	len.writeUInt32BE(data.length);
	const td = Buffer.concat([Buffer.from(type), data]);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(td));
	return Buffer.concat([len, td, crc]);
}

function png(size) {
	const raw = Buffer.alloc((size * 3 + 1) * size);
	for (let y = 0; y < size; y++) {
		raw[y * (size * 3 + 1)] = 0;
		for (let x = 0; x < size; x++) {
			const gx = (x / size) * 100;
			const gy = (y / size) * 100;
			const hit = SHAPES.some(([sx, sy, w, h]) => gx >= sx && gx < sx + w && gy >= sy && gy < sy + h);
			const [r, g, b] = hit ? LIME : INK;
			const i = y * (size * 3 + 1) + 1 + x * 3;
			raw[i] = r;
			raw[i + 1] = g;
			raw[i + 2] = b;
		}
	}
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(size, 0);
	ihdr.writeUInt32BE(size, 4);
	ihdr[8] = 8;
	ihdr[9] = 2;
	return Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		chunk('IHDR', ihdr),
		chunk('IDAT', deflateSync(raw)),
		chunk('IEND', Buffer.alloc(0))
	]);
}

mkdirSync('static', { recursive: true });
writeFileSync('static/icon-192.png', png(192));
writeFileSync('static/icon-512.png', png(512));
writeFileSync('static/apple-touch-icon.png', png(180));

const rects = SHAPES.map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`).join('');
writeFileSync(
	'static/favicon.svg',
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="18" fill="#14201d"/><g fill="#c8f135">${rects}</g></svg>\n`
);
console.log('icons written to static/');
