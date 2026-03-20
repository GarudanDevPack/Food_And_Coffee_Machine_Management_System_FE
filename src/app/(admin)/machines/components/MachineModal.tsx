'use client'
import { machinesApi } from '@/lib/api'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { Button, Form, Modal, Spinner } from 'react-bootstrap'
import { toast } from 'react-toastify'

interface Props {
  show: boolean
  onHide: () => void
  machine?: any
  onSaved: () => void
}

const MachineModal = ({ show, onHide, machine, onSaved }: Props) => {
  const { data: session } = useSession()
  const token = (session?.user as any)?.token ?? ''
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    machineType: 'coffee',
    location: '',
    agentId: '',
    clientId: '',
    orgId: '',
  })

  useEffect(() => {
    if (machine) {
      setForm({
        name: machine.name ?? '',
        machineType: machine.machineType ?? 'coffee',
        location: machine.location ?? '',
        agentId: machine.agentId ?? '',
        clientId: machine.clientId ?? '',
        orgId: machine.orgId ?? '',
      })
    } else {
      setForm({ name: '', machineType: 'coffee', location: '', agentId: '', clientId: '', orgId: '' })
    }
  }, [machine, show])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    try {
      const payload: any = {
        name: form.name.trim(),
        machineType: form.machineType,
        location: form.location.trim() || undefined,
        agentId: form.agentId.trim() || undefined,
        clientId: form.clientId.trim() || undefined,
        orgId: form.orgId.trim() || undefined,
      }

      if (machine) {
        await machinesApi.update(token, machine._id, payload)
        toast.success('Machine updated')
      } else {
        await machinesApi.create(token, payload)
        toast.success('Machine created')
      }
      onSaved()
      onHide()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save machine')
    } finally {
      setSaving(false)
    }
  }

  const set = (field: string) => (e: React.ChangeEvent<any>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }))

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{machine ? 'Edit Machine' : 'Add Machine'}</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {machine && (
            <Form.Group className="mb-3">
              <Form.Label className="text-muted small">Machine ID (auto-generated)</Form.Label>
              <Form.Control value={machine.machineId ?? '—'} readOnly className="bg-light text-muted" />
            </Form.Group>
          )}
          <Form.Group className="mb-3">
            <Form.Label>Name <span className="text-danger">*</span></Form.Label>
            <Form.Control value={form.name} onChange={set('name')} placeholder="e.g. Espresso Machine 1" required />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Machine Type</Form.Label>
            <Form.Select value={form.machineType} onChange={set('machineType')}>
              <option value="coffee">Coffee</option>
              <option value="food">Food / Vending</option>
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Location</Form.Label>
            <Form.Control value={form.location} onChange={set('location')} placeholder="e.g. Ground Floor, Block A" />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Agent ID</Form.Label>
            <Form.Control value={form.agentId} onChange={set('agentId')} placeholder="Agent MongoDB _id" />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Client ID</Form.Label>
            <Form.Control value={form.clientId} onChange={set('clientId')} placeholder="Client user _id" />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Organization ID</Form.Label>
            <Form.Control value={form.orgId} onChange={set('orgId')} placeholder="Organization _id" />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onHide} disabled={saving}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? <Spinner size="sm" className="me-1" /> : null}
            {machine ? 'Save Changes' : 'Create Machine'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}

export default MachineModal
