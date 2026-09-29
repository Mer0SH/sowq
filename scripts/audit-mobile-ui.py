"""Measured 360px interaction and contrast audit using fixture admin data."""
import json
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
out = root / 'qa' / 'mobile'
out.mkdir(parents=True, exist_ok=True)
staff = {'id':1,'name':'مدير المتجر','email':'owner@example.com','role':'owner','is_active':1,'categories':[]}
rows = [staff] + [{'id':n,'name':'موظف الاختبار '+str(n),'email':f'staff{n}@example.com','role':'catalog','is_active':1,'categories':[1]} for n in range(2,13)]
home = {'hero':{'eyebrow':'عرض خاص','title':'غسيل أذكى ليوم أهدأ','description':'غسالة للمنزل','theme':'dark','desktopImage':'/src/assets/hero-washing-machine.png','mobileImage':'/src/assets/hero-washing-machine.png','productId':None,'buttonLabel':'تسوق الآن','linkType':'products','linkId':''},'announcements':[],'banners':[],'sections':[]}

def route(r):
    path = r.request.url.split('localhost:4000',1)[1]
    data = {'/me':{'staff':staff},'/dashboard':{'new_orders':0,'delayed_orders':0,'low_stock':0,'product_count':0,'recent_orders':[],'low_stock_products':[]},'/staff':rows,'/admin/categories':[{'id':1,'name':'الأثاث','parent_id':None,'product_count':0,'is_active':1,'sort_order':1}],'/storefront/home':home,'/storefront/products':[],'/storefront/categories':[]}.get(path,[])
    if path == '/auth/login':
      time.sleep(3)
      r.fulfill(status=401,body=json.dumps({'ok':False,'error':'بيانات الدخول غير صحيحة'}),headers={'content-type':'application/json'}); return
    r.fulfill(status=200,body=json.dumps({'ok':True,'data':data}),headers={'content-type':'application/json'})

measure_js = """(selectors) => {
  const parse = s => {const m=s.match(/[\\d.]+/g);return m?m.slice(0,3).map(Number):[255,255,255]};
  const light = rgb => {const c=rgb.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return .2126*c[0]+.7152*c[1]+.0722*c[2]};
  return selectors.map(selector=>{const e=document.querySelector(selector);if(!e)return {selector,missing:true};let b=e;let bg='';while(b){const v=getComputedStyle(b).backgroundColor;if(v&&!v.includes('0)')&&v!=='transparent'){bg=v;break}b=b.parentElement}bg ||= 'rgb(255,255,255)';const fg=getComputedStyle(e).color;const a=light(parse(fg)),c=light(parse(bg));const rect=e.getBoundingClientRect();return {selector,text:e.textContent.trim().slice(0,50),foreground:fg,background:bg,contrast:+((Math.max(a,c)+.05)/(Math.min(a,c)+.05)).toFixed(2),size:getComputedStyle(e).fontSize,target:[Math.round(rect.width),Math.round(rect.height)]}})
}"""

