export type TutorialId =
  | 'getting-started'
  | 'schedules'
  | 'habits-and-sizes'
  | 'adaptive-suggestions'
  | 'calendar'
  | 'rewards'
  | 'insights'
  | 'momentum'
  | 'focus'
  | 'capture'
  | 'routines'
  | 'planning'
  | 'experiments'
  | 'progress-sharing'
  | 'widgets'
  | 'reminders-privacy';

export interface TutorialTopic {
  id: TutorialId;
  icon: string;
  title: string;
  summary: string;
  destination?: string;
  actionLabel?: string;
  category: TutorialCategory;
  pages: { title: string; body: string }[];
}

export type TutorialCategory = 'start' | 'daily' | 'planning' | 'privacy';

export const tutorialCategories: {
  id: TutorialCategory;
  title: string;
  summary: string;
}[] = [
  { id: 'start', title: 'Start here', summary: 'The basics for your first few minutes.' },
  { id: 'daily', title: 'Daily tools', summary: 'Focus, capture, routines, and clear starts.' },
  { id: 'planning', title: 'Planning & progress', summary: 'Optional streaks, weekly planning, and sharing.' },
  { id: 'privacy', title: 'Widgets, reminders & privacy', summary: 'Keep Spark visible and understand where data stays.' }
];

