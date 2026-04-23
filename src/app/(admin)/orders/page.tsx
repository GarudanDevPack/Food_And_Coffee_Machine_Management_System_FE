"use client";
import { fmtDate, fmtDateTime } from "@/lib/fmt";
import PageTitle from "@/components/PageTitle";
import { ordersApi } from "@/lib/api";
import { useSession } from "next-auth/react";
import React, { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  Col,
  Form,
  InputGroup,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";
import { disconnectSocket, getSocket } from "@/lib/socket";
import { toast } from "react-toastify";
import Swal from "sweetalert2";

interface OrderItem {
  itemId?: string;
  itemName?: string;
  quantity?: number;
  unitPrice?: number;
}

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
  items?: OrderItem[];
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

const isToday = (dateStr?: string) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
};

const isThisWeek = (dateStr?: string) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3_600_000);
  return d >= weekAgo && d <= now;
};

type DateFilter = "today" | "week" | "all";

export default function OrdersPage() {
  const { data: session } = useSession();
  const token = (session?.user as any)?.token ?? "";

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [machineFilter, setMachineFilter] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchOrders = async () => {
    if (!token) return;
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (machineFilter.trim()) params.machineId = machineFilter.trim();
      const data = (await ordersApi.list(token, params)) as Order[];
      setOrders(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [token, statusFilter, machineFilter]);

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

  const handleComplete = async (o: Order) => {
    const id = o._id ?? o.orderId ?? "";
    setActionId(id);
    try {
      await ordersApi.complete(token, o._id!);
      toast.success("Order marked completed");
      fetchOrders();
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    } finally {
      setActionId(null);
    }
  };

  const handleFail = async (o: Order) => {
    const { value: reason, isConfirmed } = await Swal.fire({
      title: "Fail Order",
      input: "text",
      inputLabel: "Failure reason",
      inputPlaceholder: "Enter reason...",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Fail Order",
    });
    if (!isConfirmed) return;
    const id = o._id ?? "";
    setActionId(id);
    try {
      await ordersApi.fail(token, o._id!, reason);
      toast.success("Order marked failed");
      fetchOrders();
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    } finally {
      setActionId(null);
    }
  };

  // Apply client-side date filter
  const displayed = orders.filter((o) => {
    if (dateFilter === "today") return isToday(o.createdAt);
    if (dateFilter === "week") return isThisWeek(o.createdAt);
    return true;
  });

  const todayOrders = orders.filter((o) => isToday(o.createdAt));
  const pending = orders.filter((o) => o.status === "pending").length;
  const dispensing = orders.filter((o) => o.status === "dispensing").length;
  const completed = orders.filter((o) => o.status === "completed").length;
  const failed = orders.filter((o) => o.status === "failed").length;

  return (
    <>
      <PageTitle title="Orders" subTitle="Operations" />

      {/* Summary cards */}
      <Row className="g-3 mb-3">
        {[
          {
            label: "Today's Orders",
            value: todayOrders.length,
            bg: "secondary",
          },
          { label: "Pending", value: pending, bg: "warning" },
          { label: "Dispensing", value: dispensing, bg: "info" },
          { label: "Completed", value: completed, bg: "success" },
          { label: "Failed", value: failed, bg: "danger" },
        ].map(({ label, value, bg }) => (
          <Col xs={6} sm={4} lg={2} key={label}>
            <Card className="text-center py-2">
              <CardBody className="p-2">
                <div className="fw-bold fs-20">{value}</div>
                <Badge bg={bg} className="fs-12 fw-normal">
                  {label}
                </Badge>
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Filters */}
      <Card className="mb-3">
        <CardBody className="py-2">
          <Row className="g-2 align-items-center">
            <Col xs={12} sm={4} md={3}>
              <Form.Select
                size="sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="dispensing">Dispensing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
                <option value="cancelled">Cancelled</option>
              </Form.Select>
            </Col>
            <Col xs={12} sm={4} md={3}>
              <InputGroup size="sm">
                <InputGroup.Text>
                  <i className="ri-cpu-line" />
                </InputGroup.Text>
                <Form.Control
                  placeholder="Machine ID"
                  value={machineFilter}
                  onChange={(e) => setMachineFilter(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col xs={12} sm={4} md={3}>
              <Form.Select
                size="sm"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="all">All Time</option>
              </Form.Select>
            </Col>
            <Col xs="auto" className="ms-auto">
              <Button
                variant="light"
                size="sm"
                onClick={fetchOrders}
                disabled={loading}
              >
                {loading ? (
                  <Spinner size="sm" />
                ) : (
                  <i className="ri-refresh-line" />
                )}{" "}
                Refresh
              </Button>
            </Col>
          </Row>
        </CardBody>
      </Card>

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
                    <th>Discount</th>
                    <th>Status</th>
                    <th>Time</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center text-muted py-4">
                        No orders found
                      </td>
                    </tr>
                  ) : (
                    displayed.map((o) => {
                      const rowId = o.orderId ?? (o._id ? String(o._id) : "");
                      const isExpanded = expandedId === rowId;
                      const isActing = actionId === rowId;
                      const canComplete =
                        o.status === "pending" || o.status === "dispensing";
                      const canFail =
                        o.status === "pending" || o.status === "dispensing";

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
                            <td className="fs-13">
                              {o.discountApplied ? (
                                <Badge bg="success" className="fs-11">
                                  {o.discountApplied}%
                                </Badge>
                              ) : (
                                "—"
                              )}
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
                            <td>
                              <div className="d-flex gap-1 justify-content-center">
                                <Button
                                  variant="soft-secondary"
                                  size="sm"
                                  title="View Details"
                                  onClick={() =>
                                    setExpandedId(isExpanded ? null : rowId)
                                  }
                                >
                                  <i
                                    className={
                                      isExpanded
                                        ? "ri-eye-off-line"
                                        : "ri-eye-line"
                                    }
                                  />
                                </Button>
                                {canComplete && (
                                  <Button
                                    variant="soft-success"
                                    size="sm"
                                    title="Mark Completed"
                                    disabled={isActing}
                                    onClick={() => handleComplete(o)}
                                  >
                                    {isActing ? (
                                      <Spinner size="sm" />
                                    ) : (
                                      <i className="ri-check-line" />
                                    )}
                                  </Button>
                                )}
                                {canFail && (
                                  <Button
                                    variant="soft-danger"
                                    size="sm"
                                    title="Mark Failed"
                                    disabled={isActing}
                                    onClick={() => handleFail(o)}
                                  >
                                    <i className="ri-close-line" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${rowId}-detail`} className="table-light">
                              <td colSpan={10} className="p-3">
                                <Row className="g-2 fs-13">
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
                                    <div className="text-muted">Customer</div>
                                    <div>{o.userName ?? o.userId ?? "—"}</div>
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
                                  {o.items && o.items.length > 0 && (
                                    <Col xs={12}>
                                      <div className="text-muted mb-1">
                                        Items
                                      </div>
                                      <Table
                                        size="sm"
                                        bordered
                                        className="mb-0 fs-12"
                                      >
                                        <thead>
                                          <tr>
                                            <th>Item</th>
                                            <th>Qty</th>
                                            <th>Unit Price</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {o.items.map((it, i) => (
                                            <tr key={i}>
                                              <td>
                                                {it.itemName ??
                                                  it.itemId ??
                                                  "—"}
                                              </td>
                                              <td>{it.quantity ?? 1}</td>
                                              <td>
                                                {it.unitPrice != null
                                                  ? `LKR ${it.unitPrice.toLocaleString()}`
                                                  : "—"}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </Table>
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
