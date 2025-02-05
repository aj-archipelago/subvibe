# 🎵 Subvibe

The world's first fully vibe-coded subtitle utility library! Convert and manipulate subtitle files with style.

## ✨ Features

- 🔄 Parse and generate SRT (SubRip) subtitle files
- 🌐 Parse and generate WebVTT subtitle files
- 🛡️ Type-safe subtitle manipulation
- 🪶 Zero dependencies, pure vibes only
- ⚡ Lightning-fast performance
- 📝 Clean, modern TypeScript API

## 📦 Installation

```bash
# Using npm
npm install subvibe

# Using yarn
yarn add subvibe

# Using pnpm
pnpm add subvibe
```

## 🚀 Quick Start

### Auto-detecting and Parsing Subtitles

```typescript
import { parse } from 'subvibe';

// Your subtitle content (either SRT or WebVTT)
const content = `1
00:00:01,000 --> 00:00:04,000
Hey, what's the vibe?

2
00:00:04,500 --> 00:00:06,000
The vibe is immaculate!`;

// Parse automatically - format will be detected
const result = parse(content);

console.log(result.type);    // 'srt' or 'vtt'
console.log(result.cues);    // array of subtitle cues
```

The `parse()` function will automatically detect whether your content is SRT or WebVTT format and parse it accordingly. It's the easiest way to work with subtitles when you're not sure about the format.

### Converting Between Formats

```typescript
import { parse, generateVTT, generateSRT } from 'subvibe';

// Parse any subtitle format
const result = parse(content);

// Convert to VTT
const vttContent = generateVTT(result);

// Convert to SRT
const srtContent = generateSRT(result.cues);
```

### Working with Subtitles Programmatically

```typescript
import { SubtitleCue } from 'subvibe';

const cues: SubtitleCue[] = [
  {
    index: 1,
    startTime: 1000,  // milliseconds
    endTime: 4000,
    text: "Hey, what's the vibe?"
  },
  {
    index: 2,
    startTime: 4500,
    endTime: 6000,
    text: "The vibe is immaculate!"
  }
];
```

## 🛠️ API Reference

### Core Functions

#### `parse(content: string): ParsedSubtitles`
Auto-detect and parse subtitle content in either SRT or WebVTT format.

#### `parseSRT(content: string): ParsedSubtitles`
Parse SRT subtitle content.

#### `parseVTT(content: string): ParsedVTT`
Parse WebVTT subtitle content with support for styles, regions, and voice spans.

#### `generateSRT(cues: SubtitleCue[]): string`
Generate SRT content from subtitle cues.

#### `generateVTT(subtitles: ParsedVTT): string`
Generate WebVTT content with support for styles and regions.

### Types

```typescript
interface SubtitleCue {
  index: number;
  startTime: number;  // milliseconds
  endTime: number;    // milliseconds
  text: string;       // subtitle text content
}

interface ParsedSubtitles {
  type: 'srt' | 'vtt' | 'unknown';
  cues: SubtitleCue[];
  errors?: ParseError[];
}

interface ParsedVTT extends ParsedSubtitles {
  type: 'vtt';
  styles?: string[];    // CSS style blocks
  regions?: VTTRegion[];
}
```

### Advanced Utility Functions

Subvibe provides a rich set of utility functions for advanced subtitle manipulation and processing:

#### Time Manipulation

```typescript
// Shift subtitle timing
const options: TimeShiftOptions = {
  offset: 1000,      // milliseconds to shift (positive or negative)
  startAt: 0,        // only shift cues after this time (optional)
  endAt: Infinity,   // only shift cues before this time (optional)
  preserveGaps: true // maintain relative gaps between subtitles (optional)
};
const shiftedCues = SubtitleUtils.shiftTime(cues, options);

// Scale subtitle timing
const options: TimeScaleOptions = {
  factor: 1.1,     // scale factor (e.g., 1.1 for 10% slower)
  anchor: 0,       // time point around which to scale (optional)
  startAt: 0,      // only scale cues after this time (optional)
  endAt: Infinity  // only scale cues before this time (optional)
};
const scaledCues = SubtitleUtils.scaleTime(cues, options);
```

#### Subtitle Processing

```typescript
// Merge overlapping subtitles
const mergedCues = SubtitleUtils.mergeOverlapping(cues);

// Fix common timing issues
const fixedCues = SubtitleUtils.fixTimings(cues);

// Remove formatting tags
const strippedCues = SubtitleUtils.stripFormatting(cues);

// Validate subtitles
const validationResult = SubtitleUtils.validate(cues);
console.log(validationResult.isValid);    // boolean
console.log(validationResult.errors);     // array of errors

// Normalize subtitles to strict format
const options: NormalizeOptions = {
  format: 'srt',              // 'srt' or 'vtt'
  removeFormatting: false,    // remove styling tags
  fixTimings: true,          // fix timing issues
  mergeOverlapping: true,    // merge overlapping subtitles
  minimumDuration: 500,      // minimum duration in ms
  maximumDuration: 7000,     // maximum duration in ms
  minimumGap: 40,           // minimum gap between subtitles in ms
  removeEmpty: true,        // remove empty subtitles
  cleanupSpacing: true      // clean up extra whitespace
};
const normalizedCues = SubtitleUtils.normalize(cues, options);
```

#### Format Detection and Parsing

```typescript
// Parse loose timestamp formats
const ms = SubtitleUtils.parseLooseTime("1:23.456");    // 83456
const ms = SubtitleUtils.parseLooseTime("1h 23m");      // 4980000
const ms = SubtitleUtils.parseLooseTime("5m 35s");      // 335000

// Check if text contains timestamp
const hasTime = SubtitleUtils.hasTimestamp("at 1:23.456");  // true

// Find timestamp range in text
const range = SubtitleUtils.findTimestampRange("1:23 --> 4:56");
console.log(range?.start);  // milliseconds
console.log(range?.end);    // milliseconds

// Check if text looks like subtitle content
const isSubtitle = SubtitleUtils.looksLikeSubtitle(content);

// Auto-detect and parse subtitle format
const result = SubtitleUtils.detectAndParse(content);
console.log(result.type);     // 'srt', 'vtt', or 'unknown'
console.log(result.cues);     // parsed subtitle cues
console.log(result.errors);   // parsing errors if any
```

These utility functions make it easy to perform common subtitle manipulation tasks while maintaining proper timing and format consistency. They're particularly useful when working with subtitles from different sources or when you need to adjust timing for different playback speeds.

## 💡 Why Subvibe?

- 🎯 **Smart Format Detection**: Automatically handles SRT and WebVTT formats
- 🛡️ **Type Safety**: Built with TypeScript for robust, error-free subtitle manipulation
- 🚀 **Zero Dependencies**: Lightweight and efficient, only the code you need
- 🧪 **Well Tested**: Comprehensive test suite ensures reliability
- 📦 **Modern Package**: Built for modern JavaScript/TypeScript applications
- 🎨 **Clean API**: Intuitive and easy-to-use interface
- 🌟 **Active Development**: Regular updates and improvements

## 🤝 Contributing

We love contributions! Here's how you can help:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please make sure to update tests as appropriate and follow our code of conduct.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">Built with 💖 by subtitle enthusiasts for subtitle enthusiasts.</p>