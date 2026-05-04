'use client';

import React, { useState } from 'react';
import { Upload, FileText, Image, ExternalLink, Loader2, X,AlertCircle } from 'lucide-react';
import { UserIdentity, EvidenceItem } from './types';

interface EvidenceUploadProps {
  caseId: string;
  existingEvidence: EvidenceItem[];
  user: UserIdentity;
  canUpload: boolean;
  onUploadComplete: () => void;
  getAuthToken: () => string | null;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function EvidenceUpload({ caseId, existingEvidence,  canUpload, onUploadComplete, getAuthToken }: EvidenceUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<EvidenceItem[]>(existingEvidence);
  const [error, setError] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      const validFiles = selected.filter(f => f.size <= 25 * 1024 * 1024);
      if (selected.length !== validFiles.length) {
        setError('Some files exceed 25MB limit');
      }
      setFiles(validFiles);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    setError('');
    const token = getAuthToken();
    
    const formData = new FormData();
    files.forEach(file => formData.append('evidence', file));
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/dispute/disputes/${caseId}/evidence`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      if (response.ok) {
        const data = await response.json();
        setUploaded([...uploaded, ...(data.evidence || [])]);
        setFiles([]);
        onUploadComplete();
        alert(`${files.length} file(s) uploaded successfully`);
      } else {
        throw new Error('Upload failed');
      }
    } catch (err) {
      setError('Failed to upload evidence. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      {canUpload && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h3 className="text-sm font-bold text-amber-800 mb-4 flex items-center gap-2">
            <Upload size={16} /> Upload Evidence
          </h3>
          
          <div className="border-2 border-dashed border-amber-300 rounded-xl p-6 text-center bg-white">
            <input
              type="file"
              multiple
              accept="image/*,application/pdf,.txt,.doc,.docx,.xls,.xlsx"
              onChange={handleFileSelect}
              className="hidden"
              id="evidence-upload"
            />
            <label htmlFor="evidence-upload" className="cursor-pointer block">
              <Upload size={32} className="mx-auto text-amber-400 mb-3" />
              <p className="text-sm font-medium text-slate-700">Click to select files</p>
              <p className="text-xs text-slate-400 mt-1">or drag and drop</p>
              <p className="text-[10px] text-slate-400 mt-2">Supports images, PDF, DOC, XLS (max 25MB)</p>
            </label>
          </div>
          
          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((file, i) => (
                <div key={i} className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-3">
                    {file.type.startsWith('image/') ? <Image size={16} /> : <FileText size={16} />}
                    <span className="text-sm font-medium">{file.name}</span>
                    <span className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                  <button onClick={() => removeFile(i)} className="p-1 hover:bg-slate-100 rounded">
                    <X size={14} className="text-slate-400" />
                  </button>
                </div>
              ))}
              
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full mt-3 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-bold hover:bg-amber-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {uploading ? 'Uploading...' : `Upload ${files.length} file(s)`}
              </button>
            </div>
          )}
          
          {error && (
            <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-600 text-sm">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}

      {/* Evidence Gallery */}
      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-4">Evidence Gallery</h3>
        {uploaded.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <FileText size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No evidence uploaded yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {uploaded.map((item, i) => (
              <a
                key={i}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-amber-200 hover:bg-amber-50/30 transition-all group"
              >
                <div className="flex items-center gap-3">
                  {(item.type?.startsWith('image/') || item.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i)) ? (
                    <Image size={18} className="text-slate-400 group-hover:text-amber-600" />
                  ) : (
                    <FileText size={18} className="text-slate-400 group-hover:text-amber-600" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-900 truncate max-w-[200px]">{item.name}</p>
                    {item.size && <p className="text-[10px] text-slate-400">{item.size}</p>}
                  </div>
                </div>
                <ExternalLink size={14} className="text-slate-300 group-hover:text-amber-600" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}