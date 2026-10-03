import { describe, it, expect } from 'vitest';

describe('Server API & Gemma Integration Tests', () => {
  it('returns valid JSON structure from /api/coach fallback mode', async () => {
    // Call server running or test offline rule fallback function directly
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

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('summary');
    expect(data).toHaveProperty('fixes');
    expect(Array.isArray(data.fixes)).toBe(true);
    expect(data).toHaveProperty('exercises');
    expect(Array.isArray(data.exercises)).toBe(true);
    expect(data.warning).toMatch(/Not medical advice/i);
    expect(data).toHaveProperty('source');
  });
});
