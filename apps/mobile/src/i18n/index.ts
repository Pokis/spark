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
  { code: 'ar', label: 'العربية' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'vi', label: 'Tiếng Việt' }
];

const en = {
  back: 'Back',
  today: 'Today',
  focus: 'Focus',
  capture: 'Capture',
  journey: 'Progress',
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
  departureMode: 'Leave on time',
  experiments: 'Try a change for a week',
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
  noPressure: 'Completed actions, private progress, and sharing you control.',
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
  notMedical: 'Spark supports routines and self-organization; it does not diagnose or treat ADHD.',
  add: 'Add',
  delete: 'Delete',
  edit: 'Edit',
  archive: 'Archive',
  restore: 'Restore',
  select: 'Select',
  selected: 'Selected',
  moreActions: 'More actions',
  fewerActions: 'Fewer actions',
  chooseNextWin: 'Choose your next win.',
  todaySoFar: 'Today so far',
  completedAction: 'completed action',
  completedActions: 'completed actions',
  totalSparkPoints: 'total Spark points',
  viewProgress: 'View Progress',
  adjustSuggestions: 'Adjust today’s suggestions',
  suggestedNextActions: 'Suggested next actions',
  readyWhenYouAre: 'Ready when you are',
  minutesRemaining: 'minutes remaining',
  oneTarget: 'One target',
  thoughtOrTask: 'Thought or task',
  savedForLater: 'Saved for later',
  recentCompletedActions: 'Recent completed actions',
  reviewProgress: 'Review progress',
  myHabits: 'My habits',
  myRoutines: 'My routines',
  manageSettings: 'Manage settings',
  languageCoverage:
    'Navigation and essential actions on Today, Focus, Capture, and Progress use this language. Advanced guides and settings use English when a translation is not bundled.'
} as const;

export type TranslationKey = keyof typeof en;
type Translation = Partial<Record<TranslationKey, string>>;

export const coreExperienceKeys = [
  'today',
  'focus',
  'capture',
  'journey',
  'settings',
  'save',
  'cancel',
  'done',
  'start',
  'pause',
  'resume',
  'add',
  'delete',
  'edit',
  'archive',
  'restore',
  'select',
  'selected',
  'moreActions',
  'fewerActions',
  'chooseNextWin',
  'todaySoFar',
  'completedAction',
  'completedActions',
  'totalSparkPoints',
  'viewProgress',
  'adjustSuggestions',
  'suggestedNextActions',
  'readyWhenYouAre',
  'minutesRemaining',
  'oneTarget',
  'thoughtOrTask',
  'savedForLater',
  'recentCompletedActions',
  'reviewProgress',
  'myHabits',
  'myRoutines',
  'manageSettings',
  'languageCoverage'
] as const satisfies readonly TranslationKey[];

