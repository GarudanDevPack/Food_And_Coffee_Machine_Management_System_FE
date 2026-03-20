'use client'
import PageTitle from '@/components/PageTitle'
import { agentsApi } from '@/lib/api'
import { useApiToken } from '@/hooks/useApi'
import { useEffect, useState } from 'react'
import { Badge, Button, Card, CardBody, Spinner, Table } from 'react-bootstrap'
import { toast } from 'react-toastify'

interface LogEntry {
  _id: string
  action: string
  targetId?: string
  targetLabel?: string
  meta?: Record<string, unknown>
  createdAt?: string
}

const actionLabel = (a: string) => ({
  customer_created: 'Customer Created',
  membership_sold: 'Membership Sold',
  wallet_topup: 'Wallet Top-Up',
  inspection_filed: 'Inspection Filed',
  order_completed: 'Order Completed',
  order_failed: 'Order Failed',
  machine_flushed: 'Machine Flushed',
})[a] ?? a

const actionBg = (a: string) => ({
  customer_created: 'success',
  membership_sold: 'primary',
  wallet_topup: 'info',
  inspection_filed: 'warning',
  order_completed: 'success',
  order_failed: 'danger',
  machine_flushed: 'secondary',
})[a] ?? 'secondary'

const actionIcon = (a: string) => ({
  customer_created: 'ri-user-add-line',
  membership_sold: 'ri-vip-crown-line',
  wallet_topup: 'ri-wallet-3-line',
  inspection_filed: 'ri-clipboard-check-line',
  order_completed: 'ri-checkbox-circle-line',
  order_failed: 'ri-close-circle-line',
  machine_flushed: 'ri-refresh-line',
})[a] ?? 'ri-history-line'

export default function AgentActivityLogPage() {
  const token = useApiToken()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await agentsApi.activityLog(token)
      setLogs(data as LogEntry[])
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load activity log')
    } finally { setLoading(false) }
  }

  useEffect(() => { if (token) load() }, [token])

  return (
    <>
      <PageTitle title="Activity Log" subTitle="Agent" />

      <Card>
        <div className="card-header d-flex align-items-center justify-content-between">
          <h5 className="mb-0">My Recent Actions</h5>
          <Button variant="light" size="sm" onClick={load} disabled={loading}>
            {loading ? <Spinner size="sm" /> : <i className="ri-refresh-line" />} Refresh
          </Button>
        </div>
        <CardBody className="p-0">
          {loading ? (
            <div className="text-center py-5"><Spinner /></div>
          ) : logs.length === 0 ? (
            <div className="text-center text-muted py-5">
              <i className="ri-history-line d-block fs-40 mb-2" />
              No activity recorded yet
            </div>
          ) : (
            <div className="table-responsive">
              <Table className="table-custom table-centered table-sm table-nowrap table-hover mb-0">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Details</th>
                    <th>Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id}>
                      <td>
                        <Badge bg={actionBg(log.action)} className="d-flex align-items-center gap-1" style={{ width: 'fit-content' }}>
                          <i className={actionIcon(log.action)} />
                          {actionLabel(log.action)}
                        </Badge>
                      </td>
                      <td className="text-muted fs-13">{log.targetLabel ?? log.targetId ?? '—'}</td>
                      <td className="text-muted fs-12" style={{ maxWidth: 220, whiteSpace: 'normal' }}>
                        {log.meta
                          ? Object.entries(log.meta)
                              .filter(([, v]) => v != null)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(' · ')
                          : '—'}
                      </td>
                      <td className="text-muted fs-12">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString('en-GB') : '—'}
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
