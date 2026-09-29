/* Contacts : vétérinaire, maréchal-ferrant… appel, SMS et e-mail en un geste (communs à tous les chevaux). */
import { $, esc } from '../core/utils.js';
import * as store from '../core/store.js';
import { CONTACT_ROLES, numericId } from '../core/schema.js';
import { rules, validate, showErrors, clearErrors, formValues } from '../core/validation.js';
import { openSheet, closeSheet, confirmDialog } from '../ui/dialog.js';
import { toast } from '../ui/toast.js';
import { icon } from '../ui/icons.js';
import { serviceIcon } from '../ui/equine-icons.js';

const VET = 'Vétérinaire';
const ROLE_ICON = { 'Pension / écurie': 'Pension', 'Moniteur / coach': 'Concours', Transporteur: 'Transport', Assurance: 'Matériel' };

/** Numéro composable (chiffres et « + » en tête uniquement). */
export const telHref = phone => {
  const n = String(phone || '').replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
  return n.replace(/\D/g, '').length >= 3 ? n : '';
};

/** Affichage lisible : 06 12 34 56 78 / +33 6 12 34 56 78. */
export function formatPhone(phone) {
  const n = telHref(phone);
  if (/^0\d{9}$/.test(n)) return n.replace(/(\d{2})(?=\d)/g, '$1 ');
  if (/^\+33\d{9}$/.test(n)) return `+33 ${n.slice(3, 4)} ${n.slice(4).replace(/(\d{2})(?=\d)/g, '$1 ')}`;
  return String(phone || '').trim();
}

const sorted = list => [...list].sort((a, b) => CONTACT_ROLES.indexOf(a.role) - CONTACT_ROLES.indexOf(b.role) || a.name.localeCompare(b.name, 'fr'));

function actions(c, { big = false } = {}) {
  const tel = telHref(c.phone);
  const size = big ? 20 : 18;
  const btn = big ? 'btn btn--primary' : 'icon-btn icon-btn--accent';
  return [
    tel ? `<a class="${btn}" href="tel:${esc(tel)}" aria-label="Appeler ${esc(c.name)}">${icon('phone', size)}${big ? '<span>Appeler</span>' : ''}</a>` : '',
    tel && !big ? `<a class="icon-btn" href="sms:${esc(tel)}" aria-label="Envoyer un SMS à ${esc(c.name)}">${icon('message', size)}</a>` : '',
    c.email && !big ? `<a class="icon-btn" href="mailto:${esc(c.email)}" aria-label="Écrire à ${esc(c.name)}">${icon('mail', size)}</a>` : ''
  ].join('');
}

function contactCard(c) {
  const phone = formatPhone(c.phone);
  return `<article class="contact card" data-contact="${esc(c.id)}">
    <button type="button" class="contact__main" data-contact-edit aria-label="Modifier ${esc(c.name)}">
      <span class="row__icon" aria-hidden="true">${serviceIcon(ROLE_ICON[c.role] || c.role)}</span>
      <span class="contact__body">
        <span class="contact__role">${esc(c.role)}</span>
        <span class="contact__name">${esc(c.name)}</span>
        ${phone ? `<span class="contact__phone">${esc(phone)}</span>` : ''}
        ${c.note ? `<span class="contact__note">${esc(c.note)}</span>` : ''}
      </span>
    </button>
    <div class="contact__actions">${actions(c)}</div>
  </article>`;
}

