const PROVINCE_COORDS = {
  "Aceh": { x: 82.9, y: 45.8 },
  "Sumatera Utara": { x: 126.7, y: 83.9 },
  "Sumatera Barat": { x: 160.4, y: 151.3 },
  "Riau": { x: 176.1, y: 125.2 },
  "Kepulauan Riau": { x: 306.5, y: 55.3 },
  "Jambi": { x: 199.1, y: 167.3 },
  "Bengkulu": { x: 193.8, y: 204.9 },
  "Sumatera Selatan": { x: 223, y: 204.1 },
  "Bangka Belitung": { x: 262.9, y: 178 },
  "Lampung": { x: 243.9, y: 229.4 },
  "Banten": { x: 265, y: 262 },
  "DKI Jakarta": { x: 279.6, y: 257 },
  "Jawa Barat": { x: 294.6, y: 270.4 },
  "Jawa Tengah": { x: 338.4, y: 279.8 },
  "DI Yogyakarta": { x: 350.1, y: 290.6 },
  "Jawa Timur": { x: 384.3, y: 284.9 },
  "Bali": { x: 445.2, y: 299.8 },
  "Nusa Tenggara Barat": { x: 487.1, y: 307.5 },
  "Nusa Tenggara Timur": { x: 560.4, y: 306 },
  "Kalimantan Barat": { x: 357, y: 139.9 },
  "Kalimantan Tengah": { x: 410.5, y: 168.6 },
  "Kalimantan Selatan": { x: 448.7, y: 193.7 },
  "Kalimantan Timur": { x: 469.2, y: 125.4 },
  "Kalimantan Utara": { x: 467.7, y: 70 },
  "Sulawesi Utara": { x: 624.1, y: 120 },
  "Gorontalo": { x: 586.7, y: 118.9 },
  "Sulawesi Tengah": { x: 571.3, y: 161 },
  "Sulawesi Barat": { x: 524.1, y: 190.8 },
  "Sulawesi Selatan": { x: 538.9, y: 205.5 },
  "Sulawesi Tenggara": { x: 572.9, y: 203.6 },
  "Maluku Utara": { x: 693.2, y: 106 },
  "Maluku": { x: 728.9, y: 194.2 },
  "Papua Barat": { x: 792.6, y: 160.1 },
  "Papua": { x: 919.8, y: 213.1 }
};

const PROVINCE_ALIASES = {
  "DIY": "DI Yogyakarta",
  "D.I. Yogyakarta": "DI Yogyakarta",
  "Yogyakarta": "DI Yogyakarta",
  "NTB": "Nusa Tenggara Barat",
  "NTT": "Nusa Tenggara Timur",
  "DKI": "DKI Jakarta",
  "Jakarta": "DKI Jakarta",
  "Kepulauan Bangka Belitung": "Bangka Belitung",
  "Babel": "Bangka Belitung",
  "Kepri": "Kepulauan Riau"
};

function findProvinceCoord(locationString) {
  if (!locationString) return PROVINCE_COORDS["Jawa Tengah"];
  const loc = locationString.toLowerCase();

  const allKeys = [...Object.keys(PROVINCE_ALIASES), ...Object.keys(PROVINCE_COORDS)]
    .sort((a, b) => b.length - a.length); // cek yang paling spesifik/panjang dulu

  for (const key of allKeys) {
    if (loc.includes(key.toLowerCase())) {
      const officialName = PROVINCE_ALIASES[key] || key;
      return PROVINCE_COORDS[officialName];
    }
  }
  return PROVINCE_COORDS["Jawa Tengah"];
}
