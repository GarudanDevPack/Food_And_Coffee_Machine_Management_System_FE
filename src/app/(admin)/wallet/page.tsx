'use client'
import PageTitle from '@/components/PageTitle'
import { walletApi } from '@/lib/api'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { Badge, Button, Card, CardBody, Col, Form, Modal, Nav, Row, Spinner, Table } from 'react-bootstrap'
import { toast } from 'react-toastify'
import Swal from 'sweetalert2'

interface Wallet {
  _id?: string; id?: string; userId?: string | { _id?: string; id?: string; firstName?: string; lastName?: string; email?: string }
  balance?: number; updatedAt?: string
}

interface Topup {
  _id?: string; id?: string; userId?: string | { _id?: string; id?: string; firstName?: string; lastName?: string; email?: string }
  amount?: number; slipUrl?: string; status?: string; createdAt?: string; note?: string
}

const getUserName = (u: any) => {
  if (!u) return '—'
  if (typeof u === 'string') return u.slice(-8)
  return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email || (u._id ?? u.id)?.slice(-8) || '—'
}

const getUserId = (u: any) => {
  if (!u) return ''
  if (typeof u === 'string') return u
  return u._id ?? u.id ?? ''
}

// ── Admin Top-up Modal ────────────────────────────────────────────────────────
const AdminTopupModal = ({ show, onHide, wallet, token, onSaved }: any) => {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (show) { setAmount(''); setNote('') } }, [show])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || Number(amount) <= 0) { toast.error('Enter a valid amount'); return }
    setSaving(true)
    try {
      const userId = getUserId(wallet?.userId)
      await walletApi.adminTopup(token, userId, { amount: Number(amount), note: note || undefined })
      toast.success('Top-up applied')
      onSaved(); onHide()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal show={show} onHide={onHide} centered size="sm">
      <Modal.Header closeButton>
        <Modal.Title>Admin Top-up — {getUserName(wallet?.userId)}</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Amount (LKR) <span className="text-danger">*</span></Form.Label>
            <Form.Control type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Note</Form.Label>
            <Form.Control value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onHide}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? <Spinner size="sm" className="me-1" /> : null} Apply Top-up
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function WalletPage() {
  const { data: session } = useSession()
  const token = (session?.user as any)?.token ?? ''

  const [wallets, setWallets] = useState<Wallet[]>([])
  const [pendingTopups, setPendingTopups] = useState<Topup[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'wallets' | 'pending'>('wallets')
  const [showTopup, setShowTopup] = useState(false)
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const fetchData = async () => {
    if (!token) return
    setLoading(true)
    try {
      const [w, p] = await Promise.all([
        walletApi.getAllWallets(token).catch(() => []),
        walletApi.getPendingTopups(token).catch(() => []),
      ])
      setWallets(w as Wallet[])
      setPendingTopups(p as Topup[])
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load wallet data')
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [token])

  const handleApprove = async (t: Topup) => {
    const r = await Swal.fire({ title: 'Approve Top-up?', text: `Credit LKR ${t.amount?.toLocaleString()} to ${getUserName(t.userId)}?`, icon: 'question', showCancelButton: true, confirmButtonColor: '#0acf97', confirmButtonText: 'Approve' })
    if (!r.isConfirmed) return
    setProcessingId(t._id ?? t.id)
    try { await walletApi.verifyTopup(token, t._id ?? t.id); toast.success('Top-up approved'); fetchData() }
    catch (err: any) { toast.error(err.message ?? 'Failed') }
    finally { setProcessingId(null) }
  }

  const handleReject = async (t: Topup) => {
    const r = await Swal.fire({ title: 'Reject Top-up?', text: `Reject LKR ${t.amount?.toLocaleString()} from ${getUserName(t.userId)}?`, icon: 'warning', input: 'text', inputLabel: 'Reason (optional)', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Reject' })
    if (!r.isConfirmed) return
    setProcessingId(t._id ?? t.id)
    try { await walletApi.rejectTopup(token, t._id ?? t.id, r.value || undefined); toast.success('Top-up rejected'); fetchData() }
    catch (err: any) { toast.error(err.message ?? 'Failed') }
    finally { setProcessingId(null) }
  }

  const totalBalance = wallets.reduce((s, w) => s + (w.balance ?? 0), 0)

  return (
    <>
      <PageTitle title="Wallet Management" subTitle="Finance" />

      <Row className="mb-3 align-items-center">
        <Col>
          <div className="d-flex gap-2">
            <Badge bg="secondary" className="fs-13 fw-normal px-3 py-2">Wallets: {wallets.length}</Badge>
            <Badge bg="success" className="fs-13 fw-normal px-3 py-2">Total Balance: LKR {totalBalance.toLocaleString()}</Badge>
            {pendingTopups.length > 0 && (
              <Badge bg="warning" text="dark" className="fs-13 fw-normal px-3 py-2">Pending Top-ups: {pendingTopups.length}</Badge>
            )}
          </div>
        </Col>
        <Col xs="auto">
          <Button variant="light" size="sm" onClick={fetchData} disabled={loading}>
            {loading ? <Spinner size="sm" /> : <i className="ri-refresh-line" />} Refresh
          </Button>
        </Col>
      </Row>

      <Card>
        <div className="card-header border-bottom">
          <Nav variant="tabs" className="card-header-tabs">
            <Nav.Item>
              <Nav.Link active={tab === 'wallets'} onClick={() => setTab('wallets')} style={{ cursor: 'pointer' }}>
                All Wallets ({wallets.length})
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link active={tab === 'pending'} onClick={() => setTab('pending')} style={{ cursor: 'pointer' }}>
                Pending Top-ups {pendingTopups.length > 0 && <Badge bg="warning" text="dark" className="ms-1">{pendingTopups.length}</Badge>}
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </div>

        <CardBody className="p-0">
          {loading ? (
            <div className="text-center py-5"><Spinner /></div>
          ) : tab === 'wallets' ? (
            <div className="table-responsive">
              <Table className="table-custom table-centered table-sm table-nowrap table-hover mb-0">
                <thead>
                  <tr>
                    <th>User</th>
                    <th className="text-end">Balance (LKR)</th>
                    <th>Last Updated</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {wallets.length === 0 ? (
                    <tr><td colSpan={4} className="text-center text-muted py-4">No wallets found</td></tr>
                  ) : wallets.map((w, i) => (
                    <tr key={w._id ?? w.id ?? i}>
                      <td className="fw-semibold">{getUserName(w.userId)}</td>
                      <td className="text-end fw-bold text-success">
                        LKR {(w.balance ?? 0).toLocaleString()}
                      </td>
                      <td className="text-muted fs-12">
                        {w.updatedAt ? new Date(w.updatedAt).toLocaleString('en-GB') : '—'}
                      </td>
                      <td className="text-center">
                        <Button variant="soft-primary" size="sm" onClick={() => { setSelectedWallet(w); setShowTopup(true) }} title="Top-up">
                          <i className="ri-add-line me-1" />Top-up
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <div className="table-responsive">
              <Table className="table-custom table-centered table-sm table-nowrap table-hover mb-0">
                <thead>
                  <tr>
                    <th>User</th>
                    <th className="text-end">Amount (LKR)</th>
                    <th>Slip</th>
                    <th>Submitted</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingTopups.length === 0 ? (
                    <tr><td colSpan={5} className="text-center text-muted py-4">No pending top-ups</td></tr>
                  ) : pendingTopups.map((t, i) => (
                    <tr key={t._id ?? t.id ?? i}>
                      <td className="fw-semibold">{getUserName(t.userId)}</td>
                      <td className="text-end fw-bold">LKR {(t.amount ?? 0).toLocaleString()}</td>
                      <td>
                        {t.slipUrl
                          ? <a href={t.slipUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-soft-secondary"><i className="ri-image-line me-1" />View Slip</a>
                          : <span className="text-muted">—</span>
                        }
                      </td>
                      <td className="text-muted fs-12">
                        {t.createdAt ? new Date(t.createdAt).toLocaleString('en-GB') : '—'}
                      </td>
                      <td className="text-center">
                        <div className="d-flex gap-1 justify-content-center">
                          <Button variant="soft-success" size="sm" onClick={() => handleApprove(t)} disabled={processingId === (t._id ?? t.id)}>
                            {processingId === (t._id ?? t.id) ? <Spinner size="sm" /> : <><i className="ri-check-line me-1" />Approve</>}
                          </Button>
                          <Button variant="soft-danger" size="sm" onClick={() => handleReject(t)} disabled={processingId === (t._id ?? t.id)}>
                            <i className="ri-close-line me-1" />Reject
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

      <AdminTopupModal
        show={showTopup}
        onHide={() => setShowTopup(false)}
        wallet={selectedWallet}
        token={token}
        onSaved={fetchData}
      />
    </>
  )
}
