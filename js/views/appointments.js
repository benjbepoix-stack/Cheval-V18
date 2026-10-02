/* Rendez-vous : liste, formulaire, historique, export calendrier. */
import { $, esc } from '../core/utils.js';
import { formatKey, todayKey, isTime, addMonthsKey, addDays, dateKey } from '../core/dates.js';
import * as store from '../core/store.js';
import { APPOINTMENT_TYPES, REPEAT_MONTHS, numericId } from '../core/schema.js';
import { rules, validate, showErrors, clearErrors, formValues } from '../core/validation.js';
import { openSheet, closeSheet, confirmDialog } from '../ui/dialog.js';
import { toast, toastError } from '../ui/toast.js';
import { icon } from '../ui/icons.js';
import { serviceIcon } from '../ui/equine-icons.js';
import { offerCalendar } from '../features/calendar-prompt.js';
import { buildICS, openInCalendar, shareICS, isIOS } from '../features/ics.js';
import { daysFromToday, toCalendarEvent, horseName } from './common.js';

const sortKey = a => `${a.date}T${a.time || '23:59'}`;
export const upcoming = () => store.field('appointments').filter(a => a.date >= todayKey()).sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
export const past = () => store.field('appointments').filter(a => a.date < todayKey()).sort((a, b) => sortKey(b).localeCompare(sortKey(a)));

