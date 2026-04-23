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
  Nav,
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

// Backend returns status as { id: 1 } (active) | { id: 2 } (inactive) | string
const statusName = (s?: string | { id: number | string }): string => {
  if (!s) return "active";
  if (typeof s === "string") return s;
  return (
    ({ 1: "active", 2: "inactive" } as Record<string, string>)[String(s.id)] ??
    "unknown"
  );
};

const statusBg = (s: string) =>
  s === "active" ? "success" : s === "pending" ? "warning" : "secondary";

// ── Edit Agent Modal ──────────────────────────────────────────────────────────
const EditAgentModal = ({
  show,
  onHide,
  agent,
  token,
  onSaved,
}: {
  show: boolean;
  onHide: () => void;
  agent: User | null;
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
    if (show && agent) {
      const sid = statusName(agent.status);
      setForm({
        firstName: agent.firstName ?? "",
        lastName: agent.lastName ?? "",
        phone: agent.phone ?? "",
        statusId: sid === "inactive" ? "2" : "1",
      });
    }
  }, [show, agent]);

  const set = (f: string) => (e: any) =>
    setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agent) return;
    setSaving(true);
    try {
      await usersApi.update(token, (agent._id ?? agent.id)!, {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone || undefined,
        status: { id: Number(form.statusId) },
      });
      toast.success("Agent updated");
      onSaved();
      onHide();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update agent");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title className="fs-15">Edit Agent</Modal.Title>
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
export default function AgentsPage() {
  const { data: session } = useSession();
  const token = (session?.user as any)?.token ?? "";

  const [agents, setAgents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [tab, setTab] = useState<"all" | "pending">("all");
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [showEdit, setShowEdit] = useState(false);

  const fetchAgents = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const all = (await usersApi.list(token)) as User[];
      setAgents(all.filter((u) => Number(u.role?.id) === 4));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to load agents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [token]);

  const handleApprove = async (user: User) => {
    setApprovingId(user._id ?? user.id ?? null);
    try {
      await usersApi.approveAgent(token, (user._id ?? user.id)!);
      toast.success(`${user.firstName} approved as agent`);
      fetchAgents();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to approve");
    } finally {
      setApprovingId(null);
    }
  };

  const handleDelete = async (user: User) => {
    const r = await Swal.fire({
      title: "Delete Agent?",
      text: `"${user.firstName} ${user.lastName}" will be permanently removed.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Delete",
    });
    if (!r.isConfirmed) return;
    try {
      await usersApi.delete(token, (user._id ?? user.id)!);
      toast.success("Agent deleted");
      fetchAgents();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete");
    }
  };

  const openEdit = (agent: User) => {
    setEditTarget(agent);
    setShowEdit(true);
  };

  const pendingCount = agents.filter(
    (a) => statusName(a.status) === "pending",
  ).length;
  const displayed =
    tab === "pending"
      ? agents.filter((a) => statusName(a.status) === "pending")
      : agents;

  return (
    <>
      <PageTitle title="Agent Management" subTitle="User Management" />

      <Row className="mb-3 align-items-center">
        <Col>
          <div className="d-flex gap-2 align-items-center">
            <Badge bg="secondary" className="fs-13 fw-normal px-3 py-2">
              Total: {agents.length}
            </Badge>
            {pendingCount > 0 && (
              <Badge
                bg="warning"
                text="dark"
                className="fs-13 fw-normal px-3 py-2"
              >
                Pending Approval: {pendingCount}
              </Badge>
            )}
          </div>
        </Col>
        <Col xs="auto">
          <Button
            variant="light"
            size="sm"
            onClick={fetchAgents}
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
            <Nav.Item>
              <Nav.Link
                active={tab === "all"}
                onClick={() => setTab("all")}
                style={{ cursor: "pointer" }}
              >
                All Agents ({agents.length})
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link
                active={tab === "pending"}
                onClick={() => setTab("pending")}
                style={{ cursor: "pointer" }}
              >
                Pending Approval{" "}
                {pendingCount > 0 && (
                  <Badge bg="warning" text="dark" className="ms-1">
                    {pendingCount}
                  </Badge>
                )}
              </Nav.Link>
            </Nav.Item>
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
                    <th>Status</th>
                    <th>Joined</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4">
                        {tab === "pending"
                          ? "No pending approvals"
                          : "No agents found"}
                      </td>
                    </tr>
                  ) : (
                    displayed.map((agent) => (
                      <tr key={agent._id ?? agent.id}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <span className="avatar-sm avatar-title bg-primary-subtle text-primary rounded-circle fw-bold fs-14">
                              {(agent.firstName ?? "A")[0].toUpperCase()}
                            </span>
                            <span className="fw-semibold">
                              {agent.firstName} {agent.lastName}
                            </span>
                          </div>
                        </td>
                        <td className="text-muted">{agent.email ?? "—"}</td>
                        <td className="text-muted">{agent.phone ?? "—"}</td>
                        <td>
                          <Badge
                            bg={statusBg(statusName(agent.status))}
                            className="text-capitalize"
                          >
                            {statusName(agent.status)}
                          </Badge>
                        </td>
                        <td className="text-muted fs-12">
                          {agent.createdAt ? fmtDate(agent.createdAt) : "—"}
                        </td>
                        <td className="text-center">
                          <div className="d-flex gap-1 justify-content-center">
                            {statusName(agent.status) === "pending" && (
                              <Button
                                variant="soft-success"
                                size="sm"
                                onClick={() => handleApprove(agent)}
                                disabled={
                                  approvingId === (agent._id ?? agent.id)
                                }
                                title="Approve Agent"
                              >
                                {approvingId === (agent._id ?? agent.id) ? (
                                  <Spinner size="sm" />
                                ) : (
                                  <i className="ri-checkbox-circle-line" />
                                )}
                              </Button>
                            )}
                            <Button
                              variant="soft-primary"
                              size="sm"
                              onClick={() => openEdit(agent)}
                              title="Edit Agent"
                            >
                              <i className="ri-edit-line" />
                            </Button>
                            <Button
                              variant="soft-danger"
                              size="sm"
                              onClick={() => handleDelete(agent)}
                              title="Delete Agent"
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

      <EditAgentModal
        show={showEdit}
        onHide={() => setShowEdit(false)}
        agent={editTarget}
        token={token}
        onSaved={fetchAgents}
      />
    </>
  );
}
