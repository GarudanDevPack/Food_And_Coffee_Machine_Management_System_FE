"use client";
import { fmtDate, fmtDateTime } from "@/lib/fmt";
import PageTitle from "@/components/PageTitle";
import { agentsApi, alertsApi, machinesApi } from "@/lib/api";
import { useApiToken } from "@/hooks/useApi";
import { useEffect, useState } from "react";
import IconifyIcon from "@/components/wrappers/IconifyIcon";
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

interface Machine {
  _id: string;
  machineId: string;
  name: string;
  location?: string;
  isOnline?: boolean;
  machineType?: string;
  sensor?: { temp?: number; water?: string; powderlevel?: number[] };
}

interface Alert {
  _id: string;
  machineId?: string;
  type?: string;
  message?: string;
  severity?: string;
  resolved?: boolean;
  createdAt?: string;
}

const CHECKLIST = [
  { id: "nozzles", label: "Nozzles cleaned and unclogged" },
  { id: "water", label: "Water tank checked / refilled" },
  { id: "powder", label: "Powder / coffee stock checked" },
  { id: "drip_tray", label: "Drip tray emptied and cleaned" },
  { id: "exterior", label: "Machine exterior wiped clean" },
  { id: "display", label: "Display / screen working" },
  { id: "payment", label: "Payment module tested" },
];

const severityBg = (s?: string) =>
  ({ critical: "danger", high: "warning", medium: "info", low: "secondary" })[
    s ?? ""
  ] ?? "secondary";

