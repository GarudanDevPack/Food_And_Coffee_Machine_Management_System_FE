'use client'
import { useEffect, useState } from 'react'
import { Badge, Button, Card, CardBody, Col, Row, Spinner, Table } from 'react-bootstrap'
import { toast } from 'react-toastify'
import PageTitle from '@/components/PageTitle'
import { machinesApi } from '@/lib/api'
import { useApiToken } from '@/hooks/useApi'
import IconifyIcon from '@/components/wrappers/IconifyIcon'

type Machine = {
  _id: string
  machineId: string
  name: string
  location: string
  status: string
  isOnline: boolean
  totalOrders: number
  totalRevenue: number
  machineType?: string
  sensor?: { temp?: number; water?: string }
}

const AgentMachinesPage = () => {
  const token = useApiToken()
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [flushingId, setFlushingId] = useState<string | null>(null)

  const load = async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await machinesApi.myMachines(token)
      setMachines(data as Machine[])
    } catch (err: any) {
      toast.error(err.message || 'Failed to load machines')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) load()
  }, [token])

  const handleFlush = async (machineId: string) => {
    if (!token) return
    setFlushingId(machineId)
    try {
      const res = await machinesApi.flush(token, machineId)
      toast.success((res as any).message || 'Flush command sent')
    } catch (err: any) {
      toast.error(err.message || 'Flush failed')
    } finally {
      setFlushingId(null)
    }
  }

  const statusBadge = (status: string, isOnline: boolean) => {
    if (!isOnline) return <Badge bg="secondary">Offline</Badge>
    const variants: Record<string, string> = { active: 'success', inactive: 'warning', maintenance: 'danger' }
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>
  }

  return (
    <>
      <PageTitle title="My Machines" subTitle="Machines assigned to you" />
      <Row className="mb-3">
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
          ) : machines.length === 0 ? (
            <div className="text-center py-5 text-muted">No machines assigned to you</div>
          ) : (
            <div className="table-responsive">
              <Table className="table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Machine ID</th>
                    <th>Name</th>
                    <th>Location</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Temp</th>
                    <th>Water</th>
                    <th>Orders</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {machines.map((m) => (
                    <tr key={m._id}>
                      <td><code className="fs-12">{m.machineId}</code></td>
                      <td className="fw-semibold">{m.name}</td>
                      <td className="text-muted">{m.location || '—'}</td>
                      <td>
                        <Badge bg={m.machineType === 'food' ? 'warning' : 'info'} className="text-capitalize">
                          {m.machineType || 'coffee'}
                        </Badge>
                      </td>
                      <td>{statusBadge(m.status, m.isOnline)}</td>
                      <td>{m.sensor?.temp != null ? `${m.sensor.temp}°C` : '—'}</td>
                      <td>
                        {m.sensor?.water ? (
                          <Badge bg={m.sensor.water === 'full' ? 'success' : m.sensor.water === 'low' ? 'warning' : 'danger'}>
                            {m.sensor.water}
                          </Badge>
                        ) : '—'}
                      </td>
                      <td>{m.totalOrders}</td>
                      <td className="text-end">
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          title="Send daily flush"
                          onClick={() => handleFlush(m.machineId)}
                          disabled={flushingId === m.machineId}
                        >
                          {flushingId === m.machineId ? (
                            <Spinner size="sm" animation="border" />
                          ) : (
                            <IconifyIcon icon="ri:water-flash-line" />
                          )}
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
    </>
  )
}

export default AgentMachinesPage
