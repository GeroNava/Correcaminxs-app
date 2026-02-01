
import React, { useState, useCallback, useEffect } from 'react';
import { 
  Calculator, 
  MapPin, 
  DollarSign, 
  TrendingUp, 
  Navigation, 
  Bird, 
  Send, 
  RefreshCcw, 
  Loader2, 
  ArrowRight, 
  User,
  ChevronDown,
  ShieldCheck,
  AlertTriangle,
  MapIcon,
  Banknote,
  Repeat,
  History,
  Phone,
  Info,
  Printer,
  FileSpreadsheet,
  ClipboardList,
  Compass,
  CloudSun
} from 'lucide-react';
import MapComponent from './components/MapComponent.tsx';
import { Location, Quote, TariffType, DwellingType, PaymentMethod } from './types.ts';
import { calculateShippingFee, estimateTime, geocodeAddress, getRouteData, checkPassesDonBosco, checkSpecialZones } from './utils.ts';

const App: React.FC = () => {
  const [clientName, setClientName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [description, setDescription] = useState('');
  
  const [originAddr, setOriginAddr] = useState('');
  const [destAddr, setDestAddr] = useState('');
  const [origin, setOrigin] = useState<Location | null>(null);
  const [destination, setDestination] = useState<Location | null>(null);
  const [dwellingType, setDwellingType] = useState<DwellingType>('Casa');
  const [dwellingDetail, setDwellingDetail] = useState('');
  const [routeGeometry, setRouteGeometry] = useState<any | null>(null);
  
  const [tariffType, setTariffType] = useState<TariffType>('tarifa3');
  const [itemAmount, setItemAmount] = useState<number>(0);
  const [isItemPaid, setIsItemPaid] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  
  const [activeQuote, setActiveQuote] = useState<Quote | null>(null);
  const [history, setHistory] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [printType, setPrintType] = useState<'ticket' | 'history' | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('correcaminxs_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  // Lógica de sincronización de método de pago y estado de abono
  useEffect(() => {
    if (paymentMethod === 'transfer') {
      setIsItemPaid(true);
    } else if (paymentMethod === 'cash') {
      setIsItemPaid(false);
    }
  }, [paymentMethod]);

  const resetAll = () => {
    setOriginAddr('');
    setDestAddr('');
    setRecipientPhone('');
    setSenderPhone('');
    setClientName('');
    setDescription('');
    setDwellingDetail('');
    setDwellingType('Casa');
    setOrigin(null);
    setDestination(null);
    setRouteGeometry(null);
    setActiveQuote(null);
    setItemAmount(0);
    setIsItemPaid(false);
    setPaymentMethod('cash');
    setTariffType('tarifa3');
  };

  const handleCalculate = async () => {
    if (!originAddr || !destAddr) {
      alert("⚠️ Por favor ingresa dirección de origen y destino.");
      return;
    }
    setIsLoading(true);
    const finalOriginAddr = originAddr.toLowerCase().includes('tandil') ? originAddr : `${originAddr}, Tandil`;
    const finalDestAddr = destAddr.toLowerCase().includes('tandil') ? destAddr : `${destAddr}, Tandil`;

    const resO = await geocodeAddress(finalOriginAddr);
    const resD = await geocodeAddress(finalDestAddr);

    if (!resO || !resD) {
      alert("⚠️ No pudimos encontrar esas direcciones en Tandil.");
      setIsLoading(false);
      return;
    }

    const currentOrigin = { lat: resO.lat, lng: resO.lng, address: finalOriginAddr };
    const currentDest = { lat: resD.lat, lng: resD.lng, address: finalDestAddr };
    setOrigin(currentOrigin);
    setDestination(currentDest);

    const routeInfo = await getRouteData(currentOrigin, currentDest);
    if (!routeInfo) {
      alert("❌ No se encontró una ruta de navegación.");
      setIsLoading(false);
      return;
    }

    setRouteGeometry(routeInfo.geometry);
    const passesDonBosco = checkPassesDonBosco(routeInfo.geometry);
    const isInSpecialZone = checkSpecialZones(currentDest);
    const fee = calculateShippingFee(routeInfo.distanceKm, tariffType, passesDonBosco, isInSpecialZone);
    
    const newQuote: Quote = {
      id: Math.random().toString(36).substring(7).toUpperCase(),
      timestamp: new Date().toLocaleString(),
      origin: currentOrigin,
      destination: currentDest,
      clientName,
      senderPhone,
      recipientPhone,
      description,
      dwellingType,
      dwellingDetail,
      tariffType,
      distanceKm: parseFloat(routeInfo.distanceKm.toFixed(2)),
      shippingFee: fee,
      estimatedTimeMin: estimateTime(routeInfo.distanceKm),
      collectAmount: isItemPaid ? 0 : itemAmount,
      paymentType: 'collect_at_dest',
      paymentMethod,
      totalToCollect: (isItemPaid ? 0 : itemAmount) + fee,
      passesDonBosco,
      isInSpecialZone
    };

    setActiveQuote(newQuote);
    const updatedHistory = [newQuote, ...history].slice(0, 50);
    setHistory(updatedHistory);
    localStorage.setItem('correcaminxs_history', JSON.stringify(updatedHistory));
    setIsLoading(false);
  };

  const exportQuoteToCSV = (quote: Quote) => {
    const headers = "ID,Fecha,Cliente,Origen,Destino,Vivienda,Tel Remitente,Tel Destinatario,Distancia (Km),Envio,Mercaderia,Total,Metodo Pago,Notas\n";
    const row = `${quote.id},${quote.timestamp},"${quote.clientName}","${quote.origin.address}","${quote.destination.address}",${quote.dwellingType},${quote.senderPhone},${quote.recipientPhone},${quote.distanceKm},${quote.shippingFee},${quote.collectAmount},${quote.totalToCollect},${quote.paymentMethod},"${quote.description.replace(/\n/g, ' ')}"\n`;
    
    const blob = new Blob(["\ufeff" + headers + row], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Comanda_${quote.id}_${quote.clientName || 'Correcaminxs'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportHistoryToCSV = () => {
    if (history.length === 0) return;
    const headers = "ID,Fecha,Cliente,Origen,Destino,Vivienda,Tel Remitente,Tel Destinatario,Distancia,Envio,Mercaderia,Total,Metodo,Notas\n";
    const rows = history.map(q => 
      `${q.id},${q.timestamp},"${q.clientName}","${q.origin.address}","${q.destination.address}",${q.dwellingType},${q.senderPhone},${q.recipientPhone},${q.distanceKm},${q.shippingFee},${q.collectAmount},${q.totalToCollect},${q.paymentMethod},"${q.description.replace(/\n/g, ' ')}"`
    ).join("\n");
    
    const blob = new Blob(["\ufeff" + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Historial_Logistico_Correcaminxs.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintTicket = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeQuote) return;
    exportQuoteToCSV(activeQuote);
    setPrintType('ticket');
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const loadFromHistory = (quote: Quote) => {
    setClientName(quote.clientName);
    setSenderPhone(quote.senderPhone);
    setRecipientPhone(quote.recipientPhone);
    setDescription(quote.description);
    setOriginAddr(quote.origin.address || '');
    setDestAddr(quote.destination.address || '');
    setDwellingType(quote.dwellingType);
    setDwellingDetail(quote.dwellingDetail);
    setTariffType(quote.tariffType);
    setItemAmount(quote.collectAmount);
    setIsItemPaid(quote.collectAmount === 0);
    setPaymentMethod(quote.paymentMethod);
    
    setActiveQuote(quote);
    setOrigin(quote.origin);
    setDestination(quote.destination);
    setShowHistory(false);
    setRouteGeometry(null); 
  };

  const sendWhatsApp = () => {
    if (!activeQuote) return;
    
    const pago = activeQuote.paymentMethod === 'cash' ? '💸 COBRAR EN EFECTIVO' : '💳 TRANSFERENCIA';
    const distIdaVuelta = (activeQuote.distanceKm * 2).toFixed(2);
    const itemAbonado = activeQuote.collectAmount === 0;

    let mensajeFinal = `🚀 *SOLICITUD DE DELIVERY - CORRECAMINXS*\n\n`;
    mensajeFinal += `📦 *Datos del Pedido:*\n`;
    mensajeFinal += `• Cliente: ${activeQuote.clientName || 'S/N'}\n`;
    mensajeFinal += `📍 Origen: ${activeQuote.origin.address}\n`;
    mensajeFinal += `📍 Destino: ${activeQuote.destination.address}\n`;
    mensajeFinal += `📞 Tel. Remitente: ${activeQuote.senderPhone || 'S/N'}\n`;
    mensajeFinal += `📞 Tel. Destinatario: ${activeQuote.recipientPhone || 'S/N'}\n`;
    mensajeFinal += `📏 Distancia: ${distIdaVuelta} km (ida y vuelta)\n`;
    mensajeFinal += `💰 Costo del envío: $${activeQuote.shippingFee.toLocaleString()}\n`;
    mensajeFinal += `📝 Descripción: ${activeQuote.description || '*sin descripción*'}\n\n`;
    
    mensajeFinal += `💳 *Forma de Pago:*\n`;
    mensajeFinal += `${pago}\n`;
    if (!itemAbonado) {
      mensajeFinal += `💵 Monto a cobrar en puerta: $${activeQuote.collectAmount.toLocaleString()}\n`;
    }
    mensajeFinal += `💰 Costo del envío: $${activeQuote.shippingFee.toLocaleString()}\n`;
    mensajeFinal += `💎 *TOTAL A COBRAR: $${activeQuote.totalToCollect.toLocaleString()}*\n\n`;

    if (itemAbonado) {
      mensajeFinal += `(✅ La mercadería ya fue abonada al local. El mandadero solo debe cobrar $${activeQuote.shippingFee.toLocaleString()} del envío.)\n\n`;
    } else {
      mensajeFinal += `(📜 El mandadero debe cobrar $${activeQuote.totalToCollect.toLocaleString()} antes de entregar el pedido y luego abonar $${activeQuote.collectAmount.toLocaleString()} en el local.)\n\n`;
    }
    
    mensajeFinal += `⏳ *Aguarda unos instantes mientras el operador confirma tu solicitud y el costo final del envío.*\n`;
    mensajeFinal += `🏁 *¡Gracias por utilizar Correcaminxs!*`;
    
    window.open(`https://wa.me/5492494522832?text=${encodeURIComponent(mensajeFinal)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row h-screen overflow-hidden text-slate-100">
      <aside className="w-full md:w-[480px] bg-black shadow-2xl flex flex-col z-20 h-full border-r border-slate-900">
        <div className="bg-violet-600 p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-white p-2.5 rounded-2xl shadow-xl transform -rotate-3 transition-all hover:rotate-0 cursor-default">
               <Bird className="w-7 h-7 text-violet-600" strokeWidth={3} />
            </div>
            <div>
              <h1 className="text-2xl font-black italic uppercase leading-none tracking-tighter">Correcaminxs</h1>
              <p className="text-[10px] font-bold text-violet-100 uppercase tracking-widest mt-1">LOGÍSTICA URBANA - TANDIL</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowHistory(!showHistory)} className="p-2 hover:bg-violet-500 rounded-xl transition-all" title="Ver Historial">
              <History size={20} />
            </button>
            <button onClick={resetAll} className="p-2 hover:bg-violet-500 rounded-xl transition-all" title="Limpiar todo">
              <RefreshCcw size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {showHistory ? (
            <div className="space-y-4 animate-in slide-in-from-right duration-300">
              <div className="flex justify-between items-center">
                <h2 className="font-black text-violet-400 uppercase text-xs tracking-widest">Consultas Guardadas</h2>
                <button onClick={exportHistoryToCSV} className="flex items-center gap-2 bg-green-600 px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-900/20">
                  <FileSpreadsheet size={14} /> EXPORTAR EXCEL
                </button>
              </div>
              <div className="space-y-3">
                {history.length === 0 ? <p className="text-xs text-slate-600 italic">Historial vacío.</p> : history.map((h) => (
                  <div key={h.id} onClick={() => loadFromHistory(h)} className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800/50 text-[10px] hover:border-violet-500/80 transition-all group cursor-pointer active:scale-95 shadow-lg">
                    <div className="flex justify-between mb-2 font-black text-slate-500 uppercase tracking-tighter">
                      <span>{h.timestamp}</span>
                      <span className="group-hover:text-violet-400 transition-colors">#{h.id}</span>
                    </div>
                    <p className="truncate text-slate-300 font-bold mb-2 text-[11px]">📍 {h.destination.address}</p>
                    <div className="grid grid-cols-2 gap-2 text-[9px] font-black uppercase tracking-tight">
                      <div className="bg-black/40 p-2 rounded-lg border border-slate-800 flex justify-between">
                        <span className="text-slate-500">Envío</span>
                        <span className="text-violet-400">${h.shippingFee}</span>
                      </div>
                      <div className="bg-black/40 p-2 rounded-lg border border-slate-800 flex justify-between">
                        <span className="text-slate-500">Local</span>
                        <span className="text-orange-400">${h.collectAmount}</span>
                      </div>
                    </div>
                    <div className="mt-2 text-right">
                      <span className="text-white font-black text-xs">TOTAL: ${h.totalToCollect}</span>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowHistory(false)} className="w-full py-4 text-xs font-black text-slate-500 uppercase border border-slate-800 rounded-xl hover:bg-white/5 transition-all">Cerrar Historial</button>
            </div>
          ) : (
            <>
              <section className="space-y-3 animate-in fade-in duration-500">
                <div className="flex items-center gap-2 text-violet-400 font-black text-[11px] uppercase tracking-widest">
                  <User size={16} /> Datos de Origen
                </div>
                <div className="space-y-2">
                  <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nombre del Local / Negocio" className="w-full px-4 py-4 bg-slate-900/30 border border-slate-800/80 rounded-2xl font-bold placeholder:text-slate-700 focus:border-violet-600 focus:bg-slate-900/60 outline-none transition-all duration-300 shadow-sm" />
                  <input type="text" value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)} placeholder="Teléfono del Remitente" className="w-full px-4 py-4 bg-slate-900/30 border border-slate-800/80 rounded-2xl font-bold placeholder:text-slate-700 focus:border-violet-600 focus:bg-slate-900/60 outline-none transition-all duration-300 shadow-sm" />
                </div>
              </section>

              <section className="space-y-4 animate-in slide-in-from-left duration-500">
                <div className="flex items-center gap-2 text-violet-400 font-black text-[11px] uppercase tracking-widest">
                  <Navigation size={16} /> Dirección de Entrega
                </div>
                <div className="space-y-3">
                  <div className="relative group">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-500 transition-colors group-focus-within:text-violet-400" size={18} />
                    <input type="text" value={originAddr} onChange={(e) => setOriginAddr(e.target.value)} placeholder="Calle y Nro de Origen..." className="w-full pl-11 pr-4 py-4 bg-slate-900/30 border border-slate-800/80 rounded-2xl font-bold placeholder:text-slate-700 focus:border-violet-600 focus:bg-slate-900/60 outline-none transition-all duration-300 focus:shadow-[0_0_15px_rgba(139,92,246,0.15)]" />
                  </div>
                  <div className="relative group">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500 transition-colors group-focus-within:text-orange-400" size={18} />
                    <input type="text" value={destAddr} onChange={(e) => setDestAddr(e.target.value)} placeholder="Calle y Nro de Destino..." className="w-full pl-11 pr-4 py-4 bg-slate-900/30 border border-slate-800/80 rounded-2xl font-bold placeholder:text-slate-700 focus:border-orange-500 focus:bg-slate-900/60 outline-none transition-all duration-300 focus:shadow-[0_0_15px_rgba(249,115,22,0.15)]" />
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <button onClick={() => setDwellingType('Casa')} className={`py-3 rounded-xl border-2 font-black text-[9px] uppercase transition-all ${dwellingType === 'Casa' ? 'bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-900/20' : 'border-slate-800 text-slate-500'}`}>CASA</button>
                      <button onClick={() => setDwellingType('Departamento')} className={`py-3 rounded-xl border-2 font-black text-[9px] uppercase transition-all ${dwellingType === 'Departamento' ? 'bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-900/20' : 'border-slate-800 text-slate-500'}`}>DEPTO</button>
                      <button onClick={() => setDwellingType('Desconoce')} className={`py-3 rounded-xl border-2 font-black text-[9px] uppercase transition-all ${dwellingType === 'Desconoce' ? 'bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-900/20' : 'border-slate-800 text-slate-500'}`}>¿?</button>
                    </div>
                    {dwellingType === 'Departamento' && (
                      <input type="text" value={dwellingDetail} onChange={(e) => setDwellingDetail(e.target.value)} placeholder="Piso / Dpto / Cuerpo..." className="w-full px-4 py-3 bg-slate-900/30 border border-slate-800 rounded-xl font-bold text-xs focus:border-violet-600 outline-none transition-all" />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative group">
                       <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-slate-300" size={16} />
                       <input type="text" value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} placeholder="Tel. Recibe" className="w-full pl-10 pr-4 py-4 bg-slate-900/30 border border-slate-800/80 rounded-2xl font-bold placeholder:text-slate-700 focus:border-slate-500 outline-none transition-all" />
                    </div>
                    <div className="relative">
                      <select value={tariffType} onChange={(e) => setTariffType(e.target.value as TariffType)} className="w-full px-4 py-4 bg-black border-2 border-slate-800 rounded-2xl font-black text-[10px] uppercase text-white appearance-none cursor-pointer focus:border-violet-600 focus:ring-4 focus:ring-violet-600/10 transition-all outline-none">
                        <option value="tarifa3" className="bg-black text-white py-4 font-bold">TARIFARIO ESTÁNDAR</option>
                        <option value="tarifa2" className="bg-black text-white py-4 font-bold">TARIFA LLUVIA</option>
                        <option value="tarifa1" className="bg-black text-white py-4 font-bold">TARIFA DOMINGO</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-violet-500 pointer-events-none" size={16} />
                    </div>
                  </div>
                </div>
              </section>

              {/* RECORDATORIO TARIFARIO (VERDE Y AMIGABLE) */}
              <div className="bg-emerald-600/20 p-4 rounded-2xl flex items-center gap-3 border border-emerald-500/30 animate-in slide-in-from-top-2 duration-500">
                <div className="bg-emerald-500/20 p-2 rounded-lg">
                  <Info size={18} className="text-emerald-400" />
                </div>
                <p className="text-[10px] font-black text-emerald-400 uppercase leading-tight tracking-tight">
                  RECUERDE MODIFICAR EL TARIFARIO SEGÚN LAS CONDICIONES CLIMÁTICAS O EL DÍA.
                </p>
              </div>

              <section className="space-y-3">
                <div className="flex items-center gap-2 text-violet-400 font-black text-[11px] uppercase tracking-widest">
                  <ClipboardList size={16} /> Descripción del Envío
                </div>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Levantar paquete en.." 
                  className="w-full px-4 py-4 bg-slate-900/30 border border-slate-800/80 rounded-2xl font-bold placeholder:text-slate-700 focus:border-violet-600 focus:bg-slate-900/60 outline-none transition-all min-h-[80px] resize-none"
                />
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 text-violet-400 font-black text-[11px] uppercase tracking-widest">
                  <DollarSign size={16} /> Finanzas del Pedido
                </div>
                <div className="bg-slate-900/20 p-6 rounded-[2.5rem] border border-slate-800/60 space-y-6 shadow-xl">
                  <div>
                    <label className="text-[9px] font-black text-slate-600 uppercase mb-2 block px-2 tracking-widest">Valor Mercadería ($)</label>
                    <input type="number" value={itemAmount || ''} onChange={(e) => setItemAmount(parseFloat(e.target.value) || 0)} placeholder="Ej: 5000" className="w-full px-5 py-4 bg-black border border-slate-800 rounded-2xl font-black text-lg focus:border-violet-600 outline-none transition-all text-white" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setPaymentMethod('cash')} className={`flex items-center justify-center gap-2 py-4 rounded-xl border-2 font-black text-[10px] transition-all duration-300 ${paymentMethod === 'cash' ? 'bg-violet-600 border-violet-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]' : 'border-slate-800 text-slate-600 hover:border-slate-700'}`}>
                      <Banknote size={16} /> EFECTIVO
                    </button>
                    <button onClick={() => setPaymentMethod('transfer')} className={`flex items-center justify-center gap-2 py-4 rounded-xl border-2 font-black text-[10px] transition-all duration-300 ${paymentMethod === 'transfer' ? 'bg-violet-600 border-violet-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]' : 'border-slate-800 text-slate-600 hover:border-slate-700'}`}>
                      <Repeat size={16} /> TRANSFERENCIA
                    </button>
                  </div>

                  <div onClick={() => setIsItemPaid(!isItemPaid)} className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-500 cursor-pointer ${isItemPaid ? 'bg-green-600/10 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.1)]' : 'bg-black border-slate-800'}`}>
                    <div className="flex items-center gap-3">
                      <ShieldCheck className={isItemPaid ? 'text-green-500' : 'text-slate-600'} size={22} />
                      <span className={`text-[11px] font-black uppercase tracking-tight transition-colors ${isItemPaid ? 'text-green-500' : 'text-slate-500'}`}>Mercadería ya abonada</span>
                    </div>
                    <div className={`w-12 h-6 rounded-full relative transition-all duration-300 ${isItemPaid ? 'bg-green-500' : 'bg-slate-800'}`}>
                      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${isItemPaid ? 'translate-x-6 shadow-md' : ''}`} />
                    </div>
                  </div>
                </div>
              </section>

              <button disabled={isLoading} onClick={handleCalculate} className={`w-full py-5 rounded-[2.5rem] font-black text-sm tracking-widest flex items-center justify-center gap-3 transition-all transform active:scale-95 ${isLoading ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-violet-600 hover:bg-violet-700 shadow-2xl shadow-violet-900/40'}`}>
                {isLoading ? <Loader2 className="animate-spin" /> : <Calculator size={22} />} CALCULAR ENVIO
              </button>

              {activeQuote && (
                <div id="quote-result" className="bg-slate-900/40 rounded-[3rem] p-7 border border-white/5 space-y-7 animate-in slide-in-from-bottom-5 duration-700 shadow-2xl">
                  <div className="flex justify-between items-center">
                    <h2 className="text-violet-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                       <TrendingUp size={14} /> RESULTADO FINAL
                    </h2>
                    <div className="bg-white/5 px-3 py-1 rounded-full"><span className="text-[9px] font-bold text-slate-600 tracking-tighter">ID: #{activeQuote.id}</span></div>
                  </div>

                  <div className="bg-black/60 p-6 rounded-[2rem] border border-white/5 space-y-4">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-600 uppercase">Costo Envío</p>
                        <p className="text-4xl font-black text-white italic tracking-tighter">${activeQuote.shippingFee.toLocaleString()}</p>
                      </div>
                      <div className="text-right pb-1">
                        <p className="text-[10px] text-violet-400 font-black italic flex items-center justify-end gap-1"><MapIcon size={12} /> {activeQuote.distanceKm}km</p>
                        <p className="text-[8px] text-slate-600 font-bold uppercase mt-1">Estimado: {activeQuote.estimatedTimeMin} min</p>
                      </div>
                    </div>

                    <div className="bg-red-600 p-3 rounded-2xl flex items-start gap-3 border border-red-500 shadow-lg shadow-red-900/20">
                      <Info size={14} className="text-white shrink-0 mt-0.5" />
                      <p className="text-[10px] font-black text-white uppercase leading-tight italic">
                        ⚠️ (Si el destino del envío está fuera de las 4 avenidas consultar el costo con el operador/a o el mandadero/a vía WhatsApp)
                      </p>
                    </div>

                    {(activeQuote.passesDonBosco || activeQuote.isInSpecialZone) && (
                      <div className="bg-violet-600/90 border border-white/20 p-3 rounded-2xl flex flex-col gap-2 animate-pulse">
                        {activeQuote.passesDonBosco && (
                          <div className="flex items-center gap-3">
                            <AlertTriangle size={16} className="text-white shrink-0" />
                            <p className="text-[9px] font-black text-white uppercase italic tracking-tighter leading-tight">Recargo Av. Don Bosco (+$1000)</p>
                          </div>
                        )}
                        {activeQuote.isInSpecialZone && (
                          <div className="flex items-center gap-3">
                            <MapPin size={16} className="text-white shrink-0" />
                            <p className="text-[9px] font-black text-white uppercase italic tracking-tighter leading-tight">Recargo Zona Especial Autoclub / Movediza (+$1000)</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div onClick={handlePrintTicket} title="Descargar Comanda Excel" className="p-1 bg-gradient-to-r from-orange-600 via-orange-400 to-orange-600 rounded-[2.6rem] shadow-2xl animate-glow-ring cursor-pointer group active:scale-[0.98] transition-all">
                    <div className="p-6 bg-orange-600 rounded-[2.5rem] relative overflow-hidden">
                      <FileSpreadsheet size={80} className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 group-hover:opacity-20 transition-all" />
                      <div className="relative z-10 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black text-orange-200 uppercase tracking-widest mb-1 leading-none flex items-center gap-2">
                             TOTAL A COBRAR EN PUERTA <FileSpreadsheet size={12} />
                          </p>
                          <p className="text-5xl font-black text-white italic leading-none tracking-tighter">$ {activeQuote.totalToCollect.toLocaleString()}</p>
                          <p className="text-[8px] font-bold text-orange-100 uppercase mt-2 tracking-tighter italic">Click para descargar Comanda EXCEL</p>
                        </div>
                        <div className="bg-white/20 p-4 rounded-full backdrop-blur-md group-hover:rotate-12 transition-transform shadow-lg">
                          <FileSpreadsheet className="text-white" size={28} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <button onClick={sendWhatsApp} className="w-full bg-green-500 hover:bg-green-600 text-black py-4 rounded-[2rem] font-black text-xs uppercase flex items-center justify-center gap-2 shadow-xl shadow-green-950/20 transition-all hover:scale-[1.02] active:scale-95">
                    <Send size={18} /> Solicitar Moto por WhatsApp
                  </button>
                </div>
              )}
            </>
          )}

          <footer className="pt-8 pb-4 border-t border-slate-900 space-y-5 opacity-90">
             <div className="flex flex-col items-center gap-2">
                <Bird size={28} className="text-violet-500 animate-float" />
                <p className="text-[11px] font-black text-violet-400 tracking-[0.4em] uppercase italic text-center leading-none">Hacelo mejor con Correcaminxs</p>
             </div>
             <div className="bg-slate-950 p-4 rounded-2xl border border-slate-900/50 shadow-inner">
                <p className="text-[8px] font-bold text-slate-700 uppercase tracking-widest text-center leading-relaxed">
                   <ShieldCheck size={12} className="inline mr-1 mb-0.5" />
                   Software de uso exclusivo Correcaminxs Delivery © {new Date().getFullYear()}. Queda estrictamente prohibida su copia total o parcial.
                </p>
             </div>
          </footer>
        </div>
      </aside>
      <main className="flex-1 relative bg-black">
        <MapComponent origin={origin} destination={destination} routeGeometry={routeGeometry} onPointSelect={handleCalculate} />
      </main>

      <div id="print-section" className="hidden print:block">
        {printType === 'ticket' && activeQuote && (
          <div className="p-12 max-w-[500px] mx-auto bg-white text-black font-mono shadow-none border-2 border-black">
             <div className="flex flex-col items-center mb-8 border-b-4 border-black pb-6">
                <Bird size={64} className="text-black mb-3" />
                <h1 className="text-4xl font-black uppercase italic tracking-tighter">Correcaminxs</h1>
                <p className="text-sm font-black tracking-[0.3em] uppercase border-t border-black mt-2 pt-1">Logística Urbana Tandil</p>
             </div>
             <div className="space-y-6 text-sm">
                <div className="flex justify-between font-black border-b border-dashed border-black pb-2">
                  <span>FECHA: {activeQuote.timestamp}</span>
                  <span>ID: #{activeQuote.id}</span>
                </div>
                <div className="space-y-3">
                  <div className="bg-gray-100 p-3 rounded">
                    <p className="font-black text-[10px] uppercase text-gray-500 mb-1">REMITENTE (CLIENTE)</p>
                    <p className="font-bold uppercase text-lg">{activeQuote.clientName || 'S/N'}</p>
                    <p className="text-sm">📍 {activeQuote.origin.address}</p>
                    <p className="text-[10px] font-bold mt-1">📞 Tel: {activeQuote.senderPhone || 'S/N'}</p>
                  </div>
                  <div className="bg-gray-100 p-3 rounded">
                    <p className="font-black text-[10px] uppercase text-gray-500 mb-1">DESTINATARIO</p>
                    <p className="font-bold text-lg">📞 Tel: {activeQuote.recipientPhone || 'S/N'}</p>
                    <p className="text-sm">📍 {activeQuote.destination.address}</p>
                    <p className="text-xs mt-1 font-bold">🏠 VIVIENDA: {activeQuote.dwellingType} {activeQuote.dwellingDetail && `(${activeQuote.dwellingDetail})`}</p>
                  </div>
                </div>
                {activeQuote.description && (
                  <div className="border-2 border-black p-4 italic">
                    <p className="font-black text-[10px] uppercase not-italic mb-1">NOTAS DEL ENVÍO:</p>
                    "{activeQuote.description}"
                  </div>
                )}
                <div className="space-y-2 border-t-2 border-black pt-4">
                  <div className="flex justify-between"><span className="font-bold">COSTO ENVÍO:</span> <span className="font-black">${activeQuote.shippingFee.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="font-bold">A COBRAR MERCADERÍA:</span> <span className="font-black">${activeQuote.collectAmount.toLocaleString()}</span></div>
                </div>
                <div className="bg-black text-white p-6 flex flex-col items-center gap-1 rounded-sm mt-8">
                   <p className="text-[10px] font-black tracking-widest uppercase">TOTAL FINAL A COBRAR</p>
                   <p className="text-6xl font-black italic tracking-tighter">$ {activeQuote.totalToCollect.toLocaleString()}</p>
                </div>
             </div>
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes glow-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4); transform: scale(1); }
          50% { box-shadow: 0 0 25px 10px rgba(249, 115, 22, 0.25); transform: scale(1.005); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-glow-ring { animation: glow-ring 3s infinite ease-in-out; }
        .animate-float { animation: float 4s infinite ease-in-out; }
        
        #print-section { display: none; }
        
        select option {
          background-color: black !important;
          color: white !important;
          padding: 12px;
          font-weight: 700;
        }

        @media print {
          body { background: white !important; }
          #root { display: none !important; }
          #print-section { display: block !important; }
          @page { size: auto; margin: 0; }
        }
      `}</style>
    </div>
  );
};

export default App;
