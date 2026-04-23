"use client";
import { fmtDate } from "@/lib/fmt";
import PageTitle from "@/components/PageTitle";
import { promotionsApi } from "@/lib/api";
import { useSession } from "next-auth/react";
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
  Table,
} from "react-bootstrap";
import { toast } from "react-toastify";
import Swal from "sweetalert2";

interface Promotion {
  _id?: string;
  id?: string;
  title: string;
  description?: string;
  itemId?: string | null;
  discountPct: number;
  startDate: string;
  endDate: string;
  isActive?: boolean;
}

const getPromoStatus = (p: Promotion) => {
  const now = new Date();
  const start = new Date(p.startDate);
  const end = new Date(p.endDate);
  if (!p.isActive) return "inactive";
  if (start > now) return "upcoming";
  if (end < now) return "expired";
  return "active";
};

const statusBg = (s: string) =>
  ({
    active: "success",
    upcoming: "info",
    expired: "secondary",
    inactive: "danger",
  })[s] ?? "secondary";

// ── Promotion Modal ───────────────────────────────────────────────────────────
const PromotionModal = ({ show, onHide, promo, token, onSaved }: any) => {
  const [form, setForm] = useState({
    title: "",
    description: "",
    itemId: "",
    discountPct: "",
    startDate: "",
    endDate: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (promo) {
      setForm({
        title: promo.title ?? "",
        description: promo.description ?? "",
        itemId: promo.itemId ?? "",
        discountPct: String(promo.discountPct ?? ""),
        startDate: promo.startDate ? promo.startDate.slice(0, 10) : "",
        endDate: promo.endDate ? promo.endDate.slice(0, 10) : "",
      });
    } else {
      setForm({
        title: "",
        description: "",
        itemId: "",
        discountPct: "",
        startDate: "",
        endDate: "",
      });
    }
  }, [promo, show]);

  const set = (f: string) => (e: any) =>
    setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.discountPct || !form.startDate || !form.endDate) {
      toast.error("Fill required fields");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        itemId: form.itemId.trim() || null,
        discountPct: Number(form.discountPct),
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
      };
      if (promo) {
        await promotionsApi.update(token, promo._id ?? promo.id, payload);
        toast.success("Promotion updated");
      } else {
        await promotionsApi.create(token, payload);
        toast.success("Promotion created");
      }
      onSaved();
      onHide();
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          {promo ? "Edit Promotion" : "Create Promotion"}
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>
              Title <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              value={form.title}
              onChange={set("title")}
              placeholder="e.g. Weekend Sale"
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={form.description}
              onChange={set("description")}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>
              Item ID{" "}
              <span className="text-muted fs-12">
                (leave blank = applies to ALL items globally)
              </span>
            </Form.Label>
            <Form.Control
              value={form.itemId}
              onChange={set("itemId")}
              placeholder="MongoDB _id (optional)"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>
              Discount % <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="number"
              min={1}
              max={100}
              value={form.discountPct}
              onChange={set("discountPct")}
              required
            />
          </Form.Group>
          <Row>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label>
                  Start Date <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="date"
                  value={form.startDate}
                  onChange={set("startDate")}
                  required
                />
              </Form.Group>
            </Col>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label>
                  End Date <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="date"
                  value={form.endDate}
                  onChange={set("endDate")}
                  required
                />
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onHide}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? <Spinner size="sm" className="me-1" /> : null}{" "}
            {promo ? "Save" : "Create"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PromotionsPage() {
  const { data: session } = useSession();
  const token = (session?.user as any)?.token ?? "";

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);

  const fetchPromotions = async () => {
    if (!token) return;
    setLoading(true);
    try {
      setPromotions((await promotionsApi.list(token)) as Promotion[]);
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, [token]);

  const handleDelete = async (p: Promotion) => {
    const r = await Swal.fire({
      title: "Delete Promotion?",
      text: `"${p.title}" will be deactivated.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Delete",
    });
    if (!r.isConfirmed) return;
    try {
      await promotionsApi.delete(token, p._id ?? p.id);
      toast.success("Deleted");
      fetchPromotions();
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    }
  };

  const activeCount = promotions.filter(
    (p) => getPromoStatus(p) === "active",
  ).length;

  return (
    <>
      <PageTitle title="Promotions" subTitle="Operations" />

      <Row className="mb-3 align-items-center">
        <Col>
          <div className="d-flex gap-2">
            <Badge bg="secondary" className="fs-13 fw-normal px-3 py-2">
              Total: {promotions.length}
            </Badge>
            <Badge bg="success" className="fs-13 fw-normal px-3 py-2">
              Active: {activeCount}
            </Badge>
          </div>
        </Col>
        <Col xs="auto">
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditing(null);
              setShowModal(true);
            }}
          >
            + Create Promotion
          </Button>
          <Button
            variant="light"
            size="sm"
            className="ms-2"
            onClick={fetchPromotions}
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
                    <th>Title</th>
                    <th>Scope</th>
                    <th className="text-center">Discount</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Status</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {promotions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-muted py-4">
                        No promotions
                      </td>
                    </tr>
                  ) : (
                    promotions.map((p) => {
                      const s = getPromoStatus(p);
                      return (
                        <tr key={p._id ?? p.id}>
                          <td>
                            <p className="fw-semibold mb-0">{p.title}</p>
                            {p.description && (
                              <p className="text-muted fs-12 mb-0">
                                {p.description}
                              </p>
                            )}
                          </td>
                          <td>
                            {p.itemId ? (
                              <Badge
                                bg="light"
                                text="dark"
                                className="fw-normal"
                              >
                                Item-specific
                              </Badge>
                            ) : (
                              <Badge bg="primary">Global (all items)</Badge>
                            )}
                          </td>
                          <td className="text-center">
                            <Badge bg="info" className="fs-13">
                              {p.discountPct}% off
                            </Badge>
                          </td>
                          <td className="text-muted fs-12">
                            {fmtDate(p.startDate)}
                          </td>
                          <td className="text-muted fs-12">
                            {fmtDate(p.endDate)}
                          </td>
                          <td>
                            <Badge bg={statusBg(s)} className="text-capitalize">
                              {s}
                            </Badge>
                          </td>
                          <td className="text-center">
                            <div className="d-flex gap-1 justify-content-center">
                              <Button
                                variant="soft-primary"
                                size="sm"
                                onClick={() => {
                                  setEditing(p);
                                  setShowModal(true);
                                }}
                              >
                                <i className="ri-edit-line" />
                              </Button>
                              <Button
                                variant="soft-danger"
                                size="sm"
                                onClick={() => handleDelete(p)}
                              >
                                <i className="ri-delete-bin-line" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </CardBody>
      </Card>

      <PromotionModal
        show={showModal}
        onHide={() => setShowModal(false)}
        promo={editing}
        token={token}
        onSaved={fetchPromotions}
      />
    </>
  );
}
