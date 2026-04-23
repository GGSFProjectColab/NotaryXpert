import { Layout } from "../components/layout/Layout";
import { TopBar } from "../components/layout/TopBar";
import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import { Loader2, Fingerprint, MapPin, Search, Copy, Check, FileText, Phone, Mail } from "lucide-react";

interface ParsedClient {
   id: string;
   name: string;
   aadhar: string;
   addr: string;
   age: string;
   phone?: string;
   email?: string;
   photoUrl?: string;
   linkedDocuments: number;
}

export function Clients() {
  const [isLoading, setIsLoading] = useState(true);
  const [clients, setClients] = useState<ParsedClient[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const q = query(collection(db, "documents"), orderBy("createdAt", "desc"));
        const qs = await getDocs(q);
        
        const clientMap = new Map<string, ParsedClient>();
        
        qs.docs.forEach(docSnap => {
          const data = docSnap.data();
          if (data.persons && Array.isArray(data.persons)) {
             data.persons.forEach((person: any) => {
                if (!person.name || person.name.trim() === '') return;
                
                // Group by Aadhar. If no Aadhar, group by Name to prevent massive duplication.
                const validAadhar = person.aadhar && person.aadhar.trim().length > 5 && !person.aadhar.includes('XXXX-XXXX');
                let uniqueKey = validAadhar ? person.aadhar.trim() : person.name.trim().toLowerCase();
                
                if (clientMap.has(uniqueKey)) {
                   const existing = clientMap.get(uniqueKey)!;
                   existing.linkedDocuments += 1;
                   if (!existing.photoUrl && person.photo && person.photo.startsWith('http')) {
                       existing.photoUrl = person.photo;
                   }
                   if (!existing.phone && person.phone) existing.phone = person.phone;
                   if (!existing.email && person.email) existing.email = person.email;
                } else {
                   clientMap.set(uniqueKey, {
                      id: uniqueKey,
                      name: person.name,
                      aadhar: person.aadhar || 'Pending',
                      addr: person.addr || 'No Address Logged',
                      age: person.age || '-',
                      phone: person.phone,
                      email: person.email,
                      photoUrl: person.photo?.startsWith('http') ? person.photo : undefined,
                      linkedDocuments: 1
                   });
                }
             });
          }
        });
        
        setClients(Array.from(clientMap.values()));
      } catch (error) {
        console.error("Error fetching clients:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchClients();
  }, []);

  const handleCopy = (text: string, id: string) => {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredClients = clients.filter(c => 
     c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
     c.aadhar.includes(searchQuery)
  );

  return (
    <Layout>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <h2 className="font-headline text-4xl font-bold text-on-surface leading-tight">Client Directory</h2>
              <p className="font-body text-on-surface-variant mt-2 text-lg">Manage relationships automatically parsed from your documents.</p>
            </div>
            
            <div className="relative w-full md:w-96">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Name or Aadhar..." 
                  className="w-full bg-surface-container-highest focus:bg-surface-container-lowest text-on-surface rounded-xl py-3.5 pl-12 pr-4 border border-outline-variant/20 focus:ring-2 focus:ring-primary/30 outline-none transition-all font-body text-sm shadow-sm"
                />
            </div>
          </div>

          {/* Grid View */}
          {isLoading ? (
             <div className="flex flex-col items-center justify-center p-20 text-on-surface-variant gap-4">
               <Loader2 size={32} className="animate-spin text-primary" />
               <p className="font-body font-bold uppercase tracking-wider">Scraping Associated Clients...</p>
             </div>
          ) : filteredClients.length === 0 ? (
             <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl p-16 text-center shadow-sm">
                <div className="mx-auto w-16 h-16 bg-surface-variant rounded-full flex items-center justify-center mb-4">
                   <Search size={24} className="text-on-surface-variant" />
                </div>
                <h3 className="font-headline text-xl font-bold text-on-surface mb-2">No Clients Found</h3>
                <p className="text-on-surface-variant font-body">We couldn't scrape any clients matching your criteria.</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {filteredClients.map((client, idx) => (
                  <div key={idx} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-6 hover:shadow-lg transition-shadow duration-300 flex flex-col gap-5 editorial-shadow">
                     
                     <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-full bg-surface-container-high border-2 border-primary/10 overflow-hidden flex-shrink-0 flex items-center justify-center text-primary font-bold text-xl relative">
                           {client.photoUrl ? (
                              <img src={client.photoUrl} alt={client.name} className="w-full h-full object-cover" />
                           ) : (
                              client.name.charAt(0).toUpperCase()
                           )}
                        </div>
                        <div className="flex-1 truncate">
                           <h3 className="font-headline font-bold text-xl text-on-surface truncate pr-2">{client.name}</h3>
                           <span className="font-body text-sm font-medium text-on-surface-variant">Age: {client.age}</span>
                        </div>
                     </div>

                     <div className="space-y-3 pt-2">
                        <div className="flex items-start gap-3 bg-surface-container-low p-3 rounded-xl border border-outline-variant/5">
                           <Fingerprint size={16} className="text-primary mt-0.5 flex-shrink-0" />
                           <div className="flex-1 font-body text-sm text-on-surface truncate break-all">{client.aadhar}</div>
                           <button onClick={() => handleCopy(client.aadhar, `a-${idx}`)} className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer" title="Copy Aadhar">
                              {copiedId === `a-${idx}` ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                           </button>
                        </div>
                        
                        <div className="flex items-start gap-3 bg-surface-container-low p-3 rounded-xl border border-outline-variant/5">
                           <MapPin size={16} className="text-secondary mt-0.5 flex-shrink-0" />
                           <div className="flex-1 font-body text-sm text-on-surface line-clamp-2">{client.addr}</div>
                        </div>

                        
                        {(client.phone || client.email) && (
                           <div className="flex flex-col gap-2 bg-surface-container-low p-3 rounded-xl border border-outline-variant/5">
                             {client.phone && (
                                <div className="flex items-center gap-3">
                                   <Phone size={16} className="text-primary opacity-80 flex-shrink-0" />
                                   <div className="flex-1 font-body text-sm text-on-surface truncate cursor-pointer hover:text-primary transition-colors hover:underline" onClick={() => window.open(`tel:${client.phone}`)}>{client.phone}</div>
                                </div>
                             )}
                             {client.email && (
                                <div className="flex items-center gap-3">
                                   <Mail size={16} className="text-secondary opacity-80 flex-shrink-0" />
                                   <div className="flex-1 font-body text-sm text-on-surface truncate cursor-pointer hover:text-secondary transition-colors hover:underline" onClick={() => window.open(`mailto:${client.email}`)}>{client.email}</div>
                                </div>
                             )}
                           </div>
                        )}

                        <div className="flex items-center gap-3 bg-tertiary-container/30 px-3 py-2 rounded-xl text-tertiary mt-2">
                           <FileText size={16} className="flex-shrink-0" />
                           <div className="font-label text-xs font-bold uppercase tracking-wider">{client.linkedDocuments} Document{client.linkedDocuments !== 1 ? 's' : ''} Associated</div>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
          )}
        </div>
      </main>
    </Layout>
  );
}
