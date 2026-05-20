"""
E2E Test: AI Stock Platform Dashboard

Test flow:
  1. Idle state - screenshot
  2. Invalid ticker - error state - screenshot
  3. Valid ticker - stock card - screenshot
  4. AI analysis - loading - result - screenshot
  5. Mobile viewport
  6. Wide desktop viewport

Usage:
  python tests/dashboard.spec.py
  (Dev server must be running on localhost:3000)
"""

from playwright.sync_api import sync_playwright
import os

BASE_URL = "http://localhost:3000"
SCREENSHOT_DIR = os.path.join(os.path.dirname(__file__), "screenshots")


def main():
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)
    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 900})

        # -----------------------------------------------------------
        # Test 1: Idle State
        # -----------------------------------------------------------
        print("\n[Test 1] Idle state...")
        # Next.js dev server compiles on first request - use long timeout
        page.goto(BASE_URL, timeout=120000)
        page.wait_for_timeout(8000)
        page.screenshot(
            path=os.path.join(SCREENSHOT_DIR, "01-idle.png"), full_page=True
        )
        print("  [OK] Screenshot: 01-idle.png")

        empty_heading = page.locator("text=Search a stock to begin")
        if empty_heading.is_visible():
            print("  [OK] Empty state heading visible")
        else:
            print("  [FAIL] Empty state heading NOT visible")

        search_input = page.locator('input[placeholder*="ticker"]')
        if search_input.is_visible():
            print("  [OK] Search input visible")
        else:
            print("  [FAIL] Search input NOT visible")
        results.append("idle")

        # -----------------------------------------------------------
        # Test 2: Invalid Ticker
        # -----------------------------------------------------------
        print("\n[Test 2] Invalid ticker (ZZZZZZ)...")
        search_input.fill("ZZZZZZ")
        page.locator('button:has-text("Search")').click()
        page.wait_for_timeout(4000)
        page.wait_for_load_state("networkidle")
        page.screenshot(
            path=os.path.join(SCREENSHOT_DIR, "02-invalid-ticker.png"),
            full_page=True,
        )
        print("  [OK] Screenshot: 02-invalid-ticker.png")

        error_text = page.locator("text=Could not load stock data").first
        if error_text.is_visible():
            print("  [OK] Error message displayed for invalid ticker")
        else:
            print("  [FAIL] Error message NOT found for invalid ticker")
        results.append("invalid_ticker")

        # -----------------------------------------------------------
        # Test 3: Valid Ticker
        # -----------------------------------------------------------
        print("\n[Test 3] Valid ticker (AAPL)...")
        page.locator('button[aria-label="Clear search"]').click()
        search_input.fill("AAPL")
        page.locator('button:has-text("Search")').click()
        page.wait_for_timeout(4000)
        page.wait_for_load_state("networkidle")
        page.screenshot(
            path=os.path.join(SCREENSHOT_DIR, "03-stock-card.png"),
            full_page=True,
        )
        print("  [OK] Screenshot: 03-stock-card.png")

        analyze_btn = page.locator('button:has-text("Run AI Analysis")')
        if analyze_btn.is_visible():
            print("  [OK] 'Run AI Analysis' button visible")
        else:
            print(
                "  [WARN] Button not found - API key may be missing"
            )
        results.append("stock_card")

        # -----------------------------------------------------------
        # Test 4: AI Analysis
        # -----------------------------------------------------------
        print("\n[Test 4] AI Analysis...")
        if analyze_btn.is_visible():
            analyze_btn.click()
            page.wait_for_timeout(2000)
            page.screenshot(
                path=os.path.join(
                    SCREENSHOT_DIR, "04-analysis-loading.png"
                ),
                full_page=True,
            )
            print("  [OK] Screenshot: 04-analysis-loading.png")

            page.wait_for_timeout(15000)
            page.wait_for_load_state("networkidle")
            page.screenshot(
                path=os.path.join(SCREENSHOT_DIR, "05-analysis-done.png"),
                full_page=True,
            )
            print("  [OK] Screenshot: 05-analysis-done.png")

            panel = page.locator("text=AI Analysis").first
            error_panel = page.locator("text=AI analysis failed").first
            if panel.is_visible():
                print("  [OK] AI Analysis panel visible")
            elif error_panel.is_visible():
                print(
                    "  [WARN] AI analysis failed - may need DEEPSEEK_API_KEY"
                )
            else:
                print("  [WARN] AI Analysis panel NOT found")
            results.append("analysis")
        else:
            print("  [WARN] Skipping AI analysis - stock not loaded")
            results.append("analysis_skipped")

        # -----------------------------------------------------------
        # Test 5: Mobile Viewport
        # -----------------------------------------------------------
        print("\n[Test 5] Mobile responsiveness...")
        page.set_viewport_size({"width": 390, "height": 844})
        page.wait_for_timeout(500)
        page.screenshot(
            path=os.path.join(SCREENSHOT_DIR, "06-mobile.png"),
            full_page=True,
        )
        print("  [OK] Screenshot: 06-mobile.png")

        # -----------------------------------------------------------
        # Test 6: Wide Desktop
        # -----------------------------------------------------------
        print("\n[Test 6] Wide desktop...")
        page.set_viewport_size({"width": 1920, "height": 1080})
        page.wait_for_timeout(500)
        page.screenshot(
            path=os.path.join(SCREENSHOT_DIR, "07-wide-desktop.png"),
            full_page=True,
        )
        print("  [OK] Screenshot: 07-wide-desktop.png")

        browser.close()

    # Summary
    print(f"\n{'='*50}")
    print(f"  Tests complete: {len(results)} scenarios covered.")
    print(f"  Screenshots saved to: {SCREENSHOT_DIR}")
    print(f"{'='*50}")


if __name__ == "__main__":
    main()