// ── Inspection Modal ──────────────────────────────────────────────────────────
const InspectionModal = ({
  show,
  onHide,
  machine,
  token,
  onDone,
}: {
  show: boolean;
  onHide: () => void;
  machine: Machine | null;
  token: string;
  onDone: () => void;
}) => {
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [issues, setIssues] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (show) {
      setChecks({});
      setIssues("");
      setSeverity("medium");
    }
  }, [show]);

  const toggle = (id: string) => setChecks((p) => ({ ...p, [id]: !p[id] }));
  const allPassed = CHECKLIST.every((c) => checks[c.id]);
  const failedItems = CHECKLIST.filter((c) => !checks[c.id]).map(
    (c) => c.label,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!machine) return;
    setSaving(true);
    try {
      const passed = allPassed && !issues.trim();
      const result = await agentsApi.fileInspection(token, {
        machineId: machine.machineId,
        passed,
        failedChecks: failedItems,
        notes: issues.trim(),
        severity,
      });
      if (result.alertCreated) {
        toast.warning(
          `Inspection filed — ${failedItems.length} issue(s) reported`,
        );
      } else {
        toast.success("Inspection passed — all checks clear!");
      }
      onDone();
      onHide();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to submit inspection");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title className="fs-15">
          <IconifyIcon
            icon="ri:clipboard-check-line"
            className="me-2 text-primary"
          />
          Inspection — {machine?.name}
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {machine?.sensor && (
            <div className="alert alert-light py-2 mb-3 fs-12">
              {machine.sensor.temp != null && (
                <span className="me-3">
                  <IconifyIcon icon="ri:temp-hot-line" className="me-1" />
                  {machine.sensor.temp}°C
                </span>
              )}
              {machine.sensor.water && (
                <span className="me-3 text-capitalize">
                  <IconifyIcon icon="ri:drop-line" className="me-1" />
                  Water: {machine.sensor.water}
                </span>
              )}
            </div>
          )}

          <div className="fw-semibold fs-13 mb-2">Checklist</div>
          {CHECKLIST.map((c) => (
            <Form.Check
              key={c.id}
              type="checkbox"
              id={`check-${c.id}`}
              label={c.label}
              checked={!!checks[c.id]}
              onChange={() => toggle(c.id)}
              className="mb-2"
            />
          ))}

          <Form.Group className="mt-3 mb-2">
            <Form.Label className="fw-semibold fs-13">
              Issues / Notes
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Describe any problems found..."
              value={issues}
              onChange={(e) => setIssues(e.target.value)}
            />
          </Form.Group>

          {(failedItems.length > 0 || issues.trim()) && (
            <Form.Group className="mb-2">
              <Form.Label className="fw-semibold fs-13">
                Alert Severity
              </Form.Label>
              <Form.Select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </Form.Select>
            </Form.Group>
          )}

          {allPassed && !issues.trim() && (
            <div className="alert alert-success py-2 fs-13 mt-2">
              <IconifyIcon icon="ri:checkbox-circle-line" className="me-1" />
              All checks passed — no alert will be created.
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" size="sm" onClick={onHide}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={allPassed && !issues.trim() ? "success" : "warning"}
            size="sm"
            disabled={saving}
          >
            {saving ? (
              <Spinner size="sm" className="me-1" />
            ) : (
              <IconifyIcon icon="ri:send-plane-line" className="me-1" />
            )}
            Submit Inspection
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AgentInspectionPage() {
  const token = useApiToken();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [inspecting, setInspecting] = useState<Machine | null>(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [m, a] = await Promise.all([
        machinesApi.myMachines(token) as Promise<Machine[]>,
        alertsApi.list(token, undefined, false) as Promise<Alert[]>,
      ]);
      setMachines(m);
      setAlerts(a.filter((al) => al.type === "maintenance_required"));
    } catch (err: any) {
      toast.error(err.message ?? "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) load();
  }, [token]);

  const pendingAlerts = alerts.filter((a) => !a.resolved);

  return (
    <>
      <PageTitle title="Machine Inspection" subTitle="Operations" />

      <Row className="mb-3 align-items-center">
        <Col>
          <div className="d-flex gap-2">
            <Badge bg="secondary" className="fs-13 fw-normal px-3 py-2">
              Machines: {machines.length}
            </Badge>
            {pendingAlerts.length > 0 && (
              <Badge
                bg="warning"
                text="dark"
                className="fs-13 fw-normal px-3 py-2"
              >
                Open Issues: {pendingAlerts.length}
              </Badge>
            )}
          </div>
        </Col>
        <Col xs="auto">
          <Button variant="light" size="sm" onClick={load} disabled={loading}>
            {loading ? (
              <Spinner size="sm" />
            ) : (
              <IconifyIcon icon="ri:refresh-line" />
            )}{" "}
            Refresh
          </Button>
        </Col>
      </Row>

      {/* My machines */}
      <Card className="mb-3">
        <div className="card-header">
          <h5 className="mb-0">My Machines</h5>
        </div>
        <CardBody className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner />
            </div>
          ) : machines.length === 0 ? (
            <div className="text-center text-muted py-4">
              No machines assigned
            </div>
          ) : (
            <div className="table-responsive">
              <Table className="table-custom table-centered table-sm table-nowrap table-hover mb-0">
                <thead>
                  <tr>
                    <th>Machine</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Water</th>
                    <th>Temp</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {machines.map((m) => (
                    <tr key={m._id}>
                      <td>
                        <div className="fw-semibold">{m.name}</div>
                        <code className="text-muted fs-11">{m.machineId}</code>
                      </td>
                      <td className="text-muted">{m.location ?? "—"}</td>
                      <td>
                        <span
                          className={`d-flex align-items-center gap-1 fs-13 ${m.isOnline ? "text-success" : "text-danger"}`}
                        >
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: m.isOnline ? "#0acf97" : "#fa5c7c",
                              display: "inline-block",
                            }}
                          />
                          {m.isOnline ? "Online" : "Offline"}
                        </span>
                      </td>
                      <td>
                        {m.sensor?.water ? (
                          <Badge
                            bg={
                              m.sensor.water === "full"
                                ? "success"
                                : m.sensor.water === "low"
                                  ? "warning"
                                  : "danger"
                            }
                            className="text-capitalize"
                          >
                            {m.sensor.water}
                          </Badge>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        {m.sensor?.temp != null ? (
                          <span
                            className={
                              m.sensor.temp > 70
                                ? "text-danger fw-bold"
                                : "text-muted"
                            }
                          >
                            {m.sensor.temp}°C
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="text-center">
                        <Button
                          variant="soft-primary"
                          size="sm"
                          onClick={() => setInspecting(m)}
                        >
                          <IconifyIcon
                            icon="ri:clipboard-check-line"
                            className="me-1"
                          />
                          Inspect
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Recent maintenance alerts */}
      {alerts.length > 0 && (
        <Card>
          <div className="card-header">
            <h5 className="mb-0">Maintenance Alerts History</h5>
          </div>
          <CardBody className="p-0">
            <div className="table-responsive">
              <Table className="table-custom table-centered table-sm table-nowrap mb-0">
                <thead>
                  <tr>
                    <th>Machine</th>
                    <th>Message</th>
                    <th>Severity</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.slice(0, 20).map((a) => (
                    <tr key={a._id}>
                      <td className="text-muted fs-12">{a.machineId ?? "—"}</td>
                      <td style={{ maxWidth: 280, whiteSpace: "normal" }}>
                        {a.message ?? "—"}
                      </td>
                      <td>
                        <Badge
                          bg={severityBg(a.severity)}
                          className="text-capitalize"
                        >
                          {a.severity ?? "—"}
                        </Badge>
                      </td>
                      <td className="text-muted fs-12">
                        {a.createdAt ? fmtDateTime(a.createdAt) : "—"}
                      </td>
                      <td>
                        <Badge bg={a.resolved ? "success" : "secondary"}>
                          {a.resolved ? "Resolved" : "Open"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </CardBody>
        </Card>
      )}

      <InspectionModal
        show={!!inspecting}
        onHide={() => setInspecting(null)}
        machine={inspecting}
        token={token ?? ""}
        onDone={load}
      />
    </>
  );
}
