"use client";
import { fmtDate, fmtDateTime } from "@/lib/fmt";
import PageTitle from "@/components/PageTitle";
import { dashboardApi, ordersApi } from "@/lib/api";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  Col,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";
import ReactApexChart from "@/components/ApexChart";
import type { ApexOptions } from "apexcharts";
import { toast } from "react-toastify";

interface Order {
  _id?: string;
  id?: string;
  orderId?: string;
  userId?: string;
  machineId?: string;
  itemName?: string;
  totalAmount?: number;
  originalAmount?: number;
  discountApplied?: number;
  status?: string;
  createdAt?: string;
}
interface RevenuePoint {
  machineId: string;
  name?: string;
  totalRevenue: number;
  totalOrders: number;
}

const statusBg = (s?: string) =>
  ({
    completed: "success",
    pending: "warning",
    dispensing: "info",
    failed: "danger",
    cancelled: "secondary",
  })[s ?? ""] ?? "secondary";

export default function SalesPage() {
  const { data: session } = useSession();
  const token = (session?.user as any)?.token ?? "";

  const [orders, setOrders] = useState<Order[]>([]);
  const [revenueByMachine, setRevenueByMachine] = useState<RevenuePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      ordersApi.list(token, {}).catch(() => []),
      dashboardApi.getRevenueByMachine(token).catch(() => []),
    ])
      .then(([o, r]) => {
        setOrders(o as Order[]);
        setRevenueByMachine(r as RevenuePoint[]);
      })
      .catch(() => toast.error("Failed to load sales data"))
      .finally(() => setLoading(false));
  }, [token]);

  const totalRevenue = orders
    .filter((o) => o.status === "completed")
    .reduce((s, o) => s + (o.totalAmount ?? 0), 0);
  const totalOrders = orders.length;
  const completedOrders = orders.filter((o) => o.status === "completed").length;
  const avgOrderValue =
    completedOrders > 0 ? Math.round(totalRevenue / completedOrders) : 0;

  const chartOptions: ApexOptions = {
    chart: { type: "bar", toolbar: { show: false } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: revenueByMachine
        .slice(0, 10)
        .map((r) => r.name || r.machineId),
      labels: { style: { fontSize: "11px" }, rotate: -20 },
    },
    colors: ["#0acf97"],
    plotOptions: { bar: { borderRadius: 4, columnWidth: "55%" } },
    tooltip: { y: { formatter: (v) => `LKR ${v.toLocaleString()}` } },
  };
  const chartSeries = [
    {
      name: "Revenue",
      data: revenueByMachine
        .slice(0, 10)
        .map((r) => Math.round(r.totalRevenue)),
    },
  ];

  return (
    <>
      <PageTitle title="Sales Reports" subTitle="Finance" />

      {/* KPI Cards */}
      <Row className="mb-3 row-cols-md-4 row-cols-2">
        {[
          {
            label: "Total Revenue",
            value: `LKR ${totalRevenue.toLocaleString()}`,
            icon: "solar:wallet-bold-duotone",
            bg: "bg-success-subtle",
            text: "text-success",
          },
          {
            label: "Total Orders",
            value: totalOrders,
            icon: "solar:cart-bold-duotone",
            bg: "bg-info-subtle",
            text: "text-info",
          },
          {
            label: "Completed Orders",
            value: completedOrders,
            icon: "solar:check-circle-bold-duotone",
            bg: "bg-primary-subtle",
            text: "text-primary",
          },
          {
            label: "Avg Order Value",
            value: `LKR ${avgOrderValue.toLocaleString()}`,
            icon: "solar:graph-up-bold-duotone",
            bg: "bg-warning-subtle",
            text: "text-warning",
          },
        ].map((s) => (
          <Col key={s.label}>
            <Card>
              <CardBody>
                <div className="d-flex align-items-center gap-2">
                  <div className={`avatar-md flex-shrink-0`}>
                    <span
                      className={`avatar-title ${s.bg} ${s.text} rounded fs-24`}
                    >
                      <i className={s.icon} />
                    </span>
                  </div>
                  <div>
                    <p className="text-muted mb-0 fs-12 fw-semibold text-uppercase">
                      {s.label}
                    </p>
                    <h4 className="mb-0 fw-bold">
                      {loading ? <Spinner size="sm" /> : s.value}
                    </h4>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Revenue Chart */}
      <Card className="mb-3">
        <div className="card-header">
          <h5 className="mb-0">Revenue by Machine</h5>
        </div>
        <CardBody>
          {loading ? (
            <div className="text-center py-4">
              <Spinner />
            </div>
          ) : revenueByMachine.length > 0 ? (
            <ReactApexChart
              options={chartOptions}
              series={chartSeries}
              height={280}
              type="bar"
            />
          ) : (
            <div className="text-center text-muted py-4">No revenue data</div>
          )}
        </CardBody>
      </Card>

      {/* Orders Table */}
      <Card>
        <div className="card-header d-flex align-items-center">
          <h5 className="mb-0 me-auto">All Orders</h5>
          <span className="text-muted fs-13">{totalOrders} orders total</span>
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
                    <th>Order ID</th>
                    <th>Item</th>
                    <th>Machine</th>
                    <th className="text-end">Amount</th>
                    <th className="text-center">Discount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-muted py-4">
                        No orders
                      </td>
                    </tr>
                  ) : (
                    orders.map((o) => (
                      <tr key={o._id ?? o.id}>
                        <td>
                          <code className="fs-12">
                            {o.orderId ?? (o._id ?? o.id ?? "").slice(-8)}
                          </code>
                        </td>
                        <td>{o.itemName ?? "—"}</td>
                        <td className="text-muted fs-12">
                          {o.machineId ?? "—"}
                        </td>
                        <td className="text-end fw-semibold">
                          LKR {(o.totalAmount ?? 0).toLocaleString()}
                        </td>
                        <td className="text-center">
                          {o.discountApplied ? (
                            <Badge bg="info">{o.discountApplied}% off</Badge>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>
                          <Badge
                            bg={statusBg(o.status)}
                            className="text-capitalize"
                          >
                            {o.status ?? "—"}
                          </Badge>
                        </td>
                        <td className="text-muted fs-12">
                          {o.createdAt ? fmtDateTime(o.createdAt) : "—"}
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
