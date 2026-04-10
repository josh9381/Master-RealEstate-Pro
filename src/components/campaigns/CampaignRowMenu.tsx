import { Link } from 'react-router-dom'
import {
  Edit, Copy, Pause, PlayCircle, Mail, Archive, ArchiveRestore, Trash2,
} from 'lucide-react'
import type { Campaign } from '@/types'

export interface CampaignRowMenuActions {
  onDuplicate: (id: string) => void
  onPause: (id: string) => void
  onResume: (id: string) => void
  onSend: (id: string) => void
  onArchive: (id: string) => void
  onUnarchive: (id: string) => void
  onChangeStatus: (id: string) => void
  onDelete: (id: string) => void
  isPausePending?: boolean
  isResumePending?: boolean
  isSendPending?: boolean
  isArchivePending?: boolean
  isUnarchivePending?: boolean
}

interface CampaignRowMenuProps {
  campaign: Campaign
  actions: CampaignRowMenuActions
}

export function CampaignRowMenu({ campaign, actions }: CampaignRowMenuProps) {
  const status = campaign.status.toUpperCase()
  const id = String(campaign.id)

  return (
    <div className="absolute right-0 top-10 z-10 w-48 rounded-md border bg-background shadow-lg">
      <Link to={`/campaigns/${campaign.id}`}>
        <button className="flex w-full items-center px-4 py-2 text-sm hover:bg-muted">
          <Edit className="mr-2 h-4 w-4" />
          View Details
        </button>
      </Link>
      <button
        onClick={() => actions.onDuplicate(id)}
        className="flex w-full items-center px-4 py-2 text-sm hover:bg-muted"
      >
        <Copy className="mr-2 h-4 w-4" />
        Duplicate
      </button>
      {status === 'ACTIVE' && (
        <button
          onClick={() => actions.onPause(id)}
          disabled={actions.isPausePending}
          className="flex w-full items-center px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
        >
          <Pause className="mr-2 h-4 w-4" />
          {actions.isPausePending ? 'Pausing…' : 'Pause'}
        </button>
      )}
      {status === 'PAUSED' && (
        <button
          onClick={() => actions.onResume(id)}
          disabled={actions.isResumePending}
          className="flex w-full items-center px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
        >
          <PlayCircle className="mr-2 h-4 w-4" />
          {actions.isResumePending ? 'Resuming…' : 'Resume'}
        </button>
      )}
      {(status === 'DRAFT' || status === 'SCHEDULED') && (
        <button
          onClick={() => actions.onSend(id)}
          disabled={actions.isSendPending}
          className="flex w-full items-center px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
        >
          <Mail className="mr-2 h-4 w-4" />
          {actions.isSendPending ? 'Sending…' : 'Send Now'}
        </button>
      )}
      {campaign.isArchived ? (
        <button
          onClick={() => actions.onUnarchive(id)}
          disabled={actions.isUnarchivePending}
          className="flex w-full items-center px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
        >
          <ArchiveRestore className="mr-2 h-4 w-4" />
          {actions.isUnarchivePending ? 'Unarchiving…' : 'Unarchive'}
        </button>
      ) : (
        <button
          onClick={() => actions.onArchive(id)}
          disabled={actions.isArchivePending}
          className="flex w-full items-center px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
        >
          <Archive className="mr-2 h-4 w-4" />
          {actions.isArchivePending ? 'Archiving…' : 'Archive'}
        </button>
      )}
      <button
        onClick={() => actions.onChangeStatus(id)}
        className="flex w-full items-center px-4 py-2 text-sm hover:bg-muted"
      >
        <PlayCircle className="mr-2 h-4 w-4" />
        Change Status
      </button>
      <button
        onClick={() => actions.onDelete(id)}
        className="flex w-full items-center px-4 py-2 text-sm text-destructive hover:bg-destructive/5"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
      </button>
    </div>
  )
}
