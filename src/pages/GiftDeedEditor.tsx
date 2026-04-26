import React, { useState, useRef, useEffect } from "react";
import { Layout } from "../components/layout/Layout";
import { TopBar } from "../components/layout/TopBar";
import { Camera, Fingerprint, Printer, X, RefreshCw, Plus, Gavel, Search, Loader2, Save, UploadCloud, FileText } from "lucide-react";
import { db, storage } from "../firebase";
import { collection, addDoc, getDoc, doc, updateDoc, setDoc, query, orderBy, limit, getDocs } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";

// New interface for a person
interface Person {
  id: string;
  name: string;
  age: string;
  addr: string;
  aadhar: string;
  phone?: string;
  email?: string;
  photo?: string;
  thumb?: string;
}

// Utility Component for Webcam Capture (from original file, slightly adapted)
function WebcamCapture({ onCapture, onClose }: { onCapture: (img: string) => void, onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let active = true;
    async function startCamera() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 } } });
        if (!active) {
           // If the component already unmounted before camera initialization finished!
           s.getTracks().forEach(t => t.stop());
           return;
        }
        streamRef.current = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch (err) {
        if (active) {
          console.error("Camera access error:", err);
          alert("Could not access camera. Please check permissions.");
          onClose();
        }
      }
    }
    startCamera();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach(track => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, []); // Run exactly once on mount!

  const capture = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Flip the context horizontally to un-mirror the captured image,
        // which is more appropriate for an official document photo.
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, 0, 0);
        onCapture(canvas.toDataURL('image/jpeg'));
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm no-print">
      <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-2xl max-w-md w-full border border-outline-variant">
        <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
          <h3 className="font-label font-bold text-sm uppercase tracking-widest text-on-surface">Capture Photo</h3>
          <button onClick={onClose} className="p-2 hover:bg-surface-container-high rounded-full transition-colors"><X size={20}/></button>
        </div>
        <div className="relative aspect-[3/4] bg-black">
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
        </div>
        <div className="p-6 flex justify-center gap-4 bg-surface-container-low">
          <button 
            onClick={capture}
            className="flex items-center gap-2 bg-primary text-on-primary px-8 py-3 rounded-full font-label font-bold uppercase tracking-wider shadow-lg hover:opacity-90 active:scale-95 transition-all"
          >
            <Camera size={20} />
            Capture
          </button>
        </div>
      </div>
    </div>
  );
}

