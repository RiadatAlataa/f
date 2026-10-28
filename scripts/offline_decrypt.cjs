/**
 * Standalone Offline Decryption Utility
 * Project: جمعية ريادة العطاء لخدمة الإنسان بالعسيلة
 * 
 * Usage on local PC:
 * node offline_decrypt.cjs <encrypted_backup_file.json> <64_hex_recovery_key>
 * 
 * Features:
 * - 100% Offline execution using standard Node.js crypto module.
 * - Authenticated AES-256-GCM decryption with SHA-256 integrity verification.
 * - Extracts plain db.json and physical attachments safely into an output folder.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log("Usage: node offline_decrypt.cjs <encrypted_backup_file.json> <64_hex_recovery_key> [output_directory]");
    process.exit(1);
  }

  const [inputFile, keyHex, outDirArg] = args;

  if (!fs.existsSync(inputFile)) {
    console.error("Error: Input file does not exist:", inputFile);
    process.exit(1);
  }

  if (!keyHex || keyHex.length !== 64) {
    console.error("Error: Recovery key must be exactly 64 hexadecimal characters (32 bytes).");
    process.exit(1);
  }

  const envelope = JSON.parse(fs.readFileSync(inputFile, "utf8"));

  if (envelope.algorithm !== "aes-256-gcm") {
    console.error("Error: Unsupported algorithm. Expected aes-256-gcm.");
    process.exit(1);
  }

  console.log("1. Verifying ciphertext SHA-256 digest...");
  const ciphertext = Buffer.from(envelope.ciphertextBase64, "base64");
  const actualHash = crypto.createHash("sha256").update(ciphertext).digest("hex");
  if (actualHash !== envelope.sha256Ciphertext) {
    console.error("Error: Ciphertext integrity verification failed (SHA-256 mismatch).");
    process.exit(1);
  }

  console.log("2. Decrypting payload with authenticated AES-256-GCM...");
  const key = Buffer.from(keyHex, "hex");
  const iv = Buffer.from(envelope.ivHex, "hex");
  const tag = Buffer.from(envelope.tagHex, "hex");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  let decrypted;
  try {
    decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch (err) {
    console.error("Error: Decryption failed. The recovery key is incorrect or the tag was tampered with.");
    process.exit(1);
  }

  console.log("3. Verifying decrypted payload hash...");
  const plainHash = crypto.createHash("sha256").update(decrypted).digest("hex");
  if (envelope.metadata && envelope.metadata.sha256Plain && plainHash !== envelope.metadata.sha256Plain) {
    console.error("Error: Plain payload hash verification failed.");
    process.exit(1);
  }

  const bundle = JSON.parse(decrypted.toString("utf8"));
  const outputDir = outDirArg || path.join(process.cwd(), `decrypted_backup_${envelope.backupId}`);
  fs.mkdirSync(outputDir, { recursive: true });

  // Save database
  const outDbFile = path.join(outputDir, "db.json");
  fs.writeFileSync(outDbFile, JSON.stringify(bundle.database, null, 2), "utf8");
  console.log(`Database saved successfully to: ${outDbFile}`);

  // Save attachments
  let attCount = 0;
  if (Array.isArray(bundle.attachments)) {
    for (const att of bundle.attachments) {
      if (att.relativePath && att.contentBase64) {
        const dest = path.join(outputDir, att.relativePath);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, Buffer.from(att.contentBase64, "base64"));
        attCount++;
      }
    }
  }

  console.log(`Extracted ${attCount} physical attachments.`);
  console.log(`\nSUCCESS: Backup ${envelope.backupId} decrypted and verified 100%!`);
}

main();
