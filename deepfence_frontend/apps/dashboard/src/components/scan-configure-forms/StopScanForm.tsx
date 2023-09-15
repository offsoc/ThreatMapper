import { ActionFunctionArgs, generatePath, useFetcher } from 'react-router-dom';
import { Button, Modal } from 'ui-components';

import {
  getCloudComplianceApiClient,
  getComplianceApiClient,
  getMalwareApiClient,
  getSecretApiClient,
  getVulnerabilityApiClient,
} from '@/api/api';
import { ErrorStandardLineIcon } from '@/components/icons/common/ErrorStandardLine';
import { SuccessModalContent } from '@/features/settings/components/SuccessModalContent';
import { invalidateAllQueries } from '@/queries';
import { ScanTypeEnum } from '@/types/common';
import { get403Message } from '@/utils/403';
import { apiWrapper } from '@/utils/api';

export enum ActionEnumType {
  STOP_SCAN = 'stop_scan',
}
interface IActionData {
  action: ActionEnumType;
  success: boolean;
  message?: string;
}

export const stopScanApiFunctionMap = {
  [ScanTypeEnum.VulnerabilityScan]: getVulnerabilityApiClient().stopVulnerabilityScan,
  [ScanTypeEnum.SecretScan]: getSecretApiClient().stopSecretScan,
  [ScanTypeEnum.MalwareScan]: getMalwareApiClient().stopMalwareScan,
  [ScanTypeEnum.ComplianceScan]: getComplianceApiClient().stopComplianceScan,
  [ScanTypeEnum.CloudComplianceScan]:
    getCloudComplianceApiClient().statusCloudComplianceScan,
};

export const actionStopScan = async ({
  params,
}: ActionFunctionArgs): Promise<{ success?: boolean; message?: string }> => {
  const scanId = params?.scanId?.toString() ?? '';

  const stopScanApi = apiWrapper({
    fn: stopScanApiFunctionMap[ScanTypeEnum.VulnerabilityScan],
  });
  const result = await stopScanApi({
    modelStopScanRequest: {
      scan_id: scanId,
      scan_type: ScanTypeEnum.VulnerabilityScan,
    },
  });
  if (!result.ok) {
    if (result.error.response.status === 400 || result.error.response.status === 409) {
      return {
        success: false,
        message: result.error.message ?? '',
      };
    } else if (result.error.response.status === 403) {
      const message = await get403Message(result.error);
      return {
        success: false,
        message,
      };
    }
    throw result.error;
  }

  invalidateAllQueries();
  return {
    success: true,
  };
};
export const StopScanForm = ({
  open,
  scanIds,
  closeModal,
}: {
  open: boolean;
  scanIds: string[];
  closeModal: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const fetcher = useFetcher<IActionData>();
  return (
    <Modal
      size="s"
      open={open}
      onOpenChange={() => closeModal(false)}
      title={
        !fetcher.data?.success ? (
          <div className="flex gap-3 items-center dark:text-text-text-and-icon">
            <span className="h-6 w-6 shrink-0 dark:text-df-gray-500">
              <ErrorStandardLineIcon />
            </span>
            Cancel {scanIds.length > 1 ? 'scans' : 'scan'}
          </div>
        ) : undefined
      }
      footer={
        !fetcher.data?.success ? (
          <div className={'flex gap-x-4 justify-end'}>
            <Button
              size="md"
              onClick={() => closeModal(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              size="md"
              loading={fetcher.state === 'submitting'}
              disabled={fetcher.state === 'submitting'}
              onClick={(e) => {
                e.preventDefault();
                fetcher.submit(null, {
                  method: 'post',
                  action: generatePath('/data-component/scan/stop/:scanId', {
                    scanId: encodeURIComponent(scanIds[0]),
                  }),
                });
              }}
            >
              Cancel now
            </Button>
          </div>
        ) : undefined
      }
    >
      {!fetcher.data?.success ? (
        <div className="grid">
          <span>The selected scan will be cancelled.</span>
          <br />
          <span>Are you sure you want to cancel?</span>
          {fetcher.data?.message && (
            <p className="mt-2 text-p7 dark:text-status-error">{fetcher.data?.message}</p>
          )}
        </div>
      ) : (
        <SuccessModalContent text="Cancel scan started" />
      )}
    </Modal>
  );
};
