import { useEffect, useState } from 'react';
import { adminRequest } from '../../services/adminApi';

type Customer = { uid: string; name: string; email: string; interests: string[]; onboarded: boolean; created_at: string };
type Report = { total_customers: number; completed: number; interests: { id: string; name: string; count: number }[]; customers: Customer[] };

export default function CustomerInterestsPanel({ token }: { token: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    adminRequest<Report>('/customer-interests', token, 'GET', undefined, controller.signal)
      .then(data => { if (!controller.signal.aborted) setReport(data); })
      .catch(cause => { if (!controller.signal.aborted) setError((cause as Error).message); });
    return () => controller.abort();
  }, [token, revision]);
  if (error) return <div className="admin-alert error" role="alert">{error}<button className="admin-text-btn" onClick={() => setRevision(v => v + 1)}>إعادة المحاولة</button></div>;
  if (!report) return <p className="admin-card p-6" role="status">جارٍ تحميل اهتمامات العملاء…</p>;
  const customers = report.customers.filter(c => `${c.name} ${c.email} ${c.interests.join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  const max = report.interests[0]?.count || 1;
  return <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2"><section className="admin-card p-6"><p className="text-sm opacity-70">العملاء المسجلون</p><strong className="mt-2 block text-3xl">{report.total_customers}</strong></section><section className="admin-card p-6"><p className="text-sm opacity-70">اختاروا اهتماماتهم</p><strong className="mt-2 block text-3xl">{report.completed}</strong></section></div>
    <section className="admin-card p-6"><h2 className="text-lg font-bold">الأقسام الأكثر اهتمامًا</h2><p className="mt-1 text-sm opacity-70">عدد العملاء الذين اختاروا كل قسم أو فرع.</p>{report.interests.length ? <div className="mt-6 space-y-4">{report.interests.map(interest => <div key={interest.id}><div className="mb-2 flex justify-between gap-3 text-sm"><strong>{interest.name}</strong><span>{interest.count} عميل</span></div><div className="h-2 overflow-hidden rounded-full bg-gray-200"><div className="h-full rounded-full bg-[#bd985e]" style={{ width: `${interest.count / max * 100}%` }} /></div></div>)}</div> : <p className="mt-5 text-sm opacity-70">ما فيه اختيارات محفوظة بعد.</p>}</section>
    <section className="admin-card p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">اختيارات العملاء</h2><p className="mt-1 text-sm opacity-70">تُعرض للمدير فقط.</p></div><input value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث باسم أو بريد أو اهتمام" aria-label="البحث عن عميل" className="min-h-10 rounded-xl border border-gray-300 bg-transparent px-4 text-sm outline-none focus:border-[#bd985e]" /></div>
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[540px] text-right text-sm"><thead><tr className="border-b border-gray-200"><th className="py-3">العميل</th><th>الاهتمامات</th><th>الحالة</th></tr></thead><tbody>{customers.map(customer => <tr key={customer.uid} className="border-b border-gray-100 align-top"><td className="py-4"><strong>{customer.name || 'عميل سوق'}</strong><small className="mt-1 block opacity-70" dir="ltr">{customer.email}</small></td><td className="py-4">{customer.interests.length ? customer.interests.join('، ') : '—'}</td><td className="py-4">{customer.onboarded ? 'مكتمل' : 'لم يكمل بعد'}</td></tr>)}</tbody></table>{!customers.length && <p className="py-7 text-center text-sm opacity-70">لا توجد نتائج.</p>}</div>
    </section>
  </div>;
}
