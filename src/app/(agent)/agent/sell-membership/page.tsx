"use client";
import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  Col,
  Form,
  Row,
  Spinner,
} from "react-bootstrap";
import { toast } from "react-toastify";
import PageTitle from "@/components/PageTitle";
import { membershipsApi } from "@/lib/api";
import { useApiToken } from "@/hooks/useApi";

type Plan = {
  key: "1month" | "3month" | "5month";
  label: string;
  price: number;
  discount: number;
  duration: string;
};

const PLANS: Plan[] = [
  {
    key: "1month",
    label: "1 Month",
    price: 500,
    discount: 15,
    duration: "30 days",
  },
  {
    key: "3month",
    label: "3 Months",
    price: 1300,
    discount: 20,
    duration: "90 days",
  },
  {
    key: "5month",
    label: "5 Months",
    price: 2000,
    discount: 25,
    duration: "150 days",
  },
];

const AgentSellMembershipPage = () => {
  const token = useApiToken();
  const [targetUserId, setTargetUserId] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{
    plan: string;
    endDate: string;
    discount: number;
  } | null>(null);

  const handleSubscribe = async () => {
    if (!token) return;
    if (!targetUserId.trim()) return toast.error("Customer ID is required");
    if (!selectedPlan) return toast.error("Select a plan");

    setLoading(true);
    setSuccess(null);
    try {
      const res = (await membershipsApi.subscribe(token, {
        plan: selectedPlan.key,
        targetUserId: targetUserId.trim(),
      })) as any;

      setSuccess({
        plan: selectedPlan.label,
        endDate: res.endDate ? new Date(res.endDate).toLocaleDateString() : "—",
        discount: selectedPlan.discount,
      });
      toast.success("Membership sold successfully");
      setTargetUserId("");
      setSelectedPlan(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to subscribe");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageTitle
        title="Sell Membership"
        subTitle="Subscribe a customer to a membership plan"
      />

      <Row className="justify-content-center">
        <Col xs={12} md={8}>
          <Card className="mb-4">
            <CardBody>
              <Form.Group>
                <Form.Label>Customer ID</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="CUS-YYYYMMDD-HHMMSS or user MongoDB ID"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                />
              </Form.Group>
            </CardBody>
          </Card>

          <Row className="g-3 mb-4">
            {PLANS.map((plan) => (
              <Col key={plan.key} xs={12} sm={4}>
                <Card
                  className={`h-100 cursor-pointer border-2 ${selectedPlan?.key === plan.key ? "border-primary" : "border-light"}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedPlan(plan)}
                >
                  <CardBody className="text-center">
                    <h5 className="fw-bold">{plan.label}</h5>
                    <p className="text-muted small mb-2">{plan.duration}</p>
                    <div className="fs-4 fw-bold text-primary mb-2">
                      LKR {plan.price}
                    </div>
                    <Badge bg="success" className="fs-6">
                      {plan.discount}% off orders
                    </Badge>
                    {selectedPlan?.key === plan.key && (
                      <div className="mt-2 text-primary small fw-semibold">
                        ✓ Selected
                      </div>
                    )}
                  </CardBody>
                </Card>
              </Col>
            ))}
          </Row>

          {selectedPlan && (
            <Card className="mb-3 bg-light border-0">
              <CardBody>
                <p className="mb-1">
                  <strong>Plan:</strong> {selectedPlan.label}
                </p>
                <p className="mb-1">
                  <strong>Price:</strong> LKR {selectedPlan.price} (deducted
                  from customer wallet)
                </p>
                <p className="mb-0">
                  <strong>Discount:</strong> {selectedPlan.discount}% off all
                  orders for {selectedPlan.duration}
                </p>
              </CardBody>
            </Card>
          )}

          <Button
            variant="primary"
            size="lg"
            className="w-100"
            onClick={handleSubscribe}
            disabled={loading || !selectedPlan || !targetUserId.trim()}
          >
            {loading ? (
              <Spinner size="sm" animation="border" className="me-2" />
            ) : null}
            {loading ? "Processing…" : "Confirm & Sell Membership"}
          </Button>

          {success && (
            <div className="mt-4 p-3 bg-success bg-opacity-10 rounded border border-success">
              <p className="mb-1 fw-semibold text-success">
                ✓ Membership activated
              </p>
              <p className="mb-1 text-muted">Plan: {success.plan}</p>
              <p className="mb-1 text-muted">Expires: {success.endDate}</p>
              <p className="mb-0 fw-bold">
                {success.discount}% discount applied on all future orders
              </p>
            </div>
          )}
        </Col>
      </Row>
    </>
  );
};

export default AgentSellMembershipPage;
