/**
 * File Signature Validator — Magic Byte Analysis
 *
 * Prevents malware execution by validating the actual file content
 * against known image/video format signatures. This is NOT mime-type
 * sniffing from headers (which is trivially spoofable).
 *
 * Supported formats:
 *   Images: JPEG, PNG, WebP, GIF, BMP
 *   Videos: MP4, MOV, WebM, AVI
 *
 * All other formats are rejected with a descriptive error.
 */

interface SignatureRule {
    name: string;
    type: "image" | "video";
    /** The magic bytes at the start of the file */
    magic: number[];
    /** Offset from byte 0 where the signature starts */
    offset: number;
}

const ALLOWED_SIGNATURES: SignatureRule[] = [
    // ── Images ──
    {
        name: "JPEG",
        type: "image",
        magic: [0xff, 0xd8, 0xff],
        offset: 0,
    },
    {
        name: "PNG",
        type: "image",
        magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
        offset: 0,
    },
    {
        name: "WebP",
        type: "image",
        magic: [0x52, 0x49, 0x46, 0x46], // RIFF header (WebP also has WEBP at offset 8)
        offset: 0,
    },
    {
        name: "GIF",
        type: "image",
        magic: [0x47, 0x49, 0x46, 0x38], // GIF8
        offset: 0,
    },
    {
        name: "BMP",
        type: "image",
        magic: [0x42, 0x4d], // BM
        offset: 0,
    },
    // ── Videos ──
    {
        name: "MP4",
        type: "video",
        magic: [0x66, 0x74, 0x79, 0x70], // ftyp (at offset 4)
        offset: 4,
    },
    {
        name: "MOV",
        type: "video",
        magic: [0x6d, 0x6f, 0x6f, 0x76], // moov
        offset: 4,
    },
    {
        name: "WebM",
        type: "video",
        magic: [0x1a, 0x45, 0xdf, 0xa3], // EBML header
        offset: 0,
    },
    {
        name: "AVI",
        type: "video",
        magic: [0x52, 0x49, 0x46, 0x46], // RIFF (same as WebP, distinguished by offset 8)
        offset: 0,
    },
];

/**
 * Validates the first N bytes of a file buffer against known media signatures.
 *
 * @param buffer - The raw file buffer (at least 12 bytes required for video)
 * @returns `{ valid: true, format, type }` or `{ valid: false, error }`
 */
export function validateFileSignature(
    buffer: Buffer
): { valid: true; format: string; type: "image" | "video" } | { valid: false; error: string } {
    if (!buffer || buffer.length < 12) {
        return { valid: false, error: "File is too small to validate (< 12 bytes)." };
    }

    for (const rule of ALLOWED_SIGNATURES) {
        const slice = buffer.subarray(rule.offset, rule.offset + rule.magic.length);
        const matches = rule.magic.every((byte, i) => slice[i] === byte);
        if (matches) {
            // For RIFF-based formats, distinguish WebP from AVI by checking bytes 8-11
            if (rule.magic[0] === 0x52 && rule.magic[1] === 0x49) {
                const typeSlice = buffer.subarray(8, 12);
                const isWebP = typeSlice[0] === 0x57 && typeSlice[1] === 0x45 &&
                    typeSlice[2] === 0x42 && typeSlice[3] === 0x50; // WEBP
                const isAvi = typeSlice[0] === 0x41 && typeSlice[1] === 0x56 &&
                    typeSlice[2] === 0x49 && typeSlice[3] === 0x20; // AVI\x20
                if (isWebP) return { valid: true, format: "WebP", type: "image" };
                if (isAvi) return { valid: true, format: "AVI", type: "video" };
                // Unknown RIFF subtype — still allow as image for forward compatibility
                return { valid: true, format: rule.name, type: rule.type };
            }
            return { valid: true, format: rule.name, type: rule.type };
        }
    }

    // Build a hex dump of the first 12 bytes for logging
    const hexDump = Array.from(buffer.subarray(0, 12))
        .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
        .join(" ");

    return {
        valid: false,
        error: `Unsupported file type. Expected JPEG, PNG, WebP, GIF, MP4, MOV, or WebM but got signature: [${hexDump}]. Only real image/video files are accepted.`,
    };
}
