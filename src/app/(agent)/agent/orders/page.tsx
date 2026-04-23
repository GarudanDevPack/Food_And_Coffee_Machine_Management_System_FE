"use client";
import { fmtDate, fmtDateTime } from "@/lib/fmt";
import PageTitle from "@/components/PageTitle";
import { ordersApi } from "@/lib/api";
import { useSession } from "next-auth/react";
import React, { useEffect, useState } from "react";
import IconifyIcon from "@/components/wrappers/IconifyIcon";
import { disconnectSocket, getSocket } from "@/lib/socket";
import {
  Badge,
  Button,
  Card,
  CardBody,
  Col,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";

interface Order {
  _id?: string;
  orderId?: string;
  userId?: string;
  userName?: string;
  machineId?: string;
  machineName?: string;
  itemName?: string;
  cupSize?: string;
  quantity?: number;
  totalAmount?: number;
  currency?: string;
  discountApplied?: number;
  status?: string;
  failureReason?: string;
  createdAt?: string;
}

const statusBg = (s?: string): string =>
  ({
    pending: "warning",
    dispensing: "info",
    completed: "success",
    failed: "danger",
    refunded: "secondary",
    cancelled: "secondary",
  })[s ?? ""] ?? "secondary";

export default function AgentOrdersPage() {
  const { data: session } = useSession();
  const token = (session?.user as any)?.token ?? "";
  const userId = (session?.user as any)?.id ?? "";

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchOrders = async () => {
    if (!token) return;
    try {
      const data = (await ordersApi.list(
        token,
        userId ? { agentId: userId } : undefined,
      )) as Order[];
      setOrders(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [token, userId]);

  // Real-time order status via Socket.io
  useEffect(() => {
    if (!token) return;
    const sock = getSocket(token);
    sock.on("order:status", (update: Partial<Order>) => {
      setOrders((prev) =>
        prev.map((o) =>
          o.orderId === update.orderId ? { ...o, ...update } : o,
        ),
      );
    });
    return () => {
      sock.off("order:status");
      disconnectSocket();
    };
  }, [token]);

  // Re-fetch on tab focus
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchOrders();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [token]);

  const today = orders.filter((o) => {
    if (!o.createdAt) return false;
    return new Date(o.createdAt).toDateString() === new Date().toDateString();
  });

  return (
    <>
      <PageTitle title="Orders" subTitle="Agent" />

      <Row className="mb-3 align-items-center">
        <Col>
          <div className="d-flex flex-wrap gap-2">
            <Badge bg="secondary" className="fs-13 fw-normal px-3 py-2">
              Total: {orders.length}
            </Badge>
            <Badge bg="primary" className="fs-13 fw-normal px-3 py-2">
              Today: {today.length}
            </Badge>
            <Badge bg="warning" className="fs-13 fw-normal px-3 py-2 text-dark">
              Pending: {orders.filter((o) => o.status === "pending").length}
            </Badge>
            <Badge bg="success" className="fs-13 fw-normal px-3 py-2">
              Completed: {orders.filter((o) => o.status === "completed").length}
            </Badge>
          </div>
        </Col>
        <Col xs="auto">
          <Button
            variant="light"
            size="sm"
            onClick={fetchOrders}
            disabled={loading}
          >
            {loading ? (
              <Spinner size="sm" />
            ) : (
              <IconifyIcon icon="ri:refresh-line" />
            )}{" "}
            Refresh
          </Button>
        </Col>
      </Row>

      <Card>
        <CardBody className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner />
            </div>
          ) : (
            <div className="table-responsive">
              <Table className="table-custom table-centered table-sm table-nowrap mb-0">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Machine</th>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Time</th>
                    <th className="text-center">View</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center text-muted py-4">
                        No orders found
                      </td>
                    </tr>
                  ) : (
                    orders.map((o) => {
                      const rowId = o.orderId ?? (o._id ? String(o._id) : "");
                      const isExpanded = expandedId === rowId;
                      return (
                        <React.Fragment key={rowId}>
                          <tr>
                            <td>
                              <code className="fs-12 text-primary">
                                {o.orderId ?? rowId.slice(-8)}
                              </code>
                            </td>
                            <td className="fs-13">
                              {o.userName ?? o.userId ?? "—"}
                            </td>
                            <td className="text-muted fs-12">
                              {o.machineName ?? o.machineId ?? "—"}
                            </td>
                            <td className="fs-13">
                              {o.itemName ?? "—"}
                              {o.cupSize && (
                                <span className="text-muted ms-1 fs-11">
                                  ({o.cupSize})
                                </span>
                              )}
                            </td>
                            <td className="fs-13">{o.quantity ?? 1}</td>
                            <td className="fs-13">
                              {o.currency ?? "LKR"}{" "}
                              {(o.totalAmount ?? 0).toLocaleString()}
                            </td>
                            <td>
                              <span className="d-flex align-items-center gap-1">
                                <Badge
                                  bg={statusBg(o.status)}
                                  className="text-capitalize"
                                >
                                  {o.status}
                                </Badge>
                                {o.status === "dispensing" && (
                                  <Spinner
                                    size="sm"
                                    variant="info"
                                    style={{
                                      width: "0.6rem",
                                      height: "0.6rem",
                                    }}
                                  />
                                )}
                              </span>
                            </td>
                            <td className="text-muted fs-12">
                              {o.createdAt ? fmtDateTime(o.createdAt) : "—"}
                            </td>
                            <td className="text-center">
                              <Button
                                variant="soft-secondary"
                                size="sm"
                                onClick={() =>
                                  setExpandedId(isExpanded ? null : rowId)
                                }
                              >
                                <IconifyIcon
                                  icon={
                                    isExpanded
                                      ? "ri:eye-off-line"
                                      : "ri:eye-line"
                                  }
                                  style={{ fontSize: 16 }}
                                />
                              </Button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${rowId}-detail`} className="table-light">
                              <td colSpan={9} className="p-3 fs-13">
                                <Row className="g-2">
                                  <Col xs={12} sm={6} md={4}>
                                    <div className="text-muted">Order ID</div>
                                    <div className="fw-semibold">
                                      {o.orderId ?? rowId}
                                    </div>
                                  </Col>
                                  <Col xs={12} sm={6} md={4}>
                                    <div className="text-muted">Machine</div>
                                    <div>
                                      {o.machineName ?? o.machineId ?? "—"}
                                    </div>
                                  </Col>
                                  <Col xs={12} sm={6} md={4}>
                                    <div className="text-muted">Discount</div>
                                    <div>
                                      {o.discountApplied
                                        ? `${o.discountApplied}%`
                                        : "—"}
                                    </div>
                                  </Col>
                                  {o.failureReason && (
                                    <Col xs={12}>
                                      <div className="text-muted">
                                        Failure Reason
                                      </div>
                                      <div className="text-danger">
                                        {o.failureReason}
                                      </div>
                                    </Col>
                                  )}
                                </Row>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </CardBody>
      </Card>
    </>
  );
}
