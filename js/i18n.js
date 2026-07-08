// Tiny i18n layer for the wife view. All Urdu here in one place so it's easy to
// proofread/edit. Urdu (اردو) is right-to-left — setDir() mirrors the whole view.
const DICT = {
  brand:            { en: '☾ Ayyub’s Day',        ur: '☾ ایوب کا دن' },
  topbar_title:     { en: 'His day, for you',      ur: 'اُن کا دن، آپ کے لیے' },
  login_sub:        { en: 'A little window into his day.', ur: 'اُن کے دن میں ایک جھروکا۔' },
  login_email:      { en: 'Email',                 ur: 'ای میل' },
  login_password:   { en: 'Password',              ur: 'پاس ورڈ' },
  signin:           { en: 'Sign in',               ur: 'سائن اِن' },
  create:           { en: 'Create account',        ur: 'اکاؤنٹ بنائیں' },
  demo_banner:      { en: 'Demo — showing the schedule saved on this device.', ur: 'ڈیمو — اِس ڈیوائس پر محفوظ شیڈول دکھایا جا رہا ہے۔' },

  status_working:   { en: 'At work right now',      ur: 'اِس وقت کام پر ہیں' },
  status_home:      { en: 'At home',                ur: 'گھر پر ہیں' },
  status_away:      { en: 'Away collecting — back by {x}', ur: 'سامان لینے گئے ہیں — {x} تک واپسی' },

  summary_barber:   { en: 'Barbering at Menspire {start}–{end}', ur: 'مِنسپائر پر بال کاٹنا {start}–{end}' },
  summary_off:      { en: 'A day off',              ur: 'چھٹی کا دن' },
  summary_friday:   { en: 'Off + Jumuʿah',          ur: 'چھٹی + جمعہ' },
  summary_trip:     { en: 'Away on a collection trip', ur: 'سامان لینے کے سفر پر' },

  sec_together:     { en: 'Time together',          ur: 'ایک ساتھ وقت' },
  together_today:   { en: 'Today, just the two of you', ur: 'آج، صرف آپ دونوں' },
  together_soon:    { en: 'being arranged',         ur: 'طے کیا جا رہا ہے' },
  datenight_label:  { en: 'This week’s date night', ur: 'اِس ہفتے کی ڈنر ڈیٹ' },
  datenight_booked: { en: 'Booked',                 ur: 'طے شدہ' },
  datenight_no:     { en: 'Not yet',                ur: 'ابھی نہیں' },

  sec_prayers:      { en: 'Today’s prayers',        ur: 'آج کی نمازیں' },
  sec_glance:       { en: 'His day at a glance',    ur: 'اُن کے دن کی جھلک' },

  empty_title:      { en: 'Nothing yet today',      ur: 'آج ابھی کچھ نہیں' },
  empty_body:       { en: 'Once Ayyub opens his planner today, his schedule appears here.', ur: 'جب ایوب آج اپنا پلانر کھولیں گے تو اُن کا شیڈول یہاں خودبخود آ جائے گا۔' },
  link_title:       { en: 'Almost there',           ur: 'بس تھوڑا سا باقی' },
  link_body:        { en: 'Ask Ayyub to link you. Show him this ID:', ur: 'ایوب سے کہیں کہ آپ کو لنک کریں۔ اُنہیں یہ آئی ڈی دکھائیں:' },
  link_hint:        { en: 'He pastes it into Settings → Link your wife. Then his day appears here automatically.', ur: 'وہ اسے سیٹنگز → اپنی اہلیہ کو لنک کریں، میں پیسٹ کریں گے۔ پھر اُن کا دن یہاں خودبخود نظر آئے گا۔' },

  // day-at-a-glance kinds
  k_shift:          { en: 'Menspire — barbering',   ur: 'مِنسپائر — بال کاٹنا' },
  k_wife:           { en: 'Time with you',          ur: 'آپ کے ساتھ وقت' },
  k_jumuah:         { en: 'Jumuʿah',                ur: 'جمعہ' },
  k_trip:           { en: 'On the road — collections', ur: 'سفر پر — سامان کی وصولی' },
};

const PRAYERS = {
  Fajr: { en: 'Fajr', ur: 'فجر' }, Dhuhr: { en: 'Dhuhr', ur: 'ظہر' },
  Asr: { en: 'Asr', ur: 'عصر' }, Maghrib: { en: 'Maghrib', ur: 'مغرب' }, Isha: { en: 'Isha', ur: 'عشاء' },
};

let lang = localStorage.getItem('ayyub:lang') || 'ur';

export const getLang = () => lang;
export function setLang(l) { lang = l; localStorage.setItem('ayyub:lang', l); applyDir(); }
export function toggleLang() { setLang(lang === 'ur' ? 'en' : 'ur'); }
export const otherLangLabel = () => (lang === 'ur' ? 'EN' : 'اردو');

export function t(key, vars) {
  let s = (DICT[key] && DICT[key][lang]) || (DICT[key] && DICT[key].en) || key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}
export const prayerName = (en) => (PRAYERS[en] ? PRAYERS[en][lang] : en);

export function applyDir() {
  const rtl = lang === 'ur';
  document.documentElement.dir = rtl ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
}
