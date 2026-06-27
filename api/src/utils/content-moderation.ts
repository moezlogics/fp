import crypto from "crypto";

const LINK_PATTERN =
    /(?:https?:\/\/|www\.|(?:[a-z0-9-]+\.)+(?:com|net|org|pk|co|io|me|ly|app|dev|info|biz|gg|tv|ai|uk|us|ca|ae|sa)\b|(?:wa\.me|t\.me|bit\.ly|tinyurl\.com))/i;

const ABUSIVE_TERMS = [
    "fuck",
    "fucking",
    "shit",
    "bitch",
    "bastard",
    "asshole",
    "madarchod",
    "behenchod",
    "behnchod",
    "benchod",
    "mc",
    "bc",
    "bkl",
    "harami",
    "kamina",
    "kameena",
    "kutta",
    "kutti",
    "chutiya",
    "chootiya",
    "gandu",
    "gaand",
    "lanti",
    "lanati",
];

type ValidationOptions = {
    fieldLabel: string;
    minLength: number;
    maxLength: number;
};

function collapseWhitespace(value: string): string {
    return value.replace(/\s+/g, " ").trim();
}

function normalizeForModeration(value: string): string {
    return collapseWhitespace(
        value
            .toLowerCase()
            .replace(/[@]/g, "a")
            .replace(/[0]/g, "o")
            .replace(/[1!]/g, "i")
            .replace(/[3]/g, "e")
            .replace(/[4]/g, "a")
            .replace(/[5$]/g, "s")
            .replace(/[7]/g, "t")
            .replace(/[^a-z\s]/g, " ")
    );
}

function hasRepeatedSpam(value: string): boolean {
    return /(.)\1{6,}/i.test(value) || /\b(\w+)(?:\s+\1){4,}\b/i.test(value);
}

function hasAbusiveLanguage(value: string): boolean {
    const normalized = normalizeForModeration(value);
    return ABUSIVE_TERMS.some((term) => normalized.includes(term));
}

export function validateGeneratedText(
    input: unknown,
    options: ValidationOptions
): { cleanText?: string; error?: string } {
    if (typeof input !== "string") {
        return { error: `${options.fieldLabel} is required.` };
    }

    const cleanText = collapseWhitespace(input);

    if (cleanText.length < options.minLength) {
        return { error: `${options.fieldLabel} must be at least ${options.minLength} characters.` };
    }

    if (cleanText.length > options.maxLength) {
        return { error: `${options.fieldLabel} must be under ${options.maxLength} characters.` };
    }

    if (LINK_PATTERN.test(cleanText)) {
        return { error: `Links are not allowed in ${options.fieldLabel.toLowerCase()}.` };
    }

    if (hasAbusiveLanguage(cleanText)) {
        return { error: `${options.fieldLabel} contains abusive language and cannot be submitted.` };
    }

    if (hasRepeatedSpam(cleanText)) {
        return { error: `${options.fieldLabel} looks spammy. Please rewrite it naturally.` };
    }

    return { cleanText };
}

export function validateGuestName(input: unknown): { cleanName?: string; error?: string } {
    if (typeof input !== "string") {
        return { error: "Please enter your name." };
    }

    const cleanName = collapseWhitespace(input);
    if (cleanName.length < 2 || cleanName.length > 40) {
        return { error: "Name must be between 2 and 40 characters." };
    }

    if (LINK_PATTERN.test(cleanName)) {
        return { error: "Links are not allowed in names." };
    }

    if (hasAbusiveLanguage(cleanName)) {
        return { error: "Please use a respectful name." };
    }

    return { cleanName };
}

export function createContentHash(value: string): string {
    return crypto.createHash("sha256").update(normalizeForModeration(value)).digest("hex");
}
