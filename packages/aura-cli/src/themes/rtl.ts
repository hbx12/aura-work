/**
 * RTL (Right-to-Left) text support for Aura CLI
 * Supports Arabic, Hebrew, Persian, and other RTL languages
 */

// Unicode ranges for RTL characters
const RTL_RANGES: [number, number][] = [
  [0x0590, 0x05FF], // Hebrew
  [0x0600, 0x06FF], // Arabic
  [0x0700, 0x074F], // Syriac
  [0x0750, 0x077F], // Arabic Supplement
  [0x0780, 0x07BF], // Thaana
  [0x07C0, 0x07FF], // NKo
  [0x0800, 0x083F], // Samaritan
  [0x08A0, 0x08FF], // Arabic Extended-A
  [0xFB50, 0xFDFF], // Arabic Presentation Forms-A
  [0xFE70, 0xFEFF], // Arabic Presentation Forms-B
];

// Check if a character is RTL
export function isRTLChar(char: string): boolean {
  const code = char.charCodeAt(0);
  return RTL_RANGES.some(([start, end]) => code >= start && code <= end);
}

// Check if text contains RTL characters
export function hasRTL(text: string): boolean {
  return text.split('').some(isRTLChar);
}

// Check if text is primarily RTL
export function isPrimarilyRTL(text: string): boolean {
  const rtlCount = text.split('').filter(isRTLChar).length;
  return rtlCount > text.length / 2;
}

// Simple RTL text reversal for terminal display
export function rtlReorder(text: string): string {
  if (!hasRTL(text)) return text;

  const segments: Array<{ text: string; rtl: boolean }> = [];
  let current = '';
  let currentRTL = isRTLChar(text[0]);

  for (const char of text) {
    const charRTL = isRTLChar(char);
    if (charRTL !== currentRTL) {
      segments.push({ text: current, rtl: currentRTL });
      current = '';
      currentRTL = charRTL;
    }
    current += char;
  }
  if (current) {
    segments.push({ text: current, rtl: currentRTL });
  }

  return segments
    .map(seg => seg.rtl ? seg.text.split('').reverse().join('') : seg.text)
    .join('');
}

// Strip RTL/LTR embedding marks
export function stripDirectionMarks(text: string): string {
  return text.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '');
}

// Add RTL marker to text
export function rtlMark(text: string): string {
  return '\u200F' + text;
}

// Add LTR marker to text
export function ltrMark(text: string): string {
  return '\u200E' + text;
}
