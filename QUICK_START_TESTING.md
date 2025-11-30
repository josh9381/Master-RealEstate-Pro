# 🚀 AI Compose - Quick Start Testing Guide

## Access URLs
- **Frontend**: https://probable-fiesta-v65j576gg6qgfpp79-3000.app.github.dev
- **Backend API**: https://probable-fiesta-v65j576gg6qgfpp79-8000.app.github.dev
- **Prisma Studio**: https://probable-fiesta-v65j576gg6qgfpp79-5555.app.github.dev

## Test in 5 Minutes ⏱️

### Step 1: Login (30 seconds)
1. Open frontend URL
2. Login with your credentials
3. Verify you're on the dashboard

### Step 2: Open Communication Hub (30 seconds)
1. Click "Communication" in sidebar
2. You should see the Communication Inbox

### Step 3: Select a Lead (30 seconds)
1. Look for conversations in the left panel
2. Click on any lead with messages
3. The conversation should load on the right

### Step 4: Test AI Compose (3 minutes)
1. **Find the Button**: Look for "AI Compose" button in the compose area
2. **Click It**: Opens the AIComposer component
3. **Watch Auto-Generation**: Message generates automatically (3-5 seconds)
4. **Observe Context**: Top banner shows lead details (name, score, open rate)
5. **Test Settings**:
   - Change Tone dropdown (Professional → Friendly)
   - Change Length dropdown (Standard → Brief)
   - Toggle CTA checkbox
   - Click Settings icon for advanced options
6. **Test Actions**:
   - Click "Regenerate" → New message
   - Click "Copy" → Toast notification
   - Click "Use This" → Reply box fills with message
7. **Verify**: Message appears in reply text box

## What Success Looks Like ✅

**Context Banner Shows**:
- Lead name
- Last contact date (or "Never contacted")
- Email open rate percentage
- Lead score out of 100

**Message Generation**:
- Professional tone is formal
- Friendly tone is warm
- Brief messages are 2-3 sentences
- Detailed messages are 5+ sentences
- CTA includes clear action items

**Actions Work**:
- Regenerate creates new content
- Copy shows "Copied to clipboard" toast
- Use This populates reply box and closes composer

## Common Issues & Solutions

### Issue: "AI Compose" button is disabled
**Solution**: Select a lead conversation first

### Issue: "No authorization header provided"
**Solution**: Make sure you're logged in

### Issue: Generation takes too long (>10 seconds)
**Solution**: Check backend logs: `tail -f /tmp/backend.log`

### Issue: Error message appears
**Solutions**:
1. Check OpenAI API key is configured in backend/.env
2. Verify lead has valid data in database
3. Check backend logs for specific error

## Test Data Available

**Test Leads** (7 leads with messages):
- John Doe (Score: 30, 1 message)
- Michael Brown (Score: 30, 1 message)
- Campaign Target (Score: 30, 1 message)

## Quick Verification Checklist

- [ ] Backend is running (http://localhost:8000)
- [ ] Frontend is running (http://localhost:3000)
- [ ] Logged into application
- [ ] Communication Hub accessible
- [ ] Lead conversation selected
- [ ] AI Compose button visible and enabled
- [ ] Click opens AIComposer component
- [ ] Message auto-generates with context
- [ ] Tone changes trigger regeneration
- [ ] Length changes trigger regeneration
- [ ] CTA toggle works
- [ ] Copy button works
- [ ] Use This button populates reply box
- [ ] Close button dismisses composer

## Stopping Services

When done testing:
```bash
./stop-dev.sh
```

## Viewing Logs

```bash
# Backend logs
tail -f /tmp/backend.log

# Frontend logs
tail -f /tmp/frontend.log

# All logs
tail -f /tmp/*.log
```

## Getting Help

1. Check `AI_COMPOSE_PHASE1_TEST_PLAN.md` for detailed test cases
2. Check `AI_COMPOSE_PHASE1_TEST_RESULTS.md` for known issues
3. Review backend logs for API errors
4. Review frontend console for JavaScript errors

## Success Metrics

**Phase 1 is working if**:
- ✅ Component renders without errors
- ✅ Messages generate within 5 seconds
- ✅ Context banner shows accurate lead data
- ✅ All 5 tones produce different messages
- ✅ All 3 lengths produce appropriately sized messages
- ✅ Use This button populates reply box
- ✅ No JavaScript errors in console

---

**Happy Testing! 🎉**

If everything works, Phase 1 is production-ready and we can move to Phase 2 (Variations & Templates).
