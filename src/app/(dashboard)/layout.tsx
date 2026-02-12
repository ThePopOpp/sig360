import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

// Force dynamic rendering to ensure middleware auth runs
export const dynamic = 'force-dynamic';

export default function DashboardGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
}
