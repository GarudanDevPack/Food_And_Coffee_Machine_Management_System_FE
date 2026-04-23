"use client";
import { dashboardApi } from "@/lib/api";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Card, CardBody, Col, Row, Spinner } from "react-bootstrap";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

// Backend shapes
interface RawOrderPoint {
  _id: { year: number; month: number; day: number };
  count: number;
  revenue: number;
}
interface RawMachinePerf {
  machineId: string;
  name?: string;
  orderCount: number;
  revenue: number;
}

// Normalised shapes used by charts
interface OrderPoint {
  date: string;
  count: number;
  revenue: number;
}
interface MachinePerf {
  machineId: string;
  name?: string;
  totalOrders: number;
  totalRevenue: number;
}

const normaliseOrders = (raw: RawOrderPoint[]): OrderPoint[] =>
  raw.map((r) => ({
    date: `${r._id.day}/${r._id.month}`,
    count: r.count,
    revenue: r.revenue,
  }));

const normaliseMachines = (raw: RawMachinePerf[]): MachinePerf[] =>
  raw.map((r) => ({
    machineId: r.machineId,
    name: r.name,
    totalOrders: r.orderCount ?? 0,
    totalRevenue: r.revenue ?? 0,
  }));

const Statistics = () => {
  const { data: session } = useSession();
  const token = (session?.user as any)?.token ?? "";

  const [ordersData, setOrdersData] = useState<OrderPoint[]>([]);
  const [machineData, setMachineData] = useState<MachinePerf[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      dashboardApi.getOrdersOverTime(token, 30).catch(() => []),
      dashboardApi.getMachinePerformance(token).catch(() => []),
    ])
      .then(([orders, machines]) => {
        setOrdersData(normaliseOrders(orders as RawOrderPoint[]));
        setMachineData(normaliseMachines(machines as RawMachinePerf[]));
      })
      .finally(() => setLoading(false));
  }, [token]);

  const ordersChartOptions: ApexOptions = {
    chart: {
      type: "area",
      toolbar: { show: false },
      sparkline: { enabled: false },
    },
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: 2 },
    xaxis: {
      categories: ordersData.map((d) => d.date),
      labels: { style: { fontSize: "11px" } },
    },
    colors: ["#02c0ce", "#777edd"],
    fill: { type: "gradient", gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
    tooltip: { shared: true },
    legend: { position: "top" },
  };

  const ordersSeries = [
    { name: "Orders", data: ordersData.map((d) => d.count) },
    {
      name: "Revenue (LKR)",
      data: ordersData.map((d) => Math.round(d.revenue)),
    },
  ];

  const machineChartOptions: ApexOptions = {
    chart: { type: "bar", toolbar: { show: false } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: machineData.slice(0, 8).map((m) => m.name || m.machineId),
      labels: { style: { fontSize: "10px" }, rotate: -30 },
    },
    colors: ["#0acf97"],
    plotOptions: { bar: { borderRadius: 4, columnWidth: "55%" } },
    tooltip: { y: { formatter: (v) => `LKR ${v.toLocaleString()}` } },
  };

  const machineSeries = [
    {
      name: "Revenue (LKR)",
      data: machineData.slice(0, 8).map((m) => Math.round(m.totalRevenue)),
    },
  ];

  if (loading) {
    return (
      <Row>
        <Col xl={7}>
          <Card>
            <CardBody className="text-center py-5">
              <Spinner />
            </CardBody>
          </Card>
        </Col>
        <Col xl={5}>
          <Card>
            <CardBody className="text-center py-5">
              <Spinner />
            </CardBody>
          </Card>
        </Col>
      </Row>
    );
  }

  return (
    <Row>
      <Col xl={7}>
        <Card>
          <div className="d-flex card-header justify-content-between align-items-center">
            <div>
              <h4 className="header-title">Orders Over Time</h4>
              <p className="text-muted mb-0 fs-13">Last 30 days</p>
            </div>
          </div>
          <CardBody className="pt-0">
            {ordersData.length > 0 ? (
              <ReactApexChart
                options={ordersChartOptions}
                series={ordersSeries}
                height={310}
                type="area"
              />
            ) : (
              <div className="text-center text-muted py-5">
                No order data available
              </div>
            )}
          </CardBody>
        </Card>
      </Col>
      <Col xl={5}>
        <Card>
          <div className="d-flex card-header justify-content-between align-items-center">
            <div>
              <h4 className="header-title">Machine Performance</h4>
              <p className="text-muted mb-0 fs-13">Revenue by machine</p>
            </div>
          </div>
          <CardBody className="pt-0">
            {machineData.length > 0 ? (
              <ReactApexChart
                options={machineChartOptions}
                series={machineSeries}
                height={310}
                type="bar"
              />
            ) : (
              <div className="text-center text-muted py-5">
                No machine data available
              </div>
            )}
          </CardBody>
        </Card>
      </Col>
    </Row>
  );
};

export default Statistics;
