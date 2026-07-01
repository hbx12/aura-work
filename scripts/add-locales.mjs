import fs from 'fs';
import path from 'path';

// Read English as template
const en = JSON.parse(fs.readFileSync('packages/i18n/locales/en.json', 'utf8'));

// New languages to add
const newLangs = {
  'he': { name: 'Hebrew', native: 'עברית', rtl: true },
  'uk': { name: 'Ukrainian', native: 'Українська', rtl: false },
  'bn': { name: 'Bengali', native: 'বাংলা', rtl: false },
  'sw': { name: 'Swahili', native: 'Kiswahili', rtl: false },
  'el': { name: 'Greek', native: 'Ελληνικά', rtl: false }
};

// Basic translations for key UI elements
const translations = {
  'he': {
    'app.name': 'Aura Work',
    'nav.tasks': 'משימות',
    'nav.files': 'קבצים',
    'nav.git': 'Git',
    'nav.browser': 'דפדפן',
    'nav.computer': 'שימוש במחשב',
    'nav.schedule': 'מתוזמן',
    'nav.providers': 'ספקים',
    'nav.plugins': 'תוספים ו-MCP',
    'nav.memory': 'זיכרון',
    'nav.audit': 'יומן ביקורת',
    'nav.settings': 'הגדרות',
    'settings.title': 'הגדרות וכספת',
    'settings.language': 'שפה',
    'settings.theme': 'ערכת נושא',
    'chat.placeholder': 'הקלד הודעה...',
    'chat.send': 'שלח',
    'common.save': 'שמור',
    'common.cancel': 'ביטול',
    'common.delete': 'מחק',
    'common.edit': 'ערוך',
    'common.close': 'סגור',
    'common.back': 'חזור',
    'common.next': 'הבא',
    'common.loading': 'טוען...',
    'common.error': 'שגיאה',
    'common.success': 'הצלחה'
  },
  'uk': {
    'app.name': 'Aura Work',
    'nav.tasks': 'Завдання',
    'nav.files': 'Файли',
    'nav.git': 'Git',
    'nav.browser': 'Браузер',
    'nav.computer': 'Комп\'ютер',
    'nav.schedule': 'Заплановані',
    'nav.providers': 'Провайдери',
    'nav.plugins': 'Плагіни та MCP',
    'nav.memory': 'Пам\'ять',
    'nav.audit': 'Журнал аудиту',
    'nav.settings': 'Налаштування',
    'settings.title': 'Налаштування та сховище',
    'settings.language': 'Мова',
    'settings.theme': 'Тема',
    'chat.placeholder': 'Введіть повідомлення...',
    'chat.send': 'Надіслати',
    'common.save': 'Зберегти',
    'common.cancel': 'Скасувати',
    'common.delete': 'Видалити',
    'common.edit': 'Редагувати',
    'common.close': 'Закрити',
    'common.back': 'Назад',
    'common.next': 'Далі',
    'common.loading': 'Завантаження...',
    'common.error': 'Помилка',
    'common.success': 'Успіх'
  },
  'bn': {
    'app.name': 'Aura Work',
    'nav.tasks': 'কাজ',
    'nav.files': 'ফাইল',
    'nav.git': 'Git',
    'nav.browser': 'ব্রাউজার',
    'nav.computer': 'কম্পিউটার ব্যবহার',
    'nav.schedule': 'নির্ধারিত',
    'nav.providers': 'প্রদানকারী',
    'nav.plugins': 'প্লাগইন এবং MCP',
    'nav.memory': 'স্মৃতি',
    'nav.audit': 'নিরীক্ষা লগ',
    'nav.settings': 'সেটিংস',
    'settings.title': 'সেটিংস এবং ভল্ট',
    'settings.language': 'ভাষা',
    'settings.theme': 'থিম',
    'chat.placeholder': 'একটি বার্তা লিখুন...',
    'chat.send': 'পাঠান',
    'common.save': 'সংরক্ষণ',
    'common.cancel': 'বাতিল',
    'common.delete': 'মুছুন',
    'common.edit': 'সম্পাদনা',
    'common.close': 'বন্ধ',
    'common.back': 'পিছনে',
    'common.next': 'পরবর্তী',
    'common.loading': 'লোড হচ্ছে...',
    'common.error': 'ত্রুটি',
    'common.success': 'সফল'
  },
  'sw': {
    'app.name': 'Aura Work',
    'nav.tasks': 'Kazi',
    'nav.files': 'Faili',
    'nav.git': 'Git',
    'nav.browser': 'Kivinjari',
    'nav.computer': 'Matumizi ya kompyuta',
    'nav.schedule': 'Ratiba',
    'nav.providers': 'Watoa huduma',
    'nav.plugins': 'Viongezi na MCP',
    'nav.memory': 'Kumbukumbu',
    'nav.audit': 'Kitabu cha ukaguzi',
    'nav.settings': 'Mipangilio',
    'settings.title': 'Mipangilio na hazina',
    'settings.language': 'Lugha',
    'settings.theme': 'Mandhari',
    'chat.placeholder': 'Andika ujumbe...',
    'chat.send': 'Tuma',
    'common.save': 'Hifadhi',
    'common.cancel': 'Ghairi',
    'common.delete': 'Futa',
    'common.edit': 'Hariri',
    'common.close': 'Funga',
    'common.back': 'Rudi',
    'common.next': 'Ifuatayo',
    'common.loading': 'Inapakia...',
    'common.error': 'Hitilafu',
    'common.success': 'Imefanikiwa'
  },
  'el': {
    'app.name': 'Aura Work',
    'nav.tasks': 'Εργασίες',
    'nav.files': 'Αρχεία',
    'nav.git': 'Git',
    'nav.browser': 'Περιηγητής',
    'nav.computer': 'Χρήση υπολογιστή',
    'nav.schedule': 'Προγραμματισμένα',
    'nav.providers': 'Πάροχοι',
    'nav.plugins': 'Πρόσθετα & MCP',
    'nav.memory': 'Μνήμη',
    'nav.audit': 'Αρχείο ελέγχου',
    'nav.settings': 'Ρυθμίσεις',
    'settings.title': 'Ρυθμίσεις & θησαυροφυλάκιο',
    'settings.language': 'Γλώσσα',
    'settings.theme': 'Θέμα',
    'chat.placeholder': 'Πληκτρολογήστε ένα μήνυμα...',
    'chat.send': 'Αποστολή',
    'common.save': 'Αποθήκευση',
    'common.cancel': 'Ακύρωση',
    'common.delete': 'Διαγραφή',
    'common.edit': 'Επεξεργασία',
    'common.close': 'Κλείσιμο',
    'common.back': 'Πίσω',
    'common.next': 'Επόμενο',
    'common.loading': 'Φόρτωση...',
    'common.error': 'Σφάλμα',
    'common.success': 'Επιτυχία'
  }
};

// Create locale files
for (const [lang, info] of Object.entries(newLangs)) {
  const locale = { ...en, ...translations[lang] };
  const filePath = path.join('packages/i18n/locales', lang + '.json');
  fs.writeFileSync(filePath, JSON.stringify(locale, null, 2) + '\n');
  console.log('✅ Created: ' + lang + '.json (' + info.native + ')');
}

console.log('\nDone! Created ' + Object.keys(newLangs).length + ' new locale files.');
