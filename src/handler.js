const { humanDelay, humanType, humanClick, humanMouseMove, sleep } = require("./human");

const TARGET_URL =
  "https://apps.atidsm.co.il/AtidWeb/GARY/frmElemIndexList.aspx";

async function run(browser, options = {}) {
  const {
    username = process.env.ATID_USERNAME,
    password = process.env.ATID_PASSWORD,
    headless = true,
  } = options;

  if (!username || !password) {
    throw new Error("Missing credentials. Set ATID_USERNAME and ATID_PASSWORD in .env or pass them as options.");
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

  console.log("Navigating to login page...");
  await page.goto(TARGET_URL, { waitUntil: "networkidle", timeout: 30000 });
  await humanDelay(1500, 3000);

  console.log("Page loaded, looking for login form...");

  const usernameSelector = "#Login1_UserName";
  const passwordSelector = "#Login1_Password";
  const submitButtonSelector = 'input[name="Login1$ctl01"]';

  await humanMouseMove(page, 400, 300);
  await humanDelay(500, 1000);

  console.log("Typing username...");
  await humanType(page, usernameSelector, username);
  await humanDelay(500, 1200);

  console.log("Typing password...");
  await humanType(page, passwordSelector, password);
  await humanDelay(800, 1500);

  await humanMouseMove(page, 500, 450);
  await humanDelay(300, 600);

  console.log("Waiting for reCAPTCHA to be ready...");
  await page.waitForFunction(
    () => typeof grecaptcha !== "undefined" && typeof grecaptcha.enterprise !== "undefined",
    { timeout: 10000 }
  ).catch(() => console.log("reCAPTCHA object not found, proceeding anyway..."));
  await humanDelay(500, 1000);

  console.log("Clicking login button (triggering reCAPTCHA flow)...");

  // The page's btnLogin_clientClick() does:
  // 1. grecaptcha.enterprise.execute() to get a token
  // 2. Sets the token in hidden field Login1$reCaptchaToken
  // 3. Clicks the hidden Login1_LoginButton <a> to trigger ASP.NET PostBack
  //
  // We call it via JS and wait for navigation.
  const navigationPromise = page
    .waitForNavigation({ waitUntil: "networkidle", timeout: 20000 })
    .catch(() => null);

  await page.evaluate(() => btnLogin_clientClick());
  const navResult = await navigationPromise;

  if (!navResult) {
    console.log("reCAPTCHA flow didn't navigate, checking token and retrying...");
    const token = await page.$eval("#Login1_reCaptchaToken", (el) => el.value).catch(() => "");
    console.log("reCAPTCHA token present:", !!token, token ? `(${token.length} chars)` : "");

    if (token) {
      const retryNav = page
        .waitForNavigation({ waitUntil: "networkidle", timeout: 15000 })
        .catch(() => null);
      await page.evaluate(() => document.getElementById("Login1_LoginButton").click());
      await retryNav;
    } else {
      console.log("No reCAPTCHA token, attempting direct PostBack...");
      const directNav = page
        .waitForNavigation({ waitUntil: "networkidle", timeout: 15000 })
        .catch(() => null);
      await page.evaluate(() => __doPostBack("Login1$LoginButton", ""));
      await directNav;
    }
  }

  await humanDelay(2000, 4000);

  const currentUrl = page.url();
  console.log("Current URL after login:", currentUrl);

  const isLoggedIn = !currentUrl.includes("Login.aspx");
  console.log(isLoggedIn ? "Login successful!" : "Login may have failed - still on login page");

  if (!isLoggedIn) {
    const pageText = await page.textContent("body").catch(() => "");
    const errorPatterns = [
      /כניסה נכשלה/,
      /שגיאה/,
      /Login failed/i,
      /incorrect/i,
    ];
    for (const pat of errorPatterns) {
      const match = pageText.match(pat);
      if (match) {
        console.log("Error found on page:", match[0]);
        break;
      }
    }
  }

  const screenshot = await page.screenshot({ fullPage: true });

  await context.close();

  return {
    success: isLoggedIn,
    url: currentUrl,
    screenshot: screenshot.toString("base64"),
  };
}

async function handler(event, context) {
  const { launchLambda } = require("./browser");
  let browser = null;

  try {
    browser = await launchLambda();
    const result = await run(browser, {
      username: event?.username,
      password: event?.password,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: result.success,
        url: result.url,
        screenshotBase64: result.screenshot,
      }),
    };
  } catch (error) {
    console.error("Handler error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { handler, run };
