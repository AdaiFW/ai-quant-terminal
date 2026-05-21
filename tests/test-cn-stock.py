"""Test CN stock flow (no rate limits)."""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    errors = []
    page.on("pageerror", lambda err: errors.append(f"PAGE: {err.message[:200]}"))
    page.on("console", lambda msg: errors.append(f"[{msg.type}] {msg.text[:200]}") if msg.type == "error" else None)

    page.goto("http://localhost:3000", timeout=30000)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)

    print("[1] Searching 600519 via input...")
    inp = page.locator('input[placeholder*="Ticker"]')
    if inp.count() > 0:
        inp.fill("600519")
        inp.press("Enter")
        page.wait_for_timeout(10000)
        page.wait_for_load_state("networkidle")

    canvases = page.evaluate("() => document.querySelectorAll('canvas').length")
    print(f"    Canvas: {canvases}")

    ticker = page.locator('text=600519').first
    print(f"    Ticker in toolbar: {'OK' if ticker.count() > 0 else 'MISSING'}")

    btn = page.locator('button:has-text("AI")')
    if btn.count() > 0:
        btn.first.click()
        page.wait_for_timeout(25000)
        signal = page.locator('text=Strong Buy').count() or page.locator('text=Buy').count() or page.locator('text=Neutral').count()
        print(f"    AI Signal: {'OK' if signal else 'MISSING'}")

    browser.close()
    for e in errors[:5]:
        print(f"  ERR: {e[:200]}")