const translations: Record<SupportedLocale, Translation> = {
  en,
  es: {
    back: 'Atrás', today: 'Hoy', focus: 'Enfoque', capture: 'Capturar', journey: 'Progreso',
    settings: 'Ajustes', privacy: 'Privacidad', helpNow: 'Ayúdame ahora',
    weeklyReset: 'Reinicio semanal', departureMode: 'Salir a tiempo',
    experiments: 'Probar un cambio por una semana', shareProgress: 'Compartir logros elegidos',
    encryptedBackups: 'Copias cifradas', diagnostics: 'Diagnóstico', language: 'Idioma',
    simpleMode: 'Modo simple', quietNow: 'Silencio ahora', save: 'Guardar', cancel: 'Cancelar',
    done: 'Listo', start: 'Empezar', pause: 'Pausar', resume: 'Reanudar',
    localOnly: 'Guardado solo en este dispositivo.', moreTools: 'Más herramientas útiles'
  },
  'pt-BR': {
    back: 'Voltar', today: 'Hoje', focus: 'Foco', capture: 'Capturar', journey: 'Progresso',
    settings: 'Configurações', privacy: 'Privacidade', helpNow: 'Ajude-me agora',
    weeklyReset: 'Revisão semanal', departureMode: 'Sair na hora certa',
    experiments: 'Testar uma mudança por uma semana', shareProgress: 'Compartilhar vitórias escolhidas',
    encryptedBackups: 'Backups criptografados', diagnostics: 'Diagnóstico', language: 'Idioma',
    simpleMode: 'Modo simples', quietNow: 'Silêncio agora', save: 'Salvar', cancel: 'Cancelar',
    done: 'Concluir', start: 'Começar', pause: 'Pausar', resume: 'Retomar',
    localOnly: 'Armazenado apenas neste dispositivo.', moreTools: 'Mais ferramentas úteis'
  },
  fr: {
    back: 'Retour', today: 'Aujourd’hui', focus: 'Concentration', capture: 'Capture',
    journey: 'Progrès', settings: 'Réglages', privacy: 'Confidentialité',
    helpNow: 'Aidez-moi maintenant', weeklyReset: 'Bilan hebdomadaire',
    departureMode: 'Partir à l’heure', experiments: 'Essayer un changement pendant une semaine',
    shareProgress: 'Partager des réussites choisies', encryptedBackups: 'Sauvegardes chiffrées',
    diagnostics: 'Diagnostic', language: 'Langue', simpleMode: 'Mode simple',
    quietNow: 'Silence maintenant', save: 'Enregistrer', cancel: 'Annuler',
    done: 'Terminé', start: 'Commencer', pause: 'Pause', resume: 'Reprendre',
    localOnly: 'Stocké uniquement sur cet appareil.', moreTools: 'Autres outils utiles'
  },
  de: {
    back: 'Zurück', today: 'Heute', focus: 'Fokus', capture: 'Erfassen', journey: 'Fortschritt',
    settings: 'Einstellungen', privacy: 'Datenschutz', helpNow: 'Hilf mir jetzt',
    weeklyReset: 'Wochenrückblick', departureMode: 'Pünktlich losgehen',
    experiments: 'Eine Änderung eine Woche testen', shareProgress: 'Ausgewählte Erfolge teilen',
    encryptedBackups: 'Verschlüsselte Sicherungen', diagnostics: 'Diagnose', language: 'Sprache',
    simpleMode: 'Einfacher Modus', quietNow: 'Jetzt ruhig', save: 'Speichern',
    cancel: 'Abbrechen', done: 'Fertig', start: 'Starten', pause: 'Pause',
    resume: 'Fortsetzen', localOnly: 'Nur auf diesem Gerät gespeichert.',
    moreTools: 'Weitere hilfreiche Werkzeuge'
  },
  it: {
    back: 'Indietro', today: 'Oggi', focus: 'Focus', capture: 'Cattura', journey: 'Progressi',
    settings: 'Impostazioni', privacy: 'Privacy', helpNow: 'Aiutami ora',
    weeklyReset: 'Revisione settimanale', departureMode: 'Uscire in orario',
    experiments: 'Provare un cambiamento per una settimana', shareProgress: 'Condividi successi scelti',
    encryptedBackups: 'Backup cifrati', diagnostics: 'Diagnostica', language: 'Lingua',
    simpleMode: 'Modalità semplice', quietNow: 'Silenzio ora', save: 'Salva',
    cancel: 'Annulla', done: 'Fatto', start: 'Inizia', pause: 'Pausa', resume: 'Riprendi',
    localOnly: 'Salvato solo su questo dispositivo.', moreTools: 'Altri strumenti utili'
  },
  pl: {
    back: 'Wstecz', today: 'Dzisiaj', focus: 'Skupienie', capture: 'Zapisz', journey: 'Postępy',
    settings: 'Ustawienia', privacy: 'Prywatność', helpNow: 'Pomóż mi teraz',
    weeklyReset: 'Przegląd tygodnia', departureMode: 'Wyjdź na czas',
    experiments: 'Wypróbuj zmianę przez tydzień', shareProgress: 'Udostępnij wybrane sukcesy',
    encryptedBackups: 'Szyfrowane kopie', diagnostics: 'Diagnostyka', language: 'Język',
    simpleMode: 'Tryb prosty', quietNow: 'Wycisz teraz', save: 'Zapisz',
    cancel: 'Anuluj', done: 'Gotowe', start: 'Zacznij', pause: 'Pauza', resume: 'Wznów',
    localOnly: 'Przechowywane tylko na tym urządzeniu.', moreTools: 'Więcej pomocnych narzędzi'
  },
  uk: {
    back: 'Назад', today: 'Сьогодні', focus: 'Фокус', capture: 'Занотувати', journey: 'Прогрес',
    settings: 'Налаштування', privacy: 'Приватність', helpNow: 'Допоможи мені зараз',
    weeklyReset: 'Тижневий огляд', departureMode: 'Вийти вчасно',
    experiments: 'Спробувати зміну на тиждень', shareProgress: 'Поділитися обраними перемогами',
    encryptedBackups: 'Зашифровані резервні копії', diagnostics: 'Діагностика',
    language: 'Мова', simpleMode: 'Простий режим', quietNow: 'Тиша зараз',
    save: 'Зберегти', cancel: 'Скасувати', done: 'Готово', start: 'Почати',
    pause: 'Пауза', resume: 'Продовжити', localOnly: 'Зберігається лише на цьому пристрої.',
    moreTools: 'Інші корисні інструменти'
  },
  ru: {
    back: 'Назад', today: 'Сегодня', focus: 'Фокус', capture: 'Записать', journey: 'Прогресс',
    settings: 'Настройки', privacy: 'Конфиденциальность', helpNow: 'Помоги мне сейчас',
    weeklyReset: 'Недельный обзор', departureMode: 'Выйти вовремя',
    experiments: 'Попробовать изменение на неделю', shareProgress: 'Поделиться выбранными победами',
    encryptedBackups: 'Зашифрованные копии', diagnostics: 'Диагностика', language: 'Язык',
    simpleMode: 'Простой режим', quietNow: 'Тишина сейчас', save: 'Сохранить',
    cancel: 'Отмена', done: 'Готово', start: 'Начать', pause: 'Пауза', resume: 'Продолжить',
    localOnly: 'Хранится только на этом устройстве.', moreTools: 'Другие полезные инструменты'
  },
  lt: {
    back: 'Atgal', today: 'Šiandien', focus: 'Dėmesys', capture: 'Užrašyti', journey: 'Pažanga',
    settings: 'Nustatymai', privacy: 'Privatumas', helpNow: 'Padėk man dabar',
    weeklyReset: 'Savaitės peržiūra', departureMode: 'Išeiti laiku',
    experiments: 'Savaitę išbandyti pakeitimą', shareProgress: 'Dalintis pasirinktais laimėjimais',
    encryptedBackups: 'Šifruotos atsarginės kopijos', diagnostics: 'Diagnostika', language: 'Kalba',
    simpleMode: 'Paprastas režimas', quietNow: 'Tyliai dabar', save: 'Išsaugoti',
    cancel: 'Atšaukti', done: 'Baigta', start: 'Pradėti', pause: 'Pristabdyti',
    resume: 'Tęsti', localOnly: 'Saugoma tik šiame įrenginyje.',
    moreTools: 'Daugiau naudingų įrankių', quickCapture: 'Greitas užrašas',
    startFocus: 'Pradėti susikaupimą', runningRoutine: 'Vykdoma rutina'
  },
  ja: {
    back: '戻る', today: '今日', focus: '集中', capture: 'メモ', journey: '進捗',
    settings: '設定', privacy: 'プライバシー', helpNow: '今すぐ助けて',
    weeklyReset: '週間リセット', departureMode: '時間どおりに出発', experiments: '1週間変更を試す',
    shareProgress: '選んだ達成を共有', encryptedBackups: '暗号化バックアップ',
    diagnostics: '診断', language: '言語', simpleMode: 'シンプルモード',
    quietNow: '今日は静かに', save: '保存', cancel: 'キャンセル', done: '完了',
    start: '開始', pause: '一時停止', resume: '再開', localOnly: 'この端末にのみ保存されます。',
    moreTools: 'その他の便利なツール'
  },
  ko: {
    back: '뒤로', today: '오늘', focus: '집중', capture: '기록', journey: '진행',
    settings: '설정', privacy: '개인정보', helpNow: '지금 도와줘',
    weeklyReset: '주간 재정비', departureMode: '제시간에 출발하기', experiments: '일주일 동안 변화 시도하기',
    shareProgress: '선택한 성취 공유', encryptedBackups: '암호화 백업',
    diagnostics: '진단', language: '언어', simpleMode: '간단 모드',
    quietNow: '오늘 조용히', save: '저장', cancel: '취소', done: '완료',
    start: '시작', pause: '일시정지', resume: '계속', localOnly: '이 기기에만 저장됩니다.',
    moreTools: '도움이 되는 다른 도구'
  },
  'zh-Hans': {
    back: '返回', today: '今天', focus: '专注', capture: '记录', journey: '进展',
    settings: '设置', privacy: '隐私', helpNow: '现在帮助我',
    weeklyReset: '每周重整', departureMode: '按时出发', experiments: '尝试一周的小改变',
    shareProgress: '分享所选成果', encryptedBackups: '加密备份', diagnostics: '诊断',
    language: '语言', simpleMode: '简洁模式', quietNow: '今天保持安静',
    save: '保存', cancel: '取消', done: '完成', start: '开始', pause: '暂停', resume: '继续',
    localOnly: '仅存储在此设备上。', moreTools: '更多实用工具'
  },
  hi: {
    back: 'वापस', today: 'आज', focus: 'ध्यान', capture: 'लिखें', journey: 'प्रगति',
    settings: 'सेटिंग्स', privacy: 'गोपनीयता', helpNow: 'अभी मेरी मदद करें',
    weeklyReset: 'साप्ताहिक रीसेट', departureMode: 'समय पर निकलें',
    experiments: 'एक सप्ताह बदलाव आज़माएँ', shareProgress: 'चुनी हुई जीत साझा करें',
    encryptedBackups: 'एन्क्रिप्टेड बैकअप', diagnostics: 'निदान', language: 'भाषा',
    simpleMode: 'सरल मोड', quietNow: 'आज शांत', save: 'सहेजें', cancel: 'रद्द करें',
    done: 'पूरा', start: 'शुरू करें', pause: 'रोकें', resume: 'जारी रखें',
    localOnly: 'केवल इस डिवाइस पर संग्रहीत।', moreTools: 'और उपयोगी उपकरण'
  },
  ar: {
    back: 'رجوع', today: 'اليوم', focus: 'تركيز', capture: 'تدوين', journey: 'التقدم',
    settings: 'الإعدادات', privacy: 'الخصوصية', helpNow: 'ساعدني الآن',
    weeklyReset: 'مراجعة أسبوعية', departureMode: 'اخرج في الوقت المحدد',
    experiments: 'جرّب تغييرًا لمدة أسبوع', shareProgress: 'مشاركة الإنجازات المختارة',
    encryptedBackups: 'نسخ احتياطية مشفرة', diagnostics: 'التشخيص', language: 'اللغة',
    simpleMode: 'الوضع البسيط', quietNow: 'هدوء اليوم', save: 'حفظ', cancel: 'إلغاء',
    done: 'تم', start: 'ابدأ', pause: 'إيقاف مؤقت', resume: 'متابعة',
    localOnly: 'محفوظ على هذا الجهاز فقط.', moreTools: 'أدوات مفيدة أخرى'
  },
  nl: {
    back: 'Terug', today: 'Vandaag', focus: 'Focus', capture: 'Vastleggen', journey: 'Voortgang',
    settings: 'Instellingen', newHabit: 'Nieuwe gewoonte', editHabit: 'Gewoonte bewerken',
    habitHistory: 'Geschiedenis', routine: 'Routine', editRoutine: 'Routine bewerken',
    newRoutine: 'Nieuwe routine', privacy: 'Privacy', helpNow: 'Help me nu',
    weeklyReset: 'Weekoverzicht', departureMode: 'Op tijd vertrekken',
    experiments: 'Probeer een week één verandering', shareProgress: 'Gekozen successen delen',
    encryptedBackups: 'Versleutelde back-ups', diagnostics: 'Diagnostiek', language: 'Taal',
    simpleMode: 'Eenvoudige modus', quietNow: 'Nu stil', save: 'Opslaan', cancel: 'Annuleren',
    done: 'Klaar', start: 'Start', pause: 'Pauze', resume: 'Hervatten', stop: 'Stoppen',
    localOnly: 'Alleen op dit apparaat opgeslagen.', moreTools: 'Meer handige hulpmiddelen',
    quickCapture: 'Snel vastleggen', startFocus: 'Focus starten', runningRoutine: 'Lopende routine'
  },
  tr: {
    back: 'Geri', today: 'Bugün', focus: 'Odak', capture: 'Not al', journey: 'İlerleme',
    settings: 'Ayarlar', newHabit: 'Yeni alışkanlık', editHabit: 'Alışkanlığı düzenle',
    habitHistory: 'Alışkanlık geçmişi', routine: 'Rutin', editRoutine: 'Rutini düzenle',
    newRoutine: 'Yeni rutin', privacy: 'Gizlilik', helpNow: 'Şimdi yardım et',
    weeklyReset: 'Haftalık değerlendirme', departureMode: 'Zamanında çık',
    experiments: 'Bir değişikliği bir hafta dene', shareProgress: 'Seçilen başarıları paylaş',
    encryptedBackups: 'Şifreli yedekler', diagnostics: 'Tanılama', language: 'Dil',
    simpleMode: 'Basit mod', quietNow: 'Şimdi sessiz', save: 'Kaydet', cancel: 'İptal',
    done: 'Bitti', start: 'Başlat', pause: 'Duraklat', resume: 'Sürdür', stop: 'Durdur',
    localOnly: 'Yalnızca bu cihazda saklanır.', moreTools: 'Daha fazla yararlı araç',
    quickCapture: 'Hızlı not', startFocus: 'Odağı başlat', runningRoutine: 'Devam eden rutin'
  },
  id: {
    back: 'Kembali', today: 'Hari ini', focus: 'Fokus', capture: 'Catat', journey: 'Kemajuan',
    settings: 'Pengaturan', newHabit: 'Kebiasaan baru', editHabit: 'Edit kebiasaan',
    habitHistory: 'Riwayat kebiasaan', routine: 'Rutinitas', editRoutine: 'Edit rutinitas',
    newRoutine: 'Rutinitas baru', privacy: 'Privasi', helpNow: 'Bantu saya sekarang',
    weeklyReset: 'Tinjauan mingguan', departureMode: 'Berangkat tepat waktu',
    experiments: 'Coba satu perubahan selama seminggu', shareProgress: 'Bagikan keberhasilan pilihan',
    encryptedBackups: 'Cadangan terenkripsi', diagnostics: 'Diagnostik', language: 'Bahasa',
    simpleMode: 'Mode sederhana', quietNow: 'Hening sekarang', save: 'Simpan', cancel: 'Batal',
    done: 'Selesai', start: 'Mulai', pause: 'Jeda', resume: 'Lanjutkan', stop: 'Hentikan',
    localOnly: 'Disimpan hanya di perangkat ini.', moreTools: 'Alat bantu lainnya',
    quickCapture: 'Catatan cepat', startFocus: 'Mulai fokus', runningRoutine: 'Rutinitas berjalan'
  },
  vi: {
    back: 'Quay lại', today: 'Hôm nay', focus: 'Tập trung', capture: 'Ghi lại', journey: 'Tiến độ',
    settings: 'Cài đặt', newHabit: 'Thói quen mới', editHabit: 'Sửa thói quen',
    habitHistory: 'Lịch sử thói quen', routine: 'Quy trình', editRoutine: 'Sửa quy trình',
    newRoutine: 'Quy trình mới', privacy: 'Quyền riêng tư', helpNow: 'Giúp tôi ngay',
    weeklyReset: 'Xem lại tuần', departureMode: 'Rời đi đúng giờ',
    experiments: 'Thử một thay đổi trong một tuần', shareProgress: 'Chia sẻ thành quả đã chọn',
    encryptedBackups: 'Bản sao lưu mã hóa', diagnostics: 'Chẩn đoán', language: 'Ngôn ngữ',
    simpleMode: 'Chế độ đơn giản', quietNow: 'Yên tĩnh ngay', save: 'Lưu', cancel: 'Hủy',
    done: 'Xong', start: 'Bắt đầu', pause: 'Tạm dừng', resume: 'Tiếp tục', stop: 'Dừng',
    localOnly: 'Chỉ lưu trên thiết bị này.', moreTools: 'Thêm công cụ hữu ích',
    quickCapture: 'Ghi nhanh', startFocus: 'Bắt đầu tập trung', runningRoutine: 'Quy trình đang chạy'
  }
};

