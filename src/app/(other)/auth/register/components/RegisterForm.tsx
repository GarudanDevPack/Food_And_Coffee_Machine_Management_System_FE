'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'
import { Spinner } from 'react-bootstrap'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'

const RegisterForm = () => {
  const router = useRouter()
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: '5', // default: customer
    agreed: false,
  })
  const [loading, setLoading] = useState(false)

  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [f]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.firstName.trim() || !form.email.trim() || !form.password) {
      toast.error('First name, email and password are required')
      return
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (!form.agreed) {
      toast.error('Please accept the Terms & Conditions')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${BASE_URL}/auth/email/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim() || undefined,
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          password: form.password,
          role: { id: Number(form.role) },
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }))
        throw new Error(err?.message || `Registration failed`)
      }

      const roleLabel = form.role === '4' ? 'Agent account created — awaiting admin approval.' : 'Registration successful! Please sign in.'
      toast.success(roleLabel)
      router.push('/auth/login')
    } catch (err: any) {
      toast.error(err.message ?? 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="text-start mb-3" onSubmit={handleSubmit}>
      <div className="row g-2 mb-2">
        <div className="col">
          <input
            type="text"
            className="form-control"
            placeholder="First name *"
            value={form.firstName}
            onChange={set('firstName')}
            required
          />
        </div>
        <div className="col">
          <input
            type="text"
            className="form-control"
            placeholder="Last name"
            value={form.lastName}
            onChange={set('lastName')}
          />
        </div>
      </div>

      <div className="mb-2">
        <input
          type="email"
          className="form-control"
          placeholder="Email address *"
          value={form.email}
          onChange={set('email')}
          required
        />
      </div>

      <div className="mb-2">
        <input
          type="tel"
          className="form-control"
          placeholder="Phone number"
          value={form.phone}
          onChange={set('phone')}
        />
      </div>

      <div className="mb-2">
        <select
          className="form-select"
          value={form.role}
          onChange={set('role')}
        >
          <option value="5">Customer</option>
          <option value="4">Agent (requires approval)</option>
          <option value="3">Client / Merchant</option>
        </select>
      </div>

      <div className="mb-2">
        <input
          type="password"
          className="form-control"
          placeholder="Password *"
          value={form.password}
          onChange={set('password')}
          required
        />
      </div>

      <div className="mb-3">
        <input
          type="password"
          className="form-control"
          placeholder="Confirm password *"
          value={form.confirmPassword}
          onChange={set('confirmPassword')}
          required
        />
      </div>

      {form.role === '4' && (
        <div className="alert alert-warning py-2 fs-12 mb-3">
          Agent accounts require admin approval before activation.
        </div>
      )}

      <div className="d-flex justify-content-between mb-3">
        <div className="form-check">
          <input
            type="checkbox"
            className="form-check-input"
            id="checkbox-agree"
            checked={form.agreed}
            onChange={(e) => setForm((p) => ({ ...p, agreed: e.target.checked }))}
          />
          <label className="form-check-label" htmlFor="checkbox-agree">
            I agree to all{' '}
            <Link href="" className="link-dark text-decoration-underline">
              Terms &amp; Conditions
            </Link>
          </label>
        </div>
      </div>

      <div className="d-grid">
        <button className="btn btn-primary fw-semibold" type="submit" disabled={loading}>
          {loading ? <Spinner size="sm" className="me-2" /> : null}
          Create Account
        </button>
      </div>

      <p className="text-center mt-3 mb-0 text-muted fs-13">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-dark fw-semibold">
          Sign In
        </Link>
      </p>
    </form>
  )
}

export default RegisterForm
