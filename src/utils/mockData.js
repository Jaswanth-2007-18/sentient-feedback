// ============================================================
// SENTIENT – Mock Data & Stat Helpers
// ============================================================

export const AVATAR_COLORS = [
  '#8b5cf6','#6366f1','#22d3ee','#34d399',
  '#f472b6','#fbbf24','#f87171','#60a5fa',
  '#a78bfa','#4ade80','#fb923c',
];

export const CATEGORIES = ['Product','Service','Features','UX','Pricing'];
export const STATUSES   = ['New','In Review','Resolved','Closed'];

const NAMES = [
  'Alice Reynolds','Ben Kowalski','Sarah Johnson','Michael Torres',
  'Emma Davis','Liam Wilson','Olivia Martinez','Noah Anderson',
  'Ava Thompson','Ethan Harris','Sophia Clark','Mason Lewis',
  'Isabella Lee','Lucas Walker','Mia Hall','Aiden Allen',
  'Charlotte Young','Jackson Hernandez','Amelia King','Elijah Wright',
  'Harper Scott','James Green','Evelyn Baker','Benjamin Adams',
  'Abigail Nelson','Logan Carter','Emily Mitchell','Lucas Perez',
  'Sofia Roberts','Ryan Turner','Chloe Phillips','David Campbell',
  'Penelope Parker','Daniel Evans','Grace Edwards','Samuel Collins',
  'Zoey Stewart','Henry Sanchez','Lily Morris','Anthony Rogers',
];

const MESSAGES = [
  'Absolutely love the new dashboard! The interface is clean, intuitive, and saves me so much time every day.',
  'The onboarding experience was smooth but the mobile app still has some lag issues that need addressing.',
  'Customer support team was incredibly helpful. They resolved my issue within minutes. Five stars!',
  'Great product overall but the pricing tier jumped significantly. Would love a more granular pricing model.',
  'The analytics features are top-notch. Helped our team make data-driven decisions effortlessly.',
  'There\'s a bug in the export functionality — CSV files sometimes have missing columns.',
  'The new search feature is a game changer. Finding feedback is now so much faster.',
  'Wish there was a dark mode option. The bright interface is hard on the eyes for long sessions.',
  'Integration with Slack works perfectly. Real-time notifications have improved our response times.',
  'The reporting module is excellent but could use a few more chart types like Sankey diagrams.',
  'Love how everything syncs across devices. The desktop and mobile apps feel cohesive.',
  'Response time from the team is phenomenal. They clearly care about their users.',
  'Would love to see bulk actions added to the feedback management list view.',
  'The survey creation tool is simple yet powerful. Our response rates have doubled since using it.',
  'Very impressed with the NPS tracking feature. It gives us exactly the insights we need.',
  'The UI feels a bit cluttered in certain areas. A more minimalist approach would help.',
  'Excellent product! Our team satisfaction scores have gone up since we started using it.',
  'Feature request: allow custom fields in feedback forms for industry-specific data collection.',
  'The email notification system could be more customizable. More control over frequency needed.',
  'Overall a solid platform. The team continuously improves the product based on user feedback.',
];

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

export function generateMockFeedbacks() {
  return NAMES.map((name, i) => {
    const parts    = name.split(' ');
    const initials = parts.map(p => p[0]).join('');
    const category = randomFrom(CATEGORIES);
    const rating   = randomInt(1, 5);
    const sentiment = rating >= 4 ? 'Positive' : rating === 3 ? 'Neutral' : 'Negative';
    const daysAgo  = randomInt(0, 30);
    const date     = new Date();
    date.setDate(date.getDate() - daysAgo);

    return {
      id: i + 1,
      name,
      initials,
      email: `${parts[0].toLowerCase()}.${parts[1].toLowerCase()}@example.com`,
      category,
      subject: category,
      rating,
      sentiment,
      status: randomFrom(STATUSES),
      message: MESSAGES[i % MESSAGES.length],
      tags: [category, randomFrom(['UI','Bug','Request','Praise','Suggestion'])],
      date,
      createdAt: date.toISOString(),
      daysAgo,
      avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
    };
  });
}

