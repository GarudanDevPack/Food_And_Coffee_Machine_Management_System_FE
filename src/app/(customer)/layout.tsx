"use client";
import AuthProtectionWrapper from "@/components/wrappers/AuthProtectionWrapper";
import VerticalLayout from "@/components/layout/VerticalLayout";
import { useUserRole } from "@/hooks/useApi";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ChildrenType } from "../../types/component-props";

const CustomerLayout = ({ children }: ChildrenType) => {
  const role = useUserRole();
  const router = useRouter();

  useEffect(() => {
    if (role !== undefined && role !== 5) {
      router.replace("/dashboard");
    }
  }, [role, router]);

  if (role !== undefined && role !== 5) return null;

  return (
    <AuthProtectionWrapper>
      <VerticalLayout>{children}</VerticalLayout>
    </AuthProtectionWrapper>
  );
};

export default CustomerLayout;
