import React, { useState, useRef } from 'react';
import { Camera, Upload, Loader2, CheckCircle, AlertCircle, MapPin } from 'lucide-react';
import { analyzeGarbageImage } from '../services/gemini';
import { cn } from '../lib/utils';

interface ReportFormProps {
  onReportSubmit: (report: any) => void;
}

export function ReportForm({ onReportSubmit }: ReportFormProps) {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [location, setLocation] = useState<{ 
    lat: number, 
    lng: number, 
    address?: string,
    city?: string,
    district?: string,
    state?: string,
    country?: string
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setAnalysisResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        // Reverse Geocoding using Nominatim (OpenStreetMap)
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
          const data = await response.json();
          const addr = data.address || {};
          
          const locationInfo = {
            lat,
            lng,
            address: data.display_name,
            city: addr.city || addr.town || addr.village || addr.suburb,
            district: addr.county || addr.district,
            state: addr.state,
            country: addr.country
          };
          
          setLocation(locationInfo);
          setAnalysisResult((prev: any) => ({
            ...prev,
            address: data.display_name,
            locationDetails: locationInfo
          }));
        } catch (error) {
          console.error("Reverse geocoding failed", error);
          setLocation({ lat, lng });
        }
      }, (error) => {
        console.error("Error getting location", error);
      });
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setAnalyzing(true);
    try {
      const base64Data = image.split(',')[1];
      const mimeType = image.split(';')[0].split(':')[1];
      const result = await analyzeGarbageImage(base64Data, mimeType);
      setAnalysisResult(result);
      getLocation();
    } catch (error) {
      console.error("Analysis failed", error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = () => {
    if (analysisResult && location) {
      onReportSubmit({
        imageUrl: image,
        analysis: analysisResult,
        location: {
          ...location,
          address: analysisResult.address || location.address
        },
        timestamp: Date.now(),
        status: 'pending'
      });
      setImage(null);
      setAnalysisResult(null);
      setLocation(null);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Camera className="w-6 h-6 text-blue-600" />
        Report Garbage
      </h2>

      <div 
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all overflow-hidden",
          image && "border-none"
        )}
      >
        {image ? (
          <img src={image} alt="Preview" className="w-full h-full object-cover" />
        ) : (
          <>
            <Upload className="w-12 h-12 text-gray-400 mb-2" />
            <p className="text-sm font-medium text-gray-600">Click to upload or take a photo</p>
            <p className="text-xs text-gray-400 mt-1">Supports JPG, PNG</p>
          </>
        )}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleImageUpload} 
          accept="image/*" 
          capture="environment"
          className="hidden" 
        />
      </div>

      {image && !analysisResult && (
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="w-full mt-6 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {analyzing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              AI Analyzing...
            </>
          ) : (
            'Verify with AI'
          )}
        </button>
      )}

      {analysisResult && (
        <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">AI Analysis Result</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                {analysisResult.garbage_detected ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
                <span className="text-sm font-medium">Garbage: {analysisResult.garbage_detected ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center gap-2">
                {analysisResult.person_detected ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
                <span className="text-sm font-medium">Person: {analysisResult.person_detected ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", analysisResult.severity === 'high' ? 'bg-red-500' : analysisResult.severity === 'medium' ? 'bg-orange-500' : 'bg-yellow-500')} />
                <span className="text-sm font-medium">Severity: {analysisResult.severity}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Confidence: {analysisResult.confidence}%</span>
              </div>
            </div>
            {analysisResult.vehicle_detected && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700">Vehicle Detected: {analysisResult.number_plate || 'No plate visible'}</p>
              </div>
            )}
          </div>

          {analysisResult.detected_items && analysisResult.detected_items.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {analysisResult.detected_items.map((item: string, i: number) => (
                <span key={i} className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-[10px] font-medium border border-blue-100">
                  {item}
                </span>
              ))}
            </div>
          )}

          {analysisResult.address && (
            <div className="flex flex-col gap-1 bg-gray-50 p-3 rounded-xl border border-gray-100">
              <div className="flex items-start gap-2 text-gray-600 text-xs">
                <MapPin className="w-3 h-3 mt-0.5 shrink-0 text-blue-500" />
                <span className="font-medium leading-tight">{analysisResult.address}</span>
              </div>
              {analysisResult.locationDetails && (
                <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] text-gray-400 font-bold uppercase ml-5">
                  {analysisResult.locationDetails.city && <span>{analysisResult.locationDetails.city}</span>}
                  {analysisResult.locationDetails.district && <span>• {analysisResult.locationDetails.district}</span>}
                  {analysisResult.locationDetails.state && <span>• {analysisResult.locationDetails.state}</span>}
                  {analysisResult.locationDetails.country && <span>• {analysisResult.locationDetails.country}</span>}
                </div>
              )}
            </div>
          )}

          {!location && (
            <button
              onClick={getLocation}
              className="w-full flex items-center justify-center gap-2 py-2 text-blue-600 font-medium hover:bg-blue-50 rounded-lg"
            >
              <MapPin className="w-4 h-4" />
              Add Current Location
            </button>
          )}

          {location && (
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium justify-center">
              <CheckCircle className="w-4 h-4" />
              Location Added
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!location}
            className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 disabled:opacity-50"
          >
            Submit Report
          </button>
        </div>
      )}
    </div>
  );
}
