import AppLayout from "@/components/layout/AppLayout";
import { Toaster } from "react-hot-toast";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Toaster position="top-right" />
      <AppLayout>{children}</AppLayout>
    </>
  );
}
