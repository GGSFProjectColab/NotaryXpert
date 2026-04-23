import { Layout } from "../components/layout/Layout";
import { TopBar } from "../components/layout/TopBar";
import { Search, ChevronDown, Calendar, Plus, ChevronLeft, ChevronRight, FileText, Loader2, Copy } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";

export function Documents() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateSort, setDateSort] = useState("newest");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const q = query(collection(db, "documents"), orderBy("createdAt", "desc"));
        const qs = await getDocs(q);
        const fetched = qs.docs.map(doc => {
          const data = doc.data();
          const firstPerson = data.persons?.[0];
          
          let clientName = firstPerson ? firstPerson.name : "Unknown Client";
          let initials = "UK";
          if (clientName && clientName !== "Unknown Client") {
            const parts = clientName.split(" ");
            initials = parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].substring(0, 2);
          }

          return {
            id: doc.id,
            clientInitials: initials.toUpperCase(),
            clientName: clientName,
            type: "Notarized Document",
            date: data.createdAt?.toDate().toLocaleDateString() || "Unknown Date",
            timestamp: data.createdAt ? data.createdAt.toMillis() : 0,
            status: data.pdfUrl ? "Completed" : "Draft",
            statusColor: data.pdfUrl ? "bg-primary" : "bg-outline",
            statusBg: data.pdfUrl ? "bg-surface-container-highest" : "bg-surface-container",
            statusText: data.pdfUrl ? "text-on-surface" : "text-on-surface-variant",
            pdfUrl: data.pdfUrl,
            srNo: data.srNo
          };
        });
        setDocuments(fetched);
      } catch (err) {
        console.error("Failed to fetch documents:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocs();
  }, []);

  const filteredDocuments = documents.filter(doc => {
     // Search filter
     const safeSearch = String(searchQuery).toLowerCase();
     const matchesSearch = safeSearch === "" || 
         String(doc.id || "").toLowerCase().includes(safeSearch) || 
         String(doc.clientName || "").toLowerCase().includes(safeSearch) || 
         String(doc.srNo || "").toLowerCase().includes(safeSearch) ||
         String(doc.type || "").toLowerCase().includes(safeSearch);
     
     // Status filter
     const matchesStatus = statusFilter === "" || String(doc.status).toLowerCase() === statusFilter.toLowerCase();

     // Date range filter
     let matchesDate = true;
     if (startDate || endDate) {
        if (doc.timestamp) {
           const docTime = new Date(doc.timestamp).setHours(0,0,0,0);
           if (startDate) {
              const sTime = new Date(startDate).setHours(0,0,0,0);
              if (docTime < sTime) matchesDate = false;
           }
           if (endDate) {
              const eTime = new Date(endDate).setHours(23,59,59,999);
              if (docTime > eTime) matchesDate = false;
           }
        } else {
           matchesDate = false; // If searching for dates but doc has no date, filter out.
        }
     }
     
     return matchesSearch && matchesStatus && matchesDate;
  }).sort((a, b) => {
     if (dateSort === "newest") return b.timestamp - a.timestamp;
     if (dateSort === "oldest") return a.timestamp - b.timestamp;
     return 0;
  });

  return (
    <Layout>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Page Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-4">
            <div className="flex flex-col gap-2">
              <h1 className="font-headline text-4xl md:text-5xl font-bold text-on-surface tracking-tight">Document Archive</h1>
              <p className="font-body text-on-surface-variant text-base md:text-lg max-w-2xl">A comprehensive ledger of all notarized instruments, drafts, and pending executions.</p>
            </div>
            <Link to="/documents/new" className="flex items-center gap-2 gradient-primary text-on-primary px-6 py-3 rounded-xl font-medium shadow-[0_4px_20px_-4px_rgba(0,99,156,0.3)] hover:opacity-90 transition-opacity whitespace-nowrap">
              <Plus size={18} />
              New Instrument
            </Link>
          </div>

          {/* Filter & Search Bar Area */}
          <div className="flex flex-col lg:flex-row gap-4 w-full bg-surface-container-lowest p-4 rounded-xl editorial-shadow border border-outline-variant/15">
            <div className="flex-grow relative group w-full">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors" />
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-container-highest focus:bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/70 rounded-md py-3 pl-12 pr-4 border-none focus:ring-2 focus:ring-primary/30 transition-all font-body text-sm" 
                placeholder="Search by Client, ID, or Subject..." 
                type="text"
              />
            </div>
            <div className="flex flex-wrap md:flex-nowrap gap-3 items-center w-full lg:w-auto">
              <div className="relative min-w-[140px] flex-grow lg:flex-grow-0">
                <select value={dateSort} onChange={(e) => setDateSort(e.target.value)} className="w-full appearance-none bg-surface-container-highest focus:bg-surface-container-lowest text-on-surface rounded-md py-3 pl-4 pr-10 border-none focus:ring-2 focus:ring-primary/30 transition-all font-body text-sm cursor-pointer">
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
              </div>
              <div className="relative min-w-[140px] flex-grow lg:flex-grow-0">
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full appearance-none bg-surface-container-highest focus:bg-surface-container-lowest text-on-surface rounded-md py-3 pl-4 pr-10 border-none focus:ring-2 focus:ring-primary/30 transition-all font-body text-sm cursor-pointer">
                  <option value="">Any Status</option>
                  <option value="completed">Completed</option>
                  <option value="draft">Draft</option>
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
              </div>
              
              <div className="flex items-center gap-2 bg-surface-container-highest rounded-md px-3 py-2 border-none focus-within:ring-2 focus-within:ring-primary/30 transition-shadow">
                 <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-on-surface text-sm font-body outline-none w-[120px] cursor-pointer" title="Start Date" />
                 <span className="text-on-surface-variant text-xs font-bold uppercase tracking-wider px-1">To</span>
                 <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-on-surface text-sm font-body outline-none w-[120px] cursor-pointer" title="End Date" />
              </div>
              
            </div>
          </div>

          {/* Data Table / List Area */}
          <div className="bg-surface-container-lowest rounded-xl editorial-shadow border border-outline-variant/15 overflow-hidden flex flex-col">
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-surface-container-low/50 text-on-surface-variant font-label text-xs uppercase tracking-wider font-semibold">
              <div className="col-span-2">Document ID</div>
              <div className="col-span-3">Client Name</div>
              <div className="col-span-3">Document Type</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-2 text-right">Status</div>
            </div>

            <div className="flex flex-col relative min-h-[200px]">
              {isLoading ? (
                 <div className="absolute inset-0 flex items-center justify-center text-on-surface-variant gap-2">
                   <Loader2 className="animate-spin" size={24} /> Loading Archive...
                 </div>
              ) : filteredDocuments.length === 0 ? (
                 <div className="py-12 flex flex-col items-center justify-center text-on-surface-variant">
                   <p className="font-headline font-bold text-lg mb-1">No matches found!</p>
                   <p className="font-body text-sm">Try adjusting your active filters.</p>
                 </div>
              ) : (
                filteredDocuments.map((doc, i) => (
                  <div key={doc.id} className={`grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-4 px-6 py-5 hover:bg-surface-bright transition-colors group items-center border-t border-outline-variant/15 md:border-none relative ${i % 2 !== 0 ? 'bg-surface-container-low/30' : ''}`}>
                    <div className="hidden md:block absolute bottom-0 left-6 right-6 h-[1px] bg-surface-container-low group-last:hidden"></div>
                    
                    <div className="col-span-1 md:col-span-2 flex flex-col md:block">
                      <span className="md:hidden text-xs text-on-surface-variant font-label uppercase tracking-wider mb-1">ID</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-body text-xs font-medium ${doc.status === 'Draft' ? 'text-on-surface-variant/70' : 'text-on-surface'} truncate max-w-[120px]`} title={doc.id}>{doc.id}</span>
                        <button onClick={() => { navigator.clipboard.writeText(doc.id); alert('ID Copied!'); }} className="text-on-surface-variant hover:text-primary transition-colors" title="Copy Document ID">
                          <Copy size={12} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="col-span-1 md:col-span-3 flex flex-col md:block">
                      <span className="md:hidden text-xs text-on-surface-variant font-label uppercase tracking-wider mb-1">Client</span>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0 bg-secondary-container text-on-secondary-container`}>
                          {doc.clientInitials}
                        </div>
                        <span className="font-body text-sm text-on-surface font-medium truncate">{doc.clientName}</span>
                      </div>
                    </div>
                    
                    <div className="col-span-1 md:col-span-3 flex flex-col md:block">
                      <span className="md:hidden text-xs text-on-surface-variant font-label uppercase tracking-wider mb-1">Subject</span>
                      <span className="font-body text-sm text-on-surface">{doc.srNo ? `Sr No: ${doc.srNo}` : doc.type}</span>
                    </div>
                    
                    <div className="col-span-1 md:col-span-2 flex flex-col md:block">
                      <span className="md:hidden text-xs text-on-surface-variant font-label uppercase tracking-wider mb-1">Date</span>
                      <span className="font-label text-sm text-on-surface-variant">{doc.date}</span>
                    </div>
                    
                    <div className="col-span-1 md:col-span-2 flex justify-start md:justify-end gap-3 mt-2 md:mt-0">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full ${doc.statusBg} ${doc.statusText} font-label text-xs uppercase tracking-[0.1em] font-semibold whitespace-nowrap`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${doc.statusColor} mr-2`}></span>
                        {doc.status}
                      </span>
                      
                      {doc.pdfUrl && (
                        <button onClick={() => window.open(doc.pdfUrl, '_blank')} className="flex items-center gap-1.5 bg-green-100 hover:bg-green-200 text-green-800 px-3 py-1.5 rounded-full font-label text-xs uppercase tracking-wider transition-colors">
                          <FileText size={14} /> View
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination / Record Count */}
            <div className="px-6 py-4 border-t border-outline-variant/15 flex flex-col sm:flex-row gap-4 items-center justify-between bg-surface-container-lowest">
              <span className="text-sm text-on-surface-variant font-body">Showing {filteredDocuments.length} matching entries out of {documents.length}</span>
              <div className="flex gap-1">
                <button className="p-2 rounded-md text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-50" disabled>
                  <ChevronLeft size={16} />
                </button>
                <button className="w-8 h-8 rounded-md bg-primary-container text-on-primary-container font-medium text-sm flex items-center justify-center">1</button>
                <button className="w-8 h-8 rounded-md text-on-surface hover:bg-surface-container-high font-medium text-sm flex items-center justify-center transition-colors">2</button>
                <button className="w-8 h-8 rounded-md text-on-surface hover:bg-surface-container-high font-medium text-sm flex items-center justify-center transition-colors">3</button>
                <button className="p-2 rounded-md text-on-surface hover:bg-surface-container-high transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}
