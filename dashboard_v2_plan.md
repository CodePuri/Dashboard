# Velocity Analytics Dashboard v2.0

## Vision

Transform the current analytics overview into a **full-fledged product analytics platform** inspired by Google Analytics & Mixpanel, enabling actionable insights from user behavior data.

---

## Sidebar Navigation Structure

| Section         | Key Metrics                              | Purpose                              |
| --------------- | ---------------------------------------- | ------------------------------------ |
| **Impressions** | Views, Sessions, Page loads              | How many times users see the product |
| **Acquisition** | New users, Sources, First-time usage     | Where users come from                |
| **Engagement**  | DAU/MAU, Session duration, Feature usage | How deeply users interact            |
| **Retention**   | D1/D7/D30 retention, Cohort analysis     | Who comes back                       |
| **Conversion**  | Funnel completion, Goal rates            | Who takes action                     |
| **Attrition**   | Churn rate, Drop-off points, Last seen   | Who leaves and why                   |

---

## Design Principles

### 1. **Progressive Disclosure**

- Show summary cards first → expand to detailed charts on click
- Collapse complex data into digestible "At a Glance" widgets

### 2. **Mobile-First Hierarchy**

- Single-column layout on mobile
- Cards stack vertically with clear section breaks
- Collapsible sidebar as hamburger menu

### 3. **Data Not Overwhelming**

- Limit to **4-6 key metrics per section**
- Use sparklines instead of full charts where appropriate
- Time-range context always visible ("Last 7 days" badge)

---

## Section Details

### Impressions

- Total sessions / Unique sessions
- Average session duration
- Peak usage times heatmap

### Acquisition

- New vs returning users (pie)
- First action taken (bar)
- Growth rate trend (line)

### Engagement

- DAU/WAU/MAU ratio
- Feature adoption funnel
- **Deep User Panel (Cohort Analysis)**:
  - **Power User Profile**: Who are they? (Top 5% by usage), What do they do? (Feature usage heatmap)
  - **Paid User Behavior**: Usage patterns vs Free users, Premium feature adoption
  - **High Intent Signals**: Frequency of specific high-value actions (e.g., "Refine", "Copy Code")

### Retention

- Retention curve (D1, D7, D30)
- Cohort heatmap by signup week
- Stickiness score

### Conversion

- Enhancement completion rate
- Refine → Use funnel
- Goal tracking (configurable)

### Attrition

- Churn by user segment
- Days since last seen distribution
- Exit points analysis

---

## UI/UX Enhancements

- [ ] Collapsible sidebar with icons + labels
- [ ] Section-based routing (`/impressions`, `/retention`, etc.)
- [ ] Date range picker sticky header
- [ ] Export per-section (PDF/CSV)
- [ ] Dark/Light mode consistency
- [ ] Skeleton loaders per card

---

## Mobile Responsiveness

- Hamburger menu for sidebar
- Swipeable section tabs
- Bottom navigation for quick section access
- Touch-optimized chart interactions

---

## Success Metrics for v2.0

1. **Clarity**: User finds any metric within 2 taps
2. **Performance**: Dashboard loads < 2s on 3G
3. **Actionability**: Each section answers "so what?"
