"use client";
import PageTitle from "@/components/PageTitle";
import { machinesApi } from "@/lib/api";
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
import { toast } from "react-toastify";

interface Sensor {
  temp?: number;
  water?: string;
}

interface Batch {
  _id?: string;
  batchId?: string;
  itemName?: string;
  nozzleId?: number;
  quantity?: number;
  expiryDate?: string;
  status?: string;
}

interface Machine {
  _id?: string;
  machineId?: string;
  name?: string;
  machineType?: "coffee" | "food";
  location?: string;
  isOnline?: boolean;
  sleepMode?: boolean;
  flushMode?: boolean;
  error?: string;
  sensor?: Sensor;
  totalOrders?: number;
  totalRevenue?: number;
  batches?: Batch[];
}

const statusDot = (m: Machine) => {
  if (m.sleepMode || m.error === "Sleep_Mode_ON")
    return { color: "#fd7e14", label: "Sleeping" };
  if (m.isOnline) return { color: "#28a745", label: "Online" };
  return { color: "#dc3545", label: "Offline" };
};

const typeBg = (t?: string) => (t === "food" ? "warning" : "info");

export default function AgentMachinesPage() {
  const { data: session } = useSession();
  const token = (session?.user as any)?.token ?? "";

  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchMachines = async () => {
    if (!token) return;
    try {
      const data = (await machinesApi.myMachines(token)) as Machine[];
      setMachines(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMachines();
  }, [token]);

  // Real-time machine status via Socket.io
  useEffect(() => {
    if (!token) return;
    const sock = getSocket(token);
    sock.on("machine:status", (update: Partial<Machine>) => {
      setMachines((prev) =>
        prev.map((m) =>
          m.machineId === update.machineId ? { ...m, ...update } : m,
        ),
      );
    });
    return () => {
      sock.off("machine:status");
      disconnectSocket();
    };
  }, [token]);

  // Re-fetch on tab focus
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchMachines();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [token]);

  // 35s flush badge auto-clear
  useEffect(() => {
    const isFlushing = machines.some((m) => m.flushMode);
    if (!isFlushing) return;
    const t = setTimeout(() => fetchMachines(), 35_000);
    return () => clearTimeout(t);
  }, [machines]);

  const withAction = async (id: string, fn: () => Promise<void>) => {
    setActionId(id);
    try {
      await fn();
    } catch (err: any) {
      toast.error(err.message ?? "Action failed");
    } finally {
      setActionId(null);
    }
  };

  const handleFlush = async (m: Machine) => {
    await withAction(m.machineId!, async () => {
      await machinesApi.flush(token, m.machineId!);
      toast.success("Flush command sent");
      fetchMachines();
    });
  };

  const handleSleepToggle = async (m: Machine) => {
    const isSleeping = m.sleepMode || m.error === "Sleep_Mode_ON";
    await withAction(m.machineId!, async () => {
      if (isSleeping) {
        await machinesApi.wake(token, m.machineId!);
        toast.success("Wake command sent");
      } else {
        await machinesApi.sleep(token, m.machineId!);
        toast.success("Sleep command sent");
      }
      fetchMachines();
    });
  };

  const total = machines.length;
  const online = machines.filter(
    (m) => m.isOnline && !m.sleepMode && m.error !== "Sleep_Mode_ON",
  ).length;
  const sleeping = machines.filter(
    (m) => m.sleepMode || m.error === "Sleep_Mode_ON",
  ).length;

  return (
    <>
      <PageTitle title="My Machines" subTitle="Agent" />

      <Row className="mb-3 align-items-center">
        <Col>
          <div className="d-flex flex-wrap gap-2">
            <Badge bg="secondary" className="fs-13 fw-normal px-3 py-2">
              Total: {total}
            </Badge>
            <Badge bg="success" className="fs-13 fw-normal px-3 py-2">
              Online: {online}
            </Badge>
            <Badge bg="warning" className="fs-13 fw-normal px-3 py-2 text-dark">
              Sleeping: {sleeping}
            </Badge>
          </div>
        </Col>
        <Col xs="auto">
          <Button
            variant="light"
            size="sm"
            onClick={fetchMachines}
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
                    <th>Machine ID</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Sensor</th>
                    <th>Orders</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {machines.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-muted py-4">
                        No machines assigned
                      </td>
                    </tr>
                  ) : (
                    machines.map((m) => {
                      const dot = statusDot(m);
                      const isSleeping =
                        m.sleepMode || m.error === "Sleep_Mode_ON";
                      const canControl = m.isOnline && !isSleeping;
                      const isActing = actionId === m.machineId;
                      const rowId = m.machineId ?? (m._id ? String(m._id) : "");
                      const isExpanded = expandedId === rowId;

                      return (
                        <React.Fragment key={rowId}>
                          <tr>
                            <td>
                              <code className="text-primary fs-12">
                                {m.machineId ?? "—"}
                              </code>
                            </td>
                            <td className="fw-semibold">{m.name ?? "—"}</td>
                            <td>
                              <Badge
                                bg={typeBg(m.machineType)}
                                className="text-capitalize"
                              >
                                {m.machineType ?? "coffee"}
                              </Badge>
                            </td>
                            <td className="text-muted fs-13">
                              {m.location ?? "—"}
                            </td>
                            <td>
                              <span className="d-flex align-items-center gap-2">
                                <span
                                  style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    background: dot.color,
                                    display: "inline-block",
                                    flexShrink: 0,
                                  }}
                                />
                                <span className="fs-13">{dot.label}</span>
                                {m.flushMode && (
                                  <Badge
                                    bg="warning"
                                    className="text-dark d-flex align-items-center gap-1 fs-11"
                                  >
                                    <Spinner
                                      size="sm"
                                      style={{
                                        width: "0.6rem",
                                        height: "0.6rem",
                                      }}
                                    />
                                    Flushing...
                                  </Badge>
                                )}
                              </span>
                            </td>
                            <td className="fs-12 text-muted">
                              {m.sensor?.temp != null
                                ? `${m.sensor.temp}°C`
                                : "—"}
                              {m.sensor?.water && (
                                <Badge
                                  bg={
                                    m.sensor.water === "low"
                                      ? "danger"
                                      : "secondary"
                                  }
                                  className="ms-1 fs-11 text-capitalize"
                                >
                                  {m.sensor.water}
                                </Badge>
                              )}
                            </td>
                            <td className="fs-13">{m.totalOrders ?? 0}</td>
                            <td>
                              <div className="d-flex gap-1 justify-content-center">
                                {m.machineType !== "food" && (
                                  <Button
                                    variant="soft-info"
                                    size="sm"
                                    title="Flush"
                                    disabled={
                                      !canControl || !!m.flushMode || isActing
                                    }
                                    onClick={() => handleFlush(m)}
                                  >
                                    {isActing ? (
                                      <Spinner size="sm" />
                                    ) : (
                                      <IconifyIcon
                                        icon="ri:drop-line"
                                        style={{ fontSize: 16 }}
                                      />
                                    )}
                                  </Button>
                                )}
                                <Button
                                  variant={
                                    isSleeping ? "soft-success" : "soft-warning"
                                  }
                                  size="sm"
                                  title={isSleeping ? "Wake" : "Sleep"}
                                  disabled={
                                    (!canControl && !isSleeping) || isActing
                                  }
                                  onClick={() => handleSleepToggle(m)}
                                >
                                  {isActing ? (
                                    <Spinner size="sm" />
                                  ) : (
                                    <IconifyIcon
                                      icon={
                                        isSleeping
                                          ? "ri:sun-line"
                                          : "ri:moon-line"
                                      }
                                      style={{ fontSize: 16 }}
                                    />
                                  )}
                                </Button>
                                {m.machineType === "food" && (
                                  <Button
                                    variant="soft-secondary"
                                    size="sm"
                                    title="View Batches"
                                    onClick={() =>
                                      setExpandedId(isExpanded ? null : rowId)
                                    }
                                  >
                                    <IconifyIcon
                                      icon={
                                        isExpanded
                                          ? "ri:arrow-up-s-line"
                                          : "ri:arrow-down-s-line"
                                      }
                                      style={{ fontSize: 16 }}
                                    />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                          {isExpanded && m.machineType === "food" && (
                            <tr
                              key={`${rowId}-batches`}
                              className="table-light"
                            >
                              <td colSpan={8} className="p-3">
                                <div className="fw-semibold mb-2 fs-13">
                                  Loaded Batches
                                </div>
                                {!m.batches || m.batches.length === 0 ? (
                                  <span className="text-muted fs-13">
                                    No batches loaded
                                  </span>
                                ) : (
                                  <Table
                                    size="sm"
                                    bordered
                                    className="mb-0 fs-12"
                                  >
                                    <thead>
                                      <tr>
                                        <th>Slot</th>
                                        <th>Item</th>
                                        <th>Qty</th>
                                        <th>Expiry</th>
                                        <th>Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {m.batches.map((b, i) => {
                                        const expiry = b.expiryDate
                                          ? new Date(b.expiryDate)
                                          : null;
                                        const hoursLeft = expiry
                                          ? (expiry.getTime() - Date.now()) /
                                            3_600_000
                                          : null;
                                        const nearExpiry =
                                          hoursLeft !== null &&
                                          hoursLeft < 24 &&
                                          hoursLeft > 0;
                                        const expired =
                                          hoursLeft !== null && hoursLeft <= 0;
                                        return (
                                          <tr
                                            key={b._id ?? b.batchId ?? i}
                                            className="fs-12"
                                          >
                                            <td>N{b.nozzleId ?? "—"}</td>
                                            <td>{b.itemName ?? "—"}</td>
                                            <td>{b.quantity ?? 0}</td>
                                            <td>
                                              {expiry
                                                ? expiry.toLocaleString("en-GB")
                                                : "—"}
                                              {nearExpiry && (
                                                <Badge
                                                  bg="warning"
                                                  className="ms-1 text-dark fs-11"
                                                >
                                                  Expiring Soon
                                                </Badge>
                                              )}
                                              {expired && (
                                                <Badge
                                                  bg="danger"
                                                  className="ms-1 fs-11"
                                                >
                                                  Expired
                                                </Badge>
                                              )}
                                            </td>
                                            <td>
                                              <Badge
                                                bg={
                                                  b.status === "active"
                                                    ? "success"
                                                    : "secondary"
                                                }
                                                className="text-capitalize fs-11"
                                              >
                                                {b.status ?? "active"}
                                              </Badge>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </Table>
                                )}
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
