import { useParams } from 'react-router-dom'

function CampaignEdit() {
  const { id } = useParams()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Campaign</h1>
        <p className="mt-2 text-muted-foreground">
          Campaign ID: {id}
        </p>
      </div>
      <p className="text-muted-foreground">
        Campaign editing interface will be implemented here...
      </p>
    </div>
  )
}

export default CampaignEdit
