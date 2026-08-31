"use client";
import { fmtDate } from "@/lib/fmt";
import PageTitle from "@/components/PageTitle";
import { organizationsApi } from "@/lib/api";
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

interface Org {
  _id?: string;
  id?: string;
  orgId: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  clientUserId?: string;
  agentIds?: string[];
  machineIds?: string[];
  isActive?: boolean;
  contractStart?: string;
  contractEnd?: string;
  notes?: string;
}

// ── Org Modal ─────────────────────────────────────────────────────────────────
const OrgModal = ({ show, onHide, org, token, onSaved }: any) => {
  const [form, setForm] = useState({
    name: "",
    clientUserId: "",
    address: "",
    phone: "",
    email: "",
    contractStart: "",
    contractEnd: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (org) {
      setForm({
        name: org.name ?? "",
        clientUserId: org.clientUserId ?? "",
        address: org.address ?? "",
        phone: org.phone ?? "",
        email: org.email ?? "",
        contractStart: org.contractStart ? org.contractStart.slice(0, 10) : "",
        contractEnd: org.contractEnd ? org.contractEnd.slice(0, 10) : "",
        notes: org.notes ?? "",
      });
    } else {
      setForm({
        name: "",
        clientUserId: "",
        address: "",
        phone: "",
        email: "",
        contractStart: "",
        contractEnd: "",
        notes: "",
      });
    }
  }, [org, show]);

  const set = (f: string) => (e: any) =>
    setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.clientUserId.trim()) {
      toast.error("Name and Client User ID are required");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        name: form.name.trim(),
        clientUserId: form.clientUserId.trim(),
        address: form.address || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        contractStart: form.contractStart
          ? new Date(form.contractStart).toISOString()
          : undefined,
        contractEnd: form.contractEnd
          ? new Date(form.contractEnd).toISOString()
          : undefined,
        notes: form.notes || undefined,
      };
      if (org) {
        await organizationsApi.update(token, (org._id ?? org.id)!, payload);
        toast.success("Organization updated");
      } else {
        await organizationsApi.create(token, payload);
        toast.success("Organization created");
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
          {org ? "Edit Organization" : "Add Organization"}
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>
              Organization Name <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              value={form.name}
              onChange={set("name")}
              placeholder="e.g. ABC Hotels Group"
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>
              Client User ID <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              value={form.clientUserId}
              onChange={set("clientUserId")}
              placeholder="User _id with role=client"
              required
            />
          </Form.Group>
          <Row>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label>Phone</Form.Label>
                <Form.Control value={form.phone} onChange={set("phone")} />
              </Form.Group>
            </Col>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  value={form.email}
                  onChange={set("email")}
                />
              </Form.Group>
            </Col>
          </Row>
          <Form.Group className="mb-3">
            <Form.Label>Address</Form.Label>
            <Form.Control value={form.address} onChange={set("address")} />
          </Form.Group>
          <Row>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label>Contract Start</Form.Label>
                <Form.Control
                  type="date"
                  value={form.contractStart}
                  onChange={set("contractStart")}
                />
              </Form.Group>
            </Col>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label>Contract End</Form.Label>
                <Form.Control
                  type="date"
                  value={form.contractEnd}
                  onChange={set("contractEnd")}
                />
              </Form.Group>
            </Col>
          </Row>
          <Form.Group className="mb-3">
            <Form.Label>Notes</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={form.notes}
              onChange={set("notes")}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onHide}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? <Spinner size="sm" className="me-1" /> : null}{" "}
            {org ? "Save" : "Create"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

// ── Assign Modal ──────────────────────────────────────────────────────────────
const AssignModal = ({ show, onHide, org, token, onSaved }: any) => {
  const [machineId, setMachineId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [saving, setSaving] = useState(false);

  const assignMachine = async () => {
    if (!machineId.trim()) return;
    setSaving(true);
    try {
      await organizationsApi.assignMachine(
        token,
        (org._id ?? org.id)!,
        machineId.trim(),
      );
      toast.success("Machine assigned");
      setMachineId("");
      onSaved();
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  };

  const removeMachine = async (mid: string) => {
    setSaving(true);
    try {
      await organizationsApi.removeMachine(token, (org._id ?? org.id)!, mid);
      toast.success("Machine removed");
      onSaved();
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  };

  const assignAgent = async () => {
    if (!agentId.trim()) return;
    setSaving(true);
    try {
      await organizationsApi.assignAgent(
        token,
        (org._id ?? org.id)!,
        agentId.trim(),
      );
      toast.success("Agent assigned");
      setAgentId("");
      onSaved();
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  };

  const removeAgent = async (aid: string) => {
    setSaving(true);
    try {
      await organizationsApi.removeAgent(token, (org._id ?? org.id)!, aid);
      toast.success("Agent removed");
      onSaved();
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Manage — {org?.name}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <h6 className="fw-semibold fs-13 mb-2">
          Assigned Machines ({org?.machineIds?.length ?? 0})
        </h6>
        {org?.machineIds?.length > 0 && (
          <ul className="list-unstyled mb-2">
            {org.machineIds.map((mid: string) => (
              <li
                key={mid}
                className="d-flex align-items-center justify-content-between py-1 border-bottom"
              >
                <code className="fs-12">{mid}</code>
                <Button
                  variant="soft-danger"
                  size="sm"
                  disabled={saving}
                  onClick={() => removeMachine(mid)}
                >
                  <i className="ri-close-line" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="d-flex gap-2 mb-4">
          <Form.Control
            value={machineId}
            onChange={(e) => setMachineId(e.target.value)}
            placeholder="Machine ID to assign"
            size="sm"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={assignMachine}
            disabled={saving}
          >
            Assign
          </Button>
        </div>

        <h6 className="fw-semibold fs-13 mb-2">
          Assigned Agents ({org?.agentIds?.length ?? 0})
        </h6>
        {org?.agentIds?.length > 0 && (
          <ul className="list-unstyled mb-2">
            {org.agentIds.map((aid: string) => (
              <li
                key={aid}
                className="d-flex align-items-center justify-content-between py-1 border-bottom"
              >
                <code className="fs-12">{aid}</code>
                <Button
                  variant="soft-danger"
                  size="sm"
                  disabled={saving}
                  onClick={() => removeAgent(aid)}
                >
                  <i className="ri-close-line" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="d-flex gap-2">
          <Form.Control
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            placeholder="Agent user _id to assign"
            size="sm"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={assignAgent}
            disabled={saving}
          >
            Assign
          </Button>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="light" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function OrganizationsPage() {
  const { data: session } = useSession();
  const token = (session?.user as any)?.token ?? "";

  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [editing, setEditing] = useState<Org | null>(null);
  const [managing, setManaging] = useState<Org | null>(null);

  const fetchOrgs = async () => {
    if (!token) return;
    setLoading(true);
    try {
      setOrgs((await organizationsApi.list(token)) as Org[]);
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, [token]);

  const handleDelete = async (o: Org) => {
    const r = await Swal.fire({
      title: "Deactivate Organization?",
      text: `"${o.name}" will be deactivated.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Deactivate",
    });
    if (!r.isConfirmed) return;
    try {
      await organizationsApi.delete(token, (o._id ?? o.id)!);
      toast.success("Deactivated");
      fetchOrgs();
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    }
  };

  return (
    <>
      <PageTitle title="Organizations" subTitle="User Management" />

      <Row className="mb-3 align-items-center">
        <Col>
          <div className="d-flex gap-2">
            <Badge bg="secondary" className="fs-13 fw-normal px-3 py-2">
              Total: {orgs.length}
            </Badge>
            <Badge bg="success" className="fs-13 fw-normal px-3 py-2">
              Active: {orgs.filter((o) => o.isActive !== false).length}
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
            + Add Organization
          </Button>
          <Button
            variant="light"
            size="sm"
            className="ms-2"
            onClick={fetchOrgs}
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
                    <th>Org ID</th>
                    <th>Name</th>
                    <th>Phone / Email</th>
                    <th className="text-center">Machines</th>
                    <th className="text-center">Agents</th>
                    <th>Status</th>
                    <th>Contract Start</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orgs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-muted py-4">
                        No organizations found
                      </td>
                    </tr>
                  ) : (
                    orgs.map((o) => (
                      <tr key={o._id ?? o.id}>
                        <td>
                          <code className="fs-12">
                            {o.orgId ?? (o._id ?? o.id ?? "").slice(-6)}
                          </code>
                        </td>
                        <td className="fw-semibold">{o.name}</td>
                        <td className="text-muted fs-12">
                          {o.phone ?? o.email ?? "—"}
                        </td>
                        <td className="text-center">
                          <Badge bg="info">{o.machineIds?.length ?? 0}</Badge>
                        </td>
                        <td className="text-center">
                          <Badge bg="primary">{o.agentIds?.length ?? 0}</Badge>
                        </td>
                        <td>
                          <Badge
                            bg={o.isActive !== false ? "success" : "secondary"}
                          >
                            {o.isActive !== false ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="text-muted fs-12">
                          {o.contractStart ? fmtDate(o.contractStart) : "—"}
                        </td>
                        <td className="text-center">
                          <div className="d-flex gap-1 justify-content-center">
                            <Button
                              variant="soft-secondary"
                              size="sm"
                              onClick={() => {
                                setManaging(o);
                                setShowAssign(true);
                              }}
                              title="Manage Machines/Agents"
                            >
                              <i className="ri-links-line" />
                            </Button>
                            <Button
                              variant="soft-primary"
                              size="sm"
                              onClick={() => {
                                setEditing(o);
                                setShowModal(true);
                              }}
                            >
                              <i className="ri-edit-line" />
                            </Button>
                            <Button
                              variant="soft-danger"
                              size="sm"
                              onClick={() => handleDelete(o)}
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

      <OrgModal
        show={showModal}
        onHide={() => setShowModal(false)}
        org={editing}
        token={token}
        onSaved={fetchOrgs}
      />
      <AssignModal
        show={showAssign}
        onHide={() => setShowAssign(false)}
        org={managing}
        token={token}
        onSaved={fetchOrgs}
      />
    </>
  );
}
