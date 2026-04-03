/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderWithProviders } from './test-utils'

vi.mock('dompurify', () => ({
  default: { sanitize: (x: string) => x },
}))

vi.mock('@/components/ai/AIComposer', () => ({
  AIComposer: () => <div>AIComposer</div>,
}))

vi.mock('@/components/ModalErrorBoundary', () => ({
  ModalErrorBoundary: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('@/utils/smsSegments', () => ({
  calculateSMSSegments: () => ({ segments: 1, remaining: 160 }),
}))

import { ConversationView } from '@/pages/communication/inbox/ConversationView'

describe('ConversationView', () => {
  it('renders without crashing', () => {
    renderWithProviders(
      <ConversationView
        selectedContact={null}
        replyText=""
        emailSubject=""
        showMoreMenu={false}
        showTemplates={false}
        showQuickReplies={false}
        showEmojiPicker={false}
        showAIComposer={false}
        showBeforeAfter={false}
        enhancedMessage=""
        enhanceTone="professional"
        enhancingMessage={false}
        replyChannel="email"
        templates={[]}
        quickReplies={[]}
        onReplyTextChange={vi.fn()}
        onEmailSubjectChange={vi.fn()}
        onReplyChannelChange={vi.fn()}
        onSendReply={vi.fn()}
        onToggleStar={vi.fn()}
        onArchive={vi.fn()}
        onTrash={vi.fn()}
        onSnooze={vi.fn()}
        onMarkRead={vi.fn()}
        onMarkUnread={vi.fn()}
        onForward={vi.fn()}
        onPrint={vi.fn()}
        onShowMoreMenu={vi.fn()}
        onShowTemplates={vi.fn()}
        onShowQuickReplies={vi.fn()}
        onShowEmojiPicker={vi.fn()}
        onShowAIComposer={vi.fn()}
        onShowAttachmentModal={vi.fn()}
        onShowSignatureEditor={vi.fn()}
        onInsertTemplate={vi.fn()}
        onInsertQuickReply={vi.fn()}
        onInsertEmoji={vi.fn()}
        onGenerateClick={vi.fn()}
        onEnhance={vi.fn()}
        onApplyEnhanced={vi.fn()}
        onCancelEnhance={vi.fn()}
        onEnhanceToneChange={vi.fn()}
        onMessageGenerated={vi.fn()}
      />
    )
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