result = {}
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',headless=True)
    context=browser.new_context(viewport={'width':360,'height':800},is_mobile=True,has_touch=True)
    context.add_init_script("""const originalFetch=window.fetch;window.fetch=(url,options)=>String(url).includes('/auth/login')?new Promise(resolve=>setTimeout(()=>resolve(new Response(JSON.stringify({ok:false,error:'بيانات الدخول غير صحيحة'}),{status:401,headers:{'content-type':'application/json'}})),2000)):originalFetch(url,options);""")
    context.route('http://localhost:4000/**',route)
    page=context.new_page()
    page.goto('http://127.0.0.1:8443/admin',wait_until='domcontentloaded')
    page.get_by_role('heading',name='تسجيل دخول الموظفين').wait_for()
    page.screenshot(path=str(out/'audit-login-light.png'))
    result['loginLight']=page.evaluate(measure_js,['.admin-login-card h2','.admin-login-card>p','.admin-login-form .admin-field','.admin-login-form input','.admin-login-footer','.admin-back-store'])
    page.get_by_role('button',name='دخول مساحة العمل').click()
    page.screenshot(path=str(out/'audit-login-error.png'))
    page.get_by_role('textbox',name='البريد الإلكتروني').fill('owner@example.com')
    page.locator('#admin-password').fill('invalid')
    page.get_by_role('button',name='إظهار كلمة المرور').click()
    result['passwordVisible']=page.locator('#admin-password').get_attribute('type')=='text'
    page.locator('.admin-login-form').evaluate('(form)=>form.requestSubmit()')
    page.screenshot(path=str(out/'audit-login-loading.png'))
    result['loginLoadingDisabled']=page.get_by_role('button',name='جارٍ تسجيل الدخول…').is_disabled()
    page.get_by_text('بيانات الدخول غير صحيحة').wait_for()
    page.locator('#admin-email').focus()
    page.screenshot(path=str(out/'audit-login-focus.png'))
    result['focusOutline']=page.locator('#admin-email').evaluate('(e)=>getComputedStyle(e).outlineWidth')
    page.get_by_role('button',name='تفعيل الوضع الليلي').click()
    page.screenshot(path=str(out/'audit-login-dark.png'))
    result['loginDark']=page.evaluate(measure_js,['.admin-login-card h2','.admin-login-card>p','.admin-login-form .admin-field','.admin-login-form input','.admin-login-footer','.admin-back-store'])
    context.close()

    for dark in (False,True):
      c=browser.new_context(viewport={'width':360,'height':800},is_mobile=True,has_touch=True)
      c.add_init_script("sessionStorage.setItem('souq-admin-token','qa-fixture')")
      if dark:c.add_init_script("localStorage.setItem('souq-admin-theme','dark')")
      c.route('http://localhost:4000/**',route)
      p=c.new_page();p.goto('http://127.0.0.1:8443/admin',wait_until='domcontentloaded')
      p.get_by_role('button',name='فتح القائمة').click();p.get_by_role('button',name='الموظفون والصلاحيات').click();p.locator('.admin-staff-card').first.wait_for()
      p.screenshot(path=str(out/('audit-staff-dark.png' if dark else 'audit-staff-light.png')))
      result['staffDark' if dark else 'staffLight']=p.evaluate(measure_js,['.admin-staff-page h1','.admin-staff-page .admin-heading p','.admin-staff-page .admin-btn','.admin-count','.admin-staff-identity bdi','.admin-staff-card dt','.admin-staff-edit'])
      result['staffDarkOverflow' if dark else 'staffLightOverflow']=p.evaluate('document.documentElement.scrollWidth>innerWidth')
      c.close()
    c=browser.new_context(viewport={'width':360,'height':800},is_mobile=True,has_touch=True)
    c.route('http://localhost:4000/**',route)
    p=c.new_page();p.goto('http://127.0.0.1:8443/',wait_until='domcontentloaded');p.locator('main h1').wait_for()
    p.screenshot(path=str(out/'audit-store-normal.png'))
    result['store']=p.evaluate(measure_js,['header button[aria-label="الرئيسية"]','nav[aria-label="التنقل السفلي"] button','main h1','main section button'])
    result['storeTargets']=p.evaluate("""() => [...document.querySelectorAll('button,input,select,textarea')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&r.top<innerHeight&&r.bottom>0}).map(e=>({label:e.getAttribute('aria-label')||e.textContent.trim().slice(0,24),width:Math.round(e.getBoundingClientRect().width),height:Math.round(e.getBoundingClientRect().height)})).filter(x=>x.width<48||x.height<48).slice(0,30)""")
    p.get_by_role('navigation',name='التنقل السفلي').get_by_role('button',name='السلة').click()
    p.screenshot(path=str(out/'audit-cart-empty.png'))
    p.get_by_role('button',name='إغلاق السلة').click()
    p.get_by_role('navigation',name='التنقل السفلي').get_by_role('button',name='الأقسام').click()
    p.screenshot(path=str(out/'audit-products-empty.png'))
    result['productsTargets']=p.evaluate("""() => [...document.querySelectorAll('button,input,select,textarea')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&r.top<innerHeight&&r.bottom>0}).map(e=>({label:e.getAttribute('aria-label')||e.textContent.trim().slice(0,24),width:Math.round(e.getBoundingClientRect().width),height:Math.round(e.getBoundingClientRect().height)})).filter(x=>x.width<48||x.height<48).slice(0,30)""")
    c.close();browser.close()
(out/'audit-ui-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False))
