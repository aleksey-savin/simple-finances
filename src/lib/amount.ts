/**
 * Normalizes a user-entered amount string before parsing.
 *
 * Strips all whitespace (including non-breaking/narrow/thin spaces that show up
 * when copy/pasting Russian-formatted numbers like `1 000,50`) and converts a
 * decimal comma to a dot so `Number()` can parse it.
 */
export function normalizeAmountInput(value: string): string {
  return value.replace(/\s/g, '').replace(',', '.')
}
