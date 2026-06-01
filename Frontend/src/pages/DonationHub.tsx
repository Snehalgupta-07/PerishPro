import React, { useState, useEffect, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import { motion, AnimatePresence } from 'motion/react';
import { 
  HeartHandshake, Building2, Send, CheckCircle2, 
  ChevronRight, ArrowLeft, Search, Plus, Minus, Download, MapPin, Phone, Mail
} from 'lucide-react';
import { listProducts } from '../services/productService';
import { createDonation, listDonations } from '../services/donationService';

interface ApiProduct {
  _id: string;
  name: string;
  category: string;
  stock?: { quantity: number; unit: string };
  perishable?: { daysToExpiry: number; expiryDate: string };
  pricing?: { costPrice: number; mrp: number };
  aiMetrics?: { spoilageRisk?: string };
}

interface DonationItem {
  product: ApiProduct;
  donateQty: number;
}

const PRE_SEEDED_SHELTERS = [
  { name: 'Feeding India Hub', email: 'hello@feedingindia.org', phone: '+91 9876543210', address: '123 Charity Lane, New Delhi' },
  { name: 'Robin Hood Army', email: 'volunteer@robinhoodarmy.com', phone: '+91 8765432109', address: '45 Impact Road, Mumbai' },
  { name: 'Community Hope Kitchen', email: 'kitchen@communityhope.org', phone: '+1 555-0198', address: '789 Relief Avenue, Local' },
];

const DonationHub: React.FC = () => {
  const [step, setStep] = useState(1);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  
  const [selectedItems, setSelectedItems] = useState<{ [key: string]: DonationItem }>({});
  const [shelterInfo, setShelterInfo] = useState(PRE_SEEDED_SHELTERS[0]);
  const [pickupDate, setPickupDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch all active/expiring/low-stock products
      const pRes = await listProducts({ limit: 100 });
      if (pRes?.products) {
        setProducts(pRes.products.filter((p: any) => p.stock?.quantity > 0));
      }
      
      const dRes = await listDonations();
      if (dRes?.donations) setHistory(dRes.donations);
    } catch (err) {
      console.error('Failed to fetch data', err);
    }
  };

  const handleQtyChange = (product: ApiProduct, change: number) => {
    setSelectedItems(prev => {
      const current = prev[product._id];
      const maxQty = product.stock?.quantity || 0;
      let newQty = current ? current.donateQty + change : change;
      
      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[product._id];
        return copy;
      }
      if (newQty > maxQty) newQty = maxQty;
      
      return { ...prev, [product._id]: { product, donateQty: newQty } };
    });
  };

  const handleDispatch = async () => {
    setIsSubmitting(true);
    try {
      const itemsPayload = Object.values(selectedItems).map(item => ({
        productId: item.product._id,
        quantity: item.donateQty
      }));
      
      const res = await createDonation({
        items: itemsPayload,
        shelterInfo,
        pickupDate
      });
      
      if (res.success) {
        setSuccessResult(res);
        setStep(4); // Success step
        fetchData(); // Refresh history
      }
    } catch (error: any) {
      alert(error.toString() || 'Failed to dispatch');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateManifestPDF = (donation: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(59, 130, 246); // Blue-500
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('DONATION MANIFEST & TAX RECEIPT', 14, 25);
    
    // Info section
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date Issued: ${new Date().toLocaleDateString()}`, 14, 50);
    doc.text(`Dispatch Status: Confirmed`, 14, 55);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Shelter Details:', 14, 70);
    doc.setFont('helvetica', 'normal');
    doc.text(donation.shelterInfo.name, 14, 76);
    doc.text(donation.shelterInfo.address, 14, 82);
    doc.text(donation.shelterInfo.phone, 14, 88);
    
    // Summary
    doc.setFillColor(243, 244, 246);
    doc.rect(120, 65, 75, 25, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('Total Write-off Value:', 125, 75);
    doc.setFontSize(14);
    doc.setTextColor(22, 163, 74); // Green
    doc.text(`${donation.totalWriteOffValue.toFixed(2)}`, 125, 83);
    
    // Table Header
    let y = 105;
    doc.setFillColor(229, 231, 235);
    doc.rect(14, y, pageWidth - 28, 10, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Product Name', 16, y + 7);
    doc.text('Category', 90, y + 7);
    doc.text('Quantity', 130, y + 7);
    doc.text('Value', 170, y + 7);
    
    // Table Rows
    y += 15;
    doc.setFont('helvetica', 'normal');
    donation.items.forEach((item: any) => {
      doc.text(item.name, 16, y);
      doc.text(item.category, 90, y);
      doc.text(`${item.quantity} ${item.unit}`, 130, y);
      doc.text(`${(item.quantity * item.costPrice).toFixed(2)}`, 170, y);
      y += 10;
      doc.setDrawColor(229, 231, 235);
      doc.line(14, y - 5, pageWidth - 14, y - 5);
    });
    
    y += 20;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Note: These items have been verified for safe consumption. This receipt serves as an official proof', 14, y);
    doc.text('of charitable donation for tax-deduction purposes.', 14, y + 5);
    
    doc.save(`Donation_Manifest_${new Date().getTime()}.pdf`);
  };

  // Derived stats
  const totalDonatedValue = useMemo(() => history.reduce((acc, curr) => acc + curr.totalWriteOffValue, 0), [history]);
  const totalMeals = useMemo(() => history.reduce((acc, curr) => acc + (curr.totalItemsCount * 1.5), 0), [history]);
  const selectedValues = useMemo(() => {
    let count = 0; let value = 0;
    Object.values(selectedItems).forEach(i => { count += i.donateQty; value += i.donateQty * (i.product.pricing?.costPrice || 0); });
    return { count, value };
  }, [selectedItems]);

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <HeartHandshake className="text-blue-600" size={32} />
            Donation Hub
          </h1>
          <p className="text-gray-500 mt-1">Transform safe surplus food into community impact & tax savings.</p>
        </div>
        {step > 1 && step < 4 && (
          <button onClick={() => setStep(step - 1)} className="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-medium transition-colors">
            <ArrowLeft size={18} /> Back
          </button>
        )}
      </div>

      {/* Stats row */}
      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/30">
            <p className="text-blue-100 font-medium text-sm">Total Tax Write-off Value</p>
            <p className="text-4xl font-bold mt-2">${totalDonatedValue.toFixed(2)}</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg shadow-green-500/30">
            <p className="text-green-100 font-medium text-sm">Est. Meals Contributed</p>
            <p className="text-4xl font-bold mt-2">{Math.floor(totalMeals)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <p className="text-gray-500 font-medium text-sm">Dispatches Completed</p>
            <p className="text-4xl font-bold mt-2 text-gray-900">{history.length}</p>
          </div>
        </div>
      )}

      {/* Wizard */}
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">Step 1: Select Items to Donate</h2>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input type="text" placeholder="Search inventory..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-64" />
                </div>
                <button 
                  onClick={() => setStep(2)}
                  disabled={selectedValues.count === 0}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-all"
                >
                  Next Step <ChevronRight size={18} />
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 uppercase tracking-wider text-xs">
                  <tr>
                    <th className="p-4 font-semibold">Product</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold text-right">Available Stock</th>
                    <th className="p-4 font-semibold text-center">Donation Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProducts.map(p => {
                    const days = p.perishable?.daysToExpiry || 0;
                    const risk = p.aiMetrics?.spoilageRisk || 'low';
                    const isUrgent = days <= 5 || risk === 'medium' || risk === 'high';
                    const maxQty = p.stock?.quantity || 0;
                    const selectedQty = selectedItems[p._id]?.donateQty || 0;
                    
                    return (
                      <tr key={p._id} className={`hover:bg-gray-50 transition-colors ${selectedQty > 0 ? 'bg-blue-50/30' : ''}`}>
                        <td className="p-4">
                          <p className="font-medium text-gray-900">{p.name}</p>
                          <p className="text-xs text-gray-500">{p.category} • Cost: ${p.pricing?.costPrice}</p>
                        </td>
                        <td className="p-4">
                          {isUrgent ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              Recommended for Donation
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Standard Inventory
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right font-medium text-gray-600">
                          {maxQty} {p.stock?.unit}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-3">
                            <button onClick={() => handleQtyChange(p, -1)} disabled={selectedQty === 0} className="p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 transition-all">
                              <Minus size={20} />
                            </button>
                            <span className="w-8 text-center font-bold text-lg text-blue-600">{selectedQty}</span>
                            <button onClick={() => handleQtyChange(p, 1)} disabled={selectedQty >= maxQty} className="p-1 rounded-full text-gray-400 hover:text-green-500 hover:bg-green-50 disabled:opacity-30 transition-all">
                              <Plus size={20} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {selectedValues.count > 0 && (
              <div className="bg-blue-50 border-t border-blue-100 p-4 flex justify-between items-center">
                <span className="text-blue-800 font-medium">Selected {selectedValues.count} items for donation</span>
                <span className="text-blue-800 font-bold text-lg">Estimated Tax Write-off: ${selectedValues.value.toFixed(2)}</span>
              </div>
            )}
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Step 2: Shelter Details & Logistics</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-8">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Select Partner Shelter</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {PRE_SEEDED_SHELTERS.map((s, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setShelterInfo(s)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${shelterInfo.name === s.name ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <Building2 className={shelterInfo.name === s.name ? 'text-blue-600' : 'text-gray-400'} size={20} />
                        <h3 className="font-bold text-gray-900">{s.name}</h3>
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mb-1"><MapPin size={12}/> {s.address}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1"><Mail size={12}/> {s.email}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="pt-6 border-t border-gray-100">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Proposed Pickup Date</label>
                <input type="date" value={pickupDate} onChange={e => setPickupDate(e.target.value)} className="w-full md:w-1/2 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div className="pt-6 flex justify-end gap-4">
                <button onClick={() => setStep(3)} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium shadow-md shadow-blue-500/20 transition-all flex items-center gap-2">
                  Review Dispatch <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Step 3: Review & Dispatch</h2>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200 bg-gray-50">
                  <h3 className="font-bold text-gray-800">Dispatch Manifest Summary</h3>
                </div>
                <div className="p-0">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-100">
                      {Object.values(selectedItems).map(item => (
                        <tr key={item.product._id}>
                          <td className="p-4 text-gray-900 font-medium">{item.product.name}</td>
                          <td className="p-4 text-gray-500">{item.product.category}</td>
                          <td className="p-4 text-right font-bold text-blue-600">{item.donateQty} {item.product.stock?.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white shadow-xl">
                <h3 className="text-gray-300 font-medium text-sm mb-4">Value Proposition</h3>
                <div className="mb-4">
                  <p className="text-gray-400 text-xs">Total Items Donated</p>
                  <p className="text-2xl font-bold">{selectedValues.count}</p>
                </div>
                <div className="mb-6">
                  <p className="text-gray-400 text-xs">Tax Write-off Value</p>
                  <p className="text-3xl font-bold text-green-400">${selectedValues.value.toFixed(2)}</p>
                </div>
                
                <div className="border-t border-gray-700 pt-4 mb-6">
                  <p className="text-gray-400 text-xs mb-1">Destination</p>
                  <p className="font-medium">{shelterInfo.name}</p>
                  <p className="text-gray-400 text-xs">{new Date(pickupDate).toLocaleDateString()}</p>
                </div>

                <button 
                  onClick={handleDispatch}
                  disabled={isSubmitting}
                  className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-70 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/30"
                >
                  {isSubmitting ? 'Dispatching...' : <><Send size={18} /> Confirm Dispatch</>}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 4 && successResult && (
          <motion.div key="step4" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 p-10 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={48} />
            </motion.div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Dispatch Successful!</h2>
            <p className="text-gray-500 mb-8">Your donation has been recorded and the shelter has been notified.</p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <button 
                onClick={() => generateManifestPDF(successResult.donation)}
                className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all w-full sm:w-auto justify-center"
              >
                <Download size={18} /> Download Tax Manifest
              </button>
              {successResult.emailPreviewUrl && (
                <a 
                  href={successResult.emailPreviewUrl} 
                  target="_blank" rel="noreferrer"
                  className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all w-full sm:w-auto justify-center"
                >
                  <Mail size={18} /> View Email Alert
                </a>
              )}
            </div>
            
            <button 
              onClick={() => { setStep(1); setSelectedItems({}); }}
              className="text-gray-500 hover:text-gray-800 font-medium underline"
            >
              Return to Hub
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Section */}
      {step === 1 && history.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Dispatches</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                <tr>
                  <th className="p-4 font-semibold">Date</th>
                  <th className="p-4 font-semibold">Shelter</th>
                  <th className="p-4 font-semibold text-center">Items</th>
                  <th className="p-4 font-semibold text-right">Value</th>
                  <th className="p-4 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.map((h, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="p-4 text-gray-900">{new Date(h.donationDate).toLocaleDateString()}</td>
                    <td className="p-4 font-medium text-gray-700">{h.shelterInfo.name}</td>
                    <td className="p-4 text-center">{h.totalItemsCount}</td>
                    <td className="p-4 text-right font-medium text-green-600">${h.totalWriteOffValue.toFixed(2)}</td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => generateManifestPDF(h)}
                        className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors inline-flex"
                        title="Download PDF Manifest"
                      >
                        <Download size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DonationHub;
