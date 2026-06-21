// ============================================================================
//  DocVerify — 5-Layer Anti-Copy Security Service
// ----------------------------------------------------------------------------
//  Orchestrates the five trust layers that distinguish an ORIGINAL digital file
//  from a screenshot / photocopy / phone photo / edit:
//
//    L1  SHA-256 exact file hash         (Node crypto)
//    L2  Invisible watermark (DWT-DCT)   (optional Python micro-service)
//    L3  Perceptual hash (pHash)         (jimp, in-process)
//    L4  AI forensics                    (Gemini vision)
//    L5  Blockchain immutable record     (handled in server.js via the contract)
//
//  Everything here is environment-tolerant: if the Python watermark service is
//  not running, L2 reports `available:false` and the verdict degrades
//  gracefully instead of failing.
// ============================================================================

import crypto from "crypto";
import Jimp from "jimp";

// Optional Python micro-service (ocr-service/main.py). Read lazily because ES
// module imports run before dotenv.config() in server.js.
function getOcrUrl() {
    return process.env.OCR_SERVICE_URL || "";
}

export function isWatermarkServiceConfigured() {
    return !!getOcrUrl();
}

// ── Layer 1 — SHA-256 exact file hash ──────────────────────────────────────
export function computeSha256(buffer) {
    return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function verifyFileHash(buffer, expectedHash) {
    return computeSha256(buffer) === expectedHash;
}

// ── Layer 3 — Perceptual hash (pHash) ──────────────────────────────────────
// Returns a 64-bit binary string, or null if the buffer is not a raster image
// (e.g. a PDF) — pHash only applies to images.
export async function computePHash(buffer) {
    try {
        const img = await Jimp.read(buffer);
        return img.hash(2); // base-2 (binary) perceptual hash
    } catch {
        return null;
    }
}

export function hammingDistance(a, b) {
    if (!a || !b) return null;
    const len = Math.max(a.length, b.length);
    a = a.padStart(len, "0");
    b = b.padStart(len, "0");
    let d = 0;
    for (let i = 0; i < len; i++) if (a[i] !== b[i]) d++;
    return d;
}

// Hamming-distance interpretation: 0–5 identical, 6–15 suspicious, >15 different.
export function comparePHash(currentHash, expectedHash) {
    const distance = hammingDistance(currentHash, expectedHash);
    if (distance === null) return { distance: null, identical: false, similar: false };
    return { distance, identical: distance <= 5, similar: distance <= 15 };
}

// ── Layer 4 — AI forensics (Gemini vision) ─────────────────────────────────
// `model` is the @google/generative-ai model instance created in server.js.
export async function analyzeForgery(model, imageBase64, mimeType = "image/png") {
    const prompt = `You are a document-forensics expert. Analyze this document image for signs of copying or tampering.
Check for: moiré patterns (photo of a screen), scan lines (photocopy), perspective distortion / skew (phone photo of paper),
JPEG compression artifacts, visible screen bezels or reflections, colour banding, and unnaturally uniform sharpness.
Respond with ONLY compact JSON, no markdown:
{"is_original": boolean, "method": "original_scan|screenshot|photocopy|phone_photo|edited|unknown", "confidence": 0.0-1.0, "details": "one short sentence"}`;
    try {
        const result = await model.generateContent([
            prompt,
            { inlineData: { data: imageBase64, mimeType } },
        ]);
        const text = result.response.text().replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(text);
        return {
            is_original: !!parsed.is_original,
            method: parsed.method || "unknown",
            confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
            details: parsed.details || "",
        };
    } catch (err) {
        return { is_original: null, method: "unknown", confidence: 0, details: `AI forensics unavailable: ${err.message}` };
    }
}

// ── Layer 2 — Invisible watermark (Python micro-service) ───────────────────
export async function embedWatermark(buffer, docId, filename = "doc.png") {
    const url = getOcrUrl();
    if (!url) return null;
    try {
        const form = new FormData();
        form.append("file", new Blob([buffer]), filename);
        form.append("doc_id", docId);
        const resp = await fetch(`${url}/watermark/embed`, { method: "POST", body: form });
        if (!resp.ok) return null;
        return Buffer.from(await resp.arrayBuffer());
    } catch (err) {
        console.warn("Watermark embed unavailable:", err.message);
        return null;
    }
}

export async function verifyWatermark(buffer, expectedId, filename = "doc.png") {
    const url = getOcrUrl();
    if (!url) return { available: false, intact: null, extracted: null };
    try {
        const form = new FormData();
        form.append("file", new Blob([buffer]), filename);
        form.append("expected_id", expectedId);
        const resp = await fetch(`${url}/watermark/verify`, { method: "POST", body: form });
        if (!resp.ok) return { available: true, intact: null, error: `HTTP ${resp.status}` };
        const json = await resp.json();
        return { available: true, intact: !!json.intact, extracted: json.extracted };
    } catch (err) {
        return { available: false, intact: null, error: err.message };
    }
}

// ── Orchestrator ───────────────────────────────────────────────────────────
/**
 * Run the 5-layer anti-copy check on an uploaded buffer.
 *
 * @param {object} opts
 * @param {Buffer} opts.buffer        - the uploaded file bytes
 * @param {object} [opts.model]       - Gemini model for L4
 * @param {string} [opts.mimeType]    - upload mime type
 * @param {object} [opts.expected]    - the registered fingerprints to compare against:
 *                                       { sha256, pHash, docId, watermarked, filename }
 * @param {boolean} [opts.blockchainRegistered] - L5 result resolved by caller
 * @returns {object} layers + verdict + securityScore (0-100)
 */
export async function runSecurityCheck({ buffer, model, mimeType, expected = {}, blockchainRegistered = null }) {
    const layers = {
        layer1_sha256: { hash: computeSha256(buffer), expected: expected.sha256 || null, match: null },
        layer2_watermark: { available: false, intact: null },
        layer3_phash: { hash: null, expected: expected.pHash || null, distance: null, identical: null, similar: null },
        layer4_ai: { is_original: null, method: "unknown", confidence: 0, details: "not run" },
        layer5_blockchain: { registered: blockchainRegistered },
    };

    // L1
    if (expected.sha256) layers.layer1_sha256.match = layers.layer1_sha256.hash === expected.sha256;

    // L3
    const ph = await computePHash(buffer);
    layers.layer3_phash.hash = ph;
    const isImage = !!ph;
    if (ph && expected.pHash) Object.assign(layers.layer3_phash, comparePHash(ph, expected.pHash));

    // L2 (only if we know which docId to look for)
    if (expected.docId) {
        layers.layer2_watermark = await verifyWatermark(buffer, expected.docId, expected.filename);
    }

    // L4 — run when it can add signal: an image that is NOT an exact byte match
    const exactMatch = layers.layer1_sha256.match === true;
    const phashSuspicious = layers.layer3_phash.distance !== null && layers.layer3_phash.distance > 5;
    if (model && isImage && (!exactMatch || phashSuspicious)) {
        layers.layer4_ai = await analyzeForgery(model, buffer.toString("base64"), mimeType || "image/png");
    } else if (exactMatch) {
        layers.layer4_ai = { is_original: true, method: "original_file", confidence: 1, details: "Exact byte match — original file." };
    }

    return { layers, ...computeVerdict(layers) };
}

// Weighted verdict across whichever layers actually produced a signal.
export function computeVerdict(layers) {
    const reasons = [];
    let score = 0, weight = 0;

    // L1 — strongest signal
    if (layers.layer1_sha256.match === true) { score += 35; weight += 35; }
    else if (layers.layer1_sha256.match === false) { weight += 35; reasons.push("File bytes do not match the registered original (different hash)."); }

    // L2 — watermark
    if (layers.layer2_watermark.intact === true) { score += 20; weight += 20; }
    else if (layers.layer2_watermark.intact === false) { weight += 20; reasons.push("Invisible watermark is missing or degraded (sign of a copy)."); }

    // L3 — pHash
    if (layers.layer3_phash.distance !== null) {
        weight += 20;
        if (layers.layer3_phash.identical) score += 20;
        else if (layers.layer3_phash.similar) { score += 10; reasons.push("Visual fingerprint is only similar, not identical (possible re-save/crop)."); }
        else reasons.push("Visual fingerprint differs significantly from the original.");
    }

    // L4 — AI forensics
    if (layers.layer4_ai.is_original === true) { score += 15; weight += 15; }
    else if (layers.layer4_ai.is_original === false) { weight += 15; reasons.push(`AI forensics flagged this as "${layers.layer4_ai.method}" (${Math.round((layers.layer4_ai.confidence || 0) * 100)}% confidence).`); }

    // L5 — blockchain
    if (layers.layer5_blockchain.registered === true) { score += 10; weight += 10; }
    else if (layers.layer5_blockchain.registered === false) { weight += 10; reasons.push("No matching record found on the blockchain."); }

    const securityScore = weight > 0 ? Math.round((score / weight) * 100) : 0;
    // Verdict: any hard failure rejects. A document with no matching on-chain
    // record cannot be "verified" as an authentic registered original.
    const hardFail =
        layers.layer1_sha256.match === false ||
        layers.layer2_watermark.intact === false ||
        layers.layer4_ai.is_original === false ||
        layers.layer5_blockchain.registered === false ||
        (layers.layer3_phash.distance !== null && !layers.layer3_phash.similar);
    const verified = !hardFail && securityScore >= 60;

    return {
        verdict: verified ? "VERIFIED" : "REJECTED",
        verified,
        securityScore,
        reasons,
    };
}
