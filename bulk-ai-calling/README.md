# Bulk AI Calling

A self-contained replica of a bulk AI calling tool: upload contacts, define an AI voice agent, run campaigns in parallel, watch live progress, read transcripts, export results. No npm dependencies (Node 18+).

```
npm start        # http://localhost:3000
npm test
```

## Features
- CSV upload / paste / drag-drop, phone normalisation (E.164), invalid + duplicate detection
- Agent setup: voice, language, opening line and instructions with `{{variable}}` placeholders from CSV columns, live preview
- Campaign engine: parallel-call limit, call window (9–5 etc.), start / pause / stop, persistence in `data.json`
- Live call table (dialing → ringing → in-progress → outcome), per-call transcript + summary + sentiment
- Analytics: answer rate, outcomes, talk time; dashboard across campaigns; CSV export

## Modes
- **Simulation (default)**: calls are simulated with realistic timing, outcomes and transcripts.
- **Live**: set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` and untick "Simulate". Real calls are placed and the opening line is spoken via Twilio `<Say>`. Fully interactive two-way AI conversation (STT → LLM → TTS over a media stream) is not included; hook it in `runLive` in `server.js`.

Only call people who have consented, and respect local telemarketing / TCPA / DNC rules.
