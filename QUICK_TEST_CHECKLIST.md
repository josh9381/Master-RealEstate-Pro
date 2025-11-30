# 🚀 Quick Test Checklist - AI Compose Phase 1

## Before You Start
- [ ] Browser: Simple Browser opened ✅
- [ ] Login: admin@realestate.com / admin123
- [ ] Location: Communication Hub → Select John Doe
- [ ] Monitor: Backend logs running in terminal

---

## Core Tests (Must Pass)

### 1. Basic Flow ⭐⭐⭐ CRITICAL
- [ ] Click "AI Compose" button
- [ ] Composer opens inline (not modal)
- [ ] Loading spinner shows
- [ ] Message generates in < 5 seconds
- [ ] Context banner shows lead details

**Pass Criteria**: Message appears with lead context

---

### 2. Settings Work ⭐⭐⭐ CRITICAL
- [ ] Change Tone: Professional → Friendly
- [ ] Change Length: Standard → Brief
- [ ] Toggle CTA off
- [ ] Each change regenerates automatically

**Pass Criteria**: Settings trigger regeneration

---

### 3. Use This Button ⭐⭐⭐ CRITICAL
- [ ] Click "Use This"
- [ ] Composer closes
- [ ] Message populates reply box
- [ ] Success toast appears

**Pass Criteria**: Message successfully transferred to reply box

---

### 4. Copy & Regenerate ⭐⭐
- [ ] Click "Regenerate" → New message
- [ ] Click "Copy" → Success toast
- [ ] Paste in text editor → Message copied

**Pass Criteria**: Actions work as expected

---

### 5. Context Accuracy ⭐⭐
- [ ] Context banner shows correct lead name
- [ ] Shows last contact date
- [ ] Shows open rate percentage
- [ ] Shows lead score

**Pass Criteria**: All context data is accurate

---

### 6. Error Handling ⭐
- [ ] Deselect lead → Button disabled
- [ ] No JavaScript errors in console

**Pass Criteria**: Graceful error handling

---

## Quick Results

| Test | Status | Notes |
|------|--------|-------|
| Basic Flow | ⏳ | |
| Settings Work | ⏳ | |
| Use This Button | ⏳ | |
| Copy & Regenerate | ⏳ | |
| Context Accuracy | ⏳ | |
| Error Handling | ⏳ | |

---

## Pass/Fail Decision

**PASS IF**:
- ✅ Message generates successfully
- ✅ Settings trigger regeneration
- ✅ "Use This" populates reply box
- ✅ No critical errors

**FAIL IF**:
- ❌ Message doesn't generate
- ❌ Settings don't work
- ❌ "Use This" doesn't transfer message
- ❌ JavaScript errors crash page

---

## After Testing

**If PASS**: 
- Mark Phase 1 as production-ready ✅
- Move to Phase 2 planning 🚀

**If FAIL**:
- Document issues in AI_COMPOSE_MANUAL_TEST_SESSION.md
- Create bug tickets
- Fix and re-test

---

**Time Estimate**: 10-15 minutes
**Started**: [Time]
**Completed**: [Time]
**Result**: ⏳ PENDING
