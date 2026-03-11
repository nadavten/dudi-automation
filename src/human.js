/**
 * Human-like browsing simulation utilities.
 * Adds realistic delays, mouse movements, and typing patterns.
 */

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function humanDelay(minMs = 500, maxMs = 2000) {
  const ms = randomBetween(minMs, maxMs);
  await sleep(ms);
  return ms;
}

async function humanType(page, selector, text, options = {}) {
  const { minDelay = 50, maxDelay = 180, clearFirst = true } = options;

  await page.waitForSelector(selector, { state: "visible", timeout: 10000 });
  await humanDelay(300, 800);

  const element = await page.$(selector);
  await element.scrollIntoViewIfNeeded();
  await humanDelay(200, 500);

  const box = await element.boundingBox();
  if (box) {
    await humanMouseMove(page, box.x + box.width / 2, box.y + box.height / 2);
    await humanDelay(100, 300);
  }

  await element.click();
  await humanDelay(100, 300);

  if (clearFirst) {
    await page.keyboard.press("Control+A");
    await humanDelay(50, 150);
    await page.keyboard.press("Backspace");
    await humanDelay(100, 300);
  }

  for (const char of text) {
    await page.keyboard.type(char, { delay: randomBetween(minDelay, maxDelay) });
    if (Math.random() < 0.05) {
      await humanDelay(200, 600);
    }
  }
}

async function humanClick(page, selector, options = {}) {
  const { waitForNav = false } = options;

  await page.waitForSelector(selector, { state: "visible", timeout: 10000 });
  await humanDelay(300, 700);

  const element = await page.$(selector);
  await element.scrollIntoViewIfNeeded();
  await humanDelay(200, 400);

  const box = await element.boundingBox();
  if (box) {
    const targetX = box.x + randomBetween(box.width * 0.3, box.width * 0.7);
    const targetY = box.y + randomBetween(box.height * 0.3, box.height * 0.7);
    await humanMouseMove(page, targetX, targetY);
    await humanDelay(100, 250);
  }

  if (waitForNav) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle", timeout: 30000 }).catch(() => {}),
      element.click(),
    ]);
  } else {
    await element.click();
  }

  await humanDelay(300, 800);
}

async function humanMouseMove(page, targetX, targetY, steps) {
  const currentPos = await page.evaluate(() => ({
    x: window._mouseX || 0,
    y: window._mouseY || 0,
  }));

  const numSteps = steps || randomBetween(5, 15);
  const startX = currentPos.x;
  const startY = currentPos.y;

  for (let i = 1; i <= numSteps; i++) {
    const progress = i / numSteps;
    const eased = progress < 0.5
      ? 2 * progress * progress
      : -1 + (4 - 2 * progress) * progress;

    const jitterX = randomBetween(-2, 2);
    const jitterY = randomBetween(-2, 2);

    const x = startX + (targetX - startX) * eased + jitterX;
    const y = startY + (targetY - startY) * eased + jitterY;

    await page.mouse.move(x, y);
    await sleep(randomBetween(5, 20));
  }

  await page.evaluate(
    ([x, y]) => {
      window._mouseX = x;
      window._mouseY = y;
    },
    [targetX, targetY]
  );
}

async function humanScroll(page, direction = "down", amount) {
  const scrollAmount = amount || randomBetween(100, 400);
  const delta = direction === "down" ? scrollAmount : -scrollAmount;
  const steps = randomBetween(3, 8);

  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, delta / steps);
    await sleep(randomBetween(30, 80));
  }

  await humanDelay(300, 800);
}

module.exports = {
  randomBetween,
  sleep,
  humanDelay,
  humanType,
  humanClick,
  humanMouseMove,
  humanScroll,
};
