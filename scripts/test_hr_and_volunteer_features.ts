/**
 * Isolated Automated Verification for HR & Volunteer Portal Features
 * Project: جمعية ريادة العطاء لخدمة الإنسان بالعسيلة
 */

import { app, readDb, writeDb, createServerSession, destroyServerSession } from "../server-core";
import http from "http";

let server: http.Server;
let baseUrl = "";

async function startServer(): Promise<void> {
  return new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      const addr: any = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
}

async function stopServer(): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

const request = async (path: string, opts: any = {}) => {
  const res = await fetch(`${baseUrl}${path}`, {
    method: opts.method || "GET",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const text = await res.text();
  let body: any;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
};

async function verifyFeatures() {
  await startServer();
  const originalDb = JSON.parse(JSON.stringify(readDb()));

  let passed = 0;
  let failed = 0;

  function assert(cond: boolean, name: string, detail?: string) {
    if (cond) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} ${detail || ''}`);
      failed++;
    }
  }

  try {
    console.log("================================================================================");
    console.log("   فحص ميزات الموارد البشرية وبوابة المتطوع - جمعية ريادة العطاء بالعسيلة     ");
    console.log("================================================================================\n");

    // 1. HR Leave Action
    const hrSession = createServerSession({ 
      id: "hr-director", 
      role: "department_admin", 
      departmentId: "dep-9", 
      permissions: ["manage_staff"] 
    }, "department_admin");

    const leaveRes = await request("/api/db/hr/leaves/action", {
      method: "POST",
      headers: { "Authorization": `Bearer ${hrSession.token}` },
      body: { 
        newLeave: {
          employeeId: "emp-test", 
          employeeName: "موظف اختبار الموارد البشرية", 
          leaveType: "annual", 
          daysCount: 3, 
          startDate: "2026-11-01",
          endDate: "2026-11-03",
          reason: "إجازة اعتيادية"
        }
      }
    });
    assert(
      leaveRes.status === 200 && leaveRes.body?.status === "success",
      "1. تسجيل طلب إجازة في إدارة الموارد البشرية ومطابقة الصلاحية"
    );

    // 2. HR Attendance Log
    const attRes = await request("/api/db/hr/attendance/log", {
      method: "POST",
      headers: { "Authorization": `Bearer ${hrSession.token}` },
      body: { 
        employeeId: "emp-test", 
        employeeName: "موظف اختبار الموارد البشرية", 
        date: "2026-10-26", 
        checkInTime: "08:00", 
        checkOutTime: "16:00", 
        status: "present" 
      }
    });
    assert(
      attRes.status === 200 && attRes.body?.status === "success",
      "2. تسجيل الحضور والانصراف الوظيفي في سجلات الموارد البشرية"
    );

    // 3. HR Decision Add
    const decRes = await request("/api/db/hr/decisions/add", {
      method: "POST",
      headers: { "Authorization": `Bearer ${hrSession.token}` },
      body: { 
        title: "قرار تكليف تجريبي", 
        type: "تكليف", 
        employeeName: "أحمد بن فهد", 
        department: "الموارد البشرية" 
      }
    });
    assert(
      decRes.status === 200 && decRes.body?.status === "success",
      "3. أرشفة القرارات والتكليفات الإدارية للموارد البشرية"
    );

    // Pick real active volunteer (أحمد بن علي الغامدي)
    const vol = originalDb.volunteers.find((v: any) => v.id === "vol-1");
    if (!vol) throw new Error("vol-1 not found");
    const initialOfficialPhoto = vol.photo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop";
    vol.photo = initialOfficialPhoto;
    const volSession = createServerSession({ id: vol.id, role: "volunteer", name: vol.name }, "volunteer");

    // 4. WhatsApp Profile Picture Separation
    const dummyImageBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const profileImgRes = await request("/api/db/volunteers/profile-image", {
      method: "POST",
      headers: { "Authorization": `Bearer ${volSession.token}` },
      body: { volunteerId: vol.id, imageBase64: dummyImageBase64 }
    });

    const dbAfterImg = readDb();
    const volAfterImg = dbAfterImg.volunteers.find((v: any) => v.id === vol.id);
    const photoUntouched = volAfterImg && volAfterImg.photo === initialOfficialPhoto;
    const profileImgSaved = Boolean(volAfterImg && (volAfterImg.profileImage || volAfterImg.profile_image));

    assert(
      profileImgRes.status === 200 && photoUntouched && profileImgSaved,
      "4. حفظ صورة الحساب الشخصي (WhatsApp Avatar) وفصلها التام عن صورة البطاقة الرسمية"
    );

    // 5. Volunteer Safe Profile Update (Contact fields editable, official locked)
    const updateRes = await request("/api/db/volunteers/update-profile", {
      method: "POST",
      headers: { "Authorization": `Bearer ${volSession.token}` },
      body: {
        volunteerId: vol.id,
        phone: "0509876543",
        email: "volunteer.safe@riadataleata.com",
        city: "مكة المكرمة",
        district: "العسيلة",
        name: "FORGED_OFFICIAL_NAME", // Should be blocked
        points: 999999 // Should be blocked
      }
    });

    const dbAfterUpdate = readDb();
    const volAfterUpdate = dbAfterUpdate.volunteers.find((v: any) => v.id === vol.id);
    const officialNameProtected = volAfterUpdate.name === vol.name;
    const pointsProtected = volAfterUpdate.points === vol.points;
    const contactUpdated = volAfterUpdate.phone === "0509876543" && volAfterUpdate.city === "مكة المكرمة";

    assert(
      updateRes.status === 200 && officialNameProtected && pointsProtected && contactUpdated,
      "5. تحديث بيانات التواصل مع الحماية الصارمة للحقول الرسمية والنقاط من التعديل المباشر"
    );

    // 6. Official Data Change Request Workflow
    const changeReqRes = await request("/api/db/volunteers/request-data-change", {
      method: "POST",
      headers: { "Authorization": `Bearer ${volSession.token}` },
      body: {
        volunteerId: vol.id,
        volunteerName: vol.name,
        requestedField: "اسم العائلة في الهوية",
        currentValue: vol.name,
        requestedValue: vol.name + " المعبدي",
        reason: "تطابق مع بطاقة الهوية الوطنية المجددة"
      }
    });

    const dbAfterReq = readDb();
    const reqLogged = (dbAfterReq.volunteerChangeRequests || []).some((r: any) => r.volunteerId === vol.id);

    assert(
      changeReqRes.status === 200 && reqLogged,
      "6. تقديم طلب تعديل بيانات رسمية للمراجعة الإدارية وسريان سير العمل"
    );

    destroyServerSession(hrSession.token);
    destroyServerSession(volSession.token);

  } finally {
    writeDb(originalDb);
    await stopServer();
  }

  console.log("\n================================================================================");
  console.log(`   نتائج فحص الميزات: ${passed} نجح | ${failed} فشل`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

verifyFeatures().catch((err) => {
  console.error("Verification script error:", err);
  process.exit(1);
});
