import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../ai/llm.service';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mammoth = require('mammoth') as {
  extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }>;
};

const MIN_TEXT_CHARS = 80;

@Injectable()
export class StrategyDocParserService {
  private readonly log = new Logger(StrategyDocParserService.name);

  constructor(private llm: LlmService) {}

  async parse(buffer: Buffer, fileName: string, mimeType?: string) {
    const text = await this.extractText(buffer, fileName, mimeType);
    this.log.log(`Strategy doc "${fileName}": ${text.length} chars for AI analysis`);
    return this.llm.extractStrategicGoals(text);
  }

  private async extractText(buffer: Buffer, fileName: string, mimeType?: string): Promise<string> {
    const lower = fileName.toLowerCase();
    let text = '';

    if (lower.endsWith('.docx') || mimeType?.includes('wordprocessingml')) {
      const { value } = await mammoth.extractRawText({ buffer });
      text = (value ?? '').trim();
    } else if (lower.endsWith('.doc')) {
      throw new BadRequestException('Legacy .doc files are not supported. Please upload PDF or DOCX.');
    } else if (lower.endsWith('.ppt') || lower.endsWith('.pptx') || mimeType?.includes('presentation')) {
      throw new BadRequestException('PowerPoint files are not supported. Please export to PDF or DOCX.');
    } else if (lower.endsWith('.txt') || lower.endsWith('.md') || mimeType?.startsWith('text/')) {
      text = buffer.toString('utf8').replace(/^\uFEFF/, '').trim();
    } else {
      text = await this.extractPdfNative(buffer);
    }

    if (text.length < MIN_TEXT_CHARS) {
      throw new BadRequestException(
        'Could not read enough text from this file. Upload a text-based PDF or DOCX (scanned/image PDFs are not supported).',
      );
    }

    return text;
  }

  private async extractPdfNative(buffer: Buffer): Promise<string> {
    try {
      const data = await pdfParse(buffer);
      return (data.text ?? '').trim();
    } catch {
      return '';
    }
  }
}
