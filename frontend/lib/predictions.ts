/**
 * Bit-packed prediction encoding for ArenaEngine V3.
 *
 * Predictions are boolean arrays (true = UP, false = DOWN).
 * They are packed into uint256[] words, 256 bits per word.
 * Bit i of the overall tape corresponds to tick i:
 *   word index = Math.floor(i / 256)
 *   bit index  = i % 256
 *   bit value  = 1 means UP, 0 means DOWN
 *
 * For 1500 ticks: ceil(1500/256) = 6 words.
 */

/** Encode a boolean prediction array into uint256[] words */
export function encodePredictions(predictions: boolean[]): bigint[] {
  const wordCount = Math.ceil(predictions.length / 256);
  const words: bigint[] = new Array(wordCount).fill(0n);

  for (let i = 0; i < predictions.length; i++) {
    if (predictions[i]) {
      const wordIdx = Math.floor(i / 256);
      const bitIdx = i % 256;
      words[wordIdx] |= 1n << BigInt(bitIdx);
    }
  }

  return words;
}

/** Decode uint256[] words back into a boolean array */
export function decodePredictions(words: bigint[], ticks: number): boolean[] {
  const result: boolean[] = new Array(ticks).fill(false);

  for (let i = 0; i < ticks; i++) {
    const wordIdx = Math.floor(i / 256);
    const bitIdx = i % 256;
    if (wordIdx < words.length && (words[wordIdx] & (1n << BigInt(bitIdx))) !== 0n) {
      result[i] = true;
    }
  }

  return result;
}
