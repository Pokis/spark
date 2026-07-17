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
  pages: { title: string; body: string }[];
}

export const tutorialTopics: TutorialTopic[] = [
  {
    id: 'getting-started',
    icon: '✨',
    title: 'Your first five minutes',
    summary: 'Understand Today, a win, and Spark points.',
    destination: '/(tabs)',
    actionLabel: 'Open Today',
    pages: [
      { title: 'Today is a menu, not a demand', body: 'Choose an action that fits. Nothing becomes overdue and an empty day does not create a failure.' },
      { title: 'Log only what happened', body: 'Tap Log after doing an action. A win is simply a completion you deliberately recorded.' },
      { title: 'Points explain effort size', body: 'Tiny earns 1, standard earns 2, and stretch earns 3. Points never expire, unlock necessities, or appear randomly.' }
    ]
  },
  {
    id: 'habits-and-sizes',
    icon: '🌱',
    title: 'Habits and action sizes',
    summary: 'Build a habit with tiny, standard, and stretch options.',
    destination: '/habit/new',
    actionLabel: 'Create a habit',
    pages: [
      { title: 'One intention, several doorways', body: 'A habit is what you want to repeat. Its action sizes let the same intention fit low-, ordinary-, and high-capacity days.' },
      { title: 'Make tiny genuinely tiny', body: 'A tiny version should feel almost too easy: one sip, one sentence, or opening the document.' },
      { title: 'Pause without losing history', body: 'Editing, deferring, or pausing changes what Spark shows next. It never deletes your ordinary progress.' }
    ]
  },
  {
    id: 'momentum',
    icon: '🔥',
    title: 'Rewardable momentum',
    summary: 'Optional daily or every-other-day continuity without punishment.',
    destination: '/(tabs)/journey',
    actionLabel: 'Review Momentum',
    pages: [
      { title: 'Choose your rhythm', body: 'Each habit can use daily windows, two-day windows, or no momentum streak at all.' },
      { title: 'Continuity is a bonus', body: 'Current and best momentum celebrate showing up. Your wins and points remain even when a chain ends.' },
      { title: 'Use flexibility on purpose', body: 'Flex passes and planned delays preserve continuity without inventing a completion.' }
    ]
  },
  {
    id: 'focus',
    icon: '⏱️',
    title: 'Focus and body doubling',
    summary: 'Start beside a calm companion and recover after interruptions.',
    destination: '/(tabs)/focus',
    actionLabel: 'Open Focus',
    pages: [
      { title: 'Pick a small container', body: 'A focus session is time beside a task, not a promise to finish it. Two minutes is a valid session.' },
      { title: 'Pause and resume', body: 'The Focus screen and Focus widget keep the active timer visible. Pausing does not count as failure.' },
      { title: 'Name the next tiny move', body: 'After focus, Spark can offer a transition nudge so the next start is easier to remember.' }
    ]
  },
  {
    id: 'capture',
    icon: '📝',
    title: 'Quick Capture',
    summary: 'Park thoughts fast, then decide what they become later.',
    destination: '/quick-capture',
    actionLabel: 'Quick capture a thought',
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
    pages: [
      { title: 'Only the current step', body: 'Routine mode keeps the next step prominent so the full list does not compete for attention.' },
      { title: 'Shrink or skip safely', body: 'Use the tiny version or skip a step when needed. The routine remains yours, not a rigid checklist.' },
      { title: 'Leave and come back', body: 'Spark stores a paused routine locally and offers a resume doorway on Today.' }
    ]
  },
  {
    id: 'planning',
    icon: '🗓️',
    title: 'Weekly reset and Departure mode',
    summary: 'Reduce future decisions and leave with a realistic buffer.',
    destination: '/weekly-reset',
    actionLabel: 'Open weekly reset',
    pages: [
      { title: 'Choose a small weekly menu', body: 'Weekly reset highlights a few intentions. It does not create missed tasks or a rigid schedule.' },
      { title: 'Prepare tomorrow gently', body: 'Choose tomorrow’s context and one tiny starting point while the decision is easier.' },
      { title: 'Count backward to leave', body: 'Departure mode combines a target time, buffer, and optional routine. Calendar export is deliberate and write-only.' }
    ]
  },
  {
    id: 'experiments',
    icon: '🔎',
    title: 'Personal experiments',
    summary: 'Try one change for a week and review a neutral local comparison.',
    destination: '/experiments',
    actionLabel: 'Open personal experiments',
    pages: [
      { title: 'Ask a small question', body: 'Try presenting the tiny version first or moving a reminder to the afternoon for one week.' },
      { title: 'Spark does not experiment on you', body: 'You choose the experiment. There is no A/B assignment, engagement optimization, account, or analytics service.' },
      { title: 'Review without a verdict', body: 'Spark compares local before-and-during counts and uses neutral language. You decide what, if anything, to keep.' }
    ]
  },
  {
    id: 'progress-sharing',
    icon: '📈',
    title: 'Progress and deliberate sharing',
    summary: 'Review wins and share only the moments you choose.',
    destination: '/(tabs)/journey',
    actionLabel: 'Review my progress',
    pages: [
      { title: 'History stays intact', body: 'Progress shows logged wins, points, rhythm, and best momentum without turning blank days into debts.' },
      { title: 'Choose the story yourself', body: 'A progress card contains only the wins you select. Spark never reports automatically or connects to another person’s account.' },
      { title: 'Sharing is optional', body: 'Preview the image or text first, then use the device share sheet—or leave it entirely private.' }
    ]
  },
  {
    id: 'widgets',
    icon: '▦',
    title: 'Home-screen widgets',
    summary: 'Keep Today, Capture, Focus, Progress, and tools visible.',
    pages: [
      { title: 'Put the doorway where you look', body: 'Android widgets can show the next action, timer state, progress, capture field, or a small toolkit without opening menus first.' },
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
    pages: [
      { title: 'Reminders are invitations', body: 'Notifications are scheduled on your device, capped, snoozable, and can hide habit names on the lock screen.' },
      { title: 'Your core data stays local', body: 'Habits, completions, capture, routines, and experiments use the encrypted app database in production builds.' },
      { title: 'Keep an export you control', body: 'Manual and optional automatic-folder backups do not require an account. Cloud support remains off unless configured and enabled.' }
    ]
  }
];

export function tutorialById(id: string | undefined) {
  return tutorialTopics.find((topic) => topic.id === id);
}
