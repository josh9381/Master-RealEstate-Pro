# 🔧 Step 1: Add Dual Buttons (Safe Implementation)

## Goal
Add "Enhance with AI" button next to existing "AI Compose" without breaking anything.

## Changes

### 1. Add State for Enhance Mode
```tsx
const [showEnhanceMode, setShowEnhanceMode] = useState(false)
const [enhancedMessage, setEnhancedMessage] = useState('')
const [showBeforeAfter, setShowBeforeAfter] = useState(false)
```

### 2. Add Enhance Handler
```tsx
const handleEnhance = async () => {
  if (!replyText || replyText.length < 10) {
    toast.error('Type a message first (at least 10 characters)')
    return
  }
  
  setShowEnhanceMode(true)
  
  try {
    const result = await api.post('/ai/enhance-message', {
      originalDraft: replyText,
      tone: 'professional'
    })
    
    setEnhancedMessage(result.data.data.enhanced)
    setShowBeforeAfter(true)
  } catch (error) {
    console.error('Enhance error:', error)
    toast.error('Failed to enhance message')
    setShowEnhanceMode(false)
  }
}

const applyEnhanced = () => {
  setReplyText(enhancedMessage)
  setShowBeforeAfter(false)
  setShowEnhanceMode(false)
  toast.success('Enhanced message applied!')
}

const cancelEnhance = () => {
  setShowBeforeAfter(false)
  setShowEnhanceMode(false)
  setEnhancedMessage('')
}
```

### 3. Update Button Area (Line ~1389)
Replace single "AI Compose" button with two buttons:

```tsx
<div className="flex gap-2">
  <Button
    size="sm"
    variant={replyText.length > 10 ? "outline" : "default"}
    onClick={handleAICompose}
    disabled={!selectedThread}
    title={!selectedThread ? "Select a conversation to use AI Compose" : "Generate AI message from scratch"}
  >
    <Sparkles className="mr-2 h-4 w-4" />
    Generate AI Message
  </Button>
  
  <Button
    size="sm"
    variant={replyText.length > 10 ? "default" : "outline"}
    onClick={handleEnhance}
    disabled={!selectedThread || replyText.length < 10}
    title={replyText.length < 10 ? "Type your message first (10+ characters)" : "Enhance your message with AI"}
  >
    <Sparkles className="mr-2 h-4 w-4" />
    Enhance with AI
  </Button>
  
  {/* Rest of buttons... */}
</div>
```

### 4. Add Before/After Panel (After AI Composer, Line ~1383)
```tsx
{/* Before/After Comparison Panel */}
{showBeforeAfter && (
  <div className="border-t bg-gradient-to-b from-green-50 to-white p-4 space-y-3">
    <div className="flex items-center justify-between">
      <h4 className="font-semibold flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-green-600" />
        AI Enhanced Version
      </h4>
      <Button
        size="sm"
        variant="ghost"
        onClick={cancelEnhance}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
    
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">
          Your Draft
        </label>
        <div className="bg-gray-100 border rounded-lg p-3 text-sm min-h-[100px]">
          {replyText}
        </div>
      </div>
      
      <div>
        <label className="text-xs font-medium text-green-600 mb-1 block">
          ✨ Enhanced Version
        </label>
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3 text-sm min-h-[100px]">
          {enhancedMessage}
        </div>
      </div>
    </div>
    
    <div className="flex gap-2 justify-end">
      <Button
        size="sm"
        variant="outline"
        onClick={cancelEnhance}
      >
        Cancel
      </Button>
      <Button
        size="sm"
        onClick={applyEnhanced}
        className="bg-green-600 hover:bg-green-700"
      >
        Use Enhanced Version
      </Button>
    </div>
  </div>
)}

{/* AI Composer - Inline */}
{showAIComposer && selectedThread ? (
  // ... existing AIComposer
) : null}
```

## Testing Checklist

- [ ] Both buttons appear next to each other
- [ ] "Generate" button works (opens existing AIComposer)
- [ ] "Enhance" button disabled when no text
- [ ] "Enhance" button enabled when 10+ characters typed
- [ ] Clicking "Enhance" shows before/after panel
- [ ] Side-by-side comparison displays correctly
- [ ] "Cancel" closes panel, keeps original text
- [ ] "Use Enhanced" applies enhanced text to reply box
- [ ] Can enhance, cancel, edit, enhance again
- [ ] Both features work independently
- [ ] No console errors

## Rollback Plan
If anything breaks, simply revert the button area to single "AI Compose" button.

## Next Step
After this works, we'll make AIComposer inline in Step 2.
