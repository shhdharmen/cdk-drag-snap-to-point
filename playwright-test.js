const { chromium } = require("playwright");

(async () => {
  // Launch browser and open page
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto("http://localhost:4200");

  // Wait for the draggable element to be visible
  await page.waitForSelector('[data-drag="true"]');

  // Helper function to get the position from transform style
  const getCurrentPosition = async () => {
    return page.evaluate(() => {
      const dragElement = document.querySelector('[data-drag="true"]');
      if (!dragElement) return { x: null, y: null };

      const style = window.getComputedStyle(dragElement);
      const transform = style.transform || style.webkitTransform;

      if (transform === "none") return { x: 0, y: 0 };

      try {
        const matrix = new DOMMatrixReadOnly(transform);
        return { x: matrix.m41, y: matrix.m42 };
      } catch (e) {
        console.error("Error parsing transform:", e);
        return { x: null, y: null };
      }
    });
  };

  // Helper to determine which corner based on position
  const determineCorner = (position, boundaryWidth, boundaryHeight) => {
    if (!position || position.x === null) return "UNKNOWN";

    const x = position.x;
    const y = position.y;

    if (x < boundaryWidth / 2 && y < boundaryHeight / 2) return "TOP_LEFT";
    if (x >= boundaryWidth / 2 && y < boundaryHeight / 2) return "TOP_RIGHT";
    if (x < boundaryWidth / 2 && y >= boundaryHeight / 2) return "BOTTOM_LEFT";
    return "BOTTOM_RIGHT";
  };

  // Get boundary dimensions
  const boundaryBox = await page.locator(".example-boundary").boundingBox();
  const boundaryWidth = boundaryBox.width;
  const boundaryHeight = boundaryBox.height;

  // Record initial position
  const initialPosition = await getCurrentPosition();
  console.log(`Initial position: ${JSON.stringify(initialPosition)}`);

  // Perform drag to each corner with verification
  const testDrags = async () => {
    // First - drag from top-left to bottom-right
    console.log("\nTEST 1: Drag from top-left to bottom-right");

    // Get bounding box to find center
    const box = await page.locator('[data-drag="true"]').boundingBox();
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    // Simulate dragging from center to bottom-right
    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    await page.mouse.move(centerX + 100, centerY + 100, { steps: 10 });
    await page.mouse.up();

    // Wait for snap animation
    await page.waitForTimeout(2000);

    // Check position after drag
    const pos1 = await getCurrentPosition();
    const corner1 = determineCorner(pos1, boundaryWidth, boundaryHeight);
    console.log(
      `After drag 1: Position ${JSON.stringify(pos1)}, Corner: ${corner1}`
    );

    // Expected outcome based on the component implementation
    console.log(`Expected corner: BOTTOM_RIGHT (diagonal movement down-right)`);
    await page.waitForTimeout(500);

    // Test 2: Drag horizontally from current position to the left
    console.log("\nTEST 2: Drag horizontally to the left");
    const newBox = await page.locator('[data-drag="true"]').boundingBox();
    const newCenterX = newBox.x + newBox.width / 2;
    const newCenterY = newBox.y + newBox.height / 2;

    await page.mouse.move(newCenterX, newCenterY);
    await page.mouse.down();
    await page.mouse.move(newCenterX - 100, newCenterY, { steps: 10 });
    await page.mouse.up();

    await page.waitForTimeout(2000);

    // Check position after drag
    const pos2 = await getCurrentPosition();
    const corner2 = determineCorner(pos2, boundaryWidth, boundaryHeight);
    console.log(
      `After drag 2: Position ${JSON.stringify(pos2)}, Corner: ${corner2}`
    );
    console.log(`Expected corner: TOP_LEFT (horizontal movement left)`);
    await page.waitForTimeout(500);

    // Test 3: Drag vertically from current position to the top
    console.log("\nTEST 3: Drag vertically upward");
    const box3 = await page.locator('[data-drag="true"]').boundingBox();
    const center3X = box3.x + box3.width / 2;
    const center3Y = box3.y + box3.height / 2;

    await page.mouse.move(center3X, center3Y);
    await page.mouse.down();
    await page.mouse.move(center3X, center3Y - 100, { steps: 10 });
    await page.mouse.up();

    await page.waitForTimeout(2000);

    // Check position after drag
    const pos3 = await getCurrentPosition();
    const corner3 = determineCorner(pos3, boundaryWidth, boundaryHeight);
    console.log(
      `After drag 3: Position ${JSON.stringify(pos3)}, Corner: ${corner3}`
    );
    console.log(
      `Expected corner: TOP_RIGHT (vertical movement up from left side)`
    );
    await page.waitForTimeout(500);

    // Test 4: Drag diagonally down-right
    console.log("\nTEST 4: Drag diagonally down-right");
    const box4 = await page.locator('[data-drag="true"]').boundingBox();
    const center4X = box4.x + box4.width / 2;
    const center4Y = box4.y + box4.height / 2;

    await page.mouse.move(center4X, center4Y);
    await page.mouse.down();
    await page.mouse.move(center4X + 100, center4Y + 100, { steps: 10 });
    await page.mouse.up();

    await page.waitForTimeout(2000);

    // Check position after drag
    const pos4 = await getCurrentPosition();
    const corner4 = determineCorner(pos4, boundaryWidth, boundaryHeight);
    console.log(
      `After drag 4: Position ${JSON.stringify(pos4)}, Corner: ${corner4}`
    );
    console.log(`Expected corner: BOTTOM_RIGHT (diagonal movement down-right)`);

    // Check if all tests passed
    let allPassed = true;
    if (corner1 !== "BOTTOM_RIGHT") {
      console.error("Test 1 failed: Expected BOTTOM_RIGHT, got", corner1);
      allPassed = false;
    }
    if (corner2 !== "TOP_LEFT") {
      console.error("Test 2 failed: Expected TOP_LEFT, got", corner2);
      allPassed = false;
    }
    if (corner3 !== "TOP_RIGHT") {
      console.error("Test 3 failed: Expected TOP_RIGHT, got", corner3);
      allPassed = false;
    }
    if (corner4 !== "BOTTOM_RIGHT") {
      console.error("Test 4 failed: Expected BOTTOM_RIGHT, got", corner4);
      allPassed = false;
    }

    console.log("\nTests completed. All tests passed:", allPassed);
  };

  await testDrags();

  // Wait before closing browser
  await page.waitForTimeout(3000);
  await browser.close();
})().catch((e) => {
  console.error("Test error:", e);
  process.exit(1);
});
