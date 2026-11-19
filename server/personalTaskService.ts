import crypto from "crypto";
import type { Express } from "express";
import { sendCentralEmail } from "./emailService";

export type PersonalTaskStatus = "not_started" | "in_progress" | "completed" | "postponed";
export type PersonalTaskReminderOption = "24h" | "1h" | "30m" | "15m" | "at_start" | "custom";

export interface PersonalTaskDeps {
  readDb: () => any;
  mutateDb: <T>(mutator: (db: any) => Promise<T> | T) => Promise<T>;
  getUserAccessContext: (req: any) => any;
  getServerSession: (token?: string) => any;
  resolveLiveUserAccount: (db: any, userId: string, roleHint?: string, nationalIdHint?: string) => any;
}

const RIYADH_OFFSET_MS = 3 * 60 * 60 * 1000;
const VALID_STATUSES: PersonalTaskStatus[] = ["not_started", "in_progress", "completed", "postponed"];
const VALID_REMINDER_OPTIONS: PersonalTaskReminderOption[] = ["24h", "1h", "30m", "15m", "at_start", "custom"];
const MAX_REMINDER_ATTEMPTS = 3;

let schedulerTimer: NodeJS.Timeout | null = null;
let isProcessingReminders = false;
let registeredDeps: PersonalTaskDeps | null = null;

function extractSessionToken(req: any): string | undefined {
  return (
    (req.headers["x-session-token"] as string) ||
    (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.substring(7) : undefined) ||
    req.cookies?.["reyadat_session"]
  );
}

export function getNowRiyadhParts(nowMs: number = Date.now()) {
  const riyadhDate = new Date(nowMs + RIYADH_OFFSET_MS);
  const year = riyadhDate.getUTCFullYear();
  const month = riyadhDate.getUTCMonth() + 1;
  const day = riyadhDate.getUTCDate();
  const hours = riyadhDate.getUTCHours();
  const minutes = riyadhDate.getUTCMinutes();
  const weekday = riyadhDate.getUTCDay(); // 0 = Sun, 6 = Sat

  const pad = (n: number) => String(n).padStart(2, "0");
  const dateStr = `${year}-${pad(month)}-${pad(day)}`;
  const timeStr = `${pad(hours)}:${pad(minutes)}`;

  const tomorrowDate = new Date(nowMs + RIYADH_OFFSET_MS + 24 * 60 * 60 * 1000);
  const tomorrowStr = `${tomorrowDate.getUTCFullYear()}-${pad(tomorrowDate.getUTCMonth() + 1)}-${pad(tomorrowDate.getUTCDate())}`;

  // Saudi week: Sunday (0) to Saturday (6)
  const weekStart = new Date(Date.UTC(year, month - 1, day - weekday));
  const weekEnd = new Date(Date.UTC(year, month - 1, day - weekday + 6));
  const monthStartStr = `${year}-${pad(month)}-01`;
  const monthLastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthEndStr = `${year}-${pad(month)}-${pad(monthLastDay)}`;

  const fmtUtcDate = (d: Date) =>
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

  return {
    year,
    month,
    day,
    dateStr,
    timeStr,
    tomorrowStr,
    weekStartStr: fmtUtcDate(weekStart),
    weekEndStr: fmtUtcDate(weekEnd),
    monthStartStr,
    monthEndStr
  };
}

