'use client'
import PageTitle from '@/components/PageTitle'
import { outletsApi } from '@/lib/api'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { Badge, Button, Card, CardBody, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap'
import { toast } from 'react-toastify'
import Swal from 'sweetalert2'

interface Outlet {
  _id?: string
  id?: string
  outletId?: string
  name?: string
  location?: string
  agentId?: string
  clientId?: string
  machineIds?: string[]
  qrToken?: string
  isActive?: boolean
  createdAt?: string
}

// ── Outlet Modal ──────────────────────────────────────────────────────────────
const OutletModal = ({ show, onHide, editing, token, onSaved }: any) => {
  const blank = { name: '', location: '', agentId: '', clientId: '' }
  const [form, setForm] = useState(blank)
  const [saving, setSaving] = useState(false)
  const set = (f: string) => (e: any) => setForm((p) => ({ ...p, [f]: e.target.value }))

  useEffect(() => {
    if (show) {
      setForm(editing
        ? { name: editing.name ?? '', location: editing.location ?? '', agentId: editing.agentId ?? '', clientId: editing.clientId ?? '' }
        : blank)
    }
  }, [show, editing])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        location: form.location || undefined,
        agentId: form.agentId,
        clientId: form.clientId || undefined,
      }
      if (editing) {
        await outletsApi.update(token, editing._id ?? editing.id, payload)
        toast.success('Outlet updated')
      } else {
        await outletsApi.create(token, payload)
        toast.success('Outlet created')
      }
      onSaved()
      onHide()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save outlet')
    } finally { setSaving(false) }
  }

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{editing ? 'Edit Outlet' : 'Add Outlet'}</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Outlet Name <span className="text-danger">*</span></Form.Label>
            <Form.Control value={form.name} onChange={set('name')} placeholder="e.g. Main Canteen" required />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Location</Form.Label>
            <Form.Control value={form.location} onChange={set('location')} placeholder="e.g. Block A, Ground Floor" />
          </Form.Group>
          <Row>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label>Agent ID <span className="text-danger">*</span></Form.Label>
                <Form.Control value={form.agentId} onChange={set('agentId')} placeholder="Agent MongoDB _id" required />
              </Form.Group>
            </Col>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label>Client ID</Form.Label>
                <Form.Control value={form.clientId} onChange={set('clientId')} placeholder="Client MongoDB _id" />
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onHide}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? <Spinner size="sm" className="me-1" /> : null}
            {editing ? 'Update Outlet' : 'Create Outlet'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function OutletsPage() {
  const { data: session } = useSession()
  const token = (session?.user as any)?.token ?? ''

  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Outlet | null>(null)

  const fetchOutlets = async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await outletsApi.list(token)
      setOutlets(data as Outlet[])
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load outlets')
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchOutlets() }, [token])

  const handleDelete = async (o: Outlet) => {
    const r = await Swal.fire({
      title: 'Delete Outlet?',
      text: `"${o.name}" will be removed.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Delete',
    })
    if (!r.isConfirmed) return
    try {
      await outletsApi.delete(token, o._id ?? o.id)
      toast.success('Outlet deleted')
      fetchOutlets()
    } catch (err: any) { toast.error(err.message ?? 'Failed to delete') }
  }

  const activeCount = outlets.filter((o) => o.isActive !== false).length

  return (
    <>
      <PageTitle title="Outlet Management" subTitle="Operations" />

      <Row className="mb-3 align-items-center">
        <Col>
          <div className="d-flex gap-2 flex-wrap">
            <Badge bg="secondary" className="fs-13 fw-normal px-3 py-2">Total: {outlets.length}</Badge>
            <Badge bg="success" className="fs-13 fw-normal px-3 py-2">Active: {activeCount}</Badge>
            <Badge bg="danger" className="fs-13 fw-normal px-3 py-2">Inactive: {outlets.length - activeCount}</Badge>
          </div>
        </Col>
        <Col xs="auto">
          <Button variant="primary" size="sm" onClick={() => { setEditing(null); setShowModal(true) }}>
            <i className="ri-add-line me-1" /> Add Outlet
          </Button>
          <Button variant="light" size="sm" className="ms-2" onClick={fetchOutlets} disabled={loading}>
            {loading ? <Spinner size="sm" /> : <i className="ri-refresh-line" />} Refresh
          </Button>
        </Col>
      </Row>

      <Card>
        <CardBody className="p-0">
          {loading ? (
            <div className="text-center py-5"><Spinner /></div>
          ) : (
            <div className="table-responsive">
              <Table className="table-custom table-centered table-sm table-nowrap table-hover mb-0">
                <thead>
                  <tr>
                    <th>Outlet ID</th>
                    <th>Name</th>
                    <th>Location</th>
                    <th>Agent ID</th>
                    <th className="text-center">Machines</th>
                    <th>QR Token</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {outlets.length === 0 ? (
                    <tr><td colSpan={9} className="text-center text-muted py-4">No outlets found</td></tr>
                  ) : outlets.map((o, i) => (
                    <tr key={o._id ?? o.id ?? i}>
                      <td><code className="fs-12">{o.outletId ?? (o._id ?? o.id)?.slice(-8)}</code></td>
                      <td className="fw-semibold">{o.name ?? '—'}</td>
                      <td className="text-muted">{o.location ?? '—'}</td>
                      <td><code className="fs-12 text-muted">{o.agentId?.slice(-8) ?? '—'}</code></td>
                      <td className="text-center">
                        <Badge bg="info">{o.machineIds?.length ?? 0}</Badge>
                      </td>
                      <td>
                        <code className="fs-11 text-muted">{o.qrToken ? o.qrToken.slice(0, 12) + '…' : '—'}</code>
                      </td>
                      <td>
                        <Badge bg={o.isActive !== false ? 'success' : 'danger'}>
                          {o.isActive !== false ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="text-muted fs-12">
                        {o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-GB') : '—'}
                      </td>
                      <td className="text-center">
                        <div className="d-flex gap-1 justify-content-center">
                          <Button variant="soft-primary" size="sm" onClick={() => { setEditing(o); setShowModal(true) }} title="Edit">
                            <i className="ri-edit-line" />
                          </Button>
                          <Button variant="soft-danger" size="sm" onClick={() => handleDelete(o)} title="Delete">
                            <i className="ri-delete-bin-line" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </CardBody>
      </Card>

      <OutletModal
        show={showModal}
        onHide={() => setShowModal(false)}
        editing={editing}
        token={token}
        onSaved={fetchOutlets}
      />
    </>
  )
}