export function computeStats(feedbacks) {
  const total    = feedbacks.length;
  const rated    = feedbacks.filter(f => f.rating > 0);
  const avgRating = rated.length
    ? rated.reduce((s, f) => s + f.rating, 0) / rated.length
    : 0;
  const resolved = feedbacks.filter(f => f.status === 'Resolved' || f.status === 'Closed').length;

  const sentMap = { Positive: 0, Neutral: 0, Negative: 0 };
  feedbacks.forEach(f => {
    const s = f.sentiment || (f.rating >= 4 ? 'Positive' : f.rating === 3 ? 'Neutral' : 'Negative');
    if (sentMap[s] !== undefined) sentMap[s]++;
  });

  const ratingDist = [0,0,0,0,0];
  feedbacks.forEach(f => { if (f.rating >= 1 && f.rating <= 5) ratingDist[f.rating - 1]++; });

  const dayMap = {};
  feedbacks.forEach(f => {
    const d   = new Date(f.createdAt || f.date || Date.now());
    const key = d.toISOString().slice(0, 10);
    dayMap[key] = (dayMap[key] || 0) + 1;
  });

  const productMap = {};
  feedbacks.forEach(f => {
    const prod = f.subject || f.category || 'General';
    if (!productMap[prod]) productMap[prod] = { count:0, ratingSum:0, ratedCount:0, positive:0, negative:0, neutral:0 };
    productMap[prod].count++;
    if (f.rating > 0) { productMap[prod].ratingSum += f.rating; productMap[prod].ratedCount++; }
    const s = f.sentiment || (f.rating >= 4 ? 'Positive' : f.rating === 3 ? 'Neutral' : 'Negative');
    if (s === 'Positive') productMap[prod].positive++;
    else if (s === 'Negative') productMap[prod].negative++;
    else productMap[prod].neutral++;
  });

  const monthMap = {};
  feedbacks.forEach(f => {
    const d   = new Date(f.createdAt || f.date || Date.now());
    const key = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
    monthMap[key] = (monthMap[key] || 0) + 1;
  });

  return { total, avgRating, resolved, sentMap, ratingDist, dayMap, productMap, monthMap };
}

export function getTrendData(range, dayMap) {
  const today = new Date();
  today.setHours(0,0,0,0);

  if (range === '7d') {
    const labels = [], data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      labels.push(d.toLocaleString('en-US', { weekday: 'short' }));
      data.push(dayMap[d.toISOString().slice(0,10)] || 0);
    }
    return { labels, data };
  }
  if (range === '30d') {
    const labels = [], data = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      labels.push(`${d.getDate()}`);
      data.push(dayMap[d.toISOString().slice(0,10)] || 0);
    }
    return { labels, data };
  }
  const weekMap = {};
  for (let i = 89; i >= 0; i--) {
    const d  = new Date(today); d.setDate(d.getDate() - i);
    const wk = `W${Math.ceil(d.getDate() / 7)} ${d.toLocaleString('en-US',{month:'short'})}`;
    weekMap[wk] = (weekMap[wk] || 0) + (dayMap[d.toISOString().slice(0,10)] || 0);
  }
  return { labels: Object.keys(weekMap), data: Object.values(weekMap) };
}

export function starsHTML(rating) {
  return Array.from({ length: 5 }, (_, i) =>
    `<span style="color:${i < rating ? '#fbbf24' : '#334155'}">★</span>`
  ).join('');
}

export const SURVEYS = [
  { id:1, title:'Q3 Product Satisfaction Survey', description:'Measure satisfaction with our latest product release.', status:'Active', audience:'All Users', responses:412, target:500, endDate:'2026-09-30' },
  { id:2, title:'Onboarding Experience Feedback', description:'Understand new user pain points during the first 30 days.', status:'Active', audience:'New Users', responses:134, target:200, endDate:'2026-09-15' },
  { id:3, title:'Annual NPS Survey 2026', description:'Yearly Net Promoter Score survey to track long-term loyalty.', status:'Draft', audience:'Premium Users', responses:0, target:1000, endDate:'2026-10-31' },
  { id:4, title:'Pricing Tier Feedback – Post-Change', description:'Collect reactions to the July pricing restructure.', status:'Closed', audience:'All Users', responses:876, target:800, endDate:'2026-08-01' },
];
