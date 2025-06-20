import { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import {
  Camera,
  Upload,
  Scan,
  AlertTriangle,
  CheckCircle,
  X,
  RotateCcw,
  Thermometer,
  Droplets,
  Clock,
  Zap,
  Eye,
  Target,
  Wifi,
  WifiOff,
  Play,
  Pause,
  Settings,
  Info,
  Heart,
  Shield,
  TrendingUp,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SpoilageResult {
  freshness: number; // 0-100 score
  status: "fresh" | "good" | "warning" | "spoiled";
  confidence: number;
  indicators: Array<{
    type: string;
    severity: "low" | "medium" | "high";
    description: string;
  }>;
  recommendations: string[];
  estimatedShelfLife: string;
  detectedIssues: string[];
  predictedClass?: string;
  foodItemName?: string;
}

interface IoTSensorData {
  temperature: number | null;
  humidity: number | null;
  lastUpdate: string;
  connected: boolean;
}

const mockSpoilageResult: SpoilageResult = {
  freshness: 75,
  status: "good",
  confidence: 92,
  indicators: [
    {
      type: "Color Change",
      severity: "low",
      description: "Slight browning detected on edges",
    },
    {
      type: "Texture",
      severity: "medium",
      description: "Surface appears slightly soft",
    },
  ],
  recommendations: [
    "Consume within 2-3 days",
    "Store in refrigerator",
    "Check for any unusual odors before consumption",
  ],
  estimatedShelfLife: "2-3 days",
  detectedIssues: [],
};

const mockIoTData: IoTSensorData = {
  temperature: null,
  humidity: null,
  lastUpdate: "Never",
  connected: false,
};

const CAMERA_OPTIONS = [
  { label: 'Laptop Camera', value: 'laptop' },
  { label: 'ESP32 Camera', value: 'esp32' },
];

export default function SpoilageDetection() {
  const [scanMode, setScanMode] = useState<"camera" | "upload" | "iot">("camera");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<SpoilageResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [iotData, setIoTData] = useState<IoTSensorData>(mockIoTData);
  const [aiSensitivity, setAiSensitivity] = useState([75]);
  const [model, setModel] = useState<mobilenet.MobileNet | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const [cameraSource, setCameraSource] = useState<'laptop' | 'esp32'>('laptop');
  const [laptopDeviceId, setLaptopDeviceId] = useState<string | undefined>(undefined);
  const [esp32ImageUrl, setEsp32ImageUrl] = useState<string>("");
  const [esp32ImageLoading, setEsp32ImageLoading] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState(false);

  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchIoTData = async () => {
    console.log('\n=== Fetching IoT Data ===');
    try {
      const response = await fetch('http://localhost:5000/get_iot_data');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Raw response data:', data);
      
      // Validate data
      if (typeof data.temperature !== 'number' || 
          typeof data.humidity !== 'number' || 
          typeof data.connected !== 'boolean' || 
          typeof data.lastUpdate !== 'string') {
        console.error('Invalid data format received:', data);
        return;
      }

      setIoTData({
        temperature: data.temperature,
        humidity: data.humidity,
        connected: data.connected,
        lastUpdate: data.lastUpdate
      });
      console.log('Updated IoT state:', {
        temperature: data.temperature,
        humidity: data.humidity,
        connected: data.connected,
        lastUpdate: data.lastUpdate
      });
    } catch (error) {
      console.error('Error fetching IoT data:', error);
      setIoTData({
        temperature: 0,
        humidity: 0,
        connected: false,
        lastUpdate: 'Error: ' + (error instanceof Error ? error.message : 'Unknown error')
      });
    }
  };

  useEffect(() => {
    console.log('Setting up IoT data polling...');
    // Fetch immediately
    fetchIoTData();
    
    // Then fetch every 2 seconds
    const interval = setInterval(fetchIoTData, 2000);
    
    return () => {
      console.log('Cleaning up IoT data polling...');
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const checkCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasPermission(true);
        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        setHasPermission(false);
        setCameraError("Camera access denied. Please enable camera permissions in your browser settings.");
      }
    };
    
    checkCameraPermission();
  }, []);

  useEffect(() => {
    const loadModel = async () => {
      try {
        await tf.ready();
        const loadedModel = await mobilenet.load();
        setModel(loadedModel);
        setIsModelLoading(false);
      } catch (error) {
        console.error('Error loading model:', error);
        setCameraError('Failed to load image analysis model');
      }
    };
    loadModel();
  }, []);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((allDevices) => {
      const videoDevices = allDevices.filter(
        (device) =>
          device.kind === 'videoinput' &&
          device.label &&
          !/iriun|droid|virtual/i.test(device.label)
      );
      if (videoDevices.length > 0) {
        setLaptopDeviceId(videoDevices[0].deviceId);
      }
    });
  }, []);

  // Update ESP32 camera handling to fetch and display the live image
  useEffect(() => {
    if (cameraSource === 'esp32') {
      // Continuously fetch the latest image from ESP32 for display
      const fetchEsp32Image = () => {
        setEsp32ImageLoading(true);
        // Use a cache-busting timestamp to ensure a fresh image is always fetched
        const url = `http://192.168.65.102/cam.jpg?t=${Date.now()}`;
        setEsp32ImageUrl(url);
        // We'll set loading to false in the img onError/onLoad handlers in the JSX
      };

      fetchEsp32Image(); // Fetch immediately when switching to ESP32

      // Set up an interval to continuously refresh the image
      const interval = setInterval(fetchEsp32Image, 1000); // Refresh every 1 second

      return () => clearInterval(interval); // Clean up interval on unmount or mode change
    } else {
      // Clear ESP32 image when not in esp32 mode
      setEsp32ImageUrl("");
      setEsp32ImageLoading(false);
    }
  }, [cameraSource]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      console.log('File selected:', file.name, 'Size:', file.size);
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageSrc = e.target?.result as string;
        console.log('Image loaded, size:', imageSrc.length);
        handleImageAnalysis(imageSrc).finally(() => {
          setIsUploading(false);
        });
      };
      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        setCameraError('Failed to read the image file');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = async () => {
    if (isScanning) {
      console.log('Already scanning, please wait...');
      return;
    }

    try {
      setIsScanning(true);
      setCameraError(null);
      setScanResult(null);
      console.log('Starting capture process...');

      let imageSrc: string | null = null;

      if (cameraSource === 'laptop') {
        if (!webcamRef.current) {
          throw new Error('Webcam not ready');
        }
        imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) {
          throw new Error('Failed to capture image from webcam');
        }
        console.log('Image captured from webcam');
      } else if (cameraSource === 'esp32') {
        if (!esp32ImageUrl) {
          throw new Error('No ESP32 image available');
        }
        imageSrc = esp32ImageUrl;
        console.log('Using ESP32 image');
      }

      if (!imageSrc) {
        throw new Error('No image source available');
      }

      // Process the image
      await handleImageAnalysis(imageSrc);

    } catch (error) {
      console.error('Capture error:', error);
      setCameraError(error instanceof Error ? error.message : 'Failed to capture image');
      setScanResult(null);
    } finally {
      setIsScanning(false);
      setEsp32ImageLoading(false);
    }
  };

  const handleImageAnalysis = async (imageSrc: string) => {
    try {
      console.log('Starting image analysis...');

      // Convert base64 to blob
      const base64Response = await fetch(imageSrc);
      if (!base64Response.ok) {
        throw new Error(`Failed to process image: ${base64Response.statusText}`);
      }
      const blob = await base64Response.blob();
      console.log('Image converted to blob');

      // Create form data
      const formData = new FormData();
      formData.append('image', blob, 'capture.jpg');

      // Send to backend
      const response = await fetch('http://localhost:5000/predict_from_esp32', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Analysis complete:', data);

      if (data.status === 'success') {
        const result = {
          ...mockSpoilageResult,
          predictedClass: data.predictedClass || 'Unknown',
          confidence: data.confidence || 0,
          status: (data.spoilage_status || 'good').toLowerCase(),
          foodItemName: data.foodItemName || 'Unknown Food Item'
        };
        setScanResult(result);
      } else {
        throw new Error(data.message || 'Failed to analyze image');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      throw error; // Re-throw to be caught by handleCameraCapture
    }
  };

  const resetScan = () => {
    setScanResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "fresh":
        return "emerald";
      case "good":
        return "blue";
      case "warning":
        return "amber";
      case "spoiled":
        return "red";
      default:
        return "gray";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "low":
        return "text-green-600";
      case "medium":
        return "text-amber-600";
      case "high":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const toggleLiveMode = () => {
    setIsLiveMode(!isLiveMode);
    if (!isLiveMode) {
      setScanResult(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Spoilage Detection
          </h1>
          <p className="text-xl text-gray-600">
            AI-powered food freshness analysis using computer vision and IoT
            sensors
          </p>
        </div>
        <div className="flex items-center space-x-2 mt-4 md:mt-0">
          <Badge
            className={
              iotData.connected
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }
          >
            {iotData.connected ? (
              <>
                <Wifi className="h-3 w-3 mr-1" />
                IoT Connected
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 mr-1" />
                IoT Disconnected
              </>
            )}
          </Badge>
          <span className="text-sm text-gray-500">
            Last Update: {iotData.lastUpdate}
          </span>
        </div>
      </div>

      <Tabs
        value={scanMode}
        onValueChange={(value) => setScanMode(value as any)}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="camera" className="flex items-center">
            <Camera className="h-4 w-4 mr-2" />
            Camera Analysis
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center">
            <Upload className="h-4 w-4 mr-2" />
            Upload Image
          </TabsTrigger>
          <TabsTrigger value="iot" className="flex items-center">
            <Thermometer className="h-4 w-4 mr-2" />
            IoT Monitoring
          </TabsTrigger>
        </TabsList>

        <TabsContent value="camera" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <div className="relative rounded-lg overflow-hidden bg-black" style={{ maxHeight: '400px' }}>
                <select 
                  value={cameraSource} 
                  onChange={e => setCameraSource(e.target.value as 'laptop' | 'esp32')}
                  className="absolute top-2 right-2 z-10 bg-white/90 rounded px-2 py-1 text-sm"
                >
                  {CAMERA_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {cameraSource === 'laptop' ? (
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    className="w-full h-full object-cover"
                    videoConstraints={{ deviceId: laptopDeviceId }}
                    onUserMediaError={(error) => {
                      setCameraError("Unable to access camera. Please check permissions.");
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {esp32ImageUrl ? (
                      <img
                        src={esp32ImageUrl}
                        alt="ESP32 Camera"
                        className="w-full h-full object-cover"
                        onLoad={() => setEsp32ImageLoading(false)}
                        onError={() => setEsp32ImageLoading(false)}
                      />
                    ) : null}
                  </div>
                )}
                <div className="absolute inset-0 border-2 border-emerald-400 rounded-lg pointer-events-none">
                  <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-emerald-400"></div>
                  <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-emerald-400"></div>
                  <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-emerald-400"></div>
                  <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-emerald-400"></div>
                </div>
              </div>
              <div className="text-center mt-4">
                <Button
                  onClick={handleCameraCapture}
                  size="lg"
                  className="bg-health-gradient"
                  disabled={!!cameraError || isScanning || isModelLoading}
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Camera className="h-5 w-5 mr-2" />
                      Capture & Analyze
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Prediction Card */}
            <Card className="w-full bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2 text-emerald-600" />
                  Prediction
                </CardTitle>
              </CardHeader>
              <CardContent>
                {scanResult ? (
                  <div className="text-center mb-4">
                    <div className="text-lg text-emerald-700 font-bold">
                      {scanResult.foodItemName || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-600">
                      Prediction: {scanResult.predictedClass || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-600">
                      Confidence: {scanResult.confidence ? `${scanResult.confidence.toFixed(1)}%` : '0%'}
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mt-2">
                      Connect camera and start prediction
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="upload" className="space-y-6">
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="h-5 w-5 mr-2 text-emerald-600" />
                Upload Food Image
              </CardTitle>
              <CardDescription>
                Upload a clear image of your food item for spoilage analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-emerald-200 rounded-lg p-12 text-center hover:border-emerald-300 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                {isUploading ? (
                  <div className="flex flex-col items-center justify-center">
                    <Loader2 className="h-12 w-12 text-emerald-400 animate-spin mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Analyzing Image...
                    </h3>
                    <p className="text-gray-600">
                      Please wait while we process your image
                    </p>
                  </div>
                ) : (
                  <>
                    <Upload className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Upload Food Image
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Choose a clear, well-lit image of your food item
                    </p>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      Choose File
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Results Card */}
          {scanResult && (
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2 text-emerald-600" />
                  Analysis Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-emerald-700">
                      {scanResult.foodItemName || 'Unknown Food Item'}
                    </div>
                    <div className="text-sm text-gray-600">
                      Prediction: {scanResult.predictedClass || 'Unknown'}
                    </div>
                    <div className="text-sm text-gray-600">
                      Confidence: {scanResult.confidence ? `${scanResult.confidence.toFixed(1)}%` : '0%'}
                    </div>
                  </div>

                  {scanResult.indicators && scanResult.indicators.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium text-gray-900 mb-2">Indicators</h4>
                      <div className="space-y-2">
                        {scanResult.indicators.map((indicator, index) => (
                          <div key={index} className="flex items-start space-x-2">
                            <div className={`w-2 h-2 rounded-full mt-2 ${
                              indicator.severity === 'low' ? 'bg-green-500' :
                              indicator.severity === 'medium' ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`} />
                            <div>
                              <div className="text-sm font-medium">{indicator.type}</div>
                              <div className="text-sm text-gray-600">{indicator.description}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {scanResult.recommendations && scanResult.recommendations.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {scanResult.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm text-gray-600">{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="iot" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Thermometer className="h-5 w-5 mr-2 text-emerald-600" />
                  Environmental Monitoring
                </CardTitle>
                <CardDescription>
                  Real-time sensor data for optimal food storage conditions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Thermometer className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-700">
                      {iotData.temperature !== null ? `${iotData.temperature.toFixed(1)}°C` : '--°C'}
                    </div>
                    <div className="text-sm text-blue-600">Temperature</div>
                  </div>
                  <div className="text-center p-4 bg-teal-50 rounded-lg">
                    <Droplets className="h-8 w-8 text-teal-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-teal-700">
                      {iotData.humidity !== null ? `${iotData.humidity.toFixed(0)}%` : '--%'}
                    </div>
                    <div className="text-sm text-teal-600">Humidity</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      Storage Conditions
                    </span>
                    <Badge className="bg-green-100 text-green-700">
                      Optimal
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Temperature Range</span>
                      <span className="text-green-600">Ideal (0-5°C)</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Humidity Level</span>
                      <span className="text-green-600">Good (60-70%)</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2 text-emerald-600" />
                  Smart Alerts
                </CardTitle>
                <CardDescription>
                  Automated notifications based on sensor data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-900">
                      Storage Optimal
                    </h4>
                    <p className="text-sm text-green-700">
                      Current conditions are perfect for food storage
                    </p>
                    <p className="text-xs text-green-600 mt-1">2 minutes ago</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                  <Thermometer className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">
                      Temperature Stable
                    </h4>
                    <p className="text-sm text-blue-700">
                      Temperature has been consistent for 2 hours
                    </p>
                    <p className="text-xs text-blue-600 mt-1">15 minutes ago</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
