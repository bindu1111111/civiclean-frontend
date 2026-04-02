export interface GarbageReport {
  id: string;
  userId: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
    city?: string;
    district?: string;
    state?: string;
    country?: string;
  };
  imageUrl: string;
  analysis: {
    garbage_detected: boolean;
    person_detected: boolean;
    throwing_action: boolean;
    vehicle_detected: boolean;
    number_plate: string | null;
    detected_items: string[];
    all_objects?: string[];
    scene_description?: string;
    confidence: number;
    severity: 'low' | 'medium' | 'high';
  };
  timestamp: number;
  status: 'pending' | 'verified' | 'cleaned';
}

export interface RiskZone {
  id: string;
  lat: number;
  lng: number;
  riskLevel: number; // 0 to 100
  prediction: string;
  lastUpdated: number;
}

export interface UserProfile {
  id: string;
  displayName: string;
  points: number;
  reportsCount: number;
  rank: string;
}
