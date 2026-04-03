/* eslint-disable @typescript-eslint/no-explicit-any */
import { renderWithProviders } from './test-utils'

vi.mock('@/components/ai/AIComposer', () => ({
  AIComposer: () => <div>AIComposer</div>,
}))

vi.mock('@/components/ModalErrorBoundary', () => ({
  ModalErrorBoundary: ({ children }: any) => <div>{children}</div>,
}))

vi.mock('@/utils/smsSegments', () => ({
  calculateSMSSegments: () => ({ segments: 1, remaining: 160 }),
}))

import { ComposeModal } from '@/pages/communication/inbox/ComposeModal'

describe('ComposeModal', () => {
  it('renders without crashing', () => {
    renderWithProviders(
      <ComposeModal
        composeType="email"
        composeTo=""
        composeSubject=""
        composeBody=""
        composeLeadId=""
        leads={[]}
        templates={[]}
        onTypeChange={vi.fn()}
        onToChange={vi.fn()}
        onSubjectChange={vi.fn()}
        onBodyChange={vi.fn()}
        onLeadChange={vi.fn()}
        onEnhance={vi.fn().mockResolvedValue('')}
        onSend={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
