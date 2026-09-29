"""Capture phone viewport evidence for the storefront and admin entry."""

import json
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "qa" / "mobile"
OUTPUT.mkdir(parents=True, exist_ok=True)
SITE = "http://127.0.0.1:8443/"
API = "https://soow-2dc12.web.app/api"


def live_api(route):
    if route.request.method == "OPTIONS":
        route.fulfill(status=204, headers={"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, OPTIONS", "Access-Control-Allow-Headers": "content-type, authorization"})
        return
    url = API + route.request.url.split("localhost:4000", 1)[1]
    try:
        with urllib.request.urlopen(url, timeout=20) as response:
            route.fulfill(status=response.status, body=response.read(), headers={"Content-Type": response.headers.get("Content-Type", "application/json"), "Access-Control-Allow-Origin": "*"})
    except Exception as error:
        route.fulfill(status=502, body=str(error))


def capture(page, name):
    page.screenshot(path=str(OUTPUT / name), animations="disabled")


def box(page, selector):
    return page.locator(selector).first.bounding_box()


results = []
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe", headless=True, args=["--no-sandbox"])
    for width in (360, 390, 412):
        context = browser.new_context(viewport={"width": width, "height": 800}, device_scale_factor=1, is_mobile=True, has_touch=True, reduced_motion="reduce")
        context.route("http://localhost:4000/**", live_api)
        page = context.new_page()
        page.add_init_script("window.setInterval = () => 0")
        page.goto(SITE, wait_until="domcontentloaded")
        page.locator("main h1").first.wait_for()
        page.wait_for_timeout(800)
        capture(page, f"{width}-hero-top.png")
        hero_button = box(page, "main section button")
        nav = box(page, "nav[aria-label='التنقل السفلي']")
        results.append({"width": width, "view": "hero-top", "heroButton": hero_button, "bottomNav": nav})
        page.evaluate("const hero = document.querySelector('main > section'); window.scrollTo(0, hero.offsetTop + hero.offsetHeight - innerHeight + 120)")
        capture(page, f"{width}-hero-end.png")
        results.append({"width": width, "view": "hero-end", "section": box(page, "main > section"), "bottomNav": box(page, "nav[aria-label='التنقل السفلي']")})

        showcase = page.locator("section[aria-label='عرض مميز']")
        showcase.scroll_into_view_if_needed()
        page.locator("section[aria-label='عرض مميز'] button[aria-label='عرض 1']").click()
        showcase.scroll_into_view_if_needed()
        capture(page, f"{width}-chair-1.png")
        results.append({"width": width, "view": "chair-1", "button": box(page, "section[aria-label='عرض مميز'] button:has-text('تسوق الآن')"), "bottomNav": box(page, "nav[aria-label='التنقل السفلي']")})
        page.locator("section[aria-label='عرض مميز'] button[aria-label='عرض 2']").click()
        showcase.scroll_into_view_if_needed()
        capture(page, f"{width}-chair-2.png")
        results.append({"width": width, "view": "chair-2", "button": box(page, "section[aria-label='عرض مميز'] button:has-text('تسوق الآن')"), "bottomNav": box(page, "nav[aria-label='التنقل السفلي']")})
        page.evaluate("const card = document.querySelector('section[aria-label=\"عرض مميز\"]'); window.scrollTo(0, card.offsetTop + card.offsetHeight - innerHeight + 120)")
        capture(page, f"{width}-chair-2-end.png")
        results.append({"width": width, "view": "chair-2-end", "section": box(page, "section[aria-label='عرض مميز']"), "bottomNav": box(page, "nav[aria-label='التنقل السفلي']")})

        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        page.wait_for_timeout(150)
        capture(page, f"{width}-page-end.png")
        results.append({"width": width, "view": "page-end", "footer": box(page, "footer"), "bottomNav": box(page, "nav[aria-label='التنقل السفلي']")})

        page.goto(SITE + "admin", wait_until="domcontentloaded")
        page.locator("h2:has-text('تسجيل دخول الموظفين')").wait_for()
        capture(page, f"{width}-admin-login.png")
        results.append({"width": width, "view": "admin-login", "securityText": box(page, ".admin-login-footer")})

        if width == 360:
            page.goto(SITE, wait_until="domcontentloaded")
            page.locator("main h1").first.wait_for()
            page.evaluate("document.documentElement.style.webkitTextSizeAdjust = '200%'")
            capture(page, "360-hero-text-200.png")
            results.append({"width": width, "view": "hero-text-200", "button": box(page, "main section button"), "title": box(page, "main h1"), "bottomNav": box(page, "nav[aria-label='التنقل السفلي']"), "horizontalOverflow": page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth")})
            page.evaluate("const hero = document.querySelector('main > section'); window.scrollTo(0, hero.offsetTop + hero.offsetHeight - innerHeight + 120)")
            capture(page, "360-hero-end-text-200.png")
            showcase.scroll_into_view_if_needed()
            page.locator("section[aria-label='عرض مميز'] button[aria-label='عرض 1']").evaluate("element => element.click()")
            showcase.scroll_into_view_if_needed()
            capture(page, "360-chair-1-text-200.png")
            results.append({"width": width, "view": "chair-1-text-200", "button": box(page, "section[aria-label='عرض مميز'] button:has-text('تسوق الآن')")})
            page.locator("section[aria-label='عرض مميز'] button[aria-label='عرض 2']").evaluate("element => element.click()")
            showcase.scroll_into_view_if_needed()
            capture(page, "360-chair-2-text-200.png")
            results.append({"width": width, "view": "chair-2-text-200", "button": box(page, "section[aria-label='عرض مميز'] button:has-text('تسوق الآن')")})
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            page.wait_for_timeout(150)
            capture(page, "360-page-end-text-200.png")
            results.append({"width": width, "view": "page-end-text-200", "footer": box(page, "footer"), "bottomNav": box(page, "nav[aria-label='التنقل السفلي']")})
        context.close()
    browser.close()

(OUTPUT / "measurements.json").write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
print(OUTPUT)
