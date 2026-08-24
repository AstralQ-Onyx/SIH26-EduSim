/* ═══════════════════════════════════════════════════════════
   EduSim AI Service (ai/backend/ai-service.js)
   Backend intelligence bridge using Google Gemini SDK.
   Implements:
     - Layer 2: Structured Debugger & Minimal Fix Generator
     - Layer 3: Socratic Code Tutor (Learn Mode)
     - Layer 4: Full Code Generation + Auto Validation Loop (Build Mode)
   ═══════════════════════════════════════════════════════════ */

'use strict';

const path = require('path');

let GoogleGenerativeAI;
try {
  ({ GoogleGenerativeAI } = require('@google/generative-ai'));
} catch (e) {
  try {
    ({ GoogleGenerativeAI } = require(path.join(__dirname, '..', '..', 'agent', 'node_modules', '@google/generative-ai')));
  } catch (err) {
    console.error('[AI Service] Could not load @google/generative-ai package:', err.message);
  }
}

let genAI = null;
// Stable, publicly available Gemini models in priority order
const MODELS = ['gemini-3.6-flash'];

function initAI() {
  let apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  apiKey = apiKey.replace(/^["']|["']$/g, '').trim();

  if (!apiKey) {
    console.warn('[AI Service] ⚠ No GEMINI_API_KEY found in environment. AI features will report unconfigured.');
    return false;
  }
  if (!GoogleGenerativeAI) {
    console.error('[AI Service] ✗ @google/generative-ai is not installed.');
    return false;
  }
  try {
    genAI = new GoogleGenerativeAI(apiKey);
    console.log('[AI Service] ✓ Google Gemini SDK initialized.');
    return true;
  } catch (err) {
    console.error('[AI Service] ✗ Failed to initialize Google Gemini:', err.message);
    return false;
  }
}

async function callGeminiWithRetry(prompt) {
  if (!genAI && !initAI()) {
    throw new Error('GEMINI_API_KEY is not configured in agent/.env');
  }

  let lastErr = null;
  for (const mName of MODELS) {
    const maxAttempts = 3;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        console.log(`[AI Service] Trying model=${mName} attempt=${attempt + 1}`);
        const m = genAI.getGenerativeModel({ model: mName });
        const result = await m.generateContent(prompt);
        console.log(`[AI Service] ✓ Success with ${mName}`);
        return result.response.text();
      } catch (err) {
        lastErr = err;
        const msg = (err.message || '').toLowerCase();
        const isOverloaded = err.status === 429 || err.status === 503
          || msg.includes('429') || msg.includes('503')
          || msg.includes('overloaded') || msg.includes('quota')
          || msg.includes('fetch failed') || msg.includes('resource_exhausted');

        if (isOverloaded) {
          // Exponential backoff: 1s, 2s, 4s between attempts
          const delay = 1000 * Math.pow(2, attempt);
          console.warn(`[AI Service] ${mName} overloaded (attempt ${attempt + 1}), retrying in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        // Non-retryable error for this model, try next model
        console.warn(`[AI Service] ${mName} failed (non-retryable): ${err.message}`);
        break;
      }
    }
  }
  throw lastErr || new Error('All Gemini models are currently overloaded. Please try again in a moment.');
}

// ── Layer 2: Error Parsing & Root Cause Classification ───────
const COMMON_PATTERNS = [
  {
    regex: /Platform '([^']+)' not found/i,
    cause: 'Target Board Core Not Installed',
    hint: 'The hardware core for this board is not yet installed in arduino-cli. Switch to Arduino Uno or install the core via terminal.'
  },
  {
    regex: /'([^']+)' was not declared in this scope/i,
    cause: 'Undeclared Identifier',
    hint: 'A variable or library function was referenced before declaration or without including its header file.'
  },
  {
    regex: /expected ';' before/i,
    cause: 'Missing Semicolon',
    hint: 'A statement is missing a terminating semicolon on or preceding this line.'
  },
  {
    regex: /no matching function for call to/i,
    cause: 'Function Signature Mismatch',
    hint: 'The parameters passed do not match the expected function signature.'
  },
  {
    regex: /fatal error: ([^:]+): No such file or directory/i,
    cause: 'Missing Library Header',
    hint: 'An included library is not installed in the Arduino environment.'
  }
];

function parseCompileErrors(rawLog) {
  if (!rawLog) return [];
  const lines = rawLog.split('\n');
  const errors = [];

  for (const line of lines) {
    // Typical format: sketch.ino:14:5: error: ...
    const match = line.match(/(?:.*[\\/])?([^\\/:]+\.ino|\.cpp|\.h):(\d+):(\d+):\s*(error|warning):\s*(.+)/i);
    if (match) {
      const [, file, lineNum, colNum, type, msg] = match;
      if (type.toLowerCase() === 'error') {
        let patternMatch = null;
        for (const p of COMMON_PATTERNS) {
          if (p.regex.test(msg)) {
            patternMatch = p;
            break;
          }
        }
        errors.push({
          file,
          line: parseInt(lineNum, 10),
          column: parseInt(colNum, 10),
          message: msg.trim(),
          rootCause: patternMatch ? patternMatch.cause : 'Compilation Error',
          hint: patternMatch ? patternMatch.hint : null
        });
      }
    }
  }
  return errors;
}

// ── Context Serializer (Keep token budget bounded) ───────────
function serializeContext(ctx) {
  if (!ctx) return 'No context available.';
  const components = (ctx.virtualLabComponents || [])
    .map(c => `- ${c.name || c.type} (pins: ${JSON.stringify(c.pins || {})})`)
    .join('\n');

  return `
[Target Hardware]
Board: ${ctx.boardType || 'arduino:avr:uno'}
Language: ${ctx.language || 'Arduino C++'}

[Virtual Lab Circuit Components]
${components || 'None connected'}

[Current Sketch Buffer]
\`\`\`cpp
${ctx.sketch || '// empty'}
\`\`\`
`.trim();
}

// ── Layer 2: Debug & Explain ──────────────────────────────────
async function handleDebugRequest(context, compileOutput) {
  if (!genAI && !initAI()) {
    return {
      error: 'GEMINI_API_KEY is not configured in agent/.env',
      explanation: 'Please set your GEMINI_API_KEY in agent/.env to enable AI debugging.'
    };
  }

  const rawLog = compileOutput?.rawLog || compileOutput?.message || '';
  const parsedErrors = parseCompileErrors(rawLog);

  const prompt = `
You are an expert embedded systems and Arduino tutor.
Analyze this compilation error and provide:
1. A concise, friendly 1-paragraph explanation aimed at a student (no heavy jargon).
2. The specific line and root cause.
3. The smallest minimal code fix (show the exact diff or replacement snippet, do NOT rewrite the entire sketch).

${serializeContext(context)}

[Compilation Raw Log]
${rawLog}

Respond ONLY in valid JSON format matching this exact schema:
{
  "summary": "Short 1-sentence summary of the issue",
  "explanation": "Clear beginner explanation",
  "line": 12,
  "originalSnippet": "faulty code line(s)",
  "fixedSnippet": "corrected code line(s)",
  "fullFixedCode": "complete corrected sketch if easy, or null"
}
`;

  try {
    const responseText = await callGeminiWithRetry(prompt);
    const cleaned = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleaned);
    return {
      success: true,
      parsedErrors,
      ...data
    };
  } catch (err) {
    console.error('[AI Service] Debug LLM Error:', err);
    return {
      success: false,
      parsedErrors,
      explanation: 'Could not generate AI explanation. Please check the raw build log.',
      rawError: err.message
    };
  }
}

// ── Layer 3: Tutor Mode (Learn Mode) ──────────────────────────
async function handleTutorChat(context, userMessage, history = []) {
  const prompt = `
You are an engaging, supportive embedded systems tutor in EduSim's IDE.
The student is in **TUTOR MODE (Learn Mode)**.
Your goal is to guide the student Socratically rather than dumping a complete solution.

Follow these strict rules:
1. Explain the underlying hardware/software concept tailored to their target board (${context?.boardType || 'Arduino Uno'}) and placed components.
2. If their goal has multiple approaches, ask ONE short, friendly clarifying question (e.g. "Do you want to use delay() or non-blocking millis()?").
3. Break the solution into an ordered checklist of small, progressive steps.
4. Only reveal the code for the CURRENT step. DO NOT output the full final code. Encourage them to test each step.

Context:
${serializeContext(context)}

Student question: "${userMessage}"
`;

  try {
    const text = await callGeminiWithRetry(prompt);
    return {
      success: true,
      text,
      mode: 'tutor'
    };
  } catch (err) {
    return {
      success: false,
      text: `Error connecting to Gemini AI: ${err.message}`,
      mode: 'tutor'
    };
  }
}

// ── Layer 4: Full-Code Mode with Auto-Validation Loop ──────────
async function handleFullCodeGeneration(context, userMessage, compileToHexFn) {
  const fqbn = context?.boardType || 'arduino:avr:uno';

  let currentAttempt = 1;
  const maxAttempts = 2;
  let code = '';
  let lastError = null;
  let explanation = '';

  while (currentAttempt <= maxAttempts) {
    const prompt = `
You are an expert Arduino/Embedded systems engineer.
The learner has requested a **COMPLETE WORKING SKETCH** in **BUILD MODE**.

Target Board: ${fqbn}
Context:
${serializeContext(context)}

Learner Request: "${userMessage}"
${lastError ? `\n[PREVIOUS ATTEMPT FAILED COMPILATION WITH THIS ERROR - FIX IT]:\n${lastError}\nPrevious Code:\n${code}` : ''}

Rules:
1. Output valid, clean Arduino C++ code matching the hardware and placed components.
2. Format your response in JSON:
{
  "code": "/* complete Arduino sketch */",
  "explanation": "Concise section-by-section breakdown of how this code works."
}
`;

    try {
      const responseText = await callGeminiWithRetry(prompt);
      const cleaned = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      code = parsed.code;
      explanation = parsed.explanation;

      // Validate with compileToHex if provided
      if (compileToHexFn && typeof compileToHexFn === 'function') {
        try {
          await compileToHexFn(code, fqbn);
          // If compilation succeeded:
          return {
            success: true,
            validated: true,
            code,
            explanation,
            mode: 'build'
          };
        } catch (compileErr) {
          lastError = compileErr.message;
          console.warn(`[AI Service] Layer 4 validation attempt ${currentAttempt} failed:`, lastError);
          currentAttempt++;
        }
      } else {
        return {
          success: true,
          validated: false,
          code,
          explanation,
          mode: 'build'
        };
      }
    } catch (err) {
      return {
        success: false,
        text: `Generation error: ${err.message}`,
        mode: 'build'
      };
    }
  }

  // If validation attempts exceeded, return best effort with note
  return {
    success: true,
    validated: false,
    code,
    explanation: `${explanation}\n\n*(Note: Automatic verification encountered warnings: ${lastError})*`,
    mode: 'build'
  };
}

module.exports = {
  initAI,
  handleDebugRequest,
  handleTutorChat,
  handleFullCodeGeneration,
  parseCompileErrors
};
