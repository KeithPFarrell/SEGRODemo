import { useEffect, useState } from 'react';
import { FileText, Download, Eye } from 'lucide-react';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import { useStore } from '../store';
import { formatDateTime, formatFileSize } from '../utils/formatters';

export default function UL360() {
  const { ul360Files, loadUL360Files } = useStore();
  const [previewFile, setPreviewFile] = useState<string | null>(null);

  useEffect(() => {
    loadUL360Files();
  }, [loadUL360Files]);

  // Sort files by generated date (newest first)
  const sortedFiles = [...ul360Files].sort((a, b) => {
    return new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime();
  });

  const handleDownload = async (fileId: string) => {
    const file = ul360Files.find(f => f.id === fileId);
    if (file && file.downloadUrl) {
      try {
        // Fetch the file as a blob to ensure proper binary handling
        const response = await fetch(file.downloadUrl);
        const blob = await response.blob();

        // Create a temporary URL for the blob
        const url = window.URL.createObjectURL(blob);

        // Create and trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = file.filename;
        document.body.appendChild(a);
        a.click();

        // Cleanup
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Download failed:', error);
        alert('Failed to download file. Please try again.');
      }
    }
  };

  const generateMockCSV = () => {
    return `Meter ID,Site,Period Start,Period End,Value,Units,Region SID
M1001,Park Royal,2026-01-01,2026-01-31,15240,kWh,RUK123
M1002,Heathrow,2026-01-01,2026-01-31,22150,kWh,RUK124
M1003,Park Royal,2026-01-01,2026-01-31,8950,kWh,RUK123
M2001,Prague Central,2026-01-01,2026-01-31,18200,kWh,RCZ201
M2002,Prague Central,2026-01-01,2026-01-31,12500,kWh,RCZ201`;
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'verified':
        return 'success';
      case 'uploaded':
        return 'info';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-segro-charcoal">UL 360 Upload Files</h1>
          <p className="text-segro-midgray mt-1">Prepared files for Universal Ledger 360 upload</p>
        </div>
      </div>

      {/* Files List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedFiles.map(file => (
          <Card key={file.id}>
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start space-x-3">
                <div className="bg-segro-teal/10 p-3 rounded-lg">
                  <FileText className="w-6 h-6 text-segro-teal" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-segro-charcoal">{file.filename}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="info" size="sm">
                      {file.market}
                    </Badge>
                    <Badge variant={getStatusVariant(file.status)} size="sm">
                      {file.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* File Details */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-segro-midgray">Generated</span>
                  <span className="font-medium">{formatDateTime(file.generatedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-segro-midgray">Size</span>
                  <span className="font-medium">{formatFileSize(file.size)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-segro-midgray">Records</span>
                  <span className="font-medium">{file.recordCount.toLocaleString()}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => setPreviewFile(file.id)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Preview
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleDownload(file.id)}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {ul360Files.length === 0 && (
        <Card>
          <div className="text-center text-segro-midgray py-12">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No UL 360 files available</p>
            <p className="text-sm mt-2">Files will appear here after cycle validation is complete</p>
          </div>
        </Card>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-segro-charcoal">File Preview</h3>
              <Button variant="ghost" size="sm" onClick={() => setPreviewFile(null)}>
                Close
              </Button>
            </div>

            <div className="flex-1 overflow-auto bg-segro-offwhite rounded-lg p-4 font-mono text-sm">
              <pre className="whitespace-pre">{generateMockCSV()}</pre>
            </div>

            <div className="mt-4 flex justify-end space-x-2">
              <Button
                variant="secondary"
                onClick={() => {
                  if (previewFile) handleDownload(previewFile);
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button variant="primary" onClick={() => setPreviewFile(null)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Upload Statistics */}
      <Card>
        <h2 className="text-xl font-bold text-segro-charcoal mb-6">Upload Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-segro-charcoal">{ul360Files.length}</div>
            <div className="text-sm text-segro-midgray mt-1">Total Files</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-segro-teal-accent">
              {ul360Files.filter(f => f.status === 'verified').length}
            </div>
            <div className="text-sm text-segro-midgray mt-1">Verified</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-segro-teal">
              {ul360Files.filter(f => f.status === 'uploaded').length}
            </div>
            <div className="text-sm text-segro-midgray mt-1">Uploaded</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-segro-charcoal">
              {ul360Files.reduce((sum, f) => sum + f.recordCount, 0).toLocaleString()}
            </div>
            <div className="text-sm text-segro-midgray mt-1">Total Records</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
