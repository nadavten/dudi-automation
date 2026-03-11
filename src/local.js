/**
 * Local test runner — launches a real browser for debugging.
 * Usage:
 *   node src/local.js <bankAccount> <bankId> <snifId>           → headless
 *   node src/local.js <bankAccount> <bankId> <snifId> --headed  → visible browser
 */

require("dotenv").config();
const { launchLocal } = require("./browser");
const { run } = require("./handler");

(async () => {
  const headed = process.argv.includes("--headed");
  const args = process.argv.slice(2).filter((a) => a !== "--headed");

  if (args.length < 3) {
    console.error("Usage: node src/local.js <bankAccount> <bankId> <snifId> [--headed]");
    process.exit(1);
  }

  const [bankAccount, bankId, snifId] = args;

  console.log(`Launching browser (${headed ? "headed" : "headless"}) with stealth...`);
  console.log(`Bank account: ${bankAccount}, Bank ID: ${bankId}, Snif ID: ${snifId}`);

  const browser = await launchLocal({ headed });

  try {
    const result = await run(browser, {
      bankAccount,
      bankId,
      snifId,
      headless: !headed,
    });

    console.log("\n--- Result ---");
    console.log("Success:", result.success);
    console.log("Final URL:", result.url);
    console.log("Column A:", result.colA);
    console.log("Column B:", result.colB);

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
