"use client";
import { NotificationProvider } from "@/context/useNotificationContext";
import { SessionProvider } from "next-auth/react";
import { ToastContainer } from "react-toastify";
import { ChildrenType } from "../../types/component-props";
import { LayoutProvider } from "@/context/useLayoutContext";

const AppProvidersWrapper = ({ children }: ChildrenType) => {
  return (
    <>
      <SessionProvider>
        <LayoutProvider>
          <NotificationProvider>
            {children}
            <ToastContainer theme="colored" />
          </NotificationProvider>
        </LayoutProvider>
      </SessionProvider>
    </>
  );
};
export default AppProvidersWrapper;
