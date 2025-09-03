/**
 * Format numbers with abbreviations for large values
 * Examples: 1000 -> "1k", 1300 -> "1.3k", 1000000 -> "1M"
 */
export function formatCount(count: number): string {
  if (count < 1000) {
    return count.toString();
  }
  
  if (count < 1000000) {
    const thousands = count / 1000;
    // Show one decimal place only if needed
    return thousands % 1 === 0 
      ? `${thousands}k`
      : `${thousands.toFixed(1)}k`;
  }
  
  if (count < 1000000000) {
    const millions = count / 1000000;
    return millions % 1 === 0
      ? `${millions}M`
      : `${millions.toFixed(1)}M`;
  }
  
  const billions = count / 1000000000;
  return billions % 1 === 0
    ? `${billions}B`
    : `${billions.toFixed(1)}B`;
}

/**
 * Parse a number from string (handles encrypted string values from backend)
 */
export function parseNumberCount(countStr: string | number): number {
  if (typeof countStr === 'number') {
    return countStr;
  }
  
  const parsed = parseInt(countStr, 10);
  return isNaN(parsed) ? 0 : parsed;
}
