import crypto from "crypto";
import type { Express } from "express";
import type {
  VolunteerCharter,
  VolunteerCharterClause,
  VolunteerCharterStatus,
  VolunteerCharterVersion
} from "../src/types";

export const DEFAULT_CHARTER_CLAUSES: VolunteerCharterClause[] = [
  {
    id: "clause-1",
    order: 1,
    titleAr: "الالتزام برسالة الجمعية وقيم العمل التطوعي",
    titleEn: "Commitment to Association Mission & Volunteering Values",
    bodyAr:
      "يلتزم المتطوع بتمثيل جمعية ريادة العطاء لخدمة الإنسان بالعسيلة بصورة مشرفة، والعمل بإخلاص وتفانٍ لخدمة المستفيدين والمجتمع دون أي تمييز.",
    bodyEn:
      "The volunteer commits to honorably representing Reyadat Al-Ata Association for Human Services in Al-Asilah and serving beneficiaries and the community sincerely without discrimination."
  },
  {
    id: "clause-2",
    order: 2,
    titleAr: "السرية التامة وحماية بيانات المستفيدين",
    titleEn: "Strict Confidentiality & Beneficiary Data Protection",
    bodyAr:
      "يلتزم المتطوع بالحفاظ على سرية كافة معلومات وبيانات المستفيدين والمتطوعين والوثائق الرسمية وعدم تصويرها أو نشرها أو مشاركتها خارج القنوات المصرح بها.",
    bodyEn:
      "The volunteer must protect all confidential beneficiary, volunteer, and official association records, and refrain from photographing or sharing them outside authorized channels."
  },
  {
    id: "clause-3",
    order: 3,
    titleAr: "العمل تحت إشراف قائد الفريق وإدارة التطوع",
    titleEn: "Team Leadership & Volunteer Department Supervision",
    bodyAr:
      "يلتزم المتطوع بالتنسيق المباشر مع قائد الفريق التطوعي وإدارة شؤون التطوع، وتنفيذ المهام المسندة في مواعيدها المحددة وبالمظهر والسلوك اللائقين.",
    bodyEn:
      "The volunteer agrees to coordinate directly with the Team Leader and Volunteer Management Department, fulfilling assigned duties punctually with professional conduct."
  },
  {
    id: "clause-4",
    order: 4,
    titleAr: "السلامة الميدانية وحسن استخدام العهد والممتلكات",
    titleEn: "Field Safety & Proper Care of Association Assets",
    bodyAr:
      "يلتزم المتطوع بإرشادات الأمن والسلامة في الميدان وبالمحافظة على العهد والأدوات والبطاقات التطوعية المسلمة إليه وإعادتها فور انتهاء الحاجة أو طلب الإدارة.",
    bodyEn:
      "The volunteer shall follow field safety guidelines, safeguard association equipment, custody items, and ID cards, and return them promptly upon completion or management request."
  },
  {
    id: "clause-5",
    order: 5,
    titleAr: "النزاهة والشفافية وتجنب تضارب المصالح",
    titleEn: "Integrity, Transparency & Avoiding Conflicts of Interest",
    bodyAr:
      "يمتنع المتطوع عن استغلال صفته التطوعية لتحقيق أي مكاسب شخصية أو مالية، ويلتزم بالشفافية والإبلاغ الفوري عن أي تجاوزات أو عوائق ميدانية.",
    bodyEn:
      "The volunteer shall not use their volunteer status for personal or financial gain and must act with integrity and immediately report any operational issues."
  },
  {
    id: "clause-6",
    order: 6,
    titleAr: "التوثيق والحضور والاعتذار المسبق",
    titleEn: "Attendance Tracking & Prior Notice",
    bodyAr:
      "يلتزم المتطوع بتسجيل الحضور والانصراف في المبادرات عبر القنوات المعتمدة بالجمعية، وفي حال تعذر الحضور يتم إشعار قائد الفريق قبل الموعد بوقت كافٍ.",
    bodyEn:
      "The volunteer commits to logging attendance through approved association channels and notifying the Team Leader well in advance if unable to attend."
  }
];

