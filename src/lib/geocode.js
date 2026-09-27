// Reverse-geocoding via OpenStreetMap Nominatim (free, no API key)
export async function reverseGeocode(latitude, longitude) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
    );
    if (!res.ok) return "";
    const data = await res.json();
    const a = data.address || {};
    const parts = [
      a.road || a.pedestrian || a.footway,
      a.neighbourhood || a.suburb || a.village || a.hamlet,
      a.city || a.town || a.municipality || a.county,
      a.state,
    ].filter(Boolean);
    return parts.length ? parts.join(", ") : data.display_name || "";
  } catch {
    return "";
  }
}