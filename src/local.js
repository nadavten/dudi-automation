/**
 * Local test runner — launches a real browser for debugging.
 * Usage:
 *   node src/local.js <bankAccount> <bankId> <snifId> <asmahtaNumber> <valueDate> <sum> [--headed]
 */

require("dotenv").config();
const { launchLocal } = require("./browser");
const { run } = require("./handler");

(async () => {
  const headed = process.argv.includes("--headed");
  const args = process.argv.slice(2).filter((a) => a !== "--headed");

  if (args.length < 6) {
    console.error("Usage: node src/local.js <bankAccount> <bankId> <snifId> <asmahtaNumber> <valueDate> <sum> [--headed]");
    process.exit(1);
  }

  const [bankAccount, bankId, snifId, asmahtaNumber, valueDate, sum] = args;

  console.log(`Launching browser (${headed ? "headed" : "headless"}) with stealth...`);
  console.log(`Bank: ${bankId}/${snifId}/${bankAccount}, Asmahta: ${asmahtaNumber}, Date: ${valueDate}, Sum: ${sum}`);

  const browser = await launchLocal({ headed });

  try {
    const result = await run(browser, {
      bankAccount,
      bankId,
      snifId,
      asmahtaNumber,
      valueDate,
      sum,
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
