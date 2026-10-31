const fetch = globalThis.fetch;

async function runFullTestSuite() {
  console.log('====================================================');
  console.log('  PAIMANA SIH26103 FULL END-TO-END VERIFICATION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  async function check(name, fn) {
    try {
      process.stdout.write(`[TEST] ${name} ... `);
      await fn();
      console.log('PASSED ✓');
      passed++;
    } catch (e) {
      console.log(`FAILED ✗ (${e.message})`);
      failed++;
    }
  }

  // 1. Direct FastAPI Backend Health
  await check('FastAPI Direct /health', async () => {
    const res = await fetch('http://127.0.0.1:8000/health');
    if (res.status !== 200) throw new Error('Status ' + res.status);
    const data = await res.json();
    if (data.status !== 'healthy') throw new Error('Health status ' + data.status);
    if (!data.dataset?.loaded) throw new Error('Dataset not loaded');
  });

  // 2. Vite Reverse Proxy /health
  await check('Vite Dev Server Proxy /health', async () => {
    const res = await fetch('http://localhost:5173/health');
    if (res.status !== 200) throw new Error('Status ' + res.status);
    const data = await res.json();
    if (data.status !== 'healthy') throw new Error('Health status ' + data.status);
  });

  // 3. Vite Frontend Root HTML
  await check('Frontend Web App Serving (http://localhost:5173/)', async () => {
    const res = await fetch('http://localhost:5173/');
    if (res.status !== 200) throw new Error('Status ' + res.status);
    const html = await res.text();
    if (!html.includes('root')) throw new Error('Root div missing');
    if (!html.includes('PAIMANA')) throw new Error('PAIMANA title missing');
  });

  // 4. Project Lookup (400010 - Leh Airport)
  await check('API /projects/400010 Project Lookup', async () => {
    const res = await fetch('http://localhost:5173/projects/400010');
    if (res.status !== 200) throw new Error('Status ' + res.status);
    const data = await res.json();
    if (data.project_id !== '400010') throw new Error('Unexpected ID ' + data.project_id);
    if (!data.project_name.includes('Leh Airport')) throw new Error('Unexpected name ' + data.project_name);
  });

  // 5. Analytics Summary
  await check('API /analytics/summary', async () => {
    const res = await fetch('http://localhost:5173/analytics/summary');
    if (res.status !== 200) throw new Error('Status ' + res.status);
    const data = await res.json();
    if (data.total_projects < 2000) throw new Error('Total projects ' + data.total_projects);
  });

  // 6. Progress Trajectory Forecast
  await check('API /ai/forecast/400010', async () => {
    const res = await fetch('http://localhost:5173/ai/forecast/400010');
    if (res.status !== 200) throw new Error('Status ' + res.status);
    const data = await res.json();
    if (!data.trajectory || data.trajectory.length === 0) throw new Error('Empty trajectory');
    if (typeof data.model_metadata.estimated_monthly_velocity_pct !== 'number') throw new Error('Invalid velocity');
  });

  // 7. Schedule Delay Risk
  await check('API /ai/delay-risk/400010', async () => {
    const res = await fetch('http://localhost:5173/ai/delay-risk/400010');
    if (res.status !== 200) throw new Error('Status ' + res.status);
    const data = await res.json();
    if (!data.risk_level) throw new Error('Missing risk_level');
    if (!Array.isArray(data.risk_indicators)) throw new Error('Missing risk_indicators');
  });

  // 8. Financial & Progress Anomalies
  await check('API /ai/anomalies/400010', async () => {
    const res = await fetch('http://localhost:5173/ai/anomalies/400010');
    if (res.status !== 200) throw new Error('Status ' + res.status);
    const data = await res.json();
    if (!data.anomaly_status) throw new Error('Missing anomaly_status');
    if (!Array.isArray(data.indicators)) throw new Error('Missing indicators');
  });

  // 9. Executive Intelligence Report
  await check('API /ai/report/400010', async () => {
    const res = await fetch('http://localhost:5173/ai/report/400010');
    if (res.status !== 200) throw new Error('Status ' + res.status);
    const data = await res.json();
    if (!data.report_id) throw new Error('Missing report_id');
    if (!data.executive_summary?.overall_health) throw new Error('Missing overall_health');
    if (!Array.isArray(data.recommended_actions)) throw new Error('Missing recommended_actions');
  });

  // 10. AI Assistant with Grounding & Session Memory
  await check('API /ai/assistant Stage 1 & Stage 2 Conversational Flow', async () => {
    const sessId = 'test-e2e-' + Date.now();
    const res1 = await fetch('http://localhost:5173/ai/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'What is the physical progress and cost of project 400010?',
        session_id: sessId,
        include_analytical_context: true
      })
    });
    if (res1.status !== 200) throw new Error('Step 1 status ' + res1.status);
    const d1 = await res1.json();
    if (d1.project_id !== '400010') throw new Error('Project ID not extracted: ' + d1.project_id);
    if (!d1.answer) throw new Error('Empty answer');

    // Follow up without project ID
    const res2 = await fetch('http://localhost:5173/ai/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'Is there any cost overrun?',
        session_id: sessId
      })
    });
    if (res2.status !== 200) throw new Error('Step 2 status ' + res2.status);
    const d2 = await res2.json();
    if (!d2.answer) throw new Error('Empty follow up answer');
  });

  console.log('\n====================================================');
  console.log(`RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================\n');

  if (failed > 0) process.exit(1);
}

runFullTestSuite().catch(err => {
  console.error(err);
  process.exit(1);
});
