import { ConversationFlow, FlowKey, HistoryItem, SuggestionChip } from '../models/assistant.models';

export const SUGGESTIONS: readonly SuggestionChip[] = [
  { label: 'ASSISTANT.SUGGESTION_FIND', icon: 'search', flow: 'find' },
  { label: 'ASSISTANT.SUGGESTION_TRACK', icon: 'box', flow: 'track' },
  { label: 'ASSISTANT.SUGGESTION_COMPARE', icon: 'credit-card', flow: 'compare' },
  { label: 'ASSISTANT.SUGGESTION_ACTIVATE', icon: 'key', flow: 'activate' },
  { label: 'ASSISTANT.SUGGESTION_REFUND', icon: 'reply', flow: 'refund' },
  { label: 'ASSISTANT.SUGGESTION_SUPPORT', icon: 'comment', flow: 'support' },
];

export const QUICK_SUGGESTIONS: readonly SuggestionChip[] = [
  { label: 'ASSISTANT.QUICK_EXPLAIN', icon: 'search', flow: 'find' },
  { label: 'ASSISTANT.QUICK_COMPARE_PLANS', icon: 'credit-card', flow: 'compare' },
  { label: 'ASSISTANT.QUICK_WHERE_ORDER', icon: 'box', flow: 'track' },
  { label: 'ASSISTANT.QUICK_HOW_ACTIVATE', icon: 'key', flow: 'activate' },
];

export const FLOWS: Record<FlowKey, ConversationFlow> = {
  find: {
    userText: 'Find a product',
    reply: "I found a great match in stock — here's the top result for **Steam gift cards**:",
    cards: [
      {
        type: 'product',
        data: {
          name: 'Steam Wallet Code — $50 (US)',
          price: '50.00',
          oldPrice: '54.99',
          discountPercent: 9,
          rating: 4.8,
          reviews: '1,204',
          stock: 'In Stock',
        },
      },
    ],
    actions: [{ label: 'View Details', icon: 'external-link' }],
    retryNote: 'Here is the same listing again, with current stock confirmed.',
  },
  track: {
    userText: 'Track my order',
    reply:
      'Your most recent order has already been fulfilled — the key is sitting in your Library:',
    cards: [
      {
        type: 'order',
        data: {
          number: '#HB-20458',
          date: 'Jul 24, 2026',
          status: 'Delivered',
          steps: [
            { label: 'Paid', done: true },
            { label: 'Processing', done: true },
            { label: 'Delivered', done: true },
          ],
        },
      },
    ],
    actions: [
      { label: 'View Library', icon: 'box' },
      { label: 'Download License', icon: 'download' },
    ],
    retryNote: 'And here it is again, with the delivery timestamp included.',
  },
  compare: {
    userText: 'Compare memberships',
    reply:
      "Here's a quick side-by-side of our membership tiers:\n\n" +
      '| Plan | Price | Extra Discount | Priority Support |\n' +
      '|---|---|---|---|\n' +
      '| Basic | Free | — | — |\n' +
      '| Plus | $4.99/mo | 5% | — |\n' +
      '| Pro | $9.99/mo | 12% | ✓ |\n\n' +
      '**Pro** pays for itself after roughly two gift-card purchases a month.',
    actions: [{ label: 'Upgrade Membership', icon: 'star-fill', primary: true }],
    retryNote: 'And here is that comparison again, sorted by value per dollar.',
  },
  activate: {
    userText: 'How do I activate this?',
    reply: "Here's the license for **Steam Wallet Code — $50**:",
    cards: [
      {
        type: 'license',
        data: {
          product: 'Steam Wallet Code — $50',
          key: 'XXXXX-XXXXX-XXXXX-42PLM',
          activated: false,
        },
      },
    ],
    followup:
      'To activate it:\n\n' +
      '1. Open the Steam client and sign in\n' +
      '2. Go to **Games → Activate a Product on Steam**\n' +
      '3. Enter the code exactly as shown above\n' +
      '4. Confirm — funds land in your wallet instantly',
    actions: [{ label: 'Download License', icon: 'download' }],
    retryNote: 'Here are those steps again, condensed.',
  },
  refund: {
    userText: "What's your refund policy?",
    reply:
      '## Refund Policy\n\n' +
      "Digital keys can't be refunded once the code has been revealed, since the value can be redeemed immediately. Exceptions:\n\n" +
      '- The key was defective or already redeemed\n' +
      '- You received a duplicate order by mistake\n' +
      '- Reported within **24 hours** of purchase\n\n' +
      "For any of these, contact support with your order number and we'll sort it out. [Read the full policy →](/legal/refund-policy)",
    actions: [{ label: 'Contact Support', icon: 'question-circle' }],
    retryNote:
      'And to restate the key point — report defective keys within 24 hours and we will make it right.',
  },
  support: {
    userText: 'Contact support',
    reply:
      'I can open a ticket right now, or connect you directly with a support agent — want me to go ahead?',
    actions: [
      { label: 'Create Ticket', icon: 'comment', primary: true },
      { label: 'Contact Support', icon: 'question-circle' },
    ],
    retryNote: 'Same options, in case that did not come through clearly.',
  },
};

export const SEED_HISTORY: readonly HistoryItem[] = [
  {
    id: 'h1',
    group: 'Today',
    title: 'Refund on Steam Wallet Code',
    time: '10:42 AM',
    flow: 'refund',
  },
  {
    id: 'h2',
    group: 'Today',
    title: 'Comparing Plus vs Pro',
    time: '9:15 AM',
    flow: 'compare',
    pinned: true,
  },
  {
    id: 'h3',
    group: 'Yesterday',
    title: 'Activation help — Elden Ring key',
    time: '6:03 PM',
    flow: 'activate',
  },
  {
    id: 'h4',
    group: 'Last 7 Days',
    title: 'Order #HB-20214 tracking',
    time: 'Jul 21',
    flow: 'track',
  },
  {
    id: 'h5',
    group: 'Last 7 Days',
    title: 'Gift card recommendations',
    time: 'Jul 19',
    flow: 'find',
  },
  {
    id: 'h6',
    group: 'Last Month',
    title: 'Referral program question',
    time: 'Jun 30',
    flow: 'support',
  },
];
