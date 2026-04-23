"use client";
import { machinesApi } from "@/lib/api";
import { useEffect, useState } from "react";
import { Button, Form, Modal, Spinner } from "react-bootstrap";
import { toast } from "react-toastify";

interface Machine {
  _id?: string;
  machineId?: string;
  name?: string;
  location?: string;
  machineType?: "coffee" | "food";
  clientId?: string;
  agentId?: string;
  status?: string;
  timerOfWater?: number;
  timerOfPowder?: number;
}

interface Props {
  show: boolean;
  machine: Machine | null;
  token: string;
  onHide: () => void;
  onSaved: () => void;
}

export default function MachineModal({
  show,
  machine,
  token,
  onHide,
  onSaved,
}: Props) {
  const isEdit = !!machine?._id;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    machineId: "",
    name: "",
    location: "",
    machineType: "coffee" as "coffee" | "food",
    clientId: "",
    agentId: "",
    status: "active",
    timerOfWater: 5000,
    timerOfPowder: 3000,
  });

  useEffect(() => {
    if (machine) {
      setForm({
        machineId: machine.machineId ?? "",
        name: machine.name ?? "",
        location: machine.location ?? "",
        machineType: machine.machineType ?? "coffee",
        clientId: machine.clientId ?? "",
        agentId: machine.agentId ?? "",
        status: machine.status ?? "active",
        timerOfWater: machine.timerOfWater ?? 5000,
        timerOfPowder: machine.timerOfPowder ?? 3000,
      });
    } else {
      setForm({
        machineId: "",
        name: "",
        location: "",
        machineType: "coffee",
        clientId: "",
        agentId: "",
        status: "active",
        timerOfWater: 5000,
        timerOfPowder: 3000,
      });
    }
  }, [machine, show]);

  const set = (field: string, value: unknown) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        location: form.location.trim() || undefined,
        machineType: form.machineType,
        status: form.status,
      };
      if (!isEdit && form.machineId.trim())
        payload.machineId = form.machineId.trim();
      if (form.clientId.trim()) payload.clientId = form.clientId.trim();
      if (form.agentId.trim()) payload.agentId = form.agentId.trim();
      if (form.machineType === "coffee") {
        payload.timerOfWater = form.timerOfWater;
        payload.timerOfPowder = form.timerOfPowder;
      }

      if (isEdit) {
        await machinesApi.update(token, machine!._id!, payload);
        toast.success("Machine updated");
      } else {
        await machinesApi.create(token, payload);
        toast.success("Machine created");
      }
      onSaved();
      onHide();
    } catch (err: any) {
      toast.error(err.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{isEdit ? "Edit Machine" : "Add Machine"}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          {!isEdit && (
            <Form.Group className="mb-3">
              <Form.Label>
                Machine ID{" "}
                <span className="text-muted fs-12">
                  (optional — must match firmware ID exactly)
                </span>
              </Form.Label>
              <Form.Control
                value={form.machineId}
                onChange={(e) => set("machineId", e.target.value)}
                placeholder="e.g. MCH-001 or cm_lz4abc12_x7r9kp2q (auto-generated if blank)"
              />
              <Form.Text className="text-muted">
                This is the ID the physical machine uses for MQTT topics.
              </Form.Text>
            </Form.Group>
          )}
          {isEdit && (
            <Form.Group className="mb-3">
              <Form.Label>Machine ID</Form.Label>
              <Form.Control
                value={form.machineId}
                disabled
                className="bg-light"
              />
              <Form.Text className="text-muted">
                Machine ID cannot be changed after creation.
              </Form.Text>
            </Form.Group>
          )}
          <Form.Group className="mb-3">
            <Form.Label>
              Name <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Coffee Station Alpha"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Location</Form.Label>
            <Form.Control
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="e.g. Ground Floor Lobby"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Machine Type</Form.Label>
            <Form.Select
              value={form.machineType}
              onChange={(e) => set("machineType", e.target.value)}
            >
              <option value="coffee">Coffee</option>
              <option value="food">Food</option>
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Status</Form.Label>
            <Form.Select
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Client ID</Form.Label>
            <Form.Control
              value={form.clientId}
              onChange={(e) => set("clientId", e.target.value)}
              placeholder="Optional"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Agent ID</Form.Label>
            <Form.Control
              value={form.agentId}
              onChange={(e) => set("agentId", e.target.value)}
              placeholder="Optional"
            />
          </Form.Group>
          {form.machineType === "coffee" && (
            <>
              <Form.Group className="mb-3">
                <Form.Label>Water Timer (ms)</Form.Label>
                <Form.Control
                  type="number"
                  value={form.timerOfWater}
                  onChange={(e) => set("timerOfWater", Number(e.target.value))}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Powder Timer (ms)</Form.Label>
                <Form.Control
                  type="number"
                  value={form.timerOfPowder}
                  onChange={(e) => set("timerOfPowder", Number(e.target.value))}
                />
              </Form.Group>
            </>
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={saving}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? <Spinner size="sm" className="me-1" /> : null}
          {isEdit ? "Save Changes" : "Create Machine"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
