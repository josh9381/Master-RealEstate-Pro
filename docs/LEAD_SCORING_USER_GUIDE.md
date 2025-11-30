# Lead Scoring System - User Guide

## Overview

The Lead Scoring System automatically calculates a numerical score (0-100) for each lead based on their engagement and behavior. Higher scores indicate warmer leads more likely to convert.

---

## How Lead Scoring Works

### Scoring Algorithm

Lead scores are calculated using a **rule-based algorithm** with weighted factors:

#### Activity Points
| Activity Type | Points |
|--------------|--------|
| Email Open | +5 |
| Email Click | +10 |
| Email Reply | +15 |
| Form Submission | +20 |
| Inquiry Submitted | +25 |
| Appointment Scheduled | +30 |
| Appointment Completed | +40 |

#### Bonus Points
- **Recency Bonus:** 0-20 points based on how recently the lead was active
- **Frequency Bonus:** 0-15 points for consistent engagement over time

#### Penalties
- **Email Opt-Out:** -50 points

#### Normalization
Final scores are normalized to a 0-100 scale for easy interpretation.

---

## Score Categories

### 🔥 Hot Leads (80-100)
**Who:** Highly engaged leads showing strong buying signals  
**Characteristics:**
- Multiple email replies
- Attended appointments
- Recent form submissions
- Frequent interactions

**Action:** Prioritize immediate follow-up, prepare proposals

---

### 🌡️ Warm Leads (50-79)
**Who:** Moderately engaged leads with some interest  
**Characteristics:**
- Opens emails regularly
- Clicks on links
- Occasional replies
- Some form activity

**Action:** Continue nurturing with targeted content

---

### ❄️ Cool Leads (25-49)
**Who:** Low engagement leads needing attention  
**Characteristics:**
- Minimal email opens
- Few interactions
- Long time since last activity

**Action:** Re-engagement campaigns, test different messaging

---

### ⚪ Cold Leads (0-24)
**Who:** Inactive or disengaged leads  
**Characteristics:**
- No recent activity
- Very low engagement
- Possibly uninterested
- May have opted out

**Action:** Low priority, consider archiving or removal from active campaigns

---

## Using the Score Badge

### In Leads List

#### Grid View
- **Location:** Top-right of each lead card
- **Display:** Full badge with icon, category, and score value
- **Colors:**
  - 🔥 Red: Hot (80-100)
  - 🌡️ Yellow: Warm (50-79)
  - ❄️ Blue: Cool (25-49)
  - ⚪ Gray: Cold (0-24)

#### Table View
- **Location:** Score column
- **Display:** Compact badge (icon + value)
- **Sortable:** Click column header to sort by score

---

## Filtering by Score

### Score Filter Dropdown

**Location:** Top of Leads List, next to other filters

**Options:**
- 🎯 **All Leads:** Show all leads regardless of score
- 🔥 **Hot:** Only leads with scores 80-100
- 🌡️ **Warm:** Only leads with scores 50-79
- ❄️ **Cool:** Only leads with scores 25-49
- ⚪ **Cold:** Only leads with scores 0-24

**Usage:**
1. Click the score filter dropdown
2. Select desired category
3. Leads list updates instantly
4. Filter persists during your session

---

## Sorting by Score

### Table View Sorting

**How to Sort:**
1. Switch to table view
2. Click "Score" column header
3. Click again to toggle ascending/descending
4. Arrow icon shows current sort direction

**Sort Order:**
- **Descending (↓):** Hot leads first (100 → 0)
- **Ascending (↑):** Cold leads first (0 → 100)

---

## Score Recalculation

### Automatic Updates

#### Daily Cron Job
- **Schedule:** Every day at 2:00 AM
- **Process:** Recalculates scores for all leads
- **Duration:** ~2-5 minutes for typical databases
- **Notifications:** Admin logs show completion status

**What Triggers Recalculation:**
- New email interactions
- Form submissions
- Status changes
- Activity additions
- Time-based decay

---

### Manual Recalculation

#### Single Lead
**Endpoint:** `POST /api/leads/:id/scores/recalculate`

**When to Use:**
- After bulk importing activities
- To refresh score immediately after major engagement
- Debugging score discrepancies

**Process:**
1. Navigate to lead detail page
2. Click "Recalculate Score" button (admin/power users)
3. Score updates instantly

---

#### Batch Recalculation
**Endpoint:** `POST /api/leads/scores/batch`

**Payload:**
```json
{
  "leadIds": ["lead-uuid-1", "lead-uuid-2", ...]
}
```

**When to Use:**
- After campaign sends
- After importing activity data
- Bulk score refreshes for specific segments

---

#### All Leads
**Endpoint:** `POST /api/leads/scores/recalculate-all`

**When to Use:**
- After system maintenance
- Database migrations
- Algorithm adjustments
- Monthly audits

**Note:** Can be resource-intensive for large databases (>10,000 leads)

---

## Interpreting Scores

### Score Trends

#### Rising Scores 📈
**Meaning:** Lead is becoming more engaged  
**Action:**
- Increase outreach frequency
- Move to sales-qualified status
- Assign to senior sales rep
- Prepare personalized proposal

---

#### Falling Scores 📉
**Meaning:** Lead is losing interest  
**Action:**
- Review recent interactions
- Check for service issues
- Send re-engagement campaign
- Offer special incentive
- Request feedback

