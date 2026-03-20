'use client'
import { useState } from 'react'
import { Button, Card, CardBody, Col, Form, InputGroup, Row, Spinner } from 'react-bootstrap'
import { toast } from 'react-toastify'
import PageTitle from '@/components/PageTitle'
import { usersApi } from '@/lib/api'
import { useApiToken } from '@/hooks/useApi'
import IconifyIcon from '@/components/wrappers/IconifyIcon'

const AgentCreateCustomerPage = () => {
  const token = useApiToken()
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [created, setCreated] = useState<{ customerId?: string; walletId?: string; email: string } | null>(null)

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.info('Copied!'))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    setLoading(true)
    setCreated(null)
    try {
      const res = await usersApi.create(token, {
        ...form,
        role: { id: 5 }, // customer
      }) as any

      setCreated({
        customerId: res.customerId,
        walletId: res.walletId,
        email: res.email,
      })
      toast.success('Customer created successfully')
      setForm({ firstName: '', lastName: '', email: '', phone: '', password: '' })
    } catch (err: any) {
      toast.error(err.message || 'Failed to create customer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PageTitle title="Create Customer" subTitle="Register a new customer account" />

      <Row className="justify-content-center">
        <Col xs={12} md={7}>
          <Card>
            <CardBody>
              <Form onSubmit={handleSubmit}>
                <Row className="g-3">
                  <Col xs={12} sm={6}>
                    <Form.Group>
                      <Form.Label>First Name</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="First name"
                        value={form.firstName}
                        onChange={set('firstName')}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={12} sm={6}>
                    <Form.Group>
                      <Form.Label>Last Name</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Last name"
                        value={form.lastName}
                        onChange={set('lastName')}
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={12}>
                    <Form.Group>
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        type="email"
                        placeholder="customer@example.com"
                        value={form.email}
                        onChange={set('email')}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={12}>
                    <Form.Group>
                      <Form.Label>Phone</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="07X XXX XXXX (auto-normalized to +94)"
                        value={form.phone}
                        onChange={set('phone')}
                      />
                      <Form.Text className="text-muted">Starts with 0 → auto converted to +94</Form.Text>
                    </Form.Group>
                  </Col>
                  <Col xs={12}>
                    <Form.Group>
                      <Form.Label>Password</Form.Label>
                      <Form.Control
                        type="password"
                        placeholder="Set initial password"
                        value={form.password}
                        onChange={set('password')}
                        required
                        minLength={6}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Button type="submit" variant="primary" className="w-100 mt-4" disabled={loading}>
                  {loading ? <Spinner size="sm" animation="border" className="me-2" /> : null}
                  {loading ? 'Creating…' : 'Create Customer'}
                </Button>
              </Form>

              {created && (
                <div className="mt-4 p-3 bg-success bg-opacity-10 rounded border border-success">
                  <p className="mb-2 fw-semibold text-success">✓ Customer created successfully</p>
                  <p className="mb-1 text-muted">Email: {created.email}</p>

                  {created.customerId && (
                    <div className="mb-2">
                      <Form.Label className="mb-1 small fw-semibold">Customer ID</Form.Label>
                      <InputGroup size="sm">
                        <Form.Control value={created.customerId} readOnly />
                        <Button variant="outline-secondary" onClick={() => copy(created.customerId!)}>
                          <IconifyIcon icon="ri:file-copy-line" />
                        </Button>
                      </InputGroup>
                    </div>
                  )}

                  {created.walletId && (
                    <div>
                      <Form.Label className="mb-1 small fw-semibold">Wallet ID</Form.Label>
                      <InputGroup size="sm">
                        <Form.Control value={created.walletId} readOnly />
                        <Button variant="outline-secondary" onClick={() => copy(created.walletId!)}>
                          <IconifyIcon icon="ri:file-copy-line" />
                        </Button>
                      </InputGroup>
                    </div>
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

export default AgentCreateCustomerPage
