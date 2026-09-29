/* Utilitaires d'affichage partagés. */
import { fromKey, todayKey } from '../core/dates.js';
import { parseNumber } from '../core/utils.js';
import * as store from '../core/store.js';

const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const eurRound = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
// Montants ronds sans décimales (180 €), sinon deux décimales (75,50 €).
export const euro = v => {
  const n = Number(v) || 0;
  return Number.isInteger(n) ? eurRound.format(n) : eur.format(n);
};
export const euroRound = v => eurRound.format(Math.round(Number(v) || 0));

/** Saisie « 12,5 » -> 12.5 (2 décimales max), sinon null. */
export function toAmount(v) {
  const n = parseNumber(v);
  return n === null ? null : Math.round(n * 100) / 100;
}
export const amountInput = n => (n ? String(n).replace('.', ',') : '');

export const refundOf = x => Math.max(0, Math.min(Number(x.amount) || 0, Number(x.refundAmount) || 0));
export const netExpense = x => Math.max(0, (Number(x.amount) || 0) - refundOf(x));

export function ageFromBirth(birth) {
  const b = fromKey(birth);
  if (!b) return '';
  const n = new Date();
  let age = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) age--;
  return age >= 0 ? `${age} an${age > 1 ? 's' : ''}` : '';
}

/** Nombre de jours entre aujourd'hui et une date (négatif = passé). */
export function daysFromToday(key) {
  const d = fromKey(key);
  const t = fromKey(todayKey());
  return d && t ? Math.round((d - t) / 86400000) : 0;
}

export const horseName = () => store.field('profile').name || store.activeHorse()?.name || 'Aucun cheval';

export const capitalize = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Rendez-vous -> événement iCalendar. */
export const toCalendarEvent = a => ({
  id: `equin-${store.activeId()}-${a.id}`,
  title: `🐴 ${a.type}${a.name ? ` · ${a.name}` : ''} — ${horseName()}`,
  date: a.date,
  time: a.time,
  location: a.place,
  description: a.note,
  alarmMinutes: a.time ? 60 : 0
});
