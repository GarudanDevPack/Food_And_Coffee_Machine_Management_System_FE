"use client";
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
  Nav,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";
import { toast } from "react-toastify";
import Swal from "sweetalert2";

interface User {
  _id: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  status?: string | { id: number };
  role?: { id: number; name?: string };
  createdAt?: string;
}

// Backend returns status as { id: 1 } (active) | { id: 2 } (inactive) | string
const statusName = (s?: string | { id: number }): string => {
  if (!s) return "active";
  if (typeof s === "string") return s;
  return { 1: "active", 2: "inactive" }[s.id] ?? "unknown";
};

const ROLES = [
  { id: 2, name: "Admin" },
  { id: 3, name: "Client" },
  { id: 4, name: "Agent" },
  { id: 5, name: "Customer" },
];

const ROLE_NAMES: Record<number, string> = {
  1: "Super Admin",
  2: "Admin",
  3: "Client",
  4: "Agent",
  5: "Customer",
};
const getRoleId = (r?: { id: number | string }) =>
  r?.id !== undefined ? Number(r.id) : undefined;
const roleName = (r?: { id: number | string; name?: string }) =>
  r?.name || ROLE_NAMES[Number(r?.id)] || (r?.id ? `Role ${r.id}` : "—");
const roleBg = (id?: number) =>
  ({ 1: "dark", 2: "danger", 3: "primary", 4: "info", 5: "success" })[
    id ?? 5
  ] ?? "secondary";
const statusBg = (s?: string) =>
  s === "active" ? "success" : s === "pending" ? "warning" : "secondary";

// UTC-based formatter — identical on server (Node.js) and client (browser)
const fmtDate = (d?: string) => {
  if (!d) return "—";
  const dt = new Date(d);
  return `${String(dt.getUTCDate()).padStart(2, "0")}/${String(dt.getUTCMonth() + 1).padStart(2, "0")}/${dt.getUTCFullYear()}`;
};

// ── User Modal ────────────────────────────────────────────────────────────────
const UserModal = ({ show, onHide, user, token, onSaved }: any) => {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    roleId: "5",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        email: user.email ?? "",
        phone: user.phone ?? "",
        password: "",
        roleId: String(user.role?.id ?? 5),
      });
    } else {
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        password: "",
        roleId: "5",
      });
    }
  }, [user, show]);

  const set = (f: string) => (e: any) =>
    setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.email.trim()) {
      toast.error("First name and email are required");
      return;
    }
    if (!user && !form.password.trim()) {
      toast.error("Password is required");
      return;
    }
    if (!user && form.password.trim().length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        firstName: form.firstName.trim(),
        email: form.email.trim(),
        role: { id: Number(form.roleId) },
      };
      if (form.lastName.trim()) payload.lastName = form.lastName.trim();
      if (form.phone.trim()) payload.phone = form.phone.trim();
      if (!user) payload.password = form.password;
      if (user) {
        await usersApi.update(token, user._id ?? user.id!, payload);
        toast.success("User updated");
      } else {
        await usersApi.create(token, payload);
        toast.success("User created");
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
        <Modal.Title>{user ? "Edit User" : "Create User"}</Modal.Title>
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
            <Form.Label>Phone</Form.Label>
            <Form.Control value={form.phone} onChange={set("phone")} />
          </Form.Group>
          {!user && (
            <Form.Group className="mb-3">
              <Form.Label>
                Password <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                type="password"
                value={form.password}
                onChange={set("password")}
                required={!user}
              />
            </Form.Group>
          )}
          <Form.Group className="mb-3">
            <Form.Label>
              Role <span className="text-danger">*</span>
            </Form.Label>
            <Form.Select value={form.roleId} onChange={set("roleId")}>
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={onHide}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? <Spinner size="sm" className="me-1" /> : null}{" "}
            {user ? "Save" : "Create"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
type TabType = "all" | "admin" | "client" | "agent" | "customer";

const TAB_ROLE_MAP: Record<TabType, number | null> = {
  all: null,
  admin: 2,
  client: 3,
  agent: 4,
  customer: 5,
};

export default function UsersPage() {
  const { data: session } = useSession();
  const token = (session?.user as any)?.token ?? "";

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabType>("all");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const fetchUsers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      setUsers((await usersApi.list(token)) as User[]);
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const handleDelete = async (u: User) => {
    const r = await Swal.fire({
      title: "Delete User?",
      text: `${u.firstName} ${u.lastName ?? ""} will be removed.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Delete",
    });
    if (!r.isConfirmed) return;
    try {
      await usersApi.delete(token, u._id ?? u.id!);
      toast.success("User deleted");
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    }
  };

  const tabRoleId = TAB_ROLE_MAP[tab];
  const displayed = tabRoleId
    ? users.filter((u) => getRoleId(u.role) === tabRoleId)
    : users;

  const countByRole = (id: number) =>
    users.filter((u) => getRoleId(u.role) === id).length;

  return (
    <>
      <PageTitle title="User Management" subTitle="Management" />

      <Row className="mb-3 align-items-center">
        <Col>
          <Badge bg="secondary" className="fs-13 fw-normal px-3 py-2">
            Total: {users.length}
          </Badge>
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
            + Create User
          </Button>
          <Button
            variant="light"
            size="sm"
            className="ms-2"
            onClick={fetchUsers}
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
                { key: "all", label: `All (${users.length})` },
                { key: "admin", label: `Admins (${countByRole(2)})` },
                { key: "client", label: `Clients (${countByRole(3)})` },
                { key: "agent", label: `Agents (${countByRole(4)})` },
                { key: "customer", label: `Customers (${countByRole(5)})` },
              ] as { key: TabType; label: string }[]
            ).map((t) => (
              <Nav.Item key={t.key}>
                <Nav.Link
                  active={tab === t.key}
                  onClick={() => setTab(t.key)}
                  style={{ cursor: "pointer" }}
                >
                  {t.label}
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
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-muted py-4">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    displayed.map((u) => (
                      <tr key={u._id ?? u.id}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <span className="avatar-sm avatar-title bg-primary-subtle text-primary rounded-circle fw-bold fs-14">
                              {(u.firstName ?? "U")[0].toUpperCase()}
                            </span>
                            <span className="fw-semibold">
                              {u.firstName} {u.lastName}
                            </span>
                          </div>
                        </td>
                        <td className="text-muted">{u.email ?? "—"}</td>
                        <td className="text-muted">{u.phone ?? "—"}</td>
                        <td>
                          <Badge
                            bg={roleBg(getRoleId(u.role))}
                            className="text-capitalize"
                          >
                            {roleName(u.role)}
                          </Badge>
                        </td>
                        <td>
                          <Badge
                            bg={statusBg(statusName(u.status))}
                            className="text-capitalize"
                          >
                            {statusName(u.status)}
                          </Badge>
                        </td>
                        <td className="text-muted fs-12">
                          {fmtDate(u.createdAt)}
                        </td>
                        <td className="text-center">
                          <div className="d-flex gap-1 justify-content-center">
                            <Button
                              variant="soft-primary"
                              size="sm"
                              onClick={() => {
                                setEditing(u);
                                setShowModal(true);
                              }}
                            >
                              <i className="ri-edit-line" />
                            </Button>
                            <Button
                              variant="soft-danger"
                              size="sm"
                              onClick={() => handleDelete(u)}
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

      <UserModal
        show={showModal}
        onHide={() => setShowModal(false)}
        user={editing}
        token={token}
        onSaved={fetchUsers}
      />
    </>
  );
}
