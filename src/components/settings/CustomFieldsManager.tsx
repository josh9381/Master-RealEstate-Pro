import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import {
  Plus,
  Edit,
  Trash2,
  GripVertical,
  Type,
  Hash,
  Calendar as CalendarIcon,
  ToggleLeft,
  List,
  CheckSquare,
  TrendingUp
} from 'lucide-react'
import { useToast } from '@/hooks/useToast'

interface CustomField {
  id: number
  name: string
  fieldKey: string
  type: 'text' | 'number' | 'date' | 'dropdown' | 'boolean' | 'textarea'
  required: boolean
  options?: string[]
  usageCount: number
  order: number
  defaultValue?: string
  placeholder?: string
  validation?: string
}

const mockFields: CustomField[] = [
  {
    id: 1,
    name: 'Industry',
    fieldKey: 'industry',
    type: 'dropdown',
    required: true,
    options: ['Technology', 'Healthcare', 'Finance', 'Real Estate', 'Other'],
    usageCount: 245,
    order: 1,
    placeholder: 'Select industry'
  },
  {
    id: 2,
    name: 'Company Size',
    fieldKey: 'company_size',
    type: 'number',
    required: false,
    usageCount: 189,
    order: 2,
    placeholder: 'Number of employees'
  },
  {
    id: 3,
    name: 'Expected Close Date',
    fieldKey: 'expected_close_date',
    type: 'date',
    required: false,
    usageCount: 156,
    order: 3
  },
  {
    id: 4,
    name: 'Budget Approved',
    fieldKey: 'budget_approved',
    type: 'boolean',
    required: false,
    usageCount: 134,
    order: 4
  },
  {
    id: 5,
    name: 'Deal Size',
    fieldKey: 'deal_size',
    type: 'dropdown',
    required: false,
    options: ['< $10k', '$10k - $50k', '$50k - $100k', '$100k+'],
    usageCount: 98,
    order: 5
  },
  {
    id: 6,
    name: 'Special Requirements',
    fieldKey: 'special_requirements',
    type: 'textarea',
    required: false,
    usageCount: 67,
    order: 6,
    placeholder: 'Any special requirements or notes'
  },
]

const fieldTypes = [
  { value: 'text', label: 'Text', icon: Type, description: 'Single line text input' },
  { value: 'textarea', label: 'Text Area', icon: Type, description: 'Multi-line text input' },
  { value: 'number', label: 'Number', icon: Hash, description: 'Numeric values only' },
  { value: 'date', label: 'Date', icon: CalendarIcon, description: 'Date picker' },
  { value: 'dropdown', label: 'Dropdown', icon: List, description: 'Select from options' },
  { value: 'boolean', label: 'Yes/No', icon: ToggleLeft, description: 'True or false toggle' },
]

