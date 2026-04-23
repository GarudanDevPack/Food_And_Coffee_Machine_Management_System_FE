"use client";
import PageTitle from "@/components/PageTitle";
import { reservationsApi, machinesApi, itemsApi } from "@/lib/api";
import { useApiToken } from "@/hooks/useApi";
import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  Col,
  Form,
  Modal,
  Row,
  Spinner,
} from "react-bootstrap";
import { toast } from "react-toastify";
import Swal from "sweetalert2";

interface Reservation {
  _id: string;
  machineId?: string;
  itemName?: string;
  date?: string;
  timeSlot?: string;
  customTime?: string;
  quantity?: number;
  status?: string;
  note?: string;
  createdAt?: string;
}

interface Machine {
  _id: string;
  machineId: string;
  name: string;
  location?: string;
}
interface FoodItem {
  _id: string;
  name: string;
  unitPrice?: number;
}
interface NearExpiryItem {
  itemId: string;
  itemName: string;
  batchId: string;
  expiryDate: string;
  hoursRemaining: number;
  discountPct: number;
  quantity: number;
}

const statusBg = (s?: string) =>
  ({
    pending: "warning",
    confirmed: "info",
    completed: "success",
    cancelled: "secondary",
  })[s ?? ""] ?? "secondary";

const slotLabel = (slot?: string, custom?: string) => {
  if (slot === "morning") return "🌅 Morning (7–10 AM)";
  if (slot === "lunch") return "☀️ Lunch (12–2 PM)";
  if (slot === "dinner") return "🌙 Dinner (6–8 PM)";
  if (slot === "custom") return `⏰ Custom — ${custom ?? ""}`;
  return slot ?? "—";
};

