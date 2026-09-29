"""Mobile layout and first-frame checks with fixture staff and live storefront data."""
import json
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
out = root / 'qa' / 'mobile'
out.mkdir(parents=True, exist_ok=True)
base = 'http://127.0.0.1:8443/'
staff = [{'id': i, 'name': 'موظف الاختبار ' + str(i), 'email': f'staff{i}@example.com', 'role': ['owner', 'catalog', 'support'][i % 3], 'is_active': i % 2, 'categories': [1]} for i in range(1, 16)]
staff[0] = {'id': 1, 'name': 'مدير المتجر', 'email': 'owner@example.com', 'role': 'owner', 'is_active': 1, 'categories': []}
categories = [{'id': 1, 'name': 'الأثاث والمنزل', 'parent_id': None, 'product_count': 12, 'is_active': 1, 'sort_order': 1}]

def route(request):
    path = request.request.url.split('localhost:4000', 1)[1]
    if path == '/me': data = {'staff': staff[0]}
    elif path == '/staff': data = staff
    elif path == '/admin/categories': data = categories
    elif path == '/dashboard': data = {'new_orders': 0, 'delayed_orders': 0, 'low_stock': 0, 'product_count': 0, 'recent_orders': [], 'low_stock_products': []}
    elif path == '/storefront/home':
        time.sleep(1.2)
        data = {'hero':{'eyebrow':'عرض خاص','title':'غسيل أذكى ليوم أهدأ','description':'غسالة للمنزل','theme':'dark','desktopImage':'/src/assets/hero-washing-machine.png','mobileImage':'/src/assets/hero-washing-machine.png','productId':None,'buttonLabel':'تسوق الآن','linkType':'products','linkId':''},'announcements':[],'banners':[],'sections':[]}
    elif path in ('/storefront/products', '/storefront/categories'): data = []
    else: data = []
    request.fulfill(status=200, body=json.dumps({'ok': True, 'data': data}), headers={'content-type':'application/json', 'access-control-allow-origin':'*'})

