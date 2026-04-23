"use client";
import { fmtDate } from "@/lib/fmt";
import PageTitle from "@/components/PageTitle";
import { membershipsApi } from "@/lib/api";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  Col,
  Nav,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";
import { toast } from "react-toastify";
import Swal from "sweetalert2";

interface Membership {
  _id?: string;
  id?: string;
  userId?:
    | string
    | { _id?: string; firstName?: string; lastName?: string; email?: string };
  plan?: string;
  discount?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  pricePaid?: number;
  createdAt?: string;
}

const PLAN_LABEL: Record<string, string> = {
  "1month": "1 Month — 15% off",
  "3month": "3 Months — 20% off",
  "5month": "5 Months — 25% off",
};

const statusBg = (s?: string) => {
  switch (s) {
    case "active":
      return "success";
    case "expired":
      return "danger";
    case "cancelled":
      return "secondary";
    default:
      return "secondary";
  }
};

const getUserLabel = (u: any) => {
  if (!u) return "—";
  if (typeof u === "string") return u.slice(-8);
  return (
    `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() ||
    u.email ||
    (u._id ?? u.id)?.slice(-8) ||
    "—"
  );
};

export default function MembershipsPage() {
  const { data: session } = useSession();
  const token = (session?.user as any)?.token ?? "";

  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>("all");

  const fetchMemberships = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await membershipsApi.list(token);
      setMemberships(data as Membership[]);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to load memberships");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemberships();
  }, [token]);

  const handleCancel = async (m: Membership) => {
    const r = await Swal.fire({
      title: "Cancel Membership?",
      text: `Cancel ${m.plan} plan for ${getUserLabel(m.userId)}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Cancel Membership",
    });
    if (!r.isConfirmed) return;
    try {
      await membershipsApi.cancel(token, m._id ?? m.id);
      toast.success("Membership cancelled");
      fetchMemberships();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to cancel");
    }
  };

  const filtered =
    tab === "all" ? memberships : memberships.filter((m) => m.status === tab);

  const activeCount = memberships.filter((m) => m.status === "active").length;
  const totalRevenue = memberships.reduce((s, m) => s + (m.pricePaid ?? 0), 0);

  const isExpired = (endDate?: string) =>
    endDate && new Date(endDate) < new Date();

  return (
    <>
      <PageTitle title="Membership Management" subTitle="Finance" />

      {/* KPI Cards */}
      <Row className="mb-3">
        {[
          { label: "Total", value: memberships.length, bg: "secondary" },
          { label: "Active", value: activeCount, bg: "success" },
          {
            label: "Expired",
            value: memberships.filter((m) => m.status === "expired").length,
            bg: "danger",
          },
          {
            label: "Revenue",
            value: `LKR ${totalRevenue.toLocaleString()}`,
            bg: "info",
          },
        ].map((k) => (
          <Col xs={6} md={3} key={k.label} className="mb-2">
            <Badge
              bg={k.bg}
              className="w-100 fs-13 fw-normal px-3 py-2 text-start"
            >
              {k.label}: <strong>{k.value}</strong>
            </Badge>
          </Col>
        ))}
      </Row>

      <Card>
        <div className="card-header border-bottom d-flex justify-content-between align-items-center">
          <Nav variant="tabs" className="card-header-tabs">
            {["all", "active", "expired", "cancelled"].map((s) => (
              <Nav.Item key={s}>
                <Nav.Link
                  active={tab === s}
                  onClick={() => setTab(s)}
                  style={{ cursor: "pointer", textTransform: "capitalize" }}
                >
                  {s === "all" ? `All (${memberships.length})` : s}
                  {s === "active" && activeCount > 0 && (
                    <Badge bg="success" className="ms-1">
                      {activeCount}
                    </Badge>
                  )}
                </Nav.Link>
              </Nav.Item>
            ))}
          </Nav>
          <Button
            variant="light"
            size="sm"
            onClick={fetchMemberships}
            disabled={loading}
          >
            {loading ? (
              <Spinner size="sm" />
            ) : (
              <i className="ri-refresh-line" />
            )}{" "}
            Refresh
          </Button>
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
                    <th>User</th>
                    <th>Plan</th>
                    <th className="text-center">Discount</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th className="text-end">Price Paid</th>
                    <th>Status</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-muted py-4">
                        No memberships found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((m, i) => (
                      <tr key={m._id ?? m.id ?? i}>
                        <td className="fw-semibold">
                          {getUserLabel(m.userId)}
                        </td>
                        <td>
                          <Badge bg="primary" className="fw-normal">
                            {PLAN_LABEL[m.plan ?? ""] ?? m.plan ?? "—"}
                          </Badge>
                        </td>
                        <td className="text-center">
                          <Badge bg="warning" text="dark">
                            {m.discount ?? 0}%
                          </Badge>
                        </td>
                        <td className="text-muted fs-12">
                          {m.startDate ? fmtDate(m.startDate) : "—"}
                        </td>
                        <td
                          className={`fs-12 ${isExpired(m.endDate) ? "text-danger fw-semibold" : "text-muted"}`}
                        >
                          {m.endDate ? fmtDate(m.endDate) : "—"}
                          {isExpired(m.endDate) && (
                            <i className="ri-alarm-warning-line ms-1" />
                          )}
                        </td>
                        <td className="text-end fw-semibold">
                          LKR {(m.pricePaid ?? 0).toLocaleString()}
                        </td>
                        <td>
                          <Badge
                            bg={statusBg(m.status)}
                            className="text-capitalize"
                          >
                            {m.status ?? "—"}
                          </Badge>
                        </td>
                        <td className="text-center">
                          {m.status === "active" ? (
                            <Button
                              variant="soft-danger"
                              size="sm"
                              onClick={() => handleCancel(m)}
                              title="Cancel Membership"
                            >
                              <i className="ri-close-circle-line me-1" />
                              Cancel
                            </Button>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
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
    </>
  );
}
