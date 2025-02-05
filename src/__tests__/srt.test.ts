import { parseSRT } from '../srt/parser';
import { generateSRT, convertVTTCuesToSRT } from '../srt/generator';
import { SubtitleCue } from '../types';

describe('SRT Parser', () => {
  test('parses valid SRT content', () => {
    const input = `1
00:00:01,000 --> 00:00:04,000
Hello world!

2
00:00:04,500 --> 00:00:06,000
This is a test
subtitle file.

3
00:00:06,500 --> 00:00:08,000
Goodbye!`;

    const result = parseSRT(input);
    expect(result.type).toBe('srt');
    expect(result.cues).toHaveLength(3);
    expect(result.errors).toBeUndefined();
    
    expect(result.cues[0]).toEqual({
      index: 1,
      startTime: 1000,
      endTime: 4000,
      text: 'Hello world!'
    });
  });

  test('handles malformed content with errors', () => {
    const input = `1
00:00:01,000 --> 00:00:04,000
Hello world!

invalid
00:00:04,500 --> 00:00:06,000
This is a test

3
00:00:06,500 --> invalid
Goodbye!`;

    const result = parseSRT(input);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
    expect(result.cues.length).toBe(1); // Only the first cue should parse successfully
  });

  test('handles various timestamp formats', () => {
    const inputs = [
      '00:00:01,000', // standard
      '00:00:01.000', // dot instead of comma
      '00:00:1,000',  // non-padded seconds
      '00:00:01,00',  // short milliseconds
      '00:00:01,0',   // single millisecond
      '00:00:01',     // no milliseconds
    ];

    const content = inputs.map((timestamp, i) => 
      `${i + 1}\n${timestamp} --> ${timestamp}\nTest`
    ).join('\n\n');

    const result = parseSRT(content);
    expect(result.cues.length).toBe(inputs.length);
    expect(result.errors).toBeUndefined();
  });

  test('handles various line ending formats', () => {
    const input = "1\r\n00:00:01,000 --> 00:00:02,000\r\nTest\r\n\r\n2\n00:00:02,000 --> 00:00:03,000\nTest2";
    const result = parseSRT(input);
    expect(result.cues.length).toBe(2);
  });

  test('handles missing index numbers', () => {
    const input = `
00:00:01,000 --> 00:00:02,000
Test

00:00:02,000 --> 00:00:03,000
Test2`;
    
    const result = parseSRT(input);
    expect(result.cues.length).toBe(2);
    expect(result.cues[0].index).toBe(1);
    expect(result.cues[1].index).toBe(2);
    expect(result.errors).toBeDefined();
    expect(result.errors![0].severity).toBe('warning');
  });

  test('handles overlapping timestamps', () => {
    const input = `1
00:00:01,000 --> 00:00:04,000
First

2
00:00:03,000 --> 00:00:05,000
Second`;
    const result = parseSRT(input);
    expect(result.cues.length).toBe(2);
    expect(result.errors).toBeDefined();
    expect(result.errors![0].severity).toBe('warning');
    expect(result.errors![0].message).toContain('overlap');
  });

  test('handles empty or whitespace-only subtitles', () => {
    const input = `1
00:00:01,000 --> 00:00:02,000


2
00:00:02,000 --> 00:00:03,000
    
    
3
00:00:03,000 --> 00:00:04,000
Valid text`;
    
    const result = parseSRT(input);
    expect(result.cues.length).toBe(1);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBe(2);
  });

  test('handles invalid timestamp orders', () => {
    const input = `1
00:00:02,000 --> 00:00:01,000
Test`;
    
    const result = parseSRT(input);
    expect(result.cues.length).toBe(0);
    expect(result.errors).toBeDefined();
    expect(result.errors![0].message).toContain('end time before start time');
  });

  test('handles extremely large timestamps', () => {
    const input = `1
99:99:99,999 --> 99:99:99,999
Test`;
    
    const result = parseSRT(input);
    expect(result.cues.length).toBe(1);
    expect(result.errors).toBeDefined();
    expect(result.errors![0].severity).toBe('warning');
    expect(result.errors![0].message).toContain('unusual timestamp');
  });

  test('handles non-sequential index numbers', () => {
    const input = `5
00:00:01,000 --> 00:00:02,000
First

2
00:00:02,000 --> 00:00:03,000
Second`;
    
    const result = parseSRT(input);
    expect(result.cues.length).toBe(2);
    expect(result.cues[0].index).toBe(1);
    expect(result.cues[1].index).toBe(2);
    expect(result.errors).toBeDefined();
    expect(result.errors![0].severity).toBe('warning');
  });
});

