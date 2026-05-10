document.addEventListener('DOMContentLoaded', function() {
  console.log('بارگذاری صفحه کامل شد');
  checkRequiredLibraries();
  document.getElementById('current-year').textContent = new Date().getFullYear();
  document.getElementById('invoiceDate').value = '';
  setupTabs();
  setupEventListeners();
  loadSavedData();
});

let currentDocType = 'proforma';

function checkRequiredLibraries() {
  console.log('بررسی کتابخانه‌های مورد نیاز...');
  if (typeof html2canvas === 'undefined') console.warn('html2canvas یافت نشد.');
  else console.log('html2canvas موجود است');
  if (typeof window.jspdf === 'undefined') console.warn('jsPDF یافت نشد.');
  else console.log('jsPDF موجود است');
}

function setupTabs() {
  const navButtons = document.querySelectorAll('.nav-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  navButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.dataset.tab;
      navButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      tabContents.forEach(tab => {
        if (tab.id === targetTab) tab.classList.add('active');
        else tab.classList.remove('active');
      });
    });
  });
}

function setupEventListeners() {
  const backBtn = document.getElementById('back-to-form-btn');
  if (backBtn) backBtn.addEventListener('click', () => document.querySelector('.nav-btn[data-tab="invoice-form"]').click());
  const clearFormBtn = document.getElementById('clear-form-btn');
  if (clearFormBtn) clearFormBtn.addEventListener('click', clearForm);
  const previewBtn = document.getElementById('preview-btn');
  if (previewBtn) {
    previewBtn.addEventListener('click', function(e) {
      try {
        saveInvoiceData();
        generatePreview();
        setTimeout(() => document.querySelector('.nav-btn[data-tab="preview"]').click(), 100);
      } catch (error) { alert('خطا: ' + error.message); }
    });
  }
  const printBtn = document.getElementById('print-btn');
  if (printBtn) printBtn.addEventListener('click', () => printInvoice());
  const downloadPdfBtn = document.getElementById('download-pdf-btn');
  if (downloadPdfBtn) downloadPdfBtn.addEventListener('click', () => downloadPDF());
  const downloadImgBtn = document.getElementById('download-img-btn');
  if (downloadImgBtn) downloadImgBtn.addEventListener('click', () => downloadImage());
  const addProductBtn = document.getElementById('add-product-btn');
  if (addProductBtn) addProductBtn.addEventListener('click', addProduct);
  const includeTax = document.getElementById('includeTax');
  if (includeTax) includeTax.addEventListener('change', () => { toggleTaxRate(); saveInvoiceData(); });
  const includeNotes = document.getElementById('includeNotes');
  if (includeNotes) includeNotes.addEventListener('change', () => { toggleNotes(); saveInvoiceData(); });
  const invoiceNotes = document.getElementById('invoiceNotes');
  if (invoiceNotes) invoiceNotes.addEventListener('input', saveInvoiceData);
  const includeDiscount = document.getElementById('includeDiscount');
  if (includeDiscount) includeDiscount.addEventListener('change', () => { toggleDiscount(); saveInvoiceData(); });
  const discountRate = document.getElementById('discountRate');
  if (discountRate) discountRate.addEventListener('input', saveInvoiceData);
  
  const docTypeRadios = document.querySelectorAll('input[name="docType"]');
  docTypeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      currentDocType = e.target.value;
      saveInvoiceData();
    });
  });
  
  const invoiceDateField = document.getElementById('invoiceDate');
  if (invoiceDateField) {
    invoiceDateField.addEventListener('input', function(e) {
      this.value = this.value.replace(/[^0-9]/g, '');
      if (this.value.length > 8) this.value = this.value.slice(0,8);
      if (this.value.length === 8) this.value = this.value.slice(0,4)+'/'+this.value.slice(4,6)+'/'+this.value.slice(6,8);
    });
    invoiceDateField.addEventListener('focus', function() { if (this.value.includes('/')) this.value = this.value.replace(/\//g,''); });
    invoiceDateField.addEventListener('blur', function() { if (this.value.length === 8) this.value = this.value.slice(0,4)+'/'+this.value.slice(4,6)+'/'+this.value.slice(6,8); });
  }
  
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', saveSettings);
  const companyLogo = document.getElementById('company-logo');
  if (companyLogo) companyLogo.addEventListener('change', handleLogoUpload);
  const companyStamp = document.getElementById('company-stamp');
  if (companyStamp) companyStamp.addEventListener('change', handleStampUpload);
  setupThousandSeparators();
}

function getElementValue(id, defaultValue = '') {
  const el = document.getElementById(id);
  return el ? el.value : defaultValue;
}
function getElementChecked(id, defaultValue = false) {
  const el = document.getElementById(id);
  return el ? el.checked : defaultValue;
}
function getProducts() {
  const rows = document.querySelectorAll('#products-list tr');
  const products = [];
  rows.forEach(row => {
    products.push({
      id: row.dataset.id, name: row.dataset.name, size: row.dataset.size,
      pressure: row.dataset.pressure, type: row.dataset.type,
      length: parseFloat(row.dataset.length) || 0,
      unitPrice: parseFloat(row.dataset.unitPrice) || 0
    });
  });
  return products;
}

function saveInvoiceData() {
  const invoiceData = {
    invoiceNumber: getElementValue('invoiceNumber'),
    date: getElementValue('invoiceDate', getCurrentPersianDate()),
    customer: {
      name: getElementValue('customerName'),
      nationalId: getElementValue('customerNationalId'),
      phone: getElementValue('customerPhone'),
      address: getElementValue('customerAddress')
    },
    products: getProducts(),
    includeTax: getElementChecked('includeTax'),
    taxRate: parseFloat(getElementValue('taxRate','10')) || 10,
    includeDiscount: getElementChecked('includeDiscount'),
    discountAmount: parseFloat(getElementValue('discountRate','0').replace(/,/g,'')) || 0,
    includeStampSignature: getElementChecked('includeStampSignature'),
    includeNotes: getElementChecked('includeNotes'),
    notes: getElementValue('invoiceNotes'),
    docType: currentDocType
  };
  localStorage.setItem('invoiceData', JSON.stringify(invoiceData));
  localStorage.setItem('docType', currentDocType);
}

function saveSettings() {
  const logoPreview = document.getElementById('logo-preview');
  const stampPreview = document.getElementById('stamp-preview');
  const companyInfo = {
    name: getElementValue('companyName'),
    nationalId: getElementValue('companyNationalId'),
    phone: getElementValue('companyPhone'),
    address: getElementValue('companyAddress'),
    logo: logoPreview?.dataset.src || null,
    stampSignature: stampPreview?.dataset.src || null
  };
  localStorage.setItem('companyInfo', JSON.stringify(companyInfo));
  alert('تنظیمات ذخیره شد');
}

function loadSavedData() {
  const savedCompanyInfo = localStorage.getItem('companyInfo');
  if (savedCompanyInfo) {
    const c = JSON.parse(savedCompanyInfo);
    document.getElementById('companyName').value = c.name || '';
    document.getElementById('companyNationalId').value = c.nationalId || '';
    document.getElementById('companyPhone').value = c.phone || '';
    document.getElementById('companyAddress').value = c.address || '';
    if (c.logo) {
      const logoPreview = document.getElementById('logo-preview');
      logoPreview.innerHTML = `<img src="${c.logo}" alt="لوگو">`;
      logoPreview.dataset.src = c.logo;
      logoPreview.classList.remove('hidden');
      document.getElementById('logo-placeholder').classList.add('hidden');
    }
    if (c.stampSignature) {
      const stampPreview = document.getElementById('stamp-preview');
      stampPreview.innerHTML = `<img src="${c.stampSignature}" alt="مهر">`;
      stampPreview.dataset.src = c.stampSignature;
      stampPreview.classList.remove('hidden');
      document.getElementById('stamp-placeholder').classList.add('hidden');
    }
  }
  const savedInvoiceData = localStorage.getItem('invoiceData');
  if (savedInvoiceData) {
    const d = JSON.parse(savedInvoiceData);
    document.getElementById('invoiceNumber').value = d.invoiceNumber || '';
    document.getElementById('invoiceDate').value = d.date || '';
    document.getElementById('customerName').value = d.customer.name || '';
    document.getElementById('customerNationalId').value = d.customer.nationalId || '';
    document.getElementById('customerPhone').value = d.customer.phone || '';
    document.getElementById('customerAddress').value = d.customer.address || '';
    document.getElementById('includeTax').checked = d.includeTax || false;
    document.getElementById('taxRate').value = d.taxRate || 10;
    document.getElementById('includeStampSignature').checked = d.includeStampSignature || false;
    document.getElementById('includeNotes').checked = d.includeNotes || false;
    if (d.includeNotes) document.getElementById('notes-container').classList.remove('hidden');
    document.getElementById('invoiceNotes').value = d.notes || '';
    document.getElementById('includeDiscount').checked = d.includeDiscount || false;
    if (d.includeDiscount) document.getElementById('discount-container').classList.remove('hidden');
    document.getElementById('discountRate').value = d.discountAmount || 0;
    toggleTaxRate(); toggleDiscount(); toggleNotes();
    if (d.products && d.products.length) {
      d.products.forEach(p => addProductToTable(p));
      updateProductsVisibility();
    }
    if (d.docType) currentDocType = d.docType;
    else {
      const savedType = localStorage.getItem('docType');
      if (savedType) currentDocType = savedType;
      else currentDocType = 'proforma';
    }
    const radio = document.querySelector(`input[name="docType"][value="${currentDocType}"]`);
    if (radio) radio.checked = true;
  } else {
    currentDocType = 'proforma';
    const proformaRadio = document.querySelector('input[name="docType"][value="proforma"]');
    if (proformaRadio) proformaRadio.checked = true;
    document.getElementById('includeTax').checked = false;
    document.getElementById('includeNotes').checked = false;
    document.getElementById('includeStampSignature').checked = false;
    document.getElementById('notes-container').classList.add('hidden');
    document.getElementById('tax-rate-container').classList.add('hidden');
    document.getElementById('discount-container').classList.add('hidden');
  }
}

function toPersianNumber(num) {
  if (num === undefined || num === null) return '';
  const persianDigits = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
  return num.toString().replace(/[0-9]/g, w => persianDigits[+w]);
}
function formatPrice(price) {
  if (price === undefined || isNaN(price)) return '';
  return toPersianNumber(price.toLocaleString('fa-IR'));
}
function getCurrentPersianDate() {
  function gregorianToJalali(gy,gm,gd) {
    let g_d_m=[0,31,59,90,120,151,181,212,243,273,304,334];
    let jy=(gy>1600)?979:0;
    if(gy>1600) gy-=1600; else gy-=621;
    let gy2=(gm>2)?gy+1:gy;
    let days=365*gy+Math.floor((gy2+3)/4)-Math.floor((gy2+99)/100)+Math.floor((gy2+399)/400)-80+gd+g_d_m[gm-1];
    jy+=33*Math.floor(days/12053);
    days%=12053;
    jy+=4*Math.floor(days/1461);
    days%=1461;
    if(days>365){ jy+=Math.floor((days-1)/365); days=(days-1)%365; }
    let jm=(days<186)?1+Math.floor(days/31):7+Math.floor((days-186)/30);
    let jd=1+((days<186)?(days%31):((days-186)%30));
    return [jy,jm,jd];
  }
  const d=new Date();
  const [y,m,dd]=gregorianToJalali(d.getFullYear(),d.getMonth()+1,d.getDate());
  return `${y}/${m<10?'0'+m:m}/${dd<10?'0'+dd:dd}`;
}
function generateId(){ return Math.random().toString(36).substring(2,15)+Math.random().toString(36).substring(2,15); }
function addProduct() {
  const id=document.getElementById('productId').value;
  const name=document.getElementById('productName').value;
  const size=document.getElementById('productSize').value;
  const pressure=document.getElementById('productPressure').value;
  const type=document.getElementById('productType').value;
  const length=parseFloat(document.getElementById('productLength').value.replace(/,/g,''))||0;
  const unitPrice=parseFloat(document.getElementById('productUnitPrice').value.replace(/,/g,''))||0;
  if(!size||!pressure){ alert('لطفا سایز و فشار را وارد کنید'); return; }
  const product={ id:id||generateId(), name, size, pressure, type, length, unitPrice };
  if(id) removeProduct(id,false);
  addProductToTable(product);
  updateProductsVisibility();
  saveInvoiceData();
  clearProductForm();
}
function clearProductForm(){
  document.getElementById('productId').value='';
  document.getElementById('productSize').value='';
  document.getElementById('productPressure').value='';
  document.getElementById('productType').value='';
  document.getElementById('productLength').value='';
  document.getElementById('productUnitPrice').value='';
  document.getElementById('add-product-btn').textContent='افزودن کالا';
}
function addProductToTable(product){
  const tbody=document.getElementById('products-list');
  const total=product.length*product.unitPrice;
  const row=document.createElement('tr');
  row.dataset.id=product.id; row.dataset.name=product.name; row.dataset.size=product.size;
  row.dataset.pressure=product.pressure; row.dataset.type=product.type;
  row.dataset.length=product.length; row.dataset.unitPrice=product.unitPrice;
  const idx=tbody.childElementCount+1;
  row.innerHTML=`<table>${toPersianNumber(idx)}</td><td>${product.name}</td><td>${toPersianNumber(product.size)}</td><td>${toPersianNumber(product.pressure)}</td><td>${product.type||'-'}</td><td>${toPersianNumber(product.length)}</td><td>${formatPrice(product.unitPrice)}</td><td>${formatPrice(total)}</td><td><button class="btn edit" onclick="editProduct('${product.id}')">ویرایش</button> <button class="btn danger" onclick="removeProduct('${product.id}')">حذف</button></td>`;
  tbody.appendChild(row);
}
function editProduct(pid){
  const row=document.querySelector(`#products-list tr[data-id="${pid}"]`);
  if(row){
    document.getElementById('productId').value=pid;
    document.getElementById('productName').value=row.dataset.name||'';
    document.getElementById('productSize').value=row.dataset.size||'';
    document.getElementById('productPressure').value=row.dataset.pressure||'';
    document.getElementById('productType').value=row.dataset.type||'';
    document.getElementById('productLength').value=numberWithCommas(row.dataset.length)||'';
    document.getElementById('productUnitPrice').value=numberWithCommas(row.dataset.unitPrice)||'';
    document.getElementById('add-product-btn').textContent='بروزرسانی محصول';
    document.getElementById('product-form').scrollIntoView({behavior:'smooth'});
  }
}
function removeProduct(pid,update=true){
  const row=document.querySelector(`#products-list tr[data-id="${pid}"]`);
  if(row){
    row.remove();
    if(update){
      updateProductsVisibility();
      saveInvoiceData();
      document.querySelectorAll('#products-list tr').forEach((r,i)=>r.querySelector('td:first-child').textContent=toPersianNumber(i+1));
    }
  }
}
function updateProductsVisibility(){
  const hasRows=document.getElementById('products-list').childElementCount>0;
  document.getElementById('products-table').classList.toggle('hidden',!hasRows);
  document.getElementById('no-products-message').classList.toggle('hidden',hasRows);
}
function toggleTaxRate(){ document.getElementById('tax-rate-container').classList.toggle('hidden',!document.getElementById('includeTax').checked); }
function toggleNotes(){ document.getElementById('notes-container').classList.toggle('hidden',!document.getElementById('includeNotes').checked); }
function toggleDiscount(){ document.getElementById('discount-container').classList.toggle('hidden',!document.getElementById('includeDiscount').checked); }
function handleLogoUpload(e){
  const file=e.target.files[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=ev=>{
    const preview=document.getElementById('logo-preview');
    preview.innerHTML=`<img src="${ev.target.result}" alt="لوگو">`;
    preview.dataset.src=ev.target.result;
    preview.classList.remove('hidden');
    document.getElementById('logo-placeholder').classList.add('hidden');
  };
  reader.readAsDataURL(file);
}
function handleStampUpload(e){
  const file=e.target.files[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=ev=>{
    const preview=document.getElementById('stamp-preview');
    preview.innerHTML=`<img src="${ev.target.result}" alt="مهر">`;
    preview.dataset.src=ev.target.result;
    preview.classList.remove('hidden');
    document.getElementById('stamp-placeholder').classList.add('hidden');
  };
  reader.readAsDataURL(file);
}

function generatePreview() {
  try {
    const previewContainer = document.getElementById('invoice-preview-container');
    if (!previewContainer) return;

    const companyInfo = (()=>{
      const saved = localStorage.getItem('companyInfo');
      if(saved) return JSON.parse(saved);
      return {
        name: getElementValue('companyName'),
        nationalId: getElementValue('companyNationalId'),
        phone: getElementValue('companyPhone'),
        address: getElementValue('companyAddress'),
        logo: document.getElementById('logo-preview')?.dataset.src || null,
        stampSignature: document.getElementById('stamp-preview')?.dataset.src || null
      };
    })();

    const invoiceData = {
      invoiceNumber: getElementValue('invoiceNumber'),
      date: getElementValue('invoiceDate', getCurrentPersianDate()),
      customer: {
        name: getElementValue('customerName'),
        nationalId: getElementValue('customerNationalId'),
        phone: getElementValue('customerPhone'),
        address: getElementValue('customerAddress')
      },
      products: getProducts(),
      includeTax: getElementChecked('includeTax'),
      taxRate: parseFloat(getElementValue('taxRate','10'))||10,
      includeDiscount: getElementChecked('includeDiscount'),
      discountAmount: parseFloat(getElementValue('discountRate','0').replace(/,/g,''))||0,
      includeStampSignature: getElementChecked('includeStampSignature'),
      includeNotes: getElementChecked('includeNotes'),
      notes: getElementValue('invoiceNotes')
    };

    let subtotal = 0;
    invoiceData.products.forEach(p => subtotal += p.length * p.unitPrice);
    let discount = invoiceData.includeDiscount ? invoiceData.discountAmount : 0;
    let afterDiscount = subtotal - discount;
    let tax = invoiceData.includeTax ? (afterDiscount * invoiceData.taxRate) / 100 : 0;
    let total = afterDiscount + tax;

    const titleText = (currentDocType === 'invoice') ? 'فاکتور فروش' : 'پیش‌فاکتور فروش';

    let html = `
      <div class="invoice-header">
        ${companyInfo.logo ? `<div class="invoice-logo"><img src="${companyInfo.logo}" alt="لوگو شرکت"></div>` : '<div class="empty-logo"></div>'}
        <div class="invoice-title-container">
          <h1 class="invoice-title">${titleText}</h1>
        </div>
        <div class="invoice-info">
          <p>شماره: ${invoiceData.invoiceNumber ? toPersianNumber(invoiceData.invoiceNumber) : '-'}</p>
          <p>تاریخ: ${invoiceData.date ? toPersianNumber(invoiceData.date) : toPersianNumber(getCurrentPersianDate())}</p>
        </div>
      </div>
      
      <div class="customer-seller-box">
        <div class="box-section customer-section">
          <div class="section-title">مشخصات خریدار:</div>
          <div class="section-data">
            <div class="info-row">
              <div class="info-cell"><span class="info-label">نام:</span> ${invoiceData.customer.name || '-'}</div>
              <div class="info-cell"><span class="info-label">شماره ملی:</span> ${invoiceData.customer.nationalId ? toPersianNumber(invoiceData.customer.nationalId) : '-'}</div>
            </div>
            <div class="info-row">
              <div class="info-cell"><span class="info-label">تلفن:</span> ${invoiceData.customer.phone ? toPersianNumber(invoiceData.customer.phone) : '-'}</div>
              <div class="info-cell"><span class="info-label">آدرس:</span> ${invoiceData.customer.address || '-'}</div>
            </div>
          </div>
        </div>
        <div class="box-section seller-section">
          <div class="section-title">مشخصات فروشنده:</div>
          <div class="section-data">
            <div class="info-row">
              <div class="info-cell"><span class="info-label">نام شرکت:</span> ${companyInfo.name || '-'}</div>
              <div class="info-cell"><span class="info-label">شناسه ملی:</span> ${companyInfo.nationalId ? toPersianNumber(companyInfo.nationalId) : '-'}</div>
            </div>
            <div class="info-row">
              <div class="info-cell"><span class="info-label">تلفن:</span> ${companyInfo.phone ? toPersianNumber(companyInfo.phone) : '-'}</div>
              <div class="info-cell"><span class="info-label">آدرس:</span> ${companyInfo.address || '-'}</div>
            </div>
          </div>
        </div>
      </div>
      
      <table class="invoice-products">
        <thead><tr><th>ردیف</th><th>نام کالا</th><th>سایز</th><th>فشار</th><th>نوع</th><th>متراژ</th><th>قیمت واحد (ریال)</th><th>قیمت کل (ریال)</th></tr></thead>
        <tbody>`;
    invoiceData.products.forEach((p,i) => {
      let totalP = p.length * p.unitPrice;
      html += `<tr><td>${toPersianNumber(i+1)}</td><td>${p.name}</td><td>${toPersianNumber(p.size)}</td><td>${toPersianNumber(p.pressure)}</td><td>${p.type||'-'}</td><td>${toPersianNumber(p.length)}</td><td>${formatPrice(p.unitPrice)}</td><td>${formatPrice(totalP)}</td></tr>`;
    });
    html += `</tbody>
      </table>
      <div class="invoice-summary">
        <div class="summary-item"><span>جمع کل:</span><span>${formatPrice(subtotal)} ریال</span></div>`;
    if (invoiceData.includeDiscount && invoiceData.discountAmount>0)
      html += `<div class="summary-item"><span>تخفیف:</span><span>${formatPrice(discount)} ریال</span></div>`;
    if (invoiceData.includeTax)
      html += `<div class="summary-item"><span>مالیات بر ارزش افزوده (${toPersianNumber(invoiceData.taxRate)}%):</span><span>${formatPrice(tax)} ریال</span></div>`;
    html += `<div class="summary-item total"><span>قابل پرداخت:</span><span>${formatPrice(total)} ریال</span></div></div>`;
    
    const proformaDefaultNote = 'اعتبار پیش فاکتور صادر شده منحصر به روز جاری و منوط به تسویه حساب می‌باشد.';
    if (currentDocType === 'proforma') {
      let finalNotes = '';
      const userNotes = (invoiceData.includeNotes && invoiceData.notes) ? invoiceData.notes.trim() : '';
      if (userNotes !== '') {
        finalNotes = userNotes + '<br>' + proformaDefaultNote;
      } else {
        finalNotes = proformaDefaultNote;
      }
      html += `<div class="invoice-description"><h3 class="description-title">توضیحات:</h3><p class="description-text">${finalNotes}</p></div>`;
    } else {
      if (invoiceData.includeNotes && invoiceData.notes && invoiceData.notes.trim() !== '') {
        html += `<div class="invoice-description"><h3 class="description-title">توضیحات:</h3><p class="description-text">${invoiceData.notes}</p></div>`;
      }
    }
    html += `<div class="invoice-signatures"><div class="signature-item"><p>امضای خریدار</p></div><div class="signature-item">`;
    if (invoiceData.includeStampSignature && companyInfo.stampSignature)
      html += `<p>مهر و امضای فروشنده</p><div class="stamp-container"><img src="${companyInfo.stampSignature}" alt="مهر و امضا"></div>`;
    else
      html += `<p>مهر و امضای فروشنده</p>`;
    html += `</div></div>`;

    previewContainer.innerHTML = html;
  } catch(e) { console.error(e); alert('خطا در تولید پیش‌نمایش'); }
}

function printInvoice() {
  const previewContainer = document.getElementById('invoice-preview-container');
  if (!previewContainer || !previewContainer.innerHTML.trim()) {
    alert('پیش‌نمایش فاکتور خالی است');
    return;
  }

  // جمع‌آوری تمام استایل‌های صفحه اصلی (داخلی و خارجی)
  let stylesHtml = '';
  const styleNodes = document.querySelectorAll('style, link[rel="stylesheet"]');
  styleNodes.forEach(node => {
    if (node.tagName === 'STYLE') {
      stylesHtml += node.outerHTML;
    } else if (node.tagName === 'LINK') {
      stylesHtml += node.outerHTML;
    }
  });

  // استایل اضافی برای چاپ (حذف حاشیه و اجباری کردن رنگ‌ها)
  const extraStyle = `
    <style>
      @page { margin: 0; }
      body {
        margin: 0;
        padding: 0;
        background: white;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .invoice-preview-container {
        margin: 0 auto !important;
        page-break-after: avoid;
        page-break-inside: avoid;
        box-shadow: none;
      }
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
    </style>
  `;

  // باز کردن پنجره جدید (در موبایل یک تب جدید باز می‌شود)
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('لطفاً مسدودکننده پاپ‌آپ را موقتاً غیرفعال کنید');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="fa">
    <head>
      <meta charset="UTF-8">
      <title>چاپ فاکتور</title>
      <base href="${window.location.href}">
      ${stylesHtml}
      ${extraStyle}
    </head>
    <body>
      ${previewContainer.outerHTML}
    </body>
    </html>
  `);
  printWindow.document.close();

  // صبر برای بارگذاری فونت و تصاویر سپس چاپ و بستن پنجره
  setTimeout(() => {
    printWindow.print();
    printWindow.onafterprint = () => printWindow.close();
  }, 500);
}

async function downloadPDF() {
  const previewContainer = document.getElementById('invoice-preview-container');
  if (!previewContainer) {
    alert('پیش‌نمایش یافت نشد');
    return;
  }
  
  const btns = document.getElementById('preview-buttons');
  if (btns) btns.classList.add('hidden');
  
  const originalWidth = previewContainer.style.width;
  const originalPadding = previewContainer.style.padding;
  const originalMargin = previewContainer.style.margin;
  const originalTransform = previewContainer.style.transform;
  
  previewContainer.style.width = '210mm';
  previewContainer.style.padding = '15mm';
  previewContainer.style.margin = '0 auto';
  previewContainer.style.transform = 'none';
  
  try {
    const canvas = await html2canvas(previewContainer, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false
    });
    
    const docTypeText = (currentDocType === 'invoice') ? 'فاکتور' : 'پیش‌فاکتور';
    const customer = getElementValue('customerName') || 'فاکتور';
    const date = getElementValue('invoiceDate') || getCurrentPersianDate().replace(/\//g, '');
    const fileName = `${docTypeText} - ${customer} - ${date}.pdf`;
    
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = imgHeight / imgWidth;
    let finalWidth = pdfWidth;
    let finalHeight = pdfWidth * ratio;
    
    if (finalHeight > pdfHeight) {
      finalHeight = pdfHeight;
      finalWidth = pdfHeight / ratio;
    }
    
    const x = (pdfWidth - finalWidth) / 2;
    const y = 0;
    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    pdf.addImage(imgData, 'JPEG', x, y, finalWidth, finalHeight);
    pdf.save(fileName);
  } catch (err) {
    console.error(err);
    alert('خطا در تولید PDF');
  } finally {
    previewContainer.style.width = originalWidth;
    previewContainer.style.padding = originalPadding;
    previewContainer.style.margin = originalMargin;
    previewContainer.style.transform = originalTransform;
    if (btns) btns.classList.remove('hidden');
  }
}

async function downloadImage() {
  const previewContainer = document.getElementById('invoice-preview-container');
  if (!previewContainer) {
    alert('پیش‌نمایش یافت نشد');
    return;
  }
  
  const btns = document.getElementById('preview-buttons');
  if (btns) btns.classList.add('hidden');
  
  const originalWidth = previewContainer.style.width;
  const originalPadding = previewContainer.style.padding;
  const originalMargin = previewContainer.style.margin;
  const originalTransform = previewContainer.style.transform;
  
  previewContainer.style.width = '210mm';
  previewContainer.style.padding = '15mm';
  previewContainer.style.margin = '0 auto';
  previewContainer.style.transform = 'none';
  
  try {
    const canvas = await html2canvas(previewContainer, {
      scale: 4,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false
    });
    
    const docTypeText = (currentDocType === 'invoice') ? 'فاکتور' : 'پیش‌فاکتور';
    const customer = getElementValue('customerName') || 'فاکتور';
    const date = getElementValue('invoiceDate') || getCurrentPersianDate().replace(/\//g, '');
    const link = document.createElement('a');
    link.download = `${docTypeText} - ${customer} - ${date}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (err) {
    console.error(err);
    alert('خطا در دانلود تصویر');
  } finally {
    previewContainer.style.width = originalWidth;
    previewContainer.style.padding = originalPadding;
    previewContainer.style.margin = originalMargin;
    previewContainer.style.transform = originalTransform;
    if (btns) btns.classList.remove('hidden');
  }
}

function setupThousandSeparators() {
  ['productLength','productUnitPrice','taxRate','discountRate'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', function(e) {
      let val = e.target.value.replace(/,/g,'');
      if (!isNaN(val) && val!=='') e.target.value = numberWithCommas(val);
    });
  });
}

function numberWithCommas(x) {
  let parts = x.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}
function clearForm() {
  document.getElementById('invoiceNumber').value = '';
  document.getElementById('invoiceDate').value = '';
  document.getElementById('customerName').value = '';
  document.getElementById('customerNationalId').value = '';
  document.getElementById('customerPhone').value = '';
  document.getElementById('customerAddress').value = '';
  document.getElementById('products-list').innerHTML = '';
  updateProductsVisibility();
  document.getElementById('productId').value = '';
  document.getElementById('productName').value = '';
  document.getElementById('productSize').value = '';
  document.getElementById('productPressure').value = '';
  document.getElementById('productType').value = '';
  document.getElementById('productLength').value = '';
  document.getElementById('productUnitPrice').value = '';
  document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
  document.getElementById('invoiceNotes').value = '';
  document.getElementById('notes-container').classList.add('hidden');
  document.getElementById('tax-rate-container').classList.add('hidden');
  document.getElementById('discount-container').classList.add('hidden');
  localStorage.removeItem('invoiceData');
}
