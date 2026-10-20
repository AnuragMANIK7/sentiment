// All copy lives here. Items marked placeholder must be replaced by the course owner.
export const site = {
  name: 'ShubhLabh AI Course',
  short: 'ShubhLabh',
  devanagari: 'शुभ लाभ',
  url: 'https://shubhlabh.example', // placeholder
  email: 'hello@shubhlabh.example', // placeholder
  title: 'Learn AI, keep the gain',
  description:
    'An eight week live AI course for working people. Learn how models behave, automate a real task of your own, and leave with a workflow you trust.',
};

export const chapters = [
  {
    key: 'noise',
    label: 'Noise',
    title: 'Learn AI. Keep the gain.',
    body: 'An eight week live course for people who work for a living and want AI to do some of it.',
  },
  {
    key: 'pattern',
    label: 'Pattern',
    title: 'Most of AI is noise.',
    body: 'Hype, tools that change every week, demos that never work twice. We start by taking all of that away.',
  },
  {
    key: 'structure',
    label: 'Structure',
    title: 'Under the noise is structure.',
    body: 'A model is layers of simple parts. See the layers and you can predict where it helps and where it fails.',
  },
  {
    key: 'gain',
    label: 'Gain',
    title: 'Then you keep what you gain.',
    body: 'By week eight, one task from your own job runs on a workflow you built and checked yourself.',
  },
];

export const modules = [
  {
    week: 1,
    title: 'How models think',
    line: 'Tokens, context, and why a fluent answer can be wrong.',
    detail:
      'You read real model failures side by side with real successes, then learn the three questions that tell them apart before you trust an answer.',
  },
  {
    week: 2,
    title: 'Prompting as specifying',
    line: 'Write instructions the way a good brief is written.',
    detail:
      'Roles, examples, constraints and output formats. You rewrite five of your own messy requests until the results stop varying.',
  },
  {
    week: 3,
    title: 'Your first automations',
    line: 'Connect email, sheets and forms without writing code.',
    detail:
      'You pick one repeated task from your own week and automate its first half. Nothing is pre-built, so the mistakes are yours to learn from.',
  },
  {
    week: 4,
    title: 'Agents and tools',
    line: 'Let a model call tools, and learn where to stop it.',
    detail:
      'Search, calculators and your own files as tools. We set budgets and hard stops so an agent cannot wander off with your afternoon.',
  },
  {
    week: 5,
    title: 'Chat with your own documents',
    line: 'Retrieval, so answers come from your files and not memory.',
    detail:
      'You build a private assistant over a folder of your documents and test it with questions you already know the answers to.',
  },
  {
    week: 6,
    title: 'Python and APIs, just enough',
    line: 'Read and change real code without becoming a developer.',
    detail:
      'Small scripts that call a model API, handle errors and save results. The goal is reading code with confidence, not memorising syntax.',
  },
  {
    week: 7,
    title: 'Checking before trusting',
    line: 'Evaluation, sampling and a review habit you can keep.',
    detail:
      'You build a short test set for your workflow and measure it. Anything that fails the test does not ship, including your own work.',
  },
  {
    week: 8,
    title: 'Capstone: your workflow',
    line: 'One real task from your job, running end to end.',
    detail:
      'You present your workflow, what it saves, what it still gets wrong and how you will watch it. Feedback comes from the instructor and the cohort.',
  },
];

export const outcomes = [
  { when: 'Week 3', text: 'An automation that handles part of a task you repeat every week.' },
  { when: 'Week 5', text: 'A private assistant that answers from your own documents.' },
  { when: 'Week 7', text: 'A test set that tells you when to trust the output and when not to.' },
  { when: 'Week 8', text: 'One complete workflow from your own job, presented and reviewed.' },
];

export const forYes = [
  'You use a computer for work and repeat tasks that feel like they should be automatic.',
  'You have tried chat tools, got uneven results, and want to know why.',
  'You are comfortable with spreadsheets and email. Code is not required.',
];
export const forNo = [
  'You want a research degree in machine learning. This is a working course.',
  'You want a certificate to hang on a wall more than a workflow to run.',
  'You cannot spend a few hours each week on practice. The gain comes from the practice.',
];

export const format = [
  { k: 'Live', v: 'Two evening sessions a week, with recordings if you miss one.' },
  { k: 'Practice', v: 'A small assignment each week, reviewed by the instructor.' },
  { k: 'Cohort', v: 'A small group, so questions get real answers.' },
  { k: 'Tools', v: 'Free tiers wherever possible. Nothing to buy before week one.' },
];

export const faqs = [
  {
    q: 'Do I need to know how to code?',
    a: 'No. Week 6 teaches enough Python to read and adjust small scripts. Everything before it needs no code at all.',
  },
  {
    q: 'What does the name mean?',
    a: 'Shubh Labh is written on ledgers and doorways at Diwali. It means auspicious gain. We took it literally: learn carefully, and keep what you earn.',
  },
  {
    q: 'When does the first cohort start, and what does it cost?',
    a: 'Dates and the fee are shared with the waitlist first. Join below and you will hear before the public announcement.',
  },
  {
    q: 'Will the tools I learn go out of date?',
    a: 'Tools change monthly. The course teaches how models behave and how to check their work, and those habits carry over to whatever you use next.',
  },
  {
    q: 'What if I fall behind?',
    a: 'Every session is recorded and every assignment can be handed in late. You are asked to finish the capstone, not to keep a perfect streak.',
  },
];
