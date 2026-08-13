// Verification-only: exposes a reference QR encoder so demo/qr-verify.html can
// compare Silk's hand-rolled encoder module-for-module. Not part of the bundle.
import QR from 'qrcode';

window.__qrRef = async (text, ecc, maskPattern, mode) => {
  const opts = { errorCorrectionLevel: ecc || 'M' };
  if (maskPattern !== undefined && maskPattern !== null) opts.maskPattern = maskPattern;
  const input = mode ? [{ data: text, mode }] : text;
  const qr = QR.create(input, opts);
  const size = qr.modules.size;
  const data = qr.modules.data;
  const rows = [];
  for (let y = 0; y < size; y++) {
    let s = '';
    for (let x = 0; x < size; x++) s += data[y * size + x] ? '1' : '0';
    rows.push(s);
  }
  return { size, rows, version: qr.version };
};
