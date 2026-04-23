"use client";
import IconifyIcon from "@/components/wrappers/IconifyIcon";
import { dashboardApi } from "@/lib/api";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Card, CardBody, Col, Row, Spinner } from "react-bootstrap";
import { toast } from "react-toastify";

interface Summary {
  totalRevenue?: number;
  activeMachines?: number;
  totalMachines?: number;
  totalCustomers?: number;
  totalOrders?: number;
  completedOrders?: number;
  ordersToday?: number;
  unresolvedAlerts?: number;
}

const StatCard = ({
  title,
  value,
  icon,
  bgClass,
  textClass,
  sub,
}: {
  title: string;
  value: string | number;
  icon: string;
  bgClass: string;
  textClass: string;
  sub?: string;
}) => (
  <Col>
    <Card>
      <CardBody>
        <div className="d-flex align-items-start gap-2 justify-content-between">
          <div>
            <h5 className="text-muted fs-13 fw-bold text-uppercase">{title}</h5>
            <h3 className="mt-2 mb-1 fw-bold">{value}</h3>
            {sub && <p className="mb-0 text-muted fs-13">{sub}</p>}
          </div>
          <div className="avatar-lg flex-shrink-0">
            <span
              className={`avatar-title ${bgClass} ${textClass} rounded fs-28`}
            >
              <IconifyIcon icon={icon} />
            </span>
          </div>
        </div>
      </CardBody>
    </Card>
  </Col>
);

const Stat = () => {
  const { data: session } = useSession();
  const token = (session?.user as any)?.token ?? "";
  const [summary, setSummary] = useState<Summary>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    dashboardApi
      .getSummary(token)
      .then((data) => setSummary(data as Summary))
      .catch((err: any) =>
        toast.error(err?.message ?? "Failed to load dashboard stats"),
      )
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <Row className="row-cols-xxl-4 row-cols-md-2 row-cols-1">
        {[1, 2, 3, 4].map((i) => (
          <Col key={i}>
            <Card>
              <CardBody className="text-center py-4">
                <Spinner size="sm" />
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>
    );
  }

  return (
    <Row className="row-cols-xxl-4 row-cols-md-2 row-cols-1">
      <StatCard
        title="Total Revenue"
        value={`LKR ${(summary.totalRevenue ?? 0).toLocaleString()}`}
        icon="solar:wallet-bold-duotone"
        bgClass="bg-success-subtle"
        textClass="text-success"
        sub="All time revenue"
      />
      <StatCard
        title="Active Machines"
        value={`${summary.activeMachines ?? 0} / ${summary.totalMachines ?? 0}`}
        icon="solar:cpu-bold-duotone"
        bgClass="bg-info-subtle"
        textClass="text-info"
        sub="Online / Total"
      />
      <StatCard
        title="Total Customers"
        value={(summary.totalCustomers ?? 0).toLocaleString()}
        icon="solar:users-group-two-rounded-bold-duotone"
        bgClass="bg-warning-subtle"
        textClass="text-warning"
        sub="Registered customers"
      />
      <StatCard
        title="Orders Today"
        value={summary.ordersToday ?? 0}
        icon="solar:cart-bold-duotone"
        bgClass="bg-primary-subtle"
        textClass="text-primary"
        sub={`${summary.totalOrders ?? 0} total orders`}
      />
    </Row>
  );
};

export default Stat;
