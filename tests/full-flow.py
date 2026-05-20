"""Full flow test: search AAPL -> view stock card -> run AI analysis -> screenshot each step."""
from playwright.sync_api import sync_playwright
import os, time

DIR = os.path.join(os.path.dirname(__file__), "screenshots")
os.makedirs(DIR, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})

    # Step 1: Idle
    print("[1/5] Loading homepage...")
    page.goto("http://localhost:3000", timeout=30000)
    page.wait_for_timeout(2000)
    page.screenshot(path=os.path.join(DIR, "step1-idle.png"), full_page=True)
    print("  -> step1-idle.png")

    # Step 2: Search AAPL
    print("[2/5] Searching AAPL...")
    page.locator('input[placeholder*="ticker"]').fill("AAPL")
    page.locator('button:has-text("Search")').click()
    page.wait_for_timeout(8000)
    page.wait_for_load_state("networkidle")
    page.screenshot(path=os.path.join(DIR, "step2-stock-card.png"), full_page=True)
    print("  -> step2-stock-card.png")

    # Step 3: Run AI Analysis
    print("[3/5] Running AI analysis...")
    # Check page state first
    page.screenshot(path=os.path.join(DIR, "step2b-debug.png"), full_page=True)
    btn = page.locator('button:has-text("Run")')
    if btn.count() > 0:
        btn.click()
        page.wait_for_timeout(2000)
        page.screenshot(path=os.path.join(DIR, "step3-loading.png"), full_page=True)
        print("  -> step3-loading.png")

        # Wait for AI response
        page.wait_for_timeout(20000)
        page.wait_for_load_state("networkidle")
        page.screenshot(path=os.path.join(DIR, "step4-analysis-done.png"), full_page=True)
        print("  -> step4-analysis-done.png")
    else:
        print("  -> Button not found, skipping AI")

    # Step 5: Mobile view
    print("[4/5] Mobile view...")
    page.set_viewport_size({"width": 390, "height": 844})
    page.wait_for_timeout(500)
    page.screenshot(path=os.path.join(DIR, "step5-mobile.png"), full_page=True)
    print("  -> step5-mobile.png")

    browser.close()
    print(f"\nDone! Screenshots in: {DIR}")
