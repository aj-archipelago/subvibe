import { generateSRT } from '../srt/generator';
import { parse, resync, SubtitleCue } from '../index';

    // Sample subtitle cues for three different tracks
    const subtitles = [
      "WEBVTT\n\n00:00:00.000 --> 00:00:06.960\nLadies and gentlemen\n\n00:00:06.960 --> 00:00:10.920\nAI crisis.\n\n00:00:10.920 --> 00:00:15.880\nNow,\n\n00:00:15.880 --> 00:00:20.260\n their\n\n00:08:06.260 --> 00:08:10.299\nSo so far, like.\n\n00:08:10.299 --> 00:08:14.339\nIt's taking a long time\n\n00:08:14.339 --> 00:08:18.899\nhere, and, you know.\n\n00:08:18.899 --> 00:08:19.899\nWhat can I say?\n",
      "WEBVTT\n\n00:00:00.000 --> 00:00:06.500\nSo,\n\n00:00:06.500 --> 00:00:09.480\nhad prepared,\n\n00:08:04.779 --> 00:08:12.380\nI'm from future 8\n\n00:08:12.380 --> 00:08:20.059\nand forced.\n\n",
      "WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nIm closer 0.\n\n00:00:08.000 --> 00:00:11.000\nI should be at the end 20+.\n\n\n\n00:08:04.000 --> 00:08:05.000\nThat's all.\n\n00:08:05.000 --> 00:08:06.000\nGet out of here.\n\n",
    ]

    // Time offsets for each subtitle track in seconds
    const offsets = [
      0,
      500, // 8 minutes and 20 seconds
      1000, // 16 minutes and 40 seconds
    ]

describe('Merge and Offset Tests', () => {
  it('should merge three texts with different time offsets correctly to SRT', () => {

    const results: SubtitleCue[] = []
    for(let i = 0; i < subtitles.length; i++) {
      const subtitle = subtitles[i];
      const offset = offsets[i] * 1000; // Convert to milliseconds
      const parsed = parse(subtitle);
      const resynced = resync(parsed.cues, { offset });
      results.push(...resynced);
    }

    const srtOutput = generateSRT(results.flat());


    // Verify the output
    //check "Ladies and gentlemen" is in the output and timestamp is not shifted
    expect(srtOutput).toContain("00:00:00,000 --> 00:00:06,960\nLadies and gentlemen");

    //check "I'm from future" is in the output and timestamp is shifted, should be +16 mins
    expect(srtOutput).toContain("00:16:24,779 --> 00:16:32,380\nI'm from future 8");
    
    //check "Get out of here" is at the end of the output and timestamp is shifted, should be +24 mins
    expect(srtOutput).toContain("00:24:45,000 --> 00:24:46,000\nGet out of here.");

  });
});
