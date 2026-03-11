/**
 * Local test runner — launches a real browser for debugging.
 * Usage:
 *   node src/local.js           → headless, saves screenshot
 *   node src/local.js --headed  → visible browser window
 */

require("dotenv").config();
const { launchLocal } = require("./browser");
const { run } = require("./handler");

(async () => {
  const headed = process.argv.includes("--headed");

  console.log(`Launching browser (${headed ? "headed" : "headless"}) with stealth...`);

  const browser = await launchLocal({ headed });

  try {
    const result = await run(browser, {
      headless: !headed,
    });

    console.log("\n--- Result ---");
    console.log("Success:", result.success);
    console.log("Final URL:", result.url);

    if (!headed) {
      const fs = require("fs");
      const screenshotPath = "screenshot.png";
      fs.writeFileSync(screenshotPath, Buffer.from(result.screenshot, "base64"));
      console.log(`Screenshot saved to ${screenshotPath}`);
    } else {
      console.log("\nBrowser is visible. Press Ctrl+C to close.");
      await new Promise(() => {});
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await browser.close();
  }
})();
