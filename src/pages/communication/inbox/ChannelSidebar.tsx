import {
  Mail,
  MessageSquare,
  Phone,
  Star,
  Clock,
  Archive,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import type { Thread } from './types'

interface ChannelSidebarProps {
  selectedChannel: 'all' | 'email' | 'sms' | 'call'
  selectedFolder: 'inbox' | 'unread' | 'starred' | 'snoozed' | 'archived' | 'trash'
  threads: Thread[]
  onSelectChannel: (channel: 'all' | 'email' | 'sms' | 'call') => void
  onSelectFolder: (folder: 'inbox' | 'unread' | 'starred' | 'snoozed' | 'archived' | 'trash') => void
}

export const ChannelSidebar = ({
  selectedChannel,
  selectedFolder,
  threads,
  onSelectChannel,
  onSelectFolder,
}: ChannelSidebarProps) => {
  const totalUnread = threads.reduce((acc, t) => acc + t.unread, 0)
  const emailUnread = threads.filter(t => t.type === 'email').reduce((acc, t) => acc + t.unread, 0)
  const smsUnread = threads.filter(t => t.type === 'sms').reduce((acc, t) => acc + t.unread, 0)
  const callUnread = threads.filter(t => t.type === 'call').reduce((acc, t) => acc + t.unread, 0)

  return (
    <Card className="col-span-2 flex flex-col overflow-hidden">
      <CardContent className="p-4 flex flex-col h-full">
        <h3 className="font-semibold mb-4">Channels</h3>
        <div className="space-y-1 overflow-y-auto pr-2" style={{ maxHeight: 'calc(100% - 40px)' }}>
          <Button
            variant={selectedChannel === 'all' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => { onSelectChannel('all'); onSelectFolder('inbox') }}
          >
            <Mail className="mr-2 h-4 w-4" />
            All Messages
            {totalUnread > 0 && (
              <Badge variant="secondary" className="ml-auto">{totalUnread}</Badge>
            )}
          </Button>
          <Button
            variant={selectedChannel === 'email' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => onSelectChannel('email')}
          >
            <Mail className="mr-2 h-4 w-4" />
            Email
            {emailUnread > 0 && (
              <Badge variant="secondary" className="ml-auto">{emailUnread}</Badge>
            )}
          </Button>
          <Button
            variant={selectedChannel === 'sms' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => onSelectChannel('sms')}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            SMS
            {smsUnread > 0 && (
              <Badge variant="secondary" className="ml-auto">{smsUnread}</Badge>
            )}
          </Button>
          <Button
            variant={selectedChannel === 'call' ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => onSelectChannel('call')}
          >
            <Phone className="mr-2 h-4 w-4" />
            Calls
            {callUnread > 0 && (
              <Badge variant="secondary" className="ml-auto">{callUnread}</Badge>
            )}
          </Button>
          <div className="my-4 border-t" />
          <Button variant={selectedFolder === 'unread' ? 'default' : 'ghost'} className="w-full justify-start" onClick={() => onSelectFolder('unread')}>
            <Mail className="mr-2 h-4 w-4" />
            Unread
            {totalUnread > 0 && (
              <Badge variant="secondary" className="ml-auto">{totalUnread}</Badge>
            )}
          </Button>
          <Button variant={selectedFolder === 'starred' ? 'default' : 'ghost'} className="w-full justify-start" onClick={() => onSelectFolder('starred')}>
            <Star className="mr-2 h-4 w-4" />
            Starred
          </Button>
          <Button variant={selectedFolder === 'snoozed' ? 'default' : 'ghost'} className="w-full justify-start" onClick={() => onSelectFolder('snoozed')}>
            <Clock className="mr-2 h-4 w-4" />
            Snoozed
          </Button>
          <Button variant={selectedFolder === 'archived' ? 'default' : 'ghost'} className="w-full justify-start" onClick={() => onSelectFolder('archived')}>
            <Archive className="mr-2 h-4 w-4" />
            Archived
          </Button>
          <Button variant={selectedFolder === 'trash' ? 'default' : 'ghost'} className="w-full justify-start" onClick={() => onSelectFolder('trash')}>
            <Trash2 className="mr-2 h-4 w-4" />
            Trash
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
