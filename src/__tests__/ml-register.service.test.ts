import { MlRegisterService } from '../services/ml-register.service';
import { env } from '../config/env';

jest.mock('../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const baseEnv = { ...env };

describe('MlRegisterService', () => {
  let service: MlRegisterService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MlRegisterService();
    Object.assign(env, { ...baseEnv, ML_REGISTER_ENABLED: true, ML_REGISTER_URL: 'http://ml/register' });
    global.fetch = jest.fn();
  });

  const makeImgResponse = (type = 'image/jpeg') =>
    new Response(new ArrayBuffer(8), { status: 200, headers: { 'content-type': type } });

  it('harus mengirim multipart FormData dengan employeeId, name dan photos', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(makeImgResponse())
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, message: 'ok', data: {} }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

    await service.registerEmployee({
      employeeId: 'EMP-001',
      name: 'Budi Santoso',
      photos: ['https://supabase/faces/1.jpg'],
    });

    expect(global.fetch).toHaveBeenCalledWith('https://supabase/faces/1.jpg', expect.anything());
    const [url, init] = (global.fetch as jest.Mock).mock.calls[1];
    expect(url).toBe('http://ml/register');
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
  });

  it('harus tidak melakukan apa-apa jika ML_REGISTER_ENABLED false', async () => {
    Object.assign(env, { ML_REGISTER_ENABLED: false });

    await service.registerEmployee({
      employeeId: 'EMP-001',
      name: 'Budi',
      photos: ['https://supabase/faces/1.jpg'],
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('harus tidak melakukan apa-apa jika tidak ada photos', async () => {
    await service.registerEmployee({
      employeeId: 'EMP-001',
      name: 'Budi',
      photos: [],
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('harus menangani kegagalan tanpa melempar error', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(
      service.registerEmployee({
        employeeId: 'EMP-001',
        name: 'Budi',
        photos: ['https://supabase/faces/1.jpg'],
      }),
    ).resolves.toBeUndefined();
  });
});
