import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/useApp';
import { emailSignIn, socialSignIn } from '../services/customerAuth';

function messageFor(error: unknown) {
  const code = (error as { code?: string })?.code || '';
  if (code.includes('popup-closed')) return 'أُغلقت نافذة الدخول قبل إكمال العملية.';
  if (code.includes('operation-not-allowed')) return 'طريقة الدخول هذه غير مفعّلة في إعدادات المتجر بعد.';
  if (code.includes('email-already-in-use')) return 'البريد مستخدم بالفعل. اختر تسجيل الدخول.';
  if (code.includes('weak-password')) return 'اختر كلمة مرور من 6 أحرف على الأقل.';
  if (code.includes('invalid-credential') || code.includes('wrong-password')) return 'البريد أو كلمة المرور غير صحيحة.';
  if (code.includes('unauthorized-domain')) return 'نطاق الموقع غير معتمد لتسجيل الدخول.';
  return (error as Error)?.message || 'تعذر تسجيل الدخول الآن. حاول مجددًا.';
}

export default function CustomerLoginPage() {
  const { navigate, continueAfterLogin, refreshCustomerProfile } = useApp();
  const [register, setRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function finish(action: () => Promise<unknown>) {
    setBusy(true); setError('');
    try {
      await action();
      await refreshCustomerProfile();
      continueAfterLogin();
    } catch (cause) { setError(messageFor(cause)); }
    finally { setBusy(false); }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void finish(() => emailSignIn(email.trim(), password, register ? name.trim() : undefined));
  }

  return <main className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-4 py-10 sm:py-16" dir="rtl">
    <div className="grid w-full overflow-hidden rounded-[28px] border border-border bg-white shadow-[0_24px_80px_-48px_rgba(20,33,30,.4)] md:grid-cols-2">
      <section className="flex flex-col justify-between bg-[#102c2b] p-7 text-white sm:p-10">
        <div><span className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1.5 text-xs text-[#e5c78c]"><ShieldCheck size={14} /> حسابك في سوق</span>
          <h1 className="mt-10 text-3xl font-black leading-tight sm:text-4xl">تسوق براحتك.<br /><span className="text-[#e8c178]">واحفظ اختياراتك.</span></h1>
          <p className="mt-5 max-w-sm text-sm leading-7 text-white/70">سجّل دخولك لإضافة المنتجات للسلة ومتابعة طلباتك. وبعد دخولك الأول اختر الأقسام التي تهمك لنقرب لك ما تبحث عنه.</p></div>
        <span className="mt-14 text-sm font-bold">سوق <span className="text-[#e8c178]">●</span></span>
      </section>
      <section className="p-6 sm:p-10">
        <button type="button" onClick={() => navigate('home')} className="mb-8 inline-flex items-center gap-2 text-sm text-muted hover:text-ink"><ArrowLeft size={16} className="rotate-180" /> العودة للمتجر</button>
        <h2 className="text-2xl font-black text-ink">{register ? 'إنشاء حساب' : 'تسجيل الدخول'}</h2>
        <p className="mt-2 text-sm text-muted">{register ? 'أنشئ حسابك ثم اختر اهتماماتك.' : 'أهلًا بعودتك إلى سوق.'}</p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          {register && <label className="block text-sm font-medium text-ink">الاسم<input required minLength={2} autoComplete="name" value={name} onChange={e => setName(e.target.value)} className="mt-2 block w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-brand" placeholder="اسمك" /></label>}
          <label className="block text-sm font-medium text-ink">البريد الإلكتروني<div className="relative mt-2"><Mail size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" /><input required type="email" autoComplete="email" dir="ltr" value={email} onChange={e => setEmail(e.target.value)} className="block w-full rounded-xl border border-border py-3 pr-10 pl-4 text-left outline-none focus:border-brand" placeholder="name@example.com" /></div></label>
          <label className="block text-sm font-medium text-ink">كلمة المرور<div className="relative mt-2"><LockKeyhole size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" /><input required minLength={6} type={showPassword ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} className="block w-full rounded-xl border border-border py-3 pr-10 pl-12 outline-none focus:border-brand" placeholder="••••••••" /><button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button disabled={busy} className="w-full rounded-xl bg-[#102c2b] px-5 py-3.5 font-bold text-white hover:bg-[#24504d] disabled:opacity-60">{busy ? 'انتظر قليلًا…' : register ? 'إنشاء الحساب' : 'تسجيل الدخول'}</button>
        </form>
        <div className="my-6 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-border" /> أو أكمل باستخدام <span className="h-px flex-1 bg-border" /></div>
        <div className="grid grid-cols-2 gap-3"><button disabled={busy} onClick={() => void finish(() => socialSignIn('google'))} className="rounded-xl border border-border px-3 py-3 text-sm font-bold text-ink hover:bg-surface disabled:opacity-60">Google</button><button disabled title="يتطلب إعداد حساب مطور Apple" className="rounded-xl border border-border px-3 py-3 text-sm font-bold text-muted opacity-50">Apple · قريبًا</button></div>
        <p className="mt-7 text-center text-sm text-muted">{register ? 'عندك حساب؟' : 'ما عندك حساب؟'} <button type="button" onClick={() => { setRegister(v => !v); setError(''); }} className="font-bold text-[#9d7441] hover:underline">{register ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}</button></p>
      </section>
    </div>
  </main>;
}
