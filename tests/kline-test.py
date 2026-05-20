"""Test K-line chart rendering."""
from playwright.sync_api import sync_playwright
import os

DIR = os.path.join(os.path.dirname(__file__), "screenshots")
os.makedirs(DIR, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})

    # Go to dashboard
    page.goto("http://localhost:3000", timeout=30000)
    page.wait_for_timeout(3000)
    page.screenshot(path=os.path.join(DIR, "kline-01-idle.png"), full_page=True)
    print("[1/3] Idle page")

    # Search 600519
    page.locator('input[placeholder*="ticker"]').fill("600519")
    page.locator('button:has-text("Search")').click()
    page.wait_for_timeout(8000)
    page.wait_for_load_state("networkidle")
    page.screenshot(path=os.path.join(DIR, "kline-02-stock+kline.png"), full_page=True)
    print("[2/3] Stock card + K-line chart")

    # Run AI
    btn = page.locator('button:has-text("Run")')
    if btn.count() > 0:
        btn.first.click()
        page.wait_for_timeout(25000)
        page.wait_for_load_state("networkidle")
        page.screenshot(path=os.path.join(DIR, "kline-03-analysis.png"), full_page=True)
        print("[3/3] Full page with K-line + AI analysis")

    browser.close()
    print("Done!")
