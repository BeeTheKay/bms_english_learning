# Technical Documentation — BMS English Exam Practice Tool

Everything a new session needs to maintain or extend the tool.

---

## File layout

```
english_learning/
  index.html          ← shell only: <link> to CSS + 3 <script> tags
  css/
    styles.css        ← all CSS (variables + design system)
  js/
    questions.js      ← const QUESTIONS = [...] only (105 questions)
    core.js           ← config, state, storage, SM-2 selection, answer checking, dark mode
    render.js         ← all rendering, app actions, event handlers, boot
```

**Load order matters.** `index.html` loads the scripts in this sequence:

```html
<script src="js/questions.js"></script>   <!-- QUESTIONS global defined first -->
<script src="js/core.js"></script>         <!-- state, helpers — can reference QUESTIONS -->
<script src="js/render.js"></script>       <!-- render functions + boot (initDark(); render();) -->
```

All variables and functions are plain globals — no `import`/`export`/`require`. The tool opens via `file://` with no dev server.

### `js/core.js` — declaration order

```
LENGTH_RANGES, TYPE_LABELS, MC_KEYS, MC_HOME   constants
loadProgress()                                  must be before state (called inline)
state                                           single mutable state object
saveProgress()
getQP(id), updateQP(id, wasCorrect)            per-question progress helpers
weight(id), pickQuestions(n), targetLen()      SM-2 selection
normalise(s), checkAnswer(q, userAns)          answer checking
isDark(), toggleDark(), initDark()             dark mode
```

### `js/render.js` — declaration order

```
startTest(), submitAnswer(), nextQuestion(), finishTest()   app actions
darkToggleBtn()                                             returns HTML string
render()                                                    top-level renderer
renderLengthSelector(active), renderSessionHistory(sessions)
renderStart(), renderTest()                                 screen renderers
showAnsWrap()                                               returns HTML string
renderMC(q), renderFill(q), renderWordForm(q),
renderTransform(q), renderTF(q), renderError(q)            question renderers
showFeedback(q, correct, userAns)
renderSummary()
attachHandlers()                                            DOM event wiring
esc(s)                                                      HTML-escape utility
keydown listener (global)
initDark(); render();                                       boot
```

---

## Question data structure

Every question is a plain JS object. All fields are required unless marked optional.

```javascript
{
  id:        "mc_001",              // stable unique string — NEVER reuse or change
  type:      "mc",                  // see Type reference below
  topic:     "present_perfect",     // snake_case — used for weak-area tracking
  question:  "She _____ here.",     // prompt text shown to user
  options:   ["a","b","c","d"],     // MC only — exactly 4 strings; omit for other types
  answer:    "has lived",           // canonical correct answer (string)
  alternates:["has been living"],   // other accepted answers; [] if none
  hint:      "Use present perfect…",// shown after any answer; explains the rule
  passage:   "Reading text…",       // tf type only — shared across a group of questions
}
```

### Type reference

| `type` | UI behaviour | Notes |
|---|---|---|
| `mc` | 4 clickable buttons | Must have `options` array of exactly 4 strings |
| `fill` | Text input + Check | Checks case-insensitively against `answer` and `alternates` |
| `word_form` | Text input + Check | Put root word in `[brackets]` in `question` — rendered highlighted |
| `transform` | Text input + Check | Append `\nKEY WORD: WORD` to `question` — parser splits on that marker |
| `tf` | Three buttons: True / False / Not Mentioned | Must have `passage` field; `answer` must be exactly `"True"`, `"False"`, or `"Not Mentioned"` |
| `error` | Text input + Check | `answer` is the incorrect word/phrase the user must identify |

### ID naming convention

| Type | Prefix | Example |
|---|---|---|
| `mc` | `mc_` | `mc_026` |
| `fill` | `fill_` | `fill_021` |
| `word_form` | `wf_` | `wf_016` |
| `transform` | `tr_` | `tr_016` |
| `tf` | `tf_` | `tf_016` |
| `error` | `err_` | `err_016` |

Use zero-padded three-digit numbers. The current highest IDs are: `mc_025`, `fill_020`, `wf_015`, `tr_015`, `tf_015`, `err_015`.

---

## Adding or editing questions

### To add new questions

1. Open `js/questions.js` in a text editor.
2. Scroll to the relevant section comment (e.g., `// ── MULTIPLE CHOICE ──`).
3. Paste the new object before the closing `];` of that section, or anywhere inside the array — order does not matter.
4. Assign the next available ID for that type (e.g., `mc_026`).
5. Save and reload the browser tab.

Example — adding one fill question:

```javascript
{id:"fill_021",type:"fill",topic:"prepositional_adjectives",
question:"She is very proud _____ her son's achievements.",
answer:"of",alternates:[],
hint:"The fixed pattern is 'proud of something'."},
```

### To add a new True/False/Not Mentioned passage

