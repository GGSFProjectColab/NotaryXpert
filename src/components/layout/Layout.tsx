import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-surface text-on-surface flex min-h-screen overflow-hidden antialiased print:block print:overflow-visible print:bg-white print:h-auto">
      <div className="print:hidden">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col md:ml-64 h-screen print:h-auto print:ml-0 print:block print:overflow-visible">
        {children}
      </div>
    </div>
  );
}
