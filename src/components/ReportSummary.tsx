import { useState } from 'react';
import { Download, Eye, X } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import Badge from './Badge';
import { ReportSummary as ReportSummaryType, UL360File } from '../types';

interface ReportSummaryProps {
  reportSummaries: ReportSummaryType[];
  ul360Files: UL360File[];
  onDownload: (fileId: string) => void;
}

export default function ReportSummary({ reportSummaries, ul360Files, onDownload }: ReportSummaryProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewFile, setPreviewFile] = useState<UL360File | null>(null);

  if (reportSummaries.length === 0) return null;

  const handlePreview = (file: UL360File) => {
    setPreviewFile(file);
    setShowPreview(true);
  };

  return (
    <>
      <Card>
        <h3 className="text-xl font-bold text-segro-charcoal mb-4">Report Summary</h3>

        {/* Display each processing attempt */}
        <div className="space-y-6">
          {reportSummaries.map((summary, index) => {
            const generatedFile = ul360Files.find(f => f.id === summary.generatedFileId);
            const successRate = ((summary.successfulEntries / summary.totalEntries) * 100).toFixed(1);
            const isLatest = index === reportSummaries.length - 1;

            return (
              <div key={summary.generatedFileId || index} className={!isLatest ? 'pb-6 border-b' : ''}>
                {/* Attempt Header */}
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-segro-charcoal">
                    {summary.attemptNumber === 1 ? 'Initial Processing' : `Reprocessing Attempt ${summary.attemptNumber}`}
                  </h4>
                  <div className="flex items-center gap-2">
                    <Badge variant={isLatest ? 'info' : 'default'} size="sm">
                      {isLatest ? 'Latest' : `Attempt ${summary.attemptNumber}`}
                    </Badge>
                    <span className="text-xs text-segro-midgray">
                      {new Date(summary.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Statistics Grid */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-segro-offwhite rounded-lg p-4">
                    <div className="text-2xl font-bold text-segro-charcoal">
                      {summary.totalEntries.toLocaleString()}
                    </div>
                    <div className="text-sm text-segro-midgray">Total Entries</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600">
                      {summary.successfulEntries.toLocaleString()}
                    </div>
                    <div className="text-sm text-segro-midgray">Successfully Processed</div>
                    <div className="text-xs text-green-600 mt-1">{successRate}% success rate</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-red-600">
                      {summary.failedEntries.toLocaleString()}
                    </div>
                    <div className="text-sm text-segro-midgray">Failed Entries</div>
                  </div>
                </div>

                {/* Generated File */}
                {generatedFile && (
                  <div className="bg-segro-offwhite rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-segro-charcoal">{generatedFile.filename}</div>
                        <div className="text-sm text-segro-midgray mt-1">
                          {generatedFile.market} • {generatedFile.recordCount.toLocaleString()} records • {(generatedFile.size / 1024).toFixed(0)} KB
                        </div>
                        <div className="text-xs text-segro-midgray mt-1">
                          Generated: {new Date(generatedFile.generatedAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handlePreview(generatedFile)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Preview
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => onDownload(generatedFile.id)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Preview Modal */}
      {showPreview && previewFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-segro-charcoal">{previewFile.filename}</h3>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowPreview(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="bg-segro-offwhite rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-segro-midgray">Market:</span>
                    <span className="ml-2 font-medium text-segro-charcoal">{previewFile.market}</span>
                  </div>
                  <div>
                    <span className="text-segro-midgray">Records:</span>
                    <span className="ml-2 font-medium text-segro-charcoal">{previewFile.recordCount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-segro-midgray">File Size:</span>
                    <span className="ml-2 font-medium text-segro-charcoal">{(previewFile.size / 1024).toFixed(0)} KB</span>
                  </div>
                  <div>
                    <span className="text-segro-midgray">Generated:</span>
                    <span className="ml-2 font-medium text-segro-charcoal">
                      {new Date(previewFile.generatedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sample Data Preview */}
              <div>
                <h4 className="font-semibold text-segro-charcoal mb-2">Sample Data Preview</h4>
                <div className="bg-white border rounded-lg overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-segro-offwhite">
                      <tr>
                        <th className="px-4 py-2 text-left text-segro-charcoal">Meter ID</th>
                        <th className="px-4 py-2 text-left text-segro-charcoal">Site</th>
                        <th className="px-4 py-2 text-left text-segro-charcoal">Period Start</th>
                        <th className="px-4 py-2 text-left text-segro-charcoal">Period End</th>
                        <th className="px-4 py-2 text-right text-segro-charcoal">Value</th>
                        <th className="px-4 py-2 text-left text-segro-charcoal">Units</th>
                        <th className="px-4 py-2 text-left text-segro-charcoal">Region SID</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="px-4 py-2">M1001</td>
                        <td className="px-4 py-2">Park Royal</td>
                        <td className="px-4 py-2">2026-01-01</td>
                        <td className="px-4 py-2">2026-01-31</td>
                        <td className="px-4 py-2 text-right">15240</td>
                        <td className="px-4 py-2">kWh</td>
                        <td className="px-4 py-2">RUK123</td>
                      </tr>
                      <tr className="border-t bg-segro-offwhite">
                        <td className="px-4 py-2">M1002</td>
                        <td className="px-4 py-2">Heathrow</td>
                        <td className="px-4 py-2">2026-01-01</td>
                        <td className="px-4 py-2">2026-01-31</td>
                        <td className="px-4 py-2 text-right">8930</td>
                        <td className="px-4 py-2">kWh</td>
                        <td className="px-4 py-2">RUK124</td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-4 py-2">M1003</td>
                        <td className="px-4 py-2">Tilbury</td>
                        <td className="px-4 py-2">2026-01-01</td>
                        <td className="px-4 py-2">2026-01-31</td>
                        <td className="px-4 py-2 text-right">12450</td>
                        <td className="px-4 py-2">kWh</td>
                        <td className="px-4 py-2">RUK125</td>
                      </tr>
                      <tr className="border-t bg-segro-offwhite">
                        <td className="px-4 py-2 text-segro-midgray italic" colSpan={7}>
                          ... and {(previewFile.recordCount - 3).toLocaleString()} more records
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="secondary"
                  onClick={() => setShowPreview(false)}
                >
                  Close
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    onDownload(previewFile.id);
                    setShowPreview(false);
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
