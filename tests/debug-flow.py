"""Debug: capture errors during search + analysis flow."""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})

    errors = []
    page.on("pageerror", lambda err: errors.append(f"RUNTIME: {err.message}"))
    page.on("console", lambda msg: errors.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)

    # Load
    page.goto("http://localhost:3000", timeout=30000)
    page.wait_for_timeout(2000)

    # Search 600519
    inp = page.locator('input[placeholder*="ticker"]')
    if inp.count() > 0:
        inp.fill("600519")
        page.locator('button:has-text("Search")').click()
        page.wait_for_timeout(8000)
        page.wait_for_load_state("networkidle")

    # Check for Run button
    btn = page.locator('button:has-text("Run")')
    if btn.count() > 0:
        btn.first.click()
        page.wait_for_timeout(25000)

    browser.close()

    if errors:
        print("\n".join(errors[:30]))
    else:
        print("No errors during full flow.")
