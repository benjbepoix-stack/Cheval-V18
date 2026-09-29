/* Rendez-vous : liste, formulaire, historique, export calendrier. */
import { $, esc } from '../core/utils.js';
import { formatKey, todayKey, isTime } from '../core/dates.js';
import * as store from '../core/store.js';
import { APPOINTMENT_TYPES, numericId } from '../core/schema.js';
import { rules, validate, showErrors, clearErrors, formValues } from '../core/validation.js';
import { openSheet, closeSheet, confirmDialog } from '../ui/dialog.js';
import { toast, toastError } from '../ui/toast.js';
import { icon } from '../ui/icons.js';
import { serviceIcon } from '../ui/equine-icons.js';
import { offerCalendar } from '../features/calendar-prompt.js';
import { daysFromToday, toCalendarEvent } from './common.js';

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
export function openAppointment(id = null) {
  if (!store.activeId()) return toastError('Ajoutez d’abord un cheval.');
  const a = id !== null ? store.field('appointments').find(x => String(x.id) === String(id)) : null;
  const f = $('#appointmentForm');
  f.reset();
  clearErrors(f);
  f.elements.editId.value = a ? a.id : '';
  f.elements.type.value = a?.type || APPOINTMENT_TYPES[0];
  f.elements.name.value = a?.name || '';
  f.elements.date.value = a?.date || todayKey();
  f.elements.time.value = a?.time || '14:00';
  f.elements.place.value = a?.place || '';
  f.elements.note.value = a?.note || '';
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
  const item = { ...(existing || {}), id: existing ? existing.id : numericId(list), type: v.type, name: v.name, date: v.date, time: isTime(v.time) ? v.time : '', place: v.place, note: v.note };
  if (existing) list[list.indexOf(existing)] = item;
  else list.push(item);
  store.setField('appointments', list);
  closeSheet('appointmentSheet');
  if (item.date >= todayKey()) offerCalendar(toCalendarEvent(item), { heading: existing ? 'Rendez-vous modifié' : 'Rendez-vous enregistré' });
  else toast(existing ? 'Rendez-vous modifié' : 'Rendez-vous ajouté');
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
  $('#appointmentForm').addEventListener('submit', onSubmit);
  $('#appointmentDelete').addEventListener('click', () => remove($('#appointmentForm').elements.editId.value));
  document.addEventListener('click', e => {
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
