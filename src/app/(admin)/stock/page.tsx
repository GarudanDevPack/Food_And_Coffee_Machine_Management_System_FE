'use client'
import PageTitle from '@/components/PageTitle'
import { itemsApi, machinesApi } from '@/lib/api'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { Badge, Button, Card, CardBody, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap'
import { toast } from 'react-toastify'
import Swal from 'sweetalert2'

interface Machine { _id: string; machineId: string; name: string; machineType?: string; inventory?: InventoryItem[]; batches?: Batch[] }
interface InventoryItem { itemId: string; itemName?: string; currentStock: number; minStock?: number; nozzle?: number; gramsPerCup?: number }
interface Batch { batchId: string; itemId: string; itemName?: string; nozzleId?: number; quantity: number; expiryDate?: string; status?: string }
interface Item { _id?: string; id?: string; name: string; itemType: string; cupSizes?: { size: string }[] }

const CUP_SIZES = [90, 120, 150, 180, 200]

// ── Coffee Stock Modal (Add & Update) ─────────────────────────────────────────
const CoffeeStockModal = ({ show, onHide, machineId, token, onSaved, editingInv }: any) => {
  const [coffeeItems, setCoffeeItems] = useState<Item[]>([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    itemId: '',
    packetofstock: '',
    qty: '',
    cupsize: '120',
    nozzle: '1',
  })

  const isEdit = !!editingInv

  useEffect(() => {
    if (!token) return
    itemsApi.list(token, { itemType: 'coffee' }).then((d) => setCoffeeItems(d as Item[])).catch(() => {})
  }, [token])

  useEffect(() => {
    if (editingInv) {
      setForm({
        itemId: editingInv.itemId ?? '',
        packetofstock: String(editingInv.currentStock ?? ''),
        qty: editingInv.gramsPerCup && editingInv.currentStock
          ? String(Math.round(editingInv.currentStock / editingInv.gramsPerCup))
          : '',
        cupsize: '120',
        nozzle: String(editingInv.nozzle ?? 1),
      })
    } else {
      setForm({ itemId: '', packetofstock: '', qty: '', cupsize: '120', nozzle: '1' })
    }
  }, [editingInv, show])

  const set = (f: string) => (e: any) => setForm((p) => ({ ...p, [f]: e.target.value }))

  const handleItemChange = (e: any) => {
    const id = e.target.value
    setForm((p) => ({ ...p, itemId: id }))
  }

  const gramsPerCup =
    form.packetofstock && form.qty && Number(form.qty) > 0
      ? (Number(form.packetofstock) / Number(form.qty)).toFixed(2)
      : ''

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const packet = Number(form.packetofstock)
    const qty = Number(form.qty)
    if (!packet || !qty) { toast.warning('Packet weight and cup count are required'); return }
    const ratio = packet / qty
    if (ratio < 3 || ratio > 29) {
      toast.warning(`Grams per cup must be 3–29g. Current: ${ratio.toFixed(2)}g`)
      return
    }
    setSaving(true)
    try {
      await machinesApi.updateInventory(token, machineId, {
        itemId: form.itemId,
        currentStock: packet,
        gramsPerCup: Number(gramsPerCup),
        nozzle: Number(form.nozzle),
      })
      toast.success(isEdit ? 'Stock updated' : 'Item added to inventory')
      onSaved()
      onHide()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{isEdit ? 'Update Coffee Stock' : 'Add Item to Inventory'}</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Item <span className="text-danger">*</span></Form.Label>
            <Form.Select value={form.itemId} onChange={handleItemChange} disabled={isEdit} required>
              <option value="">— Select coffee item —</option>
              {coffeeItems.map((i) => (
                <option key={i._id ?? i.id} value={i._id ?? i.id}>{i.name}</option>
              ))}
            </Form.Select>
          </Form.Group>

          <Row className="mb-3">
            <Col>
              <Form.Group>
                <Form.Label>Packet Weight (g) <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="number" min={1} value={form.packetofstock} onChange={set('packetofstock')}
                  placeholder="e.g. 250"
                  onFocus={() => toast.info('Enter the total packet weight in grams', { autoClose: 3000 })}
                  required
                />
              </Form.Group>
            </Col>
            <Col>
              <Form.Group>
                <Form.Label>Cup Count <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="number" min={1} value={form.qty} onChange={set('qty')}
                  placeholder="e.g. 14"
                  onFocus={() => toast.info('Number of cups this packet makes', { autoClose: 3000 })}
                  required
                />
              </Form.Group>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col>
              <Form.Group>
                <Form.Label>Cup Size (ml)</Form.Label>
                <Form.Select value={form.cupsize} onChange={set('cupsize')}>
                  {CUP_SIZES.map((ml) => (
                    <option key={ml} value={String(ml)}>{ml} ml</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col>
              <Form.Group>
                <Form.Label>Grams per Cup</Form.Label>
                <Form.Control
                  value={gramsPerCup}
                  readOnly
                  placeholder="Auto-calculated"
                  className="bg-light"
                  onFocus={() => toast.info('Grams used per cup (auto-calculated)', { autoClose: 3000 })}
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>Nozzle #</Form.Label>
            <Form.Control type="number" min={1} value={form.nozzle} onChange={set('nozzle')} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onHide}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? <Spinner size="sm" className="me-1" /> : null}
            {isEdit ? 'Update Stock' : 'Add to Inventory'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}

// ── Load Food Batch Modal ──────────────────────────────────────────────────────
const defaultExpiry = () => {
  const d = new Date()
  d.setHours(d.getHours() + 3)
  // Format for datetime-local input: "YYYY-MM-DDTHH:MM"
  return d.toISOString().slice(0, 16)
}

const LoadBatchModal = ({ show, onHide, machineId, token, onSaved }: any) => {
  const [foodItems, setFoodItems] = useState<Item[]>([])
  const [form, setForm] = useState({ itemId: '', itemName: '', nozzleId: '1', quantity: '', expiryDate: defaultExpiry() })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!token) return
    itemsApi.list(token, { itemType: 'food' }).then((d) => setFoodItems(d as Item[])).catch(() => {})
  }, [token])

  useEffect(() => {
    if (!show) setForm({ itemId: '', itemName: '', nozzleId: '1', quantity: '', expiryDate: defaultExpiry() })
  }, [show])

  const set = (f: string) => (e: any) => setForm((p) => ({ ...p, [f]: e.target.value }))

  const handleItemChange = (e: any) => {
    const selectedName = e.target.options[e.target.selectedIndex].text
    const id = e.target.value
    // Find item by name match as fallback (avoids _id type mismatch)
    const item = foodItems.find((i) => String(i._id ?? i.id) === id || i.name === selectedName)
    setForm((p) => ({ ...p, itemId: id, itemName: item?.name ?? selectedName }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.itemName) { toast.warning('Please select an item'); return }
    setSaving(true)
    try {
      await machinesApi.addBatch(token, machineId, {
        itemId: form.itemId,
        itemName: form.itemName,
        nozzleId: Number(form.nozzleId),
        quantity: Number(form.quantity),
        expiryDate: new Date(form.expiryDate).toISOString(),
      })
      toast.success('Batch loaded successfully')
      onSaved()
      onHide()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load batch')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton><Modal.Title>Load Food Batch</Modal.Title></Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Item <span className="text-danger">*</span></Form.Label>
            <Form.Select value={form.itemId} onChange={handleItemChange} required>
              <option value="">— Select food item —</option>
              {foodItems.map((i) => (
                <option key={String(i._id ?? i.id)} value={String(i._id ?? i.id)}>{i.name}</option>
              ))}
            </Form.Select>
          </Form.Group>
          <Row className="mb-3">
            <Col>
              <Form.Group>
                <Form.Label>Nozzle ID</Form.Label>
                <Form.Control type="number" min={1} value={form.nozzleId} onChange={set('nozzleId')} />
              </Form.Group>
            </Col>
            <Col>
              <Form.Group>
                <Form.Label>Quantity <span className="text-danger">*</span></Form.Label>
                <Form.Control type="number" min={1} value={form.quantity} onChange={set('quantity')} required />
              </Form.Group>
            </Col>
          </Row>
          <Form.Group className="mb-3">
            <Form.Label>Expiry Date &amp; Time <span className="text-danger">*</span></Form.Label>
            <Form.Control type="datetime-local" value={form.expiryDate} onChange={set('expiryDate')} required />
            <Form.Text className="text-muted">Default: 3 hours from now</Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onHide}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? <Spinner size="sm" className="me-1" /> : null} Load Batch
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function StockPage() {
  const { data: session } = useSession()
  const token = (session?.user as any)?.token ?? ''

  const [machines, setMachines] = useState<Machine[]>([])
  const [selectedMachineId, setSelectedMachineId] = useState('')   // stores machineId string e.g. "MCH-001"
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [batchLoading, setBatchLoading] = useState(false)
  const [showLoadBatch, setShowLoadBatch] = useState(false)
  const [showCoffeeModal, setShowCoffeeModal] = useState(false)
  const [editingInv, setEditingInv] = useState<InventoryItem | null>(null)

  const fetchMachines = () => {
    if (!token) return
    machinesApi.list(token).then((d) => {
      setMachines(d as Machine[])
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { fetchMachines() }, [token])

  const selectedMachine = machines.find((m) => m.machineId === selectedMachineId)

  const fetchBatches = () => {
    if (!selectedMachine || selectedMachine.machineType !== 'food') { setBatches([]); return }
    setBatchLoading(true)
    machinesApi.getBatches(token, selectedMachine.machineId)
      .then((d) => setBatches(d as Batch[]))
      .catch(() => {})
      .finally(() => setBatchLoading(false))
  }

  useEffect(() => { fetchBatches() }, [selectedMachineId])

  const handleDeleteBatch = async (batch: Batch) => {
    if (!selectedMachine) return
    const result = await Swal.fire({
      title: 'Remove Batch?',
      text: `Batch "${batch.batchId}" will be removed.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Remove',
    })
    if (!result.isConfirmed) return
    try {
      await machinesApi.deleteBatch(token, selectedMachine.machineId, batch.batchId)
      toast.success('Batch removed')
      fetchBatches()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed')
    }
  }

  const stockBadge = (inv: InventoryItem) => {
    if (inv.currentStock === 0) return 'danger'
    if (inv.currentStock <= (inv.minStock ?? 5)) return 'warning'
    return 'success'
  }

  const batchStatusBg = (s?: string) => s === 'active' ? 'success' : s === 'expired' ? 'danger' : 'secondary'

  return (
    <>
      <PageTitle title="Stock Management" subTitle="Operations" />

      <Card className="mb-3">
        <CardBody>
          <Form.Group>
            <Form.Label className="fw-semibold">Select Machine</Form.Label>
            <Form.Select value={selectedMachineId} onChange={(e) => setSelectedMachineId(e.target.value)} style={{ maxWidth: 420 }}>
              <option value="">— Choose a machine —</option>
              {machines.map((m) => (
                <option key={m.machineId} value={m.machineId}>
                  {m.name} ({m.machineType ?? 'coffee'}) — {m.machineId}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </CardBody>
      </Card>

      {loading && <div className="text-center py-4"><Spinner /></div>}

      {/* ── Coffee Machine Inventory ── */}
      {selectedMachine && selectedMachine.machineType !== 'food' && (
        <Card>
          <div className="d-flex card-header align-items-center">
            <h5 className="mb-0 me-auto">Coffee Inventory — {selectedMachine.name}</h5>
            <Button
              variant="primary" size="sm"
              onClick={() => { setEditingInv(null); setShowCoffeeModal(true) }}
            >
              <i className="ri-add-line me-1" /> Add Item
            </Button>
          </div>
          <CardBody className="p-0">
            <div className="table-responsive">
              <Table className="table-custom table-centered table-sm table-hover mb-0">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="text-center">Current Stock (g)</th>
                    <th className="text-center">Min Stock</th>
                    <th className="text-center">Nozzle</th>
                    <th className="text-center">g/Cup</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!selectedMachine.inventory?.length ? (
                    <tr><td colSpan={6} className="text-center text-muted py-4">No inventory — click "Add Item" to load stock</td></tr>
                  ) : selectedMachine.inventory.map((inv) => (
                    <tr key={inv.itemId}>
                      <td className="fw-semibold">{inv.itemName ?? <code className="fs-12">{inv.itemId}</code>}</td>
                      <td className="text-center">
                        <Badge bg={stockBadge(inv)}>{inv.currentStock}g</Badge>
                      </td>
                      <td className="text-center text-muted">{inv.minStock ?? '—'}</td>
                      <td className="text-center text-muted">{inv.nozzle ?? '—'}</td>
                      <td className="text-center text-muted">{inv.gramsPerCup ? `${inv.gramsPerCup}g` : '—'}</td>
                      <td className="text-center">
                        <Button
                          variant="soft-primary" size="sm"
                          onClick={() => { setEditingInv(inv); setShowCoffeeModal(true) }}
                          title="Update stock"
                        >
                          <i className="ri-pencil-line" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── Food Machine Batches ── */}
      {selectedMachine && selectedMachine.machineType === 'food' && (
        <Card>
          <div className="d-flex card-header align-items-center">
            <h5 className="mb-0 me-auto">Food Batches — {selectedMachine.name}</h5>
            <Button variant="primary" size="sm" onClick={() => setShowLoadBatch(true)}>
              <i className="ri-add-line me-1" /> Load Batch
            </Button>
          </div>
          <CardBody className="p-0">
            {batchLoading ? <div className="text-center py-4"><Spinner /></div> : (
              <div className="table-responsive">
                <Table className="table-custom table-centered table-sm table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Batch ID</th>
                      <th>Item</th>
                      <th className="text-center">Nozzle</th>
                      <th className="text-center">Qty</th>
                      <th>Expiry</th>
                      <th>Status</th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.length === 0 ? (
                      <tr><td colSpan={7} className="text-center text-muted py-4">No batches loaded</td></tr>
                    ) : batches.map((b) => (
                      <tr key={b.batchId}>
                        <td><code className="fs-12">{b.batchId}</code></td>
                        <td>{b.itemName ?? b.itemId}</td>
                        <td className="text-center">{b.nozzleId ?? '—'}</td>
                        <td className="text-center fw-semibold">{b.quantity}</td>
                        <td className={b.expiryDate && new Date(b.expiryDate) < new Date() ? 'text-danger fw-semibold' : ''}>
                          {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : '—'}
                        </td>
                        <td>
                          <Badge bg={batchStatusBg(b.status)} className="text-capitalize">
                            {b.status ?? 'active'}
                          </Badge>
                        </td>
                        <td className="text-center">
                          <Button
                            variant="soft-danger" size="sm"
                            onClick={() => handleDeleteBatch(b)}
                            title="Remove batch"
                          >
                            <i className="ri-delete-bin-line" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      <CoffeeStockModal
        show={showCoffeeModal}
        onHide={() => setShowCoffeeModal(false)}
        machineId={selectedMachine?.machineId}
        token={token}
        editingInv={editingInv}
        onSaved={fetchMachines}
      />
      <LoadBatchModal
        show={showLoadBatch}
        onHide={() => setShowLoadBatch(false)}
        machineId={selectedMachine?.machineId}
        token={token}
        onSaved={fetchBatches}
      />
    </>
  )
}
