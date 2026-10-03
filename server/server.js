import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

let selectedGemmaModel = process.env.GEMMA_MODEL || 'gemma-2-27b-it';

// Helper to discover newest Gemma model on startup if API key is set
async function discoverGemmaModel() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.log('[Server] GOOGLE_API_KEY not found in environment. Using fallback rule-based coach mode when offline.');
    return;
  }
  if (process.env.GEMMA_MODEL) {
    selectedGemmaModel = process.env.GEMMA_MODEL;
    console.log(`[Server] Using GEMMA_MODEL from .env: ${selectedGemmaModel}`);
    return;
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!res.ok) {
      console.warn(`[Server] Failed to list models from Gemini API: ${res.status} ${res.statusText}`);
      return;
    }
    const data = await res.json();
    const gemmaModels = (data.models || []).filter(m => m.name && m.name.toLowerCase().includes('gemma'));
    
    if (gemmaModels.length > 0) {
      // Prefer Gemma 4 if listed, otherwise pick newest/highest version
      const gemma4 = gemmaModels.find(m => m.name.includes('gemma-4') || m.displayName?.includes('Gemma 4'));
      if (gemma4) {
        selectedGemmaModel = gemma4.name.replace('models/', '');
      } else {
        // Sort descending by name string
        gemmaModels.sort((a, b) => b.name.localeCompare(a.name));
        selectedGemmaModel = gemmaModels[0].name.replace('models/', '');
      }
      console.log(`[Server] Discovered and selected Gemma model: ${selectedGemmaModel}`);
    } else {
      console.log(`[Server] No Gemma specific models found in API list, defaulting to: ${selectedGemmaModel}`);
    }
  } catch (err) {
    console.warn('[Server] Error discovering Gemma model:', err.message);
  }
}

// Rule-based fallback generator
function getRuleBasedFallback(data) {
  const violations = data.violations || [];
  const exercise = data.current_exercise || 'Desk Posture';
  
  let summary = 'Posture is in good alignment. Maintain upright position.';
  let fixes = ['Keep feet flat on the floor', 'Relax shoulders', 'Keep monitor at eye level'];
  let exercises = [
    { name: 'Chin Tucks', how: 'Pull head straight back gently keeping chin level', sets_reps: '2 sets of 10 reps' },
    { name: 'Wall Angels', how: 'Flat back against wall, slide arms up and down', sets_reps: '2 sets of 12 reps' },
    { name: 'Thoracic Extensions', how: 'Extend gently over back of chair with arms supported', sets_reps: '3 sets of 5 breaths' }
  ];

  if (violations.includes('Neck Forward Tilt')) {
    summary = 'Forward head posture detected. Your neck is leaning past the healthy threshold.';
    fixes = ['Pull chin back into a neutral position', 'Elevate screen to eye level', 'Avoid leaning toward display'];
    exercises = [
      { name: 'Chin Tucks', how: 'Pull head straight back like making a double chin', sets_reps: '2 sets of 10 reps' },
      { name: 'Neck Isometrics', how: 'Press palm against forehead, resist with neck muscles', sets_reps: '3 holds of 5 seconds' }
    ];
  } else if (violations.includes('Trunk Slouch')) {
    summary = 'Trunk slouched. Spine is curved forward past safe posture limits.';
    fixes = ['Engage core lightly', 'Position hips deep in chair seat', 'Avoid leaning forward'];
    exercises = [
      { name: 'Thoracic Extensions', how: 'Lean back gently over chair backrest', sets_reps: '2 sets of 10 reps' },
      { name: 'Cat-Cow Stretch', how: 'On all fours, alternate arching and rounding back', sets_reps: '2 sets of 10 reps' }
    ];
  } else if (violations.includes('Shoulders Uneven')) {
    summary = 'Shoulder asymmetry detected. One shoulder is significantly higher than the other.';
    fixes = ['Distribute weight evenly on both hips', 'Avoid leaning on one armrest', 'Keep shoulders relaxed'];
    exercises = [
      { name: 'Shoulder Shrugs', how: 'Raise shoulders to ears, roll back and lower gently', sets_reps: '2 sets of 12 reps' },
      { name: 'Doorway Chest Stretch', how: 'Place forearms on door frame, step forward gently', sets_reps: '3 holds of 15 seconds' }
    ];
  } else if (exercise === 'Squat') {
    summary = 'Squat form active. Ensure knees stay aligned with toes and depth is full.';
    fixes = ['Keep chest up', 'Drive knees outwards slightly', 'Push through heels'];
    exercises = [
      { name: 'Goblet Squat Practice', how: 'Hold weight at chest level, squat with deep hips', sets_reps: '3 sets of 10 reps' },
      { name: 'Hip Opener Stretch', how: 'Deep squat hold with elbows pushing knees out', sets_reps: '2 holds of 30 seconds' }
    ];
  }

  return {
    summary,
    fixes,
    exercises,
    warning: 'Not medical advice. Stop if you feel pain.',
    source: 'Offline coach'
  };
}

