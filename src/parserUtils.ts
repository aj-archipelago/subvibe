export class ParserUtils {
  /**
   * Attempt to detect if text might be a subtitle block
   */
  static looksLikeSubtitle(text: string): boolean {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return false;

    for (let i = 0; i < lines.length - 1; i++) {
      // Check for number followed by timestamp
      if (/^\d+$/.test(lines[i].trim()) && this.hasTimestamp(lines[i + 1])) {
        return true;
      }

      // Check for timestamp followed by text
      if (this.hasTimestamp(lines[i]) && lines[i + 1].trim().length > 0) {
        return true;
      }
    }

    const timestampLines = lines.filter(line => this.hasTimestamp(line));
    return timestampLines.length >= 2;
  }

  /**
   * Attempt to detect if a string contains a timestamp
   */
  static hasTimestamp(text: string): boolean {
    const patterns = [
      /\d{1,2}:\d{1,2}/,
      /\d{1,2}:\d{1,2}:\d{1,2}/,
      /\d{1,2}[:.]\d{1,3}/,
      /\d{1,2}:\d{1,2}[:.]\d{1,3}/,
      /\d{1,2}:\d{1,2}:\d{1,2}[:.]\d{1,3}/,
      /^\d{1,5}$/,
      /\d{1,2}h\s*\d{1,2}m/,
      /\d{1,2}m\s*\d{1,2}s/,
      /\d{1,2}'\d{1,2}"/,
    ];
    
    return patterns.some(pattern => pattern.test(text));
  }
}