export function countdownLabel(date) {
  const d = daysFromToday(date);
  if (d === 0) return 'Aujourd’hui';
  if (d === 1) return 'Demain';
  if (d > 1) return `Dans ${d} jours`;
  return formatKey(date, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function appointmentRow(a, { isPast = false } = {}) {
  const meta = [formatKey(a.date, { weekday: 'short', day: 'numeric', month: 'short' }), a.time, a.place].filter(Boolean).map(esc).join(' · ');
  return `<div class="row" data-appointment="${esc(a.id)}">
    <span class="row__icon ${isPast ? 'is-muted' : ''}">${serviceIcon(a.type)}</span>
    <div class="row__body"><div class="row__title">${esc(a.type)}${a.name ? ` <span class="row__soft">· ${esc(a.name)}</span>` : ''}</div><div class="row__sub">${meta}</div>${isPast ? '' : `<div class="row__tags"><span class="badge">${esc(countdownLabel(a.date))}</span></div>`}</div>
    <div class="row-actions">
      ${isPast ? '' : `<button type="button" class="icon-btn icon-btn--sm" data-ap-action="calendar" aria-label="Ajouter au calendrier">${icon('calendarPlus', 17)}</button>`}
      <button type="button" class="icon-btn icon-btn--sm" data-ap-action="edit" aria-label="Modifier">${icon('edit', 17)}</button>
    </div>
  </div>`;
}

export function renderPastSheet() {
  const list = past();
  $('#pastAll').innerHTML = list.length ? `<div class="card card--list">${list.map(a => appointmentRow(a, { isPast: true })).join('')}</div>` : '<div class="empty-state"><p>Aucun rendez-vous passé.</p></div>';
}

/* ---------- Formulaire ---------- */
export function openAppointment(id = null, { date, type, repeatMonths } = {}) {
  if (!store.activeId()) return toastError('Ajoutez d’abord un cheval.');
  const a = id !== null ? store.field('appointments').find(x => String(x.id) === String(id)) : null;
  const f = $('#appointmentForm');
  f.reset();
  clearErrors(f);
  f.elements.editId.value = a ? a.id : '';
  f.elements.type.value = a?.type || type || APPOINTMENT_TYPES[0];
  f.elements.name.value = a?.name || '';
  f.elements.date.value = a?.date || date || todayKey();
  f.elements.time.value = a?.time || '14:00';
  f.elements.place.value = a?.place || '';
  f.elements.note.value = a?.note || '';
  f.elements.repeatMonths.value = String(a?.repeatMonths ?? repeatMonths ?? 0);
  $('#appointmentTitle').textContent = a ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous';
  $('#appointmentDelete').hidden = !a;
  openSheet('appointmentSheet', { focus: false });
}

const schema = {
  type: [rules.required('Le type')],
  name: [rules.maxLength(120)],
  date: [rules.date({ required: true })],
  time: [rules.time()],
  place: [rules.maxLength(120)],
  note: [rules.maxLength(1000)]
};

function onSubmit(e) {
  e.preventDefault();
  const f = e.currentTarget;
  const v = formValues(f);
  const { valid, errors } = validate(v, schema);
  if (!valid) return showErrors(f, errors);
  const list = store.field('appointments');
  const existing = v.editId !== '' ? list.find(x => String(x.id) === v.editId) : null;
  const item = {
    ...(existing || {}),
    id: existing ? existing.id : numericId(list),
    type: v.type,
    name: v.name,
    date: v.date,
    time: isTime(v.time) ? v.time : '',
    place: v.place,
    note: v.note,
    repeatMonths: REPEAT_MONTHS[Number(v.repeatMonths)] ? Number(v.repeatMonths) : 0
  };
  if (existing) list[list.indexOf(existing)] = item;
  else list.push(item);
  store.setField('appointments', list);
  closeSheet('appointmentSheet');
  if (item.date >= todayKey()) offerCalendar(toCalendarEvent(item), { heading: existing ? 'Rendez-vous modifié' : 'Rendez-vous enregistré' });
  else toast(existing ? 'Rendez-vous modifié' : 'Rendez-vous ajouté');
}

/** Exporte tous les rendez-vous à venir dans un seul fichier .ics (Outlook, Google Agenda, Calendrier). */
export async function exportUpcoming() {
  const list = upcoming();
  if (!list.length) return toast('Aucun rendez-vous à venir à exporter.', { type: 'info' });
  const ics = buildICS(list.map(toCalendarEvent));
  const name = `rendez-vous-${horseName()}`;
  // iPhone : feuille de partage pour choisir Outlook, Calendrier, Mail…
  if (isIOS()) {
    try {
      if (await shareICS(ics, name)) return;
    } catch (error) {
      if (error?.name === 'AbortError') return;
    }
  }
  const mode = openInCalendar(ics, name);
  if (mode === 'download') toast(`${list.length} rendez-vous exportés. Dans Outlook : Ajouter un calendrier → Charger à partir d’un fichier.`, { type: 'info', duration: 6000 });
}

const REMINDER_HORIZON_DAYS = 30;

/**
 * Rappels dus ou proches (horizon : 30 jours) pour les types de rendez-vous
 * ayant un rappel actif : pour chaque type, on part de son rendez-vous le
 * plus récent et on calcule l'échéance = sa date + l'intervalle de rappel.
 * Ignoré si un rendez-vous de ce type est déjà planifié à partir de cette
 * échéance (déjà pris en compte), ou si l'échéance est encore lointaine.
 */
export function dueReminders() {
  const list = store.field('appointments');
  const horizon = dateKey(addDays(new Date(), REMINDER_HORIZON_DAYS));
  const latestByType = new Map();
  list.forEach(a => {
    if (!a.repeatMonths) return;
    const cur = latestByType.get(a.type);
    if (!cur || a.date > cur.date) latestByType.set(a.type, a);
  });
  return [...latestByType.values()]
    .map(a => ({ ...a, dueDate: addMonthsKey(a.date, a.repeatMonths) }))
    .filter(r => r.dueDate <= horizon && !list.some(x => x.type === r.type && x.id !== r.id && x.date >= r.dueDate))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

async function remove(id) {
  const list = store.field('appointments');
  const a = list.find(x => String(x.id) === String(id));
  if (!a) return;
  if (!(await confirmDialog({ title: 'Supprimer ce rendez-vous ?', message: `${a.type}${a.name ? ` · ${a.name}` : ''} — ${formatKey(a.date)}`, confirmLabel: 'Supprimer', danger: true }))) return;
  store.setField('appointments', list.filter(x => x !== a));
  closeSheet('appointmentSheet');
  toast('Rendez-vous supprimé');
}

export function initAppointments() {
  $('#apType').innerHTML = APPOINTMENT_TYPES.map(t => `<option>${esc(t)}</option>`).join('');
  $('#apRepeat').innerHTML = Object.entries(REPEAT_MONTHS).map(([v, label]) => `<option value="${v}">${esc(label)}</option>`).join('');
  $('#appointmentForm').addEventListener('submit', onSubmit);
  $('#appointmentDelete').addEventListener('click', () => remove($('#appointmentForm').elements.editId.value));
  document.addEventListener('click', e => {
    const due = e.target.closest('[data-due-action="plan"]');
    if (due) {
      const row = due.closest('[data-due-type]');
      openAppointment(null, { type: row.dataset.dueType, date: row.dataset.dueDate, repeatMonths: Number(row.dataset.dueRepeat) });
      return;
    }
    const row = e.target.closest('[data-appointment]');
    if (!row) return;
    // Un clic sur le texte ouvre la modification (la suppression se fait depuis le formulaire).
    const btn = e.target.closest('[data-ap-action]') || (e.target.closest('.row__body') ? { dataset: { apAction: 'edit' } } : null);
    if (!btn) return;
    const id = row.dataset.appointment;
    const a = store.field('appointments').find(x => String(x.id) === id);
    if (!a) return;
    if (btn.dataset.apAction === 'edit') {
      closeSheet('pastSheet');
      openAppointment(id);
    } else if (btn.dataset.apAction === 'calendar') offerCalendar(toCalendarEvent(a), { heading: 'Ajouter au calendrier ?' });
  });
}
