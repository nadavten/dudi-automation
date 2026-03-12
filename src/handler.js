const XLSX = require("xlsx");
const { humanDelay, humanType, humanClick, humanMouseMove, humanScroll, sleep } = require("./human");

const TARGET_URL =
  "https://apps.atidsm.co.il/AtidWeb/GARY/frmIndexList.aspx";

async function run(browser, options = {}) {
  const {
    username = process.env.ATID_USERNAME,
    password = process.env.ATID_PASSWORD,
    bankAccount,
    bankId,
    snifId,
    asmahtaNumber,
    valueDate,
    sum,
    headless = true,
  } = options;

  if (!username || !password) {
    throw new Error("Missing credentials. Set ATID_USERNAME and ATID_PASSWORD in .env or pass them as options.");
  }

  if (!bankAccount || !bankId || !snifId || !asmahtaNumber || !valueDate || !sum) {
    throw new Error("Missing required parameters: bankAccount, bankId, snifId, asmahtaNumber, valueDate, and sum.");
  }

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: "he-IL",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  });

  // Remove automation markers before any page loads
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    window.chrome = { runtime: {}, loadTimes: () => {}, csi: () => {} };
    Object.defineProperty(navigator, "plugins", {
      get: () => [1, 2, 3, 4, 5],
    });
    Object.defineProperty(navigator, "languages", {
      get: () => ["he-IL", "he", "en-US", "en"],
    });
    const origQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (params) =>
      params.name === "notifications"
        ? Promise.resolve({ state: Notification.permission })
        : origQuery(params);
  });

  const page = await context.newPage();

  page.on("console", (msg) => console.log("  [browser]", msg.text()));

  await page.evaluate(() => {
    window._mouseX = 640;
    window._mouseY = 400;
  });

  const usernameSelector = "#Login1_UserName";
  const passwordSelector = "#Login1_Password";

  async function attemptLogin() {
    console.log("Navigating to login page...");
    await page.goto(TARGET_URL, { waitUntil: "networkidle", timeout: 30000 });
    await humanDelay(2000, 4000);

    console.log("Page loaded, interacting with page before login...");

    // Warm up reCAPTCHA score with human-like browsing
    await humanMouseMove(page, 300, 200);
    await humanDelay(500, 1000);
    await humanMouseMove(page, 700, 400);
    await humanDelay(300, 700);
    await humanScroll(page, "down", 100);
    await humanDelay(500, 1000);
    await humanScroll(page, "up", 100);
    await humanDelay(500, 1000);
    await humanMouseMove(page, 500, 350);
    await humanDelay(300, 800);

    console.log("Typing username...");
    await humanType(page, usernameSelector, username);
    await humanDelay(800, 1500);

    console.log("Typing password...");
    await humanType(page, passwordSelector, password);
    await humanDelay(1000, 2000);

    await humanMouseMove(page, 500, 450);
    await humanDelay(500, 1000);

    console.log("Waiting for reCAPTCHA to be ready...");
    await page.waitForFunction(
      () => typeof grecaptcha !== "undefined" && typeof grecaptcha.enterprise !== "undefined",
      { timeout: 10000 }
    ).catch(() => console.log("reCAPTCHA object not found, proceeding anyway..."));
    await humanDelay(1000, 2000);

    console.log("Clicking login button...");
    const navigationPromise = page
      .waitForNavigation({ waitUntil: "networkidle", timeout: 20000 })
      .catch(() => null);

    await page.evaluate(() => btnLogin_clientClick());
    await navigationPromise;
    await humanDelay(1000, 2000);

    return !page.url().includes("Login.aspx");
  }

  // Try login up to 3 times
  let loggedIn = false;
  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log(`Login attempt ${attempt}/3...`);
    loggedIn = await attemptLogin();
    if (loggedIn) break;
    console.log(`Attempt ${attempt} failed, waiting before retry...`);
    await sleep(3000);
  }

  const currentUrl = page.url();
  console.log("Current URL after login:", currentUrl);
  console.log(loggedIn ? "Login successful!" : "Login failed after all attempts");

  if (!loggedIn) {
    const pageText = await page.textContent("body").catch(() => "");
    console.log("Page text excerpt:", pageText.substring(0, 300));

    const screenshot = await page.screenshot({ fullPage: true });
    const fs = require("fs");
    fs.writeFileSync("debug-login-fail.png", screenshot);
    console.log("Debug screenshot saved to debug-login-fail.png");

    await context.close();
    return { success: false, url: currentUrl, screenshot: screenshot.toString("base64"), colA: null, colB: null };
  }

  // --- Download Excel report ---
  console.log("Clicking Excel download button...");
  await humanDelay(1000, 2000);

  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 30000 }),
    page.click("#ctl00_ContentPlaceHolder1_awXlsReport"),
  ]);

  const downloadPath = await download.path();
  console.log("Excel downloaded to:", downloadPath);

  // --- Parse Excel and search for bankAccount ---
  const workbook = XLSX.readFile(downloadPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  let colA = null;
  let colB = null;
  const searchValue = String(bankAccount).trim();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const cellE = row[4] !== undefined ? String(row[4]).trim() : "";
    if (cellE === searchValue) {
      colA = row[0] !== undefined ? row[0] : null;
      colB = row[1] !== undefined ? row[1] : null;
      console.log(`Found bankAccount "${searchValue}" at row ${i + 1}`);
      console.log(`  Column A: ${colA}`);
      console.log(`  Column B: ${colB}`);
      break;
    }
  }

  if (colA === null && colB === null) {
    console.log(`bankAccount "${searchValue}" not found in column E`);
    const screenshot = await page.screenshot({ fullPage: true });
    await context.close();
    return { success: false, url: currentUrl, screenshot: screenshot.toString("base64"), colA: null, colB: null };
  }

  // --- Navigate to candidate update page ---
  const CANDIDATE_URL = "https://apps.atidsm.co.il/AtidWeb/GARY/frmCandidateUpdate.aspx?Init=true";
  console.log("Navigating to candidate update page...");
  await page.goto(CANDIDATE_URL, { waitUntil: "load", timeout: 30000 });
  await humanDelay(2000, 4000);

  // Fill col A value into the employee field
  const empFieldSelector = "#ctl00_ctl00_ContentPlaceHolder1_ContentCollection_atbFromEmp";
  console.log(`Typing col A value "${colA}" into employee field...`);
  await humanType(page, empFieldSelector, String(colA));
  await page.keyboard.press("Tab");
  console.log("Waiting 5 seconds for field to process...");
  await sleep(5000);

  // Click the next step button
  const nextBtnSelector = "#ctl00_ctl00_ContentPlaceHolder1_StepNextButton";
  console.log("Clicking next step button...");
  await humanClick(page, nextBtnSelector, { waitForNav: true });
  await humanDelay(1500, 3000);

  // Click OK on the popup
  console.log("Clicking OK on popup...");
  await page.waitForSelector("#ctl00_ctl00_lbOk", { state: "visible", timeout: 15000 });
  await humanClick(page, "#ctl00_ctl00_lbOk", { waitForNav: true });
  await humanDelay(1500, 3000);

  // Click the new receipt button
  console.log("Clicking new receipt button...");
  await humanClick(page, "#ctl00_ctl00_ContentPlaceHolder1_ContentCollection_btnNewReceipt", { waitForNav: true });
  await humanDelay(1500, 3000);

  // Fill client number and bank details
  console.log(`Filling client number: ${colA}`);
  await humanType(page, "#ctl00_ContentPlaceHolder1_atbClientNum", String(colA));
  await page.keyboard.press("Tab");
  await humanDelay(500, 1000);

  console.log(`Filling bank details: bankId=${bankId}, snifId=${snifId}, bankAccount=${bankAccount}`);

  await humanType(page, "#ctl00_ContentPlaceHolder1_atbBank", String(bankId));
  await page.keyboard.press("Tab");
  await humanDelay(500, 1000);

  await humanType(page, "#ctl00_ContentPlaceHolder1_atbBranch", String(snifId));
  await page.keyboard.press("Tab");
  await humanDelay(500, 1000);

  await humanType(page, "#ctl00_ContentPlaceHolder1_atbPullAccount", String(bankAccount));
  await page.keyboard.press("Tab");
  await humanDelay(500, 1000);

  console.log(`Filling asmahtaNumber=${asmahtaNumber}, valueDate=${valueDate}, sum=${sum}`);

  await humanType(page, "#ctl00_ContentPlaceHolder1_atbChequeNum", String(asmahtaNumber));
  await page.keyboard.press("Tab");
  await humanDelay(500, 1000);

  await humanType(page, "#ctl00_ContentPlaceHolder1_tbValueDate", String(valueDate));
  await page.keyboard.press("Tab");
  await humanDelay(500, 1000);

  await humanType(page, "#ctl00_ContentPlaceHolder1_atbTotalInNIS", String(sum));
  await page.keyboard.press("Tab");
  await humanDelay(500, 1000);

  // Add cheque (button may be hidden, click via JS)
  console.log("Clicking add cheque...");
  const addChequeNav = page
    .waitForNavigation({ waitUntil: "networkidle", timeout: 20000 })
    .catch(() => null);
  await page.evaluate(() => document.getElementById("ctl00_ContentPlaceHolder1_ibAddCheque").click());
  await addChequeNav;
  await humanDelay(1500, 3000);

  // Create source
  console.log("Clicking create source...");
  await humanClick(page, "#ctl00_ContentPlaceHolder1_btnCreateSource", { waitForNav: true });
  await humanDelay(1500, 3000);

  console.log("Done!");

  const screenshot = await page.screenshot({ fullPage: true });
  await context.close();

  return {
    success: true,
    url: page.url(),
    screenshot: screenshot.toString("base64"),
    colA,
    colB,
  };
}

module.exports = { run };
