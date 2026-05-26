// ===== SmartBill Help Assistant (multilingual: en / ta / hi) =====
// A free, offline, chat-style guide for new shop owners. No API key, no cost.
import { getLang } from '../utils/i18n.js';

function L() { return getLang() || 'en'; }
const pick = (obj) => obj[L()] || obj.en;

// ── UI strings ────────────────────────────────────────────────────────────────
const UI = {
  title:   { en: 'SmartBill Helper', ta: 'ஸ்மார்ட்பில் உதவியாளர்', hi: 'स्मार्टबिल सहायक' },
  subtitle:{ en: 'Ask me how to use the app', ta: 'பயன்படுத்துவது எப்படி எனக் கேளுங்கள்', hi: 'ऐप उपयोग करना पूछें' },
  placeholder: { en: 'Type your question…', ta: 'உங்கள் கேள்வியை தட்டச்சு செய்யவும்…', hi: 'अपना प्रश्न लिखें…' },
  send:    { en: 'Send', ta: 'அனுப்பு', hi: 'भेजें' },
  fallback:{
    en: `I'm not sure about that yet 🤔. Try a question below, or ask about: <b>products, billing, GST, barcode, import, customers, reports, inventory, users, settings</b>.`,
    ta: `அதைப் பற்றி எனக்குத் தெரியவில்லை 🤔. கீழே உள்ள கேள்வியை முயற்சிக்கவும், அல்லது இவற்றைப் பற்றிக் கேளுங்கள்: <b>தயாரிப்புகள், பில்லிங், GST, பார்கோட், இறக்குமதி, வாடிக்கையாளர்கள், அறிக்கைகள், சரக்கு, பயனர்கள், அமைப்புகள்</b>.`,
    hi: `मुझे इसके बारे में अभी पता नहीं 🤔. नीचे दिया प्रश्न आज़माएं, या इनके बारे में पूछें: <b>उत्पाद, बिलिंग, GST, बारकोड, आयात, ग्राहक, रिपोर्ट, इन्वेंटरी, उपयोगकर्ता, सेटिंग्स</b>.`,
  },
  welcome: {
    en: '👋 Welcome to <b>SmartBill</b>! I\'ll help you set up your shop.',
    ta: '👋 <b>ஸ்மார்ட்பில்</b>-க்கு வரவேற்கிறோம்! உங்கள் கடையை அமைக்க உதவுகிறேன்.',
    hi: '👋 <b>स्मार्टबिल</b> में आपका स्वागत है! मैं आपकी दुकान सेट करने में मदद करूंगा।',
  },
  gettingStarted: { en: 'Getting started:', ta: 'தொடங்குவது:', hi: 'शुरुआत करें:' },
  tapBelow: { en: 'Tap a question below or type your own.', ta: 'கீழே ஒரு கேள்வியைத் தட்டவும் அல்லது உங்கள் சொந்தக் கேள்வியைத் தட்டச்சு செய்யவும்.', hi: 'नीचे प्रश्न पर टैप करें या अपना लिखें।' },
};

const CHECKLIST = {
  en: ['Set your shop name in Settings', 'Add products (or Import CSV)', 'Make a test bill in Billing', 'Add a customer', 'Create staff accounts in Settings'],
  ta: ['அமைப்புகளில் கடை பெயரை அமைக்கவும்', 'தயாரிப்புகளைச் சேர்க்கவும் (அல்லது CSV இறக்குமதி)', 'பில்லிங்கில் ஒரு சோதனை பில் செய்யவும்', 'வாடிக்கையாளரைச் சேர்க்கவும்', 'அமைப்புகளில் பணியாளர் கணக்குகளை உருவாக்கவும்'],
  hi: ['सेटिंग्स में दुकान का नाम सेट करें', 'उत्पाद जोड़ें (या CSV आयात करें)', 'बिलिंग में टेस्ट बिल बनाएं', 'एक ग्राहक जोड़ें', 'सेटिंग्स में स्टाफ खाते बनाएं'],
};