export function renderContacts() {
  const list = sorted(store.contacts());
  const vet = list.find(c => c.role === VET && telHref(c.phone));
  $('#contactsUrgent').innerHTML = vet
    ? `<section class="card urgent">
        <span class="urgent__icon" aria-hidden="true">${serviceIcon(VET)}</span>
        <div class="urgent__body"><p class="urgent__kicker">Vétérinaire</p><p class="urgent__name">${esc(vet.name)}</p><p class="urgent__phone">${esc(formatPhone(vet.phone))}</p></div>
        ${actions(vet, { big: true })}
      </section>`
    : `<section class="card urgent urgent--empty">
        <span class="urgent__icon" aria-hidden="true">${serviceIcon(VET)}</span>
        <div class="urgent__body"><p class="urgent__kicker">Vétérinaire</p><p class="urgent__name">Enregistrez votre vétérinaire</p><p class="card__sub">Pour l’appeler en un geste en cas d’urgence.</p></div>
        <button type="button" class="btn btn--soft btn--sm" data-contact-new="${VET}">Ajouter</button>
      </section>`;
  $('#contactsList').innerHTML = list.length
    ? list.map(contactCard).join('')
    : `<div class="empty-state"><p>Aucun contact. Utilisez 🥕 pour ajouter votre vétérinaire, maréchal-ferrant, ostéopathe…</p></div>`;
}

/* ---------- Formulaire ---------- */
export function openContact(id = null, { role } = {}) {
  const c = id !== null ? store.contacts().find(x => String(x.id) === String(id)) : null;
  const f = $('#contactForm');
  f.reset();
  clearErrors(f);
  f.elements.editId.value = c ? c.id : '';
  f.elements.role.value = c?.role || role || VET;
  f.elements.name.value = c?.name || '';
  f.elements.phone.value = c?.phone || '';
  f.elements.email.value = c?.email || '';
  f.elements.note.value = c?.note || '';
  $('#contactTitle').textContent = c ? 'Modifier le contact' : 'Nouveau contact';
  $('#contactDelete').hidden = !c;
  openSheet('contactSheet', { focus: false });
}

const schema = {
  role: [rules.required('Le rôle')],
  name: [rules.required('Le nom'), rules.maxLength(80)],
  phone: [
    v => (v && !/^[+\d\s().\-/]+$/.test(v) ? 'Numéro invalide (chiffres, espaces et + uniquement).' : null),
    v => (v && telHref(v).replace(/\D/g, '').length < 3 ? 'Numéro trop court.' : null),
    (v, all) => (!v && !all.email ? 'Indiquez au moins un téléphone ou un e-mail.' : null)
  ],
  email: [v => (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Adresse e-mail invalide.' : null)],
  note: [rules.maxLength(500)]
};

function onSubmit(e) {
  e.preventDefault();
  const f = e.currentTarget;
  const v = formValues(f);
  const { valid, errors } = validate(v, schema);
  if (!valid) return showErrors(f, errors);
  const list = store.contacts();
  const existing = v.editId !== '' ? list.find(x => String(x.id) === v.editId) : null;
  const item = { id: existing ? existing.id : numericId(list), role: v.role, name: v.name, phone: v.phone, email: v.email, note: v.note };
  if (existing) list[list.indexOf(existing)] = item;
  else list.push(item);
  store.setKeys({ contacts: list });
  closeSheet('contactSheet');
  toast(existing ? 'Contact modifié' : 'Contact ajouté');
}

async function remove() {
  const id = $('#contactForm').elements.editId.value;
  const list = store.contacts();
  const c = list.find(x => String(x.id) === id);
  if (!c) return;
  if (!(await confirmDialog({ title: `Supprimer ${c.name} ?`, message: c.role, confirmLabel: 'Supprimer', danger: true }))) return;
  store.setKeys({ contacts: list.filter(x => x !== c) });
  closeSheet('contactSheet');
  toast('Contact supprimé');
}

export function initContacts() {
  $('#coRole').innerHTML = CONTACT_ROLES.map(r => `<option>${esc(r)}</option>`).join('');
  $('#contactForm').addEventListener('submit', onSubmit);
  $('#contactDelete').addEventListener('click', remove);
  $('#contactsView').addEventListener('click', e => {
    const edit = e.target.closest('[data-contact-edit]');
    if (edit) return openContact(edit.closest('[data-contact]').dataset.contact);
    const add = e.target.closest('[data-contact-new]');
    if (add) openContact(null, { role: add.dataset.contactNew });
  });
}
