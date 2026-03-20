'use client'
import PageTitle from '@/components/PageTitle'
import { alertsApi } from '@/lib/api'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { Badge, Button, Card, CardBody, Col, Nav, Row, Spinner, Table } from 'react-bootstrap'
import { toast } from 'react-toastify'
import Swal from 'sweetalert2'

interface Alert {
  _id?: string; id?: string; alertId?: string; machineId?: string; machineName?: string
  type?: string; message?: string; severity?: string; resolved?: boolean; createdAt?: string
}

const severityBg = (s?: string) => ({ critical: 'danger', high: 'warning', medium: 'info', low: 'secondary' })[s ?? ''] ?? 'secondary'
const severityRowClass = (s?: string) => ({ critical: 'table-danger', high: 'table-warning', medium: 'table-info', low: '' })[s ?? ''] ?? ''

type TabType = 'all' | 'unresolved' | 'critical' | 'high' | 'medium'

export default function AlertsPage() {
  const { data: session } = useSession()
  const token = (session?.user as any)?.token ?? ''

  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabType>('all')
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [unresolvedCount, setUnresolvedCount] = useState(0)

  const fetchAlerts = async () => {
    if (!token) return
    setLoading(true)
    try {
      const [all, countRes] = await Promise.all([
        alertsApi.list(token) as Promise<Alert[]>,
        alertsApi.getUnresolvedCount(token).catch(() => ({ count: 0 })),
      ])
      setAlerts(all)
      setUnresolvedCount((countRes as { count: number }).count ?? 0)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load alerts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAlerts() }, [token])

  const handleResolve = async (a: Alert) => {
    setResolvingId(a._id ?? a.id)
    try {
      await alertsApi.resolve(token, a._id ?? a.id)
      toast.success('Alert resolved')
      fetchAlerts()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed')
    } finally {
      setResolvingId(null) }
  }

  const handleDelete = async (a: Alert) => {
    const r = await Swal.fire({ title: 'Delete Alert?', text: 'This action cannot be undone.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Delete' })
    if (!r.isConfirmed) return
    try { await alertsApi.delete(token, a._id ?? a.id); toast.success('Deleted'); fetchAlerts() }
    catch (err: any) { toast.error(err.message ?? 'Failed') }
  }

  const displayed = alerts.filter((a) => {
    if (tab === 'unresolved') return !a.resolved
    if (tab === 'critical') return a.severity === 'critical'
    if (tab === 'high') return a.severity === 'high'
    if (tab === 'medium') return a.severity === 'medium'
    return true
  })

  const criticalCount = alerts.filter((a) => a.severity === 'critical' && !a.resolved).length

  return (
    <>
      <PageTitle title="Alerts" subTitle="Operations" />

      <Row className="mb-3 align-items-center">
        <Col>
          <div className="d-flex gap-2">
            <Badge bg="secondary" className="fs-13 fw-normal px-3 py-2">Total: {alerts.length}</Badge>
            {unresolvedCount > 0 && (
              <Badge bg="danger" className="fs-13 fw-normal px-3 py-2">Unresolved: {unresolvedCount}</Badge>
            )}
            {criticalCount > 0 && (
              <Badge bg="danger" className="fs-13 fw-normal px-3 py-2">Critical: {criticalCount}</Badge>
            )}
          </div>
        </Col>
        <Col xs="auto">
          <Button variant="light" size="sm" onClick={fetchAlerts} disabled={loading}>
            {loading ? <Spinner size="sm" /> : <i className="ri-refresh-line" />} Refresh
          </Button>
        </Col>
      </Row>

      <Card>
        <div className="card-header border-bottom">
          <Nav variant="tabs" className="card-header-tabs">
            {([
              { key: 'all', label: `All (${alerts.length})` },
              { key: 'unresolved', label: `Unresolved`, badge: unresolvedCount },
              { key: 'critical', label: 'Critical' },
              { key: 'high', label: 'High' },
              { key: 'medium', label: 'Medium' },
            ] as { key: TabType; label: string; badge?: number }[]).map((t) => (
              <Nav.Item key={t.key}>
                <Nav.Link active={tab === t.key} onClick={() => setTab(t.key)} style={{ cursor: 'pointer' }}>
                  {t.label}
                  {t.badge != null && t.badge > 0 && <Badge bg="danger" className="ms-1">{t.badge}</Badge>}
                </Nav.Link>
              </Nav.Item>
            ))}
          </Nav>
        </div>
        <CardBody className="p-0">
          {loading ? (
            <div className="text-center py-5"><Spinner /></div>
          ) : (
            <div className="table-responsive">
              <Table className="table-custom table-centered table-sm table-nowrap mb-0">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Machine</th>
                    <th>Message</th>
                    <th>Severity</th>
                    <th>Created</th>
                    <th>Status</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.length === 0 ? (
                    <tr><td colSpan={7} className="text-center text-muted py-4">No alerts</td></tr>
                  ) : displayed.map((a) => (
                    <tr key={a._id ?? a.id} className={a.resolved ? '' : severityRowClass(a.severity)}>
                      <td>
                        <span className="fw-semibold text-capitalize">{a.type?.replace(/_/g, ' ') ?? '—'}</span>
                      </td>
                      <td className="text-muted fs-12">{a.machineName ?? a.machineId ?? '—'}</td>
                      <td style={{ maxWidth: 300, whiteSpace: 'normal' }}>{a.message ?? '—'}</td>
                      <td>
                        <Badge bg={severityBg(a.severity)} className="text-capitalize">
                          {a.severity ?? '—'}
                        </Badge>
                      </td>
                      <td className="text-muted fs-12">
                        {a.createdAt ? new Date(a.createdAt).toLocaleString('en-GB') : '—'}
                      </td>
                      <td>
                        <Badge bg={a.resolved ? 'success' : 'secondary'}>
                          {a.resolved ? 'Resolved' : 'Open'}
                        </Badge>
                      </td>
                      <td className="text-center">
                        <div className="d-flex gap-1 justify-content-center">
                          {!a.resolved && (
                            <Button variant="soft-success" size="sm" onClick={() => handleResolve(a)} disabled={resolvingId === (a._id ?? a.id)} title="Resolve">
                              {resolvingId === (a._id ?? a.id) ? <Spinner size="sm" /> : <i className="ri-check-line" />}
                            </Button>
                          )}
                          <Button variant="soft-danger" size="sm" onClick={() => handleDelete(a)} title="Delete">
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
    </>
  )
}