export function CustomFieldsManager() {
  const [fields, setFields] = useState<CustomField[]>(mockFields)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingField, setEditingField] = useState<CustomField | null>(null)
  const [newField, setNewField] = useState({
    name: '',
    fieldKey: '',
    type: 'text' as CustomField['type'],
    required: false,
    options: [] as string[],
    placeholder: '',
    defaultValue: '',
    validation: ''
  })
  const [optionInput, setOptionInput] = useState('')
  const { toast } = useToast()

  const totalUsage = fields.reduce((acc: number, field: CustomField) => acc + field.usageCount, 0)
  const requiredCount = fields.filter((f: CustomField) => f.required).length

  const generateFieldKey = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
  }

  const handleAddField = () => {
    if (!newField.name.trim()) {
      toast.error('Field name is required')
      return
    }

    if ((newField.type === 'dropdown') && newField.options.length === 0) {
      toast.error('Dropdown fields require at least one option')
      return
    }

    const field: CustomField = {
      id: fields.length + 1,
      name: newField.name,
      fieldKey: newField.fieldKey || generateFieldKey(newField.name),
      type: newField.type,
      required: newField.required,
      options: newField.type === 'dropdown' ? newField.options : undefined,
      usageCount: 0,
      order: fields.length + 1,
      placeholder: newField.placeholder,
      defaultValue: newField.defaultValue,
      validation: newField.validation
    }

    setFields([...fields, field])
    toast.success(`Field "${newField.name}" created successfully`)
    resetForm()
  }

  const handleUpdateField = () => {
    if (!editingField) return

    setFields(fields.map((f: CustomField) =>
      f.id === editingField.id
        ? {
            ...f,
            name: newField.name,
            fieldKey: newField.fieldKey || generateFieldKey(newField.name),
            type: newField.type,
            required: newField.required,
            options: newField.type === 'dropdown' ? newField.options : undefined,
            placeholder: newField.placeholder,
            defaultValue: newField.defaultValue,
            validation: newField.validation
          }
        : f
    ))
    toast.success(`Field "${newField.name}" updated successfully`)
    resetForm()
  }

  const handleEditField = (field: CustomField) => {
    setEditingField(field)
    setNewField({
      name: field.name,
      fieldKey: field.fieldKey,
      type: field.type,
      required: field.required,
      options: field.options || [],
      placeholder: field.placeholder || '',
      defaultValue: field.defaultValue || '',
      validation: field.validation || ''
    })
    setShowAddModal(true)
  }

  const handleDeleteField = (id: number) => {
    const field = fields.find((f: CustomField) => f.id === id)
    setFields(fields.filter((f: CustomField) => f.id !== id))
    toast.success(`Field "${field?.name}" deleted successfully`)
  }

  const handleAddOption = () => {
    if (!optionInput.trim()) return
    setNewField({
      ...newField,
      options: [...newField.options, optionInput.trim()]
    })
    setOptionInput('')
  }

  const handleRemoveOption = (index: number) => {
    setNewField({
      ...newField,
      options: newField.options.filter((_, i) => i !== index)
    })
  }

  const resetForm = () => {
    setShowAddModal(false)
    setEditingField(null)
    setNewField({
      name: '',
      fieldKey: '',
      type: 'text',
      required: false,
      options: [],
      placeholder: '',
      defaultValue: '',
      validation: ''
    })
    setOptionInput('')
  }

  const getFieldTypeIcon = (type: string) => {
    const fieldType = fieldTypes.find((ft) => ft.value === type)
    return fieldType?.icon || Type
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Custom Fields Manager</h1>
          <p className="mt-2 text-muted-foreground">
            Create and manage custom fields for your leads
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Custom Field
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fields</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fields.length}</div>
            <p className="text-xs text-muted-foreground">
              Custom fields created
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Required Fields</CardTitle>
            <Type className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requiredCount}</div>
            <p className="text-xs text-muted-foreground">
              Mandatory when creating leads
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsage}</div>
            <p className="text-xs text-muted-foreground">
              Times fields have been filled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Field Types</CardTitle>
            <List className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Set(fields.map((f: CustomField) => f.type)).size}</div>
            <p className="text-xs text-muted-foreground">
              Different field types used
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Fields Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Custom Fields</CardTitle>
          <CardDescription>
            Manage your custom fields and view usage statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Field Name</TableHead>
                <TableHead>Field Key</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Required</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field: CustomField) => {
                const Icon = getFieldTypeIcon(field.type)
                return (
                  <TableRow key={field.id}>
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    </TableCell>
                    <TableCell className="font-medium">{field.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono">
                      {field.fieldKey}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm capitalize">{field.type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {field.required ? (
                        <Badge variant="destructive" className="text-xs">Required</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Optional</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{field.usageCount}</span>
                        <span className="text-xs text-muted-foreground">leads</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditField(field)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteField(field.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {fields.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No custom fields created yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Field Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>{editingField ? 'Edit Custom Field' : 'Add Custom Field'}</CardTitle>
              <CardDescription>
                {editingField ? 'Update field configuration' : 'Create a new custom field for lead data'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Field Name *</label>
                  <Input
                    placeholder="e.g., Industry"
                    value={newField.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setNewField({
                        ...newField,
                        name: e.target.value,
                        fieldKey: generateFieldKey(e.target.value)
                      })
                    }}
                    className="mt-2"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Field Key (Auto-generated)</label>
                  <Input
                    placeholder="field_key"
                    value={newField.fieldKey}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewField({ ...newField, fieldKey: e.target.value })
                    }
                    className="mt-2 font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Field Type *</label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {fieldTypes.map((type) => {
                    const Icon = type.icon
                    return (
                      <button
                        key={type.value}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                          newField.type === type.value
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setNewField({ ...newField, type: type.value as CustomField['type'] })}
                      >
                        <Icon className="h-5 w-5 mt-0.5" />
                        <div className="text-left">
                          <p className="font-medium text-sm">{type.label}</p>
                          <p className="text-xs text-muted-foreground">{type.description}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {newField.type === 'dropdown' && (
                <div>
                  <label className="text-sm font-medium">Dropdown Options *</label>
                  <div className="mt-2 space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add an option..."
                        value={optionInput}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOptionInput(e.target.value)}
                        onKeyDown={(e: React.KeyboardEvent) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddOption()
                          }
                        }}
                      />
                      <Button type="button" onClick={handleAddOption}>Add</Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {newField.options.map((option: string, index: number) => (
                        <Badge key={index} variant="secondary" className="gap-2">
                          {option}
                          <button
                            onClick={() => handleRemoveOption(index)}
                            className="hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Placeholder Text</label>
                <Input
                  placeholder="e.g., Enter industry name"
                  value={newField.placeholder}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewField({ ...newField, placeholder: e.target.value })
                  }
                  className="mt-2"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="required"
                  checked={newField.required}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewField({ ...newField, required: e.target.checked })
                  }
                  className="rounded"
                />
                <label htmlFor="required" className="text-sm font-medium cursor-pointer">
                  Make this field required
                </label>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={resetForm}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={editingField ? handleUpdateField : handleAddField}
                  className="flex-1"
                >
                  {editingField ? 'Update Field' : 'Create Field'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