export function parseRiyadhDateTimeToIso(startDate: string, startTime: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(startDate || "").trim())) return null;
  if (!/^\d{2}:\d{2}$/.test(String(startTime || "").trim())) return null;
  const parsed = new Date(`${startDate.trim()}T${startTime.trim()}:00+03:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function parseCustomReminderToIso(customReminderAt?: string | null): string | null {
  const raw = String(customReminderAt || "").trim();
  if (!raw) return null;
  // If user passes YYYY-MM-DDTHH:mm without timezone, interpret as Asia/Riyadh (+03:00)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(raw)) {
    const withSec = raw.length === 16 ? `${raw}:00` : raw;
    const d = new Date(`${withSec}+03:00`);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function computeReminderAtIso(
  startAtIso: string,
  option: PersonalTaskReminderOption,
  customReminderAt?: string | null
): { reminderAtIso: string | null; error?: string } {
  const startMs = new Date(startAtIso).getTime();
  if (Number.isNaN(startMs)) {
    return { reminderAtIso: null, error: "تاريخ أو وقت بداية المهمة غير صالح." };
  }

  switch (option) {
    case "24h":
      return { reminderAtIso: new Date(startMs - 24 * 60 * 60 * 1000).toISOString() };
    case "1h":
      return { reminderAtIso: new Date(startMs - 60 * 60 * 1000).toISOString() };
    case "30m":
      return { reminderAtIso: new Date(startMs - 30 * 60 * 1000).toISOString() };
    case "15m":
      return { reminderAtIso: new Date(startMs - 15 * 60 * 1000).toISOString() };
    case "at_start":
      return { reminderAtIso: new Date(startMs).toISOString() };
    case "custom": {
      const customIso = parseCustomReminderToIso(customReminderAt);
      if (!customIso) {
        return { reminderAtIso: null, error: "يرجى تحديد تاريخ ووقت التذكير المخصص بشكل صحيح." };
      }
      if (new Date(customIso).getTime() > startMs) {
        return { reminderAtIso: null, error: "لا يمكن ضبط وقت التذكير المخصص بعد وقت بداية المهمة." };
      }
      return { reminderAtIso: customIso };
    }
    default:
      return { reminderAtIso: null, error: "خيار التذكير المحدد غير مدعوم." };
  }
}

export function formatArabicDateFromRiyadh(dateStr: string): string {
  try {
    const d = new Date(`${dateStr}T12:00:00+03:00`);
    return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
      timeZone: "Asia/Riyadh",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function formatArabicTime(timeStr: string): string {
  const [hStr, mStr] = String(timeStr || "00:00").split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return timeStr;
  const period = h >= 12 ? "مساءً" : "صباحاً";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}

export function getRemainingLabelAr(
  option: PersonalTaskReminderOption,
  startAtIso: string,
  reminderAtIso?: string | null
): string {
  switch (option) {
    case "24h":
      return "قبل 24 ساعة من بداية المهمة";
    case "1h":
      return "قبل ساعة واحدة من بداية المهمة";
    case "30m":
      return "قبل 30 دقيقة من بداية المهمة";
    case "15m":
      return "قبل 15 دقيقة من بداية المهمة";
    case "at_start":
      return "عند وقت بداية المهمة الآن";
    case "custom": {
      if (!reminderAtIso) return "تذكير مخصص";
      const diffMin = Math.max(0, Math.round((new Date(startAtIso).getTime() - new Date(reminderAtIso).getTime()) / 60000));
      if (diffMin === 0) return "عند وقت بداية المهمة";
      if (diffMin < 60) return `قبل ${diffMin} دقيقة من بداية المهمة`;
      const hrs = Math.floor(diffMin / 60);
      const mins = diffMin % 60;
      if (hrs < 24) {
        return mins > 0
          ? `قبل ${hrs} ساعة و ${mins} دقيقة من بداية المهمة`
          : `قبل ${hrs} ${hrs === 1 ? "ساعة" : "ساعات"} من بداية المهمة`;
      }
      const days = Math.floor(hrs / 24);
      return `قبل ${days} ${days === 1 ? "يوم" : "أيام"} من بداية المهمة`;
    }
    default:
      return "موعد قريب";
  }
}

function getOwnerIdentifiers(db: any, context: any, session: any): {
  canonicalUserId: string;
  aliases: Set<string>;
  ownerName: string;
  ownerEmail: string;
} {
  const aliases = new Set<string>();
  const addAlias = (v: any) => {
    if (typeof v === "string" && v.trim()) aliases.add(v.trim());
  };

  addAlias(context?.userId);
  addAlias(session?.userId);
  addAlias(session?.user?.id);
  addAlias(session?.user?.userId);

  const live = registeredDeps?.resolveLiveUserAccount
    ? registeredDeps.resolveLiveUserAccount(db, context.userId, context.role, context.nationalId)
    : null;
  if (live?.user) {
    addAlias(live.user.id);
    addAlias(live.user.userId);
  }

  let ownerEmail =
    session?.user?.email ||
    session?.user?.userEmail ||
    live?.user?.email ||
    live?.user?.userEmail ||
    "";

  let ownerName =
    context?.userName ||
    session?.userName ||
    session?.user?.name ||
    live?.user?.name ||
    "المستخدم";

  if (!ownerEmail && Array.isArray(db?.userDepartmentAccess)) {
    const acc = db.userDepartmentAccess.find((u: any) => u && (aliases.has(u.userId) || aliases.has(u.id)));
    if (acc) {
      ownerEmail = acc.userEmail || acc.email || ownerEmail;
      ownerName = acc.userName || acc.name || ownerName;
    }
  }
  if (!ownerEmail && Array.isArray(db?.employees)) {
    const emp = db.employees.find((e: any) => e && (aliases.has(e.id) || aliases.has(e.userId)));
    if (emp) {
      ownerEmail = emp.email || ownerEmail;
      ownerName = emp.name || ownerName;
    }
  }
  if (!ownerEmail && Array.isArray(db?.departments)) {
    const dep = db.departments.find((d: any) => d && (aliases.has(d.directorUserId) || aliases.has(`depadmin-${d.id}`)));
    if (dep) {
      ownerEmail = dep.email || ownerEmail;
      ownerName = dep.directorName || ownerName;
    }
  }
  if (!ownerEmail && Array.isArray(db?.storekeepers)) {
    const sk = db.storekeepers.find((s: any) => s && aliases.has(s.id));
    if (sk) ownerEmail = sk.email || ownerEmail;
  }
  if (!ownerEmail && (aliases.has("admin-user") || aliases.has("admin") || aliases.has("mosa"))) {
    ownerEmail = db?.emailSettings?.testRecipientEmail || db?.systemSettings?.officialEmail || "";
  }

  const canonicalUserId = String(context?.userId || session?.userId || live?.user?.id || "").trim();
  return {
    canonicalUserId,
    aliases,
    ownerName: String(ownerName || "المستخدم").trim(),
    ownerEmail: String(ownerEmail || "").trim().toLowerCase()
  };
}

export function isPersonalTaskOwnedByUser(task: any, db: any, context: any, session?: any): boolean {
  if (!task || !context?.isAuthenticated || context.userId === "public") return false;
  const { aliases } = getOwnerIdentifiers(db, context, session);
  return aliases.has(String(task.userId || "").trim());
}

function cancelActiveRemindersForTask(db: any, taskId: string, reason: string) {
  if (!Array.isArray(db.personalTaskReminders)) db.personalTaskReminders = [];
  const nowIso = new Date().toISOString();
  for (const rem of db.personalTaskReminders) {
    if (rem && rem.taskId === taskId && (rem.status === "pending" || rem.status === "failed")) {
      rem.status = "cancelled";
      rem.cancelledReason = reason;
      rem.updatedAt = nowIso;
    }
  }
}

function scheduleReminderForTask(db: any, task: any): any | null {
  if (!Array.isArray(db.personalTaskReminders)) db.personalTaskReminders = [];
  if (!task.reminderAtIso || task.status === "completed") {
    task.reminderStatus = "none";
    task.activeReminderId = null;
    return null;
  }
  if (!task.ownerEmail || !task.ownerEmail.includes("@")) {
    task.reminderStatus = "none";
    task.activeReminderId = null;
    return null;
  }

  const remId = `ptrem-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const nowIso = new Date().toISOString();
  const remRecord = {
    id: remId,
    taskId: task.id,
    userId: task.userId,
    ownerName: task.ownerName,
    targetEmail: task.ownerEmail,
    reminderOption: task.reminderOption,
    reminderAtIso: task.reminderAtIso,
    status: "pending",
    claimToken: null,
    claimedAt: null,
    sentAt: null,
    attempts: 0,
    maxAttempts: MAX_REMINDER_ATTEMPTS,
    nextRetryAtMs: null,
    messageId: null,
    lastError: null,
    cancelledReason: null,
    createdAt: nowIso,
    updatedAt: nowIso
  };
  db.personalTaskReminders.push(remRecord);
  task.activeReminderId = remId;
  task.reminderStatus = "pending";
  task.reminderSentAt = null;
  task.lastReminderError = null;
  return remRecord;
}

