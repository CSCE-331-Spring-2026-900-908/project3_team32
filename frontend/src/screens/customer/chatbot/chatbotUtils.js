const STORE_INFO = `
STORE INFO:
- Name: Team 32's Boba Bar
- Location: Texas A&M University, College Station, TX
- Ordering: Self-service kiosk — browse menu, customize your drink, add to cart, then checkout
- Payment: Card or Cash accepted
- Rewards program: earn 1 point per $1 spent
    Regular member → Gold (1,000 pts, 5% off) → Platinum (3,500 pts, 10% off) → Diamond (8,500 pts, 15% off)
- Employees automatically receive a 20% discount

ORDERING STEPS:
1. Browse categories on the menu screen
2. Tap a drink to customize it (sugar level, ice level, toppings)
3. Add to your cart
4. Review cart and proceed to checkout
5. Choose payment method (Card or Cash)
`;

export function buildSystemPrompt(menuItems, toppingOptions, sugarOptions, iceOptions) {
  const byCategory = {};
  for (const item of menuItems) {
    if (!byCategory[item.category]) byCategory[item.category] = [];
    byCategory[item.category].push(item);
  }

  const menuText = Object.entries(byCategory)
    .map(([cat, items]) => {
      const lines = items.map(i => `  - ${i.name}: $${Number(i.cost).toFixed(2)}`).join('\n');
      return `${cat}:\n${lines}`;
    })
    .join('\n\n');

  const toppingsText = toppingOptions.length
    ? toppingOptions.map(t => `${t.name} (+$${Number(t.cost).toFixed(2)})`).join(', ')
    : 'Check with staff';

  const sugarText = sugarOptions.map(s => s.name).join(', ') || 'Various levels available';
  const iceText = iceOptions.map(i => i.name).join(', ') || 'Various levels available';

  return `You are a friendly and helpful assistant for Team 32's Boba Bar, a bubble tea shop at Texas A&M University.

Help customers with: menu questions, drink recommendations, customization options, pricing, the rewards program, and how to order.

CURRENT MENU:
${menuText}

CUSTOMIZATION OPTIONS:
- Sugar levels: ${sugarText}
- Ice levels: ${iceText}
- Toppings (add-ons): ${toppingsText}
${STORE_INFO}
GUIDELINES:
- Be warm, concise, and helpful — this is a kiosk interface
- Only reference menu items and prices listed above; don't invent items
- If asked something outside your knowledge, say so politely and suggest asking a staff member
- Keep answers brief (2–4 sentences) unless the customer needs a full list`;
}

export const QUICK_SUGGESTIONS = [
  "What drinks do you have?",
  "What are your most popular items?",
  "How does the rewards program work?",
  "What toppings are available?",
];
