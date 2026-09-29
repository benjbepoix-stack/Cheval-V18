/* Pictogrammes équestres (activités et prestataires), repris de la version précédente. */
const svg = paths => `<svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

const RIDE = '<path d="M5 17c2-6 5-9 9-9 2 0 3 1 5 3"/><path d="M9 8 7 4M15 9l2-4M8 17l-2 3M16 17l2 3"/>';
const JUMP = '<path d="M4 18c2-6 5-9 8-9s5 3 8 9"/><path d="M4 18h16M8 13l-2-4M16 13l2-4"/>';

const ACTIVITY = {
  Repos: '<path d="M5 15.5c2.5-3 5.5-3 7 0 1.5-3 4.5-3 7 0"/><path d="M8 18h8"/>',
  'Travail sur le plat': RIDE,
  Dressage: RIDE,
  'Saut d’obstacles': JUMP,
  Trotting: '<path d="M5 17c3-6 6-9 10-9 2 0 3 1 4 3"/><path d="M10 8 8 4M15 8l2-4M8 17l-2 3M16 17l2 3"/>',
  Cavaletti: '<path d="M4 18h16M8 18l4-8 4 8M10 12l-3-3M14 12l3-3"/>',
  Paddock: '<path d="M4 20V8l8-5 8 5v12"/><path d="M8 20v-6h8v6M4 11h16"/>',
  Prés: '<path d="M4 20c4-6 5-10 8-10s4 4 8 10"/><path d="M5 16h14M7 12h10"/>',
  'Saut de puce': JUMP,
  'Balade extérieure': RIDE,
  'Travail à pied': '<circle cx="9" cy="9" r="2"/><path d="M11 10c3 1 5 3 7 6M7 11l-2 5M12 17l-1 3"/>',
  Longe: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/>',
  Renforcement: '<path d="M4 10v4M7 8v8M17 8v8M20 10v4M7 12h10"/>',
  Soin: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.4A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/><path d="M12 9v5M9.5 11.5h5"/>'
};

const SERVICE = {
  Vétérinaire: '<path d="M8 4v6M5 7h6M15 8c2-1 4 0 4 2v2c0 2-2 3-4 3s-4-1-4-3v-2c0-2 2-3 4-2z"/><path d="M9 13v6"/>',
  Vaccination: '<path d="m17 3 4 4M19 5l-9 9M7 13l4 4M5 19l3-3M9 11l4 4"/>',
  'Maréchal-ferrant': '<path d="M7 5c2 1 4 1 5 1s3 0 5-1"/><path d="M7 6c0 7 2 12 5 14 3-2 5-7 5-14"/><path d="M9 12h6"/>',
  'Dentiste équin': '<path d="M8 5c2-2 6-2 8 0 2 3 0 7-1 11-.5 2-2 2-3 0l-1-3-1 3c-1 2-2 2-3 0C6 12 6 8 8 5z"/>',
  Dentiste: '<path d="M8 5c2-2 6-2 8 0 2 3 0 7-1 11-.5 2-2 2-3 0l-1-3-1 3c-1 2-2 2-3 0C6 12 6 8 8 5z"/>',
  Ostéopathe: '<path d="M7 18c2-5 3-10 5-12 2 2 4 7 5 12"/><path d="M9 8c-2 2-3 4-3 7M15 8c2 2 3 4 3 7"/>',
  Masseuse: '<circle cx="8" cy="7" r="2"/><circle cx="16" cy="7" r="2"/><path d="M8 12c2 3 6 3 8 0M7 16c3 2 7 2 10 0"/>',
  Sellier: '<path d="M5 17c1-5 4-8 7-8s6 3 7 8"/><path d="M8 17v3M16 17v3M6 14h12"/>',
  Alimentation: '<path d="M6 18c5-1 9-5 11-11-6 2-10 6-11 11z"/><path d="M6 18c3-3 5-5 8-7"/>',
  Pension: '<path d="M4 11 12 4l8 7"/><path d="M6 10v9h12v-9M10 19v-5h4v5"/>',
  Matériel: '<path d="M5 12c2-4 5-6 7-6s5 2 7 6c-2 3-5 4-7 4s-5-1-7-4z"/>',
  Concours: '<path d="M6 20V4h11l-2 4 2 4H6"/><path d="M9 20h6"/>',
  Transport: '<path d="M5 17h14l-1-7H6z"/><circle cx="8" cy="17" r="2"/><circle cx="16" cy="17" r="2"/>'
};

export function activityIcon(name) {
  let p = ACTIVITY[name];
  if (!p) {
    const t = String(name).toLowerCase();
    p = t.includes('saut') || t.includes('cavaletti') ? JUMP : t.includes('repos') ? ACTIVITY.Repos : RIDE;
  }
  return svg(p);
}

export const serviceIcon = name => svg(SERVICE[name] || '<circle cx="12" cy="12" r="7"/><path d="M12 8v8M8 12h8"/>');