---

#### Stable Scores →
**Meaning:** Consistent engagement level  
**Action:**
- Continue current nurturing strategy
- Don't over-contact (avoid fatigue)
- Monitor for trend changes

---

## Best Practices

### 1. Focus on Hot Leads
Prioritize follow-up with scores 80+. These are your most likely conversions.

### 2. Don't Ignore Cold Leads
Low scores may indicate:
- Bad contact information (update it!)
- Wrong messaging (try different approach)
- Seasonal interest (re-engage later)

### 3. Combine with Other Signals
Use scoring alongside:
- Lead source quality
- Budget information
- Timeline to purchase
- Decision-maker status

### 4. Regular Score Audits
Monthly, review:
- Average score trends
- Conversion rates by score range
- Score distribution (too many cold? too few hot?)

### 5. Tune Your Campaigns
- Send re-engagement emails to 0-24 scores
- Target 50-79 with educational content
- Focus sales efforts on 80-100

---

## Technical Details

### Score Calculation Formula

```typescript
// Pseudo-code
baseScore = 
  (opens × 5) + 
  (clicks × 10) + 
  (replies × 15) + 
  (submissions × 20) + 
  (inquiries × 25) + 
  (scheduledAppts × 30) + 
  (completedAppts × 40)

recencyBonus = calculateRecencyBonus(lastActivityDate)  // 0-20
frequencyBonus = calculateFrequencyBonus(activityCount)  // 0-15

penalties = optedOut ? -50 : 0

rawScore = baseScore + recencyBonus + frequencyBonus + penalties
normalizedScore = Math.min(100, Math.max(0, rawScore))
```

### Database Schema

```sql
-- Lead table includes:
score INTEGER DEFAULT 0
lastScoreUpdate TIMESTAMP
scoreTrend TEXT  -- 'rising', 'falling', 'stable'
```

### Performance Considerations

- **Single lead calculation:** <50ms
- **Batch (100 leads):** ~2-5 seconds
- **All leads (10,000):** ~3-5 minutes
- Database indexes on `score` field for fast sorting

---

## FAQ

### Q: How often are scores updated?
**A:** Automatically every day at 2 AM. Manual recalculation available anytime.

### Q: Can I customize the scoring algorithm?
**A:** Yes! Contact your admin to adjust point values, add new factors, or create custom rules.

### Q: What if a lead has no activity?
**A:** They'll have a base score of 0 (Cold). Scores increase as they engage.

### Q: Do old activities count less?
**A:** Yes! The recency bonus favors recent activity. Very old activity has diminishing returns.

### Q: Why did a lead's score drop?
**A:** Possible reasons:
- Inactivity (recency penalty)
- Email opt-out (-50 points)
- Time decay on old activities
- Algorithm adjustments

### Q: Can scores go negative?
**A:** No, scores are clamped to 0-100 range.

### Q: How accurate are the scores?
**A:** Scores are predictive indicators, not guarantees. Combine with human judgment and other data.

---

## Use Cases

### Sales Team Prioritization
```
1. Sort by score (descending)
2. Assign Hot leads to senior reps
3. Warm leads to junior reps
4. Cold leads to email campaigns
```

### Campaign Targeting
```
1. Filter leads by score range
2. Create segment (e.g., "Warm Leads 50-79")
3. Design appropriate messaging
4. Track score movement post-campaign
```

### Conversion Forecasting
```
1. Analyze historical conversion rates by score
2. Example: 80+ leads convert at 35%
3. Count current 80+ leads
4. Estimate conversions for pipeline planning
```

### Re-engagement Automation
```
1. Daily: Find leads with falling scores
2. Trigger: "We miss you" email sequence
3. Monitor: Score changes post-campaign
4. Iterate: Refine messaging based on results
```

---

## Reporting

### Key Metrics to Track

1. **Average Lead Score:** Overall health indicator
2. **Score Distribution:** Percentages in each category
3. **Score Velocity:** Rate of score change over time
4. **Conversion by Score:** Closed deals per score range
5. **Score vs. Revenue:** Correlation between score and deal size

### Sample Dashboard Widgets

- **Score Heatmap:** Visual distribution across all leads
- **Trending Scores:** Graph showing movement over time
- **Top Movers:** Leads with biggest score increases/decreases
- **Score Funnel:** Lead counts by category

---

## Troubleshooting

### Score Seems Incorrect
1. Check recent activity logs
2. Verify activity data imported correctly
3. Manually recalculate score
4. Review algorithm configuration
5. Check for duplicate activity records

### Badge Not Showing
1. Ensure `ScoreBadge` component imported
2. Check lead has `score` property
3. Verify `score` is number type (not null/undefined)
4. Check browser console for errors

### Filter Not Working
1. Clear browser cache
2. Check Redux state for filter value
3. Verify `filterLeadsByScore` utility function
4. Test with console.log in filter logic

---

## Support

For assistance:
- **Documentation:** Check this guide first
- **Admin Panel:** Review score calculation logs
- **Technical Support:** Contact your system administrator
- **Feature Requests:** Submit via support portal

---

*Last Updated: 2025-11-11*  
*Version: 1.0*  
*Algorithm: Rule-based weighted scoring*
