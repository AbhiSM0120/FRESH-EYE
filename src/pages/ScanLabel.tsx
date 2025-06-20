import { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import Tesseract from 'tesseract.js';
import {
  Camera,
  Upload,
  Scan,
  CheckCircle,
  AlertTriangle,
  Info,
  Zap,
  Heart,
  Shield,
  Target,
  TrendingUp,
  X,
  RotateCcw,
  PieChart as PieChartIcon,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  serving_size: string;
  ingredients: string[];
  health_score: number;
  warnings: string[];
  benefits: string[];
  additional_nutrients?: Record<string, {
    value: number;
    unit: string;
    daily_value?: number;
  }>;
}

const mockNutritionData: NutritionData = {
  calories: 150,
  protein: 12,
  carbs: 20,
  fat: 3,
  fiber: 8,
  sugar: 4,
  sodium: 480,
  serving_size: "1 cup (240ml)",
  ingredients: [
    "Organic Spinach",
    "Water",
    "Sea Salt",
    "Natural Flavoring",
    "Vitamin C",
    "Iron",
    "Calcium",
  ],
  health_score: 8.7,
  warnings: ["High in sodium"],
  benefits: ["High in iron", "Good source of fiber", "Rich in vitamins"],
};

const NUTRITION_COLORS = {
  protein: '#FF6B6B',
  carbs: '#4ECDC4',
  fat: '#FFD93D',
  fiber: '#95E1D3',
  sugar: '#FF8B94',
  sodium: '#6C5CE7'
};

// Helper: Parse nutrition facts from OCR text
async function parseNutritionFromText(text: string): Promise<NutritionData> {
  // Send to backend for processing
  return fetch('http://localhost:5000/extract_nutrition', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  })
    .then(response => response.json())
    .then(data => {
      if (data.status === 'success') {
        return data.nutrition;
      }
      throw new Error(data.message || 'Failed to parse nutrition data');
    });
}

