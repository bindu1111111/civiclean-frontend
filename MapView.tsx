import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import { GarbageReport, RiskZone } from '../types';
import { Nudge } from './Nudge';
import { Camera, MapPin, Loader2 } from 'lucide-react';
import { CameraSystem } from './CameraSystem';
import { AnimatePresence } from 'motion/react';

// Fix Leaflet marker icons
// @ts-ignore
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
// @ts-ignore
import markerIcon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface MapProps {
  reports: GarbageReport[];
  riskZones: RiskZone[];
  center?: [number, number];
  zoom?: number;
  onQuickReport: (report: any) => void;
}

function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

export function MapView({ reports, riskZones, center = [15.3173, 75.7139], zoom = 7, onQuickReport }: MapProps) {
  const [geoData, setGeoData] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(center);
  const [mapZoom, setMapZoom] = useState<number>(zoom);
  const [showCamera, setShowCamera] = useState(false);

  const districts = [
    { name: 'Bangalore', coords: [12.9716, 77.5946], zoom: 12 },
    { name: 'Mysore', coords: [12.2958, 76.6394], zoom: 13 },
    { name: 'Hubli', coords: [15.3647, 75.1240], zoom: 13 },
    { name: 'Mangalore', coords: [12.9141, 74.8560], zoom: 13 },
    { name: 'Belgaum', coords: [15.8497, 74.4977], zoom: 13 },
    { name: 'Gulbarga', coords: [17.3297, 76.8343], zoom: 13 },
  ];

  useEffect(() => {
    // GeoJSON fetching removed due to unreliable external sources.
    // The map already provides district and city level detail via OpenStreetMap.
    setGeoData(null);
  }, []);

  const onEachDistrict = (feature: any, layer: L.Layer) => {
    if (feature.properties && feature.properties.district) {
      layer.bindPopup(`<strong>District: ${feature.properties.district}</strong>`);
    }
  };

  return (
    <div className="relative h-[calc(100vh-12rem)] w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      {/* Floating Camera Button */}
      <div className="absolute bottom-8 right-8 z-[1000] flex flex-col items-center gap-2">
        <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg animate-bounce">
          QUICK REPORT
        </span>
        <button 
          onClick={() => setShowCamera(true)}
          className="w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-blue-700 transition-all active:scale-95 border-4 border-white"
        >
          <Camera className="w-8 h-8" />
        </button>
      </div>

      <AnimatePresence>
        {showCamera && (
          <CameraSystem 
            onClose={() => setShowCamera(false)} 
            onReportSubmit={onQuickReport} 
          />
        )}
      </AnimatePresence>

      <div className="absolute top-4 right-4 z-[1000] bg-white p-2 rounded-lg shadow-md border border-gray-200">
        <select 
          onChange={(e) => {
            const district = districts.find(d => d.name === e.target.value);
            if (district) {
              setMapCenter(district.coords as [number, number]);
              setMapZoom(district.zoom);
            } else {
              setMapCenter(center);
              setMapZoom(zoom);
            }
          }}
          className="text-sm font-medium text-gray-700 outline-none bg-transparent"
        >
          <option value="">Select District/City</option>
          {districts.map(d => (
            <option key={d.name} value={d.name}>{d.name}</option>
          ))}
        </select>
      </div>
      <MapContainer center={mapCenter} zoom={mapZoom} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ChangeView center={mapCenter} zoom={mapZoom} />
        
        {geoData && (
          <GeoJSON 
            data={geoData} 
            style={{
              color: '#2563EB',
              weight: 1,
              fillColor: '#3B82F6',
              fillOpacity: 0.1
            }}
            onEachFeature={onEachDistrict}
          />
        )}

        {reports.map((report) => (
          <Marker key={report.id} position={[report.location.lat, report.location.lng]}>
            <Popup>
              <div className="p-2 max-w-[200px]">
                <img src={report.imageUrl} alt="Garbage" className="w-full h-32 object-cover rounded mb-2" />
                <p className="font-bold text-sm">Severity: {report.analysis.severity.toUpperCase()}</p>
                {report.analysis.detected_items && report.analysis.detected_items.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {report.analysis.detected_items.map((item, i) => (
                      <span key={i} className="bg-gray-100 text-gray-600 px-1 py-0.5 rounded text-[9px]">{item}</span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-600 font-medium mt-1 leading-tight">{report.location.address || 'Unknown Location'}</p>
                {(report.location.city || report.location.district || report.location.state || report.location.country) && (
                  <div className="flex flex-wrap gap-x-1.5 text-[8px] font-bold uppercase text-gray-400 mt-0.5">
                    {report.location.city && <span>{report.location.city}</span>}
                    {report.location.district && <span>• {report.location.district}</span>}
                    {report.location.state && <span>• {report.location.state}</span>}
                    {report.location.country && <span>• {report.location.country}</span>}
                  </div>
                )}
                <p className="text-[10px] text-gray-400 mt-1">{new Date(report.timestamp).toLocaleString()}</p>
                <p className="text-xs mt-1">{report.analysis.garbage_detected ? 'Garbage Detected' : 'No Garbage'}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {riskZones.map((zone) => (
          <Circle
            key={zone.id}
            center={[zone.lat, zone.lng]}
            radius={200}
            pathOptions={{
              fillColor: zone.riskLevel > 70 ? 'red' : zone.riskLevel > 40 ? 'orange' : 'yellow',
              color: 'transparent',
              fillOpacity: 0.4
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-red-600">High Risk Zone</h3>
                <p className="text-sm font-medium">Risk Level: {zone.riskLevel}%</p>
                <p className="text-xs mt-1 italic">"{zone.prediction}"</p>
              </div>
            </Popup>
          </Circle>
        ))}
      </MapContainer>
      <Nudge />
    </div>
  );
}

