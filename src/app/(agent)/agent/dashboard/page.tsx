'use client'
import { useEffect, useState } from 'react'
import { Card, CardBody, Col, Row, Spinner, Badge } from 'react-bootstrap'
import { toast } from 'react-toastify'
import PageTitle from '@/components/PageTitle'
import { useApiToken, useCurrentUser } from '@/hooks/useApi'
import { machinesApi, ordersApi } from '@/lib/api'

type KpiCard = { label: string; value: string | number; variant: string; icon: string }

const AgentDashboardPage = () => {
  const token = useApiToken()
  const user = useCurrentUser()
  const [machines, setMachines] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token || !user?.id) return
    const load = async () => {
      setLoading(true)
      try {
        const [m, o] = await Promise.all([
          machinesApi.myMachines(token),
          ordersApi.list(token, { agentId: user.id }),
        ])
        setMachines(m as any[])
        setOrders(o as any[])
      } catch (err: any) {
        toast.error(err.message || 'Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token, user?.id])

  const todayOrders = orders.filter((o) => {
    const d = new Date(o.createdAt)
    const today = new Date()
    return d.toDateString() === today.toDateString()
  })

  const pendingOrders = orders.filter((o) => o.status === 'dispensing' || o.status === 'pending')
  const totalRevenue = orders
    .filter((o) => o.status === 'completed')
    .reduce((s, o) => s + (o.totalAmount || 0), 0)

  const kpis: KpiCard[] = [
    { label: 'Assigned Machines', value: machines.length, variant: 'primary', icon: '🖥️' },
    { label: "Today's Orders", value: todayOrders.length, variant: 'success', icon: '📦' },
    { label: 'Pending Orders', value: pendingOrders.length, variant: 'warning', icon: '⏳' },
    { label: 'Total Revenue (LKR)', value: `${totalRevenue.toFixed(2)}`, variant: 'info', icon: '💰' },
  ]

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
      </div>
    )
  }

  return (
    <>
      <PageTitle title="Agent Dashboard" subTitle={`Welcome back, ${user?.firstName || 'Agent'}`} />

      <Row className="g-3 mb-4">
        {kpis.map((k) => (
          <Col key={k.label} xs={12} sm={6} lg={3}>
            <Card className="h-100">
              <CardBody className="d-flex align-items-center gap-3">
                <div className="fs-2">{k.icon}</div>
                <div>
                  <div className={`fs-4 fw-bold text-${k.variant}`}>{k.value}</div>
                  <div className="text-muted small">{k.label}</div>
                </div>
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>

      <Row className="g-3">
        <Col xs={12} lg={6}>
          <Card>
            <CardBody>
              <h5 className="mb-3">My Machines</h5>
              {machines.length === 0 ? (
                <p className="text-muted">No machines assigned.</p>
              ) : (
                <ul className="list-group list-group-flush">
                  {machines.slice(0, 5).map((m: any) => (
                    <li key={m._id} className="list-group-item d-flex justify-content-between align-items-center px-0">
                      <div>
                        <span className="fw-semibold">{m.name}</span>
                        <span className="text-muted ms-2 small">{m.location}</span>
                      </div>
                      <Badge bg={m.isOnline ? 'success' : 'secondary'}>
                        {m.isOnline ? 'Online' : 'Offline'}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </Col>

        <Col xs={12} lg={6}>
          <Card>
            <CardBody>
              <h5 className="mb-3">Recent Orders</h5>
              {orders.length === 0 ? (
                <p className="text-muted">No orders yet.</p>
              ) : (
                <ul className="list-group list-group-flush">
                  {orders.slice(0, 5).map((o: any) => (
                    <li key={o._id} className="list-group-item d-flex justify-content-between align-items-center px-0">
                      <div>
                        <span className="fw-semibold">{o.orderId || o._id.slice(-6)}</span>
                        <span className="text-muted ms-2 small">LKR {o.totalAmount?.toFixed(2)}</span>
                      </div>
                      <Badge bg={
                        o.status === 'completed' ? 'success' :
                        o.status === 'failed' ? 'danger' :
                        o.status === 'dispensing' ? 'primary' : 'warning'
                      } className="text-capitalize">
                        {o.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default AgentDashboardPage
