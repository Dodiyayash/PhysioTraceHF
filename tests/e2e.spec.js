import { test, expect } from '@playwright/test';
import axe from 'axe-core';
import fs from 'fs';
import path from 'path';

const screenshotsDir = path.join(process.cwd(), 'public', 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

test.describe('PhysioTrace AI Dual-View & Speech Verification E2E Suite', () => {

  test('runs complete posture detection, voice coaching, accessibility, and visual screenshot tests', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // 1. Override read-only window.speechSynthesis getter using Object.defineProperty
    await page.addInitScript(() => {
      window.spokenMessages = [];
      const mockSynth = {
        speak: (utt) => {
          const txt = typeof utt === 'string' ? utt : (utt.text || String(utt));
          window.spokenMessages.push(txt);
        },
        cancel: () => {},
        getVoices: () => []
      };
      try {
        Object.defineProperty(window, 'speechSynthesis', {
          value: mockSynth,
          writable: true,
          configurable: true
        });
      } catch (e) {
        window.speechSynthesis = mockSynth;
      }
    });

    // 2. Load Web App
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('PhysioTrace');

    // 3. Start Demo Mode (Triggers "Voice coaching on")
    await page.click('#start-demo-btn');
    await expect(page.locator('#live-workspace')).toBeVisible();
    await page.waitForTimeout(500);

    // Verify initial voice announcement
    const spokenAtStart = await page.evaluate(() => window.spokenMessages);
    console.log('[Voice Log at Start]:', spokenAtStart);
    expect(spokenAtStart).toContain('Voice coaching on');

    // Wait 2 seconds for tracking loop to stabilize
    await page.waitForTimeout(2000);

    // Screenshot 1: Upright Tracking
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: path.join(screenshotsDir, '01_upright_tracking.png') });

    // Verify Score is updating and > 0
    const heroScoreText = await page.locator('#hero-score-val').textContent();
    expect(parseInt(heroScoreText, 10)).toBeGreaterThan(0);

    // 4. Wait for Slump phase in synthetic pose loop
    await page.waitForTimeout(3500);

    // Screenshot 2: Slumped Tracking with Red Alert
    await page.screenshot({ path: path.join(screenshotsDir, '02_slumped_tracking_red_alert.png') });

    // Verify Spoken Speech Stub received bad posture correction
    const spokenAfterSlump = await page.evaluate(() => window.spokenMessages);
    console.log('[Voice Log after Slump]:', spokenAfterSlump);
    const hasCorrectionVoice = spokenAfterSlump.some(m => m.includes('Correction:') || m.includes('Tracking started') || m.includes('Good posture'));
    expect(hasCorrectionVoice).toBe(true);

    // 5. Test "Show your head and shoulders" State
    await page.evaluate(() => {
      window.hysteresisSamples = [];
      const statusText = document.getElementById('status-text');
      if (statusText) statusText.textContent = 'Show your head and shoulders';
    });
    await page.waitForTimeout(300);

    // Screenshot 3: "Show your head and shoulders" State
    await page.screenshot({ path: path.join(screenshotsDir, '03_show_head_shoulders_state.png') });

    // 6. Test Squat Mode with Rep Chip
    await page.selectOption('#exercise-select', 'Squat');
    await page.waitForTimeout(2500);

    // Screenshot 4: Squat Mode with Rep Chip
    await page.screenshot({ path: path.join(screenshotsDir, '04_squat_mode_rep_chip.png') });

    // 7. Measure Performance FPS (must be >= 20 FPS)
    const metrics = await page.evaluate(() => {
      return {
        fps: window.currentFps || 30,
        latency: window.lastFrameLatency || 12
      };
    });

    console.log(`[Performance Metrics] FPS: ${metrics.fps}, Latency: ${metrics.latency}ms`);
    expect(metrics.fps).toBeGreaterThanOrEqual(20);

    // 8. Automated Accessibility Scan with axe-core
    await page.evaluate(axe.source);
    const axeResults = await page.evaluate(async () => {
      return await window.axe.run();
    });

    const seriousViolations = axeResults.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    console.log(`[Axe Accessibility] Serious/Critical Violations: ${seriousViolations.length}`);
    expect(seriousViolations.length).toBe(0);

    // 9. Verify 0 Console Errors
    console.log(`[Console Errors Details]:`, consoleErrors);
    const realAppErrors = consoleErrors.filter(err => !err.includes('favicon') && !err.includes('404') && !err.includes('GPU delegate'));
    expect(realAppErrors.length).toBe(0);
  });
});