// ── Knowledge base ────────────────────────────────────────────────────────────
// Each entry: id, k = keywords (en + ta + hi terms), a = answer per language.
const KB = [
  { id: 'add_product',
    k: ['add product','new product','create product','add item','தயாரிப்பு சேர்','புதிய தயாரிப்பு','उत्पाद जोड़','नया उत्पाद','samaan'],
    a: {
      en: `<b>Add a product:</b> Go to <b>Products</b> → <b>+ Add Product</b>. Enter name, price, stock (and optionally barcode, cost, GST), then Save.`,
      ta: `<b>தயாரிப்பு சேர்க்க:</b> <b>தயாரிப்புகள்</b> → <b>+ தயாரிப்பு சேர்</b>. பெயர், விலை, சரக்கு (மற்றும் விருப்பப்படி பார்கோட், செலவு, GST) உள்ளிட்டு சேமிக்கவும்.`,
      hi: `<b>उत्पाद जोड़ें:</b> <b>उत्पाद</b> → <b>+ उत्पाद जोड़ें</b>। नाम, मूल्य, स्टॉक (और वैकल्पिक रूप से बारकोड, लागत, GST) भरें, फिर सहेजें।`,
    }},
  { id: 'billing',
    k: ['bill','billing','sell','sale','pos','checkout','பில்','விற்பனை','பில்லிங்','बिल','बिक्री','बिलिंग','बेचना'],
    a: {
      en: `<b>Make a bill:</b> Open <b>Billing / POS</b>, click a product (or scan), set quantity, choose payment, then <b>Checkout & Generate Bill</b>. You can download/print/WhatsApp it.`,
      ta: `<b>பில் செய்ய:</b> <b>பில்லிங் / POS</b> திறந்து, தயாரிப்பைக் கிளிக் செய்யவும் (அல்லது ஸ்கேன்), அளவு அமைத்து, கட்டணத்தைத் தேர்ந்து, <b>செலுத்து & பில் உருவாக்கு</b>. PDF/அச்சு/வாட்ஸ்அப் செய்யலாம்.`,
      hi: `<b>बिल बनाएं:</b> <b>बिलिंग / POS</b> खोलें, उत्पाद पर क्लिक करें (या स्कैन), मात्रा सेट करें, भुगतान चुनें, फिर <b>चेकआउट और बिल बनाएं</b>। PDF/प्रिंट/व्हाट्सएप कर सकते हैं।`,
    }},
  { id: 'gst',
    k: ['gst','tax','vat','வரி','कर'],
    a: {
      en: `<b>GST:</b> In the cart there's a <b>GST</b> checkbox to turn tax on/off. Leave the % blank to use each product's rate, or type one rate for the whole bill.`,
      ta: `<b>GST:</b> வண்டியில் வரியை இயக்க/அணைக்க <b>GST</b> தேர்வுப்பெட்டி உள்ளது. ஒவ்வொரு தயாரிப்பின் விகிதத்தைப் பயன்படுத்த % காலியாக விடவும், அல்லது முழு பில்லுக்கும் ஒரு விகிதத்தைத் தட்டச்சு செய்யவும்.`,
      hi: `<b>GST:</b> कार्ट में कर चालू/बंद करने के लिए <b>GST</b> चेकबॉक्स है। हर उत्पाद की दर के लिए % खाली छोड़ें, या पूरे बिल के लिए एक दर टाइप करें।`,
    }},
  { id: 'barcode',
    k: ['barcode','scan','qr','scanner','camera','பார்கோட்','ஸ்கேன்','கேமரா','बारकोड','स्कैन','कैमरा'],
    a: {
      en: `<b>Barcode & scan:</b> Add a barcode when editing a product. In Billing click <b>Scan QR</b>. In Products → <b>Scan to Deduct</b>, show items to the camera to reduce stock automatically.`,
      ta: `<b>பார்கோட் & ஸ்கேன்:</b> தயாரிப்பைத் திருத்தும்போது பார்கோட் சேர்க்கவும். பில்லிங்கில் <b>QR ஸ்கேன்</b>. தயாரிப்புகள் → <b>ஸ்கேன் செய்து குறை</b>, கேமராவில் காட்டினால் சரக்கு தானாகக் குறையும்.`,
      hi: `<b>बारकोड और स्कैन:</b> उत्पाद संपादित करते समय बारकोड जोड़ें। बिलिंग में <b>QR स्कैन</b>। उत्पाद → <b>स्कैन कर घटाएं</b>, कैमरे को दिखाएं तो स्टॉक अपने-आप घटेगा।`,
    }},
  { id: 'import',
    k: ['import','csv','upload','bulk','இறக்குமதி','आयात','अपलोड'],
    a: {
      en: `<b>Import (CSV):</b> Products → <b>Import CSV</b>. Tip: Export CSV first to get the format, edit in Excel, then import. Existing items update; new ones are added.`,
      ta: `<b>இறக்குமதி (CSV):</b> தயாரிப்புகள் → <b>CSV இறக்குமதி</b>. முதலில் ஏற்றுமதி செய்து வடிவத்தைப் பெறவும், Excel-ல் திருத்தி இறக்குமதி செய்யவும். உள்ளவை புதுப்பிக்கப்படும்; புதியவை சேர்க்கப்படும்.`,
      hi: `<b>आयात (CSV):</b> उत्पाद → <b>CSV आयात</b>। सुझाव: पहले Export करें, Excel में संपादित करें, फिर आयात करें। मौजूदा अपडेट होंगे; नए जुड़ेंगे।`,
    }},
  { id: 'deduct',
    k: ['deduct','reduce stock','scan to deduct','auto deduct','குறை','கழி','घटाएं','स्टॉक कम'],
    a: {
      en: `<b>Scan to Deduct:</b> Products → <b>Scan to Deduct</b>. The camera stays open; show each barcode to remove 1 unit automatically. Click Done when finished.`,
      ta: `<b>ஸ்கேன் செய்து குறை:</b> தயாரிப்புகள் → <b>ஸ்கேன் செய்து குறை</b>. கேமரா திறந்திருக்கும்; ஒவ்வொரு பார்கோட்டையும் காட்டினால் 1 அலகு குறையும். முடிந்ததும் Done.`,
      hi: `<b>स्कैन कर घटाएं:</b> उत्पाद → <b>स्कैन कर घटाएं</b>। कैमरा खुला रहता है; हर बारकोड दिखाएं तो 1 इकाई घटेगी। समाप्त होने पर Done दबाएं।`,
    }},
  { id: 'customers',
    k: ['customer','loyalty','points','phone','வாடிக்கையாளர்','புள்ளி','ग्राहक','पॉइंट'],
    a: {
      en: `<b>Customers:</b> Add them in <b>Customers</b> or during billing (👤). They earn 1 loyalty point per ₹10 spent automatically.`,
      ta: `<b>வாடிக்கையாளர்கள்:</b> <b>வாடிக்கையாளர்கள்</b> பக்கத்தில் அல்லது பில்லிங்கின்போது (👤) சேர்க்கவும். ₹10-க்கு 1 புள்ளி தானாகக் கிடைக்கும்.`,
      hi: `<b>ग्राहक:</b> <b>ग्राहक</b> पेज पर या बिलिंग के दौरान (👤) जोड़ें। हर ₹10 खर्च पर 1 लॉयल्टी पॉइंट अपने-आप मिलता है।`,
    }},
  { id: 'reports',
    k: ['report','analytics','profit','அறிக்கை','லாபம்','रिपोर्ट','लाभ'],
    a: {
      en: `<b>Reports:</b> The <b>Reports</b> page shows sales, profit, top products and trends.`,
      ta: `<b>அறிக்கைகள்:</b> <b>அறிக்கைகள்</b> பக்கம் விற்பனை, லாபம், சிறந்த தயாரிப்புகள் மற்றும் போக்குகளைக் காட்டும்.`,
      hi: `<b>रिपोर्ट:</b> <b>रिपोर्ट</b> पेज बिक्री, लाभ, शीर्ष उत्पाद और प्रवृत्तियां दिखाता है।`,
    }},
  { id: 'inventory',
    k: ['inventory','low stock','out of stock','reorder','சரக்கு','குறைவான','इन्वेंटरी','कम स्टॉक'],
    a: {
      en: `<b>Inventory:</b> The <b>Inventory</b> page shows stock levels and flags Low/Out of Stock items based on each product's alert threshold.`,
      ta: `<b>சரக்கு:</b> <b>சரக்கு</b> பக்கம் சரக்கு அளவுகளைக் காட்டி, எச்சரிக்கை வரம்பின் அடிப்படையில் குறைவு/தீர்ந்த பொருட்களைக் குறிக்கும்.`,
      hi: `<b>इन्वेंटरी:</b> <b>इन्वेंटरी</b> पेज स्टॉक स्तर दिखाता है और अलर्ट सीमा के आधार पर कम/खत्म वस्तुओं को चिह्नित करता है।`,
    }},
  { id: 'users',
    k: ['user','staff','employee','owner','role','permission','பயனர்','பணியாளர்','उपयोगकर्ता','स्टाफ','भूमिका'],
    a: {
      en: `<b>Users & roles:</b> Only Admin manages users (Settings). Admin = full; Owner = stock/money/reports; Employee = billing & customers only.`,
      ta: `<b>பயனர்கள் & பாத்திரங்கள்:</b> நிர்வாகி மட்டுமே பயனர்களை நிர்வகிப்பார் (அமைப்புகள்). நிர்வாகி = முழு; உரிமையாளர் = சரக்கு/பணம்/அறிக்கைகள்; பணியாளர் = பில்லிங் & வாடிக்கையாளர்கள் மட்டும்.`,
      hi: `<b>उपयोगकर्ता और भूमिकाएं:</b> केवल व्यवस्थापक उपयोगकर्ता प्रबंधित करता है (सेटिंग्स)। व्यवस्थापक = पूर्ण; मालिक = स्टॉक/पैसा/रिपोर्ट; कर्मचारी = केवल बिलिंग और ग्राहक।`,
    }},
  { id: 'password',
    k: ['password','forgot','reset','login','sign in','கடவுச்சொல்','உள்நுழை','पासवर्ड','लॉगिन','भूल'],
    a: {
      en: `<b>Login & password:</b> Use <b>Forgot Password</b> on the login page and answer your security question. The first account created is the Admin.`,
      ta: `<b>உள்நுழைவு & கடவுச்சொல்:</b> உள்நுழைவு பக்கத்தில் <b>கடவுச்சொல் மறந்துவிட்டதா</b> பயன்படுத்தி பாதுகாப்புக் கேள்விக்குப் பதிலளிக்கவும். முதல் கணக்கு நிர்வாகி.`,
      hi: `<b>लॉगिन और पासवर्ड:</b> लॉगिन पेज पर <b>पासवर्ड भूल गए</b> का उपयोग करें और सुरक्षा प्रश्न का उत्तर दें। पहला खाता व्यवस्थापक होता है।`,
    }},
  { id: 'settings',
    k: ['setting','shop name','currency','configure','அமைப்பு','கடை பெயர்','सेटिंग','दुकान का नाम','मुद्रा'],
    a: {
      en: `<b>Settings:</b> Set your shop name, currency, GST defaults and manage users. The shop name appears on bills and the login screen.`,
      ta: `<b>அமைப்புகள்:</b> கடை பெயர், நாணயம், GST இயல்புநிலை அமைத்து பயனர்களை நிர்வகிக்கவும். கடை பெயர் பில்கள் மற்றும் உள்நுழைவுத் திரையில் தோன்றும்.`,
      hi: `<b>सेटिंग्स:</b> दुकान का नाम, मुद्रा, GST डिफ़ॉल्ट सेट करें और उपयोगकर्ता प्रबंधित करें। दुकान का नाम बिल और लॉगिन स्क्रीन पर दिखता है।`,
    }},
  { id: 'slow',
    k: ['slow','loading','wait','cold start','taking time','மெதுவாக','ஏற்றுகிறது','धीमा','लोड','इंतजार'],
    a: {
      en: `<b>First load slow?</b> The server "sleeps" when unused and takes a few seconds to wake on the first visit. After that it's fast — normal behaviour.`,
      ta: `<b>முதல் ஏற்றம் மெதுவா?</b> பயன்படுத்தாதபோது சர்வர் "தூங்கும்", முதல் வருகையில் எழ சில வினாடிகள் ஆகும். பின்னர் வேகமாக இருக்கும் — இது இயல்பானது.`,
      hi: `<b>पहली लोडिंग धीमी?</b> उपयोग न होने पर सर्वर "सो जाता है" और पहली बार जागने में कुछ सेकंड लगते हैं। उसके बाद तेज़ — यह सामान्य है।`,
    }},
];

