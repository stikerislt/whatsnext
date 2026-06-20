import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  demoCvBodyForContext,
  extractCvFromCsv,
  extractSkillsFromText,
  type CvExtractionResult,
} from '@whatsnext/shared';
import { OcrSpaceService } from './ocr-space.service';

// pdf-parse has no ESM/types in this version
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>;

/** Minimum chars from native PDF parse before trying OCR (scanned PDFs). */
const MIN_NATIVE_TEXT_CHARS = 40;

@Injectable()
export class CvParserService {
  private readonly log = new Logger(CvParserService.name);

  constructor(private ocr: OcrSpaceService) {}

  getCapabilities() {
    return {
      ocrEnabled: this.ocr.isConfigured(),
      formats: ['pdf', 'csv', 'txt', 'png', 'jpg', 'jpeg', 'tif', 'tiff'],
    };
  }

  async parse(
    buffer: Buffer,
    fileName: string,
    mimeType?: string,
    employeeName?: string,
  ): Promise<CvExtractionResult> {
    const format = detectFormat(fileName, mimeType);

    if (format === 'csv') {
      const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
      return extractCvFromCsv(text);
    }

    let text = '';
    let sourceFormat: CvExtractionResult['sourceFormat'] = format === 'text' ? 'text' : 'pdf';

    try {
      const extracted = await this.extractText(buffer, fileName, mimeType, format);
      text = extracted.text;
      sourceFormat = extracted.sourceFormat;
    } catch (err) {
      this.log.warn(`CV extract failed for ${fileName}: ${(err as Error).message}`);
      throw new BadRequestException(`Could not read CV file (${format}): ${(err as Error).message}`);
    }

    if (!text.trim()) {
      const demo = demoCvBodyForContext(fileName, employeeName);
      if (demo) {
        return { ...extractSkillsFromText(demo), sourceFormat: 'demo' };
      }
      throw new BadRequestException(
        'CV file contained no readable text. For scanned PDFs/images, configure OCR_SPACE_API_KEY.',
      );
    }

    return { ...extractSkillsFromText(text), sourceFormat };
  }

  /** Plain text extraction for strategy documents and other non-CV uploads. */
  async extractPlainText(buffer: Buffer, fileName: string, mimeType?: string): Promise<string> {
    const format = detectFormat(fileName, mimeType);
    if (format === 'csv') {
      return buffer.toString('utf8').replace(/^\uFEFF/, '').trim();
    }
    const { text } = await this.extractText(buffer, fileName, mimeType, format);
    return text.trim();
  }

  private async extractText(
    buffer: Buffer,
    fileName: string,
    mimeType: string | undefined,
    format: CvFileFormat,
  ): Promise<{ text: string; sourceFormat: CvExtractionResult['sourceFormat'] }> {
    if (format === 'text') {
      return {
        text: buffer.toString('utf8').replace(/^\uFEFF/, ''),
        sourceFormat: 'text',
      };
    }

    if (format === 'image') {
      const text = await this.ocr.extractText(buffer, fileName, mimeType);
      return { text, sourceFormat: 'ocr' };
    }

    // PDF: native text first, OCR fallback for scans
    const native = await this.extractPdfNative(buffer);
    if (native.length >= MIN_NATIVE_TEXT_CHARS) {
      return { text: native, sourceFormat: 'pdf' };
    }

    this.log.log(`PDF "${fileName}" has little native text (${native.length} chars) — using OCR.space`);
    const ocrText = await this.ocr.extractText(buffer, fileName, mimeType ?? 'application/pdf');
    return { text: ocrText || native, sourceFormat: 'ocr' };
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

type CvFileFormat = 'pdf' | 'csv' | 'text' | 'image';

function detectFormat(fileName: string, mimeType?: string): CvFileFormat {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.csv') || mimeType?.includes('csv')) return 'csv';
  if (lower.endsWith('.pdf') || mimeType === 'application/pdf') return 'pdf';
  if (
    lower.endsWith('.txt') ||
    lower.endsWith('.md') ||
    mimeType?.startsWith('text/')
  ) {
    return 'text';
  }
  if (
    /\.(png|jpe?g|tif|tiff|gif|bmp|webp)$/i.test(lower) ||
    mimeType?.startsWith('image/')
  ) {
    return 'image';
  }
  return 'pdf';
}
