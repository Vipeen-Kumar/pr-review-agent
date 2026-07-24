# PR Review Agent

`pr-review-agent` is a Gemini-powered code review project with a clean browser UI that reviews pull requests against issue context and company standards.

It is built as a small hackathon-style agent project with:

- `gitclaw` agent metadata
- a dedicated `pr-review` skill
- a Gemini review engine
- a browser UI with dark and light mode
- email login and sign-up
- Google login support when OAuth credentials are configured
- per-user saved review history
- profile display with avatar or initials
- optional company guideline upload support
- a CLI runner for reviewing pasted PR diffs

## Project Structure

```text
pr-review-agent/
├── agent.yaml
├── SOUL.md
├── RULES.md
├── README.md
├── skills/
│   └── pr-review/
│       └── SKILL.md
├── gemini.js
├── server.js
├── data/
│   └── store.json
├── run-agent.js
├── .env
└── package.json
```

## What This Project Does

This project takes issue context, PR context, and optional company formatting guidance, then sends everything to Gemini with a strict review prompt.

The model is asked to:

- rate the PR out of 10
- summarize the change
- identify bugs
- check edge cases
- suggest corrections
- look at time complexity
- comment on naming conventions
- flag security issues
- evaluate alignment with issue scope
- evaluate compliance with company expectations
- give a final verdict

The response is returned in this format:

```md
## Rating
...

## Summary
...

## Issues
- ...

## Corrections
- ...

## Verdict
APPROVE or REQUEST CHANGES
```

## How It Works

### 1. Input

You open the UI and provide:

- issue URL
- issue text
- PR URL
- PR text or diff
- previous code
- current code
- optional company name
- optional company formatting/rubric text
- optional uploaded guideline file

### 2. Prompting

The input is sent to the server, then passed into `reviewSubmission()` in `gemini.js`, which builds a structured review prompt for Gemini.

### 3. Gemini Review

The Gemini API analyzes the diff and produces review feedback.

### 4. Output

The result is displayed in the UI as a structured review with:

- rating
- summary
- issues
- corrections
- final verdict

## Requirements

Make sure you have:

- Node.js 18 or newer
- npm
- git
- a valid Gemini API key

## Installation

From the project folder:

```bash
npm install
```

## Environment Setup

Create or update `.env` with your Gemini key:

```env
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash
SESSION_SECRET=change_me
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

Notes:

- `GEMINI_API_KEY` is used by `gemini.js`
- `GOOGLE_API_KEY` is used by `gitclaw`
- `GEMINI_MODEL` can be changed if you want to use another supported Gemini model
- `SESSION_SECRET` signs login sessions
- Google login becomes active after adding `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

## How To Run The Project

### Run the web app

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

In the UI:

1. Sign up with email or log in
2. Optionally use Google login if OAuth is configured
3. Enter the issue URL or issue text
4. Enter the PR URL and/or paste PR text
5. Optionally paste previous and current code blocks
6. Optionally add company formatting rules
7. Optionally upload a `.txt`, `.md`, or `.json` guideline file
8. Click `Review PR`

The app will show a rating, issues, corrections, and a verdict.
Each completed review is saved to your account and shown in the history panel.

### Run interactive CLI mode

```bash
npm run cli
```

Then paste the PR diff and type `END` on its own line.

### Run the sample review

```bash
node run-agent.js --sample
```

This runs the built-in sample diff and shows the expected style of output.

### Start the gitclaw agent shell

```bash
npx gitclaw --help
```

If you want to use the full agent environment, make sure `GOOGLE_API_KEY` is available in your environment.

## Example Usage

Example input:

```diff
- function multiply(a, b) {
-   return a + b;
- }

+ function multiply(a, b) {
+   return a * b;
+ }
```

Example output:

- Rating out of 10
- Summary of what changed
- Issues found in the PR
- Corrections for code or PR structure
- Final verdict: `APPROVE` or `REQUEST CHANGES`

## Main Files

- `agent.yaml` defines the agent metadata and preferred model
- `SOUL.md` defines the agent identity and behavior style
- `RULES.md` defines review rules and constraints
- `skills/pr-review/SKILL.md` defines the PR review skill
- `gemini.js` builds and sends the review prompt to Gemini
- `server.js` serves the frontend and review API
- `data/store.json` stores users and saved review history
- `public/` contains the browser UI
- `run-agent.js` provides the CLI interface

## Notes

- The UI supports both light mode and dark mode
- The project can review using URLs, pasted PR text, or both
- The current default model is `gemini-2.0-flash`
- If your API quota is limited, you may need to adjust the model or billing setup

## Future Improvements

- accept PR input from a file
- fetch GitHub pull requests directly
- fetch and summarize issue details automatically
- add JSON output mode
- support automatic markdown report generation
- add tests for prompt formatting and error handling
