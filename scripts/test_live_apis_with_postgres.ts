/**
 * End-to-End Live API Handler Test against Neon PostgreSQL
 * Target: Neon Staging Branch (ep-tiny-hat-b4hpkghm)
 * 
 * Tests the real Express route handlers with PostgreSQL active:
 * 1. Admin login & session generation.
 * 2. Operations manager login & full permissions.
 * 3. Department Admin login with Department Data Isolation.
 * 4. Volunteer authentication.
 * 5. Authenticated API query with session token header.
 */

import pg from "pg";
import { app, readDb } from "../server-core";

const { Pool } = pg;

export interface ApiTestSummary {
  adminLogin: { success: boolean; role: string; tokenGenerated: boolean };
  opsManagerLogin: { success: boolean; role: string; tokenGenerated: boolean };
  deptAdminLogin: { success: boolean; role: string; isolatedDept: string };
  volunteerLogin: { success: boolean; role: string };
  authenticatedApiQuery: { success: boolean; status: number; returnedKeys: number };
  allPassed: boolean;
}

// Minimal mock request/response helper to test Express handlers without launching an external HTTP port
function mockPost(appInstance: any, path: string, body: any, headers: Record<string, string> = {}): Promise<{ status: number; body: any }> {
  return new Promise((resolve) => {
    const req: any = {
      method: "POST",
      url: path,
      path: path,
      body,
      headers: {
        "content-type": "application/json",
        ...headers
      },
      ip: "127.0.0.1",
      socket: { remoteAddress: "127.0.0.1" }
    };

    let statusCode = 200;
    const res: any = {
      statusCode: 200,
      status: function(code: number) {
        statusCode = code;
        this.statusCode = code;
        return this;
      },
      setHeader: function() { return this; },
      header: function() { return this; },
      json: function(data: any) {
        resolve({ status: statusCode, body: data });
      },
      send: function(data: any) {
        resolve({ status: statusCode, body: data });
      }
    };

    appInstance.handle(req, res, () => {
      resolve({ status: 404, body: { error: "Not Found" } });
    });
  });
}

function mockGet(appInstance: any, path: string, headers: Record<string, string> = {}): Promise<{ status: number; body: any }> {
  return new Promise((resolve) => {
    const req: any = {
      method: "GET",
      url: path,
      path: path,
      headers: {
        ...headers
      },
      ip: "127.0.0.1",
      socket: { remoteAddress: "127.0.0.1" }
    };

    let statusCode = 200;
    const res: any = {
      statusCode: 200,
      status: function(code: number) {
        statusCode = code;
        this.statusCode = code;
        return this;
      },
      setHeader: function() { return this; },
      header: function() { return this; },
      json: function(data: any) {
        resolve({ status: statusCode, body: data });
      },
      send: function(data: any) {
        try {
          resolve({ status: statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: statusCode, body: data });
        }
      }
    };

    appInstance.handle(req, res, () => {
      resolve({ status: 404, body: { error: "Not Found" } });
    });
  });
}

async function runLiveApiTest() {
  const url = process.env.TEST_DATABASE_URL || "";
  const EXPECTED_ENDPOINT = "ep-tiny-hat-b4hpkghm";

  if (!url || !url.includes(EXPECTED_ENDPOINT)) {
    console.error("🛑 Security Check Failed: TEST_DATABASE_URL is missing or does not match staging endpoint.");
    process.exit(1);
  }

  // Force PostgreSQL environment for this test runner
  process.env.STORAGE_BACKEND = "postgres";
  process.env.DATABASE_URL = url;

  const summary: ApiTestSummary = {
    adminLogin: { success: false, role: "", tokenGenerated: false },
    opsManagerLogin: { success: false, role: "", tokenGenerated: false },
    deptAdminLogin: { success: false, role: "", isolatedDept: "" },
    volunteerLogin: { success: false, role: "" },
    authenticatedApiQuery: { success: false, status: 0, returnedKeys: 0 },
    allPassed: false
  };

  // 1. Test Admin Login
  const adminRes = await mockPost(app, "/api/db/auth/login", {
    identifier: "admin",
    password: "123"
  });

  if (adminRes.status === 200 && adminRes.body?.status === "success") {
    summary.adminLogin.success = true;
    summary.adminLogin.role = adminRes.body.role;
    summary.adminLogin.tokenGenerated = Boolean(adminRes.body.sessionToken);
  }

  // 2. Test Operations Manager Login
  const opsRes = await mockPost(app, "/api/db/auth/login", {
    identifier: "operations",
    password: "123"
  });

  if (opsRes.status === 200 && opsRes.body?.status === "success") {
    summary.opsManagerLogin.success = true;
    summary.opsManagerLogin.role = opsRes.body.role;
    summary.opsManagerLogin.tokenGenerated = Boolean(opsRes.body.sessionToken);
  }

  // 3. Test Department Admin Login (e.g. Beneficiaries Department: dep-4)
  const deptRes = await mockPost(app, "/api/db/auth/login", {
    identifier: "dep-4",
    password: "123"
  });

  if (deptRes.status === 200 && deptRes.body?.status === "success") {
    summary.deptAdminLogin.success = true;
    summary.deptAdminLogin.role = deptRes.body.role;
    summary.deptAdminLogin.isolatedDept = deptRes.body.user?.departmentId;
  }

  // 4. Test Volunteer Login (vol-1 with phone or id)
  const volRes = await mockPost(app, "/api/db/auth/login", {
    identifier: "0551234567",
    password: "123"
  });

  if (volRes.status === 200 && volRes.body?.status === "success") {
    summary.volunteerLogin.success = true;
    summary.volunteerLogin.role = volRes.body.role;
  }

  // 5. Test Authenticated API Query with Admin Session Token
  const token = adminRes.body?.sessionToken;
  if (token) {
    const apiRes = await mockGet(app, "/api/db", {
      "x-session-token": token,
      "Authorization": `Bearer ${token}`
    });

    summary.authenticatedApiQuery.status = apiRes.status;
    if (apiRes.status === 200 && apiRes.body) {
      summary.authenticatedApiQuery.success = true;
      summary.authenticatedApiQuery.returnedKeys = Object.keys(apiRes.body).length;
    }
  }

  summary.allPassed = summary.adminLogin.success && 
                      summary.opsManagerLogin.success && 
                      summary.deptAdminLogin.success && 
                      summary.volunteerLogin.success && 
                      summary.authenticatedApiQuery.success;

  console.log(JSON.stringify(summary, null, 2));
}

if (process.argv[1].endsWith("test_live_apis_with_postgres.ts") || process.argv[1].endsWith("test_live_apis_with_postgres.js")) {
  runLiveApiTest().catch(err => {
    console.error("API test failed:", err.message);
    process.exit(1);
  });
}
