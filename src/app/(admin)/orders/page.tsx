'use client'
import PageTitle from '@/components/PageTitle'
import { ordersApi } from '@/lib/api'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { Badge, Button, Card, CardBody, Col, Form, Nav, Row, Spinner, Table } from 'react-bootstrap'
import { toast } from 'react-toastify'
import Swal from 'sweetalert2'

interface Order {
  _id?: string
  id?: string
  orderId?: string
  userId?: string
  agentId?: string | null
  machineId?: string
  itemId?: string
  itemName?: string
  cupSize?: string | null
  quantity?: number
  unitPrice?: number
  totalAmount?: number
  originalAmount?: number | null
  discountApplied?: number | null
  status?: string
  createdAt?: string
}

const statusBg = (s?: string) => {
  switch (s) {
    case 'completed': return 'success'
    case 'pending': return 'warning'
    case 'dispensing': return 'info'
    case 'failed': return 'danger'
    case 'refunded': return 'secondary'
    case 'cancelled': return 'dark'
    default: return 'secondary'
  }
}

export default function OrdersPage() {
  const { data: session } = useSession()
  const token = (session?.user as any)?.token ?? ''

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<string>('all')
  const [machineFilter, setMachineFilter] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const fetchOrders = async () => {
    if (!token) return
    setRefreshing(true)
    try {
      const params: any = {}
      if (tab !== 'all') params.status = tab
      if (machineFilter.trim()) params.machineId = machineFilter.trim()
      const data = await ordersApi.list(token, params)
      setOrders(data as Order[])
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load orders')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { fetchOrders() }, [token, tab])

  const handleComplete = async (o: Order) => {
    const r = await Swal.fire({ title: 'Mark Completed?', text: `Order ${o.orderId ?? (o._id ?? o.id ?? '').slice(-8)}`, icon: 'question', showCancelButton: true, confirmButtonColor: '#0acf97', confirmButtonText: 'Complete' })
    if (!r.isConfirmed) return
    try {
      await ordersApi.complete(token, o._id ?? o.id)
      toast.success('Order marked completed')
      fetchOrders()
    } catch (err: any) { toast.error(err.message ?? 'Failed') }
  }

  const handleFail = async (o: Order) => {
    const r = await Swal.fire({ title: 'Mark Failed?', text: `Order ${o.orderId ?? (o._id ?? o.id ?? '').slice(-8)}`, icon: 'warning', input: 'text', inputLabel: 'Reason (optional)', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Mark Failed' })
    if (!r.isConfirmed) return
    try {
      await ordersApi.fail(token, o._id ?? o.id, r.value || undefined)
      toast.success('Order marked failed')
      fetchOrders()
    } catch (err: any) { toast.error(err.message ?? 'Failed') }
  }

  const statuses = ['all', 'pending', 'dispensing', 'completed', 'failed', 'refunded', 'cancelled']
  const totalRevenue = orders.filter((o) => o.status === 'completed').reduce((s, o) => s + (o.totalAmount ?? 0), 0)
  const completedCount = orders.filter((o) => o.status === 'completed').length

  return (
    <>
      <PageTitle title="Order Management" subTitle="Operations" />

      {/* KPI row */}
      <Row className="mb-3">
        {[
          { label: 'Total Orders', value: orders.length, bg: 'secondary' },
          { label: 'Completed', value: completedCount, bg: 'success' },
          { label: 'Pending', value: orders.filter((o) => o.status === 'pending').length, bg: 'warning' },
          { label: 'Revenue', value: `LKR ${totalRevenue.toLocaleString()}`, bg: 'info' },
        ].map((k) => (
          <Col xs={6} md={3} key={k.label} className="mb-2">
            <Badge bg={k.bg} className="w-100 fs-13 fw-normal px-3 py-2 text-start">
              {k.label}: <strong>{k.value}</strong>
            </Badge>
          </Col>
        ))}
      </Row>

      <Card>
        {/* Tabs */}
        <div className="card-header border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
          <Nav variant="tabs" className="card-header-tabs flex-wrap">
            {statuses.map((s) => (
              <Nav.Item key={s}>
                <Nav.Link active={tab === s} onClick={() => setTab(s)} style={{ cursor: 'pointer', textTransform: 'capitalize' }}>
                  {s === 'all' ? `All (${orders.length})` : s}
                </Nav.Link>
              </Nav.Item>
            ))}
          </Nav>
          <div className="d-flex gap-2 align-items-center">
            <Form.Control
              size="sm"
              placeholder="Filter by Machine ID"
              value={machineFilter}
              onChange={(e) => setMachineFilter(e.target.value)}
              style={{ width: 180 }}
            />
            <Button variant="light" size="sm" onClick={fetchOrders} disabled={refreshing}>
              {refreshing ? <Spinner size="sm" /> : <i className="ri-refresh-line" />}
            </Button>
          </div>
        </div>

        <CardBody className="p-0">
          {loading ? (
            <div className="text-center py-5"><Spinner /></div>
          ) : (
            <div className="table-responsive">
              <Table className="table-custom table-centered table-sm table-nowrap table-hover mb-0">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Item</th>
                    <th>Machine</th>
                    <th>User</th>
                    <th className="text-end">Amount</th>
                    <th className="text-center">Discount</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan={9} className="text-center text-muted py-4">No orders found</td></tr>
                  ) : orders.map((o, i) => (
                    <tr key={o._id ?? o.id ?? i}>
                      <td>
                        <code className="fs-12">{o.orderId ?? (o._id ?? o.id)?.slice(-8)}</code>
                      </td>
                      <td>
                        <span className="fw-semibold">{o.itemName ?? o.itemId ?? '—'}</span>
                        {o.cupSize && <span className="text-muted fs-12 ms-1">({o.cupSize})</span>}
                        {(o.quantity ?? 1) > 1 && <Badge bg="secondary" className="ms-1 fs-11">×{o.quantity}</Badge>}
                      </td>
                      <td><code className="fs-12 text-muted">{o.machineId ?? '—'}</code></td>
                      <td className="text-muted fs-12">{typeof o.userId === 'string' ? o.userId.slice(-8) : '—'}</td>
                      <td className="text-end fw-semibold text-success">
                        LKR {(o.totalAmount ?? 0).toLocaleString()}
                      </td>
                      <td className="text-center">
                        {o.discountApplied
                          ? <Badge bg="warning" text="dark">{o.discountApplied}% off</Badge>
                          : <span className="text-muted">—</span>
                        }
                      </td>
                      <td>
                        <Badge bg={statusBg(o.status)} className="text-capitalize">{o.status ?? 'unknown'}</Badge>
                      </td>
                      <td className="text-muted fs-12">
                        {o.createdAt ? new Date(o.createdAt).toLocaleString('en-GB') : '—'}
                      </td>
                      <td className="text-center">
                        <div className="d-flex gap-1 justify-content-center">
                          {(o.status === 'pending' || o.status === 'dispensing') && (
                            <>
                              <Button variant="soft-success" size="sm" onClick={() => handleComplete(o)} title="Mark Completed">
                                <i className="ri-check-line" />
                              </Button>
                              <Button variant="soft-danger" size="sm" onClick={() => handleFail(o)} title="Mark Failed">
                                <i className="ri-close-line" />
                              </Button>
                            </>
                          )}
                          {(o.status === 'completed' || o.status === 'failed' || o.status === 'cancelled') && (
                            <span className="text-muted fs-12">—</span>
                          )}
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
    </>
  )
}
