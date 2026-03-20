'use client'
import { useState } from 'react'
import { Button, Card, CardBody, Col, Form, Row, Spinner } from 'react-bootstrap'
import { toast } from 'react-toastify'
import PageTitle from '@/components/PageTitle'
import { walletApi } from '@/lib/api'
import { useApiToken } from '@/hooks/useApi'

const AgentWalletTopupPage = () => {
  const token = useApiToken()
  const [targetUserId, setTargetUserId] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ customerName?: string; newBalance?: number } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    if (!targetUserId.trim()) return toast.error('Customer ID is required')
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return toast.error('Enter a valid amount')

    setLoading(true)
    setResult(null)
    try {
      const res = await walletApi.agentTopup(token, {
        targetUserId: targetUserId.trim(),
        amount: amt,
        note: note.trim() || undefined,
      }) as any

      setResult({
        customerName: res.user?.firstName ? `${res.user.firstName} ${res.user.lastName || ''}`.trim() : undefined,
        newBalance: res.balance,
      })
      toast.success('Wallet topped up successfully')
      setTargetUserId('')
      setAmount('')
      setNote('')
    } catch (err: any) {
      toast.error(err.message || 'Top-up failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PageTitle title="Wallet Top-Up" subTitle="Credit cash to a customer's wallet" />

      <Row className="justify-content-center">
        <Col xs={12} md={6}>
          <Card>
            <CardBody>
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Customer ID</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g. CUS-20260313-143052 or user MongoDB ID"
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    required
                  />
                  <Form.Text className="text-muted">Enter the customer ID or user ID</Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Amount (LKR)</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>Note (optional)</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g. Cash collected"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </Form.Group>

                <Button type="submit" variant="primary" className="w-100" disabled={loading}>
                  {loading ? <Spinner size="sm" animation="border" className="me-2" /> : null}
                  {loading ? 'Processing…' : 'Top Up Wallet'}
                </Button>
              </Form>

              {result && (
                <div className="mt-4 p-3 bg-success bg-opacity-10 rounded border border-success">
                  <p className="mb-1 fw-semibold text-success">✓ Top-up successful</p>
                  {result.customerName && <p className="mb-1 text-muted">Customer: {result.customerName}</p>}
                  {result.newBalance != null && (
                    <p className="mb-0 fw-bold">New Balance: LKR {result.newBalance.toFixed(2)}</p>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default AgentWalletTopupPage
