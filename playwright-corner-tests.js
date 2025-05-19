const { chromium } = require("playwright");

(async () => {
  // Launch browser and open page
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto("http://localhost:4200");

  // Wait for the draggable element to be visible
  await page.waitForSelector('[data-drag="true"]');

  // Wait for Angular to be stable
  await page.waitForTimeout(1000);

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
  const determineCorner = (
    position,
    boundaryWidth,
    boundaryHeight,
    elementWidth,
    elementHeight
  ) => {
    if (!position || position.x === null) return "UNKNOWN";

    const x = position.x;
    const y = position.y;

    const tolerance = 5; // Small tolerance for floating point comparisons

    // Check if position matches any of the four corners
    if (Math.abs(x) <= tolerance && Math.abs(y) <= tolerance) {
      return "TOP_LEFT";
    }

    if (
      Math.abs(x - (boundaryWidth - elementWidth)) <= tolerance &&
      Math.abs(y) <= tolerance
    ) {
      return "TOP_RIGHT";
    }

    if (
      Math.abs(x) <= tolerance &&
      Math.abs(y - (boundaryHeight - elementHeight)) <= tolerance
    ) {
      return "BOTTOM_LEFT";
    }

    if (
      Math.abs(x - (boundaryWidth - elementWidth)) <= tolerance &&
      Math.abs(y - (boundaryHeight - elementHeight)) <= tolerance
    ) {
      return "BOTTOM_RIGHT";
    }

    return "IN_BETWEEN";
  };

  // Get boundary dimensions
  const boundaryBox = await page.locator(".example-boundary").boundingBox();
  const boundaryWidth = boundaryBox.width;
  const boundaryHeight = boundaryBox.height;

  // Get element dimensions
  const elementBox = await page.locator('[data-drag="true"]').boundingBox();
  const elementWidth = elementBox.width;
  const elementHeight = elementBox.height;

  // Corners and their positions
  const corners = {
    TOP_LEFT: { x: 0, y: 0 },
    TOP_RIGHT: { x: boundaryWidth - elementWidth, y: 0 },
    BOTTOM_LEFT: { x: 0, y: boundaryHeight - elementHeight },
    BOTTOM_RIGHT: {
      x: boundaryWidth - elementWidth,
      y: boundaryHeight - elementHeight,
    },
  };

  // Directions to test from each corner
  const directions = [
    { name: "RIGHT", vector: { x: 100, y: 0 } },
    { name: "DOWN", vector: { x: 0, y: 100 } },
    { name: "LEFT", vector: { x: -100, y: 0 } },
    { name: "UP", vector: { x: 0, y: -100 } },
    { name: "DOWN_RIGHT", vector: { x: 100, y: 100 } },
    { name: "DOWN_LEFT", vector: { x: -100, y: 100 } },
    { name: "UP_RIGHT", vector: { x: 100, y: -100 } },
    { name: "UP_LEFT", vector: { x: -100, y: -100 } },
  ];

  // Expected results for each starting corner and drag direction
  // Based on the component's quadrant and angle-based logic
  const expectedResults = {
    TOP_LEFT: {
      RIGHT: "TOP_RIGHT",
      DOWN: "BOTTOM_LEFT",
      LEFT: "TOP_LEFT",
      UP: "TOP_LEFT",
      DOWN_RIGHT: "BOTTOM_RIGHT",
      DOWN_LEFT: "BOTTOM_LEFT",
      UP_RIGHT: "TOP_RIGHT",
      UP_LEFT: "TOP_LEFT",
    },
    TOP_RIGHT: {
      RIGHT: "TOP_RIGHT",
      DOWN: "BOTTOM_RIGHT",
      LEFT: "TOP_LEFT",
      UP: "TOP_RIGHT",
      DOWN_RIGHT: "BOTTOM_RIGHT",
      DOWN_LEFT: "BOTTOM_LEFT",
      UP_RIGHT: "TOP_RIGHT",
      UP_LEFT: "TOP_LEFT",
    },
    BOTTOM_LEFT: {
      RIGHT: "BOTTOM_RIGHT",
      DOWN: "BOTTOM_LEFT",
      LEFT: "TOP_LEFT",
      UP: "TOP_LEFT",
      DOWN_RIGHT: "BOTTOM_RIGHT",
      DOWN_LEFT: "BOTTOM_LEFT",
      UP_RIGHT: "TOP_RIGHT",
      UP_LEFT: "TOP_LEFT",
    },
    BOTTOM_RIGHT: {
      RIGHT: "BOTTOM_RIGHT",
      DOWN: "BOTTOM_RIGHT",
      LEFT: "BOTTOM_LEFT",
      UP: "TOP_RIGHT",
      DOWN_RIGHT: "BOTTOM_RIGHT",
      DOWN_LEFT: "BOTTOM_LEFT",
      UP_RIGHT: "TOP_RIGHT",
      UP_LEFT: "TOP_LEFT",
    },
  };

  // Function to directly set corner using the component method
  const directlySetCorner = async (cornerName) => {
    console.log(`Setting corner directly to ${cornerName}`);
    return await page.evaluate((corner) => {
      try {
        // Access the component using alternate methods
        // Method 1: Through Angular's debugging info
        const appRef = window.ng?.getComponent(
          document.querySelector("app-drag-snap")
        );
        if (appRef && typeof appRef.setCorner === "function") {
          appRef.setCorner(corner);
          return true;
        }

        // Method 2: Direct component access (Angular v17+)
        const component = document.querySelector("app-drag-snap");
        if (
          component &&
          component.__ngContext__ &&
          typeof component.setCorner === "function"
        ) {
          component.setCorner(corner);
          return true;
        }

        // Fallback: Try accessing through ngContext
        const context = component?.__ngContext__;
        if (context && Array.isArray(context)) {
          const dragSnapComponent = context.find(
            (c) => c?.constructor?.name === "DragSnapComponent"
          );
          if (
            dragSnapComponent &&
            typeof dragSnapComponent.setCorner === "function"
          ) {
            dragSnapComponent.setCorner(corner);
            return true;
          }
        }

        console.error("Could not find component using any method");
        return false;
      } catch (e) {
        console.error("Failed to set corner:", e);
        return false;
      }
    }, cornerName);
  };

  // Function to verify if element is at the expected corner
  const verifyCorner = async (expectedCornerName) => {
    const position = await getCurrentPosition();
    const currentCorner = determineCorner(
      position,
      boundaryWidth,
      boundaryHeight,
      elementWidth,
      elementHeight
    );
    return currentCorner === expectedCornerName;
  };

  // Manual drag to a corner
  const manualDragToCorner = async (cornerName) => {
    console.log(`Manually dragging to ${cornerName}`);
    const corner = corners[cornerName];

    // Get current element position
    const box = await page.locator('[data-drag="true"]').boundingBox();
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    // Calculate position to center of the element
    const targetCenterX = corner.x + elementWidth / 2;
    const targetCenterY = corner.y + elementHeight / 2;

    // Use more forceful approach with multiple clicks and slower movement
    // First click to ensure focus
    await page.mouse.click(centerX, centerY);
    await page.waitForTimeout(100);

    // Now do the drag with slower, more deliberate steps
    await page.mouse.move(centerX, centerY);
    await page.mouse.down();

    // Move in smaller steps for more reliable dragging
    const steps = 20;
    const xStep = (targetCenterX - centerX) / steps;
    const yStep = (targetCenterY - centerY) / steps;

    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(centerX + xStep * i, centerY + yStep * i, {
        steps: 1,
      });
      await page.waitForTimeout(20); // Small delay between steps
    }

    await page.mouse.up();
    await page.waitForTimeout(500); // Wait for any animations

    // Verify position
    const position = await getCurrentPosition();
    const resultCorner = determineCorner(
      position,
      boundaryWidth,
      boundaryHeight,
      elementWidth,
      elementHeight
    );

    return resultCorner === cornerName;
  };

  // Function to set position using the buttons
  const setPositionUsingButton = async (cornerName) => {
    console.log(`Setting position using ${cornerName} button`);

    // Find the button by text
    const buttonText = {
      TOP_LEFT: "Top Left",
      TOP_RIGHT: "Top Right",
      BOTTOM_LEFT: "Bottom Left",
      BOTTOM_RIGHT: "Bottom Right",
    }[cornerName];

    if (!buttonText) {
      console.error(`Unknown corner name: ${cornerName}`);
      return false;
    }

    try {
      // Click the button
      await page.locator(`button:text("${buttonText}")`).click();
      await page.waitForTimeout(500);

      // Verify we're at the intended corner
      return await verifyCorner(cornerName);
    } catch (e) {
      console.error(`Failed to click button for ${cornerName}:`, e);
      return false;
    }
  };

  // Function to reset position to a specific corner with retries
  const resetToCorner = async (cornerName, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(
        `Attempt ${attempt}/${maxRetries} to set corner to ${cornerName}`
      );

      // First try using the buttons (most reliable)
      const buttonSuccess = await setPositionUsingButton(cornerName);
      if (buttonSuccess) {
        console.log(`✅ Successfully positioned at ${cornerName} using button`);
        return true;
      }

      // Try direct method next
      const directSuccess = await directlySetCorner(cornerName);
      await page.waitForTimeout(300);

      // Verify if we're at the correct corner
      if (await verifyCorner(cornerName)) {
        console.log(
          `✅ Successfully positioned at ${cornerName} using direct method`
        );
        return true;
      }

      // If previous methods failed and this is the last attempt, try manual positioning
      if (attempt === maxRetries - 1) {
        console.log(`Trying manual drag as a last resort...`);
        const manualSuccess = await manualDragToCorner(cornerName);

        if (manualSuccess) {
          console.log(
            `✅ Successfully positioned at ${cornerName} using manual drag`
          );
          return true;
        }
      }

      if (attempt === maxRetries) {
        console.warn(
          `⚠️ Failed to position at ${cornerName} after ${maxRetries} attempts`
        );
        return false;
      }

      await page.waitForTimeout(300);
    }
    return false;
  };

  // Test suite to test all directions from each corner
  const testAllCorners = async () => {
    console.log("\n=== COMPREHENSIVE CORNER TESTING ===");
    console.log(`Boundary dimensions: ${boundaryWidth}x${boundaryHeight}`);
    console.log(`Element dimensions: ${elementWidth}x${elementHeight}`);

    let totalTests = 0;
    let passedTests = 0;
    let skippedTests = 0;

    // Test each corner
    for (const startCorner of Object.keys(corners)) {
      console.log(`\n=== Testing from ${startCorner} ===`);

      // Test each direction from this corner
      for (const direction of directions) {
        totalTests++;

        // First, ensure we're at the starting corner for each test
        const isReset = await resetToCorner(startCorner);
        if (!isReset) {
          console.error(
            `⚠️ Skipping test: Couldn't position at ${startCorner} for testing`
          );
          skippedTests++;
          continue;
        }

        console.log(`\nTest: Drag from ${startCorner} to ${direction.name}`);

        // Get element's current position
        const box = await page.locator('[data-drag="true"]').boundingBox();
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;

        // Perform the drag in the specified direction
        await page.mouse.move(centerX, centerY);
        await page.mouse.down();
        await page.mouse.move(
          centerX + direction.vector.x,
          centerY + direction.vector.y,
          { steps: 10 }
        );
        await page.mouse.up();

        // Wait for snap animation
        await page.waitForTimeout(1000);

        // Check result
        const newPosition = await getCurrentPosition();
        const resultCorner = determineCorner(
          newPosition,
          boundaryWidth,
          boundaryHeight,
          elementWidth,
          elementHeight
        );

        const expectedCorner = expectedResults[startCorner][direction.name];
        const testPassed = resultCorner === expectedCorner;

        if (testPassed) {
          passedTests++;
          console.log(
            `✅ PASS: Drag from ${startCorner} ${direction.name} → ${resultCorner}`
          );
        } else {
          console.log(
            `❌ FAIL: Drag from ${startCorner} ${direction.name} → ${resultCorner} (Expected: ${expectedCorner})`
          );
        }
      }
    }

    // Print results summary
    console.log("\n=== TEST RESULTS SUMMARY ===");
    console.log(
      `Passed: ${passedTests}/${totalTests} (${Math.round(
        (passedTests / totalTests) * 100
      )}%)`
    );
    if (skippedTests > 0) {
      console.log(`Skipped: ${skippedTests}/${totalTests}`);
    }

    return {
      passed: passedTests === totalTests - skippedTests,
      passedCount: passedTests,
      totalCount: totalTests,
      skippedCount: skippedTests,
    };
  };

  // Run all tests
  const results = await testAllCorners();

  console.log("\nAll tests passed:", results.passed ? "✅ YES" : "❌ NO");
  if (results.skippedCount > 0) {
    console.log(
      `\nNote: ${results.skippedCount} tests were skipped due to positioning issues.`
    );
    console.log(
      "You may need to fix the positioning logic in the component first."
    );
  }

  // Wait before closing browser
  await page.waitForTimeout(3000);
  await browser.close();
})().catch((e) => {
  console.error("Test error:", e);
  process.exit(1);
});
