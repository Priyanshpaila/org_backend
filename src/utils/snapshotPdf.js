// utils/snapshotPdf.js
import puppeteer from 'puppeteer';

function bufToDataUri(img) {
  if (!img || !img.data) return '';
  const mime = img.contentType || 'image/png';
  const b64 = Buffer.isBuffer(img.data) ? img.data.toString('base64') : Buffer.from(img.data).toString('base64');
  return `data:${mime};base64,${b64}`;
}

function ddmmyyyy(d) {
  if (!d) return '';
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = dt.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function getAgeYearsSafe(doc) {
  const dob = doc?.dateOfBirth ? new Date(doc.dateOfBirth) : null;
  if (!dob || Number.isNaN(dob)) return '';
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) years--;
  return `${years} yrs`;
}

export async function generateSnapshotPDF(doc) {
  const leftLogo = bufToDataUri(doc.leftLogo);       
  const rightLogo = bufToDataUri(doc.rightLogo);     
  const headSig  = bufToDataUri(doc.headHRSignature);
  const dirSig   = bufToDataUri(doc.directorSignature);
  const photo    = bufToDataUri(doc.personPhoto);    

  const ageStr = typeof doc.getAgeYears === 'function' ? (doc.getAgeYears() || '') : getAgeYearsSafe(doc);
  const presentedStr = ddmmyyyy(doc.presentedOn);

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Profile Snapshot</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color:#111; }

  .sheet { width: 100%; border: 1px solid #cfcfcf; }

  /* Header ribbon */
  .ribbon { position: relative; height: 60px; background: #dcdcdc; overflow: hidden; }
  .ribbon svg { position:absolute; left:0; right:0; bottom:-1px; width:100%; height:16px; }
  .ribbon-inner { position:absolute; inset:0 0 auto 0; display:flex; align-items:center; justify-content:space-between; padding:0 14px; }
  .r-slot { display:flex; align-items:center; gap:10px; }

  /* Left: person photo (bigger, no border) */
  .photo-box {
    width: 46px; height: 46px; border-radius: 6px; background:#fff;
    overflow:hidden; display:flex; align-items:center; justify-content:center;
  }
  .photo-box img { width:100%; height:100%; object-fit:cover; }

  /* Center: left logo (no border box) */
  .center-badge { display:flex; align-items:center; justify-content:center; }
  .center-badge img { max-height:38px; max-width:220px; object-fit:contain; }

  /* Right: RR ISPAT / right logo (no border box) */
  .right-logo { display:flex; align-items:center; }
  .right-logo img { max-height:32px; max-width:180px; object-fit:contain; }

  .title-row { padding: 6px 12px; border-bottom: 1px solid #cfcfcf; }
  .title { font-size: 20px; font-weight: 700; }

  .grid { display:grid; grid-template-columns: 58% 42%; }

  table { width:100%; border-collapse: collapse; table-layout: fixed; }
  th, td { border: 1px solid #dadada; padding: 6px 8px; vertical-align: top; }
  th { width: 42%; background:#efefef; text-align:left; font-weight:600; }

  .row-name td { height: 38px; }
  .row-tall td { height: 92px; }
  .row-taller td { height: 140px; }

  .r-lg td { height: 145px; }
  .r-md td { height: 100px; }

  .signatures { display:flex; justify-content:space-between; gap: 16px; padding: 8px 8px 6px; }
  .sig-box { flex:1; height: 58px; border:1px solid #dadada; display:flex; align-items:center; justify-content:center; }
  .sig-box img { max-height:54px; object-fit:contain; }
  .sig-labels { display:flex; justify-content:space-between; padding: 2px 8px 8px; color:#333; font-size: 12px; }

  .footer { margin-top: 6px; background:#dcdcdc; border-top:1px solid #c0c0c0; padding: 8px 10px;
            display:flex; justify-content:space-between; align-items:center; font-size: 12px; }
  .bold { font-weight:700; }
  .note { color:#333; font-style: italic; }
</style>
</head>
<body>
  <div class="sheet">
    <div class="ribbon">
      <div class="ribbon-inner">
        <!-- LEFT: person photo -->
        <div class="r-slot">
          <div class="photo-box">${photo ? `<img src="${photo}" alt="Photo" />` : ''}</div>
        </div>

        <!-- CENTER: leftLogo -->
        <div class="center-badge">
          ${leftLogo ? `<img src="${leftLogo}" alt="Center Logo" />` : '<strong>HIRA</strong>'}
        </div>

        <!-- RIGHT: RR ISPAT / rightLogo -->
        <div class="r-slot">
          <div class="right-logo">
            ${rightLogo ? `<img src="${rightLogo}" alt="Right Logo" />` : '<span style="font-weight:700;font-size:12px;">RR ISPAT</span>'}
          </div>
        </div>
      </div>
      <svg viewBox="0 0 100 10" preserveAspectRatio="none">
        <path d="M0,6 C25,10 75,2 100,6 L100,10 L0,10 Z" fill="#c9c9c9"></path>
      </svg>
    </div>

    <div class="title-row"><div class="title">Profile Snapshot</div></div>

    <div class="grid">
      <div>
        <table>
          <tr class="row-name"><th>Name</th><td>${doc.personName || '—'}</td></tr>
          <tr><th>Designation, Grade</th><td>${[doc.designation || '—', doc.grade || ''].filter(Boolean).join(', ')}</td></tr>
          <tr><th>Date of Joining</th><td>${ddmmyyyy(doc.dateOfJoining) || '—'}</td></tr>
          <tr><th>Service Tenure with Organization</th><td>${doc.serviceTenureText || '—'}</td></tr>
          <tr><th>Date of Birth and<br/>Age (in Years)</th><td>${ddmmyyyy(doc.dateOfBirth) || '—'} ${ageStr ? `&nbsp;&nbsp;(${ageStr})` : ''}</td></tr>
          <tr><th>Total Exp in domain, &amp; Industry</th><td>${doc.totalExperienceText || '—'}</td></tr>
          <tr><th>Previous Organization</th><td>${doc.previousOrganization || '—'}</td></tr>
          <tr><th>Qualification</th><td>${(doc.qualifications || []).join(', ') || '—'}</td></tr>
          <tr class="row-tall"><th>Major Certification(s)</th><td>${(doc.majorCertifications || []).join(', ') || '—'}</td></tr>
          <tr class="row-tall"><th>Merit for vertical<br/>movement</th><td>${(doc.meritsForVerticalMovement || []).map(x=>`• ${x}`).join('<br/>') || '—'}</td></tr>
          <tr class="row-taller"><th>Position Summary</th><td>${doc.positionSummary || '—'}</td></tr>
        </table>
      </div>

      <div>
        <table>
          <tr class="r-lg"><th>Additional Comments or Note(s) by Head HR</th><td>${doc.additionalCommentsHeadHR || ''}</td></tr>
          <tr class="r-lg"><th>Comments of Director(s) or MD</th><td>${doc.commentsDirectorsOrMD || ''}</td></tr>
          <tr class="r-md"><th class="bold">Final Decision taken</th><td>${doc.finalDecisionTaken || ''}</td></tr>
        </table>

        <div class="signatures">
          <div class="sig-box">${headSig ? `<img src="${headSig}" />` : ''}</div>
          <div class="sig-box">${dirSig ? `<img src="${dirSig}" />` : ''}</div>
        </div>
        <div class="sig-labels">
          <div>Head-HR${doc.headHRName ? ` — ${doc.headHRName}` : ''}</div>
          <div>Director or MD${doc.directorOrMDName ? ` — ${doc.directorOrMDName}` : ''}</div>
        </div>
      </div>
    </div>

    <div class="footer">
      <div>Presented by Human Resources on <span class="bold">${presentedStr || '—'}</span></div>
      <div class="note">for Confidential discussion  with Board of Directors &nbsp;&nbsp; V1.0</div>
    </div>
  </div>
</body>
</html>`;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.emulateMediaType('screen');
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 0 });

    const pdf = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '5mm', right: '5mm', bottom: '5mm', left: '5mm' },
      scale: 0.92, 
    });
    return pdf;
  } finally {
    try { await browser?.close(); } catch {}
  }
}