export default function ScanLabel() {
  const [scanMode, setScanMode] = useState<"upload" | "camera">("upload");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<NutritionData | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [model, setModel] = useState<mobilenet.MobileNet | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [videoConstraints, setVideoConstraints] = useState<any>({ facingMode: "environment" });
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

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
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const videoDevices = devices.filter(
        (device) =>
          device.kind === "videoinput" &&
          device.label &&
          !/iriun|virtual/i.test(device.label)
      );
      if (videoDevices.length > 0) {
        setVideoConstraints({ deviceId: videoDevices[0].deviceId });
      } else {
        setCameraError("No real camera found. Please connect a webcam.");
      }
    });
  }, []);

  const handleCapture = async () => {
    if (!webcamRef.current) return;
    
    try {
      setIsScanning(true);
      setCameraError(null);
      setProcessingStatus('Capturing image...');
      
      // Get the current frame from the webcam
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        throw new Error('Failed to capture image');
      }

      // Convert base64 to blob for better quality
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      
      // Create a new image to get dimensions
      const img = new Image();
      img.src = imageSrc;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      // Create a canvas to process the image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to get canvas context');

      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw image with white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Convert to blob with better quality
      const processedBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, 'image/jpeg', 0.95);
      });

      // Convert blob to base64
      const reader = new FileReader();
      const base64Image = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(processedBlob);
      });

      setProcessingStatus('Processing image...');
      
      // Process the image
      const result = await Tesseract.recognize(base64Image, 'eng', { 
        logger: m => console.log(m),
        // @ts-ignore - Tesseract types are incomplete
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:;()[]{}%/-+ ',
        tessedit_pageseg_mode: '6'
      });
      
      setProcessingStatus('Analyzing nutrition information...');
      
      const nutrition = await parseNutritionFromText(result.data.text);
      setScanResult(nutrition);
      
    } catch (err) {
      console.error('Camera capture error:', err);
      setCameraError('Failed to capture image. Please try again with better lighting and focus.');
    } finally {
      setIsScanning(false);
      setProcessingStatus(null);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageSrc = e.target?.result as string;
        runOcrAndParse(imageSrc);
      };
      reader.readAsDataURL(file);
    }
  };

  const runOcrAndParse = async (imageSrc: string) => {
    setIsScanning(true);
    setCameraError(null);
    try {
      setScanResult(null);
      
      const result = await Tesseract.recognize(imageSrc, 'eng', { 
        logger: m => console.log(m),
        // @ts-ignore - Tesseract types are incomplete
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:;()[]{}%/-+ ',
        tessedit_pageseg_mode: '6'
      });
      const text = result.data.text;
      
      setProcessingStatus('Analyzing nutrition information...');
      
      const nutrition = await parseNutritionFromText(text);
      setScanResult(nutrition);
    } catch (err) {
      console.error('OCR Error:', err);
      setCameraError('Failed to analyze nutrition label. Please try again with better lighting and focus.');
    } finally {
      setIsScanning(false);
      setProcessingStatus(null);
    }
  };

  const resetScan = () => {
    setScanResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 8) return "emerald";
    if (score >= 6) return "amber";
    return "red";
  };

  const getHealthScoreLabel = (score: number) => {
    if (score >= 8) return "Excellent";
    if (score >= 6) return "Good";
    return "Poor";
  };

  const handleEmailShare = async () => {
    try {
      setEmailStatus('sending');
      const response = await fetch('http://localhost:5000/send_email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'example@gmail.com',
          nutritionData: scanResult
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send email');
      }
      
      setEmailStatus('sent');
      setTimeout(() => setEmailStatus('idle'), 3000);
    } catch (error) {
      console.error('Email error:', error);
      setEmailStatus('error');
      setTimeout(() => setEmailStatus('idle'), 3000);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Smart Label Scanner
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Scan nutrition labels instantly with AI-powered OCR technology. Get
          detailed health analysis and personalized recommendations.
        </p>
      </div>

      {!scanResult ? (
        <div className="space-y-8">
          {/* Scan Mode Selection */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Scan className="h-5 w-5 mr-2 text-emerald-600" />
                Choose Scanning Method
              </CardTitle>
              <CardDescription>
                Upload an image or use your camera to scan nutrition labels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs
                value={scanMode}
                onValueChange={(value) =>
                  setScanMode(value as "upload" | "camera")
                }
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload" className="flex items-center">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Image
                  </TabsTrigger>
                  <TabsTrigger value="camera" className="flex items-center">
                    <Camera className="h-4 w-4 mr-2" />
                    Use Camera
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="mt-6">
                  <div className="border-2 border-dashed border-emerald-200 rounded-lg p-8 text-center hover:border-emerald-300 transition-colors">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Upload className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Upload Nutrition Label
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Choose an image file of a nutrition label
                    </p>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-health-gradient"
                    >
                      Choose File
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="camera" className="mt-6">
                  <div className="space-y-4">
                    {isModelLoading ? (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>Loading image analysis model...</AlertDescription>
                      </Alert>
                    ) : cameraError ? (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{cameraError}</AlertDescription>
                        <Button 
                          onClick={() => window.location.reload()} 
                          className="mt-4"
                          variant="outline"
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Retry Camera Access
                        </Button>
                      </Alert>
                    ) : !hasPermission ? (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>Waiting for camera permission...</AlertDescription>
                      </Alert>
                    ) : (
                      <div className="relative aspect-video w-full max-w-2xl mx-auto rounded-lg overflow-hidden bg-gray-100">
                        <Webcam
                          ref={webcamRef}
                          audio={false}
                          screenshotFormat="image/jpeg"
                          videoConstraints={videoConstraints}
                          className="w-full h-full object-cover"
                          onUserMedia={() => setIsModelLoading(false)}
                          onUserMediaError={(err) => {
                            console.error('Camera error:', err);
                            setCameraError('Failed to access camera. Please check permissions and try again.');
                          }}
                        />
                        {isModelLoading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                          </div>
                        )}
                        {cameraError && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
                            <div className="bg-white p-4 rounded-lg shadow-lg max-w-sm mx-4">
                              <p className="text-red-600 mb-2">{cameraError}</p>
                              <Button
                                variant="outline"
                                onClick={() => setCameraError(null)}
                                className="w-full"
                              >
                                Try Again
                              </Button>
                            </div>
                          </div>
                        )}
                        {!isModelLoading && !cameraError && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="border-2 border-white/50 rounded-lg p-4">
                              <p className="text-white text-center mb-2">Position the label within the frame</p>
                              <Button
                                onClick={handleCapture}
                                disabled={isScanning}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                {isScanning ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    {processingStatus || 'Processing...'}
                                  </>
                                ) : (
                                  <>
                                    <Camera className="h-4 w-4 mr-2" />
                                    Capture
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="bg-emerald-50 border-emerald-200">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-emerald-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-emerald-900 mb-2">
                    Tips for Better Results
                  </h3>
                  <ul className="text-sm text-emerald-700 space-y-1">
                    <li>• Ensure good lighting when capturing images</li>
                    <li>• Keep the nutrition label flat and in focus</li>
                    <li>• Include the entire nutrition facts panel</li>
                    <li>• Avoid shadows and reflections on the label</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Loading Overlay */}
      {isScanning && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {processingStatus || 'Scanning Nutrition Label...'}
            </h3>
            <p className="text-gray-600">
              Please hold the camera steady and ensure good lighting
            </p><br />
            <p className="text-gray-600">Extracting nutrition information...</p>
          </div>
        </div>
      )}

      {/* Scan Results */}
      {scanResult && (
        <div className="space-y-8 opacity-100">
          {/* Health Score Overview */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Nutrition Analysis Complete
                  </h2>
                  <p className="text-gray-600">
                    Based on your scanned nutrition label
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={resetScan}
                  className="flex items-center"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Scan Another
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div
                    className={`inline-flex items-center justify-center w-20 h-20 rounded-full bg-${getHealthScoreColor(scanResult.health_score)}-100 mb-4`}
                  >
                    <div className="text-center">
                      <span
                        className={`text-2xl font-bold text-${getHealthScoreColor(scanResult.health_score)}-600 block`}
                      >
                        {scanResult.health_score?.toFixed(1) || '0.0'}
                      </span>
                      <span className={`text-xs text-${getHealthScoreColor(scanResult.health_score)}-600 block`}>
                        out of 10
                      </span>
                    </div>
                  </div>
                  <h3 className="font-medium text-gray-900">Health Score</h3>
                  <p
                    className={`text-sm text-${getHealthScoreColor(scanResult.health_score)}-600`}
                  >
                    {getHealthScoreLabel(scanResult.health_score)}
                  </p>
                </div>

                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 mb-4">
                    <div className="text-center">
                      <Zap className="h-8 w-8 text-blue-600 mx-auto mb-1" />
                      <span className="text-2xl font-bold text-blue-600 block">
                        {scanResult.calories || 0}
                      </span>
                      <span className="text-xs text-blue-600 block">
                        calories
                      </span>
                    </div>
                  </div>
                  <h3 className="font-medium text-gray-900">Calories</h3>
                  <p className="text-sm text-gray-600">
                    per serving
                  </p>
                </div>

                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-purple-100 mb-4 p-2">
                    <div className="text-center">
                      <Heart className="h-8 w-8 text-purple-600 mx-auto mb-1" />
                      <span className="text-sm text-purple-600 block">
                        Serving Size
                      </span>
                    </div>
                  </div>
                  <h3 className="font-medium text-gray-900">Serving Size</h3>
                  <p className="text-sm text-gray-600">
                    {scanResult.serving_size || 'Not specified'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Nutrition Breakdown */}
          <div className="space-y-6">
            {/* Nutrition Distribution Chart */}
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChartIcon className="h-5 w-5 mr-2 text-emerald-600" />
                  NUTRITION DISTRIBUTION
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Protein', value: scanResult.protein || 0 },
                          { name: 'Carbs', value: scanResult.carbs || 0 },
                          { name: 'Fat', value: scanResult.fat || 0 },
                          { name: 'Fiber', value: scanResult.fiber || 0 },
                          { name: 'Sugar', value: scanResult.sugar || 0 },
                          { name: 'Sodium', value: (scanResult.sodium || 0) / 1000 }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {Object.entries(NUTRITION_COLORS).map(([key, color]) => (
                          <Cell key={key} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [`${value.toFixed(1)}g`, 'Amount']}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Nutrition Values */}
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2 text-emerald-600" />
                  NUTRITION VALUES
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Main Nutrients */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Protein</span>
                    <span className="text-sm text-gray-600">
                      {scanResult.protein || 0}g
                    </span>
                  </div>
                  <Progress
                    value={((scanResult.protein || 0) / 50) * 100}
                    className="h-2"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Carbohydrates</span>
                    <span className="text-sm text-gray-600">
                      {scanResult.carbs || 0}g
                    </span>
                  </div>
                  <Progress
                    value={((scanResult.carbs || 0) / 300) * 100}
                    className="h-2"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Fat</span>
                    <span className="text-sm text-gray-600">
                      {scanResult.fat || 0}g
                    </span>
                  </div>
                  <Progress
                    value={((scanResult.fat || 0) / 70) * 100}
                    className="h-2"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Fiber</span>
                    <span className="text-sm text-gray-600">
                      {scanResult.fiber || 0}g
                    </span>
                  </div>
                  <Progress
                    value={((scanResult.fiber || 0) / 25) * 100}
                    className="h-2"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Sugar</span>
                    <span className="text-sm text-gray-600">
                      {scanResult.sugar || 0}g
                    </span>
                  </div>
                  <Progress
                    value={((scanResult.sugar || 0) / 50) * 100}
                    className="h-2"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Sodium</span>
                    <span className="text-sm text-gray-600">
                      {scanResult.sodium || 0}mg
                    </span>
                  </div>
                  <Progress
                    value={((scanResult.sodium || 0) / 2300) * 100}
                    className="h-2"
                  />
                </div>

                {/* Additional Nutrients */}
                {scanResult.additional_nutrients && Object.entries(scanResult.additional_nutrients).map(([name, data]: [string, any]) => (
                  <div key={name} className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium capitalize">{name.replace(/_/g, ' ')}</span>
                      <span className="text-sm text-gray-600">
                        {data.value || 0}{data.unit}
                        {data.daily_value && ` (${data.daily_value}% DV)`}
                      </span>
                    </div>
                    {data.daily_value && (
                      <Progress
                        value={data.daily_value}
                        className="h-2"
                      />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Health Insights */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-emerald-600" />
                Health Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Benefits */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-emerald-600" />
                  Health Benefits
                </h4>
                <div className="space-y-2">
                  {scanResult.benefits && scanResult.benefits.length > 0 ? (
                    scanResult.benefits.map((benefit, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="bg-emerald-50 text-emerald-700 border-emerald-200"
                      >
                        {benefit}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No significant health benefits detected</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Warnings */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2 text-amber-600" />
                  Considerations
                </h4>
                <div className="space-y-2">
                  {scanResult.warnings && scanResult.warnings.length > 0 ? (
                    scanResult.warnings.map((warning, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="bg-amber-50 text-amber-700 border-amber-200"
                      >
                        {warning}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No significant health concerns detected</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Ingredients Preview */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  Key Ingredients
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {scanResult.ingredients && scanResult.ingredients.length > 0 ? (
                    <>
                      {scanResult.ingredients.slice(0, 4).join(", ")}
                      {scanResult.ingredients.length > 4 && "..."}
                    </>
                  ) : (
                    "No ingredients detected"
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-health-gradient">
              <Shield className="h-5 w-5 mr-2" />
              Save to Health Profile
            </Button>
            <Button variant="outline" size="lg">
              <TrendingUp className="h-5 w-5 mr-2" />
              View Detailed Report
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
