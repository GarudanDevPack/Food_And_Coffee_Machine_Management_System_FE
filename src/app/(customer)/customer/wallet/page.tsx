"use client";
import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  Col,
  Form,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";
import { toast } from "react-toastify";
import PageTitle from "@/components/PageTitle";
import { walletApi } from "@/lib/api";
import { useApiToken } from "@/hooks/useApi";
import IconifyIcon from "@/components/wrappers/IconifyIcon";

type Transaction = {
  _id: string;
  type: "credit" | "debit" | "refund";
  amount: number;
  description: string;
  createdAt: string;
};

const CustomerWalletPage = () => {
  const token = useApiToken();
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [topupAmount, setTopupAmount] = useState("");
  const [topupNote, setTopupNote] = useState("");
  const [topupLoading, setTopupLoading] = useState(false);

  const loadWallet = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [balData, txData] = await Promise.all([
        walletApi.getMyBalance(token),
        walletApi.getMyTransactions(token),
      ]);
      setBalance((balData as any).balance ?? 0);
      setTransactions((txData as any) || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load wallet");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadWallet();
  }, [token]);

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const amt = parseFloat(topupAmount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");

    setTopupLoading(true);
    try {
      await walletApi.requestTopup(token, { amount: amt, note: topupNote });
      toast.success("Top-up request submitted — pending admin approval");
      setTopupAmount("");
      setTopupNote("");
    } catch (err: any) {
      toast.error(err.message || "Top-up request failed");
    } finally {
      setTopupLoading(false);
    }
  };

  const txBadge = (type: string) => {
    const map: Record<string, string> = {
      credit: "success",
      debit: "danger",
      refund: "info",
    };
    return (
      <Badge bg={map[type] || "secondary"} className="text-capitalize">
        {type}
      </Badge>
    );
  };

  return (
    <>
      <PageTitle
        title="My Wallet"
        subTitle="Manage your balance and transactions"
      />

      <Row className="g-3 mb-4">
        <Col xs={12} md={4}>
          <Card className="text-center h-100">
            <CardBody className="d-flex flex-column align-items-center justify-content-center py-4">
              <div className="text-muted mb-1">Available Balance</div>
              {loading ? (
                <Spinner animation="border" variant="primary" />
              ) : (
                <div className="display-5 fw-bold text-primary">
                  LKR {balance?.toFixed(2) ?? "0.00"}
                </div>
              )}
              <Button
                variant="outline-secondary"
                size="sm"
                className="mt-3"
                onClick={loadWallet}
              >
                <IconifyIcon icon="ri:refresh-line" className="me-1" />
                Refresh
              </Button>
            </CardBody>
          </Card>
        </Col>

        <Col xs={12} md={8}>
          <Card className="h-100">
            <CardBody>
              <h5 className="mb-3">Request Top-Up</h5>
              <Form onSubmit={handleTopup}>
                <Row className="g-2 align-items-end">
                  <Col xs={12} sm={5}>
                    <Form.Group>
                      <Form.Label className="small">Amount (LKR)</Form.Label>
                      <Form.Control
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="Amount"
                        value={topupAmount}
                        onChange={(e) => setTopupAmount(e.target.value)}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={12} sm={5}>
                    <Form.Group>
                      <Form.Label className="small">Note (optional)</Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Reference / note"
                        value={topupNote}
                        onChange={(e) => setTopupNote(e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={12} sm={2}>
                    <Button
                      type="submit"
                      variant="primary"
                      className="w-100"
                      disabled={topupLoading}
                    >
                      {topupLoading ? (
                        <Spinner size="sm" animation="border" />
                      ) : (
                        "Submit"
                      )}
                    </Button>
                  </Col>
                </Row>
                <Form.Text className="text-muted">
                  Top-up requests are reviewed and approved by admin.
                </Form.Text>
              </Form>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Card>
        <CardBody>
          <h5 className="mb-3">Transaction History</h5>
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-muted text-center py-3">No transactions yet</p>
          ) : (
            <div className="table-responsive">
              <Table className="table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th className="text-end">Amount (LKR)</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx._id}>
                      <td className="text-muted">
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>
                      <td>{txBadge(tx.type)}</td>
                      <td>{tx.description || "—"}</td>
                      <td
                        className={`text-end fw-semibold ${tx.type === "debit" ? "text-danger" : "text-success"}`}
                      >
                        {tx.type === "debit" ? "-" : "+"}
                        {tx.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </CardBody>
      </Card>
    </>
  );
};

export default CustomerWalletPage;