let activeRequest = false;

app.post('/api/coach', async (req, res) => {
  if (activeRequest) {
    // If another request is active, return fallback immediately to avoid blocking client
    return res.json(getRuleBasedFallback(req.body));
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return res.json(getRuleBasedFallback(req.body));
  }

  activeRequest = true;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 second hard timeout

  try {
    const { avg_angles, violations, current_exercise, rep_count, frame_b64 } = req.body;

    const promptText = `
You are an expert biomechanics & posture coach. Analyze this real-time client posture data:
- Exercise mode: ${current_exercise || 'Desk Posture'}
- Completed reps: ${rep_count || 0}
- Active Form Violations: ${JSON.stringify(violations || [])}
- 10-Second Averaged Joint Angles (degrees): ${JSON.stringify(avg_angles || {})}

Respond ONLY with a single valid JSON object strictly adhering to this structure:
{
  "summary": "1 sentence clear correction summary",
  "fixes": ["Actionable fix 1", "Actionable fix 2"],
  "exercises": [
    {"name": "Exercise Name", "how": "Brief execution instructions", "sets_reps": "e.g. 2 sets of 10"}
  ],
  "warning": "Not medical advice. Stop if you feel pain."
}
Do NOT include markdown formatting or extra text outside JSON.
`;

    const contents = [];
    if (frame_b64 && typeof frame_b64 === 'string') {
      const base64Data = frame_b64.includes(',') ? frame_b64.split(',')[1] : frame_b64;
      contents.push({
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
          { text: promptText }
        ]
      });
    } else {
      contents.push({
        parts: [{ text: promptText }]
      });
    }

    const modelName = selectedGemmaModel || 'gemma-2-27b-it';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const apiRes = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!apiRes.ok) {
      console.warn(`[Gemma API] Call failed with status ${apiRes.status}`);
      return res.json(getRuleBasedFallback(req.body));
    }

    const resData = await apiRes.json();
    const candidateText = resData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      return res.json(getRuleBasedFallback(req.body));
    }

    // Defensive parsing: strip code blocks
    let cleanJsonStr = candidateText.trim();
    cleanJsonStr = cleanJsonStr.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
    const firstBrace = cleanJsonStr.indexOf('{');
    const lastBrace = cleanJsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanJsonStr = cleanJsonStr.substring(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(cleanJsonStr);
    parsed.source = 'Gemma';
    if (!parsed.warning) {
      parsed.warning = 'Not medical advice. Stop if you feel pain.';
    }

    return res.json(parsed);
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('[Gemma API] Exception or timeout:', err.message);
    return res.json(getRuleBasedFallback(req.body));
  } finally {
    activeRequest = false;
  }
});

app.listen(PORT, async () => {
  console.log(`[PhysioTrace AI] Server running at http://localhost:${PORT}`);
  await discoverGemmaModel();
});
