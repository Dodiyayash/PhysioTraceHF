import { test } from 'node:test';
import assert from 'node:assert/strict';

test('Server API: POST /api/coach returns valid coaching JSON', async () => {
  const samplePayload = {
    avg_angles: { neckTilt: 28, trunkLean: 14, shoulderDiff: 2, kneeAngle: 170 },
    violations: ['Neck Forward Tilt'],
    current_exercise: 'Desk Posture',
    rep_count: 0
  };

  const res = await fetch('http://localhost:3000/api/coach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(samplePayload)
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  
  assert.ok(data.summary);
  assert.ok(Array.isArray(data.fixes));
  assert.ok(data.fixes.length > 0);
  assert.ok(Array.isArray(data.exercises));
  assert.ok(data.exercises.length > 0);
  assert.ok(/Not medical advice/i.test(data.warning));
  assert.ok(data.source);
});
