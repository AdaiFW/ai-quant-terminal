"""Reconnaissance: check terminal UI state, chart rendering, errors."""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    errors = []
    page.on("pageerror", lambda err: errors.append(err.message))
    page.on("console", lambda msg: errors.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)

    # Load
    page.goto("http://localhost:3000", timeout=30000)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)

    # Check key elements
    checks = {
        "ticker_bar": page.locator('text=SPX').count(),
        "watchlist": page.locator('text=AAPL').first.count(),
        "sidebar_left": page.locator('text=Watchlist').count(),
        "sidebar_right": page.locator('text=AI Quant').count(),
        "timeframe_btns": page.locator('button:has-text("1D")').count(),
    }
    for name, count in checks.items():
        print(f"  {name}: {'FOUND' if count > 0 else 'MISSING'}")

    # Search 600519 via watchlist click
    aapl_btn = page.locator('text=AAPL').first
    if aapl_btn.count() > 0:
        aapl_btn.click()
        page.wait_for_timeout(6000)
        page.wait_for_load_state("networkidle")

    # Check chart canvas exists
    canvas = page.locator('canvas').count()
    print(f"  chart_canvas: {canvas} canvas elements")

    # Check toolbar with ticker name
    ticker_in_toolbar = page.locator('text=AAPL').first.count()
    print(f"  toolbar_ticker: {'FOUND' if ticker_in_toolbar > 0 else 'MISSING'}")

    # Check AI button
    ai_btn = page.locator('button:has-text("AI Analysis")')
    print(f"  ai_button: {'FOUND' if ai_btn.count() > 0 else 'MISSING'}")

    # Click AI if available
    if ai_btn.count() > 0:
        ai_btn.first.click()
        page.wait_for_timeout(20000)
        page.wait_for_load_state("networkidle")
        print(f"  ai_panel: checking...")
        signal = page.locator('text=Strong Buy').count() or page.locator('text=Buy').count() or page.locator('text=Neutral').count()
        print(f"  ai_signal_badge: {'FOUND' if signal > 0 else 'MISSING'}")

    browser.close()

    print(f"\nErrors: {len(errors)}")
    for e in errors[:5]:
        print(f"  - {e[:120]}")
