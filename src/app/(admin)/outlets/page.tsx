"use client";
import { fmtDate } from "@/lib/fmt";
import PageTitle from "@/components/PageTitle";
import { outletsApi } from "@/lib/api";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
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

// Load map only on client (Leaflet requires window)
const LocationPickerMap = dynamic(
  () => import("@/components/LocationPickerMap"),
  { ssr: false },
);

interface LatLng {
  lat: number;
  lng: number;
}

interface Outlet {
  _id?: string;
  id?: string;
  outletId?: string;
  name?: string;
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
  agentId?: string;
  clientId?: string;
  machineIds?: string[];
  qrToken?: string;
  isActive?: boolean;
  createdAt?: string;
}

// ── Location Picker Modal ─────────────────────────────────────────────────────
const LocationModal = ({
  show,
  onHide,
  value,
  onSave,
}: {
  show: boolean;
  onHide: () => void;
  value: LatLng | null;
  onSave: (ll: LatLng) => void;
}) => {
  const [picked, setPicked] = useState<LatLng | null>(value);

  useEffect(() => {
    if (show) setPicked(value);
  }, [show, value]);

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title className="fs-15">
          <i className="ri-map-pin-line me-2 text-primary" />
          Select Location on Map
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-2">
        <LocationPickerMap value={picked} onChange={setPicked} height={420} />
        {picked && (
          <div className="mt-2 text-center text-muted fs-12">
            <i className="ri-map-pin-2-line me-1 text-success" />
            Lat: <strong>{picked.lat.toFixed(6)}</strong> &nbsp; Lng:{" "}
            <strong>{picked.lng.toFixed(6)}</strong>
          </div>
        )}
        {!picked && (
          <div className="mt-2 text-center text-muted fs-12">
            Click anywhere on the map to drop a pin
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="light" size="sm" onClick={onHide}>
          Cancel
        </Button>
        <Button
          variant="success"
          size="sm"
          disabled={!picked}
          onClick={() => {
            if (picked) {
              onSave(picked);
              onHide();
            }
          }}
        >
          <i className="ri-check-line me-1" /> Confirm Location
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

// ── Outlet Form Modal ─────────────────────────────────────────────────────────
const OutletModal = ({ show, onHide, editing, token, onSaved }: any) => {
  const blank = { name: "", location: "", agentId: "", clientId: "" };
  const [form, setForm] = useState(blank);
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (f: string) => (e: any) =>
    setForm((p) => ({ ...p, [f]: e.target.value }));

  useEffect(() => {
    if (show) {
      setForm(
        editing
          ? {
              name: editing.name ?? "",
              location: editing.location ?? "",
              agentId: editing.agentId ?? "",
              clientId: editing.clientId ?? "",
            }
          : blank,
      );
      setCoords(
        editing?.latitude && editing?.longitude
          ? { lat: editing.latitude, lng: editing.longitude }
          : null,
      );
    }
  }, [show, editing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        name: form.name,
        location: form.location || undefined,
        agentId: form.agentId,
        clientId: form.clientId || undefined,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
      };
      if (editing) {
        await outletsApi.update(token, editing._id ?? editing.id, payload);
        toast.success("Outlet updated");
      } else {
        await outletsApi.create(token, payload);
        toast.success("Outlet created");
      }
      onSaved();
      onHide();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save outlet");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal show={show && !showMap} onHide={onHide} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editing ? "Edit Outlet" : "Add Outlet"}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>
                Outlet Name <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                value={form.name}
                onChange={set("name")}
                placeholder="e.g. Main Canteen"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Location Description</Form.Label>
              <Form.Control
                value={form.location}
                onChange={set("location")}
                placeholder="e.g. Block A, Ground Floor"
              />
            </Form.Group>

            {/* Map coordinates */}
            <Form.Group className="mb-3">
              <Form.Label>GPS Coordinates</Form.Label>
              <div className="d-flex gap-2 align-items-center">
                {coords ? (
                  <div className="flex-grow-1 bg-light rounded px-3 py-2 fs-12 text-muted d-flex align-items-center gap-2">
                    <i className="ri-map-pin-2-fill text-success fs-14" />
                    <span>
                      <strong>{coords.lat.toFixed(6)}</strong>,{" "}
                      <strong>{coords.lng.toFixed(6)}</strong>
                    </span>
                  </div>
                ) : (
                  <div className="flex-grow-1 bg-light rounded px-3 py-2 fs-12 text-muted">
                    <i className="ri-map-pin-line me-1" />
                    No location pinned
                  </div>
                )}
                <Button
                  variant="outline-primary"
                  size="sm"
                  type="button"
                  onClick={() => setShowMap(true)}
                >
                  <i className="ri-map-2-line me-1" />
                  {coords ? "Change" : "Pick on Map"}
                </Button>
                {coords && (
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    type="button"
                    onClick={() => setCoords(null)}
                    title="Clear"
                  >
                    <i className="ri-close-line" />
                  </Button>
                )}
              </div>
              {coords && (
                <a
                  href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="fs-12 text-primary mt-1 d-inline-block"
                >
                  <i className="ri-external-link-line me-1" />
                  View on Google Maps
                </a>
              )}
            </Form.Group>

            <Row>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Agent ID <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    value={form.agentId}
                    onChange={set("agentId")}
                    placeholder="Agent MongoDB _id"
                    required
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>Client ID</Form.Label>
                  <Form.Control
                    value={form.clientId}
                    onChange={set("clientId")}
                    placeholder="Client MongoDB _id"
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
              {saving ? <Spinner size="sm" className="me-1" /> : null}
              {editing ? "Update Outlet" : "Create Outlet"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <LocationModal
        show={showMap}
        onHide={() => setShowMap(false)}
        value={coords}
        onSave={setCoords}
      />
    </>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function OutletsPage() {
  const { data: session } = useSession();
  const token = (session?.user as any)?.token ?? "";

  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Outlet | null>(null);

  const fetchOutlets = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await outletsApi.list(token);
      setOutlets(data as Outlet[]);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to load outlets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutlets();
  }, [token]);

  const handleDelete = async (o: Outlet) => {
    const r = await Swal.fire({
      title: "Delete Outlet?",
      text: `"${o.name}" will be removed.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Delete",
    });
    if (!r.isConfirmed) return;
    try {
      await outletsApi.delete(token, (o._id ?? o.id)!);
      toast.success("Outlet deleted");
      fetchOutlets();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete");
    }
  };

  const activeCount = outlets.filter((o) => o.isActive !== false).length;

  return (
    <>
      <PageTitle title="Outlet Management" subTitle="Operations" />

      <Row className="mb-3 align-items-center">
        <Col>
          <div className="d-flex gap-2 flex-wrap">
            <Badge bg="secondary" className="fs-13 fw-normal px-3 py-2">
              Total: {outlets.length}
            </Badge>
            <Badge bg="success" className="fs-13 fw-normal px-3 py-2">
              Active: {activeCount}
            </Badge>
            <Badge bg="danger" className="fs-13 fw-normal px-3 py-2">
              Inactive: {outlets.length - activeCount}
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
            <i className="ri-add-line me-1" /> Add Outlet
          </Button>
          <Button
            variant="light"
            size="sm"
            className="ms-2"
            onClick={fetchOutlets}
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
                    <th>Outlet ID</th>
                    <th>Name</th>
                    <th>Location</th>
                    <th>Coordinates</th>
                    <th className="text-center">Machines</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {outlets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-muted py-4">
                        No outlets found
                      </td>
                    </tr>
                  ) : (
                    outlets.map((o, i) => (
                      <tr key={o._id ?? o.id ?? i}>
                        <td>
                          <code className="fs-12">
                            {o.outletId ?? (o._id ?? o.id)?.slice(-8)}
                          </code>
                        </td>
                        <td className="fw-semibold">{o.name ?? "—"}</td>
                        <td className="text-muted fs-12">
                          {o.location ?? "—"}
                        </td>
                        <td>
                          {o.latitude && o.longitude ? (
                            <a
                              href={`https://www.google.com/maps?q=${o.latitude},${o.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="d-flex align-items-center gap-1 text-primary fs-12"
                              title="Open in Google Maps"
                            >
                              <i className="ri-map-pin-2-fill text-success" />
                              {o.latitude.toFixed(4)}, {o.longitude.toFixed(4)}
                            </a>
                          ) : (
                            <span className="text-muted fs-12">—</span>
                          )}
                        </td>
                        <td className="text-center">
                          <Badge bg="info">{o.machineIds?.length ?? 0}</Badge>
                        </td>
                        <td>
                          <Badge
                            bg={o.isActive !== false ? "success" : "danger"}
                          >
                            {o.isActive !== false ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="text-muted fs-12">
                          {o.createdAt ? fmtDate(o.createdAt) : "—"}
                        </td>
                        <td className="text-center">
                          <div className="d-flex gap-1 justify-content-center">
                            <Button
                              variant="soft-primary"
                              size="sm"
                              onClick={() => {
                                setEditing(o);
                                setShowModal(true);
                              }}
                              title="Edit"
                            >
                              <i className="ri-edit-line" />
                            </Button>
                            <Button
                              variant="soft-danger"
                              size="sm"
                              onClick={() => handleDelete(o)}
                              title="Delete"
                            >
                              <i className="ri-delete-bin-line" />
                            </Button>
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

      <OutletModal
        show={showModal}
        onHide={() => setShowModal(false)}
        editing={editing}
        token={token}
        onSaved={fetchOutlets}
      />
    </>
  );
}
