'use client'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import SimplebarReactClient from '@/components/wrappers/SimplebarReactClient'
import { notificationsApi } from '@/lib/api'
import { Bell } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useState } from 'react'
import { Badge, Col, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Row } from 'react-bootstrap'

interface Notification {
  _id: string
  title: string
  message: string
  type?: string
  isRead?: boolean
  createdAt?: string
}

const typeIcon = (type?: string) => {
  const map: Record<string, { icon: string; variant: string }> = {
    order: { icon: 'solar:cart-bold-duotone', variant: 'success' },
    wallet: { icon: 'solar:wallet-bold-duotone', variant: 'primary' },
    alert: { icon: 'solar:danger-circle-bold-duotone', variant: 'danger' },
    promotion: { icon: 'solar:tag-price-bold-duotone', variant: 'warning' },
    system: { icon: 'solar:bell-bold-duotone', variant: 'info' },
  }
  return map[type ?? 'system'] ?? map.system
}

const timeSince = (dateStr?: string) => {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const Notifications = () => {
  const { data: session } = useSession()
  const token = (session?.user as any)?.token ?? ''

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)

  const fetchNotifications = useCallback(async () => {
    if (!token) return
    try {
      const [list, countRes] = await Promise.all([
        notificationsApi.list(token) as Promise<Notification[]>,
        notificationsApi.getUnreadCount(token).catch(() => ({ count: 0 })),
      ])
      setNotifications(list.slice(0, 15))
      setUnreadCount((countRes as { count: number }).count ?? 0)
    } catch {
      // silently fail
    }
  }, [token])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const handleMarkAllRead = async () => {
    if (!token) return
    await notificationsApi.markAllRead(token).catch(() => {})
    setUnreadCount(0)
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  const handleMarkRead = async (id: string) => {
    if (!token) return
    await notificationsApi.markRead(token, id).catch(() => {})
    setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, isRead: true } : n))
    setUnreadCount((c) => Math.max(0, c - 1))
  }

  return (
    <div className="topbar-item">
      <Dropdown align="end" show={open} onToggle={(v) => { setOpen(v); if (v) fetchNotifications() }}>
        <DropdownToggle
          as="button"
          className="topbar-link drop-arrow-none position-relative"
          data-bs-toggle="dropdown"
          data-bs-offset="0,25"
          data-bs-auto-close="outside"
          aria-haspopup="false"
          aria-expanded="false">
          <Bell className="animate-ring fs-22" />
          {unreadCount > 0 && (
            <Badge
              bg="danger"
              className="position-absolute top-0 start-100 translate-middle rounded-pill"
              style={{ fontSize: 9, padding: '2px 5px', minWidth: 16 }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </DropdownToggle>

        <DropdownMenu className="p-0 dropdown-menu-end dropdown-menu-lg" style={{ minHeight: 300 }}>
          <div className="p-2 border-bottom border-dashed">
            <Row className="align-items-center">
              <Col>
                <h6 className="m-0 fs-16 fw-semibold">
                  Notifications
                  {unreadCount > 0 && <Badge bg="danger" className="ms-2">{unreadCount}</Badge>}
                </h6>
              </Col>
              <Col xs="auto">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="btn btn-sm btn-soft-primary py-0 px-2 fs-11"
                    onClick={handleMarkAllRead}>
                    Mark all read
                  </button>
                )}
              </Col>
            </Row>
          </div>

          <SimplebarReactClient style={{ maxHeight: 320 }}>
            {notifications.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <IconifyIcon icon="line-md:bell-twotone-alert-loop" className="fs-48 d-block mx-auto mb-2" />
                No notifications
              </div>
            ) : notifications.map((n) => {
              const { icon, variant } = typeIcon(n.type)
              return (
                <div
                  key={n._id}
                  className={`notification-item dropdown-item py-2 text-wrap ${!n.isRead ? 'bg-light' : ''}`}
                  onClick={() => !n.isRead && handleMarkRead(n._id)}
                  style={{ cursor: n.isRead ? 'default' : 'pointer' }}>
                  <span className="d-flex align-items-start gap-2">
                    <div className="avatar-sm flex-shrink-0">
                      <span className={`avatar-title bg-${variant}-subtle text-${variant} rounded-circle fs-18`}>
                        <IconifyIcon icon={icon} />
                      </span>
                    </div>
                    <span className="flex-grow-1">
                      <span className={`d-block fw-semibold fs-13 ${!n.isRead ? 'text-dark' : 'text-muted'}`}>
                        {n.title}
                      </span>
                      <span className="d-block text-muted fs-12 text-wrap">{n.message}</span>
                      <span className="d-block text-muted fs-11 mt-1">{timeSince(n.createdAt)}</span>
                    </span>
                    {!n.isRead && (
                      <span
                        style={{ width: 8, height: 8, borderRadius: '50%', background: '#f77f00', flexShrink: 0, marginTop: 4 }}
                      />
                    )}
                  </span>
                </div>
              )
            })}
          </SimplebarReactClient>

          <div className="border-top p-2 text-center">
            <button
              type="button"
              className="btn btn-sm btn-light w-100"
              onClick={fetchNotifications}>
              <IconifyIcon icon="ri:refresh-line" className="me-1" /> Refresh
            </button>
          </div>
        </DropdownMenu>
      </Dropdown>
    </div>
  )
}

export default Notifications