const dailyTranslations: Record<SupportedLocale, Translation> = {
  en,
  es: {
    add: 'Añadir', delete: 'Eliminar', edit: 'Editar', archive: 'Archivar', restore: 'Restaurar',
    select: 'Seleccionar', selected: 'Seleccionado', moreActions: 'Más acciones',
    fewerActions: 'Menos acciones', chooseNextWin: 'Elige tu próximo logro.',
    todaySoFar: 'Hoy hasta ahora', completedAction: 'acción completada',
    completedActions: 'acciones completadas', totalSparkPoints: 'puntos Spark en total',
    viewProgress: 'Ver progreso', adjustSuggestions: 'Ajustar las sugerencias de hoy',
    suggestedNextActions: 'Próximas acciones sugeridas', readyWhenYouAre: 'Cuando estés listo',
    minutesRemaining: 'minutos restantes', oneTarget: 'Un objetivo',
    thoughtOrTask: 'Pensamiento o tarea', savedForLater: 'Guardado para después',
    recentCompletedActions: 'Acciones completadas recientes', reviewProgress: 'Revisar progreso',
    myHabits: 'Mis hábitos', myRoutines: 'Mis rutinas', manageSettings: 'Administrar ajustes',
    languageCoverage: 'La navegación y las acciones esenciales de Hoy, Enfoque, Capturar y Progreso usan este idioma. Las guías y ajustes avanzados usan inglés cuando no hay una traducción incluida.'
  },
  'pt-BR': {
    add: 'Adicionar', delete: 'Excluir', edit: 'Editar', archive: 'Arquivar', restore: 'Restaurar',
    select: 'Selecionar', selected: 'Selecionado', moreActions: 'Mais ações',
    fewerActions: 'Menos ações', chooseNextWin: 'Escolha sua próxima vitória.',
    todaySoFar: 'Hoje até agora', completedAction: 'ação concluída',
    completedActions: 'ações concluídas', totalSparkPoints: 'pontos Spark no total',
    viewProgress: 'Ver progresso', adjustSuggestions: 'Ajustar as sugestões de hoje',
    suggestedNextActions: 'Próximas ações sugeridas', readyWhenYouAre: 'Quando você estiver pronto',
    minutesRemaining: 'minutos restantes', oneTarget: 'Um objetivo',
    thoughtOrTask: 'Pensamento ou tarefa', savedForLater: 'Guardado para depois',
    recentCompletedActions: 'Ações concluídas recentes', reviewProgress: 'Revisar progresso',
    myHabits: 'Meus hábitos', myRoutines: 'Minhas rotinas', manageSettings: 'Gerenciar configurações',
    languageCoverage: 'A navegação e as ações essenciais de Hoje, Foco, Capturar e Progresso usam este idioma. Guias e configurações avançadas usam inglês quando não há tradução incluída.'
  },
  fr: {
    add: 'Ajouter', delete: 'Supprimer', edit: 'Modifier', archive: 'Archiver', restore: 'Restaurer',
    select: 'Sélectionner', selected: 'Sélectionné', moreActions: 'Plus d’actions',
    fewerActions: 'Moins d’actions', chooseNextWin: 'Choisissez votre prochaine réussite.',
    todaySoFar: 'Aujourd’hui jusqu’ici', completedAction: 'action terminée',
    completedActions: 'actions terminées', totalSparkPoints: 'points Spark au total',
    viewProgress: 'Voir les progrès', adjustSuggestions: 'Ajuster les suggestions du jour',
    suggestedNextActions: 'Prochaines actions suggérées', readyWhenYouAre: 'Quand vous êtes prêt',
    minutesRemaining: 'minutes restantes', oneTarget: 'Un objectif',
    thoughtOrTask: 'Pensée ou tâche', savedForLater: 'Enregistré pour plus tard',
    recentCompletedActions: 'Actions récemment terminées', reviewProgress: 'Voir les progrès',
    myHabits: 'Mes habitudes', myRoutines: 'Mes routines', manageSettings: 'Gérer les réglages',
    languageCoverage: 'La navigation et les actions essentielles dans Aujourd’hui, Concentration, Capture et Progrès utilisent cette langue. Les guides et réglages avancés utilisent l’anglais si aucune traduction n’est incluse.'
  },
  de: {
    add: 'Hinzufügen', delete: 'Löschen', edit: 'Bearbeiten', archive: 'Archivieren', restore: 'Wiederherstellen',
    select: 'Auswählen', selected: 'Ausgewählt', moreActions: 'Mehr Aktionen',
    fewerActions: 'Weniger Aktionen', chooseNextWin: 'Wähle deinen nächsten Erfolg.',
    todaySoFar: 'Heute bisher', completedAction: 'erledigte Aktion',
    completedActions: 'erledigte Aktionen', totalSparkPoints: 'Spark-Punkte insgesamt',
    viewProgress: 'Fortschritt ansehen', adjustSuggestions: 'Heutige Vorschläge anpassen',
    suggestedNextActions: 'Vorgeschlagene nächste Aktionen', readyWhenYouAre: 'Wenn du bereit bist',
    minutesRemaining: 'Minuten verbleibend', oneTarget: 'Ein Ziel',
    thoughtOrTask: 'Gedanke oder Aufgabe', savedForLater: 'Für später gespeichert',
    recentCompletedActions: 'Kürzlich erledigte Aktionen', reviewProgress: 'Fortschritt ansehen',
    myHabits: 'Meine Gewohnheiten', myRoutines: 'Meine Routinen', manageSettings: 'Einstellungen verwalten',
    languageCoverage: 'Navigation und wichtige Aktionen in Heute, Fokus, Erfassen und Fortschritt verwenden diese Sprache. Erweiterte Anleitungen und Einstellungen verwenden Englisch, wenn keine Übersetzung enthalten ist.'
  },
  it: {
    add: 'Aggiungi', delete: 'Elimina', edit: 'Modifica', archive: 'Archivia', restore: 'Ripristina',
    select: 'Seleziona', selected: 'Selezionato', moreActions: 'Altre azioni',
    fewerActions: 'Meno azioni', chooseNextWin: 'Scegli il tuo prossimo successo.',
    todaySoFar: 'Oggi finora', completedAction: 'azione completata',
    completedActions: 'azioni completate', totalSparkPoints: 'punti Spark totali',
    viewProgress: 'Vedi progressi', adjustSuggestions: 'Regola i suggerimenti di oggi',
    suggestedNextActions: 'Prossime azioni suggerite', readyWhenYouAre: 'Quando sei pronto',
    minutesRemaining: 'minuti rimanenti', oneTarget: 'Un obiettivo',
    thoughtOrTask: 'Pensiero o attività', savedForLater: 'Salvato per dopo',
    recentCompletedActions: 'Azioni completate di recente', reviewProgress: 'Rivedi i progressi',
    myHabits: 'Le mie abitudini', myRoutines: 'Le mie routine', manageSettings: 'Gestisci impostazioni',
    languageCoverage: 'La navigazione e le azioni essenziali in Oggi, Focus, Cattura e Progressi usano questa lingua. Le guide e impostazioni avanzate usano l’inglese quando una traduzione non è inclusa.'
  },
  pl: {
    add: 'Dodaj', delete: 'Usuń', edit: 'Edytuj', archive: 'Archiwizuj', restore: 'Przywróć',
    select: 'Wybierz', selected: 'Wybrano', moreActions: 'Więcej działań',
    fewerActions: 'Mniej działań', chooseNextWin: 'Wybierz kolejne zwycięstwo.',
    todaySoFar: 'Dzisiaj do tej pory', completedAction: 'ukończone działanie',
    completedActions: 'ukończone działania', totalSparkPoints: 'punktów Spark łącznie',
    viewProgress: 'Zobacz postępy', adjustSuggestions: 'Dostosuj dzisiejsze sugestie',
    suggestedNextActions: 'Sugerowane następne działania', readyWhenYouAre: 'Kiedy będziesz gotowy',
    minutesRemaining: 'minut pozostało', oneTarget: 'Jeden cel',
    thoughtOrTask: 'Myśl lub zadanie', savedForLater: 'Zapisane na później',
    recentCompletedActions: 'Ostatnio ukończone działania', reviewProgress: 'Przejrzyj postępy',
    myHabits: 'Moje nawyki', myRoutines: 'Moje rutyny', manageSettings: 'Zarządzaj ustawieniami',
    languageCoverage: 'Nawigacja i najważniejsze działania na ekranach Dzisiaj, Skupienie, Zapisz i Postępy używają tego języka. Zaawansowane poradniki i ustawienia są po angielsku, jeśli tłumaczenie nie jest dołączone.'
  },
  uk: {
    add: 'Додати', delete: 'Видалити', edit: 'Редагувати', archive: 'Архівувати', restore: 'Відновити',
    select: 'Вибрати', selected: 'Вибрано', moreActions: 'Більше дій',
    fewerActions: 'Менше дій', chooseNextWin: 'Оберіть наступну перемогу.',
    todaySoFar: 'Сьогодні наразі', completedAction: 'виконана дія',
    completedActions: 'виконані дії', totalSparkPoints: 'балів Spark загалом',
    viewProgress: 'Переглянути прогрес', adjustSuggestions: 'Налаштувати сьогоднішні пропозиції',
    suggestedNextActions: 'Запропоновані наступні дії', readyWhenYouAre: 'Коли будете готові',
    minutesRemaining: 'хвилин залишилося', oneTarget: 'Одна ціль',
    thoughtOrTask: 'Думка або завдання', savedForLater: 'Збережено на потім',
    recentCompletedActions: 'Нещодавно виконані дії', reviewProgress: 'Переглянути прогрес',
    myHabits: 'Мої звички', myRoutines: 'Мої рутини', manageSettings: 'Керувати налаштуваннями',
    languageCoverage: 'Навігація й основні дії на екранах Сьогодні, Фокус, Занотувати та Прогрес використовують цю мову. Розширені посібники й налаштування показуються англійською, якщо переклад не включено.'
  },
  ru: {
    add: 'Добавить', delete: 'Удалить', edit: 'Изменить', archive: 'Архивировать', restore: 'Восстановить',
    select: 'Выбрать', selected: 'Выбрано', moreActions: 'Больше действий',
    fewerActions: 'Меньше действий', chooseNextWin: 'Выберите следующую победу.',
    todaySoFar: 'Сегодня на данный момент', completedAction: 'выполненное действие',
    completedActions: 'выполненные действия', totalSparkPoints: 'баллов Spark всего',
    viewProgress: 'Посмотреть прогресс', adjustSuggestions: 'Настроить сегодняшние предложения',
    suggestedNextActions: 'Предлагаемые следующие действия', readyWhenYouAre: 'Когда будете готовы',
    minutesRemaining: 'минут осталось', oneTarget: 'Одна цель',
    thoughtOrTask: 'Мысль или задача', savedForLater: 'Сохранено на потом',
    recentCompletedActions: 'Недавно выполненные действия', reviewProgress: 'Посмотреть прогресс',
    myHabits: 'Мои привычки', myRoutines: 'Мои рутины', manageSettings: 'Управлять настройками',
    languageCoverage: 'Навигация и основные действия на экранах Сегодня, Фокус, Записать и Прогресс используют этот язык. Расширенные руководства и настройки показываются на английском, если перевод не включён.'
  },
  lt: {
    add: 'Pridėti', delete: 'Ištrinti', edit: 'Redaguoti', archive: 'Archyvuoti', restore: 'Atkurti',
    select: 'Pasirinkti', selected: 'Pasirinkta', moreActions: 'Daugiau veiksmų',
    fewerActions: 'Mažiau veiksmų', chooseNextWin: 'Pasirinkite kitą laimėjimą.',
    todaySoFar: 'Šiandien jau', completedAction: 'atliktas veiksmas',
    completedActions: 'atlikti veiksmai', totalSparkPoints: 'iš viso „Spark“ taškų',
    viewProgress: 'Peržiūrėti pažangą', adjustSuggestions: 'Koreguoti šiandienos pasiūlymus',
    suggestedNextActions: 'Siūlomi kiti veiksmai', readyWhenYouAre: 'Kai būsite pasiruošę',
    minutesRemaining: 'liko minučių', oneTarget: 'Vienas tikslas',
    thoughtOrTask: 'Mintis arba užduotis', savedForLater: 'Išsaugota vėlesniam',
    recentCompletedActions: 'Naujausi atlikti veiksmai', reviewProgress: 'Peržiūrėti pažangą',
    myHabits: 'Mano įpročiai', myRoutines: 'Mano rutinos', manageSettings: 'Tvarkyti nustatymus',
    languageCoverage: 'Naršymas ir pagrindiniai veiksmai ekranuose Šiandien, Dėmesys, Užrašyti ir Pažanga rodomi šia kalba. Išplėstiniai vadovai ir nustatymai rodomi angliškai, jei vertimas dar neįtrauktas.'
  },
  ja: {
    add: '追加', delete: '削除', edit: '編集', archive: 'アーカイブ', restore: '復元',
    select: '選択', selected: '選択済み', moreActions: 'その他の操作', fewerActions: '操作を減らす',
    chooseNextWin: '次の達成を選びましょう。', todaySoFar: '今日ここまで',
    completedAction: '完了したアクション', completedActions: '完了したアクション',
    totalSparkPoints: 'Sparkポイント合計', viewProgress: '進捗を見る',
    adjustSuggestions: '今日の候補を調整', suggestedNextActions: '次のおすすめアクション',
    readyWhenYouAre: '準備ができたら', minutesRemaining: '分残り', oneTarget: '1つの目標',
    thoughtOrTask: '考えやタスク', savedForLater: 'あとで見るために保存',
    recentCompletedActions: '最近完了したアクション', reviewProgress: '進捗を確認',
    myHabits: '自分の習慣', myRoutines: '自分のルーティン', manageSettings: '設定を管理',
    languageCoverage: '「今日」「集中」「メモ」「進捗」のナビゲーションと主要操作はこの言語で表示されます。翻訳が含まれていない詳細ガイドと設定は英語で表示されます。'
  },
  ko: {
    add: '추가', delete: '삭제', edit: '수정', archive: '보관', restore: '복원',
    select: '선택', selected: '선택됨', moreActions: '더 많은 작업', fewerActions: '작업 줄이기',
    chooseNextWin: '다음 성취를 선택하세요.', todaySoFar: '오늘 지금까지',
    completedAction: '완료한 행동', completedActions: '완료한 행동', totalSparkPoints: '총 Spark 포인트',
    viewProgress: '진행 보기', adjustSuggestions: '오늘의 추천 조정',
    suggestedNextActions: '추천하는 다음 행동', readyWhenYouAre: '준비되면 시작하세요',
    minutesRemaining: '분 남음', oneTarget: '하나의 목표', thoughtOrTask: '생각 또는 할 일',
    savedForLater: '나중을 위해 저장됨', recentCompletedActions: '최근 완료한 행동',
    reviewProgress: '진행 확인', myHabits: '내 습관', myRoutines: '내 루틴',
    manageSettings: '설정 관리',
    languageCoverage: '오늘, 집중, 기록, 진행 화면의 탐색과 주요 작업은 이 언어로 표시됩니다. 번역이 포함되지 않은 고급 안내와 설정은 영어로 표시됩니다.'
  },
  'zh-Hans': {
    add: '添加', delete: '删除', edit: '编辑', archive: '归档', restore: '恢复',
    select: '选择', selected: '已选择', moreActions: '更多操作', fewerActions: '收起操作',
    chooseNextWin: '选择你的下一个成果。', todaySoFar: '今天到目前为止',
    completedAction: '项已完成操作', completedActions: '项已完成操作', totalSparkPoints: 'Spark 总积分',
    viewProgress: '查看进展', adjustSuggestions: '调整今天的建议',
    suggestedNextActions: '建议的下一步', readyWhenYouAre: '准备好时开始',
    minutesRemaining: '分钟剩余', oneTarget: '一个目标', thoughtOrTask: '想法或任务',
    savedForLater: '已保存供稍后处理', recentCompletedActions: '最近完成的操作',
    reviewProgress: '查看进展', myHabits: '我的习惯', myRoutines: '我的日程',
    manageSettings: '管理设置',
    languageCoverage: '“今天”、“专注”、“记录”和“进展”中的导航和主要操作使用此语言。尚未内置翻译的高级指南和设置将使用英语。'
  },
  hi: {
    add: 'जोड़ें', delete: 'हटाएँ', edit: 'संपादित करें', archive: 'संग्रहित करें', restore: 'वापस लाएँ',
    select: 'चुनें', selected: 'चुना गया', moreActions: 'और कार्रवाइयाँ', fewerActions: 'कम कार्रवाइयाँ',
    chooseNextWin: 'अपनी अगली जीत चुनें।', todaySoFar: 'आज अब तक',
    completedAction: 'पूरा किया गया काम', completedActions: 'पूरे किए गए काम',
    totalSparkPoints: 'कुल Spark अंक', viewProgress: 'प्रगति देखें',
    adjustSuggestions: 'आज के सुझाव बदलें', suggestedNextActions: 'सुझाए गए अगले काम',
    readyWhenYouAre: 'जब आप तैयार हों', minutesRemaining: 'मिनट बाकी', oneTarget: 'एक लक्ष्य',
    thoughtOrTask: 'विचार या काम', savedForLater: 'बाद के लिए सहेजा गया',
    recentCompletedActions: 'हाल में पूरे किए गए काम', reviewProgress: 'प्रगति देखें',
    myHabits: 'मेरी आदतें', myRoutines: 'मेरी दिनचर्याएँ', manageSettings: 'सेटिंग्स प्रबंधित करें',
    languageCoverage: 'आज, ध्यान, लिखें और प्रगति में नेविगेशन और मुख्य कार्रवाइयाँ इस भाषा में दिखती हैं। जिन उन्नत गाइड और सेटिंग्स का अनुवाद शामिल नहीं है, वे अंग्रेज़ी में दिखती हैं।'
  },
  ar: {
    add: 'إضافة', delete: 'حذف', edit: 'تعديل', archive: 'أرشفة', restore: 'استعادة',
    select: 'تحديد', selected: 'محدد', moreActions: 'إجراءات إضافية', fewerActions: 'إجراءات أقل',
    chooseNextWin: 'اختر إنجازك التالي.', todaySoFar: 'اليوم حتى الآن',
    completedAction: 'إجراء مكتمل', completedActions: 'إجراءات مكتملة',
    totalSparkPoints: 'إجمالي نقاط Spark', viewProgress: 'عرض التقدم',
    adjustSuggestions: 'تعديل اقتراحات اليوم', suggestedNextActions: 'الإجراءات التالية المقترحة',
    readyWhenYouAre: 'عندما تكون مستعدًا', minutesRemaining: 'دقائق متبقية', oneTarget: 'هدف واحد',
    thoughtOrTask: 'فكرة أو مهمة', savedForLater: 'محفوظ لوقت لاحق',
    recentCompletedActions: 'الإجراءات المكتملة مؤخرًا', reviewProgress: 'مراجعة التقدم',
    myHabits: 'عاداتي', myRoutines: 'روتيني', manageSettings: 'إدارة الإعدادات',
    languageCoverage: 'يستخدم التنقل والإجراءات الأساسية في اليوم والتركيز والتدوين والتقدم هذه اللغة. تستخدم الأدلة والإعدادات المتقدمة الإنجليزية عندما لا تكون الترجمة مضمنة.'
  },
  nl: {
    add: 'Toevoegen', delete: 'Verwijderen', edit: 'Bewerken', archive: 'Archiveren', restore: 'Herstellen',
    select: 'Selecteren', selected: 'Geselecteerd', moreActions: 'Meer acties', fewerActions: 'Minder acties',
    chooseNextWin: 'Kies je volgende succes.', todaySoFar: 'Vandaag tot nu toe',
    completedAction: 'voltooide actie', completedActions: 'voltooide acties',
    totalSparkPoints: 'Spark-punten in totaal', viewProgress: 'Voortgang bekijken',
    adjustSuggestions: 'Suggesties voor vandaag aanpassen', suggestedNextActions: 'Voorgestelde volgende acties',
    readyWhenYouAre: 'Wanneer je er klaar voor bent', minutesRemaining: 'minuten resterend',
    oneTarget: 'Eén doel', thoughtOrTask: 'Gedachte of taak', savedForLater: 'Opgeslagen voor later',
    recentCompletedActions: 'Recent voltooide acties', reviewProgress: 'Voortgang bekijken',
    myHabits: 'Mijn gewoonten', myRoutines: 'Mijn routines', manageSettings: 'Instellingen beheren',
    languageCoverage: 'Navigatie en belangrijke acties in Vandaag, Focus, Vastleggen en Voortgang gebruiken deze taal. Geavanceerde handleidingen en instellingen gebruiken Engels als er geen vertaling is meegeleverd.'
  },
  tr: {
    add: 'Ekle', delete: 'Sil', edit: 'Düzenle', archive: 'Arşivle', restore: 'Geri yükle',
    select: 'Seç', selected: 'Seçildi', moreActions: 'Daha fazla işlem', fewerActions: 'Daha az işlem',
    chooseNextWin: 'Sıradaki başarını seç.', todaySoFar: 'Bugün şu ana kadar',
    completedAction: 'tamamlanan eylem', completedActions: 'tamamlanan eylem',
    totalSparkPoints: 'toplam Spark puanı', viewProgress: 'İlerlemeyi gör',
    adjustSuggestions: 'Bugünün önerilerini ayarla', suggestedNextActions: 'Önerilen sonraki eylemler',
    readyWhenYouAre: 'Hazır olduğunda', minutesRemaining: 'dakika kaldı', oneTarget: 'Tek hedef',
    thoughtOrTask: 'Düşünce veya görev', savedForLater: 'Sonrası için kaydedildi',
    recentCompletedActions: 'Yakın zamanda tamamlanan eylemler', reviewProgress: 'İlerlemeyi gözden geçir',
    myHabits: 'Alışkanlıklarım', myRoutines: 'Rutinlerim', manageSettings: 'Ayarları yönet',
    languageCoverage: 'Bugün, Odak, Not al ve İlerleme ekranlarındaki gezinme ve temel işlemler bu dili kullanır. Çevirisi bulunmayan gelişmiş rehberler ve ayarlar İngilizce gösterilir.'
  },
  id: {
    add: 'Tambah', delete: 'Hapus', edit: 'Edit', archive: 'Arsipkan', restore: 'Pulihkan',
    select: 'Pilih', selected: 'Dipilih', moreActions: 'Tindakan lainnya', fewerActions: 'Lebih sedikit tindakan',
    chooseNextWin: 'Pilih keberhasilan berikutnya.', todaySoFar: 'Hari ini sejauh ini',
    completedAction: 'tindakan selesai', completedActions: 'tindakan selesai',
    totalSparkPoints: 'total poin Spark', viewProgress: 'Lihat kemajuan',
    adjustSuggestions: 'Sesuaikan saran hari ini', suggestedNextActions: 'Saran tindakan berikutnya',
    readyWhenYouAre: 'Saat Anda siap', minutesRemaining: 'menit tersisa', oneTarget: 'Satu target',
    thoughtOrTask: 'Pikiran atau tugas', savedForLater: 'Disimpan untuk nanti',
    recentCompletedActions: 'Tindakan yang baru selesai', reviewProgress: 'Tinjau kemajuan',
    myHabits: 'Kebiasaan saya', myRoutines: 'Rutinitas saya', manageSettings: 'Kelola pengaturan',
    languageCoverage: 'Navigasi dan tindakan penting di Hari ini, Fokus, Catat, dan Kemajuan menggunakan bahasa ini. Panduan dan pengaturan lanjutan menggunakan bahasa Inggris jika terjemahan belum disertakan.'
  },
  vi: {
    add: 'Thêm', delete: 'Xóa', edit: 'Sửa', archive: 'Lưu trữ', restore: 'Khôi phục',
    select: 'Chọn', selected: 'Đã chọn', moreActions: 'Thêm thao tác', fewerActions: 'Bớt thao tác',
    chooseNextWin: 'Chọn thành quả tiếp theo.', todaySoFar: 'Hôm nay đến lúc này',
    completedAction: 'hành động đã hoàn thành', completedActions: 'hành động đã hoàn thành',
    totalSparkPoints: 'tổng điểm Spark', viewProgress: 'Xem tiến độ',
    adjustSuggestions: 'Điều chỉnh gợi ý hôm nay', suggestedNextActions: 'Hành động tiếp theo được gợi ý',
    readyWhenYouAre: 'Khi bạn sẵn sàng', minutesRemaining: 'phút còn lại', oneTarget: 'Một mục tiêu',
    thoughtOrTask: 'Ý nghĩ hoặc nhiệm vụ', savedForLater: 'Đã lưu để xem sau',
    recentCompletedActions: 'Hành động vừa hoàn thành', reviewProgress: 'Xem lại tiến độ',
    myHabits: 'Thói quen của tôi', myRoutines: 'Quy trình của tôi', manageSettings: 'Quản lý cài đặt',
    languageCoverage: 'Điều hướng và các thao tác chính trong Hôm nay, Tập trung, Ghi lại và Tiến độ dùng ngôn ngữ này. Hướng dẫn và cài đặt nâng cao dùng tiếng Anh khi chưa có bản dịch đi kèm.'
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

export function resolveLocale(setting?: AppSettings['language']): SupportedLocale {
  if (setting && setting !== 'system') return setting;
  return normalizeLocale(getLocales()[0]?.languageTag);
}

export function translate(locale: SupportedLocale, key: TranslationKey): string {
  return dailyTranslations[locale][key] ?? translations[locale][key] ?? en[key];
}

export function hasBundledTranslation(
  locale: SupportedLocale,
  key: TranslationKey
): boolean {
  return locale === 'en' || Boolean(dailyTranslations[locale][key] ?? translations[locale][key]);
}

export function isRtlLocale(locale: SupportedLocale): boolean {
  return locale === 'ar';
}

export function useI18n() {
  const { settings } = useSpark();
  const locale = resolveLocale(settings.language);
  return {
    locale,
    isRTL: isRtlLocale(locale),
    t: (key: TranslationKey) => translate(locale, key)
  };
}
