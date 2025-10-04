import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CloudArrowUpIcon,
  DocumentIcon,
  PhotoIcon,
  XMarkIcon,
  EyeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import Tesseract from 'tesseract.js';

interface ReceiptUploadProps {
  onUpload: (file: File, ocrData?: any) => Promise<void>;
  onCancel: () => void;
  existingReceipt?: string;
  isUploading?: boolean;
}

interface OCRResult {
  text: string;
  confidence: number;
  extractedData: {
    amount?: number;
    merchant?: string;
    date?: string;
    currency?: string;
  };
}

const ReceiptUploadComponent: React.FC<ReceiptUploadProps> = ({
  onUpload,
  onCancel,
  existingReceipt,
  isUploading = false
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingReceipt || null);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setOcrResult(null);
      setOcrError(null);
      
      // Start OCR processing
      processOCR(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.pdf']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const processOCR = async (file: File) => {
    setOcrProcessing(true);
    setOcrError(null);
    setProcessingProgress(0);

    try {
      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProcessingProgress(Math.round(m.progress * 100));
          }
        }
      });

      const extractedText = result.data.text;
      const confidence = result.data.confidence;

      // Extract meaningful data from OCR text
      const extractedData = extractDataFromText(extractedText);

      setOcrResult({
        text: extractedText,
        confidence,
        extractedData
      });
    } catch (error) {
      console.error('OCR Error:', error);
      setOcrError('Failed to process receipt. You can still upload it manually.');
    } finally {
      setOcrProcessing(false);
      setProcessingProgress(0);
    }
  };

  const extractDataFromText = (text: string) => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const extractedData: any = {};

    // Extract amount (look for currency symbols and numbers)
    const amountRegex = /[\$£€¥₹]\s*(\d+(?:,\d{3})*(?:\.\d{2})?)|(\d+(?:,\d{3})*(?:\.\d{2})?)\s*[\$£€¥₹]/g;
    const amountMatches = text.match(amountRegex);
    if (amountMatches && amountMatches.length > 0) {
      const amountStr = amountMatches[0].replace(/[\$£€¥₹,\s]/g, '');
      const amount = parseFloat(amountStr);
      if (!isNaN(amount)) {
        extractedData.amount = amount;
      }
    }

    // Extract date
    const dateRegex = /\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|\d{4}[-\/]\d{1,2}[-\/]\d{1,2})\b/g;
    const dateMatch = text.match(dateRegex);
    if (dateMatch) {
      extractedData.date = dateMatch[0];
    }

    // Extract merchant name (usually at the top)
    if (lines.length > 0) {
      // Take the first non-empty line as potential merchant name
      const firstLine = lines[0];
      if (firstLine.length > 2 && firstLine.length < 50) {
        extractedData.merchant = firstLine;
      }
    }

    // Extract currency symbol
    const currencyMatch = text.match(/[\$£€¥₹]/);
    if (currencyMatch) {
      const currencyMap: { [key: string]: string } = {
        '$': 'USD',
        '£': 'GBP',
        '€': 'EUR',
        '¥': 'JPY',
        '₹': 'INR'
      };
      extractedData.currency = currencyMap[currencyMatch[0]] || 'USD';
    }

    return extractedData;
  };

  const handleUpload = async () => {
    if (selectedFile) {
      await onUpload(selectedFile, ocrResult);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl(existingReceipt || null);
    setOcrResult(null);
    setOcrError(null);
    if (previewUrl && previewUrl !== existingReceipt) {
      URL.revokeObjectURL(previewUrl);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {!previewUrl && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <div
            {...getRootProps()}
            className={`group relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 ${
              isDragActive
                ? 'border-blue-400 bg-blue-50 scale-105'
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            <input {...getInputProps()} />
            
            <div className="space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg">
                <CloudArrowUpIcon className="h-8 w-8" />
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {isDragActive ? 'Drop receipt here' : 'Upload Receipt'}
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  Drag and drop your receipt, or{' '}
                  <span className="font-medium text-blue-600">browse</span> to choose a file
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Supports JPG, PNG, PDF up to 10MB
                </p>
              </div>
              
              <div className="flex items-center justify-center space-x-6 text-xs text-gray-400">
                <div className="flex items-center space-x-1">
                  <PhotoIcon className="h-4 w-4" />
                  <span>Auto-scan</span>
                </div>
                <div className="flex items-center space-x-1">
                  <DocumentIcon className="h-4 w-4" />
                  <span>OCR Extract</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Preview and Processing */}
      {previewUrl && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-4"
        >
          {/* Image Preview */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-gray-200 bg-white shadow-lg">
            <div className="aspect-[4/3] max-h-96">
              <img
                src={previewUrl}
                alt="Receipt preview"
                className="h-full w-full object-contain"
              />
            </div>
            
            {/* Overlay Controls */}
            <div className="absolute top-4 right-4 flex space-x-2">
              <button
                onClick={() => window.open(previewUrl, '_blank')}
                className="rounded-full bg-white/90 p-2 text-gray-700 shadow-md hover:bg-white hover:shadow-lg transition-all"
              >
                <EyeIcon className="h-4 w-4" />
              </button>
              
              {selectedFile && (
                <button
                  onClick={removeFile}
                  className="rounded-full bg-white/90 p-2 text-gray-700 shadow-md hover:bg-white hover:shadow-lg transition-all"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* OCR Processing */}
          {ocrProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-blue-50 border border-blue-200 p-4"
            >
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
                <div className="flex-1">
                  <p className="font-medium text-blue-900">Processing Receipt...</p>
                  <p className="text-sm text-blue-700">
                    Extracting text and data using OCR technology
                  </p>
                </div>
              </div>
              
              {processingProgress > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-sm text-blue-700 mb-1">
                    <span>Progress</span>
                    <span>{processingProgress}%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <motion.div
                      className="bg-blue-600 h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${processingProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* OCR Results */}
          {ocrResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-green-50 border border-green-200 p-4"
            >
              <div className="flex items-start space-x-3">
                <div className="rounded-full bg-green-100 p-1">
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-green-900">Data Extracted Successfully</h4>
                  <p className="text-sm text-green-700 mb-3">
                    Confidence: {Math.round(ocrResult.confidence)}%
                  </p>
                  
                  {/* Extracted Data */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {ocrResult.extractedData.amount && (
                      <div>
                        <span className="text-green-600 font-medium">Amount:</span>
                        <span className="ml-2 text-green-800">
                          {ocrResult.extractedData.currency || ''} {ocrResult.extractedData.amount}
                        </span>
                      </div>
                    )}
                    
                    {ocrResult.extractedData.merchant && (
                      <div>
                        <span className="text-green-600 font-medium">Merchant:</span>
                        <span className="ml-2 text-green-800">{ocrResult.extractedData.merchant}</span>
                      </div>
                    )}
                    
                    {ocrResult.extractedData.date && (
                      <div>
                        <span className="text-green-600 font-medium">Date:</span>
                        <span className="ml-2 text-green-800">{ocrResult.extractedData.date}</span>
                      </div>
                    )}
                    
                    {ocrResult.extractedData.currency && (
                      <div>
                        <span className="text-green-600 font-medium">Currency:</span>
                        <span className="ml-2 text-green-800">{ocrResult.extractedData.currency}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Full Text Preview (Collapsible) */}
                  <details className="mt-3">
                    <summary className="cursor-pointer text-green-700 font-medium hover:text-green-800">
                      View extracted text
                    </summary>
                    <div className="mt-2 p-3 bg-white rounded border text-xs text-gray-700 max-h-32 overflow-y-auto">
                      <pre className="whitespace-pre-wrap font-mono">{ocrResult.text}</pre>
                    </div>
                  </details>
                </div>
              </div>
            </motion.div>
          )}

          {/* OCR Error */}
          {ocrError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-yellow-50 border border-yellow-200 p-4"
            >
              <div className="flex items-start space-x-3">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-900">OCR Processing Failed</h4>
                  <p className="text-sm text-yellow-700">{ocrError}</p>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        
        <div className="flex items-center space-x-3">
          {selectedFile && !ocrProcessing && (
            <button
              onClick={() => processOCR(selectedFile)}
              disabled={ocrProcessing}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <ArrowPathIcon className="h-4 w-4" />
              <span>Re-scan</span>
            </button>
          )}
          
          {(selectedFile || existingReceipt) && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleUpload}
              disabled={isUploading || ocrProcessing}
              className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <CloudArrowUpIcon className="h-4 w-4" />
                  <span>Upload Receipt</span>
                </>
              )}
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceiptUploadComponent;