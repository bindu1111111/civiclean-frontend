import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, Loader2, CheckCircle, AlertCircle, MapPin } from 'lucide-react';
import { analyzeGarbageImage } from '../services/gemini';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface CameraSystemProps {
  onClose: () => void;
  onReportSubmit: (report: any) => void;
}

export function CameraSystem({ onClose, onReportSubmit }: CameraSystemProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [liveDetections, setLiveDetections] = useState<string[]>([]);
  const [sceneDescription, setSceneDescription] = useState<string>("");
  const [location, setLocation] = useState<{ 
    lat: number, 
    lng: number, 
    address?: string,
    city?: string,
    district?: string,
    state?: string,
    country?: string
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const scanInterval = useRef<NodeJS.Timeout | null>(null);
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    startCamera();
    startLocationWatch();
    return () => {
      stopCamera();
      stopLocationWatch();
      stopScanning();
    };
  }, []);

  useEffect(() => {
    if (isScanning && !capturedImage && !analyzing) {
      startScanning();
    } else {
      stopScanning();
    }
  }, [isScanning, capturedImage, analyzing]);

  const startScanning = () => {
    stopScanning();
    scanInterval.current = setInterval(() => {
      if (!analyzing && !capturedImage) {
        takePhoto(true);
      }
    }, 3000);
  };

  const stopScanning = () => {
    if (scanInterval.current) {
      clearInterval(scanInterval.current);
      scanInterval.current = null;
    }
  };

  const startLocationWatch = () => {
    if (navigator.geolocation) {
      watchId.current = navigator.geolocation.watchPosition(
        (position) => {
          setLocation(prev => ({
            ...prev,
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }));
        },
        (err) => console.error("Location watch error", err),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }
  };

  const stopLocationWatch = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, 
        audio: false 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera", err);
      setError("Could not access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const takePhoto = (isAuto = false) => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        if (!isAuto) {
          setCapturedImage(dataUrl);
        }
        handleAnalyze(dataUrl, isAuto);
      }
    }
  };

  const handleAnalyze = async (image: string, isAuto = false) => {
    if (isAuto && analyzing) return;
    
    setAnalyzing(true);
    setError(null);
    try {
      const base64Data = image.split(',')[1];
      const mimeType = 'image/jpeg';
      
      // Use current tracked location or fetch fresh
      let currentLat = location?.lat;
      let currentLng = location?.lng;

      if (!currentLat || !currentLng) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
        });
        currentLat = pos.coords.latitude;
        currentLng = pos.coords.longitude;
      }

      const [analysis, geoResponse] = await Promise.all([
        analyzeGarbageImage(base64Data, mimeType),
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${currentLat}&lon=${currentLng}&zoom=18&addressdetails=1`).then(res => res.json())
      ]);

      const addr = geoResponse.address || {};
      const locationInfo = {
        lat: currentLat,
        lng: currentLng,
        address: geoResponse.display_name,
        city: addr.city || addr.town || addr.village || addr.suburb,
        district: addr.county || addr.district,
        state: addr.state,
        country: addr.country
      };

      const result = {
        ...analysis,
        address: geoResponse.display_name,
        locationDetails: locationInfo
      };

      setLiveDetections(result.all_objects || []);
      setSceneDescription(result.scene_description || "");

      if (isAuto) {
        // If auto-scanning and garbage is detected with high confidence, notify user
        if (result.garbage_detected && result.confidence > 0.7) {
          setCapturedImage(image);
          setAnalysisResult(result);
          setLocation(locationInfo);
          setIsScanning(false); // Stop scanning once something is found
        }
      } else {
        setAnalysisResult(result);
        setLocation(locationInfo);
      }
      
      setAnalyzing(false);
    } catch (err) {
      console.error("Analysis failed", err);
      if (!isAuto) setError("AI analysis failed. Please try again.");
      setAnalyzing(false);
    }
  };

  const handleSubmit = () => {
    if (analysisResult && location && capturedImage) {
      onReportSubmit({
        imageUrl: capturedImage,
        analysis: analysisResult,
        location,
        timestamp: Date.now(),
        status: 'pending'
      });
      onClose();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[2000] bg-black flex flex-col"
    >
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {!capturedImage ? (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
            <div className="absolute top-8 left-8 flex flex-col gap-2 max-w-[70%]">
              <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 w-fit">
                <div className={cn("w-2 h-2 rounded-full", isScanning ? "bg-green-500 animate-pulse" : "bg-red-500")} />
                <span className="text-white text-[10px] font-bold tracking-widest uppercase">
                  {isScanning ? 'Live AI Scanning' : 'Scanning Paused'}
                </span>
              </div>
              {location?.lat && (
                <div className="flex flex-col gap-1 bg-black/40 backdrop-blur-md px-3 py-2 rounded-2xl border border-white/20 w-fit">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-blue-400" />
                    <span className="text-white text-[10px] font-medium">
                      {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                    </span>
                  </div>
                  {(location.city || location.district || location.state || location.country) && (
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] text-white/70 font-bold uppercase tracking-tighter">
                      {location.city && <span>{location.city}</span>}
                      {location.district && <span>• {location.district}</span>}
                      {location.state && <span>• {location.state}</span>}
                      {location.country && <span>• {location.country}</span>}
                    </div>
                  )}
                </div>
              )}
              
              <AnimatePresence>
                {sceneDescription && (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-black/60 backdrop-blur-xl border border-white/20 p-4 rounded-3xl text-white shadow-2xl"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Live AI Perception</p>
                      <div className="flex gap-1">
                        <div className="w-1 h-1 rounded-full bg-blue-400 animate-ping" />
                        <div className="w-1 h-1 rounded-full bg-blue-400" />
                      </div>
                    </div>
                    <p className="text-sm font-bold leading-snug mb-3">{sceneDescription}</p>
                    
                    {liveDetections.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Identified Objects</p>
                        <div className="flex flex-wrap gap-1.5">
                          {liveDetections.map((obj, i) => (
                            <motion.span 
                              key={`${obj}-${i}`}
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: i * 0.05 }}
                              className="bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-full text-[10px] font-bold border border-white/5 transition-colors"
                            >
                              {obj}
                            </motion.span>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="absolute bottom-12 left-0 right-0 flex justify-center items-center gap-8 px-6">
              <button 
                onClick={onClose}
                className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white"
              >
                <X className="w-6 h-6" />
              </button>
              <button 
                onClick={() => takePhoto(false)}
                className="w-20 h-20 rounded-full bg-white border-4 border-white/30 flex items-center justify-center shadow-2xl"
              >
                <div className="w-16 h-16 rounded-full border-2 border-black/10" />
              </button>
              <button 
                onClick={() => setIsScanning(!isScanning)}
                className={cn(
                  "w-14 h-14 rounded-full backdrop-blur-md flex items-center justify-center transition-colors",
                  isScanning ? "bg-green-500/40 text-green-400" : "bg-white/20 text-white"
                )}
              >
                <Loader2 className={cn("w-6 h-6", isScanning && "animate-spin")} />
              </button>
            </div>
          </>
        ) : (
          <div className="relative w-full h-full">
            <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
            
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-8 pt-20">
              <AnimatePresence mode="wait">
                {analyzing ? (
                  <motion.div 
                    key="analyzing"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex flex-col items-center text-white"
                  >
                    <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-400" />
                    <p className="text-lg font-bold">AI Scanning Scene...</p>
                    <p className="text-sm opacity-70">Detecting people, objects, and litter</p>
                  </motion.div>
                ) : error ? (
                  <motion.div 
                    key="error"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/20 backdrop-blur-md border border-red-500/50 p-4 rounded-2xl text-white flex items-center gap-3"
                  >
                    <AlertCircle className="w-6 h-6 text-red-400" />
                    <p className="text-sm font-medium">{error}</p>
                    <button onClick={() => setCapturedImage(null)} className="ml-auto text-xs underline">Retry</button>
                  </motion.div>
                ) : analysisResult ? (
                  <motion.div 
                    key="result"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl text-white">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <span className="font-bold text-sm">Scene Analysis Complete</span>
                      </div>
                      <p className="text-xs italic mb-3 opacity-80">"{analysisResult.scene_description}"</p>
                      <div className="grid grid-cols-2 gap-2 text-[10px] opacity-90">
                        <p className="flex items-center gap-1">
                          <span className={cn("w-1.5 h-1.5 rounded-full", analysisResult.garbage_detected ? "bg-red-500" : "bg-green-500")} />
                          Garbage: {analysisResult.garbage_detected ? 'Detected' : 'None'}
                        </p>
                        <p className="flex items-center gap-1">
                          <span className={cn("w-1.5 h-1.5 rounded-full", analysisResult.person_detected ? "bg-blue-500" : "bg-gray-500")} />
                          Person: {analysisResult.person_detected ? 'Visible' : 'No'}
                        </p>
                        <p className="flex items-center gap-1">
                          <span className={cn("w-1.5 h-1.5 rounded-full", analysisResult.vehicle_detected ? "bg-yellow-500" : "bg-gray-500")} />
                          Vehicle: {analysisResult.vehicle_detected ? 'Yes' : 'No'}
                        </p>
                        <p className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                          Severity: {analysisResult.severity.toUpperCase()}
                        </p>
                        
                        {analysisResult.all_objects && analysisResult.all_objects.length > 0 && (
                          <div className="col-span-2 mt-2">
                            <p className="font-bold mb-1 uppercase text-[9px] tracking-wider text-blue-300">All Detected Objects:</p>
                            <div className="flex flex-wrap gap-1">
                              {analysisResult.all_objects.map((item: string, i: number) => (
                                <span key={i} className="bg-white/10 px-1.5 py-0.5 rounded text-[9px] border border-white/5">{item}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {analysisResult.detected_items && analysisResult.detected_items.length > 0 && (
                          <div className="col-span-2 mt-2">
                            <p className="font-bold mb-1 uppercase text-[9px] tracking-wider text-red-300">Litter Details:</p>
                            <div className="flex flex-wrap gap-1">
                              {analysisResult.detected_items.map((item: string, i: number) => (
                                <span key={i} className="bg-red-500/20 px-1.5 py-0.5 rounded text-[9px] border border-red-500/20">{item}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="col-span-2 flex flex-col gap-1 mt-2 pt-2 border-t border-white/10">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-blue-400" />
                            <span className="truncate">{analysisResult.address}</span>
                          </div>
                          {location && (
                            <div className="flex flex-wrap gap-x-1.5 text-[8px] font-bold uppercase text-white/50">
                              {location.city && <span>{location.city}</span>}
                              {location.district && <span>• {location.district}</span>}
                              {location.state && <span>• {location.state}</span>}
                              {location.country && <span>• {location.country}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setCapturedImage(null)}
                        className="flex-1 bg-white/20 backdrop-blur-md text-white py-4 rounded-2xl font-bold"
                      >
                        Retake
                      </button>
                      <button 
                        onClick={handleSubmit}
                        className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-600/30"
                      >
                        Submit Report
                      </button>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </motion.div>
  );
}
