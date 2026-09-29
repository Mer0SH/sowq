import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { adminRequest as api } from '../../services/adminApi';
import type { OrderDetail, Role } from '../../services/adminApi';
import { Modal, Field, Status, Empty, date, money, num, statusLabels } from './ui';
export default function OrderPanel({ id, token, role, onClose, onSaved }: { id: number; token: string; role: Role; onClose: () => void; onSaved: () => void }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    api<OrderDetail>(`/orders/${id}`, token, 'GET', undefined, controller.signal).then(setOrder).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, token, version]);
  const canEdit = (role === 'owner' || role === 'fulfillment') && order && !['delivered', 'cancelled'].includes(order.status);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!order) return; setBusy(true); setError(''); setSaved(false);
    const data = new FormData(e.currentTarget);
    try {
      await api(`/orders/${id}/status`, token, 'PATCH', { status: data.get('status'), shipping_company: data.get('shipping_company'), tracking_number: data.get('tracking_number'), expected_updated_at: order.updated_at });
      setSaved(true); setVersion(v => v + 1); onSaved();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <Modal title={`تفاصيل الطلب #${id}`} onClose={onClose} busy={busy} wide><div className="admin-order-detail">
    {error && <div role="alert" className="admin-alert error">{error}<button className="admin-text-btn" onClick={() => setVersion(v => v + 1)}>إعادة التحميل</button></div>}
    {saved && <p role="status" className="admin-alert success">تم تحديث الطلب وتسجيل التغيير.</p>}
    {loading ? <p role="status" className="admin-loading">جارٍ تحميل تفاصيل الطلب…</p> : order && <>
      <div className="admin-detail-summary"><div><small>العميل</small><h3>{order.customer_name}</h3><a dir="ltr" href={`tel:${order.customer_phone}`}>{order.customer_phone}</a></div><div><small>تاريخ الطلب</small><p>{date(order.created_at)}</p><Status value={order.status} /></div>{order.total !== undefined && <div><small>إجمالي الطلب</small><h3>{money(order.total)}</h3></div>}</div>
      {order.city && <div className="admin-readonly"><p><strong>عنوان التوصيل:</strong> {[order.city, order.district, order.street].filter(Boolean).join('، ')}</p>{order.address_note && <p><strong>ملاحظات:</strong> {order.address_note}</p>}<p><strong>الدفع:</strong> {order.payment_method === 'cod' ? 'عند الاستلام' : order.payment_method || 'غير محدد'} · {order.payment_status === 'pending' ? 'بانتظار التحصيل' : order.payment_status || 'غير محدد'}</p></div>}
      <h3 className="admin-section-title">المنتجات</h3><div className="admin-table-wrap"><table><thead><tr><th>المنتج</th><th>الكمية</th>{role !== 'fulfillment' && <th>سعر الوحدة</th>}</tr></thead><tbody>{order.items.map(i => <tr key={i.id}><td>{i.name}<small>{i.sku}</small></td><td>{num(i.quantity)}</td>{i.unit_price !== undefined && <td>{money(i.unit_price)}</td>}</tr>)}</tbody></table>{!order.items.length && <Empty text="لا توجد أصناف مسجلة" detail="هذا الطلب لا يحتوي على تفاصيل أصناف." />}</div>
      <h3 className="admin-section-title">الحالة والشحن</h3>
      {canEdit ? <form key={order.updated_at} onSubmit={save} className="admin-form compact"><div className="admin-form-grid"><Field label="حالة الطلب"><select name="status" defaultValue={order.status}>{order.allowed_statuses.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}</select></Field><Field label="شركة الشحن"><input name="shipping_company" maxLength={200} defaultValue={order.shipping_company || ''} /></Field></div><Field label="رقم التتبع" hint="شركة الشحن ورقم التتبع مطلوبان عند تحويل الحالة إلى تم الشحن."><input name="tracking_number" maxLength={200} dir="ltr" defaultValue={order.tracking_number || ''} /></Field><button className="admin-btn" disabled={busy}>{busy ? 'جارٍ التحديث…' : 'حفظ حالة الطلب'}</button></form> : <div className="admin-readonly"><p>الحالة: <Status value={order.status} /></p><p>شركة الشحن: {order.shipping_company || 'لم تحدد بعد'}</p><p>رقم التتبع: <bdi>{order.tracking_number || 'لم يضف بعد'}</bdi></p><small>{['delivered', 'cancelled'].includes(order.status) ? 'الطلب مغلق.' : 'للاطلاع والمتابعة.'}</small></div>}
      <h3 className="admin-section-title">سجل التغييرات</h3>{order.history.length ? <ol className="admin-timeline">{order.history.map(h => <li key={h.id}><span className="admin-timeline-dot" /><div><strong>{statusLabels[h.from_status] || 'بداية الطلب'} ← {statusLabels[h.to_status]}</strong><p>{h.staff_name || 'النظام'} · {date(h.created_at)}</p>{h.note && <small>{h.note}</small>}</div></li>)}</ol> : <p className="admin-help">لم تسجل تغييرات على الطلب بعد.</p>}
    </>}
  </div></Modal>;
}