function isTopAdminOrVolDept(authContext: any): boolean {
  if (!authContext || !authContext.isAuthenticated) return false;
  const role = String(authContext.role || "");
  if (
    role === "volunteer" ||
    role === "leader" ||
    role === "beneficiary" ||
    role === "public"
  ) {
    return false;
  }
  if (
    authContext.isSuperAdmin ||
    authContext.isOperationsManager ||
    role === "admin" ||
    role === "operations_manager" ||
    role === "super_admin"
  ) {
    return true;
  }
  if (!["department_admin", "employee", "supervisor"].includes(role)) {
    return false;
  }
  const allowedDepts: string[] = Array.isArray(authContext.allowedDepartmentIds)
    ? authContext.allowedDepartmentIds
    : [];
  const primaryDept = String(authContext.primaryDepartmentId || authContext.departmentId || "");
  return allowedDepts.includes("dep-5") || primaryDept === "dep-5";
}

export function createOrSyncVolunteerCharter(
  db: any,
  params: {
    volunteer: any;
    team?: any;
    acceptanceSource?: "application" | "manual_admin" | string;
    createdBy?: string;
    clauses?: VolunteerCharterClause[];
  }
): VolunteerCharter {
  if (!db) throw new Error("Database state unavailable");
  if (!Array.isArray(db.volunteerCharters)) {
    db.volunteerCharters = [];
  }

  const { volunteer, acceptanceSource = "application", createdBy = "إدارة شؤون التطوع", clauses } = params;
  const team =
    params.team ||
    (db.teams || []).find((t: any) => t && t.id === volunteer?.teamId) || {
      id: volunteer?.teamId || "team-unassigned",
      nameAr: "فريق تطوعي معتمد",
      nameEn: "Accredited Volunteer Team",
      leaderId: volunteer?.teamId ? `leader-${volunteer.teamId}` : undefined,
      leaderName: "قائد الفريق التطوعي"
    };

  // Avoid creating duplicates if an unarchived charter already exists for the exact same volunteer & team
  const existing = db.volunteerCharters.find(
    (c: any) => c && c.volunteerId === volunteer.id && c.teamId === team.id
  );
  if (existing) {
    return existing;
  }

  const nowIso = new Date().toISOString();
  const seq = String(db.volunteerCharters.length + 1).padStart(4, "0");
  const versionClauses = Array.isArray(clauses) && clauses.length > 0 ? clauses : DEFAULT_CHARTER_CLAUSES;

  const v1: VolunteerCharterVersion = {
    version: 1,
    titleAr: "ميثاق العمل التطوعي الإلكتروني - الإصدار (1)",
    titleEn: "Electronic Volunteer Charter - Version 1",
    clauses: versionClauses.map((cl, i) => ({ ...cl, order: cl.order || i + 1 })),
    createdAt: nowIso,
    createdBy,
    status: "awaiting_volunteer_signature",
    volunteerAgreed: false,
    volunteerSignatureName: "",
    volunteerSignedAt: null,
    volunteerSignedIp: null,
    leaderId: team.leaderId || (team.id ? `leader-${team.id}` : null),
    leaderName: team.leaderName || "قائد الفريق",
    leaderApprovedAt: null,
    leaderRejectedAt: null,
    rejectionReason: null,
    leaderNotes: null,
    locked: false
  };

  const charter: VolunteerCharter = {
    id: `charter-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    charterNumber: `VCH-${new Date().getFullYear()}-${seq}`,
    associationNameAr:
      db.homeSettings?.associationNameAr || "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة",
    associationNameEn:
      db.homeSettings?.associationNameEn ||
      "Reyadat Al-Ata Association for Human Services in Al-Asilah",
    volunteerId: volunteer.id,
    volunteerName: volunteer.name,
    volunteerNationalId: volunteer.nationalId || "",
    volunteerMembershipNumber: volunteer.membershipNumber || volunteer.fileNumber || "",
    teamId: team.id,
    teamNameAr: team.nameAr || team.name || "فريق تطوعي",
    teamNameEn: team.nameEn || team.nameAr || "Volunteer Team",
    leaderId: team.leaderId || (team.id ? `leader-${team.id}` : ""),
    leaderName: team.leaderName || "قائد الفريق",
    acceptanceDate: nowIso,
    acceptanceSource,
    currentVersion: 1,
    status: "awaiting_volunteer_signature",
    locked: false,
    volunteerAgreed: false,
    volunteerSignatureName: "",
    volunteerSignedAt: null,
    leaderApprovedAt: null,
    leaderRejectedAt: null,
    rejectionReason: null,
    versions: [v1],
    auditLog: [
      {
        id: `vlog-${Date.now()}`,
        action: "charter_created",
        actorId: "system",
        actorName: createdBy,
        actorRole: "system",
        version: 1,
        timestamp: nowIso,
        notes: `إنشاء ميثاق التطوع الإلكتروني تلقائياً للمتطوع (${volunteer.name}) ضمن فريق (${team.nameAr || team.id})`
      }
    ],
    createdAt: nowIso,
    updatedAt: nowIso
  };

  db.volunteerCharters.unshift(charter);

  // Send notification to volunteer about pending charter signature
  if (!Array.isArray(db.notifications)) db.notifications = [];
  db.notifications.unshift({
    id: `not-charter-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId: volunteer.id,
    targetUserId: volunteer.id,
    titleAr: "ميثاق التطوع الإلكتروني بانتظار توقيعك",
    titleEn: "Volunteer Charter Awaiting Your Signature",
    bodyAr: `تم إصدار ميثاق التطوع الإلكتروني الخاص بك ضمن فريق (${team.nameAr || ""}). يرجى الاطلاع على البنود والتوقيع إلكترونياً لإرساله لاعتماد قائد الفريق.`,
    bodyEn: `Your electronic Volunteer Charter for team (${team.nameEn || team.nameAr || ""}) is ready for your electronic signature.`,
    date: nowIso.split("T")[0],
    read: false,
    type: "volunteer_charter"
  });

  return charter;
}

