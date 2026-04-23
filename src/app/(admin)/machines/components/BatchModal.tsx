"use client";
import { machinesApi } from "@/lib/api";
import { useState } from "react";
import { Button, Form, Modal, Spinner } from "react-bootstrap";
import { toast } from "react-toastify";

interface Props {
  show: boolean;
  machineId: string;
  token: string;
  onHide: () => void;
  onSaved: () => void;
}

export default function BatchModal({
  show,
  machineId,
  token,
  onHide,
  onSaved,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    itemName: "",
    nozzleId: 1,
    quantity: 10,
    expiryDate: "",
  });

  const set = (field: string, value: unknown) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSave = async () => {
    if (!form.itemName.trim()) {
      toast.error("Item name is required");
      return;
    }
    if (!form.expiryDate) {
      toast.error("Expiry date is required");
      return;
    }
    setSaving(true);
    try {
      await machinesApi.addBatch(token, machineId, {
        itemName: form.itemName.trim(),
        nozzleId: form.nozzleId,
        quantity: form.quantity,
        expiryDate: form.expiryDate,
      });
      toast.success("Batch loaded");
      setForm({ itemName: "", nozzleId: 1, quantity: 10, expiryDate: "" });
      onSaved();
      onHide();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to load batch");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Load Batch</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>
              Item Name <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              value={form.itemName}
              onChange={(e) => set("itemName", e.target.value)}
              placeholder="e.g. Sandwich"
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Nozzle / Slot (1–8)</Form.Label>
            <Form.Control
              type="number"
              min={1}
              max={8}
              value={form.nozzleId}
              onChange={(e) => set("nozzleId", Number(e.target.value))}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Quantity</Form.Label>
            <Form.Control
              type="number"
              min={1}
              value={form.quantity}
              onChange={(e) => set("quantity", Number(e.target.value))}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>
              Expiry Date <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="datetime-local"
              value={form.expiryDate}
              onChange={(e) => set("expiryDate", e.target.value)}
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={saving}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? <Spinner size="sm" className="me-1" /> : null}
          Load Batch
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