describe('SRT Generator', () => {
  test('generates basic SRT content', () => {
    const cues: SubtitleCue[] = [
      {
        index: 1,
        startTime: 1000,
        endTime: 4000,
        text: 'Hello world!'
      },
      {
        index: 2,
        startTime: 5000,
        endTime: 8000,
        text: 'Second subtitle'
      }
    ];

    // Test with array of cues
    const outputFromCues = generateSRT(cues);
    expect(outputFromCues).toBe(
      '1\n' +
      '00:00:01,000 --> 00:00:04,000\n' +
      'Hello world!\n\n' +
      '2\n' +
      '00:00:05,000 --> 00:00:08,000\n' +
      'Second subtitle\n'
    );

    // Test with ParsedSubtitles object
    const parsedSubtitles = {
      type: 'srt' as const,
      cues
    };
    const outputFromParsed = generateSRT(parsedSubtitles);
    expect(outputFromParsed).toBe(outputFromCues);
  });

  test('handles multi-line text', () => {
    const cues: SubtitleCue[] = [
      {
        index: 1,
        startTime: 1000,
        endTime: 4000,
        text: 'Line 1\nLine 2'
      }
    ];

    const output = generateSRT(cues);
    expect(output).toContain('Line 1\nLine 2');
  });

  test('formats timestamps correctly', () => {
    const cues: SubtitleCue[] = [
      {
        index: 1,
        startTime: 3661234, // 1:01:01.234
        endTime: 3665678,   // 1:01:05.678
        text: 'Test'
      }
    ];

    const output = generateSRT(cues);
    expect(output).toContain('01:01:01,234 --> 01:01:05,678');
  });

  test('handles zero timestamps', () => {
    const cues: SubtitleCue[] = [
      {
        index: 1,
        startTime: 0,
        endTime: 1000,
        text: 'Test'
      }
    ];

    const output = generateSRT(cues);
    expect(output).toContain('00:00:00,000 --> 00:00:01,000');
  });

  test('converts VTT cues to SRT format', () => {
    const vttCues: SubtitleCue[] = [
      {
        index: 1,
        startTime: 1000,
        endTime: 4000,
        text: '<v Speaker>Hello world!</v>'
      }
    ];

    const srtCues = convertVTTCuesToSRT(vttCues);
    const output = generateSRT(srtCues);
    expect(output).not.toContain('<v');
    expect(output).toContain('Hello world!');
  });
});

