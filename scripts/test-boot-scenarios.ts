import { spawn } from 'child_process';
import http from 'http';

interface ScenarioResult {
  scenario: string;
  env: Record<string, string>;
  exitCode: number | null;
  serverRunning: boolean;
  healthStatus: number | null;
  healthBody: any;
  operationalApiStatus: number | null;
  logs: string[];
}

function makeRequest(port: number, path: string): Promise<{ statusCode: number; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${port}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode || 0, body: JSON.parse(data) });
        } catch {
          resolve({ statusCode: res.statusCode || 0, body: data });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(2000, () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
  });
}

function runServerScenario(
  scenarioName: string,
  envVars: Record<string, string>,
  port: number,
  durationMs: number = 4000
): Promise<ScenarioResult> {
  return new Promise((resolve) => {
    const logs: string[] = [];
    const mergedEnv: Record<string, string> = {
      ...process.env,
      PORT: String(port),
      ...envVars
    };

    const child = spawn('node', ['dist/server.cjs'], {
      env: mergedEnv,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    child.stdout.on('data', (d) => {
      const text = d.toString();
      logs.push(text);
    });

    child.stderr.on('data', (d) => {
      const text = d.toString();
      logs.push(`[STDERR] ${text}`);
    });

    let exited = false;
    let exitCode: number | null = null;

    child.on('exit', (code) => {
      exited = true;
      exitCode = code;
    });

    // Wait 2.5s for server to start, then make HTTP requests
    setTimeout(async () => {
      let healthStatus: number | null = null;
      let healthBody: any = null;
      let operationalApiStatus: number | null = null;

      if (!exited) {
        try {
          const h = await makeRequest(port, '/api/health');
          healthStatus = h.statusCode;
          healthBody = h.body;
        } catch (e: any) {
          healthBody = { error: e.message };
        }

        try {
          const op = await makeRequest(port, '/api/volunteers');
          operationalApiStatus = op.statusCode;
        } catch (e: any) {}
      }

      // Terminate child
      child.kill('SIGTERM');

      setTimeout(() => {
        resolve({
          scenario: scenarioName,
          env: envVars,
          exitCode,
          serverRunning: !exited,
          healthStatus,
          healthBody,
          operationalApiStatus,
          logs
        });
      }, 500);
    }, durationMs - 500);
  });
}

async function main() {
  console.log('========================================================================');
  console.log('  RENDER PRODUCTION STARTUP SCENARIO ANALYSIS SUITE');
  console.log('  Testing Failure Modes, Exit Status 1 Triggers, and Awaiting-Bootstrap');
  console.log('  Time:', new Date().toISOString());
  console.log('========================================================================\n');

  // Scenario 1: STORAGE_BACKEND=postgres, but DATABASE_URL is missing
  console.log('--- Testing Scenario 1: STORAGE_BACKEND=postgres, missing DATABASE_URL ---');
  const res1 = await runServerScenario(
    'STORAGE_BACKEND=postgres with Missing DATABASE_URL',
    {
      NODE_ENV: 'production',
      STORAGE_BACKEND: 'postgres',
      DATABASE_URL: '',
      TEST_DATABASE_URL: ''
    },
    3111
  );
  console.log(`Exit Code: ${res1.exitCode} | Server Running: ${res1.serverRunning}`);
  console.log(`Logs:\n${res1.logs.join('')}\n`);

  // Scenario 2: STORAGE_BACKEND=postgres, DATABASE_URL present, but database is clean/empty (system_state empty)
  console.log('--- Testing Scenario 2: STORAGE_BACKEND=postgres, clean/empty Neon PostgreSQL ---');
  const stagingUrl = process.env.TEST_DATABASE_URL || '';
  const res2 = await runServerScenario(
    'STORAGE_BACKEND=postgres with Clean Neon DB (Awaiting Bootstrap)',
    {
      NODE_ENV: 'production',
      STORAGE_BACKEND: 'postgres',
      DATABASE_URL: stagingUrl,
      BOOTSTRAP_ADMIN_KEY: 'test_bootstrap_key_12345678'
    },
    3112
  );
  console.log(`Exit Code: ${res2.exitCode} | Server Running: ${res2.serverRunning}`);
  console.log(`Health Status: ${res2.healthStatus} | Operational API Status: ${res2.operationalApiStatus}`);
  console.log(`Health Body:`, res2.healthBody);
  console.log(`Logs:\n${res2.logs.join('')}\n`);

  // Scenario 3: STORAGE_BACKEND missing (defaults to json), NODE_ENV=production, db.json missing
  console.log('--- Testing Scenario 3: STORAGE_BACKEND missing (JSON mode on Render without db.json) ---');
  const res3 = await runServerScenario(
    'STORAGE_BACKEND unset (JSON storage on Render without disk db.json)',
    {
      NODE_ENV: 'production',
      STORAGE_BACKEND: '',
      DATABASE_URL: '',
      APP_DB_PATH: '/tmp/nonexistent_test_' + Date.now() + '.json'
    },
    3113
  );
  console.log(`Exit Code: ${res3.exitCode} | Server Running: ${res3.serverRunning}`);
  console.log(`Logs:\n${res3.logs.join('')}\n`);

  // Scenario 4: STORAGE_BACKEND=postgres, invalid/unreachable DATABASE_URL
  console.log('--- Testing Scenario 4: STORAGE_BACKEND=postgres, unreachable DATABASE_URL ---');
  const res4 = await runServerScenario(
    'STORAGE_BACKEND=postgres with Unreachable DATABASE_URL',
    {
      NODE_ENV: 'production',
      STORAGE_BACKEND: 'postgres',
      DATABASE_URL: 'postgresql://invalid:invalid@127.0.0.1:54329/fake_db'
    },
    3114
  );
  console.log(`Exit Code: ${res4.exitCode} | Server Running: ${res4.serverRunning}`);
  console.log(`Logs:\n${res4.logs.join('')}\n`);

  // Scenario 5: Missing BOOTSTRAP_ADMIN_KEY
  console.log('--- Testing Scenario 5: Missing BOOTSTRAP_ADMIN_KEY with clean DB ---');
  const res5 = await runServerScenario(
    'Missing BOOTSTRAP_ADMIN_KEY',
    {
      NODE_ENV: 'production',
      STORAGE_BACKEND: 'postgres',
      DATABASE_URL: stagingUrl,
      BOOTSTRAP_ADMIN_KEY: ''
    },
    3115
  );
  console.log(`Exit Code: ${res5.exitCode} | Server Running: ${res5.serverRunning}`);
  console.log(`Health Status: ${res5.healthStatus} | Operational API Status: ${res5.operationalApiStatus}`);
  console.log(`Health Body:`, res5.healthBody);
  console.log(`Logs:\n${res5.logs.join('')}\n`);

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
