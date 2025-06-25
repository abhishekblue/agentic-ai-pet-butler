// questions.ts
export const onboardingQuestions = [
  {
    field: 'name',
    text: 'Hello there! I\'m your Pet Butler. What\'s your name?',
    key: 'userName', // Added a key for clarity in onboarding_state
  },
  {
    field: 'petName',
    text: 'Great to meet you! What\'s your pet\'s name?',
    key: 'petName',
  },
  {
    field: 'petType',
    text: 'And what type of pet is {{petName}}? (e.g., Dog, Cat, Bird, etc.)',
    key: 'petType',
  },
  {
    field: 'petBreed',
    text: 'Do you know {{petName}}\'s breed? If not, no worries!',
    key: 'petBreed',
  },
  {
    field: 'petDob',
    text: 'What is {{petName}}\'s date of birth? (YYYY-MM-DD, or "unknown" if you don\'t know)',
    key: 'petDob',
  },
  {
    field: 'petPreferences',
    text: 'Awesome! Just a few questions about {{petName}}\'s preferences. For example, "likes chicken, allergic to beef, needs daily walks".',
    key: 'petPreferences',
  },
];