"use client";
import PageTitle from "@/components/PageTitle";
import { reservationsApi } from "@/lib/api";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  Col,
  Nav,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";
import { toast } from "react-toastify";
import Swal from "sweetalert2";

interface Reservation {
  _id?: string;
  id?: string;
  userId?: string;
  machineId?: string;
  itemId?: string;
  itemName?: string;
  date?: string;
  timeSlot?: string;
  customTime?: string;
  quantity?: number;
  status?: string;
  note?: string;
  createdAt?: string;
}

type TabType = "all" | "pending" | "confirmed" | "completed" | "cancelled";

const statusBg = (s?: string) =>
  ({
    pending: "warning",
    confirmed: "info",
    completed: "success",
    cancelled: "secondary",
  })[s ?? ""] ?? "secondary";

const slotLabel = (slot?: string, custom?: string) => {
  if (slot === "morning") return "🌅 Morning";
  if (slot === "lunch") return "☀️ Lunch";
  if (slot === "dinner") return "🌙 Dinner";
  if (slot === "custom") return custom ?? "Custom";
  return slot ?? "—";
};

export default function AdminReservationsPage() {
  const { data: session } = useSession();
  const token = (session?.user as any)?.token ?? "";

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabType>("all");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = (await reservationsApi.list(token)) as Reservation[];
      setReservations(data);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to load reservations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleConfirm = async (r: Reservation) => {
    setProcessingId(r._id ?? r.id);
    try {
      await reservationsApi.confirm(token, r._id ?? r.id);
      toast.success("Reservation confirmed");
      fetchData();
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    } finally {
      setProcessingId(null);
    }
  };

  const handleComplete = async (r: Reservation) => {
    setProcessingId(r._id ?? r.id);
    try {
      await reservationsApi.complete(token, r._id ?? r.id);
      toast.success("Marked as completed");
      fetchData();
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (r: Reservation) => {
    const result = await Swal.fire({
      title: "Cancel Reservation?",
      input: "text",
      inputLabel: "Reason (optional)",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Cancel Reservation",
    });
    if (!result.isConfirmed) return;
    setProcessingId(r._id ?? r.id);
    try {
      await reservationsApi.cancel(
        token,
        r._id ?? r.id,
        result.value || undefined,
      );
      toast.success("Reservation cancelled");
      fetchData();
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    } finally {
      setProcessingId(null);
    }
  };

  const displayed =
    tab === "all" ? reservations : reservations.filter((r) => r.status === tab);

  const countByStatus = (s: string) =>
    reservations.filter((r) => r.status === s).length;
  const pendingCount = countByStatus("pending");

  return (
    <>
      <PageTitle title="Reservations" subTitle="Operations" />

      <Row className="mb-3 align-items-center">
        <Col>
          <div className="d-flex gap-2 flex-wrap">
            <Badge bg="secondary" className="fs-13 fw-normal px-3 py-2">
              Total: {reservations.length}
            </Badge>
            {pendingCount > 0 && (
              <Badge
                bg="warning"
                text="dark"
                className="fs-13 fw-normal px-3 py-2"
              >
                Pending: {pendingCount}
              </Badge>
            )}
          </div>
        </Col>
        <Col xs="auto">
          <Button
            variant="light"
            size="sm"
            onClick={fetchData}
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

      <Card>
        <div className="card-header border-bottom">
          <Nav variant="tabs" className="card-header-tabs">
            {(
              [
                { key: "all", label: `All (${reservations.length})` },
                { key: "pending", label: "Pending", badge: pendingCount },
                {
                  key: "confirmed",
                  label: `Confirmed (${countByStatus("confirmed")})`,
                },
                {
                  key: "completed",
                  label: `Completed (${countByStatus("completed")})`,
                },
                { key: "cancelled", label: "Cancelled" },
              ] as { key: TabType; label: string; badge?: number }[]
            ).map((t) => (
              <Nav.Item key={t.key}>
                <Nav.Link
                  active={tab === t.key}
                  onClick={() => setTab(t.key)}
                  style={{ cursor: "pointer" }}
                >
                  {t.label}
                  {t.badge != null && t.badge > 0 && (
                    <Badge bg="warning" text="dark" className="ms-1">
                      {t.badge}
                    </Badge>
                  )}
                </Nav.Link>
              </Nav.Item>
            ))}
          </Nav>
        </div>
        <CardBody className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner />
            </div>
          ) : (
            <div className="table-responsive">
              <Table className="table-custom table-centered table-sm table-nowrap table-hover mb-0">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Machine</th>
                    <th>Date</th>
                    <th>Time Slot</th>
                    <th className="text-center">Qty</th>
                    <th>Status</th>
                    <th>Note</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-muted py-4">
                        No reservations
                      </td>
                    </tr>
                  ) : (
                    displayed.map((r) => (
                      <tr key={r._id ?? r.id}>
                        <td className="fw-semibold">{r.itemName ?? "—"}</td>
                        <td>
                          <code className="text-muted fs-12">
                            {r.machineId ?? "—"}
                          </code>
                        </td>
                        <td className="text-muted fs-12">{r.date ?? "—"}</td>
                        <td>{slotLabel(r.timeSlot, r.customTime)}</td>
                        <td className="text-center">{r.quantity ?? 1}</td>
                        <td>
                          <Badge
                            bg={statusBg(r.status)}
                            className="text-capitalize"
                          >
                            {r.status ?? "—"}
                          </Badge>
                        </td>
                        <td
                          className="text-muted fs-12"
                          style={{ maxWidth: 150, whiteSpace: "normal" }}
                        >
                          {r.note ?? "—"}
                        </td>
                        <td className="text-center">
                          <div className="d-flex gap-1 justify-content-center">
                            {r.status === "pending" && (
                              <Button
                                variant="soft-info"
                                size="sm"
                                onClick={() => handleConfirm(r)}
                                disabled={processingId === (r._id ?? r.id)}
                                title="Confirm"
                              >
                                {processingId === (r._id ?? r.id) ? (
                                  <Spinner size="sm" />
                                ) : (
                                  <i className="ri-check-double-line" />
                                )}
                              </Button>
                            )}
                            {r.status === "confirmed" && (
                              <Button
                                variant="soft-success"
                                size="sm"
                                onClick={() => handleComplete(r)}
                                disabled={processingId === (r._id ?? r.id)}
                                title="Mark Completed"
                              >
                                {processingId === (r._id ?? r.id) ? (
                                  <Spinner size="sm" />
                                ) : (
                                  <i className="ri-checkbox-circle-line" />
                                )}
                              </Button>
                            )}
                            {(r.status === "pending" ||
                              r.status === "confirmed") && (
                              <Button
                                variant="soft-danger"
                                size="sm"
                                onClick={() => handleCancel(r)}
                                disabled={processingId === (r._id ?? r.id)}
                                title="Cancel"
                              >
                                <i className="ri-close-circle-line" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
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
