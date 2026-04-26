import { Layout } from "../components/layout/Layout";
import { TopBar } from "../components/layout/TopBar";
import { User, SlidersHorizontal, CreditCard, Shield, Info } from "lucide-react";
import { useState, useEffect } from "react";

export function Settings() {
  const [licenseNumber, setLicenseNumber] = useState("NX-2023-8941");
  const [registerNumber, setRegisterNumber] = useState("");

  useEffect(() => {
    const savedLicense = localStorage.getItem("notaryLicenseNumber");
    const savedRegister = localStorage.getItem("registerNumber");
    if (savedLicense) setLicenseNumber(savedLicense);
    if (savedRegister) setRegisterNumber(savedRegister);
  }, []);

  const handleSave = () => {
    localStorage.setItem("notaryLicenseNumber", licenseNumber);
    localStorage.setItem("registerNumber", registerNumber);
    alert("Settings saved successfully!");
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
                  
                  <div className="flex flex-col md:flex-row gap-8 mb-8">
                    <div className="flex-shrink-0 flex flex-col items-center gap-4">
                      <div className="w-32 h-32 rounded-full overflow-hidden bg-surface-container border-4 border-surface shadow-sm">
                        <img 
                          alt="Profile Photo" 
                          className="w-full h-full object-cover" 
                          src="https://lh3.googleusercontent.com/aida-public/AB6AXuA2ykJjaTP-wHFBbHT5Ly4PPHmyWX8mhCq-5ggI2VUZYdEb8W1MNwVVBWKftFZlsaVZESJtyVAb7SFI214pWe6WCgGZDj2QzSIqdX2X1BztNub0_z0XOx9cjR-wYOZFnsaRiOqRfl7ozCDUgbsV3CNWC3mKuFz-V8Tve6ydWr7Ckf6e8bkwnW-nAV-XAQdP8zgPP-IaxVE4PL4lRL7FiR9Oe3wR0J_Js1lkJyanH73Irqn4zhd5K3OSVH226EScp4c5D8RUmwsPNFbo"
                        />
                      </div>
                      <button className="px-4 py-2 bg-surface-container-high text-primary font-body text-sm font-medium rounded-lg hover:bg-surface-variant transition-colors">
                        Change Photo
                      </button>
                    </div>
                    
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-2">
                        <label className="font-label text-sm font-medium text-on-surface-variant">Full Name</label>
                        <input className="w-full bg-surface-container-highest border-transparent focus:border-primary/30 focus:bg-surface-container-lowest focus:ring-0 rounded-md font-body text-on-surface px-4 py-3 transition-all" type="text" defaultValue="Eleanor Vance" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="font-label text-sm font-medium text-on-surface-variant">Professional Title</label>
                        <input className="w-full bg-surface-container-highest border-transparent focus:border-primary/30 focus:bg-surface-container-lowest focus:ring-0 rounded-md font-body text-on-surface px-4 py-3 transition-all" type="text" defaultValue="Senior Notary Public" />
                      </div>
                      <div className="flex flex-col gap-2 md:col-span-2">
                        <label className="font-label text-sm font-medium text-on-surface-variant">Email Address</label>
                        <input className="w-full bg-surface-container-highest border-transparent focus:border-primary/30 focus:bg-surface-container-lowest focus:ring-0 rounded-md font-body text-on-surface px-4 py-3 transition-all" type="email" defaultValue="e.vance@noteryxpert.com" />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-outline-variant/15 pt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2 md:col-span-2">
                      <label className="font-label text-sm font-medium text-on-surface-variant">Business Address</label>
                      <input className="w-full bg-surface-container-highest border-transparent focus:border-primary/30 focus:bg-surface-container-lowest focus:ring-0 rounded-md font-body text-on-surface px-4 py-3 transition-all" type="text" defaultValue="100 Legal Plaza, Suite 400" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="font-label text-sm font-medium text-on-surface-variant">City</label>
                      <input className="w-full bg-surface-container-highest border-transparent focus:border-primary/30 focus:bg-surface-container-lowest focus:ring-0 rounded-md font-body text-on-surface px-4 py-3 transition-all" type="text" defaultValue="New York" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="font-label text-sm font-medium text-on-surface-variant">State / Zip</label>
                      <div className="flex gap-2">
                        <input className="w-1/3 bg-surface-container-highest border-transparent focus:border-primary/30 focus:bg-surface-container-lowest focus:ring-0 rounded-md font-body text-on-surface px-4 py-3 transition-all" type="text" defaultValue="NY" />
                        <input className="w-2/3 bg-surface-container-highest border-transparent focus:border-primary/30 focus:bg-surface-container-lowest focus:ring-0 rounded-md font-body text-on-surface px-4 py-3 transition-all" type="text" defaultValue="10001" />
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
