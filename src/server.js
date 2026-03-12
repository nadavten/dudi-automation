require("dotenv").config();
const express = require("express");
const { launchBrowser } = require("./browser");
const { run } = require("./handler");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const HEADED = process.argv.includes("--headed");

app.post("/run", async (req, res) => {
  const { bankAccount, bankId, snifId, asmahtaNumber, valueDate, sum } = req.body;

  if (!bankAccount || !bankId || !snifId || !asmahtaNumber || !valueDate || !sum) {
    return res.status(400).json({
      error: "Missing required parameters: bankAccount, bankId, snifId, asmahtaNumber, valueDate, sum",
    });
  }

  console.log(`\n--- New request ---`);
  console.log(`Bank: ${bankId}/${snifId}/${bankAccount}, Asmahta: ${asmahtaNumber}, Date: ${valueDate}, Sum: ${sum}`);

  let browser;
  try {
    browser = await launchBrowser({ headed: HEADED });
    const result = await run(browser, {
      bankAccount,
      bankId,
      snifId,
      asmahtaNumber,
      valueDate,
      sum,
      headless: !HEADED,
    });

    res.json({
      success: result.success,
      url: result.url,
      colA: result.colA,
      colB: result.colB,
    });
  } catch (error) {
    console.error("Request error:", error.message);
    res.status(500).json({ error: error.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Mode: ${HEADED ? "headed" : "headless"}`);
  console.log(`POST /run with { bankAccount, bankId, snifId, asmahtaNumber, valueDate, sum }`);
});
