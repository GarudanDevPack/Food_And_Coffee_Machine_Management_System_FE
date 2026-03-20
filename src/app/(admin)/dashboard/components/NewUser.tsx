'use client'
import { dashboardApi, ordersApi } from '@/lib/api'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Badge, Card, CardBody, CardFooter, CardHeader, Col, Row, Spinner, Table } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'

interface TopItem { itemId: string; name?: string; category?: string; totalOrders: number; totalRevenue: number }
interface Order {
  _id: string
  orderId?: string
  userId?: string
  machineId?: string
  itemName?: string
  totalAmount?: number
  status?: string
  createdAt?: string
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    completed: 'success',
    pending: 'warning',
    dispensing: 'info',
    failed: 'danger',
    cancelled: 'secondary',
  }
  return map[status] ?? 'secondary'
}

const NewUser = () => {
  const { data: session } = useSession()
  const token = (session?.user as any)?.token ?? ''

  const [topItems, setTopItems] = useState<TopItem[]>([])
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    Promise.all([
      dashboardApi.getTopItems(token, 8).catch(() => []),
      ordersApi.list(token, {}).catch(() => []),
    ])
      .then(([items, orders]) => {
        setTopItems(items as TopItem[])
        setRecentOrders((orders as Order[]).slice(0, 10))
      })
      .finally(() => setLoading(false))
  }, [token])

  return (
    <Row>
      <Col xxl={6}>
        <Card>
          <CardHeader className="d-flex flex-wrap align-items-center gap-2 border-bottom border-dashed">
            <h4 className="header-title me-auto">Top Items</h4>
            <Link href="/items" className="btn btn-sm btn-light">
              View All <IconifyIcon icon="ri:arrow-right-line" className="ms-1" />
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            {loading ? (
              <div className="text-center py-4"><Spinner size="sm" /></div>
            ) : topItems.length === 0 ? (
              <div className="text-center text-muted py-4">No items data</div>
            ) : (
              <div className="table-responsive">
                <Table className="table-custom table-centered table-sm table-nowrap table-hover mb-0">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Item</th>
                      <th>Category</th>
                      <th className="text-end">Orders</th>
                      <th className="text-end">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topItems.map((item, idx) => (
                      <tr key={item.itemId}>
                        <td className="text-muted">{idx + 1}</td>
                        <td>
                          <span className="fw-semibold">{item.name ?? item.itemId}</span>
                        </td>
                        <td>
                          <Badge bg="light" text="dark" className="fw-normal text-capitalize">
                            {item.category ?? '—'}
                          </Badge>
                        </td>
                        <td className="text-end fw-semibold">{item.totalOrders}</td>
                        <td className="text-end text-success fw-semibold">LKR {(item.totalRevenue ?? 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </CardBody>
          <CardFooter className="text-muted fs-13">
            Showing top {topItems.length} items by order count
          </CardFooter>
        </Card>
      </Col>

      <Col xxl={6}>
        <Card>
          <CardHeader className="d-flex flex-wrap align-items-center gap-2 border-bottom border-dashed">
            <h4 className="header-title me-auto">Recent Orders</h4>
            <Link href="/sales" className="btn btn-sm btn-light">
              View All <IconifyIcon icon="ri:arrow-right-line" className="ms-1" />
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            {loading ? (
              <div className="text-center py-4"><Spinner size="sm" /></div>
            ) : recentOrders.length === 0 ? (
              <div className="text-center text-muted py-4">No recent orders</div>
            ) : (
              <div className="table-responsive">
                <Table className="table-custom table-centered table-sm table-nowrap table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Item</th>
                      <th>Machine</th>
                      <th className="text-end">Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order._id}>
                        <td>
                          <span className="text-muted fs-12">{order.orderId ?? order._id.slice(-8)}</span>
                        </td>
                        <td>{order.itemName ?? '—'}</td>
                        <td>
                          <span className="text-muted fs-12">{order.machineId ?? '—'}</span>
                        </td>
                        <td className="text-end fw-semibold">
                          LKR {(order.totalAmount ?? 0).toLocaleString()}
                        </td>
                        <td>
                          <Badge bg={statusBadge(order.status ?? '')} className="text-capitalize">
                            {order.status ?? '—'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </CardBody>
          <CardFooter className="text-muted fs-13">
            Showing last {recentOrders.length} orders
          </CardFooter>
        </Card>
      </Col>
    </Row>
  )
}

export default NewUser
