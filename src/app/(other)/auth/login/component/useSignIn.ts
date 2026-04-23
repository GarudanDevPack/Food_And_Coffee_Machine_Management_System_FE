"use client";
import { useNotificationContext } from "@/context/useNotificationContext";
import useQueryParams from "@/hooks/useQueryParams";
import { yupResolver } from "@hookform/resolvers/yup";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as yup from "yup";

const useSignIn = () => {
  const [loading, setLoading] = useState(false);
  const { push } = useRouter();
  const { showNotification } = useNotificationContext();

  const queryParams = useQueryParams();

  const loginFormSchema = yup.object({
    email: yup
      .string()
      .email("Please enter a valid email")
      .required("Please enter your email"),
    password: yup.string().required("Please enter your password"),
  });

  const { control, handleSubmit } = useForm({
    resolver: yupResolver(loginFormSchema),
    defaultValues: {
      email: "user@demo.com",
      password: "123456",
    },
  });

  type LoginFormFields = yup.InferType<typeof loginFormSchema>;

  const login = handleSubmit(async (values: LoginFormFields) => {
    setLoading(true);
    const res = await signIn("credentials", {
      redirect: false,
      email: values?.email,
      password: values?.password,
    });
    setLoading(false);
    if (res?.ok) {
      showNotification({
        message: "Successfully logged in. Redirecting....",
        variant: "success",
      });
      window.location.href = "/";
    } else {
      showNotification({ message: res?.error ?? "", variant: "danger" });
    }
  });

  return { loading, login, control };
};

export default useSignIn;