TF questions that share a passage must each carry the **full passage text** in their `passage` field (they don't reference each other). Group them by giving them consecutive IDs and keep them physically adjacent in the array so they're easy to maintain. Aim for 3–5 questions per passage.

Example structure:
```javascript
{id:"tf_016",type:"tf",topic:"reading_comprehension",
passage:"Long reading text here…",
question:"The passage states X.",
answer:"True",alternates:[],hint:"…"},

{id:"tf_017",type:"tf",topic:"reading_comprehension",
passage:"Long reading text here…",   // same text, repeated
question:"The author believes Y.",
answer:"False",alternates:[],hint:"…"},
```

### To edit an existing question

Find the question by its `id` (Ctrl+F in any editor). Edit only the fields you need. **Never change `id`** — it is the key used in localStorage progress data. Changing an ID silently resets that question's progress record.

### To remove a question

Delete the entire `{…}` object from the array. If the deleted question had progress data in a user's localStorage, it will simply be ignored. No cleanup needed.

---

## Topic tags

Topics are arbitrary `snake_case` strings. They are used only for:
- The "topics missed" list on the summary screen
- The "all-time weak areas" panel

Using consistent tags across questions groups them correctly. Current tags in use:

```
present_perfect_vs_past_simple    past_continuous         past_perfect
present_perfect_continuous        future_forms            conditionals
passive                           reported_speech         state_verbs
modal_verbs                       tag_questions           articles
quantifiers                       countable_uncountable   adjectives_ed_ing
comparative_superlative           relative_clauses        adverbs_vs_adjectives
conjunctions                      prepositions_time       prepositions_place
verb_patterns_gerund              verb_patterns_gerund_infinitive
prepositional_verbs               prepositional_adjectives
phrasal_verbs                     collocations            word_building
too_enough                        reading_comprehension
```

To add a new topic, just use a new `snake_case` string — no registration needed.

---

## SM-2 weighted selection

**Location:** `js/core.js` — `weight()` and `pickQuestions()`.

```javascript
function weight(id) {
  const p = getQP(id);          // {attempts, correct, ease, lastShown}
  if (p.attempts === 0) return 2.0;     // never seen → high priority
  let w = 1.0;
  const acc = p.correct / p.attempts;
  if (acc < 0.5) w *= 3.0;             // struggling → boost
  if (p.correct >= 3 && acc >= 0.8) w *= 0.3;  // mastered → suppress
  const hrs = (Date.now() - p.lastShown) / 3600000;
  w *= Math.min(1.5, hrs / 24 + 0.1);  // time decay (max 1.5×)
  return Math.max(0.1, w);             // floor to prevent zero
}
```

`pickQuestions(n)` does weighted-random sampling without replacement: it picks one question at a time, weighted, then removes it from the pool and repeats until `n` questions are collected.

### Tuning the algorithm

| Goal | Change |
|---|---|
| Surface weak questions more aggressively | Increase the `3.0` multiplier |
| Retire mastered questions faster | Lower the `0.3` suppression or reduce the streak threshold |
| Make new questions appear more often | Increase the `2.0` never-seen weight |
| Make time a bigger factor | Increase the `1.5` cap or change the `hrs/24` formula |

---

## Test length configuration

**Location:** `js/core.js` — `LENGTH_RANGES` constant.

```javascript
const LENGTH_RANGES = { short:[8,10], medium:[15,18], long:[25,30] };
```

Actual count per session is a random integer in `[lo, hi]` inclusive, chosen in `targetLen()`. To change ranges, edit this object. The three keys (`short`, `medium`, `long`) correspond to the three length buttons.

---

## Answer checking

**Location:** `js/core.js` — `normalise()` and `checkAnswer()`.

```javascript
function normalise(s) {
  return s.trim().toLowerCase().replace(/['']/g, "'").replace(/[.,!?;:]+$/, '');
}
function checkAnswer(q, userAns) {
  const u = normalise(userAns);
  if (q.type === 'tf') return u !== '' && normalise(q.answer) === u;
  if (q.type === 'error') {
    const parts = userAns.split('|||');
    const userWrong = normalise(parts[0] || '');
    const userFix   = normalise(parts[1] || '');
    if (!userWrong) return false;
    const wrongOk = userWrong === normalise(q.answer) ||
                    (q.alternates || []).some(a => normalise(a) === userWrong);
    const validFixes = [q.correction || '', ...(q.correctionAlternates || [])].map(normalise);
    return wrongOk && validFixes.includes(userFix);
  }
  if (!u) return false;
  if (q.type === 'transform' && q.gapAnswer) {
    if (normalise(q.gapAnswer) === u) return true;
    return (q.gapAlternates || []).some(a => normalise(a) === u);
  }
  if (normalise(q.answer) === u) return true;
  return (q.alternates || []).some(a => normalise(a) === u);
}
```

Rules:
- Comparison is **case-insensitive** and trims leading/trailing whitespace.
- Smart quotes (`'`) are normalised to straight apostrophes (`'`).
- For `tf`, only exact matches against `"True"`, `"False"`, `"Not Mentioned"` (after normalise) are accepted.
- For all other types, the user answer must match either `answer` or one entry in `alternates`.
- MC answers are compared the same way — `data-val` on the button is the option string.

To accept British and American spelling variants, add both to `alternates`:
```javascript
answer:"favour", alternates:["favor"]
```

---

## localStorage schema

Key: `bms_eng_progress`

```javascript
{
  "questions": {
    "mc_001": { "attempts": 4, "correct": 3, "ease": 2.6, "lastShown": 1748520000000 },
    "fill_002": { "attempts": 1, "correct": 0, "ease": 2.3, "lastShown": 1748520000000 }
    // …one entry per question ID that has been seen
  },
  "sessions": [
    { "date": 1748520000000, "score": 14, "total": 18, "topics": ["conditionals", "passive"] }
    // …one entry per completed session; topics = wrong-answer topic tags
  ]
}
```

`ease` is clamped to `[1.3, 3.5]`. It is updated per answer but not currently used in the weight function (only `attempts`, `correct`, and `lastShown` are used). It exists for future use.

To **reset all progress**: delete the `bms_eng_progress` key in DevTools → Application → Local Storage.

To **reset one question**: find its ID and delete just that key inside `questions`.

---

## Rendering architecture

The app uses a simple innerHTML-swap renderer — no framework, no virtual DOM. All rendering lives in `js/render.js`.

```
render()                calls renderStart() | renderTest() | renderSummary()
                        sets app.innerHTML
                        calls attachHandlers()

attachHandlers()        wires all DOM events after every render()
                        (length buttons, start/quit/next/check, collapsibles)
```

All render functions return HTML strings. The `esc()` utility escapes all user-controlled or question-sourced text before inserting into HTML.

### Screen flow

```
start  ──startTest()──▶  test  ──finishTest()──▶  summary
  ▲                        │                         │
  └──────────────────────  │ quitBtn                 │ backHomeBtn / newTestBtn
                           ▼
                     (next question loop)
```

### Adding a new question type

1. Add the type string to `TYPE_LABELS` in `js/core.js`.
2. Write a `renderXxx(q)` function in `js/render.js` that returns an HTML string with `id="feedback"` and `id="nextWrap"` divs at the end.
3. Add a branch inside `renderTest()` to call your function.
4. Add event handler wiring in `attachHandlers()`.
5. Ensure your type's answer is compared correctly in `checkAnswer()` in `js/core.js`.

---

## CSS conventions

All styles are in `css/styles.css`. CSS variables are declared in `:root` and `.dark`; all colour references use `var(--…)`. Key design tokens:

| Token | Value (light / dark) | Used for |
|---|---|---|
| `--accent` | `#4F46E5` / `#818CF8` | Buttons, progress bar, active states, type badges, key word pills, score |
| `--accent-light` | `#EEF2FF` / `#1E2035` | Hover/active backgrounds, focus ring, input glows |
| `--bg` | `#F7F8FA` / `#0F1117` | Page background |
| `--surface` | `#FFFFFF` / `#1A1D27` | Card and input backgrounds |
| `--green` / `--green-bg` | `#059669` / `#ECFDF5` | Border / background on correct answers |
| `--red` / `--red-bg` | `#DC2626` / `#FEF2F2` | Border / background on wrong answers |
| `--border` | `#E5E7EB` / `#2D3048` | Default border colour |
| Body font | `system-ui, -apple-system, 'Segoe UI', Roboto` | All UI chrome |
| Question font | `Georgia, serif` | `.q-text`, `.mc-opt`, `.t-input`, `.gap-row span` |
| Max width | `660px` | `#app` container |
| Card radius | `12px` | `.card`, stat boxes |
| Button radius | `8–10px` | Buttons and inputs |

---

## Common tasks — quick reference

| Task | Where |
|---|---|
| Add a question | `js/questions.js` — inside `const QUESTIONS = [...]`, before the closing `];` |
| Fix a wrong answer/hint | `js/questions.js` — find by `id`, edit `answer`, `alternates`, or `hint` |
| Change test lengths | `js/core.js` — `LENGTH_RANGES` constant |
| Tweak SM-2 weights | `js/core.js` — `weight()` function |
| Change localStorage key | `js/core.js` — `'bms_eng_progress'` in `loadProgress()` and `saveProgress()` |
| Add a new topic tag | Just use a new snake_case string in any question's `topic` field in `js/questions.js` |
| Change encouragement messages | `js/render.js` — `renderSummary()`, the `encouragement` assignment |
| Change the page title | `index.html` `<title>` tag and the `<h1>` in `renderStart()` / `renderTest()` in `js/render.js` |
| Add a fourth TF answer option | `js/render.js` — `renderTF()`, `attachHandlers()`, and `js/core.js` — `checkAnswer()` |
