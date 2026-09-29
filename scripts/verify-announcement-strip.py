"""Check mobile announcement continuity and the staff-login entry with fixture data."""
import json
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
out = root / 'qa' / 'mobile'
out.mkdir(parents=True, exist_ok=True)
home = {
    'hero': {'eyebrow': 'عرض خاص', 'title': 'غسيل أذكى ليوم أهدأ', 'description': 'غسالة للمنزل', 'theme': 'dark', 'desktopImage': '/src/assets/hero-washing-machine.png', 'mobileImage': '/src/assets/hero-washing-machine.png', 'productId': None, 'buttonLabel': 'تسوق الآن', 'linkType': 'products', 'linkId': ''},
    'announcements': [{'id': 'a', 'text': 'اكتشف منتجات سوق المختارة بعناية', 'enabled': True, 'linkType': 'products', 'linkId': ''}],
    'banners': [], 'sections': [],
}

def route(request):
    path = request.request.url.split('localhost:4000', 1)[1]
    if path == '/storefront/home':
        time.sleep(1.5)
        data = home
    else:
        data = []
    request.fulfill(status=200, body=json.dumps({'ok': True, 'data': data}), headers={'content-type':'application/json', 'access-control-allow-origin':'*'})

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', headless=True)
    result = {}
    for width in (360, 390, 412):
        context = browser.new_context(viewport={'width': width, 'height': 800}, is_mobile=True, has_touch=True)
        context.route('http://localhost:4000/**', route)
        page = context.new_page()
        page.goto('http://127.0.0.1:8443/', wait_until='domcontentloaded')
        page.locator('.announcement-strip').wait_for()
        result[str(width)] = {'loadingStrip': page.locator('.announcement-strip').is_visible()}
        if width == 360: page.screenshot(path=str(out / 'announcement-loading-360.png'))
        page.get_by_text('اكتشف منتجات سوق المختارة بعناية').first.wait_for(timeout=20000)
        dimensions = page.locator('.announcement-strip').evaluate('(el) => ({height:el.getBoundingClientRect().height, width:el.getBoundingClientRect().width})')
        result[str(width)]['dimensions'] = dimensions
        if width == 360: page.screenshot(path=str(out / 'announcement-loaded-360.png'))
        page.locator('.marquee-track').evaluate('(el) => el.style.animationDuration = "2s"')
        result[str(width)]['continuous'] = page.evaluate('''async () => {
            const strip=document.querySelector('.announcement-strip'); const buttons=[...strip.querySelectorAll('button')];
            let empty=0, frames=0;
            await new Promise(resolve => { const start=performance.now(); function sample(now) {
                const box=strip.getBoundingClientRect();
                if (!buttons.some(button => {const b=button.getBoundingClientRect();return b.right>box.left+2&&b.left<box.right-2;})) empty++;
                frames++; if(now-start<4500)requestAnimationFrame(sample);else resolve();
            } requestAnimationFrame(sample); });
            return {frames,empty};
        }''')
        page.get_by_role('navigation', name='التنقل السفلي').get_by_role('button', name='الأقسام').click()
        page.get_by_role('heading', name='جميع المنتجات').wait_for()
        page.go_back(wait_until='domcontentloaded')
        result[str(width)]['afterBack'] = page.locator('.announcement-strip').is_visible() and page.get_by_text('اكتشف منتجات سوق المختارة بعناية').first.is_visible()
        if width == 360:
            page.screenshot(path=str(out / 'announcement-after-back-360.png'))
            page.get_by_role('button', name='القائمة', exact=True).click()
            result[str(width)]['menuEntry'] = page.get_by_role('button', name='دخول الموظفين والإدارة').is_visible()
            page.get_by_role('button', name='دخول الموظفين والإدارة').click()
            result[str(width)]['login'] = page.get_by_role('heading', name='تسجيل دخول الموظفين').is_visible()
            page.screenshot(path=str(out / 'announcement-admin-entry-360.png'))
        context.close()
    browser.close()
    (out / 'announcement-results.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(result, ensure_ascii=False, indent=2))