export function filterVolunteerChartersForUser(db: any, authContext: any): VolunteerCharter[] {
  const all: VolunteerCharter[] = Array.isArray(db?.volunteerCharters)
    ? db.volunteerCharters
    : [];
  if (!authContext || !authContext.isAuthenticated) return [];
  if (isTopAdminOrVolDept(authContext)) {
    return all;
  }
  const role = String(authContext.role || "");
  if (role === "leader") {
    const teamId = String(authContext.teamId || "");
    if (!teamId) return [];
    return all.filter((c) => c && c.teamId === teamId);
  }
  if (role === "volunteer") {
    const uid = String(authContext.userId || "");
    const nid = String(authContext.nationalId || "");
    return all.filter(
      (c) =>
        c &&
        (c.volunteerId === uid || (nid && c.volunteerNationalId && c.volunteerNationalId === nid))
    );
  }
  return [];
}

export function registerVolunteerCharterRoutes(
  app: Express,
  deps: {
    readDb: () => any;
    mutateDb: (mutator: (db: any) => any) => Promise<any>;
    getUserAccessContext: (req: any) => any;
  }
) {
  const { readDb, mutateDb, getUserAccessContext } = deps;

  // 1. List Volunteer Charters scoped strictly by caller role/team/ownership
  app.get("/api/volunteer-charters", (req, res) => {
    const authContext = getUserAccessContext(req);
    if (!authContext || !authContext.isAuthenticated || authContext.role === "public") {
      return res.status(401).json({ ok: false, error: "يجب تسجيل الدخول أولاً للاطلاع على ميثاق التطوع.", code: "UNAUTHORIZED" });
    }

    const role = String(authContext.role || "");
    const allowed =
      isTopAdminOrVolDept(authContext) || role === "leader" || role === "volunteer";
    if (!allowed) {
      return res.status(403).json({
        ok: false,
        error: "غير مصرح لك بالوصول إلى سجلات ميثاق التطوع الإلكتروني.",
        code: "FORBIDDEN"
      });
    }

    const db = readDb();
    const charters = filterVolunteerChartersForUser(db, authContext);
    return res.json({ ok: true, charters });
  });

  // 2. Volunteer Signs Own Charter
  app.post("/api/volunteer-charters/:id/volunteer-sign", async (req, res) => {
    const authContext = getUserAccessContext(req);
    if (!authContext || !authContext.isAuthenticated || authContext.role === "public") {
      return res.status(401).json({ ok: false, error: "يجب تسجيل الدخول أولاً.", code: "UNAUTHORIZED" });
    }

    const { id } = req.params;
    const { agreed, signatureName } = req.body || {};
    if (agreed !== true) {
      return res.status(400).json({ ok: false, error: "يجب الموافقة الصريحة على كافة بنود ميثاق التطوع قبل التوقيع." });
    }
    const cleanSig = String(signatureName || "").trim();
    if (cleanSig.length < 2) {
      return res.status(400).json({ ok: false, error: "يرجى كتابة الاسم الكامل للتوقيع الإلكتروني." });
    }

    try {
      const outcome = await mutateDb((db) => {
        if (!Array.isArray(db.volunteerCharters)) db.volunteerCharters = [];
        const charter: VolunteerCharter | undefined = db.volunteerCharters.find(
          (c: any) => c && c.id === id
        );
        if (!charter) {
          return { status: 404, payload: { ok: false, error: "سجل ميثاق التطوع غير موجود." } };
        }

        // Strict ownership verification: ONLY the volunteer who owns this charter can sign it
        const isOwner =
          authContext.role === "volunteer" &&
          (charter.volunteerId === authContext.userId ||
            (authContext.nationalId && charter.volunteerNationalId === authContext.nationalId));
        if (!isOwner) {
          return {
            status: 403,
            payload: { ok: false, error: "غير مصرح: يوقّع المتطوع على ميثاقه الشخصي فقط.", code: "FORBIDDEN" }
          };
        }

        if (charter.locked || charter.status === "approved_by_leader") {
          return {
            status: 409,
            payload: {
              ok: false,
              error: "تم اعتماد هذا الميثاق مسبقاً من قائد الفريق وأصبح مقفلاً ولا يمكن تعديله أو إعادة توقيعه.",
              code: "CHARTER_LOCKED"
            }
          };
        }

        const nowIso = new Date().toISOString();
        const clientIp =
          (typeof req.headers["x-forwarded-for"] === "string"
            ? req.headers["x-forwarded-for"].split(",")[0].trim()
            : "") ||
          req.ip ||
          "127.0.0.1";

        const activeVerIdx = charter.versions.findIndex(
          (v) => v.version === charter.currentVersion
        );
        if (activeVerIdx !== -1) {
          charter.versions[activeVerIdx] = {
            ...charter.versions[activeVerIdx],
            volunteerAgreed: true,
            volunteerSignatureName: cleanSig,
            volunteerSignedAt: nowIso,
            volunteerSignedIp: clientIp,
            leaderRejectedAt: null,
            rejectionReason: null,
            status: "awaiting_leader_approval"
          };
        }

        charter.volunteerAgreed = true;
        charter.volunteerSignatureName = cleanSig;
        charter.volunteerSignedAt = nowIso;
        charter.leaderRejectedAt = null;
        charter.rejectionReason = null;
        charter.status = "awaiting_leader_approval";
        charter.updatedAt = nowIso;

        if (!Array.isArray(charter.auditLog)) charter.auditLog = [];
        charter.auditLog.unshift({
          id: `vlog-${Date.now()}`,
          action: "volunteer_signed",
          actorId: authContext.userId,
          actorName: authContext.userName || charter.volunteerName,
          actorRole: "volunteer",
          version: charter.currentVersion,
          timestamp: nowIso,
          notes: `توقيع المتطوع (${cleanSig}) وإرسال الميثاق لاعتماد قائد الفريق (${charter.leaderName})`
        });

        if (!Array.isArray(db.notifications)) db.notifications = [];
        db.notifications.unshift({
          id: `not-ch-sign-${Date.now()}`,
          userId: charter.leaderId || `leader-${charter.teamId}`,
          targetUserId: charter.leaderId || `leader-${charter.teamId}`,
          titleAr: `ميثاق تطوع موقع بانتظار اعتمادك: ${charter.volunteerName}`,
          titleEn: `Volunteer Charter Signed by ${charter.volunteerName}`,
          bodyAr: `قام المتطوع (${charter.volunteerName}) في فريق (${charter.teamNameAr}) بالتوقيع الإلكتروني على ميثاق التطوع (#${charter.charterNumber}). يرجى المراجعة والاعتماد.`,
          bodyEn: `${charter.volunteerName} signed charter #${charter.charterNumber}. Awaiting leader approval.`,
          date: nowIso.split("T")[0],
          read: false,
          type: "volunteer_charter"
        });

        if (!Array.isArray(db.logs)) db.logs = [];
        db.logs.unshift({
          id: `log-ch-sign-${Date.now()}`,
          timestamp: nowIso,
          user: charter.volunteerName,
          action: `توقيع المتطوع (${charter.volunteerName}) على ميثاق التطوع الإلكتروني (#${charter.charterNumber}) الإصدار ${charter.currentVersion}`,
          ip: clientIp,
          device: (req.headers["user-agent"] || "Web Browser").substring(0, 100)
        });

        return {
          status: 200,
          payload: {
            ok: true,
            status: "success",
            charter,
            message: "تم توقيع ميثاق التطوع إلكترونياً وإرساله لاعتماد قائد الفريق."
          }
        };
      });

      return res.status(outcome.status).json(outcome.payload);
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message || "فشل توقيع الميثاق." });
    }
  });

  // 3. Team Leader Approve or Reject Charter (Strict Team Scope + Immutable Lock on Approval)
  app.post("/api/volunteer-charters/:id/leader-action", async (req, res) => {
    const authContext = getUserAccessContext(req);
    if (!authContext || !authContext.isAuthenticated || authContext.role === "public") {
      return res.status(401).json({ ok: false, error: "يجب تسجيل الدخول أولاً.", code: "UNAUTHORIZED" });
    }

    const { id } = req.params;
    const { action, rejectionReason, notes } = req.body || {};
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ ok: false, error: "الإجراء المطلوب غير صالح (approve | reject)." });
    }
    if (action === "reject" && (!rejectionReason || !String(rejectionReason).trim())) {
      return res.status(400).json({ ok: false, error: "يجب توضيح سبب الرفض أو الملاحظة المطلوبة من المتطوع." });
    }

    const role = String(authContext.role || "");
    const isLeader = role === "leader";
    const isVolAdmin = isTopAdminOrVolDept(authContext);

    if (!isLeader && !isVolAdmin) {
      return res.status(403).json({
        ok: false,
        error: "غير مصرح: اعتماد أو رفض ميثاق التطوع متاح لقائد الفريق المعني أو إدارة التطوع فقط.",
        code: "FORBIDDEN"
      });
    }

    try {
      const outcome = await mutateDb((db) => {
        if (!Array.isArray(db.volunteerCharters)) db.volunteerCharters = [];
        const charter: VolunteerCharter | undefined = db.volunteerCharters.find(
          (c: any) => c && c.id === id
        );
        if (!charter) {
          return { status: 404, payload: { ok: false, error: "سجل ميثاق التطوع غير موجود." } };
        }

        // Cross-Team Isolation Check: A Team Leader MUST ONLY act on their own team's volunteers
        if (isLeader) {
          const leaderTeamId = String(authContext.teamId || "");
          if (!leaderTeamId || charter.teamId !== leaderTeamId) {
            return {
              status: 403,
              payload: {
                ok: false,
                error: "ممنوع: لا يمكن لقائد فريق الوصول إلى أو اعتماد ميثاق متطوع يتبع لفريق آخر.",
                code: "CROSS_TEAM_FORBIDDEN"
              }
            };
          }
        }

        if (charter.locked || charter.status === "approved_by_leader") {
          return {
            status: 409,
            payload: {
              ok: false,
              error: "هذا الإصدار من الميثاق معتمد ومقفل نهائياً ولا يمكن تعديله.",
              code: "CHARTER_LOCKED"
            }
          };
        }

        if (action === "approve" && !charter.volunteerSignedAt && charter.status === "awaiting_volunteer_signature") {
          return {
            status: 400,
            payload: {
              ok: false,
              error: "لا يمكن اعتماد الميثاق قبل توقيع المتطوع عليه إلكترونياً."
            }
          };
        }

        const nowIso = new Date().toISOString();
        const nextStatus: VolunteerCharterStatus =
          action === "approve" ? "approved_by_leader" : "rejected";
        const activeVerIdx = charter.versions.findIndex(
          (v) => v.version === charter.currentVersion
        );

        if (action === "approve") {
          charter.status = "approved_by_leader";
          charter.locked = true;
          charter.leaderApprovedAt = nowIso;
          charter.leaderRejectedAt = null;
          charter.rejectionReason = null;
          if (activeVerIdx !== -1) {
            charter.versions[activeVerIdx] = {
              ...charter.versions[activeVerIdx],
              status: "approved_by_leader",
              locked: true,
              leaderId: authContext.userId,
              leaderName: authContext.userName || charter.leaderName,
              leaderApprovedAt: nowIso,
              leaderRejectedAt: null,
              rejectionReason: null,
              leaderNotes: notes ? String(notes).trim() : null
            };
          }
        } else {
          const cleanReason = String(rejectionReason).trim();
          charter.status = "rejected";
          charter.locked = false;
          charter.leaderRejectedAt = nowIso;
          charter.rejectionReason = cleanReason;
          if (activeVerIdx !== -1) {
            charter.versions[activeVerIdx] = {
              ...charter.versions[activeVerIdx],
              status: "rejected",
              locked: false,
              leaderId: authContext.userId,
              leaderName: authContext.userName || charter.leaderName,
              leaderRejectedAt: nowIso,
              rejectionReason: cleanReason,
              leaderNotes: notes ? String(notes).trim() : null
            };
          }
        }
        charter.updatedAt = nowIso;

        if (!Array.isArray(charter.auditLog)) charter.auditLog = [];
        charter.auditLog.unshift({
          id: `vlog-${Date.now()}`,
          action: action === "approve" ? "leader_approved" : "leader_rejected",
          actorId: authContext.userId,
          actorName: authContext.userName || charter.leaderName,
          actorRole: role,
          version: charter.currentVersion,
          timestamp: nowIso,
          notes:
            action === "approve"
              ? `اعتماد نهائي لميثاق التطوع وإقفال الإصدار (${charter.currentVersion})`
              : `رفض ميثاق التطوع بسبب: ${charter.rejectionReason}`
        });

        if (!Array.isArray(db.notifications)) db.notifications = [];
        db.notifications.unshift({
          id: `not-ch-act-${Date.now()}`,
          userId: charter.volunteerId,
          targetUserId: charter.volunteerId,
          titleAr:
            action === "approve"
              ? `تم اعتماد ميثاق التطوع الإلكتروني الخاص بك ✓`
              : `ملاحظة على ميثاق التطوع الإلكتروني الخاص بك`,
          titleEn:
            action === "approve"
              ? `Your Volunteer Charter Has Been Approved`
              : `Action Needed on Your Volunteer Charter`,
          bodyAr:
            action === "approve"
              ? `اعتمد قائد فريق (${charter.teamNameAr}) ميثاق التطوع الخاص بك (#${charter.charterNumber}). يمكنك الآن الاطلاع عليه وطباعته كملف PDF.`
              : `تمت إعادة ميثاق التطوع (#${charter.charterNumber}) بالملاحظة التالية: ${charter.rejectionReason}`,
          bodyEn:
            action === "approve"
              ? `Charter #${charter.charterNumber} has been approved and is ready for PDF printing.`
              : `Charter #${charter.charterNumber} requires attention: ${charter.rejectionReason}`,
          date: nowIso.split("T")[0],
          read: false,
          type: "volunteer_charter"
        });

        if (!Array.isArray(db.logs)) db.logs = [];
        db.logs.unshift({
          id: `log-ch-act-${Date.now()}`,
          timestamp: nowIso,
          user: authContext.userName || charter.leaderName,
          action:
            action === "approve"
              ? `اعتماد ميثاق التطوع (#${charter.charterNumber}) للمتطوع (${charter.volunteerName})`
              : `رفض ميثاق التطوع (#${charter.charterNumber}) للمتطوع (${charter.volunteerName}) - السبب: ${charter.rejectionReason}`,
          ip: req.ip || "127.0.0.1",
          device: (req.headers["user-agent"] || "Leader Portal").substring(0, 100)
        });

        return {
          status: 200,
          payload: {
            ok: true,
            status: "success",
            charter,
            nextStatus,
            message:
              action === "approve"
                ? "تم اعتماد ميثاق التطوع وإقفال النسخة وحفظ التوقيعات بنجاح."
                : "تم تسجيل رفض الميثاق وإشعار المتطوع بالسبب."
          }
        };
      });

      return res.status(outcome.status).json(outcome.payload);
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message || "فشل معالجة إجراء الميثاق." });
    }
  });

  // 4. Issue New Version of Charter (Preserves all prior signed/approved versions intact!)
  app.post("/api/volunteer-charters/:id/new-version", async (req, res) => {
    const authContext = getUserAccessContext(req);
    if (!authContext || !authContext.isAuthenticated || authContext.role === "public") {
      return res.status(401).json({ ok: false, error: "يجب تسجيل الدخول أولاً.", code: "UNAUTHORIZED" });
    }
    if (!isTopAdminOrVolDept(authContext)) {
      return res.status(403).json({
        ok: false,
        error: "غير مصرح: إصدار نسخة جديدة من ميثاق التطوع مقتصر على الإدارة العليا أو إدارة التطوع.",
        code: "FORBIDDEN"
      });
    }

    const { id } = req.params;
    const { titleAr, titleEn, clauses, notes } = req.body || {};

    try {
      const outcome = await mutateDb((db) => {
        if (!Array.isArray(db.volunteerCharters)) db.volunteerCharters = [];
        const charter: VolunteerCharter | undefined = db.volunteerCharters.find(
          (c: any) => c && c.id === id
        );
        if (!charter) {
          return { status: 404, payload: { ok: false, error: "سجل ميثاق التطوع غير موجود." } };
        }

        const nowIso = new Date().toISOString();
        // Freeze prior versions cleanly without deleting their signatures/approvals
        charter.versions = (charter.versions || []).map((v) => ({
          ...v,
          locked: true
        }));

        const nextVerNum = (charter.versions?.length || charter.currentVersion || 1) + 1;
        const baseClauses =
          Array.isArray(clauses) && clauses.length > 0 ? clauses : DEFAULT_CHARTER_CLAUSES;

        const newVersion: VolunteerCharterVersion = {
          version: nextVerNum,
          titleAr:
            (titleAr && String(titleAr).trim()) ||
            `ميثاق العمل التطوعي الإلكتروني - الإصدار (${nextVerNum})`,
          titleEn:
            (titleEn && String(titleEn).trim()) ||
            `Electronic Volunteer Charter - Version ${nextVerNum}`,
          clauses: baseClauses.map((cl: any, idx: number) => ({
            id: cl.id || `clause-${idx + 1}`,
            order: cl.order || idx + 1,
            titleAr: String(cl.titleAr || "").trim(),
            titleEn: String(cl.titleEn || "").trim(),
            bodyAr: String(cl.bodyAr || "").trim(),
            bodyEn: String(cl.bodyEn || "").trim()
          })),
          createdAt: nowIso,
          createdBy: authContext.userName || "إدارة التطوع",
          status: "awaiting_volunteer_signature",
          volunteerAgreed: false,
          volunteerSignatureName: "",
          volunteerSignedAt: null,
          volunteerSignedIp: null,
          leaderId: charter.leaderId || null,
          leaderName: charter.leaderName,
          leaderApprovedAt: null,
          leaderRejectedAt: null,
          rejectionReason: null,
          leaderNotes: notes ? String(notes).trim() : null,
          locked: false
        };

        charter.versions.push(newVersion);
        charter.currentVersion = nextVerNum;
        charter.status = "awaiting_volunteer_signature";
        charter.locked = false;
        charter.volunteerAgreed = false;
        charter.volunteerSignatureName = "";
        charter.volunteerSignedAt = null;
        charter.leaderApprovedAt = null;
        charter.leaderRejectedAt = null;
        charter.rejectionReason = null;
        charter.updatedAt = nowIso;

        if (!Array.isArray(charter.auditLog)) charter.auditLog = [];
        charter.auditLog.unshift({
          id: `vlog-${Date.now()}`,
          action: "new_version_issued",
          actorId: authContext.userId,
          actorName: authContext.userName || "إدارة التطوع",
          actorRole: authContext.role || "admin",
          version: nextVerNum,
          timestamp: nowIso,
          notes:
            notes ||
            `إصدار النسخة رقم (${nextVerNum}) مع الاحتفاظ بسجل التوقيعات المعتمدة للإصدارات السابقة`
        });

        if (!Array.isArray(db.notifications)) db.notifications = [];
        db.notifications.unshift({
          id: `not-ch-ver-${Date.now()}`,
          userId: charter.volunteerId,
          targetUserId: charter.volunteerId,
          titleAr: `تحديث جديد لميثاق التطوع (الإصدار ${nextVerNum})`,
          titleEn: `Updated Volunteer Charter (Version ${nextVerNum})`,
          bodyAr: `تم إصدار نسخة محدثة (الإصدار ${nextVerNum}) من ميثاق التطوع الإلكتروني مع حفظ نسختك الموقعة السابقة بالأرشيف. يرجى مراجعته وتوقيعه.`,
          bodyEn: `A new version (v${nextVerNum}) of your Volunteer Charter has been issued for review and signature.`,
          date: nowIso.split("T")[0],
          read: false,
          type: "volunteer_charter"
        });

        return {
          status: 200,
          payload: {
            ok: true,
            status: "success",
            charter,
            message: `تم إصدار النسخة (${nextVerNum}) من الميثاق مع حفظ السجلات والتوقيعات السابقة كاملة.`
          }
        };
      });

      return res.status(outcome.status).json(outcome.payload);
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err?.message || "فشل إصدار نسخة الميثاق الجديدة." });
    }
  });

  // 5. Volunteer Teams Directory Overview (Strictly Restricted to Volunteer Dept dep-5 & Top Admin!)
  app.get("/api/volunteer-teams-overview", (req, res) => {
    const authContext = getUserAccessContext(req);
    if (!authContext || !authContext.isAuthenticated || authContext.role === "public") {
      return res.status(401).json({
        ok: false,
        error: "يجب تسجيل الدخول أولاً.",
        code: "UNAUTHORIZED"
      });
    }
    if (!isTopAdminOrVolDept(authContext)) {
      return res.status(403).json({
        ok: false,
        error: "غير مصرح: خانة الفرق التطوعية مخصصة لإدارة التطوع والإدارة العليا فقط.",
        code: "FORBIDDEN"
      });
    }

    const db = readDb();
    const teams: any[] = Array.isArray(db.teams) ? db.teams : [];
    const volunteers: any[] = (Array.isArray(db.volunteers) ? db.volunteers : []).filter(
      (v) => v && !v.isArchived && v.status !== "archived"
    );
    const charters: VolunteerCharter[] = Array.isArray(db.volunteerCharters)
      ? db.volunteerCharters
      : [];

    const enrichedTeams = teams.map((t) => {
      const teamMembers = volunteers
        .filter((v) => v.teamId === t.id)
        .map((v) => {
          const ch = charters.find((c) => c.volunteerId === v.id && c.teamId === t.id) ||
            charters.find((c) => c.volunteerId === v.id);
          return {
            id: v.id,
            name: v.name,
            email: v.email || "",
            phone: v.phone || "",
            nationalId: v.nationalId || "",
            membershipNumber: v.membershipNumber || "",
            fileNumber: v.fileNumber || v.file_number || "",
            titleAr: v.titleAr || "متطوع",
            status: v.status || "active",
            profileCompleted: v.profileCompleted !== false,
            addedManually: Boolean(v.addedManually),
            points: Number(v.points || 0),
            volunteerHours: Number(v.volunteerHours || v.hours || 0),
            joinDate: v.joinDate || v.issueDate || "",
            charter: ch
              ? {
                  id: ch.id,
                  charterNumber: ch.charterNumber,
                  currentVersion: ch.currentVersion,
                  status: ch.status,
                  locked: ch.locked,
                  volunteerSignedAt: ch.volunteerSignedAt || null,
                  leaderApprovedAt: ch.leaderApprovedAt || null,
                  leaderRejectedAt: ch.leaderRejectedAt || null
                }
              : null
          };
        });

      return {
        id: t.id,
        nameAr: t.nameAr || t.name || "فريق تطوعي",
        nameEn: t.nameEn || "",
        departmentId: t.departmentId || "dep-5",
        leaderId: t.leaderId || `leader-${t.id}`,
        leaderName: t.leaderName || "",
        leaderPhone: t.leaderPhone || "",
        leaderEmail: t.leaderEmail || "",
        city: t.city || "مكة المكرمة",
        status: t.status || "active",
        logoUrl: t.logoUrl || "",
        descriptionAr: t.descriptionAr || "",
        descriptionEn: t.descriptionEn || "",
        vision: t.visionAr || t.vision || "",
        visionAr: t.visionAr || t.vision || "",
        visionEn: t.visionEn || "",
        mission: t.missionAr || t.mission || "",
        missionAr: t.missionAr || t.mission || "",
        missionEn: t.missionEn || "",
        goals: t.goalsAr || t.goals || "",
        goalsAr: t.goalsAr || t.goals || "",
        goalsEn: t.goalsEn || "",
        leaderLicenseUrl: t.leaderLicenseUrl || "",
        leaderLicenseName: t.leaderLicenseName || "",
        points: Number(t.points || 0),
        acceptingVolunteers: t.acceptingVolunteers !== false,
        showOnHomepage: t.showOnHomepage !== false,
        membersCount: teamMembers.length,
        members: teamMembers
      };
    });

    return res.json({
      ok: true,
      teams: enrichedTeams,
      summary: {
        totalTeams: enrichedTeams.length,
        totalMembers: enrichedTeams.reduce((acc, tm) => acc + tm.membersCount, 0),
        totalSignedCharters: charters.filter((c) => Boolean(c.volunteerSignedAt)).length,
        totalApprovedCharters: charters.filter((c) => c.status === "approved_by_leader").length
      }
    });
  });
}
