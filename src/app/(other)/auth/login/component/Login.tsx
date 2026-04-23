"use client";
import logoSmImg from "@/assets/images/logo-qfox-sm.png";
import { currentYear } from "@/context/constants";
import { authApi } from "@/lib/api";
import { useNotificationContext } from "@/context/useNotificationContext";
import { yupResolver } from "@hookform/resolvers/yup";
import { signIn } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Button,
  Card,
  Col,
  Form,
  Row,
  Spinner,
  Tab,
  Tabs,
} from "react-bootstrap";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import TextFormInput from "@/components/form/TextFormInput";

// ─── Email/Password tab ───────────────────────────────────────────────────────
const EmailLoginForm = () => {
  const [loading, setLoading] = useState(false);
  const { push } = useRouter();
  const { showNotification } = useNotificationContext();

  const schema = yup.object({
    email: yup
      .string()
      .email("Enter a valid email")
      .required("Email is required"),
    password: yup.string().required("Password is required"),
  });
  const { control, handleSubmit } = useForm({ resolver: yupResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    setLoading(true);
    const res = await signIn("credentials", {
      redirect: false,
      email: values.email,
      password: values.password,
    });
    setLoading(false);
    if (res?.ok) {
      showNotification({
        message: "Logged in successfully",
        variant: "success",
      });
      // Full page reload ensures the session cookie is sent with the next request
      // so middleware can read the token and redirect to the correct role-based page
      window.location.href = "/";
    } else {
      showNotification({
        message: res?.error ?? "Invalid credentials",
        variant: "danger",
      });
    }
  });

  return (
    <form onSubmit={onSubmit} className="text-start mb-3">
      <div className="mb-3">
        <TextFormInput
          control={control}
          name="email"
          placeholder="Enter your email"
          className="bg-light bg-opacity-50 border-light py-2"
          label="Email"
        />
      </div>
      <div className="mb-3">
        <TextFormInput
          control={control}
          name="password"
          placeholder="Enter your password"
          className="bg-light bg-opacity-50 border-light py-2"
          label="Password"
        />
      </div>
      <div className="d-flex justify-content-between mb-3">
        <Form.Check type="checkbox" id="remember-me" label="Remember me" />
        <Link
          href="/auth/recover-password"
          className="text-muted border-bottom border-dashed"
        >
          Forgot Password?
        </Link>
      </div>
      <Button disabled={loading} type="submit" className="w-100 fw-semibold">
        {loading ? <Spinner size="sm" className="me-1" /> : null} Login
      </Button>
    </form>
  );
};

// ─── OTP Phone tab ────────────────────────────────────────────────────────────
const PhoneOtpForm = () => {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { push } = useRouter();
  const { showNotification } = useNotificationContext();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError("Enter your phone number");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await authApi.sendOtp(phone.trim());
      setStep("otp");
      showNotification({
        message: "OTP sent to your phone",
        variant: "success",
      });
    } catch (err: any) {
      setError(err.message ?? "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      setError("Enter the OTP");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await authApi.verifyOtp(phone.trim(), otp.trim());
      // Pass the verified token directly to NextAuth
      const res = await signIn("credentials", {
        redirect: false,
        token: (data as any).token,
      });
      if (res?.ok) {
        showNotification({
          message: "Logged in successfully",
          variant: "success",
        });
        window.location.href = "/";
      } else {
        setError(res?.error ?? "Login failed");
      }
    } catch (err: any) {
      setError(err.message ?? "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-start mb-3">
      {step === "phone" ? (
        <form onSubmit={handleSendOtp}>
          <Form.Group className="mb-3">
            <Form.Label>Phone Number</Form.Label>
            <Form.Control
              type="tel"
              placeholder="e.g. 0712345678"
              className="bg-light bg-opacity-50 border-light py-2"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </Form.Group>
          {error && (
            <div className="alert alert-danger py-2 fs-13">{error}</div>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="w-100 fw-semibold"
          >
            {loading ? <Spinner size="sm" className="me-1" /> : null} Send OTP
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp}>
          <div className="mb-3 text-muted fs-13">
            OTP sent to <strong>{phone}</strong>.{" "}
            <button
              type="button"
              className="btn btn-link btn-sm p-0 fs-13"
              onClick={() => {
                setStep("phone");
                setOtp("");
              }}
            >
              Change
            </button>
          </div>
          <Form.Group className="mb-3">
            <Form.Label>Enter OTP</Form.Label>
            <Form.Control
              type="text"
              placeholder="6-digit code"
              maxLength={6}
              className="bg-light bg-opacity-50 border-light py-2 text-center fs-18 fw-bold letter-spacing-2"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              required
            />
            <Form.Text className="text-muted">
              OTP expires in 5 minutes
            </Form.Text>
          </Form.Group>
          {error && (
            <div className="alert alert-danger py-2 fs-13">{error}</div>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="w-100 fw-semibold"
          >
            {loading ? <Spinner size="sm" className="me-1" /> : null} Verify &
            Login
          </Button>
        </form>
      )}
    </div>
  );
};

// ─── Main Login Page ──────────────────────────────────────────────────────────
const Login = () => {
  return (
    <div className="auth-bg d-flex min-vh-100 justify-content-center align-items-center">
      <Row className="g-0 justify-content-center w-100 m-xxl-5 px-xxl-4 m-3">
        <Col xl={3} lg={4} md={6}>
          <Card className="overflow-hidden text-center rounded-4 p-xxl-4 p-3 mb-0">
            <div className="auth-brand mb-4">
              <Image src={logoSmImg} alt="QFOX" height={40} />
              <div className="fw-bold fs-18 mt-1 text-primary">QFOX</div>
            </div>
            <h4 className="fw-semibold mb-2 fs-18">Log in to your account</h4>
            <p className="text-muted mb-4">
              Sign in to manage vending operations.
            </p>

            <Tabs
              defaultActiveKey="email"
              className="mb-3 nav-pills-custom"
              fill
            >
              <Tab
                eventKey="email"
                title={
                  <>
                    <i className="ri-mail-line me-1" />
                    Email
                  </>
                }
              >
                <EmailLoginForm />
              </Tab>
              <Tab
                eventKey="phone"
                title={
                  <>
                    <i className="ri-phone-line me-1" />
                    Phone OTP
                  </>
                }
              >
                <PhoneOtpForm />
              </Tab>
            </Tabs>

            <p className="text-muted fs-14 mb-0">
              Don&apos;t have an account?{" "}
              <Link href="/auth/register" className="fw-semibold text-danger">
                Sign Up
              </Link>
            </p>
          </Card>
          <p className="mt-4 text-center mb-0 text-muted fs-12">
            {currentYear} © QFOX — Garudan Pvt Ltd
          </p>
        </Col>
      </Row>
    </div>
  );
};

export default Login;
