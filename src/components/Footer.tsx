import { ArrowLeft, PackageCheck, ShoppingBag, Truck } from 'lucide-react';
import { useApp } from '../context/useApp';

export default function Footer() {
  const { navigate } = useApp();
  return <footer className="bg-[#273428] text-white mt-8 sm:mt-12 pb-[calc(88px+var(--app-safe-bottom))] sm:pb-0" dir="rtl">
    <div className="max-w-7xl mx-auto px-5 sm:px-6 py-10 grid gap-9 sm:grid-cols-[1fr_auto] sm:items-center">
      <div><strong className="text-3xl font-black">سوق<span className="text-[#d4b17b]">.</span></strong><p className="text-white/65 mt-3 max-w-md leading-7 text-sm">منتجات مختارة بعناية للأزياء والعطور والمنزل، مع متابعة حالة طلبك من المتجر.</p><div className="flex gap-5 flex-wrap mt-6 text-xs text-white/75"><span className="inline-flex gap-2 items-center"><Truck size={17} /> توصيل داخل اليمن</span><span className="inline-flex gap-2 items-center"><PackageCheck size={17} /> الدفع عند الاستلام</span></div></div>
      <div className="flex flex-wrap gap-3"><button onClick={() => navigate('products')} className="inline-flex gap-2 items-center bg-[#d4b17b] text-[#273428] rounded-xl px-5 py-3 text-sm font-bold"><ShoppingBag size={17} /> تسوق الآن</button><button onClick={() => navigate('account')} className="inline-flex gap-2 items-center border border-white/25 rounded-xl px-5 py-3 text-sm">متابعة طلباتي <ArrowLeft size={16} /></button></div>
    </div>
    <div className="border-t border-white/15"><div className="max-w-7xl mx-auto px-5 sm:px-6 py-5 text-white/55 text-xs flex flex-wrap justify-between gap-2"><span>© {new Date().getFullYear()} سوق</span><span>الأسعار بالريال اليمني (YER)</span></div></div>
  </footer>;
}
