import { updateSystemSettingsSchema, runMaintenanceSchema } from '../../src/validators/admin.validator'

describe('admin.validator', () => {
  describe('updateSystemSettingsSchema', () => {
    it('accepts valid settings', () => {
      expect(updateSystemSettingsSchema.safeParse({ maintenanceMode: true, aiEnabled: false }).success).toBe(true)
    })

    it('accepts empty object', () => {
      expect(updateSystemSettingsSchema.safeParse({}).success).toBe(true)
    })

    it('rejects maxUploadSize over 100', () => {
      expect(updateSystemSettingsSchema.safeParse({ maxUploadSize: 101 }).success).toBe(false)
    })

    it('accepts passthrough fields', () => {
      const res = updateSystemSettingsSchema.safeParse({ customField: 'value' })
      expect(res.success).toBe(true)
    })
  })

  describe('runMaintenanceSchema', () => {
    it('accepts valid operations', () => {
      const ops = ['optimize', 'vacuum', 'reindex', 'backup', 'backup_history', 'db_stats', 'restore']
      ops.forEach((op) => {
        expect(runMaintenanceSchema.safeParse({ operation: op }).success).toBe(true)
      })
    })

    it('rejects invalid operation', () => {
      expect(runMaintenanceSchema.safeParse({ operation: 'drop_all' }).success).toBe(false)
    })

    it('accepts optional vacuumFull flag', () => {
      expect(runMaintenanceSchema.safeParse({ operation: 'vacuum', vacuumFull: true }).success).toBe(true)
    })

    it('validates table name regex', () => {
      expect(runMaintenanceSchema.safeParse({ operation: 'optimize_table', table: 'users' }).success).toBe(true)
      expect(runMaintenanceSchema.safeParse({ operation: 'optimize_table', table: 'users; DROP TABLE' }).success).toBe(false)
    })
  })
})
