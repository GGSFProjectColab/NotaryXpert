import { Layout } from "../components/layout/Layout";
import { TopBar } from "../components/layout/TopBar";
import { User, SlidersHorizontal, CreditCard, Shield, Info } from "lucide-react";
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export function Settings() {
  const [licenseNumber, setLicenseNumber] = useState("NX-2023-8941");
  const [registerNumber, setRegisterNumber] = useState("");
  const [currentSrNo, setCurrentSrNo] = useState("");
  const [currentPageNo, setCurrentPageNo] = useState("");

  useEffect(() => {
    const savedLicense = localStorage.getItem("notaryLicenseNumber");
    if (savedLicense) setLicenseNumber(savedLicense);

    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, "settings", "config"));
        if (docSnap.exists()) {
           const data = docSnap.data();
           if (data.registerNumber) setRegisterNumber(data.registerNumber);
           if (data.currentSrNo) setCurrentSrNo(data.currentSrNo);
           if (data.currentPageNo) setCurrentPageNo(data.currentPageNo);
        } else {
           const savedRegister = localStorage.getItem("registerNumber");
           if (savedRegister) setRegisterNumber(savedRegister);
        }
      } catch (err) {
        console.error("Failed to fetch settings from Firebase", err);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    localStorage.setItem("notaryLicenseNumber", licenseNumber);
    try {
      await setDoc(doc(db, "settings", "config"), { 
         registerNumber,
         currentSrNo,
         currentPageNo
      }, { merge: true });
      localStorage.setItem("registerNumber", registerNumber);
      alert("Settings saved successfully to Firebase Cloud!");
    } catch (e) {
      console.error("Failed to save to Firebase:", e);
      alert("Failed to save settings to Cloud.");
    }
  };

  return (
    <Layout>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12">
        <div className="max-w-6xl mx-auto w-full">
          <div className="mb-10">
            <h2 className="text-4xl font-headline font-bold text-on-surface mb-2">Account Settings</h2>
            <p className="text-on-surface-variant font-body text-base">Manage your professional profile, preferences, and security configurations.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            <aside className="lg:col-span-3">
              <nav className="flex flex-col gap-1 lg:sticky lg:top-8">
                <a href="#profile" className="px-4 py-3 rounded-lg bg-surface-container-low text-primary font-body font-medium flex items-center gap-3">
                  <User size={20} />
                  Profile Settings
                </a>
                <a href="#preferences" className="px-4 py-3 rounded-lg text-on-surface hover:bg-surface-container-low transition-colors font-body font-medium flex items-center gap-3">
                  <SlidersHorizontal size={20} />
                  App Preferences
                </a>
                <a href="#billing" className="px-4 py-3 rounded-lg text-on-surface hover:bg-surface-container-low transition-colors font-body font-medium flex items-center gap-3">
                  <CreditCard size={20} />
                  Subscription
                </a>
                <a href="#security" className="px-4 py-3 rounded-lg text-on-surface hover:bg-surface-container-low transition-colors font-body font-medium flex items-center gap-3">
                  <Shield size={20} />
                  Security
                </a>
              </nav>
            </aside>

            <div className="lg:col-span-9 flex flex-col gap-12">
              <section id="profile" className="scroll-mt-8">
                <div className="bg-surface-container-lowest rounded-xl p-6 md:p-8 transition-colors hover:bg-surface-bright editorial-shadow">
                  <h3 className="text-2xl font-headline font-bold text-on-surface mb-6">Profile Details</h3>
                  
                  <div className="mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-2">
                        <label className="font-label text-sm font-medium text-on-surface-variant">Full Name</label>
                        <input className="w-full bg-surface-container-high border-transparent rounded-md font-body text-on-surface px-4 py-3 opacity-80 cursor-not-allowed" type="text" value="Sameer Shrikant Vispute" readOnly />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="font-label text-sm font-medium text-on-surface-variant">Professional Title</label>
                        <input className="w-full bg-surface-container-high border-transparent rounded-md font-body text-on-surface px-4 py-3 opacity-80 cursor-not-allowed" type="text" value="Advocate High Court, BLS., LLB., DIPL" readOnly />
                      </div>
                      <div className="flex flex-col gap-2 md:col-span-2">
                        <label className="font-label text-sm font-medium text-on-surface-variant">Email Address</label>
                        <input className="w-full bg-surface-container-high border-transparent rounded-md font-body text-on-surface px-4 py-3 opacity-80 cursor-not-allowed" type="email" value="advsameervispute@gmail.com" readOnly />
                      </div>
                    </div>
                  </div>


                  <div className="border-t border-outline-variant/15 pt-8 mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="font-label text-sm font-medium text-on-surface-variant flex items-center gap-2">
                        Notary License Number
                        <Info size={16} className="text-tertiary cursor-help" />
                      </label>
                      <input 
                        className="w-full bg-surface-container-highest border-transparent focus:border-primary/30 focus:bg-surface-container-lowest focus:ring-0 rounded-md font-body text-on-surface font-mono px-4 py-3 transition-all" 
                        type="text" 
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="font-label text-sm font-medium text-on-surface-variant flex items-center gap-2">
                        Default Register Number
                        <Info size={16} className="text-tertiary cursor-help" />
                      </label>
                      <input 
                        className="w-full bg-surface-container-highest border-transparent focus:border-primary/30 focus:bg-surface-container-lowest focus:ring-0 rounded-md font-body text-on-surface font-mono px-4 py-3 transition-all" 
                        type="text" 
                        value={registerNumber}
                        onChange={(e) => setRegisterNumber(e.target.value)}
                        placeholder="e.g. 123"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="font-label text-sm font-medium text-on-surface-variant flex items-center gap-2">
                        Current Doc Number (Sr No)
                      </label>
                      <input 
                        className="w-full bg-surface-container-highest border-transparent focus:border-primary/30 focus:bg-surface-container-lowest focus:ring-0 rounded-md font-body text-on-surface font-mono px-4 py-3 transition-all" 
                        type="text" 
                        value={currentSrNo}
                        onChange={(e) => setCurrentSrNo(e.target.value)}
                        placeholder="e.g. 1"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="font-label text-sm font-medium text-on-surface-variant flex items-center gap-2">
                        Current Reg.Page No
                      </label>
                      <input 
                        className="w-full bg-surface-container-highest border-transparent focus:border-primary/30 focus:bg-surface-container-lowest focus:ring-0 rounded-md font-body text-on-surface font-mono px-4 py-3 transition-all" 
                        type="text" 
                        value={currentPageNo}
                        onChange={(e) => setCurrentPageNo(e.target.value)}
                        placeholder="e.g. 1"
                      />
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end">
                    <button onClick={handleSave} className="px-6 py-3 gradient-primary text-white rounded-xl font-body font-medium hover:opacity-90 transition-opacity shadow-sm">
                      Save Changes
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}