// ── Book Modal ────────────────────────────────────────────────────────────────
const BookModal = ({
  show,
  onHide,
  token,
  onBooked,
}: {
  show: boolean;
  onHide: () => void;
  token: string;
  onBooked: () => void;
}) => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [items, setItems] = useState<FoodItem[]>([]);
  const [nearExpiry, setNearExpiry] = useState<NearExpiryItem[]>([]);
  const [form, setForm] = useState({
    machineId: "",
    itemId: "",
    itemName: "",
    date: "",
    timeSlot: "lunch",
    customTime: "",
    quantity: "1",
    note: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!show || !token) return;
    Promise.all([
      machinesApi.list(token, {}) as Promise<Machine[]>,
      itemsApi.list(token, { itemType: "food" }) as Promise<FoodItem[]>,
    ])
      .then(([m, i]) => {
        setMachines(
          m.filter((x: any) => x.machineType === "food" || !x.machineType),
        );
        setItems(i);
      })
      .catch(() => {});
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setForm((p) => ({ ...p, date: tomorrow.toISOString().split("T")[0] }));
    setNearExpiry([]);
  }, [show, token]);

  // Fetch near-expiry items whenever the selected machine changes
  useEffect(() => {
    if (!form.machineId || !token) {
      setNearExpiry([]);
      return;
    }
    machinesApi
      .nearExpiryItems(token, form.machineId)
      .then(setNearExpiry)
      .catch(() => setNearExpiry([]));
  }, [form.machineId, token]);

  const set = (f: string) => (e: any) => {
    const value = e.target.value;
    setForm((p) => {
      const next = { ...p, [f]: value };
      if (f === "itemId") {
        const item = items.find((i) => i._id === value);
        next.itemName = item?.name ?? "";
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.machineId || !form.itemId || !form.date) {
      toast.error("Fill all required fields");
      return;
    }
    setSaving(true);
    try {
      await reservationsApi.create(token, {
        machineId: form.machineId,
        itemId: form.itemId,
        itemName: form.itemName,
        date: form.date,
        timeSlot: form.timeSlot,
        customTime: form.timeSlot === "custom" ? form.customTime : undefined,
        quantity: Number(form.quantity) || 1,
        note: form.note.trim() || undefined,
      });
      toast.success("Reservation created!");
      onBooked();
      onHide();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to book");
    } finally {
      setSaving(false);
    }
  };

  const minDate = new Date().toISOString().split("T")[0];

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title className="fs-15">
          <i className="ri-calendar-check-line me-2 text-primary" />
          Book Food Reservation
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>
              Machine <span className="text-danger">*</span>
            </Form.Label>
            <Form.Select
              value={form.machineId}
              onChange={set("machineId")}
              required
            >
              <option value="">— Select machine —</option>
              {machines.map((m) => (
                <option key={m._id} value={m.machineId}>
                  {m.name}
                  {m.location ? ` (${m.location})` : ""}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>
              Food Item <span className="text-danger">*</span>
            </Form.Label>
            <Form.Select value={form.itemId} onChange={set("itemId")} required>
              <option value="">— Select item —</option>
              {items.map((i) => {
                const ne = nearExpiry.find((n) => n.itemId === i._id);
                return (
                  <option key={i._id} value={i._id}>
                    {ne
                      ? `🔥 ${i.name} — ${ne.discountPct}% OFF (expires in ${ne.hoursRemaining}h)`
                      : `${i.name}${i.unitPrice ? ` — LKR ${i.unitPrice}` : ""}`}
                  </option>
                );
              })}
            </Form.Select>
            {nearExpiry.some((n) => n.itemId === form.itemId) &&
              (() => {
                const ne = nearExpiry.find((n) => n.itemId === form.itemId)!;
                return (
                  <div className="mt-2 p-2 rounded bg-warning bg-opacity-10 border border-warning d-flex align-items-center gap-2 fs-13">
                    <i className="ri-time-line text-warning fs-16" />
                    <div>
                      <span className="fw-semibold text-warning">
                        {ne.discountPct}% discount applied automatically
                      </span>
                      <span className="text-muted">
                        {" "}
                        — batch expires in {ne.hoursRemaining}h
                      </span>
                    </div>
                  </div>
                );
              })()}
          </Form.Group>

          <Row>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label>
                  Date <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="date"
                  min={minDate}
                  value={form.date}
                  onChange={set("date")}
                  required
                />
              </Form.Group>
            </Col>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label>Quantity</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  max={10}
                  value={form.quantity}
                  onChange={set("quantity")}
                />
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>
              Time Slot <span className="text-danger">*</span>
            </Form.Label>
            <Form.Select value={form.timeSlot} onChange={set("timeSlot")}>
              <option value="morning">🌅 Morning (7–10 AM)</option>
              <option value="lunch">☀️ Lunch (12–2 PM)</option>
              <option value="dinner">🌙 Dinner (6–8 PM)</option>
              <option value="custom">⏰ Custom time</option>
            </Form.Select>
          </Form.Group>

          {form.timeSlot === "custom" && (
            <Form.Group className="mb-3">
              <Form.Label>Custom Time</Form.Label>
              <Form.Control
                type="time"
                value={form.customTime}
                onChange={set("customTime")}
              />
            </Form.Group>
          )}

          <Form.Group className="mb-2">
            <Form.Label>Note (optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              placeholder="Any special instructions..."
              value={form.note}
              onChange={set("note")}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" size="sm" onClick={onHide}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={saving}>
            {saving ? (
              <Spinner size="sm" className="me-1" />
            ) : (
              <i className="ri-calendar-check-line me-1" />
            )}
            Book Reservation
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CustomerReservationsPage() {
  const token = useApiToken();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBook, setShowBook] = useState(false);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await reservationsApi.myReservations(token);
      setReservations(
        (data as Reservation[]).sort(
          (a, b) =>
            new Date(b.createdAt ?? 0).getTime() -
            new Date(a.createdAt ?? 0).getTime(),
        ),
      );
    } catch (err: any) {
      toast.error(err.message ?? "Failed to load reservations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) load();
  }, [token]);

  const handleCancel = async (r: Reservation) => {
    const result = await Swal.fire({
      title: "Cancel Reservation?",
      text: `Cancel your reservation for "${r.itemName}" on ${r.date}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, Cancel",
    });
    if (!result.isConfirmed || !token) return;
    try {
      await reservationsApi.cancel(token, r._id);
      toast.success("Reservation cancelled");
      load();
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    }
  };

  const upcoming = reservations.filter(
    (r) => r.status === "pending" || r.status === "confirmed",
  );
  const past = reservations.filter(
    (r) => r.status === "completed" || r.status === "cancelled",
  );

  return (
    <>
      <PageTitle title="Food Reservations" subTitle="Pre-order food" />

      <Row className="mb-3 align-items-center">
        <Col>
          <Badge bg="secondary" className="fs-13 fw-normal px-3 py-2">
            Upcoming: {upcoming.length}
          </Badge>
        </Col>
        <Col xs="auto">
          <Button variant="primary" size="sm" onClick={() => setShowBook(true)}>
            <i className="ri-calendar-check-line me-1" />
            New Reservation
          </Button>
          <Button
            variant="light"
            size="sm"
            className="ms-2"
            onClick={load}
            disabled={loading}
          >
            {loading ? (
              <Spinner size="sm" />
            ) : (
              <i className="ri-refresh-line" />
            )}
          </Button>
        </Col>
      </Row>

      {loading ? (
        <div className="text-center py-5">
          <Spinner />
        </div>
      ) : reservations.length === 0 ? (
        <Card>
          <CardBody className="text-center py-5">
            <i className="ri-calendar-line d-block fs-48 text-muted mb-3" />
            <p className="text-muted mb-3">No reservations yet</p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowBook(true)}
            >
              <i className="ri-calendar-check-line me-1" />
              Book Your First Reservation
            </Button>
          </CardBody>
        </Card>
      ) : (
        <>
          {upcoming.length > 0 && (
            <>
              <h6 className="fw-semibold mb-2 text-muted text-uppercase fs-12">
                Upcoming
              </h6>
              <Row className="g-3 mb-4">
                {upcoming.map((r) => (
                  <Col key={r._id} xs={12} md={6} lg={4}>
                    <Card className="h-100 border-start border-3 border-primary">
                      <CardBody>
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div className="fw-bold">{r.itemName ?? "—"}</div>
                          <Badge
                            bg={statusBg(r.status)}
                            className="text-capitalize"
                          >
                            {r.status}
                          </Badge>
                        </div>
                        <div className="text-muted fs-13 mb-1">
                          <i className="ri-map-pin-line me-1" />
                          {r.machineId}
                        </div>
                        <div className="text-muted fs-13 mb-1">
                          <i className="ri-calendar-line me-1" />
                          {r.date}
                        </div>
                        <div className="text-muted fs-13 mb-1">
                          <i className="ri-time-line me-1" />
                          {slotLabel(r.timeSlot, r.customTime)}
                        </div>
                        <div className="text-muted fs-13 mb-2">
                          <i className="ri-stack-line me-1" />
                          Qty: {r.quantity ?? 1}
                        </div>
                        {r.note && (
                          <div className="text-muted fs-12 fst-italic mb-2">
                            "{r.note}"
                          </div>
                        )}
                        {(r.status === "pending" ||
                          r.status === "confirmed") && (
                          <Button
                            variant="outline-danger"
                            size="sm"
                            className="w-100"
                            onClick={() => handleCancel(r)}
                          >
                            <i className="ri-close-line me-1" />
                            Cancel
                          </Button>
                        )}
                      </CardBody>
                    </Card>
                  </Col>
                ))}
              </Row>
            </>
          )}

          {past.length > 0 && (
            <>
              <h6 className="fw-semibold mb-2 text-muted text-uppercase fs-12">
                Past
              </h6>
              <Row className="g-3">
                {past.map((r) => (
                  <Col key={r._id} xs={12} md={6} lg={4}>
                    <Card className="h-100 opacity-75">
                      <CardBody>
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div className="fw-semibold text-muted">
                            {r.itemName ?? "—"}
                          </div>
                          <Badge
                            bg={statusBg(r.status)}
                            className="text-capitalize"
                          >
                            {r.status}
                          </Badge>
                        </div>
                        <div className="text-muted fs-13">
                          <i className="ri-calendar-line me-1" />
                          {r.date} — {slotLabel(r.timeSlot, r.customTime)}
                        </div>
                      </CardBody>
                    </Card>
                  </Col>
                ))}
              </Row>
            </>
          )}
        </>
      )}

      <BookModal
        show={showBook}
        onHide={() => setShowBook(false)}
        token={token ?? ""}
        onBooked={load}
      />
    </>
  );
}
