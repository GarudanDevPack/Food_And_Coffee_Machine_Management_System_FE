'use client'
import { useEffect, useState } from 'react'
import { Badge, Button, Card, CardBody, Col, Row, Spinner } from 'react-bootstrap'
import { toast } from 'react-toastify'
import PageTitle from '@/components/PageTitle'
import { membershipsApi } from '@/lib/api'
import { useApiToken } from '@/hooks/useApi'

type Membership = {
  _id: string
  plan: '1month' | '3month' | '5month'
  discount: number
  startDate: string
  endDate: string
  status: 'active' | 'expired' | 'cancelled'
  pricePaid: number
}

type Plan = { key: '1month' | '3month' | '5month'; label: string; price: number; discount: number; duration: string }

const PLANS: Plan[] = [
  { key: '1month', label: '1 Month', price: 500, discount: 15, duration: '30 days' },
  { key: '3month', label: '3 Months', price: 1300, discount: 20, duration: '90 days' },
  { key: '5month', label: '5 Months', price: 2000, discount: 25, duration: '150 days' },
]

const CustomerMembershipPage = () => {
  const token = useApiToken()
  const [membership, setMembership] = useState<Membership | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [subscribing, setSubscribing] = useState(false)

  const load = async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await membershipsApi.my(token) as any
      setMembership(data?.status === 'active' ? data : null)
    } catch {
      setMembership(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) load()
  }, [token])

  const handleSubscribe = async () => {
    if (!token || !selectedPlan) return
    if (!confirm(`Subscribe to ${selectedPlan.label} for LKR ${selectedPlan.price}? This will be deducted from your wallet.`)) return

    setSubscribing(true)
    try {
      await membershipsApi.subscribe(token, { plan: selectedPlan.key })
      toast.success(`Subscribed to ${selectedPlan.label} plan — ${selectedPlan.discount}% discount active!`)
      setSelectedPlan(null)
      load()
    } catch (err: any) {
      toast.error(err.message || 'Subscription failed')
    } finally {
      setSubscribing(false)
    }
  }

  const daysRemaining = (endDate: string) => {
    const diff = new Date(endDate).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
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
      <PageTitle title="Membership" subTitle="Get discounts on all your orders" />

      {membership ? (
        <Row className="g-3 mb-4">
          <Col xs={12}>
            <Card className="border-success">
              <CardBody>
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <div>
                    <h5 className="mb-1">
                      Active Plan
                      <Badge bg="success" className="ms-2">Active</Badge>
                    </h5>
                    <p className="mb-1 text-muted">
                      Plan: <strong className="text-capitalize">{membership.plan.replace('month', ' Month')}</strong>
                    </p>
                    <p className="mb-1 text-muted">
                      Expires: {new Date(membership.endDate).toLocaleDateString()} ({daysRemaining(membership.endDate)} days left)
                    </p>
                    <p className="mb-0 text-muted">Paid: LKR {membership.pricePaid?.toFixed(2)}</p>
                  </div>
                  <div className="text-center">
                    <div className="display-6 fw-bold text-success">{membership.discount}%</div>
                    <div className="text-muted small">off every order</div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      ) : (
        <Card className="mb-4 border-warning bg-warning bg-opacity-10">
          <CardBody className="text-center">
            <p className="mb-0 text-warning fw-semibold">You don't have an active membership. Subscribe below to get discounts!</p>
          </CardBody>
        </Card>
      )}

      <h5 className="mb-3">{membership ? 'Upgrade / Renew Plan' : 'Choose a Plan'}</h5>
      <Row className="g-3 mb-4">
        {PLANS.map((plan) => (
          <Col key={plan.key} xs={12} sm={4}>
            <Card
              className={`h-100 border-2 ${selectedPlan?.key === plan.key ? 'border-primary' : 'border-light'}`}
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedPlan(plan)}
            >
              <CardBody className="text-center">
                <h5 className="fw-bold">{plan.label}</h5>
                <p className="text-muted small mb-2">{plan.duration}</p>
                <div className="fs-3 fw-bold text-primary mb-2">LKR {plan.price}</div>
                <Badge bg="success" className="fs-6">{plan.discount}% off orders</Badge>
                {selectedPlan?.key === plan.key && (
                  <div className="mt-2 text-primary small fw-semibold">✓ Selected</div>
                )}
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>

      {selectedPlan && (
        <Card className="mb-4 bg-light border-0">
          <CardBody>
            <p className="mb-1"><strong>Selected:</strong> {selectedPlan.label}</p>
            <p className="mb-0 text-muted">
              LKR {selectedPlan.price} will be deducted from your wallet. You'll get {selectedPlan.discount}% off all orders for {selectedPlan.duration}.
            </p>
          </CardBody>
        </Card>
      )}

      <Button
        variant="primary"
        size="lg"
        onClick={handleSubscribe}
        disabled={!selectedPlan || subscribing}
      >
        {subscribing ? <Spinner size="sm" animation="border" className="me-2" /> : null}
        {subscribing ? 'Subscribing…' : `Subscribe — LKR ${selectedPlan?.price ?? '—'}`}
      </Button>
    </>
  )
}

export default CustomerMembershipPage
