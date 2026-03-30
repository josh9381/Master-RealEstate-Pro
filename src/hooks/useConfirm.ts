import { useConfirmStore } from '@/store/confirmStore'

export const useConfirm = () => useConfirmStore((s) => s.confirm)
