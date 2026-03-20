'use client'
import PageTitle from '@/components/PageTitle'
import { itemsApi } from '@/lib/api'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { Badge, Button, Card, CardBody, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap'
import { toast } from 'react-toastify'
import Swal from 'sweetalert2'

interface Item {
  _id?: string
  id?: string
  name: string
  category?: string
  itemType?: string
  unitPrice?: number
  cupSizes?: { size: string; price: number }[]
  isAvailable?: boolean
  bayesianRating?: number
  description?: string
  imageUrl?: string
}

// ── Item Modal ────────────────────────────────────────────────────────────────
const ItemModal = ({ show, onHide, item, token, onSaved }: any) => {
  const [form, setForm] = useState<any>({ name: '', category: '', itemType: 'coffee', description: '', imageUrl: '', unitPrice: '', isAvailable: true })
  const [cupSizes, setCupSizes] = useState<{ size: string; price: string }[]>([{ size: 'small', price: '' }])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (item) {
      setForm({ name: item.name ?? '', category: item.category ?? '', itemType: item.itemType ?? 'coffee', description: item.description ?? '', imageUrl: item.imageUrl ?? '', unitPrice: item.unitPrice ?? '', isAvailable: item.isAvailable !== false })
      setCupSizes(item.cupSizes?.map((c: any) => ({ size: c.size, price: String(c.price) })) ?? [{ size: 'small', price: '' }])
    } else {
      setForm({ name: '', category: '', itemType: 'coffee', description: '', imageUrl: '', unitPrice: '', isAvailable: true })
      setCupSizes([{ size: 'small', price: '' }])
    }
  }, [item, show])

  const set = (f: string) => (e: any) => setForm((p: any) => ({ ...p, [f]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: any = {
        name: form.name.trim(),
        category: form.category.trim() || undefined,
        itemType: form.itemType,
        description: form.description.trim() || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
        isAvailable: form.isAvailable,
      }
      if (form.itemType === 'food') {
        payload.unitPrice = Number(form.unitPrice)
      } else {
        payload.cupSizes = cupSizes.filter((c) => c.size && c.price).map((c) => ({ size: c.size, price: Number(c.price) }))
      }

      if (item) {
        await itemsApi.update(token, item._id ?? item.id, payload)
        toast.success('Item updated')
      } else {
        await itemsApi.create(token, payload)
        toast.success('Item created')
      }
      onSaved()
      onHide()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save item')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton><Modal.Title>{item ? 'Edit Item' : 'Add Item'}</Modal.Title></Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Row>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label>Name <span className="text-danger">*</span></Form.Label>
                <Form.Control value={form.name} onChange={set('name')} placeholder="e.g. Espresso" required />
              </Form.Group>
            </Col>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label>Type</Form.Label>
                <Form.Select value={form.itemType} onChange={set('itemType')}>
                  <option value="coffee">Coffee</option>
                  <option value="food">Food</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
          <Form.Group className="mb-3">
            <Form.Label>Category</Form.Label>
            <Form.Control value={form.category} onChange={set('category')} placeholder="e.g. hot, cold, snack" />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control as="textarea" rows={2} value={form.description} onChange={set('description')} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Image URL</Form.Label>
            <Form.Control value={form.imageUrl} onChange={set('imageUrl')} placeholder="https://..." />
          </Form.Group>

          {form.itemType === 'food' ? (
            <Form.Group className="mb-3">
              <Form.Label>Unit Price (LKR) <span className="text-danger">*</span></Form.Label>
              <Form.Control type="number" min={0} value={form.unitPrice} onChange={set('unitPrice')} required />
            </Form.Group>
          ) : (
            <div className="mb-3">
              <Form.Label>Cup Sizes &amp; Prices</Form.Label>
              {cupSizes.map((cs, idx) => (
                <Row key={idx} className="mb-2 g-2 align-items-center">
                  <Col>
                    <Form.Control placeholder="Size (e.g. small)" value={cs.size} onChange={(e) => setCupSizes((p) => p.map((c, i) => i === idx ? { ...c, size: e.target.value } : c))} />
                  </Col>
                  <Col>
                    <Form.Control type="number" placeholder="Price (LKR)" value={cs.price} onChange={(e) => setCupSizes((p) => p.map((c, i) => i === idx ? { ...c, price: e.target.value } : c))} />
                  </Col>
                  <Col xs="auto">
                    <Button variant="outline-danger" size="sm" onClick={() => setCupSizes((p) => p.filter((_, i) => i !== idx))} disabled={cupSizes.length === 1}>✕</Button>
                  </Col>
                </Row>
              ))}
              <Button variant="outline-secondary" size="sm" onClick={() => setCupSizes((p) => [...p, { size: '', price: '' }])}>+ Add Size</Button>
            </div>
          )}

          <Form.Check type="switch" id="isAvailable" label="Available for ordering" checked={form.isAvailable} onChange={(e) => setForm((p: any) => ({ ...p, isAvailable: e.target.checked }))} />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onHide}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? <Spinner size="sm" className="me-1" /> : null}
            {item ? 'Save Changes' : 'Create Item'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ItemsPage() {
  const { data: session } = useSession()
  const token = (session?.user as any)?.token ?? ''

  const [items, setItems] = useState<Item[]>([])
  const [filter, setFilter] = useState<'all' | 'coffee' | 'food'>('all')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Item | null>(null)

  const fetchItems = async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await itemsApi.list(token)
      setItems(data as Item[])
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load items')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchItems() }, [token])

  const handleDelete = async (item: Item) => {
    const result = await Swal.fire({ title: 'Delete Item?', text: `"${item.name}" will be marked unavailable.`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Delete' })
    if (!result.isConfirmed) return
    try {
      await itemsApi.delete(token, item._id ?? item.id)
      toast.success('Item deleted')
      fetchItems()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed')
    }
  }

  const filtered = filter === 'all' ? items : items.filter((i) => i.itemType === filter)
  const coffeeCount = items.filter((i) => i.itemType === 'coffee').length
  const foodCount = items.filter((i) => i.itemType === 'food').length

  return (
    <>
      <PageTitle title="Items Management" subTitle="Operations" />

      <Row className="mb-3 align-items-center">
        <Col>
          <div className="d-flex gap-2">
            {(['all', 'coffee', 'food'] as const).map((f) => (
              <Button key={f} variant={filter === f ? 'primary' : 'light'} size="sm" onClick={() => setFilter(f)} className="text-capitalize">
                {f === 'all' ? `All (${items.length})` : f === 'coffee' ? `Coffee (${coffeeCount})` : `Food (${foodCount})`}
              </Button>
            ))}
          </div>
        </Col>
        <Col xs="auto">
          <Button variant="primary" size="sm" onClick={() => { setEditing(null); setShowModal(true) }}>+ Add Item</Button>
          <Button variant="light" size="sm" className="ms-2" onClick={fetchItems} disabled={loading}>
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
                    <th>Name</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Pricing</th>
                    <th>Rating</th>
                    <th>Available</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="text-center text-muted py-4">No items found</td></tr>
                  ) : filtered.map((item) => (
                    <tr key={item._id ?? item.id}>
                      <td className="fw-semibold">{item.name}</td>
                      <td>
                        <Badge bg={item.itemType === 'food' ? 'warning' : 'info'} className="text-capitalize">
                          {item.itemType ?? 'coffee'}
                        </Badge>
                      </td>
                      <td className="text-muted text-capitalize">{item.category ?? '—'}</td>
                      <td>
                        {item.itemType === 'food'
                          ? <span className="text-success fw-semibold">LKR {item.unitPrice}</span>
                          : <span className="text-muted fs-12">{item.cupSizes?.map((c) => `${c.size}: ${c.price}`).join(', ') || '—'}</span>
                        }
                      </td>
                      <td>
                        {item.bayesianRating ? (
                          <span className="text-warning fw-semibold">★ {(item.bayesianRating as number).toFixed(1)}</span>
                        ) : <span className="text-muted">—</span>}
                      </td>
                      <td>
                        <Badge bg={item.isAvailable !== false ? 'success' : 'secondary'}>
                          {item.isAvailable !== false ? 'Yes' : 'No'}
                        </Badge>
                      </td>
                      <td className="text-center">
                        <div className="d-flex gap-1 justify-content-center">
                          <Button variant="soft-primary" size="sm" onClick={() => { setEditing(item); setShowModal(true) }}><i className="ri-edit-line" /></Button>
                          <Button variant="soft-danger" size="sm" onClick={() => handleDelete(item)}><i className="ri-delete-bin-line" /></Button>
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

      <ItemModal show={showModal} onHide={() => setShowModal(false)} item={editing} token={token} onSaved={fetchItems} />
    </>
  )
}
