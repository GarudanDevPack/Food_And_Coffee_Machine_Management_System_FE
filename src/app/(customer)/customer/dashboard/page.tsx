"use client";
import { fmtDate } from "@/lib/fmt";
import PageTitle from "@/components/PageTitle";
import {
  ordersApi,
  walletApi,
  membershipsApi,
  reservationsApi,
} from "@/lib/api";
import { useApiToken } from "@/hooks/useApi";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  Col,
  Row,
  Spinner,
} from "react-bootstrap";

interface Order {
  _id: string;
  itemName?: string;
  machineId?: string;
  totalAmount?: number;
  status?: string;
  createdAt?: string;
}

interface Membership {
  _id: string;
  plan?: string;
  discount?: number;
  endDate?: string;
  isActive?: boolean;
}

interface Reservation {
  _id: string;
  itemName?: string;
  date?: string;
  timeSlot?: string;
  status?: string;
}

const statusBg = (s?: string) =>
  ({
    completed: "success",
    dispensing: "info",
    pending: "warning",
    failed: "danger",
    cancelled: "secondary",
  })[s ?? ""] ?? "secondary";

const planColor = (p?: string) =>
  ({ basic: "info", premium: "primary", vip: "warning" })[p ?? ""] ??
  "secondary";

export default function CustomerDashboardPage() {
  const token = useApiToken();
  const [balance, setBalance] = useState<number | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      walletApi
        .getMyBalance(token)
        .then((r) => setBalance(r.balance))
        .catch(() => {}),
      ordersApi
        .myOrders(token)
        .then((r) => setOrders(r as Order[]))
        .catch(() => {}),
      membershipsApi
        .my(token)
        .then((r) => setMembership(r as unknown as Membership))
        .catch(() => {}),
      reservationsApi
        .myReservations(token)
        .then((r) => setReservations(r as Reservation[]))
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [token]);

  const recentOrders = orders.slice(0, 3);
  const upcomingReservations = reservations.filter(
    (r) => r.status === "pending" || r.status === "confirmed",
  );

  return (
    <>
      <PageTitle title="My Dashboard" subTitle="Welcome back" />

      {loading ? (
        <div className="text-center py-5">
          <Spinner />
        </div>
      ) : (
        <>
          {/* Top stat cards */}
          <Row className="g-3 mb-4">
            <Col xs={12} sm={6} lg={3}>
              <Card className="h-100">
                <CardBody className="d-flex align-items-center gap-3">
                  <div
                    className="avatar-sm bg-soft-primary rounded d-flex align-items-center justify-content-center"
                    style={{ width: 48, height: 48, flexShrink: 0 }}
                  >
                    <i className="ri-wallet-3-line text-primary fs-20" />
                  </div>
                  <div>
                    <div className="text-muted fs-13">Wallet Balance</div>
                    <div className="fw-bold fs-20 text-primary">
                      LKR {(balance ?? 0).toLocaleString()}
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Col>

            <Col xs={12} sm={6} lg={3}>
              <Card className="h-100">
                <CardBody className="d-flex align-items-center gap-3">
                  <div
                    className="avatar-sm bg-soft-success rounded d-flex align-items-center justify-content-center"
                    style={{ width: 48, height: 48, flexShrink: 0 }}
                  >
                    <i className="ri-shopping-bag-line text-success fs-20" />
                  </div>
                  <div>
                    <div className="text-muted fs-13">Total Orders</div>
                    <div className="fw-bold fs-20">{orders.length}</div>
                  </div>
                </CardBody>
              </Card>
            </Col>

            <Col xs={12} sm={6} lg={3}>
              <Card className="h-100">
                <CardBody className="d-flex align-items-center gap-3">
                  <div
                    className="avatar-sm bg-soft-warning rounded d-flex align-items-center justify-content-center"
                    style={{ width: 48, height: 48, flexShrink: 0 }}
                  >
                    <i className="ri-vip-crown-line text-warning fs-20" />
                  </div>
                  <div>
                    <div className="text-muted fs-13">Membership</div>
                    {membership?.isActive ? (
                      <Badge
                        bg={planColor(membership.plan)}
                        className="text-capitalize fs-13 fw-normal"
                      >
                        {membership.plan}
                      </Badge>
                    ) : (
                      <span className="text-muted fs-13">No plan</span>
                    )}
                  </div>
                </CardBody>
              </Card>
            </Col>

            <Col xs={12} sm={6} lg={3}>
              <Card className="h-100">
                <CardBody className="d-flex align-items-center gap-3">
                  <div
                    className="avatar-sm bg-soft-info rounded d-flex align-items-center justify-content-center"
                    style={{ width: 48, height: 48, flexShrink: 0 }}
                  >
                    <i className="ri-calendar-check-line text-info fs-20" />
                  </div>
                  <div>
                    <div className="text-muted fs-13">Upcoming Bookings</div>
                    <div className="fw-bold fs-20">
                      {upcomingReservations.length}
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>

          {/* Membership banner */}
          {membership?.isActive && (
            <Card className="mb-4 border-start border-3 border-warning">
              <CardBody className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div>
                  <div className="fw-semibold">
                    <i className="ri-vip-crown-line me-1 text-warning" />
                    {membership.plan?.charAt(0).toUpperCase()}
                    {membership.plan?.slice(1)} Membership Active
                  </div>
                  <div className="text-muted fs-13">
                    {membership.discount}% discount on all orders
                    {membership.endDate &&
                      ` · Expires ${fmtDate(membership.endDate)}`}
                  </div>
                </div>
                <Link href="/customer/membership">
                  <Button variant="outline-warning" size="sm">
                    View Membership
                  </Button>
                </Link>
              </CardBody>
            </Card>
          )}

          <Row className="g-3 mb-4">
            {/* Recent orders */}
            <Col xs={12} lg={7}>
              <Card className="h-100">
                <div className="card-header d-flex align-items-center justify-content-between">
                  <h5 className="mb-0">Recent Orders</h5>
                  <Link href="/customer/orders" className="text-muted fs-13">
                    View all →
                  </Link>
                </div>
                <CardBody className="p-0">
                  {recentOrders.length === 0 ? (
                    <div className="text-center text-muted py-4 fs-13">
                      No orders yet
                    </div>
                  ) : (
                    <table className="table table-sm table-hover mb-0">
                      <tbody>
                        {recentOrders.map((o) => (
                          <tr key={o._id}>
                            <td className="ps-3">
                              <div className="fw-semibold fs-13">
                                {o.itemName ?? "—"}
                              </div>
                              <div className="text-muted fs-11">
                                {o.machineId}
                              </div>
                            </td>
                            <td className="text-end text-muted fs-13">
                              LKR {(o.totalAmount ?? 0).toLocaleString()}
                            </td>
                            <td className="pe-3 text-end">
                              <Badge
                                bg={statusBg(o.status)}
                                className="text-capitalize"
                              >
                                {o.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardBody>
              </Card>
            </Col>

            {/* Quick actions */}
            <Col xs={12} lg={5}>
              <Card className="h-100">
                <div className="card-header">
                  <h5 className="mb-0">Quick Actions</h5>
                </div>
                <CardBody>
                  <div className="d-grid gap-2">
                    <Link href="/customer/reservations">
                      <Button variant="primary" className="w-100">
                        <i className="ri-calendar-check-line me-2" />
                        Book Food Reservation
                      </Button>
                    </Link>
                    <Link href="/customer/wallet">
                      <Button variant="outline-primary" className="w-100">
                        <i className="ri-add-circle-line me-2" />
                        Top Up Wallet
                      </Button>
                    </Link>
                    <Link href="/customer/orders">
                      <Button variant="outline-secondary" className="w-100">
                        <i className="ri-file-list-3-line me-2" />
                        View All Orders
                      </Button>
                    </Link>
                    {!membership?.isActive && (
                      <Link href="/customer/membership">
                        <Button variant="outline-warning" className="w-100">
                          <i className="ri-vip-crown-line me-2" />
                          Get Membership
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>

          {/* Upcoming reservations */}
          {upcomingReservations.length > 0 && (
            <Card>
              <div className="card-header d-flex align-items-center justify-content-between">
                <h5 className="mb-0">Upcoming Food Reservations</h5>
                <Link
                  href="/customer/reservations"
                  className="text-muted fs-13"
                >
                  View all →
                </Link>
              </div>
              <CardBody className="p-0">
                <table className="table table-sm table-hover mb-0">
                  <tbody>
                    {upcomingReservations.slice(0, 3).map((r) => (
                      <tr key={r._id}>
                        <td className="ps-3 fw-semibold fs-13">
                          {r.itemName ?? "—"}
                        </td>
                        <td className="text-muted fs-13">
                          <i className="ri-calendar-line me-1" />
                          {r.date}
                        </td>
                        <td className="text-muted fs-13 text-capitalize">
                          {r.timeSlot}
                        </td>
                        <td className="pe-3 text-end">
                          <Badge
                            bg={r.status === "confirmed" ? "info" : "warning"}
                            className="text-capitalize"
                          >
                            {r.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardBody>
            </Card>
          )}
        </>
      )}
    </>
  );
}
