# Dudi — Playwright Browser Automation API

Express API that automates browser interactions on AtidWeb.
Simulates human-like browsing with realistic delays, mouse movement, and typing.

## Project Structure

```
src/
  server.js    — Express API server
  handler.js   — Core automation logic (login, Excel, form filling)
  human.js     — Human simulation utilities (delays, mouse, typing)
  browser.js   — Browser launcher with stealth
  local.js     — CLI test runner for debugging
```

## Setup

```bash
npm install
npx playwright install chromium
```

Copy `.env.example` to `.env` and fill in credentials.

## Run as API Server

```bash
npm start              # headless
npm run start:headed   # visible browser (for debugging)
```

### API Endpoints

**POST /run**

```json
{
  "bankAccount": "26423",
  "bankId": "13",
  "snifId": "54",
  "asmahtaNumber": "123",
  "valueDate": "22042028",
  "sum": "456"
}
```

**GET /health** — health check

### Example

```bash
curl -X POST http://localhost:3000/run \
  -H "Content-Type: application/json" \
  -d '{"bankAccount":"26423","bankId":"13","snifId":"54","asmahtaNumber":"123","valueDate":"22042028","sum":"456"}'
```

## Run as CLI (for debugging)

```bash
node src/local.js <bankAccount> <bankId> <snifId> <asmahtaNumber> <valueDate> <sum> [--headed]
```
