/**
 * Secure In-Browser Client Encryption Utility for Association Backup Export
 * Zero-Knowledge: Passphrase never leaves client browser, never sent to server.
 * Standard: PBKDF2-HMAC-SHA512 (100,000 iterations) + AES-256-GCM (12-byte IV, 16-byte Auth Tag)
 */

export interface BackupMetadata {
  organization: string;
  source: string;
  version: number;
  size: number;
  sha256: string;
  algorithm: string;
  kdf: string;
  iterations: number;
  createdAt: string;
}

export interface DecryptionResult {
  ok: boolean;
  rawText?: string;
  metadata?: BackupMetadata;
  decryptedSha256?: string;
  sizeMatch?: boolean;
  shaMatch?: boolean;
  error?: string;
}

const MAGIC = new Uint8Array([0x52, 0x43, 0x44, 0x42]); // 'RCDB'

/**
 * Derives an AES-256 CryptoKey using PBKDF2-HMAC-SHA512 from user passphrase
 */
export async function deriveKeyFromPassphrase(
  passphrase: string,
  salt: Uint8Array,
  iterations = 100000
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as any,
      iterations,
      hash: "SHA-512"
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts raw JSON text into a secure authenticated binary envelope (.enc)
 */
export async function encryptBackupPayload(
  rawText: string,
  passphrase: string,
  metaParams: {
    version: number;
    size: number;
    sha256: string;
    organization?: string;
  }
): Promise<{ blob: Blob; metadata: BackupMetadata }> {
  const enc = new TextEncoder();
  const dataBytes = enc.encode(rawText);

  // 1. Generate 16-byte Salt and 12-byte IV
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // 2. Prepare Metadata
  const metadata: BackupMetadata = {
    organization: metaParams.organization || "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة",
    source: ".db.previous_valid_secondary.bak",
    version: metaParams.version,
    size: metaParams.size,
    sha256: metaParams.sha256,
    algorithm: "AES-256-GCM",
    kdf: "PBKDF2-HMAC-SHA512",
    iterations: 100000,
    createdAt: new Date().toISOString()
  };

  const metaBytes = enc.encode(JSON.stringify(metadata));
  const metaLen = metaBytes.length;

  const metaLenBytes = new Uint8Array(4);
  new DataView(metaLenBytes.buffer).setUint32(0, metaLen, false); // Big Endian

  // 3. Derive Key
  const aesKey = await deriveKeyFromPassphrase(passphrase, salt, metadata.iterations);

  // 4. Encrypt with AES-GCM (AAD: metaLenBytes)
  // Web Crypto AES-GCM automatically appends 16-byte Auth Tag to ciphertext
  const ciphertextAndTagBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: metaLenBytes
    },
    aesKey,
    dataBytes
  );

  const ciphertextAndTag = new Uint8Array(ciphertextAndTagBuffer);

  // 5. Assemble Package: [MAGIC 4B] + [MetaLen 4B] + [Metadata] + [Salt 16B] + [IV 12B] + [Ciphertext + Tag]
  const totalLength = 4 + 4 + metaLen + 16 + 12 + ciphertextAndTag.length;
  const packageBytes = new Uint8Array(totalLength);

  let offset = 0;
  packageBytes.set(MAGIC, offset);
  offset += 4;

  packageBytes.set(metaLenBytes, offset);
  offset += 4;

  packageBytes.set(metaBytes, offset);
  offset += metaLen;

  packageBytes.set(salt, offset);
  offset += 16;

  packageBytes.set(iv, offset);
  offset += 12;

  packageBytes.set(ciphertextAndTag, offset);

  const blob = new Blob([packageBytes], { type: "application/octet-stream" });
  return { blob, metadata };
}

/**
 * Decrypts an encrypted package buffer using the provided passphrase
 */
export async function decryptBackupPayload(
  buffer: ArrayBuffer,
  passphrase: string
): Promise<DecryptionResult> {
  try {
    const bytes = new Uint8Array(buffer);
    if (bytes.length < 52) {
      return { ok: false, error: "حجم الملف المشفر غير صالح أو تالف." };
    }

    // 1. Verify Magic
    if (
      bytes[0] !== MAGIC[0] ||
      bytes[1] !== MAGIC[1] ||
      bytes[2] !== MAGIC[2] ||
      bytes[3] !== MAGIC[3]
    ) {
      return { ok: false, error: "صيغة الملف غير صالحة، ليس ملف نسخة احتياطية معتمد للجمعية." };
    }

    // 2. Read MetaLen & Metadata
    const metaLen = new DataView(buffer, 4, 4).getUint32(0, false);
    if (bytes.length < 8 + metaLen + 28) {
      return { ok: false, error: "بيانات ترويسة الحزمة غير مكتملة." };
    }

    const metaBytes = bytes.slice(8, 8 + metaLen);
    const dec = new TextDecoder();
    const metadata: BackupMetadata = JSON.parse(dec.decode(metaBytes));

    let offset = 8 + metaLen;
    const salt = bytes.slice(offset, offset + 16);
    offset += 16;

    const iv = bytes.slice(offset, offset + 12);
    offset += 12;

    const ciphertextAndTag = bytes.slice(offset);

    // 3. Derive Key
    const aesKey = await deriveKeyFromPassphrase(passphrase, salt, metadata.iterations || 100000);

    const metaLenBytes = new Uint8Array(4);
    new DataView(metaLenBytes.buffer).setUint32(0, metaLen, false);

    // 4. Decrypt
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: metaLenBytes
      },
      aesKey,
      ciphertextAndTag
    );

    const decryptedBytes = new Uint8Array(decryptedBuffer);
    const rawText = dec.decode(decryptedBytes);

    // 5. Calculate SHA-256 of decrypted data
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", decryptedBytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const decryptedSha256 = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    const shaMatch = decryptedSha256 === metadata.sha256;
    const sizeMatch = decryptedBytes.length === metadata.size;

    return {
      ok: true,
      rawText,
      metadata,
      decryptedSha256,
      sizeMatch,
      shaMatch
    };
  } catch (err: any) {
    return {
      ok: false,
      error: "فشل فك التشفير: كلمة المرور غير صحيحة، أو أن بيانات الحزمة تعرضت للتعديل أو التلف."
    };
  }
}

/**
 * Calculates SHA-256 of string or ArrayBuffer in browser
 */
export async function calculateSha256(content: string | ArrayBuffer): Promise<string> {
  const enc = new TextEncoder();
  const data = typeof content === "string" ? enc.encode(content) : content;
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
