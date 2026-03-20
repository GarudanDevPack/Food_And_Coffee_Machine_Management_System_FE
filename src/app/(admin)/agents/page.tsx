'use client'
import PageTitle from '@/components/PageTitle'
import { usersApi } from '@/lib/api'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { Badge, Button, Card, CardBody, Col, Nav, Row, Spinner, Table } from 'react-bootstrap'
import { toast } from 'react-toastify'

interface User {
  _id?: string
  id?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  status?: string
  role?: { id: number; name?: string }
  createdAt?: string
}

const statusBg = (s?: string) => s === 'active' ? 'success' : s === 'pending' ? 'warning' : 'secondary'

export default function AgentsPage() {
  const { data: session } = useSession()
  const token = (session?.user as any)?.token ?? ''

  const [agents, setAgents] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [tab, setTab] = useState<'all' | 'pending'>('all')

  const fetchAgents = async () => {
    if (!token) return
    setLoading(true)
    try {
      const all = await usersApi.list(token) as User[]
      setAgents(all.filter((u) => u.role?.id === 4))
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load agents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAgents() }, [token])

  const handleApprove = async (user: User) => {
    setApprovingId(user._id ?? user.id)
    try {
      await usersApi.approveAgent(token, user._id ?? user.id)
      toast.success(`${user.firstName} approved as agent`)
      fetchAgents()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to approve')
    } finally {
      setApprovingId(null)
    }
  }

  const pendingCount = agents.filter((a) => a.status === 'pending').length
  const displayed = tab === 'pending' ? agents.filter((a) => a.status === 'pending') : agents

  return (
    <>
      <PageTitle title="Agent Management" subTitle="User Management" />

      <Row className="mb-3 align-items-center">
        <Col>
          <div className="d-flex gap-2 align-items-center">
            <Badge bg="secondary" className="fs-13 fw-normal px-3 py-2">Total: {agents.length}</Badge>
            {pendingCount > 0 && (
              <Badge bg="warning" text="dark" className="fs-13 fw-normal px-3 py-2">Pending Approval: {pendingCount}</Badge>
            )}
          </div>
        </Col>
        <Col xs="auto">
          <Button variant="light" size="sm" onClick={fetchAgents} disabled={loading}>
            {loading ? <Spinner size="sm" /> : <i className="ri-refresh-line" />} Refresh
          </Button>
        </Col>
      </Row>

      <Card>
        <div className="card-header border-bottom">
          <Nav variant="tabs" className="card-header-tabs">
            <Nav.Item>
              <Nav.Link active={tab === 'all'} onClick={() => setTab('all')} style={{ cursor: 'pointer' }}>
                All Agents ({agents.length})
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link active={tab === 'pending'} onClick={() => setTab('pending')} style={{ cursor: 'pointer' }}>
                Pending Approval {pendingCount > 0 && <Badge bg="warning" text="dark" className="ms-1">{pendingCount}</Badge>}
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </div>
        <CardBody className="p-0">
          {loading ? (
            <div className="text-center py-5"><Spinner /></div>
          ) : (
            <div className="table-responsive">
              <Table className="table-custom table-centered table-sm table-nowrap table-hover mb-0">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.length === 0 ? (
                    <tr><td colSpan={6} className="text-center text-muted py-4">{tab === 'pending' ? 'No pending approvals' : 'No agents found'}</td></tr>
                  ) : displayed.map((agent) => (
                    <tr key={agent._id ?? agent.id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <span className="avatar-sm avatar-title bg-primary-subtle text-primary rounded-circle fw-bold fs-14">
                            {((agent.firstName ?? 'A')[0]).toUpperCase()}
                          </span>
                          <span className="fw-semibold">{agent.firstName} {agent.lastName}</span>
                        </div>
                      </td>
                      <td className="text-muted">{agent.email ?? '—'}</td>
                      <td className="text-muted">{agent.phone ?? '—'}</td>
                      <td>
                        <Badge bg={statusBg(agent.status)} className="text-capitalize">{agent.status ?? 'active'}</Badge>
                      </td>
                      <td className="text-muted fs-12">
                        {agent.createdAt ? new Date(agent.createdAt).toLocaleDateString('en-GB') : '—'}
                      </td>
                      <td className="text-center">
                        {agent.status === 'pending' && (
                          <Button variant="soft-success" size="sm" onClick={() => handleApprove(agent)} disabled={approvingId === (agent._id ?? agent.id)}>
                            {approvingId === (agent._id ?? agent.id) ? <Spinner size="sm" /> : <><i className="ri-checkbox-circle-line me-1" />Approve</>}
                          </Button>
                        )}
                        {agent.status !== 'pending' && <span className="text-muted fs-12">—</span>}
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
