"""Debug: capture errors during watchlist click and chart load."""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    errors = []
    page.on("pageerror", lambda err: errors.append(f"PAGE: {err.message}"))
    page.on("console", lambda msg: errors.append(f"[{msg.type}] {msg.text[:200]}") if msg.type == "error" else None)

    page.goto("http://localhost:3000", timeout=30000)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)

    # Step 1: Click AAPL in watchlist
    print("[1] Clicking AAPL in watchlist...")
    aapl = page.locator('button:has-text("AAPL")').first
    if aapl.count() > 0:
        aapl.click()
        page.wait_for_timeout(8000)
        page.wait_for_load_state("networkidle")
        print(f"    URL after click: {page.url[:100]}")

    # Check chart
    canvases = page.evaluate("() => document.querySelectorAll('canvas').length")
    print(f"    Canvas count: {canvases}")

    # Step 2: Check toolbar for ticker display
    ticker_el = page.locator('text=AAPL').first
    print(f"    Ticker in toolbar: {'FOUND' if ticker_el.count() > 0 else 'MISSING'}")

    # Step 3: Click AI Analysis
    ai_btn = page.locator('button:has-text("AI")')
    if ai_btn.count() > 0:
        print("[2] Clicking AI Analysis...")
        ai_btn.first.click()
        page.wait_for_timeout(20000)
        page.wait_for_load_state("networkidle")
        signal = page.locator('text=Strong Buy').count() or page.locator('text=Buy').count()
        print(f"    Signal badge: {'FOUND' if signal else 'MISSING'}")

    browser.close()

    print(f"\nErrors ({len(errors)}):")
    for e in errors[:10]:
        print(f"  {e[:150]}")
