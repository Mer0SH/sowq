import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X, Inbox } from 'lucide-react';
import type { Role } from '../../services/adminApi';
import { formatPrice } from '../../services/storefrontApi';
export const roles: Record<Role, string> = { owner: 'المدير', catalog: 'مسؤول المنتجات', support: 'خدمة العملاء', fulfillment: 'المستودع والشحن', accountant: 'المحاسب' };
export const roleDescriptions: Record<Role, string> = { owner: 'صورة واضحة عن متجرك، وفريقك تحت إدارة واحدة.', catalog: 'منتجات أقسامك ومخزونها، كل ما تحتاجه لإنجاز عملك.', support: 'معلومات الطلب والعميل، لمتابعة أسرع وأكثر وضوحًا.', fulfillment: 'جهّز الطلبات، حدّث حالتها وأضف بيانات الشحن.', accountant: 'متابعة المبيعات والطلبات بصلاحية الاطلاع.' };
export const statusLabels: Record<string, string> = { new: 'جديد', processing: 'قيد التجهيز', shipped: 'تم الشحن', delivered: 'تم التسليم', cancelled: 'ملغي' };
export const num = (v: number) => v.toLocaleString('ar-YE');
export const money = formatPrice;
export function date(value: string) {
  const d = new Date(value.includes('T') ? value : value.replace(' ', 'T') + 'Z');
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString('ar-YE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Aden' });
}
export function Status({ value }: { value: string }) { return <span className={`admin-badge status-${value}`}>{statusLabels[value] || value}</span>; }
export function Empty({ text = 'لا توجد سجلات حتى الآن', detail = 'ستظهر البيانات هنا عند إضافتها.' }: { text?: string; detail?: string }) { return <div className="admin-empty"><Inbox size={30} strokeWidth={1.4} /><h3>{text}</h3><p>{detail}</p></div>; }
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) { return <label className="admin-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>; }
export function Modal({ title, children, onClose, busy = false, wide = false }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; d?.showModal(); return () => d?.close(); }, []);
  return <dialog ref={ref} className={`admin-dialog ${wide ? 'wide' : ''}`} onCancel={e => { e.preventDefault(); if (!busy) onClose(); }} aria-labelledby="admin-dialog-title"><header><h2 id="admin-dialog-title">{title}</h2><button type="button" className="admin-icon" aria-label="إغلاق" onClick={onClose} disabled={busy}><X size={20} /></button></header>{children}</dialog>;
}
