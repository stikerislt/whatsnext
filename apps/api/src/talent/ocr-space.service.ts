import { BadRequestException, Injectable, Logger } from '@nestjs/common';

const FREE_TIER_MAX_BYTES = 1024 * 1024; // 1 MB
const DEFAULT_ENDPOINT = 'https://api.ocr.space/parse/image';
const OCR_TIMEOUT_MS = 90_000;

interface OcrSpaceParsedResult {
  ParsedText?: string;
  FileParseExitCode?: number | string;
  ErrorMessage?: string | null;
  ErrorDetails?: string | null;
}

interface OcrSpaceResponse {
  ParsedResults?: OcrSpaceParsedResult[];
  OCRExitCode?: number | string;
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string | null;
  ErrorDetails?: string | null;
  ProcessingTimeInMilliseconds?: string;
}

@Injectable()
export class OcrSpaceService {
  private readonly log = new Logger(OcrSpaceService.name);

  isConfigured(): boolean {
    return !!this.apiKey();
  }

  async extractText(buffer: Buffer, fileName: string, mimeType?: string): Promise<string> {
    const apiKey = this.apiKey();
    if (!apiKey) {
      throw new BadRequestException(
        'Scanned CV requires OCR. Set OCR_SPACE_API_KEY in .env (free key: https://ocr.space/ocrapi)',
      );
    }

    if (buffer.length > FREE_TIER_MAX_BYTES) {
      throw new BadRequestException(
        `CV file exceeds 1 MB OCR.space free tier limit (${Math.round(buffer.length / 1024)} KB). Compress the file or upgrade OCR.space plan.`,
      );
    }

    const endpoint = process.env.OCR_SPACE_API_URL ?? DEFAULT_ENDPOINT;
    const contentType = mimeType ?? guessMime(fileName);
    const form = new FormData();
    const base64 = buffer.toString('base64');
    form.append('base64Image', `data:${contentType};base64,${base64}`);
    form.append('language', process.env.OCR_SPACE_LANGUAGE ?? 'eng');
    form.append('OCREngine', process.env.OCR_SPACE_ENGINE ?? '2');
    form.append('scale', 'true');
    form.append('isTable', 'true');
    form.append('detectOrientation', 'true');

    const filetype = guessFileType(fileName);
    if (filetype) form.append('filetype', filetype);

    this.log.log(`OCR.space processing "${fileName}" (${buffer.length} bytes)`);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OCR_TIMEOUT_MS);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { apikey: apiKey },
        body: form,
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new BadRequestException(`OCR.space HTTP ${res.status}: ${body.slice(0, 200)}`);
      }

      const json = (await res.json()) as OcrSpaceResponse;

      if (json.IsErroredOnProcessing) {
        throw new BadRequestException(
          json.ErrorMessage ?? json.ErrorDetails ?? 'OCR.space processing failed',
        );
      }

      const pages = json.ParsedResults ?? [];
      const texts: string[] = [];

      for (const page of pages) {
        const code = Number(page.FileParseExitCode);
        if (code === 1 && page.ParsedText?.trim()) {
          texts.push(page.ParsedText.trim());
        } else if (page.ErrorMessage) {
          this.log.warn(`OCR page error: ${page.ErrorMessage}`);
        }
      }

      const combined = texts.join('\n\n').trim();
      if (!combined) {
        const exit = json.OCRExitCode ?? 'unknown';
        throw new BadRequestException(
          `OCR could not extract text from this file (OCRExitCode=${exit}). Try a clearer scan or CSV export.`,
        );
      }

      this.log.log(
        `OCR.space done "${fileName}" — ${combined.length} chars in ${json.ProcessingTimeInMilliseconds ?? '?'}ms`,
      );
      return combined;
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        throw new BadRequestException(`OCR timed out after ${OCR_TIMEOUT_MS / 1000}s for ${fileName}`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  private apiKey(): string | undefined {
    const key = process.env.OCR_SPACE_API_KEY?.trim();
    return key || undefined;
  }
}

function guessMime(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.tif') || lower.endsWith('.tiff')) return 'image/tiff';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.bmp')) return 'image/bmp';
  return 'application/octet-stream';
}

function guessFileType(fileName: string): string | undefined {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'PDF';
  if (lower.endsWith('.png')) return 'PNG';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'JPG';
  if (lower.endsWith('.tif') || lower.endsWith('.tiff')) return 'TIF';
  if (lower.endsWith('.gif')) return 'GIF';
  if (lower.endsWith('.bmp')) return 'BMP';
  return undefined;
}
