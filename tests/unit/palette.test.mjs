import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBrandPalette, isValidHex, hexToRgb, paletteToCssVars } from '../../lib/theme/palette.js';

const STEPS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'];

function lightness(rgbStr) {
  const [r, g, b] = rgbStr.split(' ').map((n) => Number(n) / 255);
  return (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
}
function relLum(rgbStr) {
  const [r, g, b] = rgbStr.split(' ').map((n) => {
    const c = Number(n) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrastWithWhite(rgbStr) {
  return 1.05 / (relLum(rgbStr) + 0.05);
}

test('palette has 10 keys in "R G B" format', () => {
  const p = buildBrandPalette('#6355d8');
  assert.deepEqual(Object.keys(p), STEPS);
  for (const k of STEPS) assert.match(p[k], /^\d{1,3} \d{1,3} \d{1,3}$/);
});

test('lightness strictly decreases 50 -> 900', () => {
  for (const hex of ['#6355d8', '#ffff66', '#111111', '#16a34a']) {
    const p = buildBrandPalette(hex);
    for (let i = 1; i < STEPS.length; i++) {
      assert.ok(lightness(p[STEPS[i]]) < lightness(p[STEPS[i - 1]]), `${hex} ${STEPS[i]}`);
    }
  }
});

test('white on 600 contrast >= 4.5 for extreme colors', () => {
  for (const hex of ['#ffff66', '#111111', '#6355d8']) {
    const c = contrastWithWhite(buildBrandPalette(hex)['600']);
    assert.ok(c >= 4.5, `${hex} contrast ${c}`);
  }
});

test('isValidHex', () => {
  assert.equal(isValidHex('#6355d8'), true);
  assert.equal(isValidHex('#abc'), false);
  assert.equal(isValidHex('red'), false);
  assert.equal(isValidHex('#GGGGGG'), false);
});

test('hexToRgb and paletteToCssVars', () => {
  assert.deepEqual(hexToRgb('#ff0080'), { r: 255, g: 0, b: 128 });
  const vars = paletteToCssVars(buildBrandPalette('#6355d8'));
  assert.equal(Object.keys(vars).length, 10);
  assert.ok('--brand-50' in vars && '--brand-900' in vars);
});
