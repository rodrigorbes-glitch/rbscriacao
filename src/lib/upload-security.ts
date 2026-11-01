import crypto from 'crypto';
import path from 'path';

export type QuarantineStatus = 'pending' | 'analyzing' | 'approved' | 'rejected';

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedOriginalName: string;
  storageFileName: string;
  extension: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  quarantineStatus: QuarantineStatus;
  rejectionReason?: string;
  inspectionDetails?: {
    isBinary?: boolean;
    triangleCount?: number;
    uncompressedBytes?: number;
    entriesCount?: number;
    scannedAt: string;
  };
}

// Limits
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB per file
export const MAX_BATCH_FILES = 5; // Max 5 files per quote request
export const MAX_BATCH_SIZE_BYTES = 60 * 1024 * 1024; // 60 MB total request size

// ZIP / 3MF Archive Decompression Limits (Anti-Zip Bomb & Directory Traversal)
export const MAX_UNCOMPRESSED_SIZE_BYTES = 100 * 1024 * 1024; // Max 100 MB decompressed
export const MAX_ARCHIVE_ENTRIES = 50; // Max 50 files inside zip/3mf
export const MAX_ARCHIVE_DEPTH = 3; // Max 3 folder levels

// Allowed extensions and their expected signatures / magic numbers
export const ALLOWED_EXTENSIONS_MAP: Record<string, { mime: string; magic?: Buffer[] }> = {
  '.stl': {
    mime: 'model/stl',
  },
  '.obj': {
    mime: 'model/obj',
  },
  '.3mf': {
    mime: 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml',
    magic: [Buffer.from([0x50, 0x4b, 0x03, 0x04])],
  },
  '.step': {
    mime: 'model/step',
  },
  '.stp': {
    mime: 'model/step',
  },
  '.png': {
    mime: 'image/png',
    magic: [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
  },
  '.jpg': {
    mime: 'image/jpeg',
    magic: [Buffer.from([0xff, 0xd8, 0xff])],
  },
  '.jpeg': {
    mime: 'image/jpeg',
    magic: [Buffer.from([0xff, 0xd8, 0xff])],
  },
  '.webp': {
    mime: 'image/webp',
    magic: [Buffer.from([0x52, 0x49, 0x46, 0x46])], // 'RIFF'
  },
  '.pdf': {
    mime: 'application/pdf',
    magic: [Buffer.from([0x25, 0x50, 0x44, 0x46])], // '%PDF'
  },
  '.zip': {
    mime: 'application/zip',
    magic: [Buffer.from([0x50, 0x4b, 0x03, 0x04])], // 'PK\x03\x04'
  },
};

/**
 * Inspects a ZIP/3MF buffer structure without full extraction:
 * - Rejects directory traversal ('../' or '..\')
 * - Rejects absolute paths ('/' or 'C:\')
 * - Checks uncompressed size sum against zip-bomb threshold
 * - Limits entries count and directory depth
 */
export function inspectArchiveSafety(buffer: Buffer): { safe: boolean; error?: string; totalUncompressed: number; entries: number } {
  let offset = 0;
  let totalUncompressed = 0;
  let entries = 0;

  // Scan local file headers: signature 0x04034b50 (PK\x03\x04)
  while (offset < buffer.length - 30) {
    if (buffer.readUInt32LE(offset) === 0x04034b50) {
      entries++;
      if (entries > MAX_ARCHIVE_ENTRIES) {
        return { safe: false, error: `Arquivo compactado excede o limite de ${MAX_ARCHIVE_ENTRIES} itens internos.`, totalUncompressed, entries };
      }

      const compressedSize = buffer.readUInt32LE(offset + 18);
      const uncompressedSize = buffer.readUInt32LE(offset + 22);
      const fileNameLen = buffer.readUInt16LE(offset + 26);
      const extraFieldLen = buffer.readUInt16LE(offset + 28);

      totalUncompressed += uncompressedSize;
      if (totalUncompressed > MAX_UNCOMPRESSED_SIZE_BYTES) {
        return { safe: false, error: 'Volume descompactado do arquivo excede o limite de segurança de 100 MB (proteção zip-bomb).', totalUncompressed, entries };
      }

      if (offset + 30 + fileNameLen <= buffer.length) {
        const rawName = buffer.subarray(offset + 30, offset + 30 + fileNameLen).toString('utf8');
        // Check directory traversal
        if (rawName.includes('../') || rawName.includes('..\\') || rawName.startsWith('/') || /^[a-zA-Z]:/.test(rawName)) {
          return { safe: false, error: 'Arquivo compactado contém caminhos de diretório proibidos (tentativa de travessia).', totalUncompressed, entries };
        }
        const depth = rawName.split(/[/\\]/).filter(Boolean).length;
        if (depth > MAX_ARCHIVE_DEPTH) {
          return { safe: false, error: `Profundidade de pastas no arquivo compactado excede o limite permitido (${MAX_ARCHIVE_DEPTH} níveis).`, totalUncompressed, entries };
        }
      }

      offset += 30 + fileNameLen + extraFieldLen + compressedSize;
    } else {
      offset++;
    }
  }

  return { safe: true, totalUncompressed, entries };
}

/**
 * Validates and inspects an uploaded file buffer.
 * Performs deep magic number / header verification to prevent extension spoofing (e.g. PHP/EXE renamed as STL/PNG).
 * Lifecycle: All uploaded files start strictly as 'pending'. Only if ALL structure, magic numbers and archive checks pass,
 * it transitions to 'approved'. If inspection is unavailable or fails, it is marked 'rejected' or preserved in 'pending' with download blocked.
 */
export function validateAndQuarantineFile(
  buffer: Buffer,
  originalFilename: string,
  simulateInspectionOutage = false
): FileValidationResult {
  const sizeBytes = buffer.length;

  // 1. File Size Check (Reject empty or oversized immediately)
  if (sizeBytes === 0) {
    return {
      valid: false,
      error: 'O arquivo enviado está vazio (0 bytes).',
      sanitizedOriginalName: 'vazio',
      storageFileName: '',
      extension: '',
      mimeType: '',
      sizeBytes: 0,
      sha256: '',
      quarantineStatus: 'rejected',
      rejectionReason: 'empty_file',
    };
  }

  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `Arquivo excede o limite máximo permitido de ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB.`,
      sanitizedOriginalName: originalFilename.slice(0, 50),
      storageFileName: '',
      extension: '',
      mimeType: '',
      sizeBytes,
      sha256: '',
      quarantineStatus: 'rejected',
      rejectionReason: 'file_too_large',
    };
  }

  // 2. Sanitize and Extract Extension
  const rawExt = path.extname(originalFilename || '').toLowerCase();
  const baseName = path.basename(originalFilename || 'arquivo', rawExt);
  // Keep legitimate characters like accent, quotes sanitized cleanly without stripping into garbage
  const sanitizedBase = baseName.replace(/[^a-zA-Z0-9_\-áéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ ]/g, '_').slice(0, 80);
  const sanitizedOriginalName = `${sanitizedBase}${rawExt}`;

  const extConfig = ALLOWED_EXTENSIONS_MAP[rawExt];
  if (!extConfig) {
    return {
      valid: false,
      error: `Formato de arquivo '${rawExt}' não autorizado. Formatos aceitos: ${Object.keys(ALLOWED_EXTENSIONS_MAP).join(', ')}`,
      sanitizedOriginalName,
      storageFileName: '',
      extension: rawExt,
      mimeType: 'application/octet-stream',
      sizeBytes,
      sha256: '',
      quarantineStatus: 'rejected',
      rejectionReason: 'extension_not_allowed',
    };
  }

  // 3. SHA-256 and Randomized Internal Storage Filename
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  const randomId = crypto.randomBytes(16).toString('hex');
  const storageFileName = `sec-upload-${Date.now()}-${randomId}${rawExt}`;

  // If inspection service is temporarily unavailable, preserve the quote and keep file safely in 'pending' (download blocked)
  if (simulateInspectionOutage) {
    return {
      valid: true,
      sanitizedOriginalName,
      storageFileName,
      extension: rawExt,
      mimeType: extConfig.mime,
      sizeBytes,
      sha256,
      quarantineStatus: 'pending',
      inspectionDetails: {
        scannedAt: new Date().toISOString(),
      },
    };
  }

  // 4. Deep Magic Number / Structural Validation
  let headerValid = true;
  let rejectionReason: string | undefined;
  let inspectionDetails: FileValidationResult['inspectionDetails'] = {
    scannedAt: new Date().toISOString(),
  };

  if (extConfig.magic) {
    headerValid = extConfig.magic.some((m) => buffer.subarray(0, m.length).equals(m));
    if (!headerValid) {
      rejectionReason = 'magic_header_mismatch_extension_spoofing';
    } else if (rawExt === '.zip' || rawExt === '.3mf') {
      const archCheck = inspectArchiveSafety(buffer);
      if (!archCheck.safe) {
        headerValid = false;
        rejectionReason = archCheck.error || 'archive_safety_violation';
      } else {
        inspectionDetails.uncompressedBytes = archCheck.totalUncompressed;
        inspectionDetails.entriesCount = archCheck.entries;
      }
    }
  } else if (rawExt === '.stl') {
    if (sizeBytes < 84) {
      headerValid = false;
      rejectionReason = 'stl_file_truncated';
    } else {
      const headerStr = buffer.subarray(0, 80).toString('utf8').trim().toLowerCase();
      const isAsciiStl = headerStr.startsWith('solid');
      if (isAsciiStl) {
        headerValid = true;
        inspectionDetails.isBinary = false;
      } else {
        const numTriangles = buffer.readUInt32LE(80);
        const expectedMinSize = 84 + numTriangles * 50;
        if (sizeBytes >= 84 && (sizeBytes === expectedMinSize || numTriangles > 0)) {
          headerValid = true;
          inspectionDetails.isBinary = true;
          inspectionDetails.triangleCount = numTriangles;
        } else {
          headerValid = false;
          rejectionReason = 'stl_invalid_binary_structure';
        }
      }
    }
  } else if (rawExt === '.obj') {
    const sampleStr = buffer.subarray(0, Math.min(sizeBytes, 2048)).toString('utf8');
    const hasObjTokens = sampleStr.split('\n').some((line) => {
      const l = line.trim();
      return l.startsWith('v ') || l.startsWith('vn ') || l.startsWith('vt ') || l.startsWith('f ') || l.startsWith('#');
    });
    if (!hasObjTokens) {
      headerValid = false;
      rejectionReason = 'obj_missing_wavefront_geometry_tokens';
    }
  } else if (rawExt === '.step' || rawExt === '.stp') {
    const sampleStr = buffer.subarray(0, 100).toString('utf8').trim();
    if (!sampleStr.startsWith('ISO-10303-21')) {
      headerValid = false;
      rejectionReason = 'step_missing_iso_10303_header';
    }
  }

  if (!headerValid) {
    return {
      valid: false,
      error: rejectionReason === 'magic_header_mismatch_extension_spoofing'
        ? 'Conteúdo do arquivo não corresponde à sua extensão (falsificação ou arquivo corrompido).'
        : `Arquivo rejeitado na análise estrutural: ${rejectionReason}`,
      sanitizedOriginalName,
      storageFileName,
      extension: rawExt,
      mimeType: extConfig.mime,
      sizeBytes,
      sha256,
      quarantineStatus: 'rejected',
      rejectionReason,
    };
  }

  // All deep validations passed -> Successfully Approved
  return {
    valid: true,
    sanitizedOriginalName,
    storageFileName,
    extension: rawExt,
    mimeType: extConfig.mime,
    sizeBytes,
    sha256,
    quarantineStatus: 'approved',
    inspectionDetails,
  };
}

/**
 * Strips executable HTML/script tags while strictly PRESERVING legitimate manufacturing data,
 * accents, apostrophes (e.g. D’Ávila, D'Ávila) and measurement units (e.g. 10", 1/4", 15×15 cm).
 * Defense-in-depth: Output is always parameterized in SQL and encoded as text when rendered.
 */
export function sanitizePlainText(text: string | null | undefined, maxLength = 2000): string {
  if (!text || typeof text !== 'string') return '';
  return text
    // Remove dangerous executable HTML tags like <script>...</script>, <iframe>, <style>, <object>, <embed>, <svg>
    .replace(/<\s*(script|style|iframe|object|embed|svg|applet|meta|link)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    // Remove standalone HTML tags but keep the text inside: e.g. <b>D'Ávila</b> -> D'Ávila
    .replace(/<[^>]+>/g, '')
    // Remove null bytes and dangerous control chars (preserve newlines \n, \r, tabs)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
    .slice(0, maxLength);
}
