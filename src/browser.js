/**
 * Browser launch helpers for local and Lambda environments.
 * Uses playwright-extra + stealth plugin to avoid bot detection.
 */

async function launchLocal(options = {}) {
  const { chromium } = require("playwright-extra");
  const stealth = require("puppeteer-extra-plugin-stealth");
  chromium.use(stealth());

  const { headed = false } = options;

  const browser = await chromium.launch({
    headless: !headed,
    slowMo: headed ? 50 : 0,
    channel: "chrome",
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-infobars",
      "--window-size=1280,800",
    ],
  });

  return browser;
}

async function launchLambda() {
  const playwright = require("playwright-aws-lambda");
  return playwright.launchChromium({
    headless: true,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
    ],
  });
}

module.exports = { launchLocal, launchLambda };
