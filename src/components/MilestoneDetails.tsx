import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Download, ExternalLink } from 'lucide-react';
import { decodeCID, fetchMilestoneDetails } from '@/utils/aptosUtils';
import { convertIPFSURL } from '@/utils/ipfs';
import { toast } from '@/components/ui/sonner';

interface MilestoneDetailsProps {
  jobId: string;
  milestoneIndex: number;
  milestoneData: any;
  onViewDetails: (jobId: string, milestoneIndex: number, cid: any, type: 'submission' | 'acceptance' | 'rejection') => void;
}

const MilestoneDetails: React.FC<MilestoneDetailsProps> = ({
  jobId,
  milestoneIndex,
  milestoneData,
  onViewDetails
}) => {
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('vi-VN');
  };

  const getStatusColor = (submitted: boolean, accepted: boolean, rejectCount: number) => {
    if (accepted) return 'bg-green-600/20 text-green-400';
    if (rejectCount > 0) return 'bg-red-600/20 text-red-400';
    if (submitted) return 'bg-yellow-600/20 text-yellow-400';
    return 'bg-gray-600/20 text-gray-400';
  };

  const getStatusText = (submitted: boolean, accepted: boolean, rejectCount: number) => {
    if (accepted) return 'Đã chấp nhận';
    if (rejectCount > 0) return `Đã từ chối (${rejectCount})`;
    if (submitted) return 'Đã nộp, đang chờ';
    return 'Chưa nộp';
  };

  const handleViewIPFS = async (cid: any, type: string) => {
    try {
      const decodedCID = decodeCID(cid);
      const ipfsUrl = convertIPFSURL(decodedCID);
      window.open(ipfsUrl, '_blank');
    } catch (error) {
      toast.error('Không thể mở IPFS URL');
    }
  };

  return (
    <Card className="bg-gray-800/50 border border-white/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-white">
          Cột mốc {milestoneIndex + 1}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(milestoneData.submitted, milestoneData.accepted, milestoneData.reject_count)}>
            {getStatusText(milestoneData.submitted, milestoneData.accepted, milestoneData.reject_count)}
          </Badge>
          {milestoneData.submit_time > 0 && (
            <span className="text-xs text-gray-400">
              {formatTimestamp(milestoneData.submit_time)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Submission CID */}
        {milestoneData.submission_cid && (
          <div className="flex items-center justify-between p-2 bg-gray-700/30 rounded">
            <div className="flex-1">
              <div className="text-sm font-medium text-blue-400">Nộp cột mốc</div>
              <div className="text-xs text-gray-400 font-mono">
                CID: {decodeCID(milestoneData.submission_cid).slice(0, 20)}...
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"
                onClick={() => onViewDetails(jobId, milestoneIndex, milestoneData.submission_cid, 'submission')}
              >
                <Eye className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"
                onClick={() => handleViewIPFS(milestoneData.submission_cid, 'submission')}
              >
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Acceptance CID */}
        {milestoneData.acceptance_cid && (
          <div className="flex items-center justify-between p-2 bg-gray-700/30 rounded">
            <div className="flex-1">
              <div className="text-sm font-medium text-green-400">Chấp nhận</div>
              <div className="text-xs text-gray-400 font-mono">
                CID: {decodeCID(milestoneData.acceptance_cid).slice(0, 20)}...
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                className="bg-green-600/20 text-green-400 hover:bg-green-600/30"
                onClick={() => onViewDetails(jobId, milestoneIndex, milestoneData.acceptance_cid, 'acceptance')}
              >
                <Eye className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-green-600/20 text-green-400 hover:bg-green-600/30"
                onClick={() => handleViewIPFS(milestoneData.acceptance_cid, 'acceptance')}
              >
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Rejection CID */}
        {milestoneData.rejection_cid && (
          <div className="flex items-center justify-between p-2 bg-gray-700/30 rounded">
            <div className="flex-1">
              <div className="text-sm font-medium text-red-400">Từ chối</div>
              <div className="text-xs text-gray-400 font-mono">
                CID: {decodeCID(milestoneData.rejection_cid).slice(0, 20)}...
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                className="bg-red-600/20 text-red-400 hover:bg-red-600/30"
                onClick={() => onViewDetails(jobId, milestoneIndex, milestoneData.rejection_cid, 'rejection')}
              >
                <Eye className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-red-600/20 text-red-400 hover:bg-red-600/30"
                onClick={() => handleViewIPFS(milestoneData.rejection_cid, 'rejection')}
              >
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Debug Info */}
        <details className="text-xs">
          <summary className="cursor-pointer text-gray-400 hover:text-gray-300">
            Debug Info
          </summary>
          <div className="mt-2 space-y-1 text-gray-500">
            <div>Submitted: {String(milestoneData.submitted)}</div>
            <div>Accepted: {String(milestoneData.accepted)}</div>
            <div>Reject Count: {milestoneData.reject_count}</div>
            <div>Submit Time: {milestoneData.submit_time}</div>
          </div>
        </details>
      </CardContent>
    </Card>
  );
};

export default MilestoneDetails; 