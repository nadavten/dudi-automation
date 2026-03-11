# Dudi — Playwright Lambda Browser Automation

Playwright-based browser automation that runs as an AWS Lambda function.  
Simulates human-like browsing with realistic delays, mouse movement, and typing.

## Project Structure

```
src/
  handler.js   — Lambda handler + core login logic
  human.js     — Human simulation utilities (delays, mouse, typing)
  local.js     — Local test runner for debugging
esbuild.config.js — Build config for Lambda packaging
```

## Local Development

### Prerequisites

- Node.js 18+
- Chromium installed via Playwright

### Install

```bash
npm install
npx playwright install chromium
```

### Run locally (visible browser for debugging)

```bash
npm start
```

### Run locally (headless, saves screenshot)

```bash
npm run start:headless
```

## AWS Lambda Deployment

### Build

```bash
npm run build
```

### Package as zip

```bash
npm run package
```

Upload `dist/lambda.zip` to your Lambda function.

### Lambda Configuration

- **Runtime**: Node.js 18.x
- **Handler**: `handler.handler`
- **Memory**: 1024 MB minimum (recommended: 1600 MB)
- **Timeout**: 60 seconds
- **Layer**: Add the `playwright-aws-lambda` Chromium layer

### Invoke with custom credentials (optional)

```json
{
  "username": "שירות גרי",
  "password": "atid@11"
}
```
