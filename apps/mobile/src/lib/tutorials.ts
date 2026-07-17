export type TutorialId =
  | 'getting-started'
  | 'habits-and-sizes'
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
    summary: 'Understand Today, a win, and Spark points.',
    destination: '/(tabs)',
    actionLabel: 'Open Today',
    category: 'start',
    pages: [
      { title: 'Choose your next action', body: 'Today matches suggestions to your available energy, time, and place.' },
      { title: 'Turn actions into wins', body: 'Tap Done after completing an action. The win appears immediately in Progress.' },
      { title: 'Points show action size', body: 'Tiny earns 1, standard earns 2, and stretch earns 3. These fixed values build your progress total.' }
    ]
  },
  {
    id: 'habits-and-sizes',
    icon: '🌱',
    title: 'Habits and action sizes',
    summary: 'Build a habit with tiny, standard, and stretch options.',
    destination: '/habit/new',
    actionLabel: 'Create a habit',
    category: 'start',
    pages: [
      { title: 'One habit, several action sizes', body: 'A habit is something you want to repeat. Tiny, standard, and stretch versions let it fit low-, ordinary-, and high-energy days.' },
      { title: 'Make tiny one clear move', body: 'A tiny version can be one sip, one sentence, or opening the document.' },
      { title: 'Shape what appears next', body: 'Editing, deferring, or pausing updates future suggestions while completed actions remain in Progress.' }
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
      { title: 'Name the next tiny move', body: 'After focus, a transition nudge can capture the next action while the task is still visible.' }
    ]
  },
  {
    id: 'capture',
    icon: '📝',
    title: 'Quick Capture',
    summary: 'Park thoughts fast, then decide what they become later.',
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
      { title: 'Open the device share sheet', body: 'After previewing the image or text, choose a person or app from your device’s share sheet.' }
    ]
  },
  {
    id: 'widgets',
    icon: '▦',
    title: 'Home-screen widgets',
    summary: 'Keep Today, Capture, Focus, a routine step, progress, and tools visible.',
    category: 'privacy',
    pages: [
      { title: 'Put it where you already look', body: 'Android widgets can show the next action, timer state, current routine step, progress, capture field, or a small toolkit without opening menus first.' },
      { title: 'Add from the launcher', body: 'Long-press an empty home-screen area, choose Widgets, find Spark, then drag the size you want.' },
      { title: 'Refreshes are intentionally light', body: 'Widgets read a small local snapshot. They do not use a server, advertising ID, or paid background service.' }
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
      { title: 'Keep an export you control', body: 'Manual and optional automatic-folder backups do not require an account. Cloud support remains off unless configured and enabled.' }
    ]
  }
];

export function tutorialById(id: string | undefined) {
  return tutorialTopics.find((topic) => topic.id === id);
}
