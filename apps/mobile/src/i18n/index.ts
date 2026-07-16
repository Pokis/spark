import { getLocales } from 'expo-localization';
import { useSpark } from '../state/SparkProvider';
import type { AppSettings } from '../data/models';

export type SupportedLocale = Exclude<AppSettings['language'], 'system'>;

export const supportedLocales: {
  code: AppSettings['language'];
  label: string;
}[] = [
  { code: 'system', label: 'System language' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'pt-BR', label: 'Português (Brasil)' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'pl', label: 'Polski' },
  { code: 'uk', label: 'Українська' },
  { code: 'ru', label: 'Русский' },
  { code: 'lt', label: 'Lietuvių' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'zh-Hans', label: '简体中文' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ar', label: 'العربية' }
];

const en = {
  back: 'Back',
  today: 'Today',
  focus: 'Focus',
  capture: 'Capture',
  journey: 'Journey',
  settings: 'Settings',
  newHabit: 'New habit',
  editHabit: 'Edit habit',
  habitHistory: 'Habit history',
  routine: 'Routine',
  editRoutine: 'Edit routine',
  newRoutine: 'New routine',
  privacy: 'Privacy',
  helpNow: 'Help me now',
  weeklyReset: 'Weekly reset',
  departureMode: 'Departure mode',
  experiments: 'Personal experiments',
  shareProgress: 'Share selected wins',
  encryptedBackups: 'Encrypted backups',
  diagnostics: 'Diagnostics',
  language: 'Language',
  simpleMode: 'Simple mode',
  simpleModeDescription: 'Keep Today focused on one action, Capture, Focus, and your running routine.',
  quietNow: 'Quiet now',
  quietNowDescription: 'Mute sound, haptics, motion, and celebrations until tomorrow.',
  quietOff: 'Sensory feedback is available',
  quietOn: 'Quiet mode is on for today',
  save: 'Save',
  cancel: 'Cancel',
  done: 'Done',
  start: 'Start',
  pause: 'Pause',
  resume: 'Resume',
  stop: 'Stop',
  choose: 'Choose',
  noPressure: 'No score, no missed-day grade, and no automatic sharing.',
  localOnly: 'Stored only on this device.',
  openSettings: 'Open settings',
  moreTools: 'More helpful tools',
  quickCapture: 'Quick capture',
  startFocus: 'Start focus',
  runningRoutine: 'Running routine',
  systemLanguage: 'System language',
  selectedWins: 'Selected wins',
  shareImage: 'Share image',
  shareText: 'Share text',
  calendarExport: 'Add to calendar',
  notMedical: 'Spark supports routines and self-organization; it does not diagnose or treat ADHD.'
} as const;

type TranslationKey = keyof typeof en;
type Translation = Partial<Record<TranslationKey, string>>;

const translations: Record<SupportedLocale, Translation> = {
  en,
  es: {
    back: 'Atrás', today: 'Hoy', focus: 'Enfoque', capture: 'Capturar', journey: 'Progreso',
    settings: 'Ajustes', privacy: 'Privacidad', helpNow: 'Ayúdame ahora',
    weeklyReset: 'Reinicio semanal', departureMode: 'Modo salida',
    experiments: 'Experimentos personales', shareProgress: 'Compartir logros elegidos',
    encryptedBackups: 'Copias cifradas', diagnostics: 'Diagnóstico', language: 'Idioma',
    simpleMode: 'Modo simple', quietNow: 'Silencio ahora', save: 'Guardar', cancel: 'Cancelar',
    done: 'Listo', start: 'Empezar', pause: 'Pausar', resume: 'Reanudar',
    localOnly: 'Guardado solo en este dispositivo.', moreTools: 'Más herramientas útiles'
  },
  'pt-BR': {
    back: 'Voltar', today: 'Hoje', focus: 'Foco', capture: 'Capturar', journey: 'Jornada',
    settings: 'Configurações', privacy: 'Privacidade', helpNow: 'Ajude-me agora',
    weeklyReset: 'Revisão semanal', departureMode: 'Modo de saída',
    experiments: 'Experimentos pessoais', shareProgress: 'Compartilhar vitórias escolhidas',
    encryptedBackups: 'Backups criptografados', diagnostics: 'Diagnóstico', language: 'Idioma',
    simpleMode: 'Modo simples', quietNow: 'Silêncio agora', save: 'Salvar', cancel: 'Cancelar',
    done: 'Concluir', start: 'Começar', pause: 'Pausar', resume: 'Retomar',
    localOnly: 'Armazenado apenas neste dispositivo.', moreTools: 'Mais ferramentas úteis'
  },
  fr: {
    back: 'Retour', today: 'Aujourd’hui', focus: 'Concentration', capture: 'Capture',
    journey: 'Parcours', settings: 'Réglages', privacy: 'Confidentialité',
    helpNow: 'Aidez-moi maintenant', weeklyReset: 'Bilan hebdomadaire',
    departureMode: 'Mode départ', experiments: 'Expériences personnelles',
    shareProgress: 'Partager des réussites choisies', encryptedBackups: 'Sauvegardes chiffrées',
    diagnostics: 'Diagnostic', language: 'Langue', simpleMode: 'Mode simple',
    quietNow: 'Silence maintenant', save: 'Enregistrer', cancel: 'Annuler',
    done: 'Terminé', start: 'Commencer', pause: 'Pause', resume: 'Reprendre',
    localOnly: 'Stocké uniquement sur cet appareil.', moreTools: 'Autres outils utiles'
  },
  de: {
    back: 'Zurück', today: 'Heute', focus: 'Fokus', capture: 'Erfassen', journey: 'Weg',
    settings: 'Einstellungen', privacy: 'Datenschutz', helpNow: 'Hilf mir jetzt',
    weeklyReset: 'Wochenrückblick', departureMode: 'Aufbruchmodus',
    experiments: 'Persönliche Experimente', shareProgress: 'Ausgewählte Erfolge teilen',
    encryptedBackups: 'Verschlüsselte Sicherungen', diagnostics: 'Diagnose', language: 'Sprache',
    simpleMode: 'Einfacher Modus', quietNow: 'Jetzt ruhig', save: 'Speichern',
    cancel: 'Abbrechen', done: 'Fertig', start: 'Starten', pause: 'Pause',
    resume: 'Fortsetzen', localOnly: 'Nur auf diesem Gerät gespeichert.',
    moreTools: 'Weitere hilfreiche Werkzeuge'
  },
  it: {
    back: 'Indietro', today: 'Oggi', focus: 'Focus', capture: 'Cattura', journey: 'Percorso',
    settings: 'Impostazioni', privacy: 'Privacy', helpNow: 'Aiutami ora',
    weeklyReset: 'Revisione settimanale', departureMode: 'Modalità uscita',
    experiments: 'Esperimenti personali', shareProgress: 'Condividi successi scelti',
    encryptedBackups: 'Backup cifrati', diagnostics: 'Diagnostica', language: 'Lingua',
    simpleMode: 'Modalità semplice', quietNow: 'Silenzio ora', save: 'Salva',
    cancel: 'Annulla', done: 'Fatto', start: 'Inizia', pause: 'Pausa', resume: 'Riprendi',
    localOnly: 'Salvato solo su questo dispositivo.', moreTools: 'Altri strumenti utili'
  },
  pl: {
    back: 'Wstecz', today: 'Dzisiaj', focus: 'Skupienie', capture: 'Zapisz', journey: 'Droga',
    settings: 'Ustawienia', privacy: 'Prywatność', helpNow: 'Pomóż mi teraz',
    weeklyReset: 'Przegląd tygodnia', departureMode: 'Tryb wyjścia',
    experiments: 'Eksperymenty osobiste', shareProgress: 'Udostępnij wybrane sukcesy',
    encryptedBackups: 'Szyfrowane kopie', diagnostics: 'Diagnostyka', language: 'Język',
    simpleMode: 'Tryb prosty', quietNow: 'Wycisz teraz', save: 'Zapisz',
    cancel: 'Anuluj', done: 'Gotowe', start: 'Zacznij', pause: 'Pauza', resume: 'Wznów',
    localOnly: 'Przechowywane tylko na tym urządzeniu.', moreTools: 'Więcej pomocnych narzędzi'
  },
  uk: {
    back: 'Назад', today: 'Сьогодні', focus: 'Фокус', capture: 'Занотувати', journey: 'Шлях',
    settings: 'Налаштування', privacy: 'Приватність', helpNow: 'Допоможи мені зараз',
    weeklyReset: 'Тижневий огляд', departureMode: 'Режим виходу',
    experiments: 'Особисті експерименти', shareProgress: 'Поділитися обраними перемогами',
    encryptedBackups: 'Зашифровані резервні копії', diagnostics: 'Діагностика',
    language: 'Мова', simpleMode: 'Простий режим', quietNow: 'Тиша зараз',
    save: 'Зберегти', cancel: 'Скасувати', done: 'Готово', start: 'Почати',
    pause: 'Пауза', resume: 'Продовжити', localOnly: 'Зберігається лише на цьому пристрої.',
    moreTools: 'Інші корисні інструменти'
  },
  ru: {
    back: 'Назад', today: 'Сегодня', focus: 'Фокус', capture: 'Записать', journey: 'Путь',
    settings: 'Настройки', privacy: 'Конфиденциальность', helpNow: 'Помоги мне сейчас',
    weeklyReset: 'Недельный обзор', departureMode: 'Режим выхода',
    experiments: 'Личные эксперименты', shareProgress: 'Поделиться выбранными победами',
    encryptedBackups: 'Зашифрованные копии', diagnostics: 'Диагностика', language: 'Язык',
    simpleMode: 'Простой режим', quietNow: 'Тишина сейчас', save: 'Сохранить',
    cancel: 'Отмена', done: 'Готово', start: 'Начать', pause: 'Пауза', resume: 'Продолжить',
    localOnly: 'Хранится только на этом устройстве.', moreTools: 'Другие полезные инструменты'
  },
  lt: {
    back: 'Atgal', today: 'Šiandien', focus: 'Dėmesys', capture: 'Užrašyti', journey: 'Kelionė',
    settings: 'Nustatymai', privacy: 'Privatumas', helpNow: 'Padėk man dabar',
    weeklyReset: 'Savaitės peržiūra', departureMode: 'Išėjimo režimas',
    experiments: 'Asmeniniai eksperimentai', shareProgress: 'Dalintis pasirinktais laimėjimais',
    encryptedBackups: 'Šifruotos atsarginės kopijos', diagnostics: 'Diagnostika', language: 'Kalba',
    simpleMode: 'Paprastas režimas', quietNow: 'Tyliai dabar', save: 'Išsaugoti',
    cancel: 'Atšaukti', done: 'Baigta', start: 'Pradėti', pause: 'Pristabdyti',
    resume: 'Tęsti', localOnly: 'Saugoma tik šiame įrenginyje.',
    moreTools: 'Daugiau naudingų įrankių', quickCapture: 'Greitas užrašas',
    startFocus: 'Pradėti susikaupimą', runningRoutine: 'Vykdoma rutina'
  },
  ja: {
    back: '戻る', today: '今日', focus: '集中', capture: 'メモ', journey: '歩み',
    settings: '設定', privacy: 'プライバシー', helpNow: '今すぐ助けて',
    weeklyReset: '週間リセット', departureMode: '出発モード', experiments: '個人実験',
    shareProgress: '選んだ達成を共有', encryptedBackups: '暗号化バックアップ',
    diagnostics: '診断', language: '言語', simpleMode: 'シンプルモード',
    quietNow: '今日は静かに', save: '保存', cancel: 'キャンセル', done: '完了',
    start: '開始', pause: '一時停止', resume: '再開', localOnly: 'この端末にのみ保存されます。',
    moreTools: 'その他の便利なツール'
  },
  ko: {
    back: '뒤로', today: '오늘', focus: '집중', capture: '기록', journey: '여정',
    settings: '설정', privacy: '개인정보', helpNow: '지금 도와줘',
    weeklyReset: '주간 재정비', departureMode: '출발 모드', experiments: '개인 실험',
    shareProgress: '선택한 성취 공유', encryptedBackups: '암호화 백업',
    diagnostics: '진단', language: '언어', simpleMode: '간단 모드',
    quietNow: '오늘 조용히', save: '저장', cancel: '취소', done: '완료',
    start: '시작', pause: '일시정지', resume: '계속', localOnly: '이 기기에만 저장됩니다.',
    moreTools: '도움이 되는 다른 도구'
  },
  'zh-Hans': {
    back: '返回', today: '今天', focus: '专注', capture: '记录', journey: '历程',
    settings: '设置', privacy: '隐私', helpNow: '现在帮助我',
    weeklyReset: '每周重整', departureMode: '出发模式', experiments: '个人实验',
    shareProgress: '分享所选成果', encryptedBackups: '加密备份', diagnostics: '诊断',
    language: '语言', simpleMode: '简洁模式', quietNow: '今天保持安静',
    save: '保存', cancel: '取消', done: '完成', start: '开始', pause: '暂停', resume: '继续',
    localOnly: '仅存储在此设备上。', moreTools: '更多实用工具'
  },
  hi: {
    back: 'वापस', today: 'आज', focus: 'ध्यान', capture: 'लिखें', journey: 'यात्रा',
    settings: 'सेटिंग्स', privacy: 'गोपनीयता', helpNow: 'अभी मेरी मदद करें',
    weeklyReset: 'साप्ताहिक रीसेट', departureMode: 'प्रस्थान मोड',
    experiments: 'व्यक्तिगत प्रयोग', shareProgress: 'चुनी हुई जीत साझा करें',
    encryptedBackups: 'एन्क्रिप्टेड बैकअप', diagnostics: 'निदान', language: 'भाषा',
    simpleMode: 'सरल मोड', quietNow: 'आज शांत', save: 'सहेजें', cancel: 'रद्द करें',
    done: 'पूरा', start: 'शुरू करें', pause: 'रोकें', resume: 'जारी रखें',
    localOnly: 'केवल इस डिवाइस पर संग्रहीत।', moreTools: 'और उपयोगी उपकरण'
  },
  ar: {
    back: 'رجوع', today: 'اليوم', focus: 'تركيز', capture: 'تدوين', journey: 'المسار',
    settings: 'الإعدادات', privacy: 'الخصوصية', helpNow: 'ساعدني الآن',
    weeklyReset: 'مراجعة أسبوعية', departureMode: 'وضع المغادرة',
    experiments: 'تجارب شخصية', shareProgress: 'مشاركة الإنجازات المختارة',
    encryptedBackups: 'نسخ احتياطية مشفرة', diagnostics: 'التشخيص', language: 'اللغة',
    simpleMode: 'الوضع البسيط', quietNow: 'هدوء اليوم', save: 'حفظ', cancel: 'إلغاء',
    done: 'تم', start: 'ابدأ', pause: 'إيقاف مؤقت', resume: 'متابعة',
    localOnly: 'محفوظ على هذا الجهاز فقط.', moreTools: 'أدوات مفيدة أخرى'
  }
};

function normalizeLocale(tag?: string | null): SupportedLocale {
  if (!tag) return 'en';
  const lower = tag.toLowerCase();
  if (lower.startsWith('pt')) return 'pt-BR';
  if (lower.startsWith('zh')) return 'zh-Hans';
  const base = lower.split('-')[0] as SupportedLocale;
  return base in translations ? base : 'en';
}

export function resolveLocale(setting: AppSettings['language']): SupportedLocale {
  if (setting !== 'system') return setting;
  return normalizeLocale(getLocales()[0]?.languageTag);
}

export function translate(locale: SupportedLocale, key: TranslationKey): string {
  return translations[locale][key] ?? en[key];
}

export function useI18n() {
  const { settings } = useSpark();
  const locale = resolveLocale(settings.language);
  return {
    locale,
    t: (key: TranslationKey) => translate(locale, key)
  };
}