results = []
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe', headless=True)
    for width in (360, 390, 412):
        context = browser.new_context(viewport={'width':width, 'height':800}, is_mobile=True, has_touch=True, reduced_motion='reduce')
        context.add_init_script("sessionStorage.setItem('souq-admin-token','qa-fixture')")
        context.route('http://localhost:4000/**', route)
        page = context.new_page()
        page.goto(base + 'admin', wait_until='domcontentloaded')
        page.wait_for_timeout(1500)
        print('ADMIN', width, page.locator('body').inner_text()[:500], flush=True)
        print('TOGGLE', page.evaluate("() => {const e=document.querySelector('.admin-mobile-toggle');return [e?.outerHTML, e && getComputedStyle(e).display,innerWidth]}"), flush=True)
        page.get_by_role('button', name='فتح القائمة').click()
        page.get_by_role('button', name='الموظفون والصلاحيات').click()
        page.locator('.admin-staff-card').first.wait_for()
        page.screenshot(path=str(out / f'{width}-staff-cards.png'))
        page.get_by_role('textbox', name='البحث في القائمة').fill('staff14')
        page.screenshot(path=str(out / f'{width}-staff-filter.png'))
        metrics = page.evaluate("""() => ({overflow:document.documentElement.scrollWidth>innerWidth, cards:document.querySelectorAll('.admin-staff-card').length, table:getComputedStyle(document.querySelector('.admin-staff-table')).display, count:document.querySelector('.admin-count').textContent, pagination:document.querySelector('.admin-pagination').textContent, edit:[...document.querySelectorAll('.admin-staff-edit')].map(e=>[e.getBoundingClientRect().width,e.getBoundingClientRect().height])})""")
        page.get_by_role('textbox', name='البحث في القائمة').fill('')
        page.get_by_role('button', name='فتح القائمة').click()
        page.screenshot(path=str(out / f'{width}-admin-drawer.png'))
        drawer = page.evaluate("""() => {const a=document.querySelector('.admin-sidebar'),b=a.querySelector('.admin-sidebar-bottom'),s=a.querySelector('.admin-sidebar-scroll');return {width:a.getBoundingClientRect().width, height:a.getBoundingClientRect().height,bottomVisible:b.getBoundingClientRect().bottom<=a.getBoundingClientRect().bottom,scrollHeight:s.scrollHeight,clientHeight:s.clientHeight,focus:document.activeElement?.getAttribute('aria-label')}}""")
        page.keyboard.press('Tab')
        drawer['tabFocusInside'] = page.evaluate("() => document.querySelector('.admin-sidebar').contains(document.activeElement)")
        page.go_back()
        page.wait_for_timeout(100)
        drawer['androidStyleBackClosed'] = not page.locator('.admin-sidebar').evaluate('(el)=>el.classList.contains("open")')
        page.get_by_role('button', name='فتح القائمة').click()
        page.keyboard.press('Escape')
        page.wait_for_timeout(100)
        metrics['drawer'] = drawer
        metrics['escapeClosed'] = not page.locator('.admin-sidebar').evaluate('(el)=>el.classList.contains("open")')
        results.append({'width':width, 'admin':metrics})
        if width == 360:
            page.set_viewport_size({'width':360,'height':480})
            page.get_by_role('button', name='فتح القائمة').click()
            page.locator('.admin-sidebar-scroll').evaluate('(el)=>el.scrollTop=el.scrollHeight')
            page.screenshot(path=str(out / '360-admin-drawer-short.png'))
            results[-1]['shortDrawer'] = page.evaluate("""() => {const d=document.querySelector('.admin-sidebar'),b=d.querySelector('.admin-sidebar-bottom'),s=d.querySelector('.admin-sidebar-scroll'),u=d.querySelector('.admin-user');return {drawerBottom:d.getBoundingClientRect().bottom,bottomBottom:b.getBoundingClientRect().bottom,userBottom:u.getBoundingClientRect().bottom,scrollable:s.scrollHeight>s.clientHeight,lastLinkVisible:s.querySelector('nav button:last-child').getBoundingClientRect().bottom<=s.getBoundingClientRect().bottom}}""")
        context.close()

    context = browser.new_context(viewport={'width':360,'height':800}, is_mobile=True, has_touch=True, reduced_motion='reduce')
    context.route('http://localhost:4000/**', route)
    page = context.new_page()
    page.goto(base, wait_until='domcontentloaded')
    page.screenshot(path=str(out / 'hero-loading-slow.png'))
    page.locator('main h1').wait_for(timeout=30000)
    page.screenshot(path=str(out / 'hero-loaded-slow.png'))
    page.get_by_role('navigation', name='التنقل السفلي').get_by_role('button', name='الأقسام').click()
    page.locator('main h1').first.wait_for()
    page.evaluate("""() => {window.__heroFrames=[];const loop=()=>{const main=document.querySelector('main');window.__heroFrames.push({title:main?.querySelector('h1')?.textContent||'',image:main?.querySelector('section img')?.getAttribute('src')||'',loading:main?.getAttribute('aria-busy')||''});if(window.__heroFrames.length<300)requestAnimationFrame(loop)};requestAnimationFrame(loop)}""")
    page.go_back(wait_until='domcontentloaded')
    page.locator('main h1').wait_for(timeout=30000)
    frames = page.evaluate('window.__heroFrames')
    results.append({'returnFrames': len(frames), 'chairFrames': [f for f in frames if 'أدون' in f['title'] or 'chair' in f['image'].lower()], 'firstFrames':frames[:5], 'lastFrame':frames[-1] if frames else None})
    page.screenshot(path=str(out / 'hero-after-back-slow.png'))
    page.reload(wait_until='domcontentloaded')
    page.screenshot(path=str(out / 'hero-reload-loading-slow.png'))
    page.locator('main h1').wait_for(timeout=30000)
    page.screenshot(path=str(out / 'hero-reload-loaded-slow.png'))
    context.close()
    browser.close()
(out / 'admin-hero-results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(results, ensure_ascii=False))
