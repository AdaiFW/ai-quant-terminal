"""Debug: check chart container dimensions and DOM state."""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.goto("http://localhost:3000", timeout=30000)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)

    # Check all div sizes in main area
    sizes = page.evaluate("""() => {
        const divs = document.querySelectorAll('div');
        const result = [];
        divs.forEach((d, i) => {
            const r = d.getBoundingClientRect();
            if (r.width > 100 && r.height > 50) {
                result.push({ tag: d.tagName, w: Math.round(r.width), h: Math.round(r.height), cls: d.className?.slice(0, 60) });
            }
        });
        return result.slice(0, 10);
    }""")
    for s in sizes:
        print(f"  {s['w']}x{s['h']}  {s['cls'][:80]}")

    # Check for canvas
    canvases = page.evaluate("() => document.querySelectorAll('canvas').length")
    print(f"\nCanvas count: {canvases}")

    # Check if chart container has content
    chart_area = page.evaluate("""() => {
        const main = document.querySelector('main');
        if (!main) return 'no main';
        const children = main.children;
        const last = children[children.length - 1];
        if (!last) return 'no children';
        const r = last.getBoundingClientRect();
        return `last child: ${r.width}x${r.height}, class: ${last.className?.slice(0, 80)}, children: ${last.children.length}`;
    }""")
    print(f"Chart area: {chart_area}")

    browser.close()
