/**
 * Browser launch helper with stealth plugin to avoid bot detection.
 */

async function launchBrowser(options = {}) {
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

module.exports = { launchBrowser };
