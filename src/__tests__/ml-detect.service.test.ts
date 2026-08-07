import { MlDetectService } from '../services/ml-detect.service';
import { LiveMonitoringService } from '../services/live.service';

jest.mock('../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockLive = {
  recordRecognition: jest.fn(),
} as unknown as jest.Mocked<LiveMonitoringService>;

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

describe('MlDetectService', () => {
  let service: MlDetectService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    service = new MlDetectService(mockLive);
    global.fetch = jest.fn();
  });

  afterEach(() => {
    service.stop();
    jest.useRealTimers();
  });

  it('harus merekam recognition Verified untuk nama yang dikenali', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        active_names: ['muchPanjiLaksono'],
        details: [
          { name: 'muchPanjiLaksono', similarity: 12.28, bbox: [591, 245, 663, 371] },
        ],
      }),
    });

    service.start();
    await flush();

    expect(mockLive.recordRecognition).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeId: 'muchPanjiLaksono',
        cameraId: 'CAM-05',
        confidence: 12.28,
        status: 'Verified',
      }),
    );
  });

  it('harus merekam Unknown tanpa employeeId', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        active_names: ['Unknown'],
        details: [{ name: 'Unknown', similarity: 0, bbox: [1, 2, 3, 4] }],
      }),
    });

    service.start();
    await flush();

    expect(mockLive.recordRecognition).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeId: undefined,
        status: 'Unknown',
      }),
    );
  });

  it('harus Unknown jika similarity di bawah threshold', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        active_names: ['gibranRaisHilmyIskandar'],
        details: [
          { name: 'gibranRaisHilmyIskandar', similarity: 4.4, bbox: [1, 2, 3, 4] },
        ],
      }),
    });

    service.start();
    await flush();

    expect(mockLive.recordRecognition).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeId: 'gibranRaisHilmyIskandar',
        status: 'Unknown',
      }),
    );
  });

  it('harus tidak merekam ulang identity yang sama dalam window dedup', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        active_names: ['akmalShaumNadzirin'],
        details: [
          { name: 'akmalShaumNadzirin', similarity: 15, bbox: [1, 2, 3, 4] },
        ],
      }),
    });

    service.start();
    await flush();
    expect(mockLive.recordRecognition).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(10000);
    await flush();
    expect(mockLive.recordRecognition).toHaveBeenCalledTimes(1);
  });

  it('harus tidak merekam apapun jika /detect gagal', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('ECONNREFUSED'));

    service.start();
    await flush();

    expect(mockLive.recordRecognition).not.toHaveBeenCalled();
  });
});