describe('SRT International Text Support', () => {
  test('handles Arabic text and RTL', () => {
    const input = `1
00:00:01,000 --> 00:00:04,000
مرحبا بالعالم
العربية جميلة

2
00:00:04,500 --> 00:00:06,000
هذا اختبار للغة العربية`;
    
    const result = parseSRT(input);
    expect(result.cues).toHaveLength(2);
    expect(result.cues[0].text).toBe('مرحبا بالعالم\nالعربية جميلة');
    expect(result.cues[1].text).toBe('هذا اختبار للغة العربية');
    expect(result.errors).toBeUndefined();
  });

  test('handles Chinese characters', () => {
    const input = `1
00:00:01,000 --> 00:00:04,000
你好世界
这是一个测试

2
00:00:04,500 --> 00:00:06,000
中文字幕测试`;
    
    const result = parseSRT(input);
    expect(result.cues).toHaveLength(2);
    expect(result.cues[0].text).toBe('你好世界\n这是一个测试');
    expect(result.cues[1].text).toBe('中文字幕测试');
    expect(result.errors).toBeUndefined();
  });

  test('handles Japanese text with mixed scripts', () => {
    const input = `1
00:00:01,000 --> 00:00:04,000
こんにちは世界！
テスト字幕です。

2
00:00:04,500 --> 00:00:06,000
漢字とひらがなとカタカナの
混合テスト`;
    
    const result = parseSRT(input);
    expect(result.cues).toHaveLength(2);
    expect(result.cues[0].text).toBe('こんにちは世界！\nテスト字幕です。');
    expect(result.cues[1].text).toBe('漢字とひらがなとカタカナの\n混合テスト');
    expect(result.errors).toBeUndefined();
  });

  test('handles Korean text', () => {
    const input = `1
00:00:01,000 --> 00:00:04,000
안녕하세요 세계!
한글 자막 테스트

2
00:00:04,500 --> 00:00:06,000
한국어 지원 확인`;
    
    const result = parseSRT(input);
    expect(result.cues).toHaveLength(2);
    expect(result.cues[0].text).toBe('안녕하세요 세계!\n한글 자막 테스트');
    expect(result.cues[1].text).toBe('한국어 지원 확인');
    expect(result.errors).toBeUndefined();
  });

  test('handles emoji and special characters', () => {
    const input = `1
00:00:01,000 --> 00:00:04,000
Hello 👋 World! 🌍
Testing 🧪 emoji ✨

2
00:00:04,500 --> 00:00:06,000
Mixed text & emojis: 
❤️ 星 🌟 نجمة ⭐`;
    
    const result = parseSRT(input);
    expect(result.cues).toHaveLength(2);
    expect(result.cues[0].text).toBe('Hello 👋 World! 🌍\nTesting 🧪 emoji ✨');
    expect(result.cues[1].text).toBe('Mixed text & emojis: \n❤️ 星 🌟 نجمة ⭐');
    expect(result.errors).toBeUndefined();
  });

  test('handles combining diacritical marks', () => {
    const input = `1
00:00:01,000 --> 00:00:04,000
Voilà! Café, résumé
Señor, año, niño

2
00:00:04,500 --> 00:00:06,000
Crème brûlée
über, schön, größer`;
    
    const result = parseSRT(input);
    expect(result.cues).toHaveLength(2);
    expect(result.cues[0].text).toBe('Voilà! Café, résumé\nSeñor, año, niño');
    expect(result.cues[1].text).toBe('Crème brûlée\nüber, schön, größer');
    expect(result.errors).toBeUndefined();
  });

  test('handles mixed text directions', () => {
    const input = `1
00:00:01,000 --> 00:00:04,000
Hello مرحبا World!
Mixed العربية and English

2
00:00:04,500 --> 00:00:06,000
Testing 测试 テスト
한글 mixed with English`;
    
    const result = parseSRT(input);
    expect(result.cues).toHaveLength(2);
    expect(result.cues[0].text).toBe('Hello مرحبا World!\nMixed العربية and English');
    expect(result.cues[1].text).toBe('Testing 测试 テスト\n한글 mixed with English');
    expect(result.errors).toBeUndefined();
  });

  test('handles unusual Unicode whitespace and control characters', () => {
    const input = `1
00:00:01,000 --> 00:00:04,000
Text with\u200Bzero-width space
Line with\u2028line separator

2
00:00:04,500 --> 00:00:06,000
Text with\u2060word joiner
Line with\u200Djoining char`;
    
    const result = parseSRT(input);
    expect(result.cues).toHaveLength(2);
    // The text should be preserved exactly as is, including special characters
    expect(result.cues[0].text).toBe('Text with\u200Bzero-width space\nLine with\u2028line separator');
    expect(result.cues[1].text).toBe('Text with\u2060word joiner\nLine with\u200Djoining char');
    expect(result.errors).toBeUndefined();
  });
}); 