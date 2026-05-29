# BMS English Exam Practice Tool

A self-contained, offline practice tool for the BMS (Berufsmaturitätsschule) English final exam, Cambridge A2–B1 level.

## Usage

Open `index.html` in any browser. No server, no internet, no installation required.

```
english_learning/
  index.html          ← open this in any browser
  css/
    styles.css        ← all styles
  js/
    questions.js      ← question bank (105 questions)
    core.js           ← state, SM-2 algorithm, answer checking
    render.js         ← UI rendering and event handlers
  requirements.pdf    ← source corpus the questions were built from
  CLAUDE.md           ← architecture decisions and build spec
  README.md           ← this file
  TECHNICAL.md        ← full internals reference for future sessions
```

## What it covers

All topics from `requirements.pdf`:

| Category | Topics |
|---|---|
| Tenses | Present Simple/Continuous, Present Perfect Simple/Continuous, Past Simple/Continuous, Past Perfect, Future (will / going to / present simple) |
| Grammar | Conditionals 0–III, Active/Passive, Reported Speech, State verbs, Modals, Tag questions, Articles, Quantifiers, Relative clauses, Comparatives/Superlatives |
| Verbs | Verb patterns (gerund vs infinitive), Prepositional verbs, Phrasal verbs |
| Vocabulary | Collocations (do/get/give/have/keep/make/take/tell), Prepositional adjectives, Word formation (prefixes/suffixes) |
| Reading | True/False/Not Mentioned passages |

## Question types

| Type | Format |
|---|---|
| Multiple Choice | 4 options, click to answer |
| Fill in the Blank | Type the missing word, press Enter or Check |
| Word Formation | Type the correct form of the word in [brackets] |
| Key Word Transformation | Rewrite a sentence using a given key word |
| True / False / Not Mentioned | Read a passage, click one of three buttons |
| Error Correction | Find and type the one incorrect word in the sentence |

## Test lengths

Select at the top of the start screen:

- **Short** — 8 to 10 questions
- **Medium** — 15 to 18 questions (default)
- **Long** — 25 to 30 questions

## How it gets smarter

Questions you answer incorrectly appear more often in future tests. Questions you answer correctly several times in a row appear less often. This is based on a simplified SM-2 spaced-repetition algorithm stored in `localStorage`.

## Progress

Progress is saved automatically in your browser's `localStorage` under the key `bms_eng_progress`. It persists across page reloads and browser restarts, but is local to the browser and device. To reset progress, open DevTools → Application → Local Storage → delete the `bms_eng_progress` key.

## Adding questions

See `TECHNICAL.md` — specifically the "Adding or editing questions" section.