export const tutorialTopics: TutorialTopic[] = [
  {
    id: 'getting-started',
    icon: '✨',
    title: 'Your first five minutes',
    summary: 'Create a habit, see Today, and record a completion.',
    destination: '/(tabs)',
    actionLabel: 'Open Today',
    category: 'start',
    pages: [
      { title: 'Create one habit', body: 'Give it a short name and choose how often it should appear. Those are the only required choices.' },
      { title: 'See what is ready today', body: 'Today lists habits whose schedule is ready. Optional tools stay hidden until you enable them.' },
      { title: 'Tap Done after doing it', body: 'The completion appears in the Week, Month, and Record views of the habit calendar.' }
    ]
  },
  {
    id: 'schedules',
    icon: '🗓️',
    title: 'Choose how often',
    summary: 'Daily, selected days, weekly targets, intervals, or completion-shifted dates.',
    destination: '/habit/new',
    actionLabel: 'Create a habit',
    category: 'start',
    pages: [
      { title: 'Frequency is part of every habit', body: 'A new habit is not assumed to be daily. You choose a schedule before saving it.' },
      { title: 'Fixed or flexible', body: 'Choose exact weekdays, a flexible number of times each week, fixed calendar intervals, or whenever you want.' },
      { title: 'Shift from completion', body: '“After I complete it” schedules the next date from the day you actually finish. Completing late moves the following date too.' }
    ]
  },
  {
    id: 'habits-and-sizes',
    icon: '🌱',
    title: 'Habits and action sizes',
    summary: 'Keep a habit yes-or-no, or add smaller and larger options.',
    destination: '/habit/new',
    actionLabel: 'Create a habit',
    category: 'start',
    pages: [
      { title: 'Most habits can stay simple', body: 'A habit can have one Done button. This works well for taking vitamins or any clear yes-or-no action.' },
      { title: 'Sizes are optional', body: 'Turn on different action sizes only when smaller and larger versions are genuinely useful.' },
      { title: 'Make tiny one clear move', body: 'A tiny version can be one sip, one sentence, or opening the document.' },
      { title: 'Hide the choices globally', body: 'Optional Features can hide size choices on Today without deleting the versions stored with a habit.' }
    ]
  },
  {
    id: 'adaptive-suggestions',
    icon: '🎛️',
    title: 'Adjust suggestions',
    summary: 'Use energy, time, and place only when those filters are useful.',
    destination: '/features',
    actionLabel: 'Manage optional features',
    category: 'daily',
    pages: [
      { title: 'Off by default', body: 'Today normally follows only each habit’s schedule and order.' },
      { title: 'Add context when useful', body: 'When enabled, you can optionally choose energy, available time, and place to change the order.' },
      { title: 'The schedule still wins', body: 'Adjusting suggestions never changes how often a habit is scheduled.' }
    ]
  },
  {
    id: 'calendar',
    icon: '▦',
    title: 'Week, Month, and Record',
    summary: 'Read the habit calendar and open detailed history.',
    destination: '/(tabs)/journey',
    actionLabel: 'Open Calendar',
    category: 'planning',
    pages: [
      { title: 'Week keeps the list compact', body: 'Each row is a habit and each colored square is a completion.' },
      { title: 'Month shows the wider pattern', body: 'Scheduled days use a quiet outline. The calendar does not display a failure score for blank days.' },
      { title: 'Record manages details', body: 'Review totals, edit a habit, open exact completion history, or add another habit.' }
    ]
  },
  {
    id: 'rewards',
    icon: '✦',
    title: 'Optional points and levels',
    summary: 'Add a game-like progress total without changing completion history.',
    destination: '/features',
    actionLabel: 'Manage optional features',
    category: 'planning',
    pages: [
      { title: 'Completion is the main record', body: 'The calendar and completion count work without points.' },
      { title: 'Points are an optional layer', body: 'When enabled, regular completion records contribute to a simple local total and level.' },
      { title: 'Turn them off at any time', body: 'Hiding points does not remove habits or completion history.' }
    ]
  },
  {
    id: 'insights',
    icon: '🔎',
    category: 'planning',
    title: 'Helpful patterns',
    summary: 'Optional observations calculated privately on your device.',
    destination: '/features',
    actionLabel: 'Manage optional features',
    pages: [
      { title: 'Look for useful conditions', body: 'When enabled, Spark compares your own completion and focus history to notice practical patterns such as times or places that worked well.' },
      { title: 'These are suggestions, not scores', body: 'A pattern is a neutral observation you can use or ignore. It does not change a habit or its schedule.' },
      { title: 'Your history stays local', body: 'Pattern calculations happen on your phone and do not require an account or online service.' }
    ]
  },
  {
    id: 'momentum',
    icon: '🔥',
    title: 'Optional streaks',
    summary: 'Build a daily or every-other-day streak and celebrate personal bests.',
    destination: '/(tabs)/journey',
    actionLabel: 'Review my streaks',
    category: 'planning',
    pages: [
      { title: 'Choose how often', body: 'Each habit can use a daily streak, an every-other-day streak, or no streak at all.' },
      { title: 'Celebrate consistency', body: 'Current streaks, completed periods, and personal bests show how often you returned.' },
      { title: 'Use streak saves and planned breaks', body: 'These maintain streak continuity for selected periods. Completed-action history continues to come from Done taps.' }
    ]
  },
  {
    id: 'focus',
    icon: '⏱️',
    title: 'Focus timer and companion',
    summary: 'Use a small timer with a quiet on-screen companion.',
    destination: '/(tabs)/focus',
    actionLabel: 'Open Focus',
    category: 'daily',
    pages: [
      { title: 'Choose a focused time block', body: 'Set a clear container for working beside a task. Start with two minutes or choose a longer block.' },
      { title: 'Pause and resume', body: 'The Focus screen and Focus widget keep the active timer state visible and ready to resume.' },
      { title: 'Name the next tiny move', body: 'After focus, Spark can ask for the next small action while the task is still visible.' }
    ]
  },
  {
    id: 'capture',
    icon: '📝',
    title: 'Quick Capture',
    summary: 'Save thoughts fast, then decide what they become later.',
    destination: '/quick-capture',
    actionLabel: 'Quick capture a thought',
    category: 'daily',
    pages: [
      { title: 'Get it out of working memory', body: 'Capture accepts an unfinished thought without asking you to organize it immediately.' },
      { title: 'Process when you have room', body: 'Later, turn an item into a habit, a focus session, or a routine step—or simply archive it.' },
      { title: 'Use the shortcut', body: 'The Capture widget opens directly to the field, reducing the number of decisions before writing.' }
    ]
  },
  {
    id: 'routines',
    icon: '🧩',
    title: 'Routines, one step at a time',
    summary: 'Follow, shrink, skip, and resume multi-step sequences.',
    destination: '/routine/new',
    actionLabel: 'Create a routine',
    category: 'daily',
    pages: [
      { title: 'Only the current step', body: 'Routine mode keeps the next step prominent so the full list does not compete for attention.' },
      { title: 'Choose an action size or skip', body: 'Use the tiny version, regular version, or skip a step while moving through the routine.' },
      { title: 'Leave and come back', body: 'Spark stores a paused routine on this device and shows a Resume option on Today.' }
    ]
  },
  {
    id: 'planning',
    icon: '🗓️',
    title: 'Plan the week and leave on time',
    summary: 'Make fewer decisions later and include time to get ready.',
    destination: '/weekly-reset',
    actionLabel: 'Plan my week',
    category: 'planning',
    pages: [
      { title: 'Choose weekly highlights', body: 'Weekly planning keeps up to three selected habits visible.' },
      { title: 'Set up tomorrow’s first action', body: 'Choose tomorrow’s likely context and one tiny starting point.' },
      { title: 'Work backward from leaving time', body: 'The leave-on-time tool combines when you need to leave, extra preparation time, and an optional routine. It only adds an event when you deliberately export it.' }
    ]
  },
  {
    id: 'experiments',
    icon: '🔎',
    title: 'Try a change for a week',
    summary: 'Try one small change, then review a simple before-and-after count.',
    destination: '/experiments',
    actionLabel: 'Try a change',
    category: 'planning',
    pages: [
      { title: 'Ask a small question', body: 'Try presenting the tiny version first or moving a reminder to the afternoon for one week.' },
      { title: 'Choose the exact change', body: 'You choose the change, the habit, and when to stop. Spark stores the one-week try on your device.' },
      { title: 'Compare completed actions', body: 'Review the before-and-during counts, add your own note, and decide which setup to keep.' }
    ]
  },
  {
    id: 'progress-sharing',
    icon: '📈',
    title: 'Progress and deliberate sharing',
    summary: 'Review wins and share only the moments you choose.',
    destination: '/(tabs)/journey',
    actionLabel: 'Review my progress',
    category: 'planning',
    pages: [
      { title: 'See your wins over time', body: 'Progress shows completed actions, points, activity, streaks, and personal bests.' },
      { title: 'Choose the story yourself', body: 'A progress card contains the exact wins you select and preview.' },
      { title: 'Open your phone’s Share menu', body: 'After previewing the image or text, choose a person or app from your phone’s Share menu.' }
    ]
  },
  {
    id: 'widgets',
    icon: '▦',
    title: 'Home-screen widgets',
    summary: 'Keep Today, the habit calendar, Capture, Focus, routines, and tools visible.',
    category: 'privacy',
    pages: [
      { title: 'Put it where you already look', body: 'Android widgets can show the next action, a monthly habit calendar, timer state, current routine step, capture, or a small toolkit.' },
      { title: 'Add from your home screen', body: 'Long-press an empty home-screen area, choose Widgets, find Spark, then drag the size you want.' },
      { title: 'Uses data already on your phone', body: 'Widgets update from Spark data on this device. They do not need a Spark account or cloud service.' }
    ]
  },
  {
    id: 'reminders-privacy',
    icon: '🔒',
    title: 'Reminders, privacy, and backups',
    summary: 'Control invitations and protect local data.',
    destination: '/settings',
    actionLabel: 'Open Settings',
    category: 'privacy',
    pages: [
      { title: 'Reminders are invitations', body: 'Notifications are scheduled on your device, capped, snoozable, and can hide habit names on the lock screen.' },
      { title: 'Your main data stays local', body: 'Habits, completed actions, captured thoughts, routines, and one-week tries stay in the encrypted storage on your device.' },
      { title: 'Keep an export you control', body: 'Manual and optional automatic-folder backups do not require an account. Online support stays off unless you turn it on in Settings.' }
    ]
  }
];

export function tutorialById(id: string | undefined) {
  return tutorialTopics.find((topic) => topic.id === id);
}
