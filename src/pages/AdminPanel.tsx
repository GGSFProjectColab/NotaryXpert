import { Layout } from "../components/layout/Layout";
import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc, setDoc } from "firebase/firestore";
import { db } from "../firebaseDb";
import { Loader2, Trash2, Edit, Save, XCircle, AlertTriangle, ExternalLink, Search } from "lucide-react";
import { auth } from "../firebaseAuth"; // For basic user check

interface DocumentData {
  id: string;
  srNo?: string;
  kNo?: string;
  pageNo?: string;
  docName?: string;
  docDate?: string;
  pdfUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
  persons?: any[];
  // Add other fields as necessary
}

interface SettingsData {
  id: string;
  registerNumber?: string;
  currentSrNo?: string;
  currentPageNo?: string;
  // Add other settings fields
}

export function AdminPanel() {
  const [isLoading, setIsLoading] = useState(true);
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [settings, setSettings] = useState<SettingsData[]>([]);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingSettingsId, setEditingSettingsId] = useState<string | null>(null);
  const [currentDocEdit, setCurrentDocEdit] = useState<Partial<DocumentData>>({});
  const [currentSettingsEdit, setCurrentSettingsEdit] = useState<Partial<SettingsData>>({});
  const [personsJsonEdit, setPersonsJsonEdit] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Basic check for authenticated user - IMPORTANT: This is NOT sufficient for admin authorization.
  // You need proper role-based access control (RBAC) for a real admin panel.
  const isAdmin = auth.currentUser !== null; // Placeholder: In a real app, check user roles.

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch Documents
      const docsCollection = collection(db, "documents");
      const docsSnapshot = await getDocs(docsCollection);
      const fetchedDocs: DocumentData[] = docsSnapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate(),
        updatedAt: d.data().updatedAt?.toDate(),
      }));
      setDocuments(fetchedDocs);

      // Fetch Settings
      const settingsCollection = collection(db, "settings");
      const settingsSnapshot = await getDocs(settingsCollection);
      const fetchedSettings: SettingsData[] = settingsSnapshot.docs.map(s => ({
        id: s.id,
        ...s.data(),
      }));
      setSettings(fetchedSettings);

    } catch (err) {
      console.error("Error fetching admin data:", err);
      setError("Failed to fetch data. Check console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    } else {
      setError("Access Denied: You must be logged in to view this page.");
      setIsLoading(false);
    }
  }, [isAdmin]);

  const handleDeleteDocument = async (id: string) => {
    if (!isAdmin) {
      setError("Unauthorized action.");
      return;
    }
    if (window.confirm(`Are you sure you want to delete document ${id}? This action cannot be undone.`)) {
      try {
        await deleteDoc(doc(db, "documents", id));
        setDocuments(prev => prev.filter(d => d.id !== id));
        alert("Document deleted successfully!");
      } catch (err) {
        console.error("Error deleting document:", err);
        setError("Failed to delete document. Check console for details.");
      }
    }
  };

  const handleEditDocument = (docData: DocumentData) => {
    setEditingDocId(docData.id);
    setCurrentDocEdit(docData);
    setPersonsJsonEdit(docData.persons ? JSON.stringify(docData.persons, null, 2) : "[]");
  };

  const handleSaveDocument = async (id: string) => {
    if (!isAdmin) {
      setError("Unauthorized action.");
      return;
    }

    let updatedDocEdit = { ...currentDocEdit };
    try {
      if (personsJsonEdit.trim() !== "") {
        updatedDocEdit.persons = JSON.parse(personsJsonEdit);
      }
    } catch (e) {
      alert("Invalid JSON format in User Data. Please fix it before saving.");
      return;
    }

    try {
      await setDoc(doc(db, "documents", id), updatedDocEdit, { merge: true });
      setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...updatedDocEdit } as DocumentData : d));
      setEditingDocId(null);
      setCurrentDocEdit({});
      setPersonsJsonEdit("");
      alert("Document updated successfully!");
    } catch (err) {
      console.error("Error saving document:", err);
      setError("Failed to save document. Check console for details.");
    }
  };

  const handleCancelEditDocument = () => {
    setEditingDocId(null);
    setCurrentDocEdit({});
    setPersonsJsonEdit("");
  };

  const handleEditSettings = (settingsData: SettingsData) => {
    setEditingSettingsId(settingsData.id);
    setCurrentSettingsEdit(settingsData);
  };

  const handleSaveSettings = async (id: string) => {
    if (!isAdmin) {
      setError("Unauthorized action.");
      return;
    }
    try {
      await setDoc(doc(db, "settings", id), currentSettingsEdit, { merge: true });
      setSettings(prev => prev.map(s => s.id === id ? { ...s, ...currentSettingsEdit } as SettingsData : s));
      setEditingSettingsId(null);
      setCurrentSettingsEdit({});
      alert("Settings updated successfully!");
    } catch (err) {
      console.error("Error saving settings:", err);
      setError("Failed to save settings. Check console for details.");
    }
  };

  const handleCancelEditSettings = () => {
    setEditingSettingsId(null);
    setCurrentSettingsEdit({});
  };

  if (!isAdmin) {
    return (
      <Layout>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8 text-center py-20">
            <AlertTriangle size={48} className="text-red-500 mx-auto" />
            <h2 className="font-headline text-3xl font-bold text-on-surface">Access Denied</h2>
            <p className="font-body text-on-surface-variant text-lg">You do not have permission to view this page. Please log in with an administrator account.</p>
          </div>
        </main>
      </Layout>
    );
  }

  return (
    <Layout>
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <h1 className="font-headline text-4xl font-bold text-on-surface">Admin Panel</h1>
          <p className="font-body text-on-surface-variant text-lg">
            Manage all database entries. <span className="font-bold text-red-500">Use with extreme caution.</span>
            This panel provides direct access to modify and delete critical data.
            <br/>
            <AlertTriangle size={16} className="inline-block mr-1 text-red-500" />
            **WARNING:** This basic implementation assumes the logged-in user is an admin. For production, implement robust Firebase Security Rules and role-based access control.
          </p>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <strong className="font-bold">Error!</strong>
              <span className="block sm:inline"> {error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-20 text-on-surface-variant gap-4">
              <Loader2 size={32} className="animate-spin text-primary" />
              <p className="font-body font-bold uppercase tracking-wider">Loading Admin Data...</p>
            </div>
          ) : (
            <>
              {/* Search Bar */}
              <div className="relative w-full md:w-96 mb-6">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search documents or users by Name, Aadhar..." 
                  className="w-full bg-surface-container-lowest focus:bg-white text-on-surface rounded-xl py-3.5 pl-12 pr-4 border border-outline-variant/20 focus:ring-2 focus:ring-primary/30 outline-none transition-all font-body text-sm shadow-sm"
                />
              </div>

              {/* Documents Section */}
              <section className="bg-surface-container-lowest rounded-xl p-6 editorial-shadow border border-outline-variant/15">
                <h2 className="font-headline text-2xl font-bold text-on-surface mb-4">Documents ({documents.length})</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-outline-variant/15">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">ID</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">Sr No</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">Reg No</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">Page No</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">Doc Name</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">User Data (JSON)</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">Created At</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">PDF URL</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-on-surface-variant uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/15">
                      {documents.filter(docItem => {
                        const q = searchQuery.toLowerCase();
                        if (!q) return true;
                        const matchId = docItem.id.toLowerCase().includes(q);
                        const matchSrNo = docItem.srNo?.toLowerCase().includes(q);
                        const matchDocName = docItem.docName?.toLowerCase().includes(q);
                        const matchPerson = docItem.persons?.some(p => p.name?.toLowerCase().includes(q) || p.aadhar?.toLowerCase().includes(q));
                        return matchId || matchSrNo || matchDocName || matchPerson;
                      }).map(docItem => (
                        <tr key={docItem.id} className="hover:bg-surface-bright">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-on-surface">{docItem.id}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-on-surface">
                            {editingDocId === docItem.id ? (
                              <input
                                type="text"
                                value={currentDocEdit.srNo || ''}
                                onChange={(e) => setCurrentDocEdit(prev => ({ ...prev, srNo: e.target.value }))}
                                className="w-24 p-1 border rounded text-sm bg-surface-container-high"
                              />
                            ) : (
                              docItem.srNo
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-on-surface">
                            {editingDocId === docItem.id ? (
                              <input
                                type="text"
                                value={currentDocEdit.kNo || ''}
                                onChange={(e) => setCurrentDocEdit(prev => ({ ...prev, kNo: e.target.value }))}
                                className="w-24 p-1 border rounded text-sm bg-surface-container-high"
                              />
                            ) : (
                              docItem.kNo
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-on-surface">
                            {editingDocId === docItem.id ? (
                              <input
                                type="text"
                                value={currentDocEdit.pageNo || ''}
                                onChange={(e) => setCurrentDocEdit(prev => ({ ...prev, pageNo: e.target.value }))}
                                className="w-24 p-1 border rounded text-sm bg-surface-container-high"
                              />
                            ) : (
                              docItem.pageNo
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-on-surface">
                            {editingDocId === docItem.id ? (
                              <input
                                type="text"
                                value={currentDocEdit.docName || ''}
                                onChange={(e) => setCurrentDocEdit(prev => ({ ...prev, docName: e.target.value }))}
                                className="w-32 p-1 border rounded text-sm bg-surface-container-high"
                              />
                            ) : (
                              docItem.docName
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-on-surface">
                            {editingDocId === docItem.id ? (
                              <textarea
                                value={personsJsonEdit}
                                onChange={(e) => setPersonsJsonEdit(e.target.value)}
                                className="w-64 min-w-[200px] h-24 p-2 border rounded text-xs bg-surface-container-high font-mono"
                                placeholder="[{}]"
                              />
                            ) : (
                              <div className="truncate text-xs text-on-surface-variant max-w-[150px]" title={docItem.persons ? JSON.stringify(docItem.persons) : '[]'}>
                                {docItem.persons?.length || 0} user(s)
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-on-surface">{docItem.createdAt?.toLocaleDateString() || 'N/A'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-on-surface">
                            {docItem.pdfUrl ? (
                              <a href={docItem.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                View PDF <ExternalLink size={14} />
                              </a>
                            ) : (
                              <span className="text-on-surface-variant italic">No PDF</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                            {editingDocId === docItem.id ? (
                              <div className="flex justify-end gap-2">
                                <button onClick={() => handleSaveDocument(docItem.id)} className="text-primary hover:text-primary-dark p-1 rounded-full hover:bg-primary/10 transition-colors" title="Save">
                                  <Save size={18} />
                                </button>
                                <button onClick={handleCancelEditDocument} className="text-on-surface-variant hover:text-red-500 p-1 rounded-full hover:bg-red-500/10 transition-colors" title="Cancel">
                                  <XCircle size={18} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex justify-end gap-2">
                                <button onClick={() => handleEditDocument(docItem)} className="text-secondary hover:text-secondary-dark p-1 rounded-full hover:bg-secondary/10 transition-colors" title="Edit">
                                  <Edit size={18} />
                                </button>
                                <button onClick={() => handleDeleteDocument(docItem.id)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-500/10 transition-colors" title="Delete">
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Settings Section */}
              <section className="bg-surface-container-lowest rounded-xl p-6 editorial-shadow border border-outline-variant/15">
                <h2 className="font-headline text-2xl font-bold text-on-surface mb-4">Settings ({settings.length})</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-outline-variant/15">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">ID</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">Register Number</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">Current Sr No</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">Current Page No</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-on-surface-variant uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/15">
                      {settings.map(settingItem => (
                        <tr key={settingItem.id} className="hover:bg-surface-bright">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-on-surface">{settingItem.id}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-on-surface">
                            {editingSettingsId === settingItem.id ? (
                              <input
                                type="text"
                                value={currentSettingsEdit.registerNumber || ''}
                                onChange={(e) => setCurrentSettingsEdit(prev => ({ ...prev, registerNumber: e.target.value }))}
                                className="w-24 p-1 border rounded text-sm bg-surface-container-high"
                              />
                            ) : (
                              settingItem.registerNumber
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-on-surface">
                            {editingSettingsId === settingItem.id ? (
                              <input
                                type="text"
                                value={currentSettingsEdit.currentSrNo || ''}
                                onChange={(e) => setCurrentSettingsEdit(prev => ({ ...prev, currentSrNo: e.target.value }))}
                                className="w-24 p-1 border rounded text-sm bg-surface-container-high"
                              />
                            ) : (
                              settingItem.currentSrNo
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-on-surface">
                            {editingSettingsId === settingItem.id ? (
                              <input
                                type="text"
                                value={currentSettingsEdit.currentPageNo || ''}
                                onChange={(e) => setCurrentSettingsEdit(prev => ({ ...prev, currentPageNo: e.target.value }))}
                                className="w-24 p-1 border rounded text-sm bg-surface-container-high"
                              />
                            ) : (
                              settingItem.currentPageNo
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                            {editingSettingsId === settingItem.id ? (
                              <div className="flex justify-end gap-2">
                                <button onClick={() => handleSaveSettings(settingItem.id)} className="text-primary hover:text-primary-dark p-1 rounded-full hover:bg-primary/10 transition-colors" title="Save">
                                  <Save size={18} />
                                </button>
                                <button onClick={handleCancelEditSettings} className="text-on-surface-variant hover:text-red-500 p-1 rounded-full hover:bg-red-500/10 transition-colors" title="Cancel">
                                  <XCircle size={18} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex justify-end gap-2">
                                <button onClick={() => handleEditSettings(settingItem)} className="text-secondary hover:text-secondary-dark p-1 rounded-full hover:bg-secondary/10 transition-colors" title="Edit">
                                  <Edit size={18} />
                                </button>
                                {/* Deleting settings might be dangerous, consider if this should be allowed */}
                                {/* <button onClick={() => handleDeleteSettings(settingItem.id)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-500/10 transition-colors" title="Delete">
                                  <Trash2 size={18} />
                                </button> */}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </Layout>
  );
}