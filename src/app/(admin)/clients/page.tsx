"use client";
import { fmtDate } from "@/lib/fmt";
import PageTitle from "@/components/PageTitle";
import { usersApi } from "@/lib/api";
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

interface User {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  status?: string | { id: number | string };
  role?: { id: number | string; name?: string };
  createdAt?: string;
}

const statusName = (s?: string | { id: number | string }): string => {
  if (!s) return "active";
  if (typeof s === "string") return s;
  return (
    ({ 1: "active", 2: "inactive" } as Record<string, string>)[String(s.id)] ??
    "unknown"
  );
};

const statusBg = (s: string) =>
  s === "active" ? "success" : s === "inactive" ? "secondary" : "warning";

// ── Create Client Modal ────────────────────────────────────────────────────────
const CreateClientModal = ({
  show,
  onHide,
  token,
  onCreated,
}: {
  show: boolean;
  onHide: () => void;
  token: string;
  onCreated: () => void;
}) => {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (show) {
      setForm({ firstName: "", lastName: "", email: "", password: "", phone: "" });
    }
  }, [show]);

  const set = (f: string) => (e: any) =>
    setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await usersApi.create(token, {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
        role: { id: 3 },
      });
      toast.success("Client created successfully");
      onCreated();
      onHide();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create client");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title className="fs-15">Add Client</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Row>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label>
                  First Name <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  value={form.firstName}
                  onChange={set("firstName")}
                  required
                />
              </Form.Group>
            </Col>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label>Last Name</Form.Label>
                <Form.Control
                  value={form.lastName}
                  onChange={set("lastName")}
                />
              </Form.Group>
            </Col>
          </Row>
          <Form.Group className="mb-3">
            <Form.Label>
              Email <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="email"
              value={form.email}
              onChange={set("email")}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>
              Password <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="password"
              value={form.password}
              onChange={set("password")}
              minLength={6}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Phone</Form.Label>
            <Form.Control
              value={form.phone}
              onChange={set("phone")}
              placeholder="+94771234567"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onHide}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? <Spinner size="sm" className="me-1" /> : null}
            Create Client
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

// ── Edit Client Modal ──────────────────────────────────────────────────────────
const EditClientModal = ({
  show,
  onHide,
  client,
  token,
  onSaved,
}: {
  show: boolean;
  onHide: () => void;
  client: User | null;
  token: string;
  onSaved: () => void;
}) => {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    statusId: "1",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (show && client) {
      const sid = statusName(client.status);
      setForm({
        firstName: client.firstName ?? "",
        lastName: client.lastName ?? "",
        phone: client.phone ?? "",
        statusId: sid === "inactive" ? "2" : "1",
      });
    }
  }, [show, client]);

  const set = (f: string) => (e: any) =>
    setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;
    setSaving(true);
    try {
      await usersApi.update(token, (client._id ?? client.id)!, {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || undefined,
        status: { id: Number(form.statusId) },
      });
      toast.success("Client updated");
      onSaved();
      onHide();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update client");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title className="fs-15">Edit Client</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Row>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label>
                  First Name <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  value={form.firstName}
                  onChange={set("firstName")}
                  required
                />
              </Form.Group>
            </Col>
            <Col>
              <Form.Group className="mb-3">
                <Form.Label>Last Name</Form.Label>
                <Form.Control
                  value={form.lastName}
                  onChange={set("lastName")}
                />
              </Form.Group>
            </Col>
          </Row>
          <Form.Group className="mb-3">
            <Form.Label>Phone</Form.Label>
            <Form.Control
              value={form.phone}
              onChange={set("phone")}
              placeholder="+94771234567"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Status</Form.Label>
            <Form.Select value={form.statusId} onChange={set("statusId")}>
              <option value="1">Active</option>
              <option value="2">Inactive</option>
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onHide}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? <Spinner size="sm" className="me-1" /> : null}
            Save Changes
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ClientsPage() {
  const { data: session } = useSession();
  const token = (session?.user as any)?.token ?? "";

  const [clients, setClients] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [showEdit, setShowEdit] = useState(false);

  const fetchClients = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const all = (await usersApi.list(token)) as User[];
      setClients(all.filter((u) => Number(u.role?.id) === 3));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [token]);

  const handleDelete = async (user: User) => {
    const r = await Swal.fire({
      title: "Delete Client?",
      text: `"${user.firstName} ${user.lastName}" will be permanently removed.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Delete",
    });
    if (!r.isConfirmed) return;
    try {
      await usersApi.delete(token, (user._id ?? user.id)!);
      toast.success("Client deleted");
      fetchClients();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete");
    }
  };

  const openEdit = (client: User) => {
    setEditTarget(client);
    setShowEdit(true);
  };

  return (
    <>
      <PageTitle title="Client Management" subTitle="User Management" />

      <Row className="mb-3 align-items-center">
        <Col>
          <Badge bg="secondary" className="fs-13 fw-normal px-3 py-2">
            Total: {clients.length}
          </Badge>
        </Col>
        <Col xs="auto" className="d-flex gap-2">
          <Button
            variant="light"
            size="sm"
            onClick={fetchClients}
            disabled={loading}
          >
            {loading ? (
              <Spinner size="sm" />
            ) : (
              <i className="ri-refresh-line" />
            )}{" "}
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreate(true)}
          >
            <i className="ri-user-add-line me-1" />
            Add Client
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
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4">
                        No clients found
                      </td>
                    </tr>
                  ) : (
                    clients.map((client) => (
                      <tr key={client._id ?? client.id}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <span className="avatar-sm avatar-title bg-info-subtle text-info rounded-circle fw-bold fs-14">
                              {(client.firstName ?? "C")[0].toUpperCase()}
                            </span>
                            <span className="fw-semibold">
                              {client.firstName} {client.lastName}
                            </span>
                          </div>
                        </td>
                        <td className="text-muted">{client.email ?? "—"}</td>
                        <td className="text-muted">{client.phone ?? "—"}</td>
                        <td>
                          <Badge
                            bg={statusBg(statusName(client.status))}
                            className="text-capitalize"
                          >
                            {statusName(client.status)}
                          </Badge>
                        </td>
                        <td className="text-muted fs-12">
                          {client.createdAt ? fmtDate(client.createdAt) : "—"}
                        </td>
                        <td className="text-center">
                          <div className="d-flex gap-1 justify-content-center">
                            <Button
                              variant="soft-primary"
                              size="sm"
                              onClick={() => openEdit(client)}
                              title="Edit Client"
                            >
                              <i className="ri-edit-line" />
                            </Button>
                            <Button
                              variant="soft-danger"
                              size="sm"
                              onClick={() => handleDelete(client)}
                              title="Delete Client"
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

      <CreateClientModal
        show={showCreate}
        onHide={() => setShowCreate(false)}
        token={token}
        onCreated={fetchClients}
      />

      <EditClientModal
        show={showEdit}
        onHide={() => setShowEdit(false)}
        client={editTarget}
        token={token}
        onSaved={fetchClients}
      />
    </>
  );
}