const SUGGESTIONS = {
  en: [['How do I add a product?','add_product'],['How do I make a bill?','billing'],['How does GST work?','gst'],['How do I import products?','import'],['How do I add staff?','users']],
  ta: [['தயாரிப்பை எப்படி சேர்ப்பது?','add_product'],['பில் எப்படி செய்வது?','billing'],['GST எப்படி வேலை செய்யும்?','gst'],['தயாரிப்புகளை எப்படி இறக்குமதி செய்வது?','import'],['பணியாளரை எப்படி சேர்ப்பது?','users']],
  hi: [['उत्पाद कैसे जोड़ें?','add_product'],['बिल कैसे बनाएं?','billing'],['GST कैसे काम करता है?','gst'],['उत्पाद कैसे आयात करें?','import'],['स्टाफ कैसे जोड़ें?','users']],
};

function answerByText(text) {
  const q = (text || '').toLowerCase();
  let best = null, score = 0;
  for (const e of KB) {
    let s = 0;
    for (const kw of e.k) if (q.includes(kw.toLowerCase())) s += kw.split(' ').length * 2;
    if (s > score) { score = s; best = e; }
  }
  return best && score > 0 ? pick(best.a) : pick(UI.fallback);
}
function answerById(id) {
  const e = KB.find(x => x.id === id);
  return e ? pick(e.a) : pick(UI.fallback);
}

