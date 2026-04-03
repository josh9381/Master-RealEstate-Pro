import { renderWithProviders } from './test-utils'

import { SignatureEditorModal } from '@/pages/communication/inbox/SignatureEditorModal'

describe('SignatureEditorModal', () => {
  it('renders without crashing', () => {
    renderWithProviders(
      <SignatureEditorModal
        editingSignature=""
        autoAppendSignature={false}
        onSignatureChange={vi.fn()}
        onAutoAppendChange={vi.fn()}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(document.body.innerHTML.length).toBeGreaterThan(0)
  })
})
