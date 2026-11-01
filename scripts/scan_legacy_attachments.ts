/**
 * Diagnostic Scanner for Legacy Attachments & Files
 * Project: جمعية ريادة العطاء لخدمة الإنسان بالعسيلة
 * 
 * Scans:
 * 1. Neon PostgreSQL system_state / local db.json for embedded Base64 and local paths.
 * 2. Physical files present on Render's ephemeral disk in public/uploads and public/card_templates.
 * 3. Identifies migratable files, orphaned disk files, and missing references.
 * 4. Categorizes files by privacy (Private PDPL Sensitive vs Public Assets).
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { readDb, getActiveDbPath } from "../server-core";

export interface DiscoveredFileItem {
  id: string;
  sourceType: 'embedded_base64' | 'local_file_reference' | 'external_url' | 'permanent_storage';
  locationPath: string;
  entityType: string;
  entityId: string;
  fieldName: string;
  isPrivate: boolean;
  estimatedSizeBytes: number;
  mimeType: string;
  checksumSha256?: string;
  status: 'migratable' | 'missing_on_disk' | 'already_permanent' | 'external_reference';
  previewNote: string;
}

export interface StorageScanSummary {
  timestamp: string;
  databaseSource: string;
  totalReferencesFound: number;
  breakdown: {
    embeddedBase64: number;
    localFileReferences: number;
    externalUrls: number;
    permanentStorage: number;
  };
  privacyClassification: {
    privateSensitiveFiles: number; // Beneficiary, Volunteer IDs, Financial
    publicBrandingFiles: number;    // Logos, Templates, News
  };
  diskFilesFound: number;
  orphanedDiskFiles: number;
  totalEstimatedBytes: number;
  items: DiscoveredFileItem[];
}

export function scanAllLegacyAttachments(): StorageScanSummary {
  const db = readDb() || {};
  const activeDbPath = getActiveDbPath();
  const items: DiscoveredFileItem[] = [];

  const localUploadsDir = path.join(process.cwd(), "public", "uploads");
  const localCardTemplatesDir = path.join(process.cwd(), "public", "card_templates");

  // Helper to test if string is Base64 image/doc
  function checkBase64(val: string): { isB64: boolean; mime: string; bytes: number } {
    if (typeof val !== 'string') return { isB64: false, mime: '', bytes: 0 };
    const match = val.match(/^data:([a-zA-Z0-9\+\-\.\/]+);base64,(.+)$/);
    if (match) {
      const mime = match[1];
      const dataStr = match[2];
      const bytes = Math.round((dataStr.length * 3) / 4);
      return { isB64: true, mime, bytes };
    }
    return { isB64: false, mime: '', bytes: 0 };
  }

  function registerItem(
    val: string,
    entityType: string,
    entityId: string,
    fieldName: string,
    isPrivate: boolean
  ) {
    if (!val || typeof val !== 'string') return;
    const trimmed = val.trim();
    if (!trimmed) return;

    const b64Check = checkBase64(trimmed);
    if (b64Check.isB64) {
      const hash = crypto.createHash("sha256").update(Buffer.from(trimmed.replace(/^data:[^;]+;base64,/, ''), "base64")).digest("hex");
      items.push({
        id: `scan-${items.length + 1}`,
        sourceType: 'embedded_base64',
        locationPath: `db.${entityType}[${entityId}].${fieldName}`,
        entityType,
        entityId,
        fieldName,
        isPrivate,
        estimatedSizeBytes: b64Check.bytes,
        mimeType: b64Check.mime,
        checksumSha256: hash,
        status: 'migratable',
        previewNote: `ملف Base64 مضمن داخل قاعدة البيانات (${Math.round(b64Check.bytes / 1024)} KB)`
      });
      return;
    }

    if (trimmed.startsWith('/uploads/') || trimmed.startsWith('/card_templates/')) {
      const relPath = trimmed.replace(/^\//, '');
      const fullPath = path.join(process.cwd(), "public", relPath.replace(/^uploads\//, 'uploads/'));
      const existsOnDisk = fs.existsSync(fullPath);
      let size = 0;
      let checksum = undefined;
      if (existsOnDisk) {
        try {
          const stat = fs.statSync(fullPath);
          size = stat.size;
          const buf = fs.readFileSync(fullPath);
          checksum = crypto.createHash("sha256").update(buf).digest("hex");
        } catch {}
      }

      items.push({
        id: `scan-${items.length + 1}`,
        sourceType: 'local_file_reference',
        locationPath: trimmed,
        entityType,
        entityId,
        fieldName,
        isPrivate,
        estimatedSizeBytes: size,
        mimeType: path.extname(trimmed).toLowerCase().includes('pdf') ? 'application/pdf' : 'image/png',
        checksumSha256: checksum,
        status: existsOnDisk ? 'migratable' : 'missing_on_disk',
        previewNote: existsOnDisk ? `ملف محلي على قرص السيرفر (${Math.round(size / 1024)} KB)` : 'رابط يشير لملف محلي مفقود على السيرفر'
      });
      return;
    }

    if (trimmed.startsWith('/api/attachments/')) {
      items.push({
        id: `scan-${items.length + 1}`,
        sourceType: 'permanent_storage',
        locationPath: trimmed,
        entityType,
        entityId,
        fieldName,
        isPrivate,
        estimatedSizeBytes: 0,
        mimeType: 'application/octet-stream',
        status: 'already_permanent',
        previewNote: 'مرفق مسجل بالفعل في نظام التخزين الدائم'
      });
      return;
    }

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      items.push({
        id: `scan-${items.length + 1}`,
        sourceType: 'external_url',
        locationPath: trimmed,
        entityType,
        entityId,
        fieldName,
        isPrivate,
        estimatedSizeBytes: 0,
        mimeType: 'image/jpeg',
        status: 'external_reference',
        previewNote: 'رابط خارجي (مثل Unsplash أو نموذج افتراضي)'
      });
    }
  }

  // 1. Scan System & Home Settings (Logos, Licenses)
  if (db.systemSettings?.logoUrl) {
    registerItem(db.systemSettings.logoUrl, 'logos', 'society', 'logoUrl', false);
  }
  if (db.homeSettings?.logoUrl) {
    registerItem(db.homeSettings.logoUrl, 'logos', 'home', 'logoUrl', false);
  }
  if (db.homeSettings?.licenseImage) {
    registerItem(db.homeSettings.licenseImage, 'licenses', 'license_official', 'licenseImage', false);
  }

  // 2. Scan Volunteer Card Templates
  (db.volunteerCardTemplates || []).forEach((t: any, idx: number) => {
    if (t.backgroundUrl) registerItem(t.backgroundUrl, 'cards', t.id || `tpl-${idx}`, 'backgroundUrl', false);
    if (t.cardImage) registerItem(t.cardImage, 'cards', t.id || `tpl-${idx}`, 'cardImage', false);
  });

  // 3. Scan Volunteers (Private photos, signatures, attachments)
  (db.volunteers || []).forEach((v: any) => {
    if (v.profileImage) registerItem(v.profileImage, 'volunteers', v.id, 'profileImage', false);
    if (v.cardPhoto) registerItem(v.cardPhoto, 'volunteers', v.id, 'cardPhoto', true);
    if (v.idCopyUrl) registerItem(v.idCopyUrl, 'volunteers', v.id, 'idCopyUrl', true);
    if (v.charterPdfUrl) registerItem(v.charterPdfUrl, 'volunteers', v.id, 'charterPdfUrl', true);
    (v.attachments || []).forEach((att: any, aIdx: number) => {
      registerItem(att.url || att.data, 'volunteers', v.id, `attachment_${aIdx}`, true);
    });
  });

  // 4. Scan Beneficiaries & Aid Requests (Private Sensitive Documents under PDPL)
  (db.beneficiaries || []).forEach((b: any) => {
    if (b.nationalIdDocument) registerItem(b.nationalIdDocument, 'beneficiaries', b.id, 'nationalIdDocument', true);
    if (b.incomeProofDocument) registerItem(b.incomeProofDocument, 'beneficiaries', b.id, 'incomeProofDocument', true);
    if (b.medicalReportDocument) registerItem(b.medicalReportDocument, 'beneficiaries', b.id, 'medicalReportDocument', true);
    (b.attachments || []).forEach((att: any, aIdx: number) => {
      registerItem(att.url || att.data, 'beneficiaries', b.id, `attachment_${aIdx}`, true);
    });
  });

  (db.benefitRequests || []).forEach((r: any) => {
    (r.attachments || []).forEach((att: any, aIdx: number) => {
      registerItem(att.url || att.data, 'beneficiaries', r.id || r.beneficiaryId, `request_attachment_${aIdx}`, true);
    });
  });

  // 5. Scan News & Media Album (Public)
  (db.news || []).forEach((n: any) => {
    if (n.imageUrl) registerItem(n.imageUrl, 'news', n.id, 'imageUrl', false);
  });
  (db.mediaAlbum || []).forEach((m: any) => {
    if (m.imageUrl) registerItem(m.imageUrl, 'initiatives', m.id, 'imageUrl', false);
  });

  // 6. Scan Partner Logos (Public)
  (db.partners || []).forEach((p: any) => {
    if (p.logoUrl) registerItem(p.logoUrl, 'partners', p.id, 'logoUrl', false);
  });

  // 7. Scan Physical Files on Disk
  const diskFiles: string[] = [];
  function scanDisk(dir: string) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        scanDisk(full);
      } else if (e.isFile()) {
        diskFiles.push(full);
      }
    }
  }
  scanDisk(localUploadsDir);
  scanDisk(localCardTemplatesDir);

  const referencedLocalPaths = new Set(
    items
      .filter(i => i.sourceType === 'local_file_reference')
      .map(i => path.resolve(process.cwd(), "public", i.locationPath.replace(/^\//, '')))
  );

  const orphanedFiles = diskFiles.filter(d => !referencedLocalPaths.has(path.resolve(d)));

  const summary: StorageScanSummary = {
    timestamp: new Date().toISOString(),
    databaseSource: activeDbPath,
    totalReferencesFound: items.length,
    breakdown: {
      embeddedBase64: items.filter(i => i.sourceType === 'embedded_base64').length,
      localFileReferences: items.filter(i => i.sourceType === 'local_file_reference').length,
      externalUrls: items.filter(i => i.sourceType === 'external_url').length,
      permanentStorage: items.filter(i => i.sourceType === 'permanent_storage').length,
    },
    privacyClassification: {
      privateSensitiveFiles: items.filter(i => i.isPrivate).length,
      publicBrandingFiles: items.filter(i => !i.isPrivate).length,
    },
    diskFilesFound: diskFiles.length,
    orphanedDiskFiles: orphanedFiles.length,
    totalEstimatedBytes: items.reduce((acc, i) => acc + (i.estimatedSizeBytes || 0), 0),
    items
  };

  return summary;
}

// Execution entry point
if (process.argv[1] && process.argv[1].includes("scan_legacy_attachments")) {
  console.log("================================================================================");
  console.log("   أداة فحص وتشخيص الملفات والمرفقات - جمعية ريادة العطاء لخدمة الإنسان بالعسيلة   ");
  console.log("================================================================================\n");

  const report = scanAllLegacyAttachments();
  const outputPath = path.join(process.cwd(), "scripts", "scan_report.json");
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), "utf8");

  console.log(`[1] مصدر قاعدة البيانات المفحوص: ${report.databaseSource}`);
  console.log(`[2] إجمالي المراجع المكتشفة: ${report.totalReferencesFound}`);
  console.log(`   - ملفات Base64 مضمنة في DB (قابلة للترحيل): ${report.breakdown.embeddedBase64}`);
  console.log(`   - روابط ملفات محلية على قرص Render: ${report.breakdown.localFileReferences}`);
  console.log(`   - روابط خارجية (Unsplash / نماذج): ${report.breakdown.externalUrls}`);
  console.log(`   - ملفات مسجلة بالفعل في التخزين الدائم: ${report.breakdown.permanentStorage}`);
  console.log(`\n[3] تصنيف الخصوصية والأمان (نظام حماية البيانات الشخصية السعودي PDPL):`);
  console.log(`   - ملفات خاصة وحساسة (مستفيدون، هويات، مالية): ${report.privacyClassification.privateSensitiveFiles}`);
  console.log(`   - ملفات عامة (شعارات، قوالب بطاقات، أخبار): ${report.privacyClassification.publicBrandingFiles}`);
  console.log(`\n[4] فحص القرص المحلي:`);
  console.log(`   - ملفات موجودة على القرص: ${report.diskFilesFound}`);
  console.log(`   - ملفات غير مرتبطة (يتيمة على القرص): ${report.orphanedDiskFiles}`);
  console.log(`   - الحجم الإجمالي التقديري للبيانات: ${(report.totalEstimatedBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`\n✔ تم حفظ التقرير المفصل كاملاً في: ${outputPath}`);
  console.log("================================================================================\n");
}
