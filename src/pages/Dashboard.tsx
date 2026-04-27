import { Layout } from "../components/layout/Layout";
import { FileText, Folder, ClipboardList, CalendarDays, Loader2, Calendar, TrendingUp } from "lucide-react";

import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";

export function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    total: 0,
    today: 0,
    month: 0,
    pending: 0
  });
  const [recentDocs, setRecentDocs] = useState<any[]>([]);
  const [chartData, setChartData] = useState<{label: string, count: number, percentage: number, date: string}[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const q = query(collection(db, "documents"), orderBy("createdAt", "desc"));
        const qs = await getDocs(q);
        
        const now = new Date();
        const todayStr = now.toLocaleDateString();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        let total = 0;
        let today = 0;
        let month = 0;
        let pending = 0;
        
        // Setup empty 7 days map
        const last7DaysMap = new Map<string, number>();
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const formattedDate = d.toLocaleDateString(); 
          last7DaysMap.set(formattedDate, 0);
        }

        const formattedDocsList: any[] = [];

        qs.docs.forEach(docSnap => {
          const data = docSnap.data();
          const createdAt = data.createdAt ? data.createdAt.toDate() : null;
          
          total++;
          if (!data.pdfUrl) pending++;
          
          if (createdAt) {
            const docDateStr = createdAt.toLocaleDateString();
            if (docDateStr === todayStr) today++;
            if (createdAt.getMonth() === currentMonth && createdAt.getFullYear() === currentYear) month++;
            
            if (last7DaysMap.has(docDateStr)) {
               last7DaysMap.set(docDateStr, last7DaysMap.get(docDateStr)! + 1);
            }
          }

          if (formattedDocsList.length < 5) {
            const firstPerson = data.persons?.[0];
            let clientName = data.clientName ? data.clientName : (firstPerson ? firstPerson.name : "Unknown Client");
            formattedDocsList.push({
               id: docSnap.id,
               client: clientName,
               date: createdAt ? createdAt.toLocaleDateString() : "Unknown",
               status: data.pdfUrl ? "COMPLETED" : "DRAFT",
               srNo: data.srNo
            });
          }
        });

        // Compute max for chart scaling
        const maxCount = Math.max(1, ...Array.from(last7DaysMap.values()));
        const finalChartData = Array.from(last7DaysMap.entries()).map(([dateStr, count]) => {
           const d = new Date(dateStr);
           const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' }); 
           
           return {
             date: dateStr,
             label: dayLabel,
             count: count,
             percentage: Math.max((count / maxCount) * 100, 2) // Ensure at least 2% height for empty days so bar is visible
           };
        });

        setMetrics({ total, today, month, pending });
        setChartData(finalChartData);
        setRecentDocs(formattedDocsList);
        
      } catch (error) {
        console.error("Dashboard Fetch Error", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  return (
    <Layout>
      <main className="flex-1 overflow-y-auto p-4 md:p-8">

        <div className="max-w-6xl mx-auto space-y-12">
          {/* Header & Quick Actions */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <h2 className="font-headline text-4xl font-bold text-on-surface leading-tight">Overview</h2>
              <p className="font-body text-on-surface-variant mt-2 text-lg">Your live notarization analytics.</p>
            </div>
            <div className="flex gap-4">
              <Link to="/documents/new" className="gradient-primary text-on-primary rounded-xl py-3 px-8 font-body font-bold hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm text-sm uppercase tracking-wider">
                <FileText size={18} />
                +New Document
              </Link>

            </div>
          </div>

          {isLoading ? (
             <div className="flex flex-col items-center justify-center p-20 text-on-surface-variant gap-4">
               <Loader2 size={32} className="animate-spin text-primary" />
               <p className="font-body font-bold uppercase tracking-wider">Syncing Live Data...</p>
             </div>
          ) : (
            <>
              {/* Stats Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-surface-container-lowest rounded-xl p-6 editorial-shadow flex flex-col justify-between h-40 border border-outline-variant/15 hover:border-primary/30 transition-colors">
                  <div className="flex justify-between items-start">
                    <span className="font-label text-sm text-on-surface-variant font-medium uppercase tracking-wider">Total Docs</span>
                    <span className="text-primary bg-primary/10 p-2 rounded-lg flex items-center justify-center">
                      <Folder size={20} className="fill-primary/20" />
                    </span>
                  </div>
                  <div className="mt-4">
                    <span className="font-headline text-4xl font-bold text-on-surface">{metrics.total.toLocaleString()}</span>
                  </div>
                </div>

                <div className="bg-surface-container-lowest rounded-xl p-6 editorial-shadow flex flex-col justify-between h-40 border border-outline-variant/15 hover:border-primary/30 transition-colors">
                  <div className="flex justify-between items-start">
                    <span className="font-label text-sm text-on-surface-variant font-medium uppercase tracking-wider">Today's Total</span>
                    <span className="text-secondary bg-secondary/10 p-2 rounded-lg flex items-center justify-center">
                      <CalendarDays size={20} className="fill-secondary/20" />
                    </span>
                  </div>
                  <div className="mt-4">
                    <span className="font-headline text-4xl font-bold text-on-surface">{metrics.today.toLocaleString()}</span>
                  </div>
                </div>

                <div className="bg-surface-container-lowest rounded-xl p-6 editorial-shadow flex flex-col justify-between h-40 border border-outline-variant/15 hover:border-primary/30 transition-colors">
                  <div className="flex justify-between items-start">
                    <span className="font-label text-sm text-on-surface-variant font-medium uppercase tracking-wider">This Month</span>
                    <span className="text-tertiary bg-tertiary/10 p-2 rounded-lg flex items-center justify-center">
                      <Calendar size={20} className="fill-tertiary/20" />
                    </span>
                  </div>
                  <div className="mt-4">
                    <span className="font-headline text-4xl font-bold text-on-surface">{metrics.month.toLocaleString()}</span>
                  </div>
                </div>

                <div className="bg-surface-container-lowest rounded-xl p-6 editorial-shadow flex flex-col justify-between h-40 border border-outline-variant/15 hover:border-primary/30 transition-colors">
                  <div className="flex justify-between items-start">
                    <span className="font-label text-sm text-on-surface-variant font-medium uppercase tracking-wider">Pending Signatures</span>
                    <span className="text-error bg-error/10 p-2 rounded-lg flex items-center justify-center">
                      <ClipboardList size={20} className="fill-error/20" />
                    </span>
                  </div>
                  <div className="mt-4">
                    <span className="font-headline text-4xl font-bold text-on-surface">{metrics.pending.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Grid 2 Columns: Growth Chart & Recent Documents */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Visual CSS Trend Chart */}
                <div className="bg-surface-container-lowest rounded-xl p-6 editorial-shadow border border-outline-variant/15 flex flex-col">
                  <div className="flex items-center gap-2 mb-8">
                    <TrendingUp size={20} className="text-primary" />
                    <h3 className="font-headline text-xl font-bold text-on-surface">Weekly Notarization Growth</h3>
                  </div>
                  <div className="flex h-56 items-end gap-3 justify-between pb-2 border-b border-outline-variant/30 flex-grow relative">
                    <div className="absolute left-0 top-0 bottom-0 w-full flex flex-col justify-between pointer-events-none opacity-20">
                      <div className="w-full h-[1px] bg-outline-variant"></div>
                      <div className="w-full h-[1px] bg-outline-variant"></div>
                      <div className="w-full h-[1px] bg-outline-variant"></div>
                      <div className="w-full h-[1px] bg-outline-variant"></div>
                    </div>
                    {chartData.map(day => (
                      <div key={day.date} className="flex flex-col items-center flex-1 gap-2 group z-10 h-full justify-end">
                        <div 
                          className={`w-full max-w-[40px] rounded-t-md relative flex-grow-0 transition-all duration-500 hover:bg-primary/80 ${day.count > 0 ? 'bg-primary/90' : 'bg-surface-variant'}`} 
                          style={{ height: `${day.percentage}%` }}
                        >
                           <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-surface-container-highest text-on-surface text-sm py-1 px-3 rounded-lg font-bold shadow-lg shadow-black/20 pointer-events-none transition-opacity whitespace-nowrap z-20">
                             {day.count} Docs
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-row justify-between pt-4">
                    {chartData.map(day => (
                       <span key={`l-${day.date}`} className="text-xs text-on-surface-variant font-label font-bold uppercase tracking-wider text-center flex-1">{day.label}</span>
                    ))}
                  </div>
                </div>

                {/* Recent Documents Section */}
                <div className="flex flex-col">
                  <h3 className="font-headline text-xl font-bold text-on-surface mb-6 flex items-center">Recent Instruments</h3>
                  <div className="bg-surface-container-lowest rounded-xl editorial-shadow overflow-hidden border border-outline-variant/15 flex-grow">
                    <div className="w-full">
                      <div className="grid grid-cols-12 bg-surface-container-low/50 px-6 py-4 font-label text-[11px] font-bold text-on-surface-variant uppercase tracking-wider hidden md:grid border-b border-outline-variant/15">
                        <div className="col-span-3">Subject</div>
                        <div className="col-span-4">Client</div>
                        <div className="col-span-3">Date</div>
                        <div className="col-span-2 text-right">Status</div>
                      </div>
                      <div className="divide-y divide-outline-variant/15">
                        {recentDocs.length === 0 ? (
                           <div className="p-8 text-center text-on-surface-variant font-body text-sm">No recent documents found in database.</div>
                        ) : (
                          recentDocs.map((doc) => (
                            <div key={doc.id} className="grid grid-cols-1 md:grid-cols-12 items-center px-6 py-4 hover:bg-surface-bright transition-colors gap-y-2 cursor-pointer group" onClick={() => { navigator.clipboard.writeText(doc.id); alert('ID Copied!'); }}>
                              <div className="col-span-1 md:col-span-3 font-label text-sm font-semibold text-on-surface group-hover:text-primary transition-colors truncate pr-2">
                                <span className="md:hidden font-semibold mr-2 text-on-surface-variant">Subject:</span>{doc.srNo ? `Sr: ${doc.srNo}` : doc.id}
                              </div>
                              <div className="col-span-1 md:col-span-4 font-body text-sm font-medium text-on-surface truncate pr-2">
                                <span className="md:hidden font-semibold mr-2 text-on-surface-variant">Client:</span>{doc.client}
                              </div>
                              <div className="col-span-1 md:col-span-3 font-label text-xs text-on-surface-variant uppercase tracking-wider">
                                <span className="md:hidden font-semibold mr-2">Date:</span>{doc.date}
                              </div>
                              <div className="col-span-1 md:col-span-2 mt-2 md:mt-0 flex md:justify-end">
                                <span className={`font-label text-[10px] font-semibold px-2.5 py-1 rounded-full tracking-widest uppercase flex items-center gap-1.5 ${
                                  doc.status === "DRAFT" 
                                    ? "bg-outline/20 text-on-surface-variant" 
                                    : "bg-primary/20 text-primary"
                                }`}>
                                  <span className={`w-1 h-1 rounded-full ${doc.status === 'DRAFT' ? 'bg-on-surface-variant' : 'bg-primary'}`}></span>
                                  {doc.status}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </>
          )}

        </div>
      </main>
    </Layout>
  );
}
