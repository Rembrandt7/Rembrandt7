import React, { useRef, useState } from 'react';
import type { QuoteDetails } from './types';

import { DEFAULT_LOGO_B64 } from './constants/defaultLogo';
import { exportDataAsJsonFile, exportBase64AsFile } from '../../utils/cotizadorExportUtils';

interface QuoteDisplayProps {
  details: QuoteDetails | null;
  onReset: () => void;
  onEdit: () => void;
}

// Logo por defecto (Renders HDR) para cuando no hay logo cargado
const HDR_LOGO_B64 = DEFAULT_LOGO_B64;

const QuoteDisplay: React.FC<QuoteDisplayProps> = ({ details, onReset, onEdit }) => {
  const quoteRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // State for WhatsApp Modal (Client)
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppText, setWhatsAppText] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [copyFeedbackEmail, setCopyFeedbackEmail] = useState(false);
  const [copyFeedbackWA, setCopyFeedbackWA] = useState(false);
  
  // State for Invoice Modal (Accountant)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  if (!details) {
    return (
      <div className="text-center p-8">
        <p>No se han encontrado detalles de la cotización.</p>
        <button onClick={onReset} className="mt-4 px-6 py-2 bg-slate-800 text-white rounded-md hover:bg-black">
          Crear Nueva Cotización
        </button>
      </div>
    );
  }

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

  // --- Calculations ---
  // Simplificado: Suma total de todas las actividades independientemente de la categoría dinámica
  const subtotal = details.activities.reduce((sum, act) => sum + act.quantity * act.unitPrice, 0);
  
  let discountAmount = 0;
  if (details.discountType === 'percentage') {
    discountAmount = subtotal * (details.discountValue / 100);
  } else if (details.discountType === 'fixed') {
    discountAmount = details.discountValue;
  }

  const subtotalAfterDiscount = subtotal - discountAmount;
  const ivaAmount = details.addIVA ? subtotalAfterDiscount * 0.16 : 0;
  
  const ivaWithholdingAmount = details.addWithholdings ? subtotalAfterDiscount * (details.ivaWithholdingPercentage / 100) : 0;
  const isrWithholdingAmount = details.addWithholdings ? subtotalAfterDiscount * (details.isrWithholdingPercentage / 100) : 0;

  const total = subtotalAfterDiscount + ivaAmount - ivaWithholdingAmount - isrWithholdingAmount;

  const fullRecipient = details.recipientName.trim()
    ? (details.recipientPrefix ? `${details.recipientPrefix} ${details.recipientName}` : details.recipientName)
    : 'Estimado Cliente';

  const todayDate = new Date().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
  });

  // --- Helper: Generate PDF ---
  const generateAndSavePdf = async (): Promise<string | null> => {
    const input = quoteRef.current;
    if (!input || !details) return null;

    setIsGenerating(true);

    try {
        const [html2canvasModule, jspdfModule] = await Promise.all([
            import('html2canvas'),
            import('jspdf')
        ]);
        const html2canvas = html2canvasModule.default;
        const jsPDF = jspdfModule.default;

        const originalShadow = input.style.boxShadow;
        input.style.boxShadow = 'none';
        input.classList.add('printing');

        const canvas = await html2canvas(input, { 
            scale: 2, 
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff'
        });

        input.style.boxShadow = originalShadow;
        input.classList.remove('printing');
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfPageHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(imgData);
        
        let finalWidth = pdfWidth;
        let finalHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        // If content is taller than the page, scale it down to fit
        if (finalHeight > pdfPageHeight) {
            const ratio = pdfPageHeight / finalHeight;
            finalHeight = pdfPageHeight;
            finalWidth = finalWidth * ratio;
        }
        
        // Center horizontally
        const xOffset = (pdfWidth - finalWidth) / 2;
        
        pdf.addImage(imgData, 'JPEG', xOffset, 0, finalWidth, finalHeight);
        
        const clean = (str: string) => str.replace(/[^a-z0-9áéíóúñÁÉÍÓÚÑ]/gi, '_').trim();
        const c = clean(details.recipientName) || 'Cliente';
        const p = clean(details.projectName) || 'Proyecto';
        const fileName = `${c}-${p}.pdf`;

        pdf.save(fileName);
        return fileName;

    } catch (error) {
        console.error("Error generating PDF", error);
        return null;
    } finally {
        setIsGenerating(false);
    }
  };

  // --- Helpers ---
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 18) return "Buenas tardes";
    return "Buenas noches";
  };

  const generateInvoiceRequestEmail = () => {
      const recipient = "facturacionconsilio@gmail.com";
      const subject = `Solicitud de Factura - ${details.projectName}`;
      const concepts = details.activities.map(a => `- ${a.quantity} ${a.name}`).join('\n');
      
      let body = `${getTimeBasedGreeting()} equipo de Consilio.

Espero que se encuentren muy bien.

Me gustaría solicitar su amable apoyo para generar la siguiente factura:

📌 *Cliente:* ${fullRecipient}
📁 *Proyecto/Concepto:* ${details.projectName}
💰 *Total:* ${formatCurrency(total)}

*Desglose de trabajos:*
${concepts}
`;

      if (details.taxId || details.legalName) {
          body += `\n*Datos Fiscales:*
RFC: ${details.taxId || 'N/A'}
Razón Social: ${details.legalName || 'N/A'}
`;
      }

      body += `\nAdjunto a este correo encontrarán la cotización con todos los detalles fiscales y montos desglosados${details.taxSituationPdfB64 ? ' y la Constancia de Situación Fiscal' : ''}.

Quedo al pendiente de cualquier duda.
¡Muchas gracias y saludos!

Arq. Rembrandt Blanco`;

      return { recipient, subject, body };
  };

  const generateInvoiceNotificationWA = () => {
      return `Hola! ${getTimeBasedGreeting()}. Acabo de enviar los datos por correo a facturacionconsilio@gmail.com para solicitar la factura del proyecto "${details.projectName}" para el cliente ${details.recipientName}. Quedo al pendiente, gracias!`;
  };

  // --- Handlers ---

  const handleDownloadJSON = () => {
    const dataToSave = {
        version: 2,
        timestamp: new Date().toISOString(),
        details: details,
        library: { 
            clients: [details.recipientName],
            projects: [details.projectName] 
        } 
    };
    exportDataAsJsonFile(dataToSave, "Inicio de Factura.json");
  };

  const handleDownloadPdf = async () => {
    const fileName = await generateAndSavePdf();
    if (fileName && details) {
        const dataToSave = {
            version: 2,
            timestamp: new Date().toISOString(),
            details: details,
            library: { 
                clients: [details.recipientName],
                projects: [details.projectName] 
            } 
        };
        const jsonFileName = fileName.replace(/\.pdf$/i, '.json');
        exportDataAsJsonFile(dataToSave, jsonFileName);
    }
  };
  
  const handleDownloadConstancia = () => {
      if (!details.taxSituationPdfB64) return;
      exportBase64AsFile(
        details.taxSituationPdfB64,
        `Constancia_${(details.taxId || 'Fiscal').replace(/[^a-z0-9]/gi, '_')}.pdf`
      );
  };

  const getSummaryText = () => {
      const advance = total / 2;
      return `Te comparto la cotización de *${details.projectName}*.\nEl total es: *${formatCurrency(total)}*.\n${details.requireAdvance ? `Sería el 50% de anticipo (${formatCurrency(advance)}) para comenzar.\n` : ''}\nTe comparto la cotización en PDF desglosada, cualquier duda o comentario quedo a tus órdenes. Saludos!!`;
  };

  const handleWhatsAppClick = async () => {
      // 1. Generate text
      const text = getSummaryText();
      setWhatsAppText(text);
      
      // 2. Open Modal
      setShowWhatsAppModal(true);
  };

  const handleEmailClick = async () => {
      const subject = `Cotización: ${details.projectName}`;
      const body = `Hola,\n\n${getSummaryText().replace(/\*/g, '')}\n\nQuedo a la espera de tus comentarios.\n\nSaludos,\nArq. Rembrandt Blanco`;
      
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
  
  const copyToClipboard = (text: string, type: 'email' | 'wa' | 'modal') => {
    navigator.clipboard.writeText(text).then(() => {
        if(type === 'email') {
            setCopyFeedbackEmail(true);
            setTimeout(() => setCopyFeedbackEmail(false), 2000);
        } else if (type === 'wa') {
            setCopyFeedbackWA(true);
            setTimeout(() => setCopyFeedbackWA(false), 2000);
        } else {
            setCopyFeedback(true);
            setTimeout(() => setCopyFeedback(false), 2000);
        }
    }).catch(err => {
        console.error('Failed to copy', err);
    });
  };

  const openWhatsAppLink = (text: string) => {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="max-w-4xl mx-auto pb-24 relative">
      
      {/* 1. VISUAL QUOTE (The Printable Area) */}
      <div 
        ref={quoteRef} 
        className="bg-white p-8 md:p-12 shadow-2xl mx-auto my-8 max-w-[210mm] min-h-[297mm] text-slate-800 relative printable-area font-serif"
      >
          {/* Header */}
          <div className="flex justify-between items-start mb-12 border-b-2 border-slate-800 pb-6">
              <div className="w-1/2">
                  <img 
                    src={details.logoB64 || HDR_LOGO_B64} 
                    alt="Company Logo" 
                    className="h-24 object-contain mb-2"
                  />
                  <div className="text-xs text-slate-500 font-sans space-y-0.5">
                      <p className="uppercase tracking-widest mb-2">{details.companyTagline}</p>
                      <p className="font-bold text-slate-700 text-sm">Arq. Rembrandt Blanco</p>
                      <p>rba_ross@hotmail.com</p>
                      <p>811 977 2135</p>
                  </div>
              </div>
              <div className="text-right">
                  <h1 className="text-[2rem] font-bold text-slate-800 mb-2 font-serif">COTIZACIÓN</h1>
                  <p className="text-sm text-slate-500 font-sans">{todayDate}</p>
                  <p className="text-xs text-slate-400 italic mt-1">Cotización vigente por 15 días</p>
              </div>
          </div>

          {/* Client Info - Swapped: Project Left, Client Right */}
          <div className="mb-12 flex justify-between items-start font-sans">
              <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Proyecto</p>
                  <h2 className="text-xl font-bold text-slate-800">{details.projectName}</h2>
              </div>
              <div className="text-right">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Cliente</p>
                  <h2 className="text-xl font-bold text-slate-800">{fullRecipient}</h2>
              </div>
          </div>

          {/* Table */}
          <div className="mb-8">
              <table className="w-full text-left border-collapse">
                  <thead>
                      <tr className="border-b-2 border-slate-800 text-xs uppercase tracking-wider font-sans">
                          <th className="py-3 font-bold text-slate-600">Descripción / Concepto</th>
                          <th className="py-3 font-bold text-slate-600 text-center">Cant.</th>
                          <th className="py-3 font-bold text-slate-600 text-right">Precio U.</th>
                          <th className="py-3 font-bold text-slate-600 text-right">Importe</th>
                      </tr>
                  </thead>
                  <tbody className="font-sans text-sm">
                      {details.activities.map((act) => (
                          <tr key={act.id} className="border-b border-slate-100">
                              <td className="py-4 pr-4">
                                  <span className="font-semibold text-slate-800 block">{act.name}</span>
                                  {/* Mostrar la categoría dinámica en gris pequeño */}
                                  <span className="text-xs text-slate-500 capitalize">{act.type}</span>
                              </td>
                              <td className="py-4 text-center text-slate-600">{act.quantity}</td>
                              <td className="py-4 text-right text-slate-600">{formatCurrency(act.unitPrice)}</td>
                              <td className="py-4 text-right font-medium text-slate-800">{formatCurrency(act.quantity * act.unitPrice)}</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-12 font-sans">
              <div className="w-1/2 space-y-2">
                  <div className="flex justify-between text-sm text-slate-600">
                      <span>Subtotal</span>
                      <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                          <span>Descuento {details.discountType === 'percentage' ? `(${details.discountValue}%)` : ''}</span>
                          <span>- {formatCurrency(discountAmount)}</span>
                      </div>
                  )}
                  {details.addIVA && (
                      <div className="flex justify-between text-sm text-slate-600">
                          <span>IVA (16%)</span>
                          <span>{formatCurrency(ivaAmount)}</span>
                      </div>
                  )}
                  {details.addWithholdings && (
                      <>
                          <div className="flex justify-between text-sm text-red-500">
                              <span>Ret. IVA ({details.ivaWithholdingPercentage}%)</span>
                              <span>- {formatCurrency(ivaWithholdingAmount)}</span>
                          </div>
                          <div className="flex justify-between text-sm text-red-500">
                              <span>Ret. ISR ({details.isrWithholdingPercentage}%)</span>
                              <span>- {formatCurrency(isrWithholdingAmount)}</span>
                          </div>
                      </>
                  )}
                  <div className="flex justify-between text-xl font-bold text-slate-900 border-t-2 border-slate-800 pt-3 mt-2">
                      <span>Total</span>
                      <span>{formatCurrency(total)}</span>
                  </div>
              </div>
          </div>

          {/* Terms & Footer */}
          <div className="mt-auto">
              <div className="bg-slate-50 p-6 rounded-lg mb-8 font-sans text-xs text-slate-600">
                  <h3 className="font-bold text-slate-800 mb-2 uppercase tracking-wide">Términos y Condiciones</h3>
                  <div className="grid grid-cols-2 gap-6">
                      <div>
                          <p className="mb-1"><strong className="text-slate-700">Tiempo de Entrega:</strong> {details.deliveryTime || 'A convenir'}</p>
                          <p><strong className="text-slate-700">Forma de Pago:</strong> {details.requireAdvance ? '50% anticipo, 50% contra entrega.' : 'Pago único.'}</p>
                      </div>
                      <div>
                          {details.generalConditions ? (
                              <p className="whitespace-pre-wrap">{details.generalConditions}</p>
                          ) : (
                              <p className="italic text-slate-400">Sin condiciones adicionales.</p>
                          )}
                      </div>
                  </div>
              </div>

              {/* Signature */}
              <div className="text-center mt-12">
                  {details.signatureB64 && (
                      <img src={details.signatureB64} alt="Firma" className="h-20 mx-auto mb-2 object-contain filter contrast-125" />
                  )}
                  <div className="border-t border-slate-300 w-64 mx-auto pt-2">
                      <p className="font-bold text-slate-800 font-serif">Arq. Rembrandt Blanco</p>
                      <p className="text-xs text-slate-500 uppercase tracking-widest font-sans">Gerente de Proyecto</p>
                  </div>
              </div>
          </div>
      </div>
      
      {/* ... modales (WhatsApp, Factura) y barra de acciones (se mantienen igual que antes, solo envueltos en el componente) ... */}
      {showWhatsAppModal && (
        // ... mismo código del modal de WhatsApp ...
         <div className="fixed inset-0 bg-black bg-opacity-60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 transform transition-all scale-100">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        Compartir a Cliente
                    </h3>
                    <button onClick={() => setShowWhatsAppModal(false)} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                
                <p className="text-sm text-slate-600 mb-2 font-medium">
                    Resumen del mensaje:
                </p>
                <textarea 
                    readOnly
                    value={whatsAppText}
                    className="w-full h-36 p-3 bg-slate-100 border border-slate-300 rounded-lg text-sm text-slate-800 font-mono mb-4 focus:ring-2 focus:ring-green-500 outline-none resize-none"
                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                />
                
                <div className="flex flex-col gap-3">
                    <button 
                        onClick={() => copyToClipboard(whatsAppText, 'modal')}
                        className={`w-full py-2.5 px-4 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2 border ${copyFeedback ? 'bg-green-100 text-green-700 border-green-300' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                    >
                        {copyFeedback ? '¡Texto Copiado!' : 'Copiar Texto'}
                    </button>
                    <button 
                        onClick={() => openWhatsAppLink(whatsAppText)}
                        className="w-full py-2.5 px-4 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                        Enviar WhatsApp
                    </button>
                </div>
            </div>
      </div>
      )}

      {/* Invoice Request Modal */}
       {showInvoiceModal && (
         <div className="fixed inset-0 bg-black bg-opacity-60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
             {/* ... contenido del modal de factura ... */}
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 transform transition-all scale-100 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                         💼 Solicitar Factura
                    </h3>
                    <button onClick={() => setShowInvoiceModal(false)} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                
                {/* EMAIL SECTION */}
                <div className="mb-6 border-b border-slate-100 pb-6">
                    <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                        📧 Correo para Contadores
                    </h4>
                    <textarea 
                        readOnly
                        value={generateInvoiceRequestEmail().body}
                        className="w-full h-32 p-3 bg-slate-100 border border-slate-300 rounded-lg text-xs text-slate-800 font-mono mb-2 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                    <div className="flex gap-2">
                        <button 
                            onClick={() => copyToClipboard(generateInvoiceRequestEmail().body, 'modal')}
                            className="flex-1 py-2 px-3 bg-white border border-slate-300 rounded text-slate-700 text-xs font-semibold hover:bg-slate-50"
                        >
                            Copiar Texto
                        </button>
                        <a 
                            href={`mailto:${generateInvoiceRequestEmail().recipient}?subject=${encodeURIComponent(generateInvoiceRequestEmail().subject)}&body=${encodeURIComponent(generateInvoiceRequestEmail().body)}`}
                            className="flex-1 py-2 px-3 bg-blue-600 rounded text-white text-xs font-semibold hover:bg-blue-700 text-center"
                        >
                            Abrir Correo
                        </a>
                    </div>
                </div>
            </div>
         </div>
      )}

      {/* Action Bar - Acomodados del lado izquierdo */}
      <div className="no-print fixed bottom-0 left-0 right-0 bg-[#0d1322]/95 backdrop-blur-md border-t border-slate-800 p-3 shadow-2xl z-50">
        <div className="max-w-5xl mx-auto flex flex-wrap justify-start items-center gap-2">
            <button onClick={onEdit} className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors text-xs border border-slate-700 cursor-pointer">
              &larr; Editar
            </button>
            <button onClick={onReset} className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors text-xs border border-slate-700 cursor-pointer">
              Nueva
            </button>
            <button 
              onClick={() => handleDownloadPdf()}
              disabled={isGenerating}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-xs transition-colors shadow-sm whitespace-nowrap cursor-pointer"
            >
              Descargar PDF
            </button>
            <button 
                onClick={handleDownloadJSON}
                className="px-3.5 py-2 rounded-lg bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-500/30 transition-all font-medium text-xs whitespace-nowrap cursor-pointer"
            >
                Guardar Datos JSON
            </button>
            <button 
              onClick={handleWhatsAppClick}
              disabled={isGenerating}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-xs transition-colors shadow-sm whitespace-nowrap cursor-pointer"
            >
              Enviar WhatsApp
            </button>
            <button 
              onClick={handleEmailClick}
              disabled={isGenerating}
              className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-medium text-xs transition-colors shadow-sm whitespace-nowrap cursor-pointer"
            >
               Enviar Correo
            </button>
            <button 
              onClick={() => { setShowInvoiceModal(true); }}
              disabled={isGenerating}
              className="px-3.5 py-2 bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-500/40 rounded-lg transition-colors font-medium text-xs whitespace-nowrap cursor-pointer"
            >
               Solicitar Factura
            </button>
        </div>
      </div>

    </div>
  );
};

export default QuoteDisplay;