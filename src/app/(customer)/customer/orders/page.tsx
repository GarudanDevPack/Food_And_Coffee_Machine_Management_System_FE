"use client";
import { fmtDate, fmtDateTime } from "@/lib/fmt";
import PageTitle from "@/components/PageTitle";
import { ordersApi } from "@/lib/api";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Badge, Card, CardBody, Spinner, Table } from "react-bootstrap";

interface Order {
  _id?: string;
  orderId?: string;
  machineId?: string;
  machineName?: string;
  itemName?: string;
  cupSize?: string;
  quantity?: number;
  totalAmount?: number;
  currency?: string;
  discountApplied?: number;
  status?: string;
  createdAt?: string;
}

const statusBg = (s?: string): string =>
  ({
    pending: "warning",
    dispensing: "info",
    completed: "success",
    failed: "danger",
    refunded: "secondary",
    cancelled: "secondary",
  })[s ?? ""] ?? "secondary";

export default function CustomerOrdersPage() {
  const { data: session } = useSession();
  const token = (session?.user as any)?.token ?? "";
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    ordersApi
      .myOrders(token)
      .then((data) => setOrders(data as Order[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <>
      <PageTitle title="My Orders" subTitle="Order History" />

      <Card>
        <CardBody className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner />
            </div>
          ) : (
            <div className="table-responsive">
              <Table className="table-custom table-centered table-sm table-nowrap mb-0">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Item</th>
                    <th>Machine</th>
                    <th>Qty</th>
                    <th>Amount</th>
                    <th>Discount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center text-muted py-4">
                        No orders yet
                      </td>
                    </tr>
                  ) : (
                    orders.map((o) => {
                      const rowId = o._id ?? o.orderId ?? "";
                      return (
                        <tr key={rowId}>
                          <td>
                            <code className="fs-12 text-primary">
                              {o.orderId ?? rowId.slice(-8)}
                            </code>
                          </td>
                          <td className="fs-13">
                            {o.itemName ?? "—"}
                            {o.cupSize && (
                              <span className="text-muted ms-1 fs-11">
                                ({o.cupSize})
                              </span>
                            )}
                          </td>
                          <td className="text-muted fs-12">
                            {o.machineName ?? o.machineId ?? "—"}
                          </td>
                          <td className="fs-13">{o.quantity ?? 1}</td>
                          <td className="fs-13">
                            {o.currency ?? "LKR"}{" "}
                            {(o.totalAmount ?? 0).toLocaleString()}
                          </td>
                          <td className="fs-13">
                            {o.discountApplied ? (
                              <Badge bg="success" className="fs-11">
                                {o.discountApplied}%
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td>
                            <Badge
                              bg={statusBg(o.status)}
                              className="text-capitalize"
                            >
                              {o.status}
                            </Badge>
                          </td>
                          <td className="text-muted fs-12">
                            {o.createdAt ? fmtDateTime(o.createdAt) : "—"}
                          </td>
                        </tr>
                      );
                    })
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
