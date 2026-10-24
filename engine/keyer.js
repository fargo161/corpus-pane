/* Sprite Foundry Video Keyer — chroma-key and frame utilities. */
(() => {
  'use strict';

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function hexToRgb(hex) {
    const value = String(hex || '').replace('#', '').trim();
    const normalized = value.length === 3
      ? value.split('').map((part) => part + part).join('')
      : value.padEnd(6, '0').slice(0, 6);
    const parsed = Number.parseInt(normalized, 16);
    return {
      r: (parsed >> 16) & 255,
      g: (parsed >> 8) & 255,
      b: parsed & 255,
    };
  }

  function rgbToHex({ r, g, b }) {
    return `#${[r, g, b]
      .map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0'))
      .join('')}`.toUpperCase();
  }

  function rgbToCbCr(r, g, b) {
    return {
      cb: -0.168736 * r - 0.331264 * g + 0.5 * b + 128,
      cr: 0.5 * r - 0.418688 * g - 0.081312 * b + 128,
    };
  }

  function median(values) {
    if (!values.length) return 0;
    values.sort((a, b) => a - b);
    const middle = Math.floor(values.length / 2);
    return values.length % 2
      ? values[middle]
      : (values[middle - 1] + values[middle]) / 2;
  }

  function sampleCornerKey(imageData, width, height, blockSize = 28) {
    const data = imageData.data || imageData;
    const size = Math.max(4, Math.min(blockSize, Math.floor(width / 3), Math.floor(height / 3)));
    const corners = [
      [0, 0],
      [Math.max(0, width - size), 0],
      [0, Math.max(0, height - size)],
      [Math.max(0, width - size), Math.max(0, height - size)],
    ];
    const red = [];
    const green = [];
    const blue = [];
    const step = size > 36 ? 3 : 2;

    for (const [startX, startY] of corners) {
      for (let y = startY; y < startY + size; y += step) {
        for (let x = startX; x < startX + size; x += step) {
          const index = (y * width + x) * 4;
          if (data[index + 3] < 16) continue;
          red.push(data[index]);
          green.push(data[index + 1]);
          blue.push(data[index + 2]);
        }
      }
    }

    return {
      r: Math.round(median(red)),
      g: Math.round(median(green)),
      b: Math.round(median(blue)),
    };
  }

  function smoothstep(edge0, edge1, x) {
    if (edge0 === edge1) return x < edge0 ? 0 : 1;
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function boxBlurAlpha(alpha, width, height, radius) {
    const r = Math.max(0, Math.floor(radius));
    if (!r) return alpha;

    const horizontal = new Uint8Array(alpha.length);
    const output = new Uint8Array(alpha.length);

    for (let y = 0; y < height; y += 1) {
      const row = y * width;
      let sum = 0;
      let count = 0;
      for (let x = -r; x <= r; x += 1) {
        if (x >= 0 && x < width) {
          sum += alpha[row + x];
          count += 1;
        }
      }
      for (let x = 0; x < width; x += 1) {
        horizontal[row + x] = Math.round(sum / count);
        const removeX = x - r;
        const addX = x + r + 1;
        if (removeX >= 0) {
          sum -= alpha[row + removeX];
          count -= 1;
        }
        if (addX < width) {
          sum += alpha[row + addX];
          count += 1;
        }
      }
    }

    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      let count = 0;
      for (let y = -r; y <= r; y += 1) {
        if (y >= 0 && y < height) {
          sum += horizontal[y * width + x];
          count += 1;
        }
      }
      for (let y = 0; y < height; y += 1) {
        output[y * width + x] = Math.round(sum / count);
        const removeY = y - r;
        const addY = y + r + 1;
        if (removeY >= 0) {
          sum -= horizontal[removeY * width + x];
          count -= 1;
        }
        if (addY < height) {
          sum += horizontal[addY * width + x];
          count += 1;
        }
      }
    }

    return output;
  }

  function applyKey(imageData, width, height, settings = {}) {
    const data = imageData.data;
    const key = settings.keyColor || { r: 37, g: 112, b: 47 };
    const tolerance = Number(settings.tolerance ?? 28);
    const softness = Number(settings.softness ?? 14);
    const matteShift = Number(settings.matteShift ?? 0) / 100;
    const despillStrength = clamp(Number(settings.despill ?? 65) / 100, 0, 1);
    const feather = Math.max(0, Math.floor(Number(settings.feather ?? 1)));
    const bboxThreshold = Number(settings.bboxThreshold ?? 12);
    // Clamp near-invisible matte residue to mathematically transparent pixels.
    // Keep this low so legitimate soft hair/finger edges remain intact.
    const alphaFloor = clamp(Math.round(Number(settings.alphaFloor ?? 8)), 0, 32);
    // Snap near-opaque foreground pixels to true 255 so keyed masters do not
    // carry a faint global translucency while still preserving genuine soft edges.
    const alphaCeiling = clamp(Math.round(Number(settings.alphaCeiling ?? 248)), 223, 255);
    const analysisOnly = Boolean(settings.analysisOnly);

    const keyChroma = rgbToCbCr(key.r, key.g, key.b);
    const inner = Math.max(0, tolerance - softness);
    const outer = Math.max(inner + 0.001, tolerance + softness);
    const alpha = new Uint8Array(width * height);


    for (let pixel = 0, index = 0; pixel < alpha.length; pixel += 1, index += 4) {
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const chroma = rgbToCbCr(r, g, b);
      const dc = chroma.cb - keyChroma.cb;
      const dr = chroma.cr - keyChroma.cr;
      const distance = Math.sqrt(dc * dc + dr * dr);

      let matte = smoothstep(inner, outer, distance);
      matte = clamp(matte + matteShift, 0, 1);
      const sourceAlpha = data[index + 3] / 255;
      const resultAlpha = Math.round(255 * matte * sourceAlpha);
      alpha[pixel] = resultAlpha;

      if (!analysisOnly && despillStrength > 0) {
        const maxOther = Math.max(r, b);
        if (g > maxOther) {
          const edgeReach = Math.max(softness * 2.5, 18);
          const proximity = 1 - clamp((distance - inner) / edgeReach, 0, 1);
          const partialAlphaWeight = 1 - resultAlpha / 255;
          const weight = Math.max(proximity * 0.82, partialAlphaWeight) * despillStrength;
          data[index + 1] = Math.round(g - (g - maxOther) * clamp(weight, 0, 1));
        }
      }
    }

    const finalAlpha = feather > 0 ? boxBlurAlpha(alpha, width, height, feather) : alpha;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    let transparentPixels = 0;
    let finalAlphaSum = 0;

    for (let pixel = 0, index = 0; pixel < finalAlpha.length; pixel += 1, index += 4) {
      let a = finalAlpha[pixel];
      if (a <= alphaFloor) {
        a = 0;
        finalAlpha[pixel] = 0;
      } else if (a >= alphaCeiling) {
        a = 255;
        finalAlpha[pixel] = 255;
      }
      finalAlphaSum += a;
      if (!analysisOnly) data[index + 3] = a;
      if (a === 0) transparentPixels += 1;
      if (a > bboxThreshold) {
        const x = pixel % width;
        const y = Math.floor(pixel / width);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }

    const bbox = maxX >= minX && maxY >= minY
      ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
      : null;

    return {
      imageData,
      alpha: finalAlpha,
      bbox,
      transparentRatio: transparentPixels / Math.max(1, finalAlpha.length),
      averageAlpha: finalAlphaSum / Math.max(1, finalAlpha.length),
      alphaFloor,
      alphaCeiling,
      keyColor: key,
    };
  }

  function calculateFrameTimes(start, end, fps) {
    const safeFps = Math.max(1, Number(fps) || 1);
    const safeStart = Math.max(0, Number(start) || 0);
    const safeEnd = Math.max(safeStart, Number(end) || safeStart);
    const duration = safeEnd - safeStart;
    // Use the nearest whole frame count for the selected duration. The Out point
    // is treated as an exclusive boundary so a terminal duplicate is not added.
    const count = Math.max(1, Math.round(duration * safeFps));
    const times = new Array(count);
    for (let i = 0; i < count; i += 1) {
      times[i] = Math.min(Math.max(safeStart, safeEnd - 0.0005), safeStart + i / safeFps);
    }
    return times;
  }

  function sanitizeFileBase(filename) {
    const withoutExtension = String(filename || 'sprite_clip').replace(/\.[^/.]+$/, '');
    const cleaned = withoutExtension
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^[_\.]+|[_\.]+$/g, '');
    return cleaned || 'sprite_clip';
  }

  function formatTime(seconds) {
    const value = Math.max(0, Number(seconds) || 0);
    const minutes = Math.floor(value / 60);
    const remaining = value - minutes * 60;
    const wholeSeconds = Math.floor(remaining);
    const millis = Math.floor((remaining - wholeSeconds) * 1000 + 0.5);
    return `${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
  }

  window.SpriteKeyer = {
    clamp,
    hexToRgb,
    rgbToHex,
    rgbToCbCr,
    sampleCornerKey,
    applyKey,
    calculateFrameTimes,
    sanitizeFileBase,
    formatTime,
  };
})();
