'use client'
import { useEffect, useState } from 'react'
import { Badge, Button, Card, CardBody, Col, Form, Row, Spinner, Table } from 'react-bootstrap'
import { toast } from 'react-toastify'
import PageTitle from '@/components/PageTitle'
import { ordersApi } from '@/lib/api'
import { useApiToken, useCurrentUser } from '@/hooks/useApi'
import IconifyIcon from '@/components/wrappers/IconifyIcon'

type Order = {
  _id: string
  orderId?: string
  machineId: string
  totalAmount: number
  status: 'pending' | 'dispensing' | 'completed' | 'failed'
  createdAt: string
  items?: { itemName: string; quantity: number }[]
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'warning',
  dispensing: 'primary',
  completed: 'success',
  failed: 'danger',
}

const AgentOrdersPage = () => {
  const token = useApiToken()
  const user = useCurrentUser()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const load = async () => {
    if (!token || !user?.id) return
    setLoading(true)
    try {
      const data = await ordersApi.list(token, { agentId: user.id })
      setOrders(data as Order[])
    } catch (err: any) {
      toast.error(err.message || 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token && user?.id) load()
  }, [token, user?.id])

  const handleComplete = async (id: string) => {
    if (!token) return
    setActionLoading(id)
    try {
      await ordersApi.complete(token, id)
      toast.success('Order marked completed')
      setOrders((prev) => prev.map((o) => (o._id === id ? { ...o, status: 'completed' } : o)))
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete order')
    } finally {
      setActionLoading(null)
    }
  }

  const handleFail = async (id: string) => {
    if (!token) return
    if (!confirm('Mark this order as failed?')) return
    setActionLoading(id)
    try {
      await ordersApi.fail(token, id)
      toast.success('Order marked failed')
      setOrders((prev) => prev.map((o) => (o._id === id ? { ...o, status: 'failed' } : o)))
    } catch (err: any) {
      toast.error(err.message || 'Failed to fail order')
    } finally {
      setActionLoading(null)
    }
  }

  const filtered = statusFilter ? orders.filter((o) => o.status === statusFilter) : orders

  return (
    <>
      <PageTitle title="Orders" subTitle="Orders for your machines" />

      <Row className="mb-3 align-items-center">
        <Col xs="auto">
          <Form.Select size="sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ minWidth: 160 }}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="dispensing">Dispensing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </Form.Select>
        </Col>
        <Col className="d-flex justify-content-end">
          <Button variant="outline-secondary" size="sm" onClick={load} disabled={loading}>
            <IconifyIcon icon="ri:refresh-line" className="me-1" />
            Refresh
          </Button>
        </Col>
      </Row>

      <Card>
        <CardBody className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-5 text-muted">No orders found</div>
          ) : (
            <div className="table-responsive">
              <Table className="table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Order ID</th>
                    <th>Machine</th>
                    <th>Items</th>
                    <th>Amount (LKR)</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o) => (
                    <tr key={o._id}>
                      <td><code className="fs-12">{o.orderId || o._id.slice(-8)}</code></td>
                      <td className="text-muted">{o.machineId}</td>
                      <td>
                        {o.items?.map((i) => `${i.itemName} x${i.quantity}`).join(', ') || '—'}
                      </td>
                      <td className="fw-semibold">{o.totalAmount?.toFixed(2)}</td>
                      <td>
                        <Badge bg={STATUS_COLORS[o.status] || 'secondary'} className="text-capitalize">
                          {o.status}
                        </Badge>
                      </td>
                      <td className="text-muted">{new Date(o.createdAt).toLocaleString()}</td>
                      <td className="text-end">
                        {o.status === 'dispensing' && (
                          <div className="d-flex gap-1 justify-content-end">
                            <Button
                              variant="outline-success"
                              size="sm"
                              onClick={() => handleComplete(o._id)}
                              disabled={actionLoading === o._id}
                            >
                              {actionLoading === o._id ? <Spinner size="sm" animation="border" /> : 'Complete'}
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleFail(o._id)}
                              disabled={actionLoading === o._id}
                            >
                              Fail
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </CardBody>
      </Card>
    </>
  )
}

export default AgentOrdersPage
