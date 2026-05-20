"""Capture browser console errors."""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})

    errors = []
    page.on("pageerror", lambda err: errors.append(f"PAGE ERROR: {err.message}"))
    page.on("console", lambda msg: errors.append(f"CONSOLE [{msg.type}]: {msg.text}") if msg.type in ("error", "warning") else None)

    page.goto("http://localhost:3000", timeout=30000)
    page.wait_for_timeout(3000)

    browser.close()

    if errors:
        print("\n".join(errors[:20]))
    else:
        print("No console errors found.")
