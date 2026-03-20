'use client'
import { useEffect, useState } from 'react'
import { Badge, Button, Card, CardBody, Col, Form, Modal, Row, Spinner } from 'react-bootstrap'
import { toast } from 'react-toastify'
import PageTitle from '@/components/PageTitle'
import { ordersApi, itemsApi } from '@/lib/api'
import { useApiToken } from '@/hooks/useApi'
import IconifyIcon from '@/components/wrappers/IconifyIcon'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'

type Order = {
  _id: string
  orderId?: string
  machineId: string
  items: { itemId?: string; itemName: string; quantity: number; price: number }[]
  totalAmount: number
  originalAmount?: number
  discountApplied?: number
  status: 'pending' | 'dispensing' | 'completed' | 'failed'
  createdAt: string
}

const STATUS_CONFIG: Record<string, { bg: string; label: string }> = {
  pending: { bg: 'warning', label: 'Pending' },
  dispensing: { bg: 'primary', label: 'Dispensing' },
  completed: { bg: 'success', label: 'Completed' },
  failed: { bg: 'danger', label: 'Failed' },
}

// ── Rating Modal ──────────────────────────────────────────────────────────────
const RateModal = ({
  show, onHide, order, token, onRated,
}: {
  show: boolean; onHide: () => void; order: Order | null; token: string; onRated: () => void
}) => {
  const [itemId, setItemId] = useState('')
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [hover, setHover] = useState(0)

  useEffect(() => {
    if (order && order.items.length > 0) {
      setItemId(order.items[0].itemId ?? '')
    }
    setRating(5); setComment('')
  }, [order, show])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!itemId) { toast.error('No item to rate'); return }
    setSaving(true)
    try {
      await fetch(`${BASE_URL}/items/ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ itemId, orderId: order!._id, rating, comment: comment.trim() || undefined }),
      }).then(async (r) => {
        if (!r.ok) { const b = await r.json().catch(() => ({})); throw new Error(b?.message || `HTTP ${r.status}`) }
      })
      toast.success('Rating submitted!')
      onRated(); onHide()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to submit rating')
    } finally { setSaving(false) }
  }

  return (
    <Modal show={show} onHide={onHide} centered size="sm">
      <Modal.Header closeButton>
        <Modal.Title className="fs-15">Rate Your Order</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {order && order.items.length > 1 && (
            <Form.Group className="mb-3">
              <Form.Label>Item</Form.Label>
              <Form.Select value={itemId} onChange={(e) => setItemId(e.target.value)}>
                {order.items.map((i, idx) => (
                  <option key={idx} value={i.itemId ?? ''}>{i.itemName}</option>
                ))}
              </Form.Select>
            </Form.Group>
          )}
          {order && order.items.length === 1 && (
            <div className="mb-3 fw-semibold text-center">{order.items[0].itemName}</div>
          )}

          {/* Star rating */}
          <Form.Group className="mb-3 text-center">
            <Form.Label className="d-block">Rating</Form.Label>
            <div className="d-flex justify-content-center gap-1" style={{ fontSize: 32 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  style={{ cursor: 'pointer', color: star <= (hover || rating) ? '#f0a500' : '#dee2e6' }}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(0)}>
                  ★
                </span>
              ))}
            </div>
            <div className="text-muted fs-12 mt-1">
              {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
            </div>
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label>Comment (optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              placeholder="Share your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" size="sm" onClick={onHide}>Cancel</Button>
          <Button type="submit" variant="warning" size="sm" disabled={saving}>
            {saving ? <Spinner size="sm" className="me-1" /> : <i className="ri-star-line me-1" />}
            Submit Rating
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
const CustomerOrdersPage = () => {
  const token = useApiToken()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null)
  const [ratedOrderIds, setRatedOrderIds] = useState<Set<string>>(new Set())

  const load = async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await ordersApi.myOrders(token)
      setOrders((data as Order[]).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
    } catch (err: any) {
      toast.error(err.message || 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (token) load() }, [token])

  const handleRated = (orderId: string) => {
    setRatedOrderIds((prev) => new Set([...prev, orderId]))
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
      </div>
    )
  }

  return (
    <>
      <PageTitle title="My Orders" subTitle="Order History" />

      <Row className="mb-3">
        <Col className="d-flex justify-content-end">
          <Button variant="outline-secondary" size="sm" onClick={load}>
            <IconifyIcon icon="ri:refresh-line" className="me-1" />
            Refresh
          </Button>
        </Col>
      </Row>

      {orders.length === 0 ? (
        <Card>
          <CardBody className="text-center py-5 text-muted">No orders yet</CardBody>
        </Card>
      ) : (
        <Row className="g-3">
          {orders.map((o) => {
            const cfg = STATUS_CONFIG[o.status] || { bg: 'secondary', label: o.status }
            const canRate = o.status === 'completed' && !ratedOrderIds.has(o._id) && o.items.some((i) => i.itemId)
            return (
              <Col key={o._id} xs={12} md={6} lg={4}>
                <Card className="h-100">
                  <CardBody>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <code className="fs-12 text-muted">{o.orderId || o._id.slice(-8)}</code>
                        <div className="text-muted" style={{ fontSize: 12 }}>
                          {new Date(o.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <Badge bg={cfg.bg}>{cfg.label}</Badge>
                    </div>

                    <div className="mb-2">
                      {o.items.map((i, idx) => (
                        <div key={idx} className="d-flex justify-content-between small">
                          <span>{i.itemName} × {i.quantity}</span>
                          <span className="text-muted">LKR {(i.price * i.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <hr className="my-2" />

                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-muted small">Machine: {o.machineId}</span>
                      <div className="text-end">
                        {o.discountApplied ? (
                          <>
                            <div className="text-muted text-decoration-line-through small">
                              LKR {o.originalAmount?.toFixed(2)}
                            </div>
                            <div className="fw-bold text-success">
                              LKR {o.totalAmount.toFixed(2)}
                              <Badge bg="success" className="ms-1 small">{o.discountApplied}% off</Badge>
                            </div>
                          </>
                        ) : (
                          <div className="fw-bold">LKR {o.totalAmount.toFixed(2)}</div>
                        )}
                      </div>
                    </div>

                    {canRate && (
                      <div className="mt-2 pt-2 border-top text-center">
                        <Button
                          variant="soft-warning"
                          size="sm"
                          onClick={() => setRatingOrder(o)}>
                          <i className="ri-star-line me-1" />Rate this order
                        </Button>
                      </div>
                    )}
                    {ratedOrderIds.has(o._id) && (
                      <div className="mt-2 pt-2 border-top text-center text-success fs-12">
                        <i className="ri-checkbox-circle-line me-1" />Rated — thank you!
                      </div>
                    )}
                  </CardBody>
                </Card>
              </Col>
            )
          })}
        </Row>
      )}

      <RateModal
        show={!!ratingOrder}
        onHide={() => setRatingOrder(null)}
        order={ratingOrder}
        token={token}
        onRated={() => { if (ratingOrder) handleRated(ratingOrder._id); setRatingOrder(null) }}
      />
    </>
  )
}

export default CustomerOrdersPage
