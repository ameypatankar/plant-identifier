import React, { useState } from 'react';
import { Leaf, Info, Droplets, Sun, ThermometerSun, Sprout, Camera, X, Loader2 } from 'lucide-react';

export default function PlantIdentifier() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [plantInfo, setPlantInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Read API key from environment variable
  const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);

    setSelectedImage(file);
    setError(null);
    setPlantInfo(null);
    
    // Auto-identify after upload
    await identifyPlant(file);
  };

  const convertImageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const identifyPlant = async (file) => {
    setLoading(true);
    setError(null);

    try {
      if (!GEMINI_API_KEY || GEMINI_API_KEY === '') {
        throw new Error('Gemini API key is not configured. Please add REACT_APP_GEMINI_API_KEY to your .env file');
      }

      const base64Image = await convertImageToBase64(file);

      console.log('Making request to Gemini API...');
      console.log('File type:', file.type);
      console.log('File size:', file.size, 'bytes');

      const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      
      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: `Identify this plant and provide detailed information in the following JSON format (respond ONLY with valid JSON, no markdown or additional text):
{
  "name": "common plant name",
  "commonNames": ["alternative name 1", "alternative name 2"],
  "scientificName": "Scientific name",
  "family": "Plant family",
  "description": "Detailed description of the plant (2-3 sentences)",
  "care": {
    "light": "Light requirements",
    "water": "Watering instructions",
    "humidity": "Humidity level needed",
    "temperature": "Temperature range",
    "soil": "Soil type needed"
  },
  "growthRate": "Growth rate",
  "toxicity": "Toxicity information or null if non-toxic",
  "confidence": 85
}

If you cannot identify the plant or if the image doesn't contain a clear plant, respond with:
{
  "error": "Could not identify plant. Please upload a clearer image of a plant."
}`
              },
              {
                inline_data: {
                  mime_type: file.type,
                  data: base64Image
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 2048,
        }
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error Response:', errorData);
        throw new Error(`API request failed with status ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      console.log('Gemini API Response:', data);
      
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!textResponse) {
        throw new Error('No response from Gemini API');
      }

      console.log('Raw text response:', textResponse);

      let cleanedResponse = textResponse.trim();
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, '');
      cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
      cleanedResponse = cleanedResponse.trim();

      console.log('Cleaned response:', cleanedResponse);

      let plantData;
      try {
        plantData = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        console.error('Failed to parse:', cleanedResponse);
        throw new Error('Failed to parse API response. The response may not be valid JSON.');
      }

      if (plantData.error) {
        setError(plantData.error);
        return;
      }

      if (!plantData.name || !plantData.scientificName) {
        throw new Error('Incomplete plant data received from API');
      }

      setPlantInfo(plantData);
    } catch (err) {
      console.error('Error identifying plant:', err);
      console.error('Error details:', err.message);
      setError(`Failed to identify plant: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetUpload = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setPlantInfo(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-emerald-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 rounded-xl shadow-lg">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                PlantID
              </h1>
              <p className="text-sm text-gray-600">Identify plants instantly with AI</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {!imagePreview ? (
          <div className="bg-white rounded-3xl shadow-xl p-8 border border-emerald-100">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                Discover Your Plant
              </h2>
              <p className="text-gray-600">
                Upload a clear photo of your plant to identify it using AI
              </p>
            </div>

            <label htmlFor="file-upload" className="cursor-pointer block">
              <div className="border-3 border-dashed border-emerald-300 rounded-2xl p-12 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all duration-300 group">
                <div className="flex flex-col items-center gap-4">
                  <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Camera className="w-12 h-12 text-white" />
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-semibold text-gray-700 mb-2">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-sm text-gray-500">
                      Supports: JPG, PNG, WEBP (max 10MB)
                    </p>
                  </div>
                </div>
              </div>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
              />
            </label>

            <div className="mt-8 grid md:grid-cols-3 gap-4">
              {[
                { icon: Sun, text: "Use good lighting" },
                { icon: Camera, text: "Focus on leaves or flowers" },
                { icon: Leaf, text: "Capture unique features" }
              ].map((tip, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-emerald-50 p-4 rounded-xl">
                  <tip.icon className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm text-gray-700">{tip.text}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl shadow-xl p-6 border border-emerald-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Your Plant Photo</h3>
                <button
                  onClick={resetUpload}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <div className="relative rounded-2xl overflow-hidden bg-gray-100">
                <img
                  src={imagePreview}
                  alt="Plant preview"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl p-6 border border-emerald-100">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full py-20">
                  <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
                  <p className="text-lg font-medium text-gray-700">Analyzing your plant with AI...</p>
                  <p className="text-sm text-gray-500 mt-2">This may take a few seconds</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-full py-20">
                  <div className="bg-red-100 p-4 rounded-full mb-4">
                    <Info className="w-8 h-8 text-red-600" />
                  </div>
                  <p className="text-lg font-medium text-red-700 text-center">{error}</p>
                  <button
                    onClick={() => identifyPlant(selectedImage)}
                    className="mt-4 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : plantInfo ? (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Leaf className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm font-medium text-gray-600">Identified as</span>
                    </div>
                    <h2 className="text-3xl font-bold text-gray-800 mb-1">
                      {plantInfo.name}
                    </h2>
                    <p className="text-sm text-gray-600 italic mb-2">{plantInfo.scientificName}</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {plantInfo.commonNames?.map((name, idx) => (
                        <span key={idx} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                          {name}
                        </span>
                      ))}
                    </div>
                    {plantInfo.confidence && (
                      <div className="inline-flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-lg">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-emerald-700">
                          {plantInfo.confidence}% confidence
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      About
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {plantInfo.description}
                    </p>
                  </div>

                  {plantInfo.care && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Sprout className="w-4 h-4" />
                        Care Guide
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3 bg-amber-50 p-3 rounded-xl">
                          <Sun className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-gray-700">Light</p>
                            <p className="text-sm text-gray-600">{plantInfo.care.light}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 bg-blue-50 p-3 rounded-xl">
                          <Droplets className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-gray-700">Water</p>
                            <p className="text-sm text-gray-600">{plantInfo.care.water}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 bg-cyan-50 p-3 rounded-xl">
                          <Droplets className="w-5 h-5 text-cyan-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-gray-700">Humidity</p>
                            <p className="text-sm text-gray-600">{plantInfo.care.humidity}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 bg-orange-50 p-3 rounded-xl">
                          <ThermometerSun className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-gray-700">Temperature</p>
                            <p className="text-sm text-gray-600">{plantInfo.care.temperature}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
                    <div className="bg-gray-50 p-3 rounded-xl">
                      <p className="text-xs text-gray-600 mb-1">Family</p>
                      <p className="text-sm font-medium text-gray-800">{plantInfo.family}</p>
                    </div>
                    {plantInfo.growthRate && (
                      <div className="bg-gray-50 p-3 rounded-xl">
                        <p className="text-xs text-gray-600 mb-1">Growth Rate</p>
                        <p className="text-sm font-medium text-gray-800">{plantInfo.growthRate}</p>
                      </div>
                    )}
                  </div>

                  {plantInfo.toxicity && (
                    <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
                      <p className="text-sm font-medium text-red-800 mb-1">⚠️ Safety Note</p>
                      <p className="text-sm text-red-700">{plantInfo.toxicity}</p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <div className="text-center py-8 text-sm text-gray-600">
        <p>Powered by Google Gemini AI • Upload a photo to identify plants instantly</p>
      </div>
    </div>
  );
}