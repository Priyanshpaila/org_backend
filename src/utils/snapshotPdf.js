// utils/snapshotPdf.js
import puppeteer from "puppeteer";

function bufToDataUri(img) {
  if (!img || !img.data) return "";
  const mime = img.contentType || "image/png";
  const b64 = Buffer.isBuffer(img.data)
    ? img.data.toString("base64")
    : Buffer.from(img.data).toString("base64");
  return `data:${mime};base64,${b64}`;
}

function ddmmyyyy(d) {
  if (!d) return "";
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function getAgeYearsSafe(doc) {
  const dob = doc?.dateOfBirth ? new Date(doc.dateOfBirth) : null;
  if (!dob || Number.isNaN(dob)) return "";
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) years--;
  return `${years} yrs`;
}

export async function generateSnapshotPDF(doc) {
  const leftLogo = bufToDataUri(doc.leftLogo);
  const rightLogo = bufToDataUri(doc.rightLogo);
  const headSig = bufToDataUri(doc.headHRSignature);
  const dirSig = bufToDataUri(doc.directorSignature);
  const photo = bufToDataUri(doc.personPhoto);

  const ageStr =
    typeof doc.getAgeYears === "function"
      ? doc.getAgeYears() || ""
      : getAgeYearsSafe(doc);
  const presentedStr = ddmmyyyy(doc.presentedOn);

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Profile Snapshot</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color:#222; background:#f6f8fb; }

  /* Palette */
:root{
  --primary:#4A4A4A;       /* Neutral gray */
  --primary-dark:#2f2f2f;
  --accent:#FFD5D5;
  --ink:#222222;
  --muted:#777777;
  --panel:#ffffff;
  --border:#e0e0e0;
  --table-border:#B7B7B7;
  --table-head:#F8E9CE;
  --title-bg:#f3f3f3;
  --ribbon-wave:#2f2f2f;
  --final-pill-bg:#fff5f5;
  --final-pill-text:#000;
}

  .sheet {
    width: 100%;
    border: 1px solid var(--border);
    background: var(--panel);
    box-shadow: 0 2px 6px rgba(0,0,0,0.05);
  }

  /* Header ribbon */
  .ribbon { position: relative; height: 64px; background: var(--navy); color:#fff; overflow: hidden; }
  .ribbon svg { position:absolute; left:0; right:0; bottom:-1px; width:100%; height:16px; }
  .ribbon-inner {
    position:absolute; inset:0 0 auto 0; display:flex; align-items:center;
    justify-content:space-between; padding:0 14px;
  }
  .r-slot { display:flex; align-items:center; gap:10px; }

  /* Left: person photo */
  .photo-box {
    width: 55px; height: 55px; border-radius: 0px; background:#fff;
    overflow:hidden; display:flex; align-items:center; justify-content:center;
    box-shadow:0 1px 3px rgba(0,0,0,0.15);
  }
  .photo-box img { width:100%; height:100%; object-fit:cover; }

  /* Center: left logo */
  .center-badge { display:flex; align-items:center; justify-content:center; }
  .center-badge img { max-height:60px; max-width:240px; object-fit:contain; }
  .center-badge strong { font-size:22px; font-weight:700; color:#fff; letter-spacing:.4px; }

  /* Right: RR ISPAT / right logo */
  .right-logo { display:flex; align-items:center; }
  .right-logo img { max-height:45px; max-width:180px; object-fit:contain; }

  .title-row { padding: 8px 14px; border-bottom: 2px solid var(--navy); background:var(accent); }
  .title { font-size: 22px; font-weight: 700; color:var(--navy); letter-spacing:.2px; }

  .grid { display:grid; grid-template-columns: 52% 47%; column-gap:1%; }

  table { width:100%; border-collapse: collapse; table-layout: fixed; }
  th, td { border: 1px solid var(--table-border); padding: 7px 9px; vertical-align: top; font-size: 13.5px; }
  th {
    width: 50%; background:var(--table-head); text-align:left; font-weight:600; color:var(--navy);
  }

  .row-name td { height: 40px; font-weight:400; color:var(--ink); }
  .row-tall td { height: 94px; }
  .row-taller td { height: 156px; }

  .r-lg td { height: 145px; }
  .r-lg th {font-weight: 400;}
  .r-md td { height: 100px; }

  /* Final decision subtle highlight */
  .final-decision th { border-left: 1px solid var(--table-border); }
  .final-decision td {
    background: var(--final-pill-bg);
    color: var(--final-pill-text);
    font-weight: 400;
  }

  .signatures { display:flex; justify-content:space-between; gap: 32px; padding: 10px 2px;  }
  .sig-box {
    flex:1; height: 60px; border:1px solid #B7B7B7; background:#fafafa;
    display:flex; align-items:center; justify-content:center;
  }
  .sig-box img { max-height:54px; object-fit:contain; }
  .sig-labels { display:flex; justify-content:space-between; padding: 4px 10px 10px; color:#000; font-size: 12px; }

  .footer {
  
  
    margin-top: 8px; background:var(--navy); color:#000; border-top:3px solid var(--navy-dark);
    padding: 8px 12px; display:flex; justify-content:space-between; align-items:center; font-size: 12.5px;
  }
  .bold { font-weight:700; }
  .note { color:#000; font-style: italic; }

  /* Small helpers for lists inside cells */
  .bullets { margin:0; padding-left:16px; }
  .bullets li { line-height:1.35; margin: 2px 0; }
</style>
</head>
<body>
  <div class="sheet">
    <div class="ribbon">
      <div class="ribbon-inner">
        <!-- LEFT: person photo -->
        <div class="r-slot">
          <div class="photo-box">${
            photo ? `<img src="${photo}" alt="Photo" />` : ""
          }</div>
        </div>

        <!-- CENTER: leftLogo -->
        <div class="center-badge">
          ${
            leftLogo
              ? `<img src="${leftLogo}" alt="Center Logo" />`
              : "<strong>HIRA</strong>"
          }
        </div>

        <!-- RIGHT: RR ISPAT / rightLogo -->
        <div class="r-slot">
          <div class="right-logo">
            ${
              rightLogo
                ? `<img src="${rightLogo}" alt="Right Logo" />`
                : '<span style="font-weight:700;font-size:13px;color:#fff;">RR ISPAT</span>'
            }
          </div>
        </div>
      </div>
      <svg viewBox="0 0 100 10" preserveAspectRatio="none">
        <path d="M0,6 C25,10 75,2 100,6 L100,10 L0,10 Z" fill="var(--ribbon-wave)"></path>
      </svg>
    </div>

    <div class="title-row"><div class="title">Profile Snapshot</div></div>

    <div class="grid">
      <div>
        <table>
          <tr class="row-name">
            <th>Name</th>
            <td>${doc.personName || "—"}</td>
          </tr>
          <tr>
            <th>Designation, Grade</th>
            <td>${[doc.designation || "—", doc.grade || ""]
              .filter(Boolean)
              .join(", ")}</td>
          </tr>
          <tr>
            <th>Date of Joining</th>
            <td>${ddmmyyyy(doc.dateOfJoining) || "—"}</td>
          </tr>
          <tr>
            <th>Service Tenure with Organization</th>
            <td>${doc.serviceTenureText || "—"}</td>
          </tr>
          <tr>
            <th>Date of Birth & Age (in Years)</th>
            <td>${ddmmyyyy(doc.dateOfBirth) || "—"} ${
    typeof ageStr !== "undefined" && ageStr ? `&nbsp;&nbsp;(${ageStr})` : ""
  }</td>
          </tr>
          <tr>
            <th>Total Exp in domain, &amp; Industry</th>
            <td>${doc.totalExperienceText || "—"}</td>
          </tr>
          <tr>
            <th>Previous Organization</th>
            <td>${doc.previousOrganization || "—"}</td>
          </tr>
          <tr>
            <th>Qualification</th>
            <td>${(doc.qualifications || []).join(", ") || "—"}</td>
          </tr>
          <tr class="row-tall">
            <th>Major Certification(s)</th>
            <td>${(doc.majorCertifications || []).join(", ") || "—"}</td>
          </tr>
          <tr class="row-tall">
            <th>Merit for vertical movement</th>
            <td>
              ${
                (doc.meritsForVerticalMovement || []).length
                  ? `<ul class="bullets">${doc.meritsForVerticalMovement
                      .map((x) => `<li>${x}</li>`)
                      .join("")}</ul>`
                  : "—"
              }
            </td>
          </tr>
          <tr class="row-taller">
            <th>Position Summary</th>
            <td>${doc.positionSummary || "—"}</td>
          </tr>
        </table>
      </div>

      <div>
     <table>
     <tr class="r-lg">
       <th>Additional Comments or Note(s) by Head HR</th>
     </tr>
     <tr class="r-lg">
      <td>${doc.additionalCommentsHeadHR || ""}</td>
      </tr>

      <tr class="r-lg">
      <th>Comments of Director(s) or MD</th>
      </tr>
      <tr class="r-lg">
      <td>${doc.commentsDirectorsOrMD || ""}</td>
      </tr>

      <tr class="r-lg final-decision">
      <th class="bold">Final Decision taken</th>
      </tr>
      <tr class="r-lg final-decision">
      <td>${doc.finalDecisionTaken || ""}</td>
      </tr>
      </table>

     <div class="signatures">
     <div class="sig-box">${
       headSig ? `<img src="${headSig}" alt="Head-HR Signature"/>` : ""
     }</div>
     <div class="sig-box">${
       dirSig ? `<img src="${dirSig}" alt="Director/MD Signature"/>` : ""
     }</div>
     </div>
     <div class="sig-labels">
     <div>Head-HR${doc.headHRName ? ` — ${doc.headHRName}` : ""}</div>
     <div>Director or MD${
       doc.directorOrMDName ? ` — ${doc.directorOrMDName}` : ""
     }</div>
     </div>
     </div>


     
    </div>
    <div class="footer">
      <div>Presented by Human Resources on <span class="bold">${
        presentedStr || "—"
      }</span></div>
      <div class="note">for Confidential discussion with Board of Directors &nbsp;&nbsp; V1.0</div>
  </div>
</body>
</html>
`;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.emulateMediaType("screen");
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 0 });

    const pdf = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      margin: { top: "5mm", right: "5mm", bottom: "5mm", left: "5mm" },
      scale: 0.88,
    });
    return pdf;
  } finally {
    try {
      await browser?.close();
    } catch {}
  }
}