// ── Mounting ──────────────────────────────────────────────────────────────────
export function initAssistant() {
  const existing = document.getElementById('sb-assistant-fab');
  if (existing) { existing.style.display = ''; return; }

  document.body.insertAdjacentHTML('beforeend', `
    <button id="sb-assistant-fab" title="Help" style="position:fixed;right:20px;bottom:20px;z-index:9000;width:56px;height:56px;border:none;border-radius:50%;cursor:pointer;background:var(--gradient-brand,linear-gradient(135deg,#7c3aed,#06b6d4));box-shadow:0 8px 24px rgba(124,58,237,.45);color:#fff;font-size:1.5rem;display:flex;align-items:center;justify-content:center;">🤖</button>
    <div id="sb-assistant-panel" style="position:fixed;right:20px;bottom:88px;z-index:9001;display:none;width:340px;max-width:calc(100vw - 40px);height:480px;max-height:calc(100vh - 120px);background:var(--bg-elevated,#14141f);border:1px solid var(--glass-border,rgba(255,255,255,.08));border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.5);flex-direction:column;overflow:hidden;">
      <div style="padding:14px 16px;background:var(--gradient-brand,linear-gradient(135deg,#7c3aed,#06b6d4));color:#fff;display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:1.2rem;">🤖</span>
          <div><div id="sb-a-title" style="font-weight:700;font-size:.95rem;"></div><div id="sb-a-sub" style="font-size:.7rem;opacity:.85;"></div></div>
        </div>
        <button id="sb-assistant-close" style="background:transparent;border:none;color:#fff;font-size:1.2rem;cursor:pointer;line-height:1;">✕</button>
      </div>
      <div id="sb-assistant-msgs" style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;font-size:.85rem;color:var(--text-primary,#e5e7eb);"></div>
      <div id="sb-assistant-chips" style="padding:6px 12px;display:flex;flex-wrap:wrap;gap:6px;border-top:1px solid var(--glass-border,rgba(255,255,255,.08));"></div>
      <div style="padding:10px 12px;border-top:1px solid var(--glass-border,rgba(255,255,255,.08));display:flex;gap:8px;">
        <input id="sb-assistant-input" type="text" style="flex:1;padding:9px 12px;border-radius:10px;font-size:.85rem;background:var(--bg-base,#0b0b12);color:var(--text-primary,#e5e7eb);border:1px solid var(--glass-border,rgba(255,255,255,.12));outline:none;">
        <button id="sb-assistant-send" style="padding:9px 14px;border:none;border-radius:10px;cursor:pointer;font-weight:600;font-size:.85rem;background:var(--accent-violet,#7c3aed);color:#fff;"></button>
      </div>
    </div>
  `);

  const panel = document.getElementById('sb-assistant-panel');
  const msgs  = document.getElementById('sb-assistant-msgs');
  const chips = document.getElementById('sb-assistant-chips');
  const input = document.getElementById('sb-assistant-input');

  // Apply current-language labels
  document.getElementById('sb-a-title').textContent = pick(UI.title);
  document.getElementById('sb-a-sub').textContent   = pick(UI.subtitle);
  input.placeholder = pick(UI.placeholder);
  document.getElementById('sb-assistant-send').textContent = pick(UI.send);

  const bubble = (html, who) => {
    const bot = who === 'bot';
    const d = document.createElement('div');
    d.style.cssText = `max-width:85%;padding:9px 12px;border-radius:12px;line-height:1.45;${bot ? 'align-self:flex-start;background:var(--bg-base,#0b0b12);border:1px solid var(--glass-border,rgba(255,255,255,.08));' : 'align-self:flex-end;background:var(--accent-violet,#7c3aed);color:#fff;'}`;
    d.innerHTML = html;
    msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
  };

  let greeted = false;
  const greet = () => {
    if (greeted) return; greeted = true;
    bubble(`${pick(UI.welcome)}<br><br><b>${pick(UI.gettingStarted)}</b><br>${pick(CHECKLIST).map(c => `✅ ${c}`).join('<br>')}<br><br>${pick(UI.tapBelow)}`, 'bot');
  };

  pick(SUGGESTIONS).forEach(([label, id]) => {
    const chip = document.createElement('button');
    chip.textContent = label;
    chip.style.cssText = `padding:5px 10px;border-radius:999px;cursor:pointer;font-size:.74rem;background:var(--accent-violet-glow,rgba(124,58,237,.12));color:var(--accent-violet-light,#a78bfa);border:1px solid var(--accent-violet-glow,rgba(124,58,237,.25));`;
    chip.addEventListener('click', () => { bubble(label, 'user'); setTimeout(() => bubble(answerById(id), 'bot'), 180); });
    chips.appendChild(chip);
  });

  const ask = () => {
    const text = input.value.trim(); if (!text) return;
    bubble(text, 'user'); input.value = '';
    setTimeout(() => bubble(answerByText(text), 'bot'), 180);
  };

  const toggle = (show) => {
    const open = show ?? (panel.style.display === 'none' || !panel.style.display);
    panel.style.display = open ? 'flex' : 'none';
    if (open) { greet(); input.focus(); }
  };

  document.getElementById('sb-assistant-fab').addEventListener('click', () => toggle());
  document.getElementById('sb-assistant-close').addEventListener('click', () => toggle(false));
  document.getElementById('sb-assistant-send').addEventListener('click', ask);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') ask(); });
}

export function hideAssistant() {
  const fab = document.getElementById('sb-assistant-fab');
  const panel = document.getElementById('sb-assistant-panel');
  if (fab) fab.style.display = 'none';
  if (panel) panel.style.display = 'none';
}
