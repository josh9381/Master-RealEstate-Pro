import { Workflow, Play, Pause, Plus, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const WorkflowBuilder = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflow Builder</h1>
          <p className="text-muted-foreground mt-2">
            Create and edit automated workflows visually
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Workflow
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
            <Workflow className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Running now</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,463</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">97.3%</div>
            <p className="text-xs text-muted-foreground">1,423 successful</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Saved</CardTitle>
            <Workflow className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">342h</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Canvas Placeholder */}
      <Card className="min-h-[500px]">
        <CardHeader>
          <CardTitle>Workflow Canvas</CardTitle>
          <CardDescription>Drag and drop to build your automation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed rounded-lg min-h-[400px] flex items-center justify-center bg-muted/20">
            <div className="text-center">
              <Workflow className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Start Building Your Workflow</h3>
              <p className="text-muted-foreground mb-4">
                Drag triggers and actions from the sidebar to begin
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Trigger
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Components Palette */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Triggers</CardTitle>
            <CardDescription>Start your workflow when these events occur</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                'New Lead Created',
                'Lead Status Changed',
                'Email Opened',
                'Form Submitted',
                'Time Schedule',
                'Manual Trigger',
              ].map((trigger) => (
                <div
                  key={trigger}
                  className="p-3 border rounded-lg hover:bg-accent cursor-move"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{trigger}</span>
                    <span className="text-xs text-muted-foreground">Drag to add</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Perform these actions in your workflow</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                'Send Email',
                'Send SMS',
                'Update Lead Status',
                'Assign to Team Member',
                'Add to Campaign',
                'Create Task',
                'Wait / Delay',
                'If/Then Condition',
              ].map((action) => (
                <div key={action} className="p-3 border rounded-lg hover:bg-accent cursor-move">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{action}</span>
                    <span className="text-xs text-muted-foreground">Drag to add</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WorkflowBuilder;
