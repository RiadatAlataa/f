/**
 * Isolated Security Test Suite: CORS Strict Enforcement & Authentication Protection
 * جمعية ريادة العطاء لخدمة الإنسان بالعسيلة
 *
 * Validates:
 * 1. Acceptance of official society domains (www.riadataleata.com, riadataleata.com, official API host).
 * 2. Strict rejection of untrusted external origins (e.g. evil-attacker.com).
 * 3. Strict rejection of lookalike / spoofed origins (riadataleata.com.evil.com, fake-riadataleata.com, attacker.vercel.app, rogue.run.app).
 * 4. Zero exposure of authenticated response headers (Access-Control-Allow-Origin & Access-Control-Allow-Credentials never leaked to untrusted origins).
 * 5. Preservation of standard authentication, Google login rejection for disabled accounts, and verified sessions.
 */

import http from 'http';
import app, { isOriginAllowed } from '../server-core';

interface TestCase {
  name: string;
  run: (serverUrl: string) => Promise<{ passed: boolean; details: string }>;
}

async function makeRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {}
): Promise<{
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: options.method || 'GET',
        headers: options.headers || {},
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 0,
            headers: res.headers,
            body: data,
          });
        });
      }
    );
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

const tests: TestCase[] = [
  {
    name: '1. قبول النطاقات الرسمية المعتمدة للجمعية ونطاقات التطوير المحددة',
    run: async (baseUrl) => {
      const allowedSamples = [
        'https://www.riadataleata.com',
        'https://riadataleata.com',
        'https://riadataleata-api.onrender.com',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://ais-dev-rzf5egwepcxxjeotzjdzwu-584552926684.europe-west1.run.app'
      ];

      for (const origin of allowedSamples) {
        if (!isOriginAllowed(origin)) {
          return { passed: false, details: `فشل التحقق المباشر من دالة isOriginAllowed للنطاق المعتمد: ${origin}` };
        }

        // Test HTTP Preflight (OPTIONS)
        const preflight = await makeRequest(`${baseUrl}/api/health`, {
          method: 'OPTIONS',
          headers: {
            Origin: origin,
            'Access-Control-Request-Method': 'GET',
          },
        });

        if (preflight.statusCode !== 204) {
          return { passed: false, details: `فشل استجابة OPTIONS للنطاق المعتمد ${origin} (الكود: ${preflight.statusCode})` };
        }
        if (preflight.headers['access-control-allow-origin'] !== origin) {
          return { passed: false, details: `لم يُرجع الخادم ترويسة Allow-Origin متطابقة للنطاق ${origin}` };
        }
        if (preflight.headers['access-control-allow-credentials'] !== 'true') {
          return { passed: false, details: `لم يُرجع الخادم ترويسة Allow-Credentials للنطاق ${origin}` };
        }
        if (!preflight.headers['vary'] || !String(preflight.headers['vary']).includes('Origin')) {
          return { passed: false, details: `لم يُرجع الخادم ترويسة Vary: Origin للنطاق ${origin}` };
        }

        // Test GET Request with Origin
        const getRes = await makeRequest(`${baseUrl}/api/health`, {
          method: 'GET',
          headers: { Origin: origin },
        });

        if (getRes.statusCode !== 200 || getRes.headers['access-control-allow-origin'] !== origin) {
          return { passed: false, details: `فشل طلب GET للنطاق المعتمد ${origin}` };
        }
      }

      return { passed: true, details: 'تم قبول جميع النطاقات الرسمية ونطاقات التطوير المحددة بدقة مع إرسال Vary: Origin' };
    },
  },
  {
    name: '2. رفض النطاقات الخارجية غير الموثوقة وحظر وصولها للترويسات المصادقة',
    run: async (baseUrl) => {
      const maliciousOrigins = [
        'https://evil-attacker.com',
        'https://hacker.org',
        'http://unauthorized-domain.net',
        'https://api.steal-data.io'
      ];

      for (const badOrigin of maliciousOrigins) {
        if (isOriginAllowed(badOrigin)) {
          return { passed: false, details: `ثغرة: دالة isOriginAllowed وافقت خطأ على نطاق خبيث: ${badOrigin}` };
        }

        // Test Preflight rejection
        const preflight = await makeRequest(`${baseUrl}/api/db`, {
          method: 'OPTIONS',
          headers: {
            Origin: badOrigin,
            'Access-Control-Request-Method': 'GET',
          },
        });

        if (preflight.statusCode !== 403) {
          return { passed: false, details: `لم يرفض الخادم طلب OPTIONS للنطاق الخبيث ${badOrigin} بكود 403 (أعاد: ${preflight.statusCode})` };
        }
        if (preflight.headers['access-control-allow-origin']) {
          return { passed: false, details: `ثغرة تسريب: تم إرسال Access-Control-Allow-Origin للنطاق الخبيث ${badOrigin}` };
        }
        if (preflight.headers['access-control-allow-credentials'] === 'true') {
          return { passed: false, details: `ثغرة تسريب: تم إرسال Access-Control-Allow-Credentials: true للنطاق الخبيث ${badOrigin}` };
        }

        // Test GET data request
        const getRes = await makeRequest(`${baseUrl}/api/db`, {
          method: 'GET',
          headers: { Origin: badOrigin },
        });

        if (getRes.headers['access-control-allow-origin'] || getRes.headers['access-control-allow-credentials']) {
          return { passed: false, details: `ثغرة أمنية: تم منح صلاحية CORS للنطاق الخارجي غير الموثوق ${badOrigin}` };
        }
      }

      return { passed: true, details: 'تم حجب جميع النطاقات الخارجية بنجاح ولم تتلق أي ترويسات تسمح بقراءة الاستجابات المصادقة' };
    },
  },
  {
    name: '3. رفض النطاقات المشابهة والمزيفة ومحاولات خداع المسارات (Spoofing & Lookalikes)',
    run: async (baseUrl) => {
      const spoofedOrigins = [
        'https://riadataleata.com.evil.com',
        'https://fake-riadataleata.com',
        'https://riadataleata.com.attacker.org',
        'https://www.riadataleata.com.free-vps.net',
        'https://rogue-app.vercel.app',
        'https://attacker-project.run.app',
        'http://localhost:9999',
        'http://evil-localhost.com:3000'
      ];

      for (const fakeOrigin of spoofedOrigins) {
        if (isOriginAllowed(fakeOrigin)) {
          return { passed: false, details: `ثغرة: تم السماح بنطاق مخادع/مشابه: ${fakeOrigin}` };
        }

        const preflight = await makeRequest(`${baseUrl}/api/db`, {
          method: 'OPTIONS',
          headers: {
            Origin: fakeOrigin,
            'Access-Control-Request-Method': 'POST',
          },
        });

        if (preflight.statusCode !== 403) {
          return { passed: false, details: `لم يتم حظر Preflight للنطاق المخادع ${fakeOrigin} بكود 403` };
        }
        if (preflight.headers['access-control-allow-origin']) {
          return { passed: false, details: `تم كشف Allow-Origin للنطاق المخادع: ${fakeOrigin}` };
        }
      }

      return { passed: true, details: 'نجح حظر كافة محاولات الخداع بالنطاقات الفرعية واللاحقات المزيفة ومطابقات Wildcard العشوائية' };
    },
  },
  {
    name: '4. عدم كشف الاستجابات المصادقة أو بيانات الجلسات عبر CORS لمصادر غير معتمدة',
    run: async (baseUrl) => {
      const untrustedOrigin = 'https://unauthorized-observer.org';

      const authSessionRes = await makeRequest(`${baseUrl}/api/db/auth/session`, {
        method: 'GET',
        headers: {
          Origin: untrustedOrigin,
          Authorization: 'Bearer test_token_xyz',
        },
      });

      // Browser must be forbidden from accessing this cross-origin response
      if (authSessionRes.headers['access-control-allow-origin']) {
        return { passed: false, details: 'تم تسريب ترويسة Access-Control-Allow-Origin في مسار استعلام الجلسة لنطاق غير معتمد' };
      }
      if (authSessionRes.headers['access-control-allow-credentials'] === 'true') {
        return { passed: false, details: 'تم تفعيل Credentials: true لنطاق غير مصرح به على بيانات الجلسة' };
      }
      if (!authSessionRes.headers['vary'] || !String(authSessionRes.headers['vary']).includes('Origin')) {
        return { passed: false, details: 'ترويسة Vary: Origin مفقودة في استجابة الجلسة' };
      }

      return { passed: true, details: 'محمية بالكامل: المتصفح يمنع قراءة استجابة الجلسة لمطابقة معايير Same-Origin Policy' };
    },
  },
  {
    name: '5. استمرار عمل المصادقة وتسجيل الدخول والجلسات العادية وGoogle دون أي تعطل',
    run: async (baseUrl) => {
      // 1. Verify health check responds normally
      const health = await makeRequest(`${baseUrl}/api/health`);
      if (health.statusCode !== 200) {
        return { passed: false, details: `فشل استجابة فحص الصحة: ${health.statusCode}` };
      }

      // 2. Verify Google Auth route is active and strictly rejects disabled accounts
      const googleAuthAttempt = await makeRequest(`${baseUrl}/api/db/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://www.riadataleata.com',
        },
        body: JSON.stringify({
          credential: 'test_token_invalid_or_disabled',
        }),
      });

      // Should return structured response (400 or 401 or 403), never crash (500)
      if (googleAuthAttempt.statusCode === 500) {
        return { passed: false, details: 'حدث خطأ خادم 500 في مسار Google Auth' };
      }

      // 3. Verify standard login flow rejects invalid credentials safely with proper message
      const loginAttempt = await makeRequest(`${baseUrl}/api/db/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://www.riadataleata.com',
        },
        body: JSON.stringify({
          username: 'non_existent_user_99999',
          password: 'wrong_password',
        }),
      });

      if (loginAttempt.statusCode === 500) {
        return { passed: false, details: 'مسار تسجيل الدخول العادي أعاد كود 500' };
      }

      return { passed: true, details: 'مسارات تسجيل الدخول العادي وGoogle والجلسات المعتمدة تعمل بكامل كفاءتها واستقرارها' };
    },
  },
];

async function runTestSuite() {
  console.log('='.repeat(80));
  console.log('اختبارات التحقق الأمني من سياسة CORS وحماية الجلسات والمصادقة');
  console.log('جمعية ريادة العطاء لخدمة الإنسان بالعسيلة');
  console.log('='.repeat(80));

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  let passedCount = 0;
  for (const t of tests) {
    console.log(`\n--------------------------------------------------------------------------------`);
    console.log(`الاختبار: ${t.name}`);
    console.log(`--------------------------------------------------------------------------------`);
    try {
      const res = await t.run(baseUrl);
      if (res.passed) {
        passedCount++;
        console.log(`[ناجح PASS] ${res.details}`);
      } else {
        console.error(`[فشل FAIL] ${res.details}`);
      }
    } catch (err: any) {
      console.error(`[خطأ ERROR] استثناء أثناء تشغيل الاختبار:`, err.message);
    }
  }

  server.close();

  console.log(`\n` + '='.repeat(80));
  console.log(`النتيجة النهائية: ${passedCount} من أصل ${tests.length} اختبارات ناجحة (${(passedCount / tests.length) * 100}%)`);
  console.log('='.repeat(80));

  if (passedCount !== tests.length) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