export function GiftDeedEditor() {
  const [srNo, setSrNo] = useState("");
  const [kNo, setKNo] = useState(() => localStorage.getItem("registerNumber") || "");
  const [docName, setDocName] = useState("Gift Deed");
  const [docPurpose, setDocPurpose] = useState("Flat Purpose");
  const [docDate, setDocDate] = useState(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }));
  const [clientName, setClientName] = useState("");
  const [persons, setPersons] = useState<Person[]>([
    { id: `person-${Date.now()}`, name: '', age: '', addr: '', aadhar: '', phone: '', email: '', photo: undefined, thumb: undefined }
  ]);
  const [basePdfFile, setBasePdfFile] = useState<File | null>(null);
  const [basePdfPageCount, setBasePdfPageCount] = useState(0);

  useEffect(() => {
    if (basePdfFile) {
      const getPageCount = async () => {
        try {
          const PDFLib = (window as any).PDFLib;
          if (!PDFLib) return;
          const arrayBuffer = await basePdfFile.arrayBuffer();
          const doc = await PDFLib.PDFDocument.load(arrayBuffer);
          setBasePdfPageCount(doc.getPageCount());
        } catch (e) {
          console.error("Failed to parse PDF pages", e);
        }
      };
      getPageCount();
    } else {
      setBasePdfPageCount(0);
    }
  }, [basePdfFile]);

  const [activeCapture, setActiveCapture] = useState<{ personId: string, type: 'photo' | 'thumb' } | null>(null);

  // --- State Update Handlers ---
  const addPerson = () => {
    setPersons(prev => [...prev, { id: `person-${Date.now()}`, name: '', age: '', addr: '', aadhar: '', phone: '', email: '', photo: undefined, thumb: undefined }]);
  };

  const deletePerson = (id: string) => {
    setPersons(prev => prev.filter(p => p.id !== id));
  };

  const updatePerson = (id: string, field: keyof Person, value: any) => {
    setPersons(prevPersons => prevPersons.map(p => 
        p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const handleCapture = (img: string) => {
    if (!activeCapture) return;
    updatePerson(activeCapture.personId, activeCapture.type, img);
    setActiveCapture(null);
  };

  const startFingerprintScan = async (personId: string) => {
    try {
      // The Mantra MFS100/110 dynamically binds to ports 8000-8005 based on process availability. 
      // We first rapidly ping /info across all possible ports AND device paths to instantly locate the active hardware connection!
      const ports = [8000, 8001, 8002, 8003, 8004, 8005];
      const devicePaths = ['mfs100', 'mfs110']; // Covers both L0 (100) and L1 (110) drivers!
      let activeUrl = null;
      
      for (const port of ports) {
        if (activeUrl) break;
        for (const path of devicePaths) {
          try {
            const infoRes = await Promise.race([
              fetch(`http://127.0.0.1:${port}/${path}/info`),
              new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 150)) // rapid sweep
            ]) as any;
            if (infoRes && infoRes.ok) {
               activeUrl = `http://127.0.0.1:${port}/${path}`;
               break;
            }
          } catch (e) { /* silent sweep */ }
        }
      }

      if (!activeUrl) {
         throw new Error('Mantra Service physically disconnected or not running.');
      }

      // We found the active hardware port and exact device model! 
      const payload = { "Quality": 60, "TimeOut": 15 };
      const response = await fetch(`${activeUrl}/capture`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(payload)
      });

      if (response && response.ok) {
         const data = await response.json();
         if (data && data.Base64BMP && data.Base64BMP.length > 100) {
            updatePerson(personId, 'thumb', `data:image/bmp;base64,${data.Base64BMP}`);
            return;
         }
      }
      throw new Error('Optical Capture Failed or User pulled finger away.');
    } catch (e) {
      // Fallback: If no scanner is detected or the user took too long, fallback cleanly to WebCam
      console.log('Mantra scanner fallback triggered:', e);
      setActiveCapture({ personId, type: 'thumb' });
    }
  };

  const handleFileUpload = (personId: string, type: 'photo' | 'thumb', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updatePerson(personId, type, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    if (e.target) e.target.value = '';
  };

  const [fetchQuery, setFetchQuery] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);

  // Auto-fetch the next logical SrNo strictly when the editor loads
  useEffect(() => {
    const fetchNextSrNo = async () => {
      try {
        const q = query(collection(db, "documents"), orderBy("createdAt", "desc"), limit(1));
        const qs = await getDocs(q);
        if (!qs.empty) {
          const lastDoc = qs.docs[0].data();
          const lastSrNo = parseInt(lastDoc.srNo);
          if (!isNaN(lastSrNo)) {
            setSrNo((lastSrNo + 1).toString());
          } else {
            setSrNo("1");
          }
        } else {
          setSrNo("1");
        }
      } catch (err) {
        console.error("Error calculating next Sr No:", err);
      }
    };
    fetchNextSrNo();
  }, []);

  const [knownClients, setKnownClients] = useState<Person[]>([]);
  const [focusedPersonId, setFocusedPersonId] = useState<string | null>(null);

  // Auto-fetch known clients for autocomplete
  useEffect(() => {
    const fetchKnownClients = async () => {
      try {
        const q = query(collection(db, "documents"), orderBy("createdAt", "desc"));
        const qs = await getDocs(q);
        
        const clientMap = new Map<string, Person>();
        
        qs.docs.forEach(docSnap => {
          const data = docSnap.data();
          if (data.persons && Array.isArray(data.persons)) {
             data.persons.forEach((person: any) => {
                if (!person.name || person.name.trim() === '') return;
                
                const validAadhar = person.aadhar && person.aadhar.trim().length > 5 && !person.aadhar.includes('XXXX-XXXX');
                let uniqueKey = validAadhar ? person.aadhar.trim() : person.name.trim().toLowerCase();
                
                if (!clientMap.has(uniqueKey)) {
                   clientMap.set(uniqueKey, {
                      id: uniqueKey,
                      name: person.name,
                      aadhar: person.aadhar || '',
                      addr: person.addr || '',
                      age: person.age || '',
                      phone: person.phone || '',
                      email: person.email || '',
                      photo: person.photo?.startsWith('http') ? person.photo : undefined,
                      thumb: person.thumb?.startsWith('http') ? person.thumb : undefined
                   });
                } else {
                   const existing = clientMap.get(uniqueKey)!;
                   if (!existing.photo && person.photo && person.photo.startsWith('http')) existing.photo = person.photo;
                   if (!existing.thumb && person.thumb && person.thumb.startsWith('http')) existing.thumb = person.thumb;
                   if (!existing.phone && person.phone) existing.phone = person.phone;
                   if (!existing.email && person.email) existing.email = person.email;
                }
             });
          }
        });
        
        setKnownClients(Array.from(clientMap.values()));
      } catch (error) {
        console.error("Error scraping clients for autofill:", error);
      }
    };
    
    fetchKnownClients();
  }, []);

  const autofillPerson = (personId: string, clientData: Person) => {
      setPersons(prev => prev.map(p => 
          p.id === personId ? { ...p, ...clientData, id: p.id } : p
      ));
      setFocusedPersonId(null);
  };

  const handleAutoFetch = async (queryParam: string) => {
    setFetchQuery(queryParam);
    // Firebase IDs are usually 20 characters long
    if (queryParam.trim().length >= 20) {
      setIsFetching(true);
      try {
        const docRef = doc(db, "documents", queryParam.trim());
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.srNo) setSrNo(data.srNo);
          if (data.kNo) setKNo(data.kNo);
          if (data.docDate) setDocDate(data.docDate);
          if (data.persons) setPersons(data.persons);
          if (data.pdfUrl) setPdfUrl(data.pdfUrl);
        } else {
          console.warn("No document found with that ID.");
        }
      } catch (error) {
        console.error("Error fetching doc:", error);
      } finally {
        setIsFetching(false);
      }
    }
  };

  const getSafeImageUrl = (url?: string) => {
    if (!url) return '';
    // If it's already a base64 encoded local capture or safe source, pass through
    if (url.startsWith('data:image')) return url;
    // Otherwise use public proxy for html2canvas bypass on cross-origin storage
    return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  };

  const handleSaveToFirebase = async (overridePdfUrl?: string, silent: boolean = false) => {
    if (!silent) setIsSaving(true);
    try {
      // Deep clone persons and strip out any 'undefined' values (Firestore rejects undefined)
      const personsToSave = persons.map(p => {
        const newP: any = { ...p };
        if (newP.photo === undefined) delete newP.photo;
        if (newP.thumb === undefined) delete newP.thumb;
        return newP;
      });
      
      for (let i = 0; i < personsToSave.length; i++) {
        const p = personsToSave[i];
        
        // Upload photo if it's a new base64 string
        if (p.photo && String(p.photo).startsWith('data:image')) {
          console.log(`Uploading photo for person ${i} to Firebase Storage...`);
          const photoRef = ref(storage, `documents/${Date.now()}_${i}_photo`);
          const downloadUrl = await Promise.race([
            uploadString(photoRef, p.photo, 'data_url').then(() => getDownloadURL(photoRef)),
            new Promise<string>((_, r) => setTimeout(() => r(new Error('Firebase Storage photo upload timed out! Check Storage Rules.')), 15000))
          ]);
          p.photo = downloadUrl;
          console.log(`Photo ${i} uploaded successfully.`);
        }
        
        // Upload thumb if it's a new base64 string
        if (p.thumb && String(p.thumb).startsWith('data:image')) {
          console.log(`Uploading thumb for person ${i} to Firebase Storage...`);
          const thumbRef = ref(storage, `documents/${Date.now()}_${i}_thumb`);
          const downloadUrl = await Promise.race([
            uploadString(thumbRef, p.thumb, 'data_url').then(() => getDownloadURL(thumbRef)),
            new Promise<string>((_, r) => setTimeout(() => r(new Error('Firebase Storage thumb upload timed out! Check Storage Rules.')), 15000))
          ]);
          p.thumb = downloadUrl;
          console.log(`Thumb ${i} uploaded successfully.`);
        }
      }

      const docData = {
        srNo: srNo || "",
        kNo: kNo || "",
        docDate: docDate || "",
        clientName: clientName || "",
        persons: personsToSave,
        pdfUrl: overridePdfUrl || pdfUrl || null,
        updatedAt: new Date()
      };

      console.log('Sending final data package to Firestore DB...', docData);
      if (fetchQuery.trim().length >= 20) {
        // Update existing document
        const docRef = doc(db, "documents", fetchQuery.trim());
        await Promise.race([
          setDoc(docRef, docData, { merge: true }),
          new Promise((_, r) => setTimeout(() => r(new Error('Firestore update timed out! Check Firestore Rules.')), 10000))
        ]);
        if (!silent) alert(`Document updated successfully in Firebase!\n\nDocument ID: ${docRef.id}`);
      } else {
        // Create new document
        (docData as any).createdAt = new Date();
        const docRef = await Promise.race([
           addDoc(collection(db, "documents"), docData),
           new Promise<any>((_, r) => setTimeout(() => r(new Error('Firestore addDoc timed out! Check Firestore Rules.')), 10000))
        ]);
        if (!silent) alert(`Document saved successfully to Firebase!\n\nDocument ID: ${docRef.id}`);
        setFetchQuery(docRef.id);
      }
      console.log('Firebase Save transaction completed securely!');
    } catch (error) {
      console.error("Error saving to Firebase:", error);
      if (!silent) alert("Failed to save document to Firebase. Check console for details.");
      throw error; // bubble up so the generator knows it failed
    } finally {
      if (!silent) setIsSaving(false);
    }
  };

  const generateMergedPdfBlob = async (): Promise<Blob> => {
      const element = document.getElementById('document-to-print');
      if (!element) throw new Error("Document preview block not found.");
      const html2pdf = (window as any).html2pdf;
      if (!html2pdf) throw new Error("PDF Library missing, please wait or refresh.");

      const opt = {
        margin:       0,
        filename:     `NotaryDoc_${srNo || '01'}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { 
           scale: 2, 
           useCORS: true,
           onclone: (doc: Document) => {
              const inputs = doc.querySelectorAll('input, textarea');
              inputs.forEach((input: any) => {
                 input.style.border = 'none';
                 input.style.fontWeight = 'normal';
                 input.classList.remove('border-b', 'border-dashed', 'border-[#0000004d]', 'font-bold');
              });
           }
        },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
      };

      const notaryPdfArrayBuffer = await html2pdf().set(opt).from(element).output('arraybuffer');

      if (basePdfFile) {
         try {
             const PDFLib = (window as any).PDFLib;
             if (!PDFLib) throw new Error("PDF Library missing.");
             const basePdfBytes = await basePdfFile.arrayBuffer();
             const docA = await PDFLib.PDFDocument.load(basePdfBytes);
             const docB = await PDFLib.PDFDocument.load(notaryPdfArrayBuffer);
             const mergedDoc = await PDFLib.PDFDocument.create();
             const copiedPagesA = await mergedDoc.copyPages(docA, docA.getPageIndices());
             copiedPagesA.forEach((page: any) => mergedDoc.addPage(page));
             const copiedPagesB = await mergedDoc.copyPages(docB, docB.getPageIndices());
             copiedPagesB.forEach((page: any) => mergedDoc.addPage(page));
             const mergedPdfBytes = await mergedDoc.save();
             return new Blob([mergedPdfBytes], { type: 'application/pdf' });
         } catch (e) {
             console.error("PDF Merge Failed:", e);
             alert("Failed to merge the Original PDF. Processing the standalone Notary Page instead.");
         }
      }
      return new Blob([notaryPdfArrayBuffer], { type: 'application/pdf' });
  };

  const handleAutoGenerateAndUploadPdf = async () => {
    setIsUploadingPdf(true);
    try {
      const mergedBlob = await generateMergedPdfBlob();
      const finalFile = new File([mergedBlob], `Merged_Document_${srNo || '01'}.pdf`, { type: 'application/pdf' });

      const cloudName = "dsyow3tjq";
      const formData = new FormData();
      formData.append("file", finalFile);
      formData.append("upload_preset", "notery");

      // Auto route pushes PDFs to the global /auto handler so Cloudinary sorts the asset
      console.log('Sending PDF binary to Cloudinary...');
      const response = await Promise.race([
         fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
           method: "POST",
           body: formData,
         }),
         new Promise<Response>((_, r) => setTimeout(() => r(new Error('Cloudinary upload timed out! Your network may be blocking it.')), 25000))
      ]);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || "Cloudinary configuration failure.");
      }

      const data = await response.json();
      const newPdfUrl = data.secure_url;
      setPdfUrl(newPdfUrl);
      
      // Auto-save EVERYTHING to Firebase unconditionally silently
      await handleSaveToFirebase(newPdfUrl, true);
      
      alert("Success! PDF automatically generated from screen, uploaded to Cloudinary, and ENTIRE document securely saved to your Database!");
      
    } catch (error: any) {
       console.error("PDF Auto-gen/Upload Error:", error);
       alert(`Action failed: ${error.message}`);
    } finally {
       setIsUploadingPdf(false);
    }
  };

  const handlePrint = async () => {
    if (basePdfFile) {
       // We have an uploaded base PDF, so we must structurally merge before handing it to the OS printer!
       try {
           setIsUploadingPdf(true); // Re-use the existing loading UI spinner on the button
           const mergedBlob = await generateMergedPdfBlob();
           const blobUrl = URL.createObjectURL(mergedBlob);
           window.open(blobUrl, '_blank'); // Opens the natively merged PDF perfectly in the browser's PDF viewer for flawless printing
       } catch (e) {
           console.error("Print Merge Error:", e);
           alert("Failed to merge original document for printing. Dropping back to standalone Notary layout print.");
           window.print();
       } finally {
           setIsUploadingPdf(false);
       }
    } else {
       // Just standard flawless HTML single-page print handling
       window.print();
    }
  };



  return (
    <Layout>
      <div className="no-print">
        <TopBar />
      </div>

      {/* WebCam Modal for both Face and Thumb captures */}
      {activeCapture && (
        <WebcamCapture
          onCapture={handleCapture}
          onClose={() => setActiveCapture(null)}
        />
      )}
      
      <main className="flex-1 overflow-y-auto w-full p-0 flex flex-col items-center pb-24 bg-[#525659] print:bg-white print:p-0">
        
        <div className="w-full max-w-4xl bg-surface-container-lowest p-6 rounded-xl editorial-shadow my-6 no-print border border-outline-variant/15 font-body">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
             <div className="flex flex-col">
               <h2 className="font-headline text-3xl font-bold text-on-surface">Data Entry</h2>
               <p className="text-on-surface-variant font-body text-sm mt-1">Configure all document variables below. Changes auto-sync to the print preview.</p>
             </div>
             <div className="flex gap-3">
               <button onClick={handleAutoGenerateAndUploadPdf} disabled={isUploadingPdf} className={`flex items-center gap-2 px-5 py-3 rounded-xl font-body font-bold shadow-sm transition-all text-sm uppercase tracking-wider whitespace-nowrap ${isUploadingPdf ? 'bg-surface-variant text-on-surface-variant opacity-70 cursor-not-allowed' : 'bg-tertiary-container text-on-tertiary-container hover:opacity-90 active:scale-95'}`}>
                 {isUploadingPdf ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
                 {isUploadingPdf ? "Generating..." : "Generate & Upload PDF"}
               </button>
               {pdfUrl && (
                  <button onClick={() => window.open(pdfUrl, '_blank')} className="flex items-center gap-2 bg-green-100 text-green-800 px-5 py-3 rounded-xl font-body font-bold shadow-sm hover:opacity-90 transition-all text-sm uppercase tracking-wider whitespace-nowrap">
                    <FileText size={18} /> View PDF
                  </button>
               )}
               <button 
                  onClick={handlePrint}
                  className="flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-xl font-body font-bold shadow-[0_4px_20px_-4px_rgba(0,99,156,0.4)] hover:opacity-90 active:scale-95 transition-all text-sm uppercase tracking-wider whitespace-nowrap"
                >
                  <Printer size={18} />
                  Print Document
               </button>
             </div>
          </div>

            <div className="relative w-full">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant focus-within:text-primary transition-colors" />
              <input 
                className="w-full bg-surface-container-highest focus:bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/70 rounded-lg py-3 pl-12 pr-12 border border-outline-variant/15 focus:ring-2 focus:ring-primary/30 transition-all font-body text-sm" 
                placeholder="Enter Document ID to auto-fetch from cloud..." 
                value={fetchQuery}
                onChange={(e) => handleAutoFetch(e.target.value)}
                type="text"
              />
              {isFetching && <Loader2 size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-primary animate-spin" />}
            </div>
            <div className="mt-4 p-4 border border-dashed border-outline-variant/40 rounded-xl bg-surface-container-lowest/50 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-on-surface">Original Document (Optional)</span>
                <span className="text-xs text-on-surface-variant font-body">Upload the original Gift Deed PDF. The Notary page will be appended to the END.</span>
              </div>
              <label className="flex items-center gap-2 bg-secondary-container text-on-secondary-container px-4 py-2 rounded-lg font-body font-medium hover:opacity-90 active:scale-95 transition-all text-sm shadow-sm cursor-pointer whitespace-nowrap">
                <FileText size={16} /> 
                {basePdfFile ? 'Change Original PDF' : 'Attach Main PDF'}
                <input 
                   type="file" 
                   accept="application/pdf" 
                   className="hidden" 
                   onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                         setBasePdfFile(e.target.files[0]);
                      }
                   }} 
                />
              </label>
              {basePdfFile && (
                <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1.5 rounded-lg text-xs font-bold">
                  Attached: {basePdfFile.name}
                  <button onClick={() => setBasePdfFile(null)} className="ml-2 hover:text-red-600"><X size={14} /></button>
                </div>
              )}
            </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Sr No</label>
              <input type="text" value={srNo} onChange={(e) => setSrNo(e.target.value)} className="w-full p-3 border border-outline-variant/40 rounded-lg bg-surface focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none transition-all font-medium text-sm" placeholder="e.g. 2024/01" />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Register Number</label>
              <input type="text" value={kNo} onChange={(e) => setKNo(e.target.value)} className="w-full p-3 border border-outline-variant/40 rounded-lg bg-surface focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none transition-all font-medium text-sm" placeholder="e.g. 123" />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Document Name</label>
              <input type="text" value={docName} onChange={(e) => setDocName(e.target.value)} className="w-full p-3 border border-outline-variant/40 rounded-lg bg-surface focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none transition-all font-medium text-sm" placeholder="e.g. Gift Deed" />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Document Purpose</label>
              <input type="text" value={docPurpose} onChange={(e) => setDocPurpose(e.target.value)} className="w-full p-3 border border-outline-variant/40 rounded-lg bg-surface focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none transition-all font-medium text-sm" placeholder="e.g. Flat Purpose" />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Document Date</label>
              <input type="text" value={docDate} onChange={(e) => setDocDate(e.target.value)} className="w-full p-3 border border-outline-variant/40 rounded-lg bg-surface focus:ring-2 focus:ring-primary/20 focus:border-primary/50 outline-none transition-all font-medium text-sm" placeholder="DD MMMM YYYY" />
            </div>
          </div>

          <div className="flex justify-between items-center mb-6 pt-6 border-t border-outline-variant/15">
            <h3 className="font-headline text-xl font-bold text-on-surface">Parties Involved</h3>
            <button onClick={addPerson} className="flex items-center gap-2 bg-secondary-container text-on-secondary-container px-4 py-2.5 rounded-xl font-body font-medium hover:opacity-90 active:scale-95 transition-all text-sm shadow-sm">
              <Plus size={16} /> Add Person
            </button>
          </div>

          <div className="space-y-4">
            {persons.map((person, index) => (
              <div key={person.id} className="p-5 border border-outline-variant/30 rounded-xl bg-surface-container-lowest/50 relative shadow-sm">
                <div className="absolute -left-2 -top-2 w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-xs shadow-md">{index + 1}</div>
                {persons.length > 1 && (
                  <button onClick={() => deletePerson(person.id)} className="absolute -right-2 -top-2 w-6 h-6 rounded-full bg-error text-on-error flex items-center justify-center hover:bg-error/80 shadow-md transition-colors" title="Remove person">
                    <X size={14} />
                  </button>
                )}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-4">
                  <div 
                    className="md:col-span-5 relative" 
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                         setFocusedPersonId(null);
                      }
                    }}
                  >
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Full Name</label>
                    <input 
                      type="text" 
                      value={person.name} 
                      onChange={(e) => updatePerson(person.id, 'name', e.target.value)} 
                      onFocus={() => setFocusedPersonId(person.id)}
                      className="w-full p-2.5 border border-outline-variant/40 rounded-lg bg-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all font-medium text-sm" 
                      placeholder="Start typing to autofill..." 
                    />
                    
                    {focusedPersonId === person.id && person.name.trim().length >= 2 && (
                       <ul className="absolute top-full mt-2 w-full bg-surface-container-lowest text-on-surface border border-outline-variant/30 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] max-h-64 overflow-y-auto z-50">
                         {knownClients.filter(kc => kc.name.toLowerCase().includes(person.name.toLowerCase())).map((match, idx) => (
                             <li key={idx}>
                               <button 
                                  type="button" 
                                  // Use onMouseDown to pre-emptively fire before the input's strictly bound onBlur completely kills the dropdown DOM node!
                                  onMouseDown={(e) => { e.preventDefault(); autofillPerson(person.id, match); }}
                                  className="w-full text-left px-4 py-3 hover:bg-surface-container transition-colors flex justify-between items-center border-b border-outline-variant/10 last:border-0 cursor-pointer"
                               >
                                  <div className="flex flex-col">
                                     <span className="font-bold font-body text-sm">{match.name}</span>
                                     <span className="text-xs text-on-surface-variant font-body truncate max-w-[200px]">{match.addr || match.phone || 'No auxiliary data'}</span>
                                  </div>
                                  <div className="text-primary text-[10px] font-bold uppercase tracking-wider bg-primary/10 px-2 py-1 rounded ml-2 shrink-0">Autofill</div>
                               </button>
                             </li>
                         ))}
                         {knownClients.filter(kc => kc.name.toLowerCase().includes(person.name.toLowerCase())).length === 0 && (
                            <li className="px-4 py-3 text-xs text-on-surface-variant text-center font-body">No historical clients found.</li>
                         )}
                       </ul>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Age</label>
                    <input type="text" value={person.age} onChange={(e) => updatePerson(person.id, 'age', e.target.value)} className="w-full p-2.5 border border-outline-variant/40 rounded-lg bg-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all font-medium text-sm" placeholder="Age" />
                  </div>
                  <div className="md:col-span-5">
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Aadhar Card</label>
                    <input type="text" value={person.aadhar} onChange={(e) => updatePerson(person.id, 'aadhar', e.target.value)} className="w-full p-2.5 border border-outline-variant/40 rounded-lg bg-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all font-medium text-sm" placeholder="XXXX-XXXX-XXXX" />
                  </div>
                  <div className="md:col-span-12">
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Residential Address</label>
                    <input type="text" value={person.addr} onChange={(e) => updatePerson(person.id, 'addr', e.target.value)} className="w-full p-2.5 border border-outline-variant/40 rounded-lg bg-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all font-medium text-sm" placeholder="Complete address..." />
                  </div>
                  <div className="md:col-span-6">
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Phone (Optional)</label>
                    <input type="text" value={person.phone || ''} onChange={(e) => updatePerson(person.id, 'phone', e.target.value)} className="w-full p-2.5 border border-outline-variant/40 rounded-lg bg-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all font-medium text-sm" placeholder="+91 XXXXX XXXXX" />
                  </div>
                  <div className="md:col-span-6">
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Email (Optional)</label>
                    <input type="email" value={person.email || ''} onChange={(e) => updatePerson(person.id, 'email', e.target.value)} className="w-full p-2.5 border border-outline-variant/40 rounded-lg bg-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all font-medium text-sm" placeholder="client@example.com" />
                  </div>
                  
                  <div className="md:col-span-12 mt-1 pt-4 border-t border-outline-variant/20 flex flex-wrap gap-4 items-center">
                    <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mr-2">Biometrics:</span>
                    <div className="flex gap-2 items-center">
                      <button onClick={() => setActiveCapture({ personId: person.id, type: 'photo' })} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors font-medium text-xs">
                        <Camera size={14} /> {person.photo ? 'Retake Photo' : 'Capture Photo'}
                      </button>
                      <label className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high text-on-surface-variant rounded hover:bg-surface-container-highest transition-colors cursor-pointer font-medium text-xs shadow-sm">
                        Upload Image <input type="file" hidden accept="image/*" onChange={(e) => handleFileUpload(person.id, 'photo', e)} />
                      </label>
                    </div>
                    <div className="w-[1px] h-6 bg-outline-variant/30 hidden md:block"></div>
                    <div className="flex gap-2 items-center">
                      <button onClick={() => startFingerprintScan(person.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors font-medium text-xs">
                        <Fingerprint size={14} /> {person.thumb ? 'Rescan Thumbprint' : 'Scan Thumbprint'}
                      </button>
                      <label className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high text-on-surface-variant rounded hover:bg-surface-container-highest transition-colors cursor-pointer font-medium text-xs shadow-sm">
                        Upload Thumb <input type="file" hidden accept="image/*" onChange={(e) => handleFileUpload(person.id, 'thumb', e)} />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div id="document-to-print" className="w-full flex flex-col items-center print:block print:w-[210mm] print:m-0 print:p-0">
          {(() => {
            const chunks = [];
            const intermediateLimit = persons.filter(p => p.email && p.phone).length > 3 ? 3 : 4;

            if (persons.length === 3) {
              chunks.push(persons.slice(0, 2));
              chunks.push(persons.slice(2, 3));
            } else if (persons.length > 0) {
              chunks.push(persons.slice(0, 3));
              let i = 3;
              while (i < persons.length) {
                let remaining = persons.length - i;
                if (remaining <= 3) {
                  chunks.push(persons.slice(i, i + remaining));
                  i += remaining;
                } else if (remaining === 4 && intermediateLimit === 4) {
                  chunks.push(persons.slice(i, i + 3));
                  i += 3;
                } else {
                  chunks.push(persons.slice(i, i + intermediateLimit));
                  i += intermediateLimit;
                }
              }
            } else {
              chunks.push([]);
            }
            return chunks.map((chunk, pageIndex) => {
              const isLastPage = pageIndex === chunks.length - 1;

              return (
               <article 
                  key={pageIndex} 
                  className={`bg-[#ffffff] w-[210mm] min-h-[297mm] overflow-visible shadow-[0_4px_12px_rgba(0,0,0,0.2)] relative flex flex-col p-[15mm] box-border print:shadow-none print:w-[210mm] print:max-w-none print:p-[15mm] print:m-0 ${pageIndex > 0 ? 'mt-8 print:mt-0 html2pdf__page-break' : 'my-[20px] print:m-0'}`} 
                  style={{ fontFamily: '"Times New Roman", serif', pageBreakAfter: isLastPage ? 'auto' : 'always' }}
               >
                 
                 {pageIndex === 0 && (
                   <>
                     <div className="text-center">
                       <h2 className="font-bold text-2xl m-0">Adv. Sameer Shrikant Vispute</h2>
                       <small>Bombay High Court Notary (Govt. of India) Reg. No. 57704 </small>
                       <br />
                       <small>Shree Bhagwati Krupa, Pendse Nagar, Lane No 2, Dombivli (E), Dist. Thane - 421201.</small>
                     </div>

                     <div className="flex justify-between mt-4">
                       <div>Sr No: <span className="font-bold print:font-normal">{srNo}</span></div>
                       <div>Date: <span className="font-bold print:font-normal">{docDate}</span></div>
                     </div>
                     <div>Register Number - <span className="font-bold print:font-normal">{kNo}</span></div>
                     
                     <hr style={{ margin: "10px 0", borderTop: "1px solid black", borderBottom: 'none', borderLeft: 'none', borderRight: 'none' }} />
                   </>
                 )}

                 <div className="flex-grow">
                   {chunk.map((person, index) => (
                     <div key={person.id}>
                       <div className="mt-[10px]">
                         <p style={{ lineHeight: 1.3, margin: 0, marginBottom: '16px' }}>
                           I Mr <span className="font-bold print:font-normal">{person.name}</span> aged <span className="font-bold print:font-normal ml-1">{person.age}</span> yrs.<br />
                           Residing at <span className="font-bold print:font-normal">{person.addr}</span><br />
                           Aadhar Card No: <span className="font-bold print:font-normal">{person.aadhar}</span>
                           {person.phone && <><br />Phone: <span className="font-bold print:font-normal">{person.phone}</span></>}
                           {person.email && <><br />Email: <span className="font-bold print:font-normal">{person.email}</span></>}
                         </p>
                         <div className="flex justify-between items-center mt-4">
                           <div className="flex flex-col items-center">
                             <div className="w-[120px] h-[120px] border border-[#000000] relative flex items-center justify-center bg-[#f9fafb] overflow-hidden">
                               {person.photo && <img src={getSafeImageUrl(person.photo)} crossOrigin="anonymous" className="w-full h-full object-cover" alt="Captured" />}
                             </div>
                           </div>
                           
                           <div>
                             <div className="w-[200px] border-t border-[#000000] text-center mt-[20px] font-bold">Signature</div>
                           </div>
                           
                           <div className="flex flex-col items-center">
                             <div className="w-[120px] h-[80px] border border-[#000000] relative flex items-center justify-center bg-[#f9fafb] overflow-hidden">
                               {person.thumb && <img src={getSafeImageUrl(person.thumb)} crossOrigin="anonymous" className="w-full h-full object-contain p-1" alt="Thumbprint" />}
                             </div>
                           </div>
                         </div>
                       </div>
                       <hr style={{ margin: "8px 0", borderTop: "1px solid black", borderBottom: 'none', borderLeft: 'none', borderRight: 'none' }} />
                     </div>
                   ))}
                   
                   {isLastPage && (
                     <>
                        <p style={{ marginTop: '16px', lineHeight: '1.5' }}>
                          That we have executed the annexed {docName || 'Gift Deed'} on <span className="font-bold print:font-normal">{docDate}</span>.<br />
                          Pertaining to {docPurpose || 'Flat Purpose'}.<br />
                          Signed beside our photo herein above & document contains {basePdfPageCount + chunks.length} pages.
                        </p>
                       <hr style={{ margin: "8px 0", borderTop: "1px solid black", borderBottom: 'none', borderLeft: 'none', borderRight: 'none' }} />
                     </>
                   )}
                 </div>

                 {isLastPage && (
                   <>
                     <div className="absolute bottom-[80px] left-[60px]"><b>NOTARY</b><br/>Govt. of India</div>
                     <div className="absolute bottom-[80px] right-[60px] text-center">BEFORE ME<br/><b>ADVOCATE & NOTARY</b></div>
                   </>
                 )}
                 
                 <div className="absolute bottom-[30px] left-0 right-0 text-center text-xs text-black/70">
                   Page {pageIndex + 1} of {chunks.length}
                 </div>
               </article>
             );
            });
          })()}
        </div>
      </main>
    </Layout>
  );
}