function buildPublicBaseUrl(): string {
  return (
    process.env.PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "https://www.riadataleata.com"
  ).replace(/\/+$/, "");
}

export async function processDuePersonalTaskReminders(depsOverride?: PersonalTaskDeps): Promise<{
  checked: number;
  claimed: number;
  sent: number;
  failed: number;
  cancelled: number;
}> {
  const deps = depsOverride || registeredDeps;
  if (!deps) return { checked: 0, claimed: 0, sent: 0, failed: 0, cancelled: 0 };
  if (isProcessingReminders) return { checked: 0, claimed: 0, sent: 0, failed: 0, cancelled: 0 };

  isProcessingReminders = true;
  const stats = { checked: 0, claimed: 0, sent: 0, failed: 0, cancelled: 0 };

  try {
    const nowMs = Date.now();

    interface ClaimedJob {
      reminderId: string;
      claimToken: string;
      attemptNumber: number;
      task: any;
      targetEmail: string;
    }

    const claimedJobs: ClaimedJob[] = await deps.mutateDb((db) => {
      if (!Array.isArray(db.personalTaskReminders)) db.personalTaskReminders = [];
      if (!Array.isArray(db.personalTasks)) db.personalTasks = [];

      const jobs: ClaimedJob[] = [];
      const nowIso = new Date().toISOString();

      for (const rem of db.personalTaskReminders) {
        if (!rem) continue;
        const isPendingDue = rem.status === "pending";
        const isRetryDue =
          rem.status === "failed" &&
          (rem.attempts || 0) < (rem.maxAttempts || MAX_REMINDER_ATTEMPTS) &&
          (!rem.nextRetryAtMs || nowMs >= rem.nextRetryAtMs);

        if (!isPendingDue && !isRetryDue) continue;
        stats.checked++;

        const dueMs = new Date(rem.reminderAtIso).getTime();
        if (Number.isNaN(dueMs) || dueMs > nowMs) continue;

        const task = db.personalTasks.find((t: any) => t && t.id === rem.taskId);
        if (!task || task.status === "completed") {
          rem.status = "cancelled";
          rem.cancelledReason = !task ? "task_deleted" : "task_already_completed";
          rem.updatedAt = nowIso;
          if (task) task.reminderStatus = "cancelled";
          stats.cancelled++;
          continue;
        }

        if (task.activeReminderId && task.activeReminderId !== rem.id) {
          rem.status = "cancelled";
          rem.cancelledReason = "superseded_by_newer_reminder";
          rem.updatedAt = nowIso;
          stats.cancelled++;
          continue;
        }

        if (!rem.targetEmail || !rem.targetEmail.includes("@")) {
          rem.status = "failed";
          rem.lastError = "لا يوجد بريد إلكتروني صالح للمستخدم لإرسال التذكير.";
          rem.attempts = rem.maxAttempts || MAX_REMINDER_ATTEMPTS;
          rem.updatedAt = nowIso;
          task.reminderStatus = "failed";
          task.lastReminderError = rem.lastError;
          stats.failed++;
          continue;
        }

        const claimToken = crypto.randomBytes(8).toString("hex");
        rem.status = "processing";
        rem.claimToken = claimToken;
        rem.claimedAt = nowIso;
        rem.attempts = (rem.attempts || 0) + 1;
        rem.updatedAt = nowIso;
        task.reminderStatus = "processing";
        task.reminderAttempts = rem.attempts;
        task.updatedAt = nowIso;

        jobs.push({
          reminderId: rem.id,
          claimToken,
          attemptNumber: rem.attempts,
          task: { ...task },
          targetEmail: rem.targetEmail
        });
      }

      stats.claimed = jobs.length;
      return jobs;
    });

    if (claimedJobs.length === 0) {
      return stats;
    }

    const dbSnapshot = deps.readDb();
    const baseUrl = buildPublicBaseUrl();
    const logoUrl = `${baseUrl}/logo.png`;

    for (const job of claimedJobs) {
      const t = job.task;
      const startDateAr = formatArabicDateFromRiyadh(t.startDate);
      const startTimeAr = formatArabicTime(t.startTime);
      const remainingLabel = getRemainingLabelAr(t.reminderOption, t.startAtIso, t.reminderAtIso);
      const emailSubject = `تذكير مهمة شخصية: ${t.title} (${remainingLabel})`;

      // Pass cloned emailLogs buffer to sendCentralEmail so mutateDb persists cleanly
      const isolatedDb = {
        ...dbSnapshot,
        emailLogs: []
      };

      let sendRes: any;
      try {
        sendRes = await sendCentralEmail(isolatedDb, {
          to: job.targetEmail,
          recipientName: t.ownerName,
          subject: emailSubject,
          templateType: "personal_task_reminder",
          templateData: {
            recipientName: t.ownerName,
            taskTitle: t.title,
            taskSubject: t.subject,
            taskDetails: t.details,
            startDate: t.startDate,
            startTime: t.startTime,
            startDateAr,
            startTimeAr,
            remainingLabel,
            notes: t.notes,
            dashboardUrl: `${baseUrl}/login`,
            logoUrl
          }
        });
      } catch (err: any) {
        sendRes = {
          success: false,
          provider: "simulation",
          error: err?.message || "خطأ غير متوقع أثناء إرسال البريد",
          timestamp: new Date().toISOString()
        };
      }

      const delivered = Boolean(sendRes?.success);
      if (delivered) stats.sent++;
      else stats.failed++;

      await deps.mutateDb((db) => {
        if (!Array.isArray(db.personalTaskReminders)) db.personalTaskReminders = [];
        if (!Array.isArray(db.personalTasks)) db.personalTasks = [];
        if (!Array.isArray(db.personalTaskEmailLogs)) db.personalTaskEmailLogs = [];
        if (!Array.isArray(db.emailLogs)) db.emailLogs = [];

        const nowIso = new Date().toISOString();
        const rem = db.personalTaskReminders.find((r: any) => r && r.id === job.reminderId);
        const task = db.personalTasks.find((item: any) => item && item.id === t.id);

        if (rem && rem.claimToken === job.claimToken) {
          rem.claimToken = null;
          rem.updatedAt = nowIso;
          if (delivered) {
            rem.status = "sent";
            rem.sentAt = sendRes.timestamp || nowIso;
            rem.messageId = sendRes.messageId || null;
            rem.lastError = null;
          } else {
            rem.status = "failed";
            rem.lastError = sendRes?.error || "فشل إرسال البريد الإلكتروني";
            rem.nextRetryAtMs = Date.now() + 2 * 60 * 1000;
          }
        }

        if (task) {
          task.reminderAttempts = job.attemptNumber;
          task.updatedAt = nowIso;
          if (delivered) {
            task.reminderStatus = "sent";
            task.reminderSentAt = sendRes.timestamp || nowIso;
            task.lastReminderError = null;
          } else {
            task.reminderStatus = "failed";
            task.lastReminderError = sendRes?.error || "فشل إرسال البريد الإلكتروني";
          }
        }

        db.personalTaskEmailLogs.unshift({
          id: `ptlog-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
          taskId: t.id,
          reminderId: job.reminderId,
          userId: t.userId,
          targetEmail: job.targetEmail,
          subject: emailSubject,
          status: delivered ? "sent" : "failed",
          provider: sendRes?.provider || "smtp",
          messageId: sendRes?.messageId,
          error: delivered ? undefined : (sendRes?.error || "فشل الإرسال"),
          attemptNumber: job.attemptNumber,
          sentAt: sendRes?.timestamp || nowIso
        });
        if (db.personalTaskEmailLogs.length > 1000) {
          db.personalTaskEmailLogs = db.personalTaskEmailLogs.slice(0, 1000);
        }

        if (Array.isArray(isolatedDb.emailLogs) && isolatedDb.emailLogs.length > 0) {
          db.emailLogs.unshift(...isolatedDb.emailLogs);
          if (db.emailLogs.length > 500) {
            db.emailLogs = db.emailLogs.slice(0, 500);
          }
        }
      });
    }
  } catch (err) {
    console.error("[PersonalTaskScheduler] Tick error:", err);
  } finally {
    isProcessingReminders = false;
  }

  return stats;
}

export function startPersonalTaskReminderScheduler(deps?: PersonalTaskDeps) {
  if (deps) registeredDeps = deps;
  if (schedulerTimer) return;
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) return;

  // Run initial catch-up shortly after boot so missed reminders during server downtime fire cleanly
  setTimeout(() => {
    processDuePersonalTaskReminders().catch((err) => {
      console.error("[PersonalTaskScheduler] Boot catch-up error:", err);
    });
  }, 2500);

  schedulerTimer = setInterval(() => {
    processDuePersonalTaskReminders().catch((err) => {
      console.error("[PersonalTaskScheduler] Interval error:", err);
    });
  }, 20 * 1000);

  if (typeof schedulerTimer.unref === "function") {
    schedulerTimer.unref();
  }
  console.log("[PersonalTaskScheduler] Persistent background reminder scheduler initialized (interval: 20s, TZ: Asia/Riyadh).");
}

function computeKpisAndFilter(tasks: any[], range?: string, statusFilter?: string, search?: string) {
  const nowMs = Date.now();
  const riyadh = getNowRiyadhParts(nowMs);

  const kpis = {
    total: tasks.length,
    upcoming: 0,
    dueNow: 0,
    inProgress: 0,
    completed: 0,
    postponed: 0
  };

  for (const t of tasks) {
    const startMs = new Date(t.startAtIso).getTime();
    if (t.status === "completed") kpis.completed++;
    else if (t.status === "in_progress") kpis.inProgress++;
    else if (t.status === "postponed") kpis.postponed++;

    if (t.status !== "completed") {
      if (!Number.isNaN(startMs)) {
        if (startMs > nowMs) kpis.upcoming++;
        // Due now: start time passed (or within next 15 min) and not completed
        if (startMs <= nowMs + 15 * 60 * 1000) kpis.dueNow++;
      }
    }
  }

  let filtered = [...tasks];
  if (range && range !== "all") {
    filtered = filtered.filter((t) => {
      const d = String(t.startDate || "");
      if (range === "today") return d === riyadh.dateStr;
      if (range === "tomorrow") return d === riyadh.tomorrowStr;
      if (range === "week") return d >= riyadh.weekStartStr && d <= riyadh.weekEndStr;
      if (range === "month") return d >= riyadh.monthStartStr && d <= riyadh.monthEndStr;
      return true;
    });
  }

  if (statusFilter && statusFilter !== "all") {
    if (statusFilter === "due_now") {
      filtered = filtered.filter((t) => {
        const startMs = new Date(t.startAtIso).getTime();
        return t.status !== "completed" && !Number.isNaN(startMs) && startMs <= nowMs + 15 * 60 * 1000;
      });
    } else if (statusFilter === "upcoming") {
      filtered = filtered.filter((t) => {
        const startMs = new Date(t.startAtIso).getTime();
        return t.status !== "completed" && !Number.isNaN(startMs) && startMs > nowMs;
      });
    } else {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }
  }

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(
      (t) =>
        String(t.title || "").toLowerCase().includes(q) ||
        String(t.subject || "").toLowerCase().includes(q) ||
        String(t.details || "").toLowerCase().includes(q) ||
        String(t.notes || "").toLowerCase().includes(q)
    );
  }

  filtered.sort((a, b) => new Date(a.startAtIso).getTime() - new Date(b.startAtIso).getTime());
  return { kpis, tasks: filtered, riyadhToday: riyadh.dateStr };
}

export function setupPersonalTaskRoutes(app: Express, deps: PersonalTaskDeps) {
  registeredDeps = deps;

  const requireAuth = (req: any, res: any) => {
    const context = deps.getUserAccessContext(req);
    const session = deps.getServerSession(extractSessionToken(req));
    if (!context?.isAuthenticated || context.userId === "public") {
      res.status(401).json({
        error: "غير مصرح: يجب تسجيل الدخول للوصول إلى مهامك ومواعيدك الشخصية.",
        code: "UNAUTHORIZED"
      });
      return null;
    }
    return { context, session };
  };

  // Top-admin anonymized statistics overview ONLY (never exposes private task titles/details)
  app.get("/api/personal-tasks/stats/overview", (req: any, res: any) => {
    const auth = requireAuth(req, res);
    if (!auth) return;
    if (!auth.context.isSuperAdmin && !auth.context.isOperationsManager) {
      return res.status(403).json({
        error: "غير مصرح: الإحصائيات المجمعة متاحة للإدارة العليا فقط.",
        code: "FORBIDDEN"
      });
    }
    const db = deps.readDb();
    const allTasks = Array.isArray(db.personalTasks) ? db.personalTasks : [];
    const allLogs = Array.isArray(db.personalTaskEmailLogs) ? db.personalTaskEmailLogs : [];
    const uniqueUsers = new Set(allTasks.map((t: any) => t.userId).filter(Boolean));
    const byStatus = {
      not_started: allTasks.filter((t: any) => t.status === "not_started").length,
      in_progress: allTasks.filter((t: any) => t.status === "in_progress").length,
      completed: allTasks.filter((t: any) => t.status === "completed").length,
      postponed: allTasks.filter((t: any) => t.status === "postponed").length
    };
    return res.json({
      status: "success",
      anonymizedOverview: {
        totalPersonalTasks: allTasks.length,
        activeUsersCount: uniqueUsers.size,
        byStatus,
        sentRemindersCount: allLogs.filter((l: any) => l.status === "sent").length,
        failedRemindersCount: allLogs.filter((l: any) => l.status === "failed").length
      }
    });
  });

  // List current user's personal tasks ONLY
  app.get("/api/personal-tasks", (req: any, res: any) => {
    const auth = requireAuth(req, res);
    if (!auth) return;
    const db = deps.readDb();
    const owner = getOwnerIdentifiers(db, auth.context, auth.session);
    const allTasks = Array.isArray(db.personalTasks) ? db.personalTasks : [];
    const myTasks = allTasks.filter((t: any) => isPersonalTaskOwnedByUser(t, db, auth.context, auth.session));

    const { range, status, search } = req.query || {};
    const { kpis, tasks, riyadhToday } = computeKpisAndFilter(
      myTasks,
      typeof range === "string" ? range : "all",
      typeof status === "string" ? status : "all",
      typeof search === "string" ? search : ""
    );

    const myLogs = (Array.isArray(db.personalTaskEmailLogs) ? db.personalTaskEmailLogs : [])
      .filter((l: any) => owner.aliases.has(String(l.userId || "").trim()))
      .slice(0, 50);

    return res.json({
      status: "success",
      owner: {
        userId: owner.canonicalUserId,
        name: owner.ownerName,
        email: owner.ownerEmail
      },
      riyadhToday,
      kpis,
      tasks,
      emailLogs: myLogs
    });
  });

  // Get single personal task (strict ownership check)
  app.get("/api/personal-tasks/:id", (req: any, res: any) => {
    const auth = requireAuth(req, res);
    if (!auth) return;
    const db = deps.readDb();
    const task = (db.personalTasks || []).find((t: any) => t && t.id === req.params.id);
    if (!task) {
      return res.status(404).json({ error: "المهمة الشخصية غير موجودة." });
    }
    if (!isPersonalTaskOwnedByUser(task, db, auth.context, auth.session)) {
      return res.status(403).json({
        error: "غير مصرح: هذه المهمة الشخصية خاصة بمستخدم آخر ولا يمكن الاطلاع عليها.",
        code: "FORBIDDEN"
      });
    }
    const reminders = (db.personalTaskReminders || []).filter((r: any) => r && r.taskId === task.id);
    const emailLogs = (db.personalTaskEmailLogs || []).filter((l: any) => l && l.taskId === task.id);
    return res.json({ status: "success", task, reminders, emailLogs });
  });

  // Create new personal task
  app.post("/api/personal-tasks", async (req: any, res: any) => {
    const auth = requireAuth(req, res);
    if (!auth) return;

    const {
      title,
      subject = "",
      details = "",
      notes = "",
      startDate,
      startTime,
      reminderOption = "1h",
      customReminderAt = null,
      reminderEmail
    } = req.body || {};

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "يرجى إدخال اسم المهمة." });
    }
    if (!startDate || !startTime) {
      return res.status(400).json({ error: "يرجى تحديد تاريخ ووقت بداية المهمة." });
    }

    const startAtIso = parseRiyadhDateTimeToIso(startDate, startTime);
    if (!startAtIso) {
      return res.status(400).json({ error: "صيغة التاريخ أو الوقت غير صحيحة (YYYY-MM-DD / HH:mm)." });
    }

    const safeOption: PersonalTaskReminderOption = VALID_REMINDER_OPTIONS.includes(reminderOption)
      ? reminderOption
      : "1h";

    const remCalc = computeReminderAtIso(startAtIso, safeOption, customReminderAt);
    if (remCalc.error) {
      return res.status(400).json({ error: remCalc.error });
    }

    const createdTask = await deps.mutateDb((db) => {
      if (!Array.isArray(db.personalTasks)) db.personalTasks = [];
      const owner = getOwnerIdentifiers(db, auth.context, auth.session);
      const effectiveEmail =
        owner.ownerEmail && owner.ownerEmail.includes("@")
          ? owner.ownerEmail
          : typeof reminderEmail === "string" && reminderEmail.includes("@")
          ? reminderEmail.trim().toLowerCase()
          : "";

      const nowIso = new Date().toISOString();
      const taskId = `ptask-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
      const newTask: any = {
        id: taskId,
        userId: owner.canonicalUserId,
        ownerName: owner.ownerName,
        ownerEmail: effectiveEmail,
        ownerRole: auth.context.role,
        title: title.trim(),
        subject: String(subject || "").trim(),
        details: String(details || "").trim(),
        notes: String(notes || "").trim(),
        startDate: String(startDate).trim(),
        startTime: String(startTime).trim(),
        startAtIso,
        reminderOption: safeOption,
        customReminderAt: safeOption === "custom" ? remCalc.reminderAtIso : null,
        reminderAtIso: remCalc.reminderAtIso,
        activeReminderId: null,
        status: "not_started" as PersonalTaskStatus,
        reminderStatus: "none",
        reminderSentAt: null,
        reminderAttempts: 0,
        lastReminderError: null,
        completedAt: null,
        postponedAt: null,
        postponeHistory: [],
        editHistory: [
          {
            id: `hist-${Date.now()}`,
            action: "created",
            timestamp: nowIso,
            summary: `إنشاء مهمة شخصية جديدة (${formatArabicDateFromRiyadh(String(startDate).trim())} الساعة ${formatArabicTime(String(startTime).trim())})`,
            toStatus: "not_started",
            newStartDate: String(startDate).trim(),
            newStartTime: String(startTime).trim()
          }
        ],
        createdAt: nowIso,
        updatedAt: nowIso
      };

      scheduleReminderForTask(db, newTask);
      db.personalTasks.unshift(newTask);
      return newTask;
    });

    // If reminder is already due (e.g., user chose 24h for a task starting in 2 hours), dispatch cleanly in background or synchronously check
    if (createdTask?.reminderAtIso && new Date(createdTask.reminderAtIso).getTime() <= Date.now()) {
      processDuePersonalTaskReminders().catch(() => {});
    }

    return res.status(201).json({
      status: "success",
      task: createdTask,
      message: "تم إنشاء المهمة الشخصية وجدولة التذكير البريدي بنجاح."
    });
  });

  // Update personal task details & schedule
  const handleUpdateTask = async (req: any, res: any) => {
    const auth = requireAuth(req, res);
    if (!auth) return;

    const existingDb = deps.readDb();
    const existingTask = (existingDb.personalTasks || []).find((t: any) => t && t.id === req.params.id);
    if (!existingTask) {
      return res.status(404).json({ error: "المهمة الشخصية غير موجودة." });
    }
    if (!isPersonalTaskOwnedByUser(existingTask, existingDb, auth.context, auth.session)) {
      return res.status(403).json({
        error: "غير مصرح: لا يمكنك تعديل مهمة شخصية تخص مستخدماً آخر.",
        code: "FORBIDDEN"
      });
    }

    const body = req.body || {};
    const nextTitle = body.title !== undefined ? String(body.title).trim() : existingTask.title;
    if (!nextTitle) {
      return res.status(400).json({ error: "اسم المهمة لا يمكن أن يكون فارغاً." });
    }

    const nextDate = body.startDate !== undefined ? String(body.startDate).trim() : existingTask.startDate;
    const nextTime = body.startTime !== undefined ? String(body.startTime).trim() : existingTask.startTime;
    const nextStartAtIso = parseRiyadhDateTimeToIso(nextDate, nextTime);
    if (!nextStartAtIso) {
      return res.status(400).json({ error: "تاريخ أو وقت المهمة غير صالح." });
    }

    const nextReminderOption: PersonalTaskReminderOption =
      body.reminderOption && VALID_REMINDER_OPTIONS.includes(body.reminderOption)
        ? body.reminderOption
        : existingTask.reminderOption;
    const nextCustomReminder =
      body.customReminderAt !== undefined ? body.customReminderAt : existingTask.customReminderAt;

    const remCalc = computeReminderAtIso(nextStartAtIso, nextReminderOption, nextCustomReminder);
    if (remCalc.error) {
      return res.status(400).json({ error: remCalc.error });
    }

    const updatedTask = await deps.mutateDb((db) => {
      const task = (db.personalTasks || []).find((t: any) => t && t.id === req.params.id);
      if (!task) return null;

      const nowIso = new Date().toISOString();
      const scheduleChanged =
        task.startDate !== nextDate ||
        task.startTime !== nextTime ||
        task.reminderOption !== nextReminderOption ||
        task.reminderAtIso !== remCalc.reminderAtIso;

      if (body.reminderEmail && typeof body.reminderEmail === "string" && body.reminderEmail.includes("@")) {
        task.ownerEmail = body.reminderEmail.trim().toLowerCase();
      }

      task.title = nextTitle;
      if (body.subject !== undefined) task.subject = String(body.subject).trim();
      if (body.details !== undefined) task.details = String(body.details).trim();
      if (body.notes !== undefined) task.notes = String(body.notes).trim();

      if (scheduleChanged) {
        task.startDate = nextDate;
        task.startTime = nextTime;
        task.startAtIso = nextStartAtIso;
        task.reminderOption = nextReminderOption;
        task.customReminderAt = nextReminderOption === "custom" ? remCalc.reminderAtIso : null;
        task.reminderAtIso = remCalc.reminderAtIso;

        if (task.status !== "completed") {
          cancelActiveRemindersForTask(db, task.id, "task_rescheduled");
          scheduleReminderForTask(db, task);
        }
      }

      if (!Array.isArray(task.editHistory)) task.editHistory = [];
      task.editHistory.unshift({
        id: `hist-${Date.now()}`,
        action: "updated",
        timestamp: nowIso,
        summary: scheduleChanged
          ? `تعديل تفاصيل وموعد المهمة إلى ${nextDate} الساعة ${formatArabicTime(nextTime)}`
          : "تعديل بيانات وملاحظات المهمة الشخصية"
      });
      task.updatedAt = nowIso;
      return task;
    });

    if (updatedTask?.reminderAtIso && updatedTask.status !== "completed" && new Date(updatedTask.reminderAtIso).getTime() <= Date.now()) {
      processDuePersonalTaskReminders().catch(() => {});
    }

    return res.json({
      status: "success",
      task: updatedTask,
      message: "تم تحديث المهمة الشخصية وإعادة جدولة التذكير بنجاح."
    });
  };

  app.put("/api/personal-tasks/:id", handleUpdateTask);
  app.patch("/api/personal-tasks/:id", handleUpdateTask);

  // Update task status (including postponing with required new date/time & reminder rescheduling)
  app.post("/api/personal-tasks/:id/status", async (req: any, res: any) => {
    const auth = requireAuth(req, res);
    if (!auth) return;

    const existingDb = deps.readDb();
    const existingTask = (existingDb.personalTasks || []).find((t: any) => t && t.id === req.params.id);
    if (!existingTask) {
      return res.status(404).json({ error: "المهمة الشخصية غير موجودة." });
    }
    if (!isPersonalTaskOwnedByUser(existingTask, existingDb, auth.context, auth.session)) {
      return res.status(403).json({
        error: "غير مصرح: لا يمكنك تغيير حالة مهمة شخصية تخص مستخدماً آخر.",
        code: "FORBIDDEN"
      });
    }

    const { status, newStartDate, newStartTime, newReminderOption, customReminderAt, reason } = req.body || {};
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: "حالة المهمة المطلوبة غير صالحة." });
    }

    let nextStartAtIso = existingTask.startAtIso;
    let nextReminderAtIso = existingTask.reminderAtIso;
    let resolvedReminderOption: PersonalTaskReminderOption = existingTask.reminderOption;

    if (status === "postponed") {
      if (!newStartDate || !newStartTime) {
        return res.status(400).json({ error: "عند تأجيل المهمة يجب تحديد التاريخ والوقت الجديدين." });
      }
      const parsedIso = parseRiyadhDateTimeToIso(newStartDate, newStartTime);
      if (!parsedIso) {
        return res.status(400).json({ error: "التاريخ أو الوقت الجديد للتأجيل غير صحيح." });
      }
      nextStartAtIso = parsedIso;
      resolvedReminderOption =
        newReminderOption && VALID_REMINDER_OPTIONS.includes(newReminderOption)
          ? newReminderOption
          : existingTask.reminderOption;
      const remCalc = computeReminderAtIso(nextStartAtIso, resolvedReminderOption, customReminderAt);
      if (remCalc.error) {
        return res.status(400).json({ error: remCalc.error });
      }
      nextReminderAtIso = remCalc.reminderAtIso;
    }

    const updatedTask = await deps.mutateDb((db) => {
      const task = (db.personalTasks || []).find((t: any) => t && t.id === req.params.id);
      if (!task) return null;

      const nowIso = new Date().toISOString();
      const prevStatus = task.status;
      if (!Array.isArray(task.editHistory)) task.editHistory = [];
      if (!Array.isArray(task.postponeHistory)) task.postponeHistory = [];

      if (status === "completed") {
        task.status = "completed";
        task.completedAt = nowIso;
        cancelActiveRemindersForTask(db, task.id, "task_completed");
        if (task.reminderStatus === "pending" || task.reminderStatus === "failed") {
          task.reminderStatus = "cancelled";
        }
        task.editHistory.unshift({
          id: `hist-${Date.now()}`,
          action: "status_changed",
          timestamp: nowIso,
          fromStatus: prevStatus,
          toStatus: "completed",
          summary: "تم تنفيذ المهمة وإكمالها بنجاح وإلغاء أي تذكيرات متبقية"
        });
      } else if (status === "postponed") {
        const prevDate = task.startDate;
        const prevTime = task.startTime;

        cancelActiveRemindersForTask(db, task.id, "task_postponed");

        task.status = "postponed";
        task.postponedAt = nowIso;
        task.completedAt = null;
        task.startDate = String(newStartDate).trim();
        task.startTime = String(newStartTime).trim();
        task.startAtIso = nextStartAtIso;
        task.reminderOption = resolvedReminderOption;
        task.customReminderAt = resolvedReminderOption === "custom" ? nextReminderAtIso : null;
        task.reminderAtIso = nextReminderAtIso;

        scheduleReminderForTask(db, task);

        task.postponeHistory.unshift({
          id: `post-${Date.now()}`,
          postponedAt: nowIso,
          fromStartDate: prevDate,
          fromStartTime: prevTime,
          toStartDate: task.startDate,
          toStartTime: task.startTime,
          newReminderOption: resolvedReminderOption,
          reason: reason ? String(reason).trim() : undefined
        });

        task.editHistory.unshift({
          id: `hist-${Date.now()}`,
          action: "postponed",
          timestamp: nowIso,
          fromStatus: prevStatus,
          toStatus: "postponed",
          previousStartDate: prevDate,
          previousStartTime: prevTime,
          newStartDate: task.startDate,
          newStartTime: task.startTime,
          reason: reason ? String(reason).trim() : undefined,
          summary: `تم تأجيل المهمة من (${prevDate} ${prevTime}) إلى (${task.startDate} ${task.startTime}) وإعادة جدولة التذكير`
        });
      } else {
        task.status = status;
        if (status !== "completed") task.completedAt = null;
        task.editHistory.unshift({
          id: `hist-${Date.now()}`,
          action: "status_changed",
          timestamp: nowIso,
          fromStatus: prevStatus,
          toStatus: status,
          summary: status === "in_progress" ? "تم بدء التنفيذ (جاري التنفيذ)" : "إعادة حالة المهمة إلى لم تبدأ"
        });
      }

      task.updatedAt = nowIso;
      return task;
    });

    if (
      status === "postponed" &&
      updatedTask?.reminderAtIso &&
      new Date(updatedTask.reminderAtIso).getTime() <= Date.now()
    ) {
      processDuePersonalTaskReminders().catch(() => {});
    }

    return res.json({
      status: "success",
      task: updatedTask,
      message:
        status === "completed"
          ? "تم تسجيل إتمام المهمة وإلغاء التذكيرات المتبقية."
          : status === "postponed"
          ? "تم تأجيل المهمة وإعادة جدولة التذكير للموعد الجديد."
          : "تم تحديث حالة المهمة بنجاح."
    });
  });

  // Retry failed reminder manually (idempotent - never resends already 'sent' reminder)
  app.post("/api/personal-tasks/:id/retry-reminder", async (req: any, res: any) => {
    const auth = requireAuth(req, res);
    if (!auth) return;

    const existingDb = deps.readDb();
    const existingTask = (existingDb.personalTasks || []).find((t: any) => t && t.id === req.params.id);
    if (!existingTask) {
      return res.status(404).json({ error: "المهمة الشخصية غير موجودة." });
    }
    if (!isPersonalTaskOwnedByUser(existingTask, existingDb, auth.context, auth.session)) {
      return res.status(403).json({ error: "غير مصرح بالوصول لهذه المهمة.", code: "FORBIDDEN" });
    }
    if (existingTask.reminderStatus === "sent") {
      return res.status(400).json({ error: "تم إرسال التذكير البريدي لهذه المهمة مسبقاً." });
    }
    if (existingTask.status === "completed") {
      return res.status(400).json({ error: "المهمة مكتملة بالفعل ولا تحتاج لإعادة إرسال تذكير." });
    }

    await deps.mutateDb((db) => {
      const task = (db.personalTasks || []).find((t: any) => t && t.id === req.params.id);
      if (!task) return;
      const rem = (db.personalTaskReminders || []).find(
        (r: any) => r && r.taskId === task.id && r.id === task.activeReminderId
      );
      const nowIso = new Date().toISOString();
      if (rem) {
        rem.status = "pending";
        rem.nextRetryAtMs = null;
        rem.attempts = 0;
        rem.lastError = null;
        rem.updatedAt = nowIso;
      } else {
        scheduleReminderForTask(db, task);
      }
      task.reminderStatus = "pending";
      task.lastReminderError = null;
      task.updatedAt = nowIso;
    });

    await processDuePersonalTaskReminders();
    const refreshedDb = deps.readDb();
    const refreshedTask = (refreshedDb.personalTasks || []).find((t: any) => t && t.id === req.params.id);
    return res.json({ status: "success", task: refreshedTask });
  });

  // Delete personal task & cancel any unsent reminders
  app.delete("/api/personal-tasks/:id", async (req: any, res: any) => {
    const auth = requireAuth(req, res);
    if (!auth) return;

    const existingDb = deps.readDb();
    const existingTask = (existingDb.personalTasks || []).find((t: any) => t && t.id === req.params.id);
    if (!existingTask) {
      return res.status(404).json({ error: "المهمة الشخصية غير موجودة." });
    }
    if (!isPersonalTaskOwnedByUser(existingTask, existingDb, auth.context, auth.session)) {
      return res.status(403).json({
        error: "غير مصرح: لا يمكنك حذف مهمة شخصية تخص مستخدماً آخر.",
        code: "FORBIDDEN"
      });
    }

    await deps.mutateDb((db) => {
      cancelActiveRemindersForTask(db, req.params.id, "task_deleted");
      db.personalTasks = (db.personalTasks || []).filter((t: any) => t && t.id !== req.params.id);
    });

    return res.json({
      status: "success",
      deletedId: req.params.id,
      message: "تم حذف المهمة الشخصية وإلغاء تذكيراتها بنجاح."
    });
  });
}
